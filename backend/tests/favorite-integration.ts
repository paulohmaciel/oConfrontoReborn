import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { listItem } from '../src/economy/marketService';
import { reforge, salvage } from '../src/game/forgeService';
import { sellNpc, upgrade } from '../src/game/gameService';

test('MySQL: item favorito fica protegido contra venda, anúncio, Ferreiro e melhoria que pode quebrar', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), settings = await loadSettings(prisma);
  const acc = await prisma.account.create({ data: { email: `fav-${tag}@example.invalid`, password: await hashPassword('Favorito-test-2026!'), emailVerifiedAt: new Date(),
    characters: { create: { name: `Favorito ${tag}`, vocation: 'KNIGHT', vocationChosen: true, level: 60, goldInHand: 0n } } }, include: { characters: true } });
  const a = acc.id, c = acc.characters[0].id;
  await prisma.goldLedger.create({ data: { characterId: c, delta: 10_000_000n, balanceAfter: 10_000_000n, reason: 'ADMIN_GRANT' } });
  await prisma.character.update({ where: { id: c }, data: { goldInHand: 10_000_000n } });
  const bp = await prisma.itemBlueprint.findFirstOrThrow({ where: { slot: 'WEAPON', npcPrice: { gt: 0 }, minLevel: { lte: 20 } }, orderBy: { minLevel: 'desc' } });
  const target = await prisma.itemBlueprint.findFirstOrThrow({ where: { slot: 'WEAPON', npcPrice: { gt: 0 }, id: { not: bp.id }, minLevel: { lte: 60 } } });
  const item = await prisma.inventoryItem.create({ data: { characterId: c, blueprintId: bp.id, upgradeTier: settings['upgrade.breakFromTier'], favorite: true } });

  await t.test('bloqueia as operações que podem perder o item', async () => {
    await assert.rejects(() => sellNpc(a, c, item.id, true), /favorito/);
    await assert.rejects(() => listItem(a, c, item.id, '1000', randomUUID()), /favorito/);
    await assert.rejects(() => salvage(a, c, item.id, true, randomUUID()), /favorito/);
    await assert.rejects(() => reforge(a, c, item.id, target.id, randomUUID()), /favorito/);
    await assert.rejects(() => upgrade(a, c, item.id, item.upgradeTier, randomUUID()), /favorito/);
    assert(await prisma.inventoryItem.findUnique({ where: { id: item.id } }), 'o item continua na mochila');
  });

  await t.test('melhoria segura continua liberada, e sem a estrela tudo volta a funcionar', async () => {
    const safe = await prisma.inventoryItem.create({ data: { characterId: c, blueprintId: bp.id, upgradeTier: 0, favorite: true } });
    const r = await upgrade(a, c, safe.id, 0, randomUUID()) as { outcome: string };
    assert.equal(r.outcome, 'SUCCESS');
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { favorite: false } });
    await sellNpc(a, c, item.id, true);
    assert.equal(await prisma.inventoryItem.findUnique({ where: { id: item.id } }), null);
  });
});
