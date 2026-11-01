import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Vocation } from '@prisma/client';
import { prisma, transaction } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { addGold, addItem } from '../src/economy/economy';
import { goldDrift, itemDrift } from '../src/economy/reconcile';
import { answerDuel, challenge, duelState, expireDuels, forfeitDuel, honorCosmeticAction, ransomLoot } from '../src/game/duelService';
import { PROTECTION_STONE } from '../../shared/economy';

// Apostas do Duelo (Comando 9): ouro travado, prêmio menos taxa, empate devolve, espólio com proteções e resgate, honra e loja da honra.
// Pressupõe os padrões de configuração pvp.* (aposta 10% do mais pobre, taxa 5%, espólio 25%, proteção a partir de +7, 3 duelos valendo por par/dia).
test('MySQL: duelo valendo ouro e espólio', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), settings = await loadSettings(prisma);
  const make = async (who: string, vocation: Vocation, gold: bigint) => {
    const acc = await prisma.account.create({ data: { email: `aposta-${who}-${tag}@example.invalid`, password: await hashPassword('Aposta-test-2026!'),
      characters: { create: { name: `${who} ${tag}`, vocation, vocationChosen: true, level: 100, hp: 5000, maxHp: 5000, mana: 2000, maxMana: 2000, goldInHand: 0n } } }, include: { characters: true } });
    const c = acc.characters[0];
    await transaction(tx => addGold(tx, c.id, gold, 'ADMIN_GRANT'));
    return { a: acc.id, c: c.id, name: c.name };
  };
  const rich = await make('Rico', 'KNIGHT', 10_000n), poor = await make('Modesto', 'DRUID', 2_000n), other = await make('Outro', 'PALADIN', 5_000n);
  await prisma.friendship.create({ data: { requesterId: rich.c, addresseeId: poor.c, status: 'ACCEPTED', respondedAt: new Date() } });
  await prisma.friendship.create({ data: { requesterId: rich.c, addresseeId: other.c, status: 'ACCEPTED', respondedAt: new Date() } });
  const gold = async (id: number) => (await prisma.character.findUniqueOrThrow({ where: { id }, select: { goldInHand: true } })).goldInHand;
  const accept = async (h: { a: number; c: number }) => answerDuel(h.a, h.c, (await duelState(h.a, h.c, '')).received[0].id, true);
  const activeDuel = async (h: { a: number; c: number }) => (await duelState(h.a, h.c, '')).duel!.id;
  // Joga um duelo inteiro em que `loser` se rende.
  const play = async (mode: string, challenger: typeof rich, target: typeof poor, loser: typeof rich, wager?: number) => {
    await challenge(challenger.a, challenger.c, target.name, mode, wager);
    await accept(target);
    await forfeitDuel(loser.a, loser.c, await activeDuel(loser));
  };
  // O limite por par conta as últimas 24 h; para repetir, os duelos antigos "envelhecem".
  const age = () => prisma.duel.updateMany({ where: { OR: [{ challengerId: { in: [rich.c, poor.c, other.c] } }] }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });

  await t.test('aposta: teto pelo mais pobre, travada no aceite; vencedor leva o pote menos a taxa', async () => {
    await assert.rejects(() => challenge(rich.a, rich.c, poor.name, 'GOLD', 50_000), /não tem esse ouro/);
    await assert.rejects(() => challenge(rich.a, rich.c, poor.name, 'GOLD', 'abc'), /aposta em ouro/);
    await assert.rejects(() => challenge(rich.a, rich.c, poor.name, 'NADA'), /Forma de duelo/);
    await challenge(rich.a, rich.c, poor.name, 'GOLD', 5_000);
    const invite = (await duelState(poor.a, poor.c, '')).received[0];
    assert.equal(invite.mode, 'GOLD');
    await accept(poor);
    // 10% dos 2.000 do mais pobre = 200 de cada um.
    assert.equal(await gold(rich.c), 9_800n);
    assert.equal(await gold(poor.c), 1_800n);
    await forfeitDuel(poor.a, poor.c, await activeDuel(poor));
    const fee = BigInt(Math.max(1, Math.floor(400 * settings['pvp.wagerFeePercent'] / 100)));
    assert.equal(await gold(rich.c), 9_800n + 400n - fee);
    assert.equal(await gold(poor.c), 1_800n);
    const ledger = await prisma.goldLedger.findMany({ where: { characterId: rich.c, refType: 'duel' }, select: { reason: true, delta: true } });
    assert.deepEqual(ledger.map(l => l.reason).sort(), ['DUEL_FEE', 'DUEL_PRIZE', 'DUEL_WAGER']);
    const r = await prisma.character.findUniqueOrThrow({ where: { id: rich.c } }), p = await prisma.character.findUniqueOrThrow({ where: { id: poor.c } });
    assert.equal(r.honorPoints, 1000 + 16); assert.equal(p.honorPoints, 1000 - 16);
    assert.equal(r.honorMarks, settings['pvp.honorMarksWin']); assert.equal(p.honorMarks, settings['pvp.honorMarksLoss']);
  });

  await t.test('empate devolve a aposta (os dois somem por duas rodadas)', async () => {
    const [g1, g2] = [await gold(rich.c), await gold(other.c)];
    await challenge(rich.a, rich.c, other.name, 'GOLD', 100);
    await accept(other);
    assert.equal(await gold(rich.c), g1 - 100n);
    for (let i = 0; i < 2; i++) { await prisma.duel.updateMany({ where: { challengerId: rich.c, status: 'FIGHTING' }, data: { deadlineAt: new Date(Date.now() - 1000) } }); await expireDuels(); }
    const d = await prisma.duel.findFirstOrThrow({ where: { challengerId: rich.c, opponentId: other.c }, orderBy: { id: 'desc' } });
    assert.equal(d.outcome, 'DRAW');
    assert.equal(await gold(rich.c), g1);
    assert.equal(await gold(other.c), g2);
  });

  await t.test('limite de duelos valendo por par', async () => {
    await age();
    for (let i = 0; i < settings['pvp.pairDailyLimit']; i++) await play('GOLD', rich, poor, poor, 10);
    await assert.rejects(() => challenge(rich.a, rich.c, poor.name, 'LOOT'), /nas últimas 24 horas/);
    // Duelo de honra continua livre.
    await challenge(rich.a, rich.c, poor.name, 'HONOR');
    await answerDuel(poor.a, poor.c, (await duelState(poor.a, poor.c, '')).received[0].id, false);
  });

  // Mochila do perdedor: um equipado, um favorito, um +7, um raro empilhável (poção) e um item comum, o único que pode cair.
  const weapon = await prisma.itemBlueprint.findFirstOrThrow({ where: { slot: 'WEAPON', npcPrice: { gt: 0 } }, orderBy: { id: 'asc' } });
  const potion = await prisma.itemBlueprint.findFirstOrThrow({ where: { slot: 'CONSUMABLE' } });
  const stone = await prisma.itemBlueprint.findUniqueOrThrow({ where: { name: PROTECTION_STONE } });
  const ids = await transaction(async tx => {
    const equipped = await addItem(tx, poor.c, weapon.id, 1, 'ADMIN_GRANT');
    const favorite = await addItem(tx, poor.c, weapon.id, 1, 'ADMIN_GRANT');
    const high = await addItem(tx, poor.c, weapon.id, 1, 'ADMIN_GRANT', undefined, 7);
    await addItem(tx, poor.c, potion.id, 5, 'ADMIN_GRANT');
    const target = await addItem(tx, poor.c, weapon.id, 1, 'ADMIN_GRANT', undefined, 2);
    await tx.inventoryItem.update({ where: { id: equipped.id }, data: { isEquipped: true, equippedSlot: 'WEAPON' } });
    await tx.inventoryItem.update({ where: { id: favorite.id }, data: { favorite: true } });
    return { equipped: equipped.id, favorite: favorite.id, high: high.id, target: target.id };
  });
  // Joga duelos de espólio (o perdedor se rende) até o espólio sair; com 25% de chance, 60 tentativas quase nunca falham.
  const lootUntil = async (done: () => Promise<boolean>) => {
    for (let i = 0; i < 60; i++) { await age(); await play('LOOT', rich, poor, poor); if (await done()) return; }
    assert.fail('o espólio nunca saiu');
  };

  await t.test('espólio leva só o item permitido, e o perdedor pode resgatar', async () => {
    await lootUntil(async () => !!await prisma.duelLoot.findFirst({ where: { loserId: poor.c } }));
    const loot = await prisma.duelLoot.findFirstOrThrow({ where: { loserId: poor.c } });
    assert.equal(loot.inventoryItemId, ids.target);
    assert.equal(loot.upgradeTier, 2);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ids.target } })).characterId, rich.c);
    for (const id of [ids.equipped, ids.favorite, ids.high]) assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).characterId, poor.c);
    const s = await duelState(poor.a, poor.c, '');
    assert.equal(s.lootsLost[0].id, loot.id);
    await assert.rejects(() => ransomLoot(rich.a, rich.c, loot.id), /não encontrado/);
    const [gp, gr] = [await gold(poor.c), await gold(rich.c)];
    await ransomLoot(poor.a, poor.c, loot.id);
    assert.equal(await gold(poor.c), gp - loot.ransomPrice);
    assert.equal(await gold(rich.c), gr + loot.ransomPrice);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: ids.target } })).characterId, poor.c);
    await assert.rejects(() => ransomLoot(poor.a, poor.c, loot.id), /já foi resgatado/);
  });

  await t.test('resgate some se o vencedor usou o item ou se o prazo venceu', async () => {
    await lootUntil(async () => !!await prisma.duelLoot.findFirst({ where: { loserId: poor.c, status: 'OPEN' } }));
    const loot = await prisma.duelLoot.findFirstOrThrow({ where: { loserId: poor.c, status: 'OPEN' } });
    await prisma.inventoryItem.update({ where: { id: loot.inventoryItemId }, data: { isEquipped: true } });
    await assert.rejects(() => ransomLoot(poor.a, poor.c, loot.id), /já usou/);
    await prisma.inventoryItem.update({ where: { id: loot.inventoryItemId }, data: { isEquipped: false } });
    await prisma.duelLoot.update({ where: { id: loot.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expireDuels();
    assert.equal((await prisma.duelLoot.findUniqueOrThrow({ where: { id: loot.id } })).status, 'EXPIRED');
    await assert.rejects(() => ransomLoot(poor.a, poor.c, loot.id), /resgatado ou perdeu o prazo/);
  });

  await t.test('Pedra de Proteção na mochila salva o item e é gasta', async () => {
    // Devolve um item comum ao perdedor (o anterior ficou com o vencedor) e dá uma pedra.
    await transaction(async tx => { await addItem(tx, poor.c, weapon.id, 1, 'ADMIN_GRANT'); await addItem(tx, poor.c, stone.id, 1, 'ADMIN_GRANT'); });
    const before = await prisma.duelLoot.count({ where: { loserId: poor.c } });
    await lootUntil(async () => !!await prisma.itemLedger.findFirst({ where: { characterId: poor.c, reason: 'PROTECTION_USE', refType: 'duel' } }));
    assert.equal(await prisma.duelLoot.count({ where: { loserId: poor.c } }), before);
    assert.equal(await prisma.inventoryItem.count({ where: { characterId: poor.c, blueprintId: stone.id } }), 0);
  });

  await t.test('loja da honra: só aparência, paga com marcas', async () => {
    await assert.rejects(() => honorCosmeticAction(poor.a, poor.c, 'capriel-legend', true), /Faltam/);
    await assert.rejects(() => honorCosmeticAction(poor.a, poor.c, 'inexistente', true), /inválida/);
    await prisma.character.update({ where: { id: poor.c }, data: { honorMarks: 60 } });
    await honorCosmeticAction(poor.a, poor.c, 'duelist', true);
    const c = await prisma.character.findUniqueOrThrow({ where: { id: poor.c } });
    assert.equal(c.honorMarks, 10);
    assert.equal(c.profileTitle, 'duelist');
    await assert.rejects(() => honorCosmeticAction(poor.a, poor.c, 'duelist', true), /já tem/);
    await assert.rejects(() => honorCosmeticAction(poor.a, poor.c, 'honor', false), /ainda não tem/);
  });

  await t.test('ouro e itens conferem com os livros-razão', async () => {
    const mine = [rich.c, poor.c, other.c];
    assert.deepEqual((await goldDrift(prisma, 100_000)).filter(d => mine.includes(d.characterId)), []);
    assert.deepEqual((await itemDrift(prisma, 100_000)).filter(d => mine.includes(d.characterId)), []);
  });
});
