import { Router, type RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { asyncRoute } from '../core/http';
import { prisma, transaction, lockCharacterAny, lockAccount } from '../core/db';
import { GameError, integer } from '../core/engine';
import { addGold } from '../economy/economy';
import { loadSettings, saveSettings } from '../core/settings';
import { grantPeriod, revokePeriod, premiumStatus } from '../premium/premium';
import { metrics } from '../core/monitor';
import { once } from '../core/operations';
import { goldDrift, itemDrift } from '../economy/reconcile';
import { applyRefund } from '../premium/premiumService';
import { can, permissionsOf, type Permission } from '../../../shared/permissions';
import { settingDefs, settingKeys, validSetting, settingsConflict, goldReasons, itemReasons, type SettingKey } from '../../../shared/economy';

export const adminRoutes = Router();
adminRoutes.get('/admin/health', (_req, res, next) => can(res.locals.role, 'economy.read') ? next() : next(new GameError(403, 'Você não tem permissão para esta ação.')), asyncRoute(async (_req, res) => {
  const t0 = Date.now(); await prisma.$queryRaw`SELECT 1`;
  const [pendingOrders, openTickets, expiredStuck] = await Promise.all([
    prisma.premiumOrder.count({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } } }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.marketListing.count({ where: { status: 'OPEN', expiresAt: { lt: new Date(Date.now() - 5 * 60_000) } } }),
  ]);
  res.json({ ...metrics(), db: { ms: Date.now() - t0 }, alerts: { pendingOrdersOver24h: pendingOrders, openTickets, expiredListingsNotSwept: expiredStuck } });
}));
const rank: Record<string, number> = { PLAYER: 0, SUPPORT: 1, MODERATOR: 2, ADMIN: 3 };
const need = (permission: Permission): RequestHandler => (_req, res, next) => {
  if (!can(res.locals.role, permission)) return next(new GameError(403, 'Você não tem permissão para esta ação.'));
  next();
};
const actor = (res: { locals: Record<string, any> }) => res.locals.accountId as number;
function reasonOf(body: any) {
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 5 || reason.length > 500) throw new GameError(400, 'Informe o motivo (de 5 a 500 caracteres). Ele fica registrado.');
  return reason;
}
// Toda ação administrativa grava quem fez, o quê e por quê, na mesma transação da alteração.
function audit(tx: Prisma.TransactionClient, actorAccountId: number, action: string, targetType: string, targetId: number | null, reason: string, details?: Record<string, unknown>) {
  return tx.adminAuditLog.create({ data: { actorAccountId, action, targetType, targetId, reason, details: (details ?? undefined) as Prisma.InputJsonValue | undefined } });
}
// Ações administrativas que mexem em ouro ou concedem tempo exigem Idempotency-Key: repetir o mesmo clique/requisição não duplica o efeito.
const opKey = (req: { get(name: string): string | undefined }) => { const key = req.get('idempotency-key'); if (!key) throw new GameError(400, 'Chave de operação ausente.'); return key; };
const num = (value: unknown, fallback: number, min = 1, max = 2147483647) => { const n = Number(value ?? fallback); if (!Number.isSafeInteger(n) || n < min || n > max) throw new GameError(400, 'Parâmetro inválido.'); return n; };

adminRoutes.use('/admin', asyncRoute(async (_req, res, next) => {
  if (!rank[res.locals.role]) throw new GameError(403, 'Acesso restrito à equipe.');
  next();
}));
adminRoutes.get('/admin/me', asyncRoute(async (_req, res) => { res.json({ role: res.locals.role, permissions: permissionsOf(res.locals.role) }); }));

