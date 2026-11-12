import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { once as eventOnce } from 'node:events';
import { prisma, transaction } from '../src/core/db';
import { createApp } from '../src/server';
import { hashPassword } from '../src/core/password';
import { buyNpc } from '../src/game/inventoryService';
import { listItem, buyListing, expireListings, cancelListing } from '../src/economy/marketService';
import { createExtraCharacter, promoteCharacter } from '../src/game/characterService';
import { grantPeriod } from '../src/premium/premium';
import { premiumStatus } from '../src/premium/premium';
import { processMercadoPagoPayment } from '../src/premium/premiumService';
import { issueToken } from '../src/account/accountTokens';
import { unequip, upgrade, sellNpc } from '../src/game/gameService';
import { itemDrift, feederAlerts } from '../src/economy/reconcile';
import { loadSettings } from '../src/core/settings';

// Estes cenários pressupõem os padrões de configuração (taxa de venda 5%, anúncio 10 de ouro, promoção 5000).
// Não alteram configurações usadas por outros testes (as suítes rodam em paralelo na mesma base _test).
test('MySQL: livro-razão, mercado com taxas e expiração, Premium, pagamentos, contas e painel', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = 'Operations-test-2026!', hash = await hashPassword(password);
  const mk = (n: string, extra: object = {}, charExtra: object = {}) => prisma.account.create({ data: { email: `ops-${tag}-${n}@example.invalid`, password: hash, ...extra,
    characters: { create: { name: `Ops ${n} ${tag}`, level: 5, goldInHand: 10000n, hp: 1000, maxHp: 1000, ...charExtra } } }, include: { characters: true } });
  const [seller, buyer, premiumAcc, staffSupport, admin, victim] = await Promise.all([mk('s'), mk('b'), mk('p'), mk('sup', { role: 'SUPPORT' }), mk('adm', { role: 'ADMIN' }), mk('v')]);
  const sellerChar = seller.characters[0], buyerChar = buyer.characters[0];
  const sword = await prisma.itemBlueprint.findUniqueOrThrow({ where: { name: 'Sword' } });
  const potion = await prisma.itemBlueprint.findUniqueOrThrow({ where: { name: 'Health Potion' } });
  const server = createApp().listen(0, '127.0.0.1'); await eventOnce(server, 'listening');
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`, origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const realFetch = globalThis.fetch;
  const call = async (cookie: string, path: string, body?: unknown, method?: string, key?: string) => realFetch(base + path, { method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'Content-Type': 'application/json', 'X-Game-Client': 'oconfronto', Origin: origin, Cookie: cookie, ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (email: string, pw = password) => { const r = await call('', '/auth/login', { email, password: pw }); return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '' }; };
  const lastBalance = async (characterId: number) => (await prisma.goldLedger.findFirst({ where: { characterId }, orderBy: { id: 'desc' } }))?.balanceAfter;
  try {
    await t.test('compra no NPC empilha poções e registra ouro e item no livro-razão', async () => {
      await buyNpc(seller.id, sellerChar.id, potion.id, 2, randomUUID());
      await buyNpc(seller.id, sellerChar.id, potion.id, 3, randomUUID());
      const rows = await prisma.inventoryItem.findMany({ where: { characterId: sellerChar.id, blueprintId: potion.id } });
      assert.equal(rows.length, 1); assert.equal(rows[0].quantity, 5);
      const gold = await prisma.goldLedger.findMany({ where: { characterId: sellerChar.id, reason: 'NPC_BUY' } });
      assert.equal(gold.length, 2); assert.equal(gold.reduce((n, e) => n + e.delta, 0n), -BigInt(potion.npcPrice) * 5n);
      assert.equal(await lastBalance(sellerChar.id), (await prisma.character.findUniqueOrThrow({ where: { id: sellerChar.id } })).goldInHand);
      assert.equal((await prisma.itemLedger.aggregate({ where: { characterId: sellerChar.id, blueprintId: potion.id, reason: 'NPC_BUY' }, _sum: { delta: true } }))._sum.delta, 5);
    });
    await t.test('mercado: abaixo do nível mínimo não anuncia nem compra; conta alheia não chega às travas', async () => {
      const novato = await mk('novato', {}, { level: 1 });
      const item = await prisma.inventoryItem.create({ data: { characterId: novato.characters[0].id, blueprintId: sword.id } });
      await assert.rejects(() => listItem(novato.id, novato.characters[0].id, item.id, '100', randomUUID()), /mercado abre no nível/);
      const mine = await prisma.inventoryItem.create({ data: { characterId: sellerChar.id, blueprintId: sword.id } });
      const { listingId } = await listItem(seller.id, sellerChar.id, mine.id, '100', randomUUID());
      await assert.rejects(() => buyListing(novato.id, novato.characters[0].id, listingId), /mercado abre no nível/);
      // Comprar "como" o personagem de outra conta é recusado antes de travar qualquer linha.
      await assert.rejects(() => buyListing(novato.id, buyerChar.id, listingId), /Personagem não encontrado/);
      await cancelListing(seller.id, sellerChar.id, listingId);
    });
    await t.test('conciliação: conta que vende para três contas recém-criadas aparece no alerta de fluxo concentrado', async () => {
      const main = await mk('principal');
      for (const n of ['f1', 'f2', 'f3']) {
        const feeder = await mk(n), item = await prisma.inventoryItem.create({ data: { characterId: main.characters[0].id, blueprintId: sword.id } });
        const { listingId } = await listItem(main.id, main.characters[0].id, item.id, '5000', randomUUID());
        await buyListing(feeder.id, feeder.characters[0].id, listingId);
      }
      const alert = (await feederAlerts(prisma)).find(a => a.accountId === main.id);
      assert(alert, 'a conta principal deveria estar no alerta'); assert.equal(alert.newBuyers, 3); assert.equal(alert.goldFromNew, '15000'); assert.equal(alert.share, 100);
      // Com exigência maior de compradores novos, ela sai da lista.
      assert.equal((await feederAlerts(prisma, 7, 4)).some(a => a.accountId === main.id), false);
    });
    await t.test('mercado: taxa de anúncio, taxa de venda e saldos conferem com o livro-razão', async () => {
      const item = await prisma.inventoryItem.create({ data: { characterId: sellerChar.id, blueprintId: sword.id } });
      const startSeller = (await prisma.character.findUniqueOrThrow({ where: { id: sellerChar.id } })).goldInHand;
      const startBuyer = (await prisma.character.findUniqueOrThrow({ where: { id: buyerChar.id } })).goldInHand;
      const { listingId, expiresAt } = await listItem(seller.id, sellerChar.id, item.id, '1000', randomUUID());
      assert(expiresAt.getTime() > Date.now() + 47 * 3_600_000);
      await buyListing(buyer.id, buyerChar.id, listingId);
      const s = await prisma.character.findUniqueOrThrow({ where: { id: sellerChar.id } }), b = await prisma.character.findUniqueOrThrow({ where: { id: buyerChar.id } });
      assert.equal(s.goldInHand, startSeller - 10n + 1000n - 50n);
      assert.equal(b.goldInHand, startBuyer - 1000n);
      const listing = await prisma.marketListing.findUniqueOrThrow({ where: { id: listingId } });
      assert.equal(listing.status, 'SOLD'); assert.equal(listing.fee, 50n); assert.equal(listing.listingFee, 10n); assert(listing.soldAt);
      assert.equal(await lastBalance(sellerChar.id), s.goldInHand); assert.equal(await lastBalance(buyerChar.id), b.goldInHand);
      const reasons = (await prisma.goldLedger.findMany({ where: { characterId: sellerChar.id, refType: 'listing', refId: listingId } })).map(e => e.reason).sort();
      assert.deepEqual(reasons, ['MARKET_FEE', 'MARKET_LISTING_FEE', 'MARKET_SALE']);
      assert(await prisma.inventoryItem.findFirst({ where: { characterId: buyerChar.id, blueprintId: sword.id } }));
    });
    await t.test('mercado: anúncio vencido não pode ser comprado e a varredura devolve o item uma única vez', async () => {
      const item = await prisma.inventoryItem.create({ data: { characterId: sellerChar.id, blueprintId: sword.id, upgradeTier: 3 } });
      const { listingId } = await listItem(seller.id, sellerChar.id, item.id, '500', randomUUID());
      await prisma.marketListing.update({ where: { id: listingId }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await assert.rejects(() => buyListing(buyer.id, buyerChar.id, listingId), /expirou/);
      const before = await prisma.inventoryItem.count({ where: { characterId: sellerChar.id, blueprintId: sword.id, upgradeTier: 3 } });
      const [a, b] = await Promise.all([expireListings(), expireListings()]);
      assert(a + b >= 1);
      await expireListings();
      assert.equal((await prisma.marketListing.findUniqueOrThrow({ where: { id: listingId } })).status, 'EXPIRED');
      assert.equal(await prisma.inventoryItem.count({ where: { characterId: sellerChar.id, blueprintId: sword.id, upgradeTier: 3 } }), before + 1);
    });
    await t.test('personagens extras exigem Premium; extras começam com pouco ouro', async () => {
      const name = `Extra ${tag}`;
      await assert.rejects(() => createExtraCharacter(premiumAcc.id, name, 'DRUID'), /Premium/);
      await transaction(tx => grantPeriod(tx, { accountId: premiumAcc.id, days: 30, source: 'PROMO', reason: 'teste' }));
      assert.equal((await premiumStatus(prisma, premiumAcc.id)).active, true);
      const extra = await createExtraCharacter(premiumAcc.id, name, 'DRUID');
      const c = await prisma.character.findUniqueOrThrow({ where: { id: extra.id }, include: { inventory: true } });
      assert.equal(c.vocation, 'DRUID'); assert.equal(c.goldInHand, 100n); assert.equal(c.inventory.filter(i => i.isEquipped).length, 5);
      assert.equal((await prisma.goldLedger.findFirstOrThrow({ where: { characterId: c.id } })).reason, 'STARTER');
      await assert.rejects(() => createExtraCharacter(premiumAcc.id, name, 'KNIGHT'), /em uso/);
    });
    await t.test('conjuntos de equipamento (Premium): salvar, desequipar e reaplicar', async () => {
      const cookie = (await login(premiumAcc.email)).cookie;
      const heroId = (await prisma.character.findFirstOrThrow({ where: { accountId: premiumAcc.id }, orderBy: { id: 'desc' } })).id;
      const saved = await (await call(cookie, `/characters/${heroId}/presets`, { name: 'Padrão' })).json();
      const weapon = await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: heroId, equippedSlot: 'WEAPON' } });
      await unequip(premiumAcc.id, heroId, weapon.id);
      const applied = await call(cookie, `/characters/${heroId}/presets/${saved.id}/apply`, {});
      assert.equal(applied.status, 200);
      assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: weapon.id } })).isEquipped, true);
      const free = await login(buyer.email);
      assert.equal((await call(free.cookie, `/characters/${buyerChar.id}/presets`, { name: 'X' })).status, 402);
    });
    await t.test('promoção de classe: nível, custo, registro e uma única vez', async () => {
      await prisma.character.update({ where: { id: victim.characters[0].id }, data: { vocation: 'KNIGHT', vocationChosen: true, level: 19 } });
      await assert.rejects(() => promoteCharacter(victim.id, victim.characters[0].id), /nível 20/);
      await prisma.character.update({ where: { id: victim.characters[0].id }, data: { level: 20 } });
      await promoteCharacter(victim.id, victim.characters[0].id);
      const c = await prisma.character.findUniqueOrThrow({ where: { id: victim.characters[0].id } });
      assert.equal(c.vocation, 'ELITE_KNIGHT'); assert.equal(c.goldInHand, 5000n); assert(c.promotedAt);
      assert.equal((await prisma.goldLedger.findFirstOrThrow({ where: { characterId: c.id, reason: 'PROMOTION' } })).delta, -5000n);
      // A próxima classe (2ª) só abre no nível 100.
      await assert.rejects(() => promoteCharacter(victim.id, c.id), /nível 100/);
    });
    await t.test('pagamentos: aprovação concede uma vez, repetição é ignorada, valor divergente não concede, reembolso revoga', async () => {
      process.env.MP_ACCESS_TOKEN = 'token-de-teste'; process.env.MP_WEBHOOK_SECRET = 'segredo-de-teste';
      const paymentId = String(Math.floor(Math.random() * 1e9) + 1e9);
      const payments = new Map<string, object>();
      globalThis.fetch = (async (input: any, init?: any) => {
        const url = String(input?.url ?? input);
        if (url.startsWith('https://api.mercadopago.com/v1/payments/')) return new Response(JSON.stringify(payments.get(url.split('/').pop()!)), { status: 200, headers: { 'Content-Type': 'application/json' } });
        return realFetch(input, init);
      }) as typeof fetch;
      try {
        const order = await prisma.premiumOrder.create({ data: { accountId: victim.id, amountCents: 1990, days: 30 } });
        payments.set(paymentId, { id: Number(paymentId), status: 'approved', external_reference: String(order.id), transaction_amount: 19.9, currency_id: 'BRL' });
        assert.equal(await processMercadoPagoPayment(paymentId), 'granted');
        assert.equal(await processMercadoPagoPayment(paymentId), 'duplicate');
        const paid = await prisma.premiumOrder.findUniqueOrThrow({ where: { id: order.id }, include: { period: true } });
        assert.equal(paid.status, 'PAID'); assert(paid.period); assert.equal(await prisma.premiumPeriod.count({ where: { orderId: order.id } }), 1);
        assert.equal((await premiumStatus(prisma, victim.id)).active, true);
        payments.set(paymentId, { id: Number(paymentId), status: 'refunded', external_reference: String(order.id), transaction_amount: 19.9, currency_id: 'BRL' });
        assert.equal(await processMercadoPagoPayment(paymentId), 'refunded');
        assert.equal((await prisma.premiumOrder.findUniqueOrThrow({ where: { id: order.id } })).status, 'REFUNDED');
        assert.equal((await premiumStatus(prisma, victim.id)).active, false);
        const other = await prisma.premiumOrder.create({ data: { accountId: victim.id, amountCents: 1990, days: 30 } });
        const otherPayment = String(Number(paymentId) + 1);
        payments.set(otherPayment, { id: Number(otherPayment), status: 'approved', external_reference: String(other.id), transaction_amount: 1.0, currency_id: 'BRL' });
        assert.equal(await processMercadoPagoPayment(otherPayment), 'amount_mismatch');
        assert.equal((await prisma.premiumOrder.findUniqueOrThrow({ where: { id: other.id } })).status, 'PENDING');
        assert.equal((await premiumStatus(prisma, victim.id)).active, false);
        // Webhook HTTP: assinatura inválida é rejeitada; válida processa.
        const okPayment = String(Number(paymentId) + 2);
        payments.set(okPayment, { id: Number(okPayment), status: 'approved', external_reference: String(other.id), transaction_amount: 19.9, currency_id: 'BRL' });
        const post = (sig: string) => realFetch(`${base}/webhooks/mercadopago?data.id=${okPayment}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': sig, 'x-request-id': 'req-teste' }, body: JSON.stringify({ type: 'payment', data: { id: okPayment } }) });
        assert.equal((await post('ts=1,v1=' + '0'.repeat(64))).status, 401);
        const ts = String(Date.now()), v1 = createHmac('sha256', 'segredo-de-teste').update(`id:${okPayment};request-id:req-teste;ts:${ts};`).digest('hex');
        const accepted = await post(`ts=${ts},v1=${v1}`);
        assert.equal(accepted.status, 200); assert.equal((await accepted.json()).outcome, 'granted');
        assert.equal((await premiumStatus(prisma, victim.id)).active, true);
      } finally { globalThis.fetch = realFetch; delete process.env.MP_ACCESS_TOKEN; delete process.env.MP_WEBHOOK_SECRET; }
    });
    await t.test('recuperação de senha: token de uso único, troca a senha e encerra sessões', async () => {
      const first = await login(buyer.email); assert.equal(first.status, 200);
      const token = await issueToken(prisma, buyer.id, 'RESET');
      assert.equal((await call('', '/auth/reset-password', { token: 'x'.repeat(64), password: 'Nova-senha-2026!' })).status, 400);
      assert.equal((await call('', '/auth/reset-password', { token, password: 'curta' })).status, 400);
      assert.equal((await call('', '/auth/reset-password', { token, password: 'Nova-senha-2026!' })).status, 200);
      assert.equal((await call('', '/auth/reset-password', { token, password: 'Outra-senha-2026!' })).status, 400);
      assert.equal((await call(first.cookie, '/me')).status, 401);
      assert.equal((await login(buyer.email)).status, 401);
      assert.equal((await login(buyer.email, 'Nova-senha-2026!')).status, 200);
      assert((await prisma.account.findUniqueOrThrow({ where: { id: buyer.id } })).emailVerifiedAt);
      const forgot = await call('', '/auth/forgot-password', { email: `nao-existe-${tag}@example.invalid` });
      assert.equal(forgot.status, 200);
    });
    await t.test('confirmação de e-mail', async () => {
      const token = await issueToken(prisma, seller.id, 'VERIFY');
      assert.equal((await call('', '/auth/verify-email', { token })).status, 200);
      assert((await prisma.account.findUniqueOrThrow({ where: { id: seller.id } })).emailVerifiedAt);
      assert.equal((await call('', '/auth/verify-email', { token })).status, 400);
    });
    await t.test('banimento impede entrada e derruba sessões; revogar restaura', async () => {
      const session = await login(victim.email); assert.equal(session.status, 200);
      const adminSession = await login(admin.email);
      const punish = await call(adminSession.cookie, `/admin/accounts/${victim.id}/punishments`, { kind: 'BAN', reason: 'Teste de banimento', hours: 2 });
      assert.equal(punish.status, 201); const p = await punish.json();
      assert.equal((await call(session.cookie, '/me')).status, 401);
      const denied = await login(victim.email); assert.equal(denied.status, 403);
      assert.equal((await call(adminSession.cookie, `/admin/punishments/${p.id}/revoke`, { reason: 'Teste concluído' })).status, 200);
      assert.equal((await login(victim.email)).status, 200);
      assert((await prisma.adminAuditLog.count({ where: { actorAccountId: admin.id, action: 'PUNISH_BAN', targetId: victim.id } })) >= 1);
    });
    await t.test('painel: permissões por cargo, motivo obrigatório, auditoria e ajuste de ouro com livro-razão', async () => {
      const player = await login(buyer.email, 'Nova-senha-2026!'), support = await login(staffSupport.email), adm = await login(admin.email);
      assert.equal((await call(player.cookie, '/admin/me')).status, 403);
      assert.equal((await call(support.cookie, '/admin/tickets')).status, 200);
      assert.equal((await call(support.cookie, '/admin/settings')).status, 403);
      assert.equal((await call(support.cookie, `/admin/accounts/${buyer.id}/punishments`, { kind: 'WARNING', reason: 'Sem permissão' })).status, 403);
      assert.equal((await call(adm.cookie, '/admin/economy?days=7')).status, 200);
      assert.equal((await call(adm.cookie, '/admin/settings', { values: { 'premium.presetLimit': 99 }, reason: 'Valor fora do intervalo' }, 'PUT')).status, 400);
      assert.equal((await call(adm.cookie, '/admin/settings', { values: { 'premium.presetLimit': 6 } }, 'PUT')).status, 400); // sem motivo
      assert.equal((await call(adm.cookie, '/admin/settings', { values: { 'premium.presetLimit': 6 }, reason: 'Teste de configuração' }, 'PUT')).status, 200);
      assert.equal((await loadSettings(prisma))['premium.presetLimit'], 6);
      await call(adm.cookie, '/admin/settings', { values: { 'premium.presetLimit': 5 }, reason: 'Restaurar padrão do teste' }, 'PUT');
      const target = victim.characters[0], before = (await prisma.character.findUniqueOrThrow({ where: { id: target.id } })).goldInHand;
      assert.equal((await call(adm.cookie, `/admin/characters/${target.id}/gold`, { delta: '500' })).status, 400);
      assert.equal((await call(adm.cookie, `/admin/characters/${target.id}/gold`, { delta: '500', reason: 'Sem chave' })).status, 400); // sem Idempotency-Key
      assert.equal((await call(adm.cookie, `/admin/characters/${target.id}/gold`, { delta: '500', reason: 'Compensação de teste' }, undefined, randomUUID())).status, 200);
      assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: target.id } })).goldInHand, before + 500n);
      assert.equal((await prisma.goldLedger.findFirstOrThrow({ where: { characterId: target.id, reason: 'ADMIN_GRANT' } })).delta, 500n);
      assert.equal((await call(adm.cookie, `/admin/characters/${target.id}/gold`, { delta: '-99999999', reason: 'Remoção excessiva' }, undefined, randomUUID())).status, 409);
      assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: target.id } })).goldInHand, before + 500n);
      assert((await prisma.adminAuditLog.count({ where: { actorAccountId: admin.id, action: 'GOLD_ADJUST', targetId: target.id } })) === 1);
    });
    await t.test('repetição e simultaneidade: ajuste de ouro e Premium da equipe aplicam uma única vez', async () => {
      const adm = await login(admin.email), target = victim.characters[0];
      const before = (await prisma.character.findUniqueOrThrow({ where: { id: target.id } })).goldInHand;
      const key = randomUUID(), body = { delta: '700', reason: 'Clique repetido' };
      const results = await Promise.all(Array.from({ length: 6 }, () => call(adm.cookie, `/admin/characters/${target.id}/gold`, body, undefined, key)));
      assert(results.every(r => r.status === 200));
      assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: target.id } })).goldInHand, before + 700n);
      assert.equal(await prisma.goldLedger.count({ where: { characterId: target.id, reason: 'ADMIN_GRANT', delta: 700n } }), 1);
      // mesma chave com outro valor é recusada, não aplicada
      assert.equal((await call(adm.cookie, `/admin/characters/${target.id}/gold`, { delta: '900', reason: 'Clique repetido' }, undefined, key)).status, 409);
      const pkey = randomUUID(), pbody = { days: 3, reason: 'Clique repetido premium' };
      await Promise.all(Array.from({ length: 4 }, () => call(adm.cookie, `/admin/accounts/${victim.id}/premium`, pbody, undefined, pkey)));
      assert.equal(await prisma.premiumPeriod.count({ where: { accountId: victim.id, reason: 'Clique repetido premium' } }), 1);
    });
    await t.test('mercado: duas compras simultâneas do mesmo anúncio — só uma vence', async () => {
      const item = await prisma.inventoryItem.create({ data: { characterId: sellerChar.id, blueprintId: sword.id } });
      const { listingId } = await listItem(seller.id, sellerChar.id, item.id, '300', randomUUID());
      const buyer2 = premiumAcc.characters[0];
      const outcomes = await Promise.allSettled([buyListing(buyer.id, buyerChar.id, listingId), buyListing(premiumAcc.id, buyer2.id, listingId)]);
      assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
      assert.equal((await prisma.marketListing.findUniqueOrThrow({ where: { id: listingId } })).status, 'SOLD');
      // O mercado guarda o item em custódia e entrega uma linha nova ao comprador: conferir pelo livro de itens.
      const deliveries = await prisma.itemLedger.findMany({ where: { reason: 'MARKET_BUY', refType: 'listing', refId: listingId } });
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0].delta, 1);
    });
    await t.test('economia: o mesmo dono não compra de si mesmo, config perigosa é recusada e o ouro confere com o livro-razão', async () => {
      const alt = await prisma.character.create({ data: { accountId: buyer.id, name: `Alt ${tag}`, level: 5, goldInHand: 5000n, hp: 100, maxHp: 100 } });
      const item = await prisma.inventoryItem.create({ data: { characterId: alt.id, blueprintId: sword.id } });
      const { listingId } = await listItem(buyer.id, alt.id, item.id, '2000', randomUUID());
      await assert.rejects(buyListing(buyer.id, buyerChar.id, listingId), /mesma conta|outro personagem/);
      await prisma.marketListing.update({ where: { id: listingId }, data: { status: 'CANCELLED' } });
      const adm = await login(admin.email);
      const bad = await call(adm.cookie, '/admin/settings', { values: { 'economy.npcBuyPercent': 50, 'economy.npcSellPercent': 100 }, reason: 'Teste de configuração perigosa' }, 'PUT');
      assert.equal(bad.status, 400);
      assert.equal((await loadSettings(prisma))['economy.npcSellPercent'], 50);
      const drift = await (await call(adm.cookie, '/admin/economy/reconcile')).json();
      const mine = [sellerChar.id, buyerChar.id, premiumAcc.characters[0].id, victim.characters[0].id];
      assert.deepEqual(drift.drift.filter((d: any) => mine.includes(d.characterId)), []);
    });
    await t.test('forja com risco: cada resultado confere com a mochila, o extrato de ouro e o de itens; venda de item melhorado exige confirmação', async () => {
      const smith = await prisma.character.create({ data: { accountId: victim.id, name: `Forja ${tag}`, goldInHand: 100_000_000n, hp: 100, maxHp: 100 } });
      const trials = 40, ids: number[] = [];
      for (let n = 0; n < trials; n++) ids.push((await prisma.inventoryItem.create({ data: { characterId: smith.id, blueprintId: sword.id, upgradeTier: 9 } })).id);
      const seen = { SUCCESS: 0, FAILED: 0, BROKE: 0 } as Record<string, number>;
      for (const id of ids) {
        const key = randomUUID(), r = await upgrade(victim.id, smith.id, id, 9, key);
        assert.deepEqual(await upgrade(victim.id, smith.id, id, 9, key), r); // repetir o pedido devolve o mesmo resultado, sem novo sorteio
        seen[r.outcome]++;
        const row = await prisma.inventoryItem.findUnique({ where: { id } });
        if (r.outcome === 'SUCCESS') assert.equal(row?.upgradeTier, 10);
        if (r.outcome === 'FAILED') assert.equal(row?.upgradeTier, 9);
        if (r.outcome === 'BROKE') assert.equal(row, null);
      }
      assert(seen.SUCCESS > 0 && seen.SUCCESS < trials, JSON.stringify(seen)); // 25% de chance por tentativa
      assert.equal(await prisma.goldLedger.count({ where: { characterId: smith.id, reason: 'UPGRADE' } }), trials); // ouro gasto em toda tentativa
      assert.equal(await prisma.itemLedger.count({ where: { characterId: smith.id, reason: 'UPGRADE_BREAK' } }), seen.BROKE);
      const drift = (await itemDrift(prisma, 5000)).find(d => d.characterId === smith.id && d.blueprintId === sword.id);
      assert.equal(drift?.difference, trials); // criados direto no banco (sem extrato): a quebra não pode mudar essa diferença
      const mine = await prisma.inventoryItem.findFirst({ where: { characterId: smith.id, upgradeTier: { gt: 0 } } });
      if (mine) {
        await assert.rejects(sellNpc(victim.id, smith.id, mine.id), /melhorado/);
        assert(await prisma.inventoryItem.findUnique({ where: { id: mine.id } }));
        await sellNpc(victim.id, smith.id, mine.id, true);
        assert.equal(await prisma.inventoryItem.findUnique({ where: { id: mine.id } }), null);
      }
    });
    await t.test('Pedra de Proteção: só é gasta quando evita uma quebra; sem pedra o pedido é recusado antes de cobrar', async () => {
      const stoneBp = await prisma.itemBlueprint.upsert({ where: { name: 'Pedra de Proteção' }, update: {}, create: { name: 'Pedra de Proteção', slot: 'LOOT', spriteUrl: '', npcPrice: 0 } });
      const smith = await prisma.character.create({ data: { accountId: victim.id, name: `Pedra ${tag}`, goldInHand: 100_000_000n, hp: 100, maxHp: 100 } });
      const first = await prisma.inventoryItem.create({ data: { characterId: smith.id, blueprintId: sword.id, upgradeTier: 9 } });
      await assert.rejects(upgrade(victim.id, smith.id, first.id, 9, randomUUID(), true), /Pedra de Proteção/);
      assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: smith.id } })).goldInHand, 100_000_000n); // nada foi cobrado
      const trials = 30;
      await prisma.inventoryItem.create({ data: { characterId: smith.id, blueprintId: stoneBp.id, quantity: trials } });
      const ids = [first.id];
      for (let n = 1; n < trials; n++) ids.push((await prisma.inventoryItem.create({ data: { characterId: smith.id, blueprintId: sword.id, upgradeTier: 9 } })).id);
      let protectedCount = 0;
      for (const id of ids) {
        const r = await upgrade(victim.id, smith.id, id, 9, randomUUID(), true);
        assert.notEqual(r.outcome, 'BROKE'); // com pedra e pedras de sobra, nada quebra
        const row = await prisma.inventoryItem.findUnique({ where: { id } });
        assert(row);
        if (r.outcome === 'PROTECTED') { protectedCount++; assert.equal(row.upgradeTier, 9); }
      }
      assert(protectedCount > 0 && protectedCount < trials, String(protectedCount));
      const left = await prisma.inventoryItem.findFirst({ where: { characterId: smith.id, blueprintId: stoneBp.id } });
      assert.equal(left?.quantity ?? 0, trials - protectedCount); // gasta exatamente uma pedra por quebra evitada
      assert.equal(await prisma.itemLedger.count({ where: { characterId: smith.id, reason: 'PROTECTION_USE' } }), protectedCount);
    });
    await t.test('item raro (+10): número único e em sequência, sobrevive ao mercado, anonimato respeitado, venda ao NPC marca destruído', async () => {
      const smith = await prisma.character.create({ data: { accountId: victim.id, name: `Raro ${tag}`, level: 5, goldInHand: 1_000_000_000n, hp: 100, maxHp: 100 } });
      const blueprint = await prisma.itemBlueprint.upsert({ where: { name: `Espada de Teste ${tag}` }, update: {}, create: { name: `Espada de Teste ${tag}`, slot: 'WEAPON', spriteUrl: '', attack: 10, npcPrice: 100 } });
      const winners: number[] = [];
      for (let n = 0; n < 60 && winners.length < 3; n++) {
        const it = await prisma.inventoryItem.create({ data: { characterId: smith.id, blueprintId: blueprint.id, upgradeTier: 9 } });
        const r = await upgrade(victim.id, smith.id, it.id, 9, randomUUID()); // sem Pedra de Proteção: quebras não atrapalham, cada tentativa usa um item novo
        if (r.outcome === 'SUCCESS') { winners.push(it.id); assert(r.rareSerial); }
      }
      assert.equal(winners.length, 3);
      const rares = await prisma.rareItem.findMany({ where: { blueprintId: blueprint.id }, orderBy: { serial: 'asc' } });
      assert.deepEqual(rares.map(r => r.serial), [1, 2, 3]);              // sem buracos nem repetição
      assert.deepEqual(rares.map(r => r.firstOfKind), [true, false, false]);
      assert.equal(await prisma.inventoryItem.count({ where: { rareItemId: { in: rares.map(r => r.id) } } }), 3);
      // Mercado: anunciar e cancelar devolve o MESMO item raro (mesmo número).
      const rare1 = rares[0], row1 = await prisma.inventoryItem.findFirstOrThrow({ where: { rareItemId: rare1.id } });
      const { listingId } = await listItem(victim.id, smith.id, row1.id, '5000', randomUUID());
      assert.equal(await prisma.inventoryItem.count({ where: { rareItemId: rare1.id } }), 0);
      await cancelListing(victim.id, smith.id, listingId);
      assert.equal(await prisma.inventoryItem.count({ where: { rareItemId: rare1.id } }), 1);
      assert.equal((await prisma.rareItem.findUniqueOrThrow({ where: { id: rare1.id } })).status, 'CIRCULATING');
      // Venda ao NPC tira o raro de circulação; o registro e a história permanecem.
      const row2 = await prisma.inventoryItem.findFirstOrThrow({ where: { rareItemId: rares[1].id } });
      await sellNpc(victim.id, smith.id, row2.id, true);
      const gone = await prisma.rareItem.findUniqueOrThrow({ where: { id: rares[1].id }, include: { events: true } });
      assert.equal(gone.status, 'RETIRED'); assert(gone.events.some(e => e.kind === 'RETIRED'));
      // Anonimato: a inspeção pública não mostra o nome nem no texto da história.
      const viewer = await login(buyer.email, 'Nova-senha-2026!');
      assert.equal((await call(viewer.cookie, `/characters/${smith.id}/privacy`, { fameHidden: true })).status, 404); // só o dono altera
      await prisma.character.update({ where: { id: smith.id }, data: { fameHidden: true } });
      const view = await (await call(viewer.cookie, `/rare-items/${rare1.id}`)).json();
      assert.equal(view.anonymous, true); assert.equal(view.creator, null);
      assert(!JSON.stringify(view).includes(smith.name));
      assert.match(view.label, /Nº 000001/);
      const list = await (await call(viewer.cookie, `/rare-items?blueprintId=${blueprint.id}`)).json();
      assert.equal(list.circulating, 2); assert.equal(list.destroyed, 1);
      // Coleção pública: páginas de 10, filtros por situação e totais; o nome escondido não aparece em nenhuma lista.
      assert.equal(list.total, 3); assert.equal(list.page, 1); assert.equal(list.items.length, 3);
      const only = async (status: string) => (await (await call(viewer.cookie, `/rare-items?blueprintId=${blueprint.id}&status=${status}`)).json()) as { total: number; items: { destroyed: boolean; firstOfKind: boolean }[] };
      assert.equal((await only('circulating')).total, 2); assert.equal((await only('destroyed')).items[0].destroyed, true); assert.equal((await only('first')).total, 1);
      assert.equal((await (await call(viewer.cookie, `/rare-items?q=${encodeURIComponent('item-que-nao-existe-' + tag)}`)).json()).total, 0);
      const latest = await (await call(viewer.cookie, '/rare-items/latest')).json() as { name: string; creator: string | null }[];
      assert(latest.length >= 1 && latest.length <= 3); assert(!JSON.stringify(latest).includes(smith.name));
      const totals = await (await call(viewer.cookie, '/rare-items/totals')).json() as { circulating: number; destroyed: number; firsts: number };
      assert(totals.circulating >= 2); assert(totals.destroyed >= 1); assert(totals.firsts >= 1);
      assert(!JSON.stringify(await (await call(viewer.cookie, `/rare-items?blueprintId=${blueprint.id}`)).json()).includes(smith.name));
    });
    await t.test('suporte: jogador abre atendimento; equipe responde; nota interna não aparece ao jogador', async () => {
      const player = await login(buyer.email, 'Nova-senha-2026!'), support = await login(staffSupport.email);
      const created = await call(player.cookie, '/support/tickets', { kind: 'SUPPORT', subject: 'Perdi um item', body: 'Meu item sumiu depois de anunciar.' });
      assert.equal(created.status, 201); const { id } = await created.json();
      assert.equal((await call(support.cookie, `/admin/tickets/${id}/messages`, { body: 'Nota interna: verificar livro-razão.', internal: true })).status, 200);
      assert.equal((await call(support.cookie, `/admin/tickets/${id}/messages`, { body: 'Estamos verificando, obrigado.' })).status, 200);
      const view = await (await call(player.cookie, `/support/tickets/${id}`)).json();
      assert.deepEqual(view.messages.map((m: any) => m.fromStaff), [false, true]);
      assert(!JSON.stringify(view).includes('Nota interna'));
      const other = await login(seller.email); assert.equal((await call(other.cookie, `/support/tickets/${id}`)).status, 404);
      assert.equal((await call(player.cookie, '/support/tickets', { kind: 'REPORT', subject: 'Denúncia', body: 'Texto longo o bastante.', reportedName: 'Ninguém Existe' })).status, 404);
    });
  } finally { globalThis.fetch = realFetch; await new Promise<void>(r => server.close(() => r())); await prisma.$disconnect(); }
});
