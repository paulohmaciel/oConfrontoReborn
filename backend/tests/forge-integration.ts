import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, transaction } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { addItem } from '../src/economy/economy';
import { itemDrift } from '../src/economy/reconcile';
import { buyNpc, equip } from '../src/game/inventoryService';
import { craft, craftCost, reforge, reforgeCost, salvage } from '../src/game/forgeService';

// Pressupõe o seed atual (materiais e catálogo até o nível 1000) e os padrões de configuração do Ferreiro.
test('MySQL: Ferreiro fabrica, reforja e desmonta com extrato conciliado', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8);
  const acc = await prisma.account.create({ data: { email: `forge-${tag}@example.invalid`, password: await hashPassword('Forge-test-2026!'),
    characters: { create: { name: `Ferreiro ${tag}`, vocation: 'KNIGHT', vocationChosen: true, level: 120, goldInHand: 50_000_000n, hp: 1000, maxHp: 1000 } } }, include: { characters: true } });
  const a = acc.id, c = acc.characters[0].id;
  const bp = (name: string) => prisma.itemBlueprint.findUniqueOrThrow({ where: { name } });
  const [emerald, sapphire, halberd, giant, naginata, star] = await Promise.all(['Esmeralda Bruta', 'Safira Bruta', 'Guardian Halberd', 'Giant Sword', 'Naginata', 'Throwing Star'].map(bp));
  const count = async (blueprintId: number) => (await prisma.inventoryItem.aggregate({ where: { characterId: c, blueprintId }, _sum: { quantity: true } }))._sum.quantity ?? 0;
  const gold = async () => (await prisma.character.findUniqueOrThrow({ where: { id: c } })).goldInHand;
  const settings = await loadSettings(prisma), need = settings['forge.craftMaterials'];
  await transaction(async tx => { await addItem(tx, c, emerald.id, 20, 'ADMIN_GRANT'); await addItem(tx, c, sapphire.id, need, 'ADMIN_GRANT'); });

  await t.test('Mercador não vende equipamento acima do nível configurado', async () => {
    await assert.rejects(() => buyNpc(a, c, naginata.id, 1, randomUUID()), /Mercador só vende/);
  });
  await t.test('fabricar gasta materiais da faixa e ouro, e é idempotente pela chave', async () => {
    const before = await gold(), key = randomUUID();
    const r1 = await craft(a, c, halberd.id, key), r2 = await craft(a, c, halberd.id, key);
    assert.equal(r1.itemId, r2.itemId);
    assert.equal(await count(emerald.id), 20 - need);
    assert.equal(await gold(), before - craftCost(halberd, settings));
    assert.equal(await count(halberd.id), 1);
  });
  await t.test('sem materiais suficientes nada muda', async () => {
    const before = await gold();
    await craft(a, c, giant.id, randomUUID());
    assert.equal(await count(sapphire.id), 0);
    await assert.rejects(() => craft(a, c, giant.id, randomUUID()), /Materiais insuficientes/);
    assert.equal(await gold(), before - craftCost(giant, settings));
  });
  await t.test('reforjar troca o item, guarda metade da melhoria e respeita tipo, nível e vocação', async () => {
    const item = await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: c, blueprintId: giant.id } });
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { upgradeTier: 6 } });
    await assert.rejects(() => reforge(a, c, item.id, star.id, randomUUID()), /vocação/);
    await assert.rejects(() => reforge(a, c, item.id, giant.id, randomUUID()), /nível maior/);
    const before = await gold(), emeraldBefore = await count(emerald.id);
    await reforge(a, c, item.id, naginata.id, randomUUID());
    const after = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    assert.equal(after.blueprintId, naginata.id); assert.equal(after.upgradeTier, 3);
    assert.equal(await count(emerald.id), emeraldBefore - need);
    assert.equal(await gold(), before - reforgeCost(naginata, settings));
  });
  await t.test('desmontar pede confirmação se melhorado, recusa equipado e devolve materiais', async () => {
    const item = await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: c, blueprintId: naginata.id } });
    await assert.rejects(() => salvage(a, c, item.id, false, randomUUID()), /melhorado/);
    const emeraldBefore = await count(emerald.id);
    await salvage(a, c, item.id, true, randomUUID());
    assert.equal(await count(naginata.id), 0);
    assert.equal(await count(emerald.id), emeraldBefore + settings['forge.salvageMaterials'] + 1);
    const equipped = await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: c, blueprintId: halberd.id } });
    await equip(a, c, equipped.id);
    await assert.rejects(() => salvage(a, c, equipped.id, false, randomUUID()), /Desequipe/);
  });
  await t.test('extrato de itens bate com a mochila', async () => {
    assert.deepEqual((await itemDrift(prisma, 5000)).filter(d => d.characterId === c), []);
  });
  await prisma.$disconnect();
});