// ----- Contas -----
adminRoutes.get('/admin/accounts', need('accounts.read'), asyncRoute(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 190) : '';
  if (q.length < 2) throw new GameError(400, 'Digite ao menos 2 caracteres para buscar.');
  const accounts = await prisma.account.findMany({ where: { OR: [{ email: { contains: q } }, { characters: { some: { name: { contains: q } } } }] }, take: 25, orderBy: { id: 'desc' },
    select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true, characters: { select: { id: true, name: true, level: true, vocation: true } } } });
  res.json(accounts);
}));
adminRoutes.get('/admin/accounts/:id', need('accounts.read'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id));
  const account = await prisma.account.findUnique({ where: { id }, select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true,
    characters: { select: { id: true, name: true, level: true, vocation: true, goldInHand: true, goldInBank: true } } } });
  if (!account) throw new GameError(404, 'Conta não encontrada.');
  const [punishments, periods, orders, tickets, premium] = await Promise.all([
    prisma.punishment.findMany({ where: { accountId: id }, orderBy: { id: 'desc' }, take: 30 }),
    prisma.premiumPeriod.findMany({ where: { accountId: id }, orderBy: { id: 'desc' }, take: 20 }),
    prisma.premiumOrder.findMany({ where: { accountId: id }, orderBy: { id: 'desc' }, take: 20 }),
    prisma.supportTicket.findMany({ where: { accountId: id }, orderBy: { id: 'desc' }, take: 10, select: { id: true, kind: true, subject: true, status: true } }),
    premiumStatus(prisma, id)]);
  res.json({ ...account, premium, punishments, periods, orders, tickets });
}));

// ----- Punições -----
const punishKinds = ['WARNING', 'MARKET_BAN', 'BAN'];
adminRoutes.post('/admin/accounts/:id/punishments', need('punish.apply'), asyncRoute(async (req, res) => {
  const accountId = integer(Number(req.params.id)), reason = reasonOf(req.body), kind = String(req.body?.kind);
  if (!punishKinds.includes(kind)) throw new GameError(400, 'Tipo de punição inválido.');
  const hours = req.body?.hours === undefined || req.body?.hours === null ? null : num(req.body.hours, 0, 1, 24 * 365);
  if (kind === 'BAN' && !can(res.locals.role, 'settings.write') && hours === null) throw new GameError(403, 'Apenas administradores aplicam banimento permanente.');
  res.status(201).json(await transaction(async tx => {
    const target = await tx.account.findUnique({ where: { id: accountId }, select: { role: true } });
    if (!target) throw new GameError(404, 'Conta não encontrada.');
    if (rank[target.role] >= rank[res.locals.role]) throw new GameError(403, 'Você não pode punir uma conta com cargo igual ou superior ao seu.');
    const p = await tx.punishment.create({ data: { accountId, kind, reason, createdById: actor(res), expiresAt: hours ? new Date(Date.now() + hours * 3_600_000) : null } });
    if (kind === 'BAN') await tx.session.deleteMany({ where: { accountId } });
    await audit(tx, actor(res), `PUNISH_${kind}`, 'ACCOUNT', accountId, reason, { punishmentId: p.id, hours });
    return p;
  }));
}));
// Moderação da comunidade: a equipe remove recados e depoimentos (ex.: depois de uma denúncia), com motivo e auditoria.
adminRoutes.post('/admin/community/:kind/:id/remove', need('community.moderate'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), reason = reasonOf(req.body), kind = req.params.kind;
  if (!['scrap', 'testimonial', 'post', 'comment'].includes(kind)) throw new GameError(400, 'Tipo de conteúdo inválido.');
  await transaction(async tx => {
    if (kind === 'scrap') {
      const s = await tx.profileScrap.findUnique({ where: { id } });
      if (!s) throw new GameError(404, 'Recado não encontrado.');
      if (!s.deletedAt) await tx.profileScrap.update({ where: { id }, data: { deletedAt: new Date(), deletedById: actor(res) } });
      await audit(tx, actor(res), 'COMMUNITY_REMOVE', 'CHARACTER', s.authorId, reason, { kind, id, text: s.text });
    } else if (kind === 'post' || kind === 'comment') {
      const item = kind === 'post' ? await tx.forumPost.findUnique({ where: { id } }) : await tx.forumComment.findUnique({ where: { id } });
      if (!item) throw new GameError(404, 'Conteúdo do fórum não encontrado.');
      if (kind === 'post') await tx.forumPost.update({ where: { id }, data: { deletedAt: new Date() } });
      else await tx.forumComment.update({ where: { id }, data: { deletedAt: new Date() } });
      await audit(tx, actor(res), 'COMMUNITY_REMOVE', 'CHARACTER', item.authorId, reason, { kind, id, text: 'title' in item ? `${item.title}
${item.body}` : item.body });
    } else {
      const t = await tx.profileTestimonial.findUnique({ where: { id } });
      if (!t) throw new GameError(404, 'Depoimento não encontrado.');
      await tx.profileTestimonial.update({ where: { id }, data: { status: 'REMOVED', decidedAt: new Date() } });
      await audit(tx, actor(res), 'COMMUNITY_REMOVE', 'CHARACTER', t.authorId, reason, { kind, id, text: t.text });
    }
  });
  res.json({ ok: true });
}));
adminRoutes.post('/admin/punishments/:id/revoke', need('punish.apply'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), reason = reasonOf(req.body);
  await transaction(async tx => {
    const p = await tx.punishment.findUnique({ where: { id }, include: { account: { select: { role: true } } } });
    if (!p) throw new GameError(404, 'Punição não encontrada.');
    if (p.revokedAt) return;
    // Mesmas regras da aplicação: só quem tem cargo acima do alvo revoga; banimento sem prazo ou punição aplicada
    // por um cargo superior ao seu só ADMIN revoga.
    const isAdmin = can(res.locals.role, 'settings.write');
    if (rank[p.account.role] >= rank[res.locals.role]) throw new GameError(403, 'Você não pode revogar a punição de uma conta com cargo igual ou superior ao seu.');
    if (p.kind === 'BAN' && p.expiresAt === null && !isAdmin) throw new GameError(403, 'Apenas administradores revogam banimento permanente.');
    const creator = await tx.account.findUnique({ where: { id: p.createdById }, select: { role: true } });
    if (creator && rank[creator.role] > rank[res.locals.role] && !isAdmin) throw new GameError(403, 'Esta punição foi aplicada por um cargo superior ao seu; peça a um administrador.');
    await tx.punishment.update({ where: { id }, data: { revokedAt: new Date(), revokedById: actor(res), revokeReason: reason } });
    await audit(tx, actor(res), 'PUNISH_REVOKE', 'ACCOUNT', p.accountId, reason, { punishmentId: id });
  });
  res.json({ ok: true });
}));

