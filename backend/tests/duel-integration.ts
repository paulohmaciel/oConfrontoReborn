import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Vocation } from '@prisma/client';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { advanceDuel, answerDuel, cancelChallenge, challenge, chooseDuelAction, duelHistory, duelState, expireDuels, forfeitDuel } from '../src/game/duelService';

// Pressupõe os padrões de configuração do duelo (pvp.*).
test('MySQL: duelo entre amigos', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), settings = await loadSettings(prisma);
  const make = async (who: string, vocation: Vocation, level = 100, accountId?: number) => {
    const character = { name: `${who} ${tag}`, vocation, vocationChosen: true, level, hp: 900, maxHp: 5000, mana: 300, maxMana: 2000, energy: 100, maxEnergy: 100, goldInHand: 777n, experience: 123456n };
    if (accountId) { const c = await prisma.character.create({ data: { ...character, accountId } }); return { a: accountId, c: c.id, name: c.name }; }
    const acc = await prisma.account.create({ data: { email: `duelo-${who}-${tag}@example.invalid`, password: await hashPassword('Duelo-test-2026!'), characters: { create: character } }, include: { characters: true } });
    return { a: acc.id, c: acc.characters[0].id, name: acc.characters[0].name };
  };
  const friend = (x: { c: number }, y: { c: number }) => prisma.friendship.create({ data: { requesterId: x.c, addresseeId: y.c, status: 'ACCEPTED', respondedAt: new Date() } });
  const knight = await make('Lamina', 'KNIGHT'), druid = await make('Raiz', 'DRUID'), stranger = await make('Forasteiro', 'PALADIN'), far = await make('Veterano', 'SORCERER', 200);
  const alt = await make('Gemeo', 'PALADIN', 100, knight.a);
  await friend(knight, druid); await friend(knight, far); await friend(knight, alt); await friend(druid, stranger);
  const snapshot = (id: number) => prisma.character.findUniqueOrThrow({ where: { id }, select: { hp: true, mana: true, experience: true, goldInHand: true, level: true } });
  const before = { knight: await snapshot(knight.c), druid: await snapshot(druid.c) };
  const state = (h: { a: number; c: number }) => duelState(h.a, h.c, '');

  await t.test('só amigos, na faixa de nível e de outras contas', async () => {
    await assert.rejects(() => challenge(knight.a, knight.c, stranger.name), /seu amigo/);
    await assert.rejects(() => challenge(knight.a, knight.c, far.name), /diferença de nível/);
    await assert.rejects(() => challenge(knight.a, knight.c, alt.name), /próprios personagens/);
    await assert.rejects(() => challenge(knight.a, knight.c, knight.name), /não encontrado/);
    // Outra conta não desafia em nome de alguém.
    await assert.rejects(() => challenge(stranger.a, knight.c, druid.name), /não encontrado|Personagem/);
  });

  await t.test('recusar e retirar desafio', async () => {
    await challenge(knight.a, knight.c, druid.name);
    await assert.rejects(() => challenge(druid.a, druid.c, knight.name), /desafio aberto/);
    const invite = (await state(druid)).received[0];
    assert.equal(invite.from.id, knight.c);
    await assert.rejects(() => answerDuel(stranger.a, druid.c, invite.id, true), /não encontrado/);
    await answerDuel(druid.a, druid.c, invite.id, false);
    assert.equal((await state(druid)).received.length, 0);
    await challenge(knight.a, knight.c, druid.name);
    const sent = (await state(knight)).sent[0];
    await assert.rejects(() => cancelChallenge(druid.a, druid.c, sent.id), /não encontrado/);
    await cancelChallenge(knight.a, knight.c, sent.id);
    assert.equal((await state(knight)).sent.length, 0);
  });

  let duelId = 0;
  await t.test('aceitar começa o duelo com vida e mana cheias, sem tocar no personagem', async () => {
    await challenge(knight.a, knight.c, druid.name);
    await answerDuel(druid.a, druid.c, (await state(druid)).received[0].id, true);
    const s = await state(knight);
    assert.ok(s.duel);
    duelId = s.duel.id;
    assert.equal(s.duel.round, 1);
    assert.equal(s.duel.me.hp, 5000);
    assert.equal(s.duel.me.mana, 2000);
    await assert.rejects(() => challenge(knight.a, knight.c, alt.name), /próprios|duelo atual/);
  });

  await t.test('dois golpes na mesma rodada: só um vale; rodada errada é recusada', async () => {
    const results = await Promise.allSettled([chooseDuelAction(knight.a, knight.c, duelId, 1, 'ATTACK'), chooseDuelAction(knight.a, knight.c, duelId, 1, 'TRIPLE_HIT')]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const s = await state(druid);
    assert.equal(s.duel?.foe.ready, true, 'o oponente vê que você escolheu…');
    assert.equal(s.duel?.foe.action, null, '…mas não o quê');
    await assert.rejects(() => chooseDuelAction(druid.a, druid.c, duelId, 2, 'ATTACK'), /rodada já passou/);
    await assert.rejects(() => chooseDuelAction(druid.a, druid.c, duelId, 1, 'FLEE'), /inválida/);
    await chooseDuelAction(druid.a, druid.c, duelId, 1, 'DEFEND_SHIELD');
    const after = await state(knight);
    assert.equal(after.duel?.round, 2);
    assert.equal(after.duel?.rounds.length, 1);
    assert.equal(after.duel?.rounds[0].moves.length, 2);
  });

  await t.test('prazo vencido: quem não escolheu defende; a varredura fecha a rodada', async () => {
    await assert.rejects(() => advanceDuel(knight.a, knight.c, duelId, 2), /ainda está aberta/);
    await chooseDuelAction(knight.a, knight.c, duelId, 2, 'ATTACK');
    await prisma.duel.update({ where: { id: duelId }, data: { deadlineAt: new Date(Date.now() - 1000) } });
    assert.ok(await expireDuels() >= 1);
    const s = await state(druid);
    assert.equal(s.duel?.round, 3);
    const auto = s.duel?.rounds.at(-1)?.moves.find(m => m.characterId === druid.c);
    assert.equal(auto?.auto, true);
    assert.equal(auto?.action, 'DEFEND_SHIELD');
    assert.equal(s.duel?.me.missed, 1);
  });

  await t.test('rendição encerra o duelo; vida, mana, ouro e XP reais não mudam', async () => {
    await assert.rejects(() => forfeitDuel(stranger.a, stranger.c, duelId), /não encontrado/);
    await forfeitDuel(druid.a, druid.c, duelId);
    await assert.rejects(() => chooseDuelAction(knight.a, knight.c, duelId, 3, 'ATTACK'), /já terminou/);
    const k = await prisma.character.findUniqueOrThrow({ where: { id: knight.c } }), d = await prisma.character.findUniqueOrThrow({ where: { id: druid.c } });
    assert.equal(k.pvpWins, 1); assert.equal(k.pvpLosses, 0);
    assert.equal(d.pvpWins, 0); assert.equal(d.pvpLosses, 1);
    assert.deepEqual(await snapshot(knight.c), before.knight);
    assert.deepEqual(await snapshot(druid.c), before.druid);
    const s = await state(knight);
    assert.equal(s.duel?.outcome, 'FORFEIT');
    assert.equal(s.record.wins, 1);
    assert.equal(s.record.streak, 1);
    const h = await duelHistory(knight.a, knight.c, {});
    assert.equal(h.items[0].won, true);
    assert.equal(h.items[0].opponent.id, druid.c);
    assert.ok(await prisma.characterAchievement.findUnique({ where: { characterId_key: { characterId: knight.c, key: 'first-blood' } } }));
    assert.ok(await prisma.adventureEvent.findFirst({ where: { characterId: druid.c, kind: 'DUEL' } }));
  });

  await t.test('convite vence o prazo; limite diário; proibição de duelar', async () => {
    await challenge(knight.a, knight.c, druid.name);
    await prisma.duel.updateMany({ where: { challengerId: knight.c, status: 'INVITED' }, data: { inviteExpiresAt: new Date(Date.now() - 1000) } });
    await expireDuels();
    assert.equal((await state(druid)).received.length, 0);
    assert.equal((await prisma.duel.findFirstOrThrow({ where: { challengerId: knight.c }, orderBy: { id: 'desc' } })).outcome, 'LAPSED');
    // Desafios abertos contam no limite do dia.
    const fillers = [];
    for (let i = (await state(knight)).today; i < settings['pvp.dailyLimit']; i++) fillers.push({ challengerId: knight.c, opponentId: stranger.c, status: 'FINISHED', outcome: 'DRAW', inviteExpiresAt: new Date() });
    await prisma.duel.createMany({ data: fillers });
    await assert.rejects(() => challenge(knight.a, knight.c, druid.name), /vezes nas últimas 24 horas/);
    await prisma.punishment.create({ data: { accountId: druid.a, kind: 'PVP_BLOCK', reason: 'teste', createdById: druid.a } });
    await assert.rejects(() => challenge(druid.a, druid.c, knight.name), /proibida de duelar/);
  });
});
