import { Router } from 'express';
import { asyncRoute, pageOf, paged } from '../core/http';
import { prisma } from '../core/db';
import { GameError, integer } from '../core/engine';
import { loadSettings } from '../core/settings';
import { goldReasons } from '../../../shared/economy';
import { publicRare } from './rare';

export const economyRoutes = Router();
// Valores que a interface precisa para mostrar preços e taxas corretos (nada sensível).
economyRoutes.get('/config', asyncRoute(async (_req, res) => {
  const s = await loadSettings(prisma);
  res.json({ saleFeePercent: s['market.saleFeePercent'], listingFeeGold: s['market.listingFeeGold'], listingHours: s['market.durationHours'], npcBuyPercent: s['economy.npcBuyPercent'],
    npcSellPercent: s['economy.npcSellPercent'], upgradePercent: s['economy.upgradePricePercent'], promotionGold: s['class.promotionGold'], presetLimit: s['premium.presetLimit'], xpPercent: s['economy.xpRewardPercent'], goldPercent: s['economy.goldRewardPercent'], safeUntilTier: s['upgrade.safeUntilTier'], breakFromTier: s['upgrade.breakFromTier'], breakOnFailPercent: s['upgrade.breakOnFailPercent'],
    statsResetBaseGold: s['stats.resetBaseGold'], statsResetPerLevelSquared: s['stats.resetGoldPerLevelSquared'] });
}));
economyRoutes.get('/characters/:id/ledger', asyncRoute(async (req, res) => {
  const characterId = integer(Number(req.params.id)), { page, skip, take } = pageOf(req.query);
  if (!await prisma.character.findFirst({ where: { id: characterId, accountId: res.locals.accountId }, select: { id: true } })) throw new GameError(404, 'Personagem não encontrado.');
  const [rows, total] = await Promise.all([prisma.goldLedger.findMany({ where: { characterId }, orderBy: { id: 'desc' }, skip, take }), prisma.goldLedger.count({ where: { characterId } })]);
  res.json(paged(rows.map(r => ({ id: r.id, delta: r.delta.toString(), balanceAfter: r.balanceAfter.toString(), reason: r.reason, kind: goldReasons[r.reason as keyof typeof goldReasons] ?? 'source', createdAt: r.createdAt })), total, page));
}));
economyRoutes.get('/characters/:id/market/history', asyncRoute(async (req, res) => {
  const characterId = integer(Number(req.params.id)), { page, skip, take } = pageOf(req.query);
  if (!await prisma.character.findFirst({ where: { id: characterId, accountId: res.locals.accountId }, select: { id: true } })) throw new GameError(404, 'Personagem não encontrado.');
  const where = { status: { not: 'OPEN' as const }, OR: [{ sellerId: characterId }, { buyerId: characterId }] };
  const [rows, total] = await Promise.all([prisma.marketListing.findMany({ where, include: { blueprint: { select: { name: true, spriteUrl: true } } }, orderBy: { id: 'desc' }, skip, take }), prisma.marketListing.count({ where })]);
  res.json(paged(rows.map(l => ({ id: l.id, item: l.blueprint, quantity: l.quantity, upgradeTier: l.upgradeTier, price: l.price.toString(), fee: l.fee.toString(), status: l.status,
    role: l.sellerId === characterId ? 'SELLER' : 'BUYER', soldAt: l.soldAt, createdAt: l.createdAt })), total, page));
}));
// Preços recentes ajudam a precificar. Sem nomes de jogadores.
economyRoutes.get('/market/sales', asyncRoute(async (_req, res) => {
  const rows = await prisma.marketListing.findMany({ where: { status: 'SOLD' }, include: { blueprint: { select: { name: true, spriteUrl: true } } }, orderBy: { id: 'desc' }, take: 20 });
  res.json(rows.map(l => ({ id: l.id, item: l.blueprint, quantity: l.quantity, upgradeTier: l.upgradeTier, price: l.price.toString(), soldAt: l.soldAt })));
}));

// ----- Itens raros (equipamentos +10): inspeção para qualquer jogador conectado -----
const rareInclude = { blueprint: { select: { name: true, spriteUrl: true } }, creator: { select: { name: true, fameHidden: true } } } as const;
economyRoutes.get('/rare-items', asyncRoute(async (req, res) => {
  // Coleção pública em páginas de 10: filtro por situação (circulating | destroyed | first), busca pelo nome do item e, opcionalmente, um tipo de item.
  const blueprintId = req.query.blueprintId ? integer(Number(req.query.blueprintId)) : undefined, { page, skip, take } = pageOf(req.query);
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '', status = String(req.query.status ?? '');
  const where = { ...(blueprintId ? { blueprintId } : {}), ...(q ? { blueprint: { name: { contains: q } } } : {}),
    ...(status === 'circulating' ? { status: 'CIRCULATING' } : status === 'destroyed' ? { status: { not: 'CIRCULATING' } } : status === 'first' ? { firstOfKind: true } : {}) };
  const [rows, total, circulating, destroyed] = await Promise.all([
    prisma.rareItem.findMany({ where, include: rareInclude, orderBy: { id: 'desc' }, skip, take }),
    prisma.rareItem.count({ where }),
    prisma.rareItem.count({ where: { status: 'CIRCULATING', ...(blueprintId ? { blueprintId } : {}) } }),
    prisma.rareItem.count({ where: { status: { not: 'CIRCULATING' }, ...(blueprintId ? { blueprintId } : {}) } })]);
  res.json({ circulating, destroyed, ...paged(rows.map(publicRare), total, page) });
}));
// Totais do mundo (vem antes de /rare-items/:id para "totals" não ser lido como id).
economyRoutes.get('/rare-items/totals', asyncRoute(async (_req, res) => {
  const [circulating, destroyed, firsts] = await Promise.all([prisma.rareItem.count({ where: { status: 'CIRCULATING' } }),
    prisma.rareItem.count({ where: { status: { not: 'CIRCULATING' } } }), prisma.rareItem.count({ where: { firstOfKind: true } })]);
  res.json({ circulating, destroyed, firsts });
}));
economyRoutes.get('/rare-items/:id', asyncRoute(async (req, res) => {
  const r = await prisma.rareItem.findUnique({ where: { id: integer(Number(req.params.id)) }, include: { ...rareInclude, events: { orderBy: { id: 'asc' }, take: 50 } } });
  if (!r) throw new GameError(404, 'Item raro não encontrado.');
  res.json(publicRare(r));
}));