// ----- Premium: conceder dias promocionais, corrigir acessos -----
adminRoutes.post('/admin/accounts/:id/premium', need('premium.grant'), asyncRoute(async (req, res) => {
  const accountId = integer(Number(req.params.id)), reason = reasonOf(req.body), days = num(req.body?.days, 0, 1, 365);
  const source = req.body?.source === 'CORRECTION' ? 'CORRECTION' : 'PROMO';
  const key = opKey(req);
  res.status(201).json(await transaction(async tx => {
    await lockAccount(tx, accountId);
    return once(tx, -accountId, key, ['premium', accountId, days, source, reason], async () => {
      const period = await grantPeriod(tx, { accountId, days, source, reason, createdById: actor(res) });
      await audit(tx, actor(res), 'PREMIUM_GRANT', 'ACCOUNT', accountId, reason, { periodId: period.id, days, source });
      return period;
    });
  }));
}));
adminRoutes.post('/admin/premium-periods/:id/revoke', need('premium.grant'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), reason = reasonOf(req.body);
  await transaction(async tx => {
    const period = await tx.premiumPeriod.findUnique({ where: { id } });
    if (!period) throw new GameError(404, 'Período não encontrado.');
    await revokePeriod(tx, id, actor(res), reason);
    await audit(tx, actor(res), 'PREMIUM_REVOKE', 'ACCOUNT', period.accountId, reason, { periodId: id });
  });
  res.json({ ok: true });
}));
adminRoutes.get('/admin/orders', need('orders.read'), asyncRoute(async (req, res) => {
  const status = typeof req.query.status === 'string' && /^[A-Z]{4,12}$/.test(req.query.status) ? req.query.status : undefined;
  res.json(await prisma.premiumOrder.findMany({ where: { status }, orderBy: { id: 'desc' }, take: 50, include: { account: { select: { email: true } } } }));
}));
// Para reembolsos feitos direto no painel do Mercado Pago quando o aviso automático não chegou.
adminRoutes.post('/admin/orders/:id/refund', need('orders.manage'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), reason = reasonOf(req.body);
  res.json(await transaction(async tx => {
    if (!await tx.premiumOrder.findUnique({ where: { id }, select: { id: true } })) throw new GameError(404, 'Pedido não encontrado.');
    const changed = await applyRefund(tx, id, actor(res), reason);
    if (changed) await audit(tx, actor(res), 'ORDER_REFUND', 'ORDER', id, reason);
    return { refunded: changed };
  }));
}));

