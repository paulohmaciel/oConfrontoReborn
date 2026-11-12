import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { goldDrift } from '../src/economy/reconcile';
import { addStat, resetStats } from '../src/game/gameService';
import { statsResetCost } from '../../shared/economy';

// Pressupõe os padrões de configuração (stats.resetBaseGold e stats.resetGoldPerLevelSquared).
test('MySQL: atributos em lote e redistribuição paga', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8);
  const acc = await prisma.account.create({ data: { email: `stats-${tag}@example.invalid`, password: await hashPassword('Stats-test-2026!'),
    characters: { create: { name: `Atributos ${tag}`, vocation: 'KNIGHT', vocationChosen: true, level: 50, statPoints: 150, hp: 400, maxHp: 400, mana: 300, maxMana: 300 } } }, include: { characters: true } });
  const a = acc.id, c = acc.characters[0].id;
  const get = () => prisma.character.findUniqueOrThrow({ where: { id: c } });
  await prisma.goldLedger.create({ data: { characterId: c, delta: 1_000_000n, balanceAfter: 1_000_100n, reason: 'ADMIN_GRANT' } });
  await prisma.character.update({ where: { id: c }, data: { goldInHand: 1_000_100n } });

  await t.test('distribui vários pontos de uma vez e repete a mesma chave sem dobrar', async () => {
    const key = randomUUID();
    await addStat(a, c, 'vitality', key, 40); await addStat(a, c, 'vitality', key, 40);
    await addStat(a, c, 'strength', randomUUID(), 60);
    const h = await get();
    assert.equal(h.vitality, 50); assert.equal(h.strength, 70); assert.equal(h.statPoints, 50);
    assert.equal(h.maxHp, 400 + 40 * 15); assert.equal(h.hp, 400 + 40 * 15);
    await assert.rejects(() => addStat(a, c, 'agility', randomUUID(), 51), /só 50 pontos/);
  });
  await t.test('redistribuir devolve tudo, tira o bônus de vida e cobra pelo nível', async () => {
    const before = await get(), settings = await loadSettings(prisma);
    const cost = statsResetCost(before.level, settings['stats.resetBaseGold'], settings['stats.resetGoldPerLevelSquared']);
    await resetStats(a, c, randomUUID());
    const h = await get();
    assert.equal(h.strength, 10); assert.equal(h.vitality, 10); assert.equal(h.statPoints, 150);
    assert.equal(h.maxHp, 400); assert.equal(h.hp, 400);
    assert.equal(h.goldInHand, before.goldInHand - cost);
    await assert.rejects(() => resetStats(a, c, randomUUID()), /Nenhum ponto/);
  });
  await t.test('sem ouro não redistribui, e o extrato de ouro bate', async () => {
    await addStat(a, c, 'agility', randomUUID(), 5);
    const h = await get();
    await prisma.character.update({ where: { id: c }, data: { goldInHand: 0n } });
    await prisma.goldLedger.create({ data: { characterId: c, delta: -h.goldInHand, balanceAfter: 0n, reason: 'ADMIN_REMOVE' } });
    await assert.rejects(() => resetStats(a, c, randomUUID()), /custa/);
    assert.equal((await get()).agility, 15);
    assert.deepEqual((await goldDrift(prisma, 5000)).filter(d => d.characterId === c), []);
  });
  await prisma.$disconnect();
});
