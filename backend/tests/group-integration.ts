import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Vocation } from '@prisma/client';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { loadSettings } from '../src/core/settings';
import { goldDrift } from '../src/economy/reconcile';
import { BattleService } from '../src/game/battleService';
import { addStat } from '../src/game/gameService';
import { advanceGroupRound, answerInvite, chooseGroupAction, createParty, groupState, inviteFriend, leaveParty, startGroupHunt } from '../src/game/groupHuntService';
import { GROUP_MIN_LEVEL } from '../../shared/groupHunt';

// Pressupõe os padrões de configuração da caçada em grupo (group.*).
test('MySQL: caçada em grupo com amigos', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), settings = await loadSettings(prisma);
  const make = async (who: string, vocation: Vocation, level = GROUP_MIN_LEVEL) => {
    const acc = await prisma.account.create({ data: { email: `grupo-${who}-${tag}@example.invalid`, password: await hashPassword('Grupo-test-2026!'),
      characters: { create: { name: `${who} ${tag}`, vocation, vocationChosen: true, level, hp: 5000, maxHp: 5000, mana: 2000, maxMana: 2000, energy: 100, maxEnergy: 100, statPoints: 10 } } }, include: { characters: true } });
    return { a: acc.id, c: acc.characters[0].id, name: acc.characters[0].name };
  };
  const knight = await make('Muralha', 'KNIGHT'), paladin = await make('Mira', 'PALADIN'), stranger = await make('Estranho', 'DRUID'), young = await make('Novato', 'SORCERER', 40);
  await prisma.friendship.create({ data: { requesterId: knight.c, addresseeId: paladin.c, status: 'ACCEPTED', respondedAt: new Date() } });
  await prisma.friendship.create({ data: { requesterId: young.c, addresseeId: knight.c, status: 'ACCEPTED', respondedAt: new Date() } });

  await t.test('só a partir do nível 100, e só amigos do líder entram', async () => {
    await assert.rejects(() => createParty(young.a, young.c, 'serra'), /nível 100/);
    await assert.rejects(() => createParty(knight.a, knight.c, 'dragao'), /nível 550/);
    await assert.rejects(() => createParty(knight.a, knight.c, 'inexistente'), /indisponível/);
    await createParty(knight.a, knight.c, 'serra');
    await assert.rejects(() => createParty(knight.a, knight.c, 'serra'), /já está num grupo/);
    await assert.rejects(() => inviteFriend(knight.a, knight.c, stranger.name), /seu amigo/);
    await assert.rejects(() => inviteFriend(knight.a, knight.c, young.name), /nível 100/);
    await assert.rejects(() => inviteFriend(paladin.a, paladin.c, knight.name), /Monte um grupo/);
    await inviteFriend(knight.a, knight.c, paladin.name);
    await assert.rejects(() => inviteFriend(knight.a, knight.c, paladin.name), /já foi convidado/);
    // Com só o líder no grupo, não dá para começar.
    await assert.rejects(() => startGroupHunt(knight.a, knight.c), /pelo menos 2/);
    const s = await groupState(paladin.a, paladin.c, '');
    assert.equal(s.invites.length, 1);
    // Outra conta não responde convite alheio.
    await assert.rejects(() => answerInvite(stranger.a, paladin.c, s.invites[0].id, true), /não encontrado/);
    await answerInvite(paladin.a, paladin.c, s.invites[0].id, true);
    assert.equal((await groupState(knight.a, knight.c, '')).party?.members.filter(m => m.status === 'JOINED').length, 2);
  });

  let battleId = 0;
  await t.test('começar cobra energia de todos e bloqueia combate solo e atributos', async () => {
    await assert.rejects(() => startGroupHunt(paladin.a, paladin.c), /Só o líder/);
    const r = await startGroupHunt(knight.a, knight.c); battleId = r.battleId;
    for (const h of [knight, paladin]) assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: h.c } })).energy, 100 - settings['group.energyCost']);
    const monster = await prisma.monster.findFirstOrThrow({ where: { regionKey: 'outskirts' } });
    await assert.rejects(() => BattleService.start(paladin.a, paladin.c, monster.id), /caçada em grupo/);
    await assert.rejects(() => addStat(paladin.a, paladin.c, 'vitality', randomUUID(), 1), /caçada em grupo/);
    await assert.rejects(() => leaveParty(paladin.a, paladin.c), /Termine a caçada/);
    // Um segundo "começar" não cobra de novo.
    await assert.rejects(() => startGroupHunt(knight.a, knight.c), /já está caçando/);
  });

  await t.test('rodadas: ação da vocação, rodada esperada e prazo', async () => {
    await assert.rejects(() => chooseGroupAction(paladin.a, paladin.c, battleId, 1, 'HOLD'), /não é da sua vocação/);
    await assert.rejects(() => chooseGroupAction(paladin.a, paladin.c, battleId, 2, 'AIM'), /rodada já mudou/);
    await assert.rejects(() => chooseGroupAction(stranger.a, stranger.c, battleId, 1, 'ATTACK'), /não encontrada/);
    await chooseGroupAction(paladin.a, paladin.c, battleId, 1, 'AIM');
    // Só um escolheu: a rodada continua aberta até o prazo.
    assert.equal((await prisma.groupBattle.findUniqueOrThrow({ where: { id: battleId } })).round, 1);
    await assert.rejects(() => advanceGroupRound(knight.a, knight.c, battleId, 1), /ainda está aberta/);
    await prisma.groupBattle.update({ where: { id: battleId }, data: { deadlineAt: new Date(Date.now() - 1000) } });
    await advanceGroupRound(knight.a, knight.c, battleId, 1);
    const b = await prisma.groupBattle.findUniqueOrThrow({ where: { id: battleId } });
    assert.equal(b.round, 2); assert((b.log as string[]).some(l => l.includes('não escolheu a tempo')));
  });

  await t.test('vitória dá XP, ouro e materiais a cada um, com ledger, diário e limite semanal', async () => {
    const before = await prisma.character.findMany({ where: { id: { in: [knight.c, paladin.c] } } });
    // Deixa a fera por um fio para fechar a caçada nesta rodada.
    await prisma.groupBattle.update({ where: { id: battleId }, data: { bossHp: 1 } });
    let round = (await prisma.groupBattle.findUniqueOrThrow({ where: { id: battleId } })).round;
    await chooseGroupAction(knight.a, knight.c, battleId, round, 'ATTACK');
    await chooseGroupAction(paladin.a, paladin.c, battleId, round, 'ATTACK');
    const b = await prisma.groupBattle.findUniqueOrThrow({ where: { id: battleId }, include: { fighters: true } });
    assert.equal(b.outcome, 'VICTORY'); assert(b.isFinished);
    for (const f of b.fighters) { assert(f.rewarded); assert(f.rewardExperience > 0); assert(f.rewardGold > 0n); assert.equal(f.activeCharacterId, null); }
    for (const h of before) {
      const after = await prisma.character.findUniqueOrThrow({ where: { id: h.id } });
      assert(after.experience > h.experience); assert(after.goldInHand > h.goldInHand);
      assert(await prisma.goldLedger.findFirst({ where: { characterId: h.id, reason: 'GROUP_HUNT' } }));
      assert(await prisma.itemLedger.findFirst({ where: { characterId: h.id, reason: 'GROUP_HUNT' } }));
      assert(await prisma.adventureEvent.findFirst({ where: { characterId: h.id, kind: 'GROUP' } }));
    }
    assert.deepEqual((await goldDrift(prisma, 5000)).filter(d => [knight.c, paladin.c].includes(d.characterId)), []);
    // O grupo volta a se formar; terminada a luta, combate solo e saída voltam a funcionar.
    assert.equal((await prisma.huntParty.findFirstOrThrow({ where: { leaderId: knight.c } })).status, 'FORMING');
    assert.equal(await prisma.groupBattleFighter.count({ where: { activeCharacterId: { in: [knight.c, paladin.c] } } }), 0);

    // Chegando ao limite semanal, a vitória seguinte não paga.
    const limit = settings['group.weeklyRewards'];
    await prisma.groupBattleFighter.updateMany({ where: { characterId: paladin.c }, data: { rewarded: true } });
    for (let i = 1; i < limit; i++) {
      const extra = await prisma.groupBattle.create({ data: { partyId: b.partyId, huntKey: 'serra', bossHp: 0, bossMaxHp: 1, state: {}, deadlineAt: new Date(), isFinished: true, outcome: 'VICTORY' } });
      await prisma.groupBattleFighter.create({ data: { battleId: extra.id, characterId: paladin.c, vocation: 'PALADIN', hp: 1, maxHp: 1, mana: 0, maxMana: 0, rewarded: true } });
    }
    await prisma.character.updateMany({ where: { id: { in: [knight.c, paladin.c] } }, data: { energy: 100, hp: 5000 } });
    const again = (await startGroupHunt(knight.a, knight.c)).battleId;
    await prisma.groupBattle.update({ where: { id: again }, data: { bossHp: 1 } });
    round = 1;
    await chooseGroupAction(knight.a, knight.c, again, round, 'ATTACK');
    await chooseGroupAction(paladin.a, paladin.c, again, round, 'ATTACK');
    const fighters = await prisma.groupBattleFighter.findMany({ where: { battleId: again } });
    assert.equal(fighters.find(f => f.characterId === knight.c)?.rewarded, true);
    assert.equal(fighters.find(f => f.characterId === paladin.c)?.rewarded, false);
  });

  await t.test('o líder saindo desfaz o grupo', async () => {
    await leaveParty(knight.a, knight.c);
    const s = await groupState(paladin.a, paladin.c, '');
    assert.equal(s.party, null);
    await createParty(paladin.a, paladin.c, 'serra');
    await leaveParty(paladin.a, paladin.c);
  });

  await t.test('dragão: o grupo vota o destino, que vai para o Diário, e as quatro marcas viram conquista', async () => {
    await prisma.character.updateMany({ where: { id: { in: [knight.c, paladin.c] } }, data: { level: 600, energy: 100, hp: 5000, mana: 2000 } });
    await createParty(knight.a, knight.c, 'dragao');
    await inviteFriend(knight.a, knight.c, paladin.name);
    await answerInvite(paladin.a, paladin.c, (await groupState(paladin.a, paladin.c, '')).invites[0].id, true);
    const id = (await startGroupHunt(knight.a, knight.c)).battleId;
    const view = (await groupState(knight.a, knight.c, '')).battle!;
    assert.equal(view.mechanic, 'dragon'); assert.equal(view.counters, 4); assert.equal(view.phase, 'FIGHT');
    await assert.rejects(() => chooseGroupAction(knight.a, knight.c, id, 1, 'SLAY'), /não é da sua vocação/);
    // Vitórias anteriores nas outras três caçadas (para a conquista das quatro marcas).
    const party = await prisma.huntParty.findFirstOrThrow({ where: { leaderId: knight.c, status: 'FIGHTING' } });
    for (const huntKey of ['floresta', 'lago']) {
      const old = await prisma.groupBattle.create({ data: { partyId: party.id, huntKey, bossHp: 0, bossMaxHp: 1, state: {}, deadlineAt: new Date(), isFinished: true, outcome: 'VICTORY' } });
      await prisma.groupBattleFighter.create({ data: { battleId: old.id, characterId: knight.c, vocation: 'KNIGHT', hp: 1, maxHp: 1, mana: 0, maxMana: 0 } });
    }
    // Leva o dragão até a escolha: só dá para votar.
    const b = await prisma.groupBattle.findUniqueOrThrow({ where: { id } });
    await prisma.groupBattle.update({ where: { id }, data: { state: { ...(b.state as object), phase: 'CHOICE', counters: 0 } } });
    assert.deepEqual((await groupState(knight.a, knight.c, '')).battle!.fighters.find(f => f.characterId === knight.c)!.actions, ['SLAY', 'SLEEP']);
    await assert.rejects(() => chooseGroupAction(knight.a, knight.c, id, 1, 'ATTACK'), /vota/);
    await chooseGroupAction(knight.a, knight.c, id, 1, 'SLAY');
    await chooseGroupAction(paladin.a, paladin.c, id, 1, 'SLEEP');
    const end = await prisma.groupBattle.findUniqueOrThrow({ where: { id } });
    assert.equal(end.outcome, 'VICTORY'); assert.equal((end.state as { choice: string }).choice, 'SLEEP', 'empate = fazer dormir');
    for (const h of [knight, paladin]) {
      const diary = await prisma.adventureEvent.findFirstOrThrow({ where: { characterId: h.c, kind: 'GROUP' }, orderBy: { id: 'desc' } });
      assert.match(diary.description, /voltar a dormir/);
      assert(await prisma.characterAchievement.findUnique({ where: { characterId_key: { characterId: h.c, key: 'group-hunter' } } }));
    }
    assert(await prisma.characterAchievement.findUnique({ where: { characterId_key: { characterId: knight.c, key: 'four-marks' } } }));
    assert.equal(await prisma.characterAchievement.findUnique({ where: { characterId_key: { characterId: paladin.c, key: 'four-marks' } } }), null);
    await leaveParty(knight.a, knight.c);
  });
});