// ----- Avisos para todos os jogadores (manutenção, eventos) -----
adminRoutes.get('/admin/notices', need('notices.manage'), asyncRoute(async (_req, res) => {
  res.json(await prisma.gameNotice.findMany({ orderBy: { id: 'desc' }, take: 10 }));
}));
adminRoutes.post('/admin/notices', need('notices.manage'), asyncRoute(async (req, res) => {
  const reason = reasonOf(req.body), kind = req.body?.kind === 'MAINTENANCE' ? 'MAINTENANCE' : 'INFO';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (message.length < 5 || message.length > 300) throw new GameError(400, 'O aviso deve ter de 5 a 300 caracteres.');
  const hours = req.body?.hours === undefined || req.body?.hours === null || req.body?.hours === '' ? null : Number(req.body.hours);
  if (hours !== null && (!Number.isInteger(hours) || hours < 1 || hours > 720)) throw new GameError(400, 'Duração inválida (1 a 720 horas, ou vazio para até encerrar).');
  res.json(await transaction(async tx => {
    const notice = await tx.gameNotice.create({ data: { kind, message, endsAt: hours ? new Date(Date.now() + hours * 3_600_000) : null, createdById: actor(res) } });
    await audit(tx, actor(res), 'NOTICE_CREATE', 'NOTICE', notice.id, reason, { kind, message, hours });
    return notice;
  }));
}));
adminRoutes.post('/admin/notices/:id/end', need('notices.manage'), asyncRoute(async (req, res) => {
  const reason = reasonOf(req.body), id = integer(Number(req.params.id));
  res.json(await transaction(async tx => {
    const changed = await tx.gameNotice.updateMany({ where: { id, endedAt: null }, data: { endedAt: new Date() } });
    if (!changed.count) throw new GameError(404, 'Aviso não encontrado ou já encerrado.');
    await audit(tx, actor(res), 'NOTICE_END', 'NOTICE', id, reason);
    return { ok: true };
  }));
}));

// ----- Economia -----
adminRoutes.get('/admin/economy/reconcile', need('economy.read'), asyncRoute(async (_req, res) => { res.json({ drift: await goldDrift(prisma, 100), itemDrift: await itemDrift(prisma, 100) }); }));
adminRoutes.get('/admin/settings', need('settings.read'), asyncRoute(async (_req, res) => {
  const values = await loadSettings(prisma);
  res.json(settingKeys.map(key => ({ key, value: values[key], ...settingDefs[key] })));
}));
adminRoutes.put('/admin/settings', need('settings.write'), asyncRoute(async (req, res) => {
  const reason = reasonOf(req.body), incoming = req.body?.values;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new GameError(400, 'Valores inválidos.');
  const changes: Partial<Record<SettingKey, number>> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!validSetting(key, value)) throw new GameError(400, `Valor inválido para ${key}.`);
    changes[key as SettingKey] = value;
  }
  res.json(await transaction(async tx => {
    const before = await loadSettings(tx);
    const conflict = settingsConflict({ ...before, ...changes });
    if (conflict) throw new GameError(400, conflict);
    const applied = await saveSettings(tx, actor(res), changes);
    const diff = Object.fromEntries(Object.entries(applied).filter(([k, v]) => before[k as SettingKey] !== v).map(([k, v]) => [k, { de: before[k as SettingKey], para: v }]));
    if (Object.keys(diff).length) await audit(tx, actor(res), 'SETTINGS_UPDATE', 'SETTINGS', null, reason, diff);
    return { changed: diff };
  }));
}));
adminRoutes.get('/admin/economy', need('economy.read'), asyncRoute(async (req, res) => {
  const days = [1, 7, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7, since = new Date(Date.now() - days * 86_400_000);
  const [goldFlow, itemFlow, wallets, daily, listings, volume, activePremium, revenue] = await Promise.all([
    prisma.goldLedger.groupBy({ by: ['reason'], where: { createdAt: { gte: since } }, _sum: { delta: true }, _count: { _all: true } }),
    prisma.itemLedger.groupBy({ by: ['reason'], where: { createdAt: { gte: since } }, _sum: { delta: true }, _count: { _all: true } }),
    prisma.character.aggregate({ _sum: { goldInHand: true, goldInBank: true }, _count: { _all: true } }),
    prisma.$queryRaw<{ day: Date; kind: string; total: unknown }[]>`
      SELECT DATE(createdAt) AS day,
             CASE WHEN reason IN ('MONSTER','TASK','JOURNEY','NPC_SELL','STARTER','ADMIN_GRANT') THEN 'in'
                  WHEN reason IN ('NPC_BUY','UPGRADE','PROMOTION','MARKET_FEE','MARKET_LISTING_FEE','ADMIN_REMOVE') THEN 'out' ELSE 'transfer' END AS kind,
             SUM(delta) AS total
      FROM GoldLedger WHERE createdAt >= ${since} GROUP BY DATE(createdAt), kind ORDER BY day`,
    prisma.marketListing.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.marketListing.aggregate({ where: { status: 'SOLD', soldAt: { gte: since } }, _sum: { price: true, fee: true }, _count: { _all: true } }),
    prisma.premiumPeriod.findMany({ where: { revokedAt: null, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, distinct: ['accountId'], select: { accountId: true } }),
    prisma.premiumOrder.aggregate({ where: { status: 'PAID', paidAt: { gte: since } }, _sum: { amountCents: true }, _count: { _all: true } }),
  ]);
  let inflow = 0n, outflow = 0n;
  const gold = goldFlow.map(r => {
    const kind = goldReasons[r.reason as keyof typeof goldReasons] ?? 'transfer', total = r._sum.delta ?? 0n;
    if (kind === 'source') inflow += total; else if (kind === 'sink') outflow += 0n - total;
    return { reason: r.reason, kind, total: total.toString(), count: r._count._all };
  });
  res.json({ days, gold, inflow: inflow.toString(), outflow: outflow.toString(), net: (inflow - outflow).toString(),
    circulation: { inHand: (wallets._sum.goldInHand ?? 0n).toString(), inBank: (wallets._sum.goldInBank ?? 0n).toString(), characters: wallets._count._all },
    items: itemFlow.map(r => ({ reason: r.reason, kind: itemReasons[r.reason as keyof typeof itemReasons] ?? 'transfer', total: r._sum.delta ?? 0, count: r._count._all })),
    daily: daily.map(r => ({ day: r.day.toISOString().slice(0, 10), kind: r.kind, total: String(r.total) })),
    market: { byStatus: listings.map(l => ({ status: l.status, count: l._count._all })), sales: volume._count._all, volume: (volume._sum.price ?? 0n).toString(), fees: (volume._sum.fee ?? 0n).toString() },
    premium: { active: activePremium.length, paidOrders: revenue._count._all, revenueCents: revenue._sum.amountCents ?? 0 } });
}));
adminRoutes.get('/admin/ledger/gold', need('ledger.read'), asyncRoute(async (req, res) => {
  const characterId = num(req.query.characterId, 0, 1), before = num(req.query.before, 2147483647, 0);
  const rows = await prisma.goldLedger.findMany({ where: { characterId, id: { lt: before } }, orderBy: { id: 'desc' }, take: 51 });
  res.json({ entries: rows.slice(0, 50).map(r => ({ ...r, delta: r.delta.toString(), balanceAfter: r.balanceAfter.toString() })), nextBefore: rows.length > 50 ? rows[49].id : null });
}));
adminRoutes.get('/admin/ledger/items', need('ledger.read'), asyncRoute(async (req, res) => {
  const characterId = num(req.query.characterId, 0, 1), before = num(req.query.before, 2147483647, 0);
  const rows = await prisma.itemLedger.findMany({ where: { characterId, id: { lt: before } }, orderBy: { id: 'desc' }, take: 51 });
  const bps = await prisma.itemBlueprint.findMany({ where: { id: { in: [...new Set(rows.map(r => r.blueprintId))] } }, select: { id: true, name: true } });
  res.json({ entries: rows.slice(0, 50).map(r => ({ ...r, item: bps.find(b => b.id === r.blueprintId)?.name ?? '?' })), nextBefore: rows.length > 50 ? rows[49].id : null });
}));
// Correção de saldo: sempre com motivo, registrada no livro-razão e na auditoria.
adminRoutes.post('/admin/characters/:id/gold', need('gold.adjust'), asyncRoute(async (req, res) => {
  const characterId = integer(Number(req.params.id)), reason = reasonOf(req.body), raw = req.body?.delta;
  if (typeof raw !== 'string' || !/^-?[1-9][0-9]{0,9}$/.test(raw)) throw new GameError(400, 'Informe a variação como número inteiro (ex.: 500 ou -500).');
  const delta = BigInt(raw), key = opKey(req);
  res.json(await transaction(async tx => {
    await lockCharacterAny(tx, characterId);
    return once(tx, characterId, key, ['gold', raw, reason], async () => {
      const balance = await addGold(tx, characterId, delta, delta > 0n ? 'ADMIN_GRANT' : 'ADMIN_REMOVE', { type: 'admin', id: actor(res) });
      await audit(tx, actor(res), 'GOLD_ADJUST', 'CHARACTER', characterId, reason, { delta: raw });
      return { goldInHand: balance?.toString() };
    });
  }));
}));

// ----- Atendimento e denúncias -----
adminRoutes.get('/admin/tickets', need('tickets.read'), asyncRoute(async (req, res) => {
  const status = typeof req.query.status === 'string' && ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(req.query.status) ? req.query.status : undefined;
  const kind = req.query.kind === 'REPORT' || req.query.kind === 'SUPPORT' ? req.query.kind : undefined;
  res.json(await prisma.supportTicket.findMany({ where: { status, kind }, orderBy: [{ updatedAt: 'desc' }], take: 50, include: { account: { select: { email: true } } } }));
}));
adminRoutes.get('/admin/tickets/:id', need('tickets.read'), asyncRoute(async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: integer(Number(req.params.id)) }, include: { messages: { orderBy: { id: 'asc' }, take: 200 }, account: { select: { id: true, email: true } } } });
  if (!ticket) throw new GameError(404, 'Atendimento não encontrado.');
  const reported = ticket.reportedCharacterId ? await prisma.character.findUnique({ where: { id: ticket.reportedCharacterId }, select: { id: true, name: true, accountId: true } }) : null;
  res.json({ ...ticket, reported });
}));
adminRoutes.post('/admin/tickets/:id/messages', need('tickets.reply'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (body.length < 2 || body.length > 2000) throw new GameError(400, 'A mensagem deve ter de 2 a 2000 caracteres.');
  const internal = req.body?.internal === true;
  await transaction(async tx => {
    const t = await tx.supportTicket.findUnique({ where: { id } });
    if (!t) throw new GameError(404, 'Atendimento não encontrado.');
    await tx.supportMessage.create({ data: { ticketId: id, authorAccountId: actor(res), body, internal } });
    if (!internal) await tx.supportTicket.update({ where: { id }, data: { status: t.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS', assignedToId: t.assignedToId ?? actor(res) } });
  });
  res.json({ ok: true });
}));
adminRoutes.post('/admin/tickets/:id/status', need('tickets.reply'), asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id)), status = String(req.body?.status);
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) throw new GameError(400, 'Status inválido.');
  await transaction(async tx => {
    if (!await tx.supportTicket.findUnique({ where: { id }, select: { id: true } })) throw new GameError(404, 'Atendimento não encontrado.');
    await tx.supportTicket.update({ where: { id }, data: { status } });
    await audit(tx, actor(res), 'TICKET_STATUS', 'TICKET', id, `Status alterado para ${status}`);
  });
  res.json({ ok: true });
}));
adminRoutes.get('/admin/audit', need('audit.read'), asyncRoute(async (req, res) => {
  const before = num(req.query.before, 2147483647, 0);
  const rows = await prisma.adminAuditLog.findMany({ where: { id: { lt: before } }, orderBy: { id: 'desc' }, take: 51 });
  res.json({ entries: rows.slice(0, 50), nextBefore: rows.length > 50 ? rows[49].id : null });
}));
