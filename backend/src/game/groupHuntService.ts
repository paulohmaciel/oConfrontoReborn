// Caçada em grupo (A Caçada das Quatro Marcas, fase 1): grupo de amigos, convites, batalha em rodadas com prazo e recompensas.
// Ordem das travas, sempre a mesma: personagem de quem age → grupo; na batalha: batalha → personagens em ordem de id.
import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma, transaction, lockCharacter, lockCharacterAny } from '../core/db';
import { GameError, integer } from '../core/engine';
import { loadSettings } from '../core/settings';
import { scaleInt } from '../../../shared/economy';
import { addGold, addItem } from '../economy/economy';
import { gainExperience } from './gameRules';
import { combatStats } from './combatStats';
import { event, awardAchievements } from './adventureService';
import { materialForLevel } from '../../../shared/forge';
import { GROUP_MIN_LEVEL, PARTY_MAX, PARTY_MIN, actionsFor, groupActions, groupHunts, groupIntent, huntByKey, type GroupAction, type GroupHunt, type GroupPhase } from '../../../shared/groupHunt';
import { resolveGroupRound, type GroupBoss, type GroupFighter } from './groupEngine';
type Tx = Prisma.TransactionClient;
const dice = (min: number, max: number) => randomInt(min, max + 1);
const card = { id: true, name: true, level: true, vocation: true, classTier: true, profileAvatar: true, profileEmblem: true } as const;
const WEEK = 7 * 24 * 3600 * 1000;
// Força de cada participante, gravada ao começar (equipamento trocado no meio não muda a luta).
type FighterStats = { name: string; attack: number; defense: number; criticalChance: number; dodgeChance: number };
// `counters` = correntes, encantamento, ilusões ou selos (ver shared/groupHunt). `chains` é o nome antigo (batalhas da fase 1).
type BattleState = { attack: number; defense: number; counters?: number; chains?: number; freed: boolean; phase?: GroupPhase; choice?: 'SLAY' | 'SLEEP' | null; stats: Record<string, FighterStats> };
const bossOf = (s: BattleState, hunt: GroupHunt, hp: number, maxHp: number): GroupBoss => ({ hp, maxHp, attack: s.attack, defense: s.defense, mechanic: hunt.mechanic,
  counters: s.counters ?? s.chains ?? 0, maxCounters: hunt.counters, freed: s.freed, phase: s.phase ?? 'FIGHT', choice: s.choice ?? null });

async function lockParty(tx: Tx, partyId: number) {
  await tx.$queryRaw`SELECT id FROM \`HuntParty\` WHERE id = ${partyId} FOR UPDATE`;
  return tx.huntParty.findUniqueOrThrow({ where: { id: partyId }, include: { members: true } });
}
async function lockBattle(tx: Tx, battleId: number) {
  await tx.$queryRaw`SELECT id FROM \`GroupBattle\` WHERE id = ${battleId} FOR UPDATE`;
  const b = await tx.groupBattle.findUnique({ where: { id: battleId }, include: { fighters: { orderBy: { characterId: 'asc' } } } });
  if (!b) throw new GameError(404, 'Batalha não encontrada.');
  return b;
}
function playableHunt(key: unknown) {
  const hunt = typeof key === 'string' ? huntByKey(key) : undefined;
  if (!hunt || !hunt.available) throw new GameError(400, 'Caçada indisponível.');
  return hunt;
}
const minLevel = (huntLevel: number) => Math.max(GROUP_MIN_LEVEL, huntLevel);
// Grupo aberto do personagem (como líder ou membro que aceitou).
async function openMembership(tx: Tx, characterId: number) {
  return tx.huntPartyMember.findUnique({ where: { activeCharacterId: characterId } });
}
async function weeklyRewards(db: Tx | typeof prisma, characterId: number, huntKey: string) {
  return db.groupBattleFighter.count({ where: { characterId, rewarded: true, battle: { huntKey, createdAt: { gte: new Date(Date.now() - WEEK) } } } });
}

// ----- Leitura -----
export async function groupState(accountId: number, characterId: number, rawQuery: unknown) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true, level: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const settings = await loadSettings(prisma);
  const membership = await prisma.huntPartyMember.findUnique({ where: { activeCharacterId: c.id } });
  const party = membership ? await prisma.huntParty.findUnique({ where: { id: membership.partyId }, include: { members: { orderBy: { id: 'asc' }, include: { character: { select: card } } } } }) : null;
  const invites = await prisma.huntPartyMember.findMany({ where: { characterId: c.id, status: 'INVITED', party: { status: 'FORMING' } }, orderBy: { id: 'desc' }, take: 10,
    include: { party: { include: { leader: { select: card } } } } });
  // Amigos que o líder pode convidar (até 10; busca por nome para achar os outros).
  let friends: unknown[] = [];
  if (party && party.leaderId === c.id && party.status === 'FORMING') {
    const hunt = huntByKey(party.huntKey)!, q = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 24) : '';
    const rows = await prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ requesterId: c.id }, { addresseeId: c.id }] }, include: { requester: { select: card }, addressee: { select: card } }, take: 500 });
    const inParty = new Set(party.members.map(m => m.characterId));
    friends = rows.map(f => f.requesterId === c.id ? f.addressee : f.requester)
      .filter(f => !inParty.has(f.id) && f.level >= minLevel(hunt.level) && (!q || f.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.level - a.level).slice(0, 10);
  }
  // A batalha em andamento; se não houver, a última dos últimos 30 minutos (para mostrar o resultado).
  const fighter = await prisma.groupBattleFighter.findUnique({ where: { activeCharacterId: c.id } })
    ?? await prisma.groupBattleFighter.findFirst({ where: { characterId: c.id, battle: { createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } } }, orderBy: { battleId: 'desc' } });
  const battle = fighter ? await battleView(fighter.battleId, c.id) : null;
  const hunts = await Promise.all(groupHunts.map(async h => ({ ...h, minLevel: minLevel(h.level), rewardsThisWeek: h.available ? await weeklyRewards(prisma, c.id, h.key) : 0 })));
  return { now: new Date(), minLevel: GROUP_MIN_LEVEL, level: c.level, hunts, invites: invites.map(i => ({ id: i.id, huntKey: i.party.huntKey, leader: i.party.leader })),
    party: party && { id: party.id, huntKey: party.huntKey, status: party.status, leaderId: party.leaderId,
      members: party.members.map(m => ({ id: m.id, status: m.status, character: m.character })) },
    friends, battle,
    settings: { energyCost: settings['group.energyCost'], roundSeconds: settings['group.roundSeconds'], weeklyRewards: settings['group.weeklyRewards'], partyMin: PARTY_MIN, partyMax: PARTY_MAX } };
}
async function battleView(battleId: number, viewerId: number) {
  const b = await prisma.groupBattle.findUnique({ where: { id: battleId }, include: { fighters: { orderBy: { id: 'asc' }, include: { character: { select: card } } } } });
  if (!b) return null;
  const s = b.state as unknown as BattleState, hunt = huntByKey(b.huntKey)!, boss = bossOf(s, hunt, b.bossHp, b.bossMaxHp);
  return { id: b.id, huntKey: b.huntKey, name: hunt.title, sprite: hunt.sprite, round: b.round, deadlineAt: b.deadlineAt, outcome: b.outcome, isFinished: b.isFinished,
    bossHp: b.bossHp, bossMaxHp: b.bossMaxHp, mechanic: hunt.mechanic, counters: boss.counters, maxCounters: hunt.counters, freed: boss.freed, phase: boss.phase, choice: boss.choice,
    bonusText: hunt.bonusText ?? null, intent: groupIntent(b.round, hunt), log: (b.log ?? []) as string[],
    // Os outros só veem SE o companheiro já escolheu, não o QUÊ.
    fighters: b.fighters.map(f => ({ characterId: f.characterId, character: f.character, vocation: f.vocation, hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana,
      ready: f.action !== null, action: f.characterId === viewerId ? f.action : null, actions: f.characterId === viewerId ? actionsFor(f.vocation, boss.phase) : [],
      rewardGold: f.rewardGold.toString(), rewardExperience: f.rewardExperience, rewarded: f.rewarded })) };
}

// ----- Grupo e convites -----
export async function createParty(accountId: number, characterId: number, huntKey: unknown) {
  const hunt = playableHunt(huntKey);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    if (c.level < minLevel(hunt.level)) throw new GameError(409, `A caçada em grupo "${hunt.name}" abre no nível ${minLevel(hunt.level)}.`);
    if (await openMembership(tx, c.id)) throw new GameError(409, 'Você já está num grupo. Saia dele antes de montar outro.');
    const party = await tx.huntParty.create({ data: { leaderId: c.id, huntKey: hunt.key } });
    await tx.huntPartyMember.create({ data: { partyId: party.id, characterId: c.id, status: 'JOINED', activeCharacterId: c.id } });
    return { message: `Grupo formado para ${hunt.name}. Agora convide seus amigos.` };
  });
}
export async function inviteFriend(accountId: number, characterId: number, rawName: unknown) {
  if (typeof rawName !== 'string' || rawName.trim().length < 3) throw new GameError(400, 'Informe o nome do amigo.');
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const m = await openMembership(tx, c.id);
    if (!m) throw new GameError(409, 'Monte um grupo antes de convidar.');
    const party = await lockParty(tx, m.partyId);
    if (party.leaderId !== c.id) throw new GameError(403, 'Só o líder convida.');
    if (party.status !== 'FORMING') throw new GameError(409, 'O grupo já está caçando.');
    const hunt = huntByKey(party.huntKey)!;
    const target = await tx.character.findUnique({ where: { name: rawName.trim() }, select: { id: true, name: true, level: true } });
    if (!target || target.id === c.id) throw new GameError(404, 'Personagem não encontrado.');
    const friends = await tx.friendship.findFirst({ where: { status: 'ACCEPTED', OR: [{ requesterId: c.id, addresseeId: target.id }, { requesterId: target.id, addresseeId: c.id }] } });
    if (!friends) throw new GameError(403, `${target.name} precisa ser seu amigo (peça amizade pelo perfil).`);
    if (target.level < minLevel(hunt.level)) throw new GameError(409, `${target.name} precisa do nível ${minLevel(hunt.level)}.`);
    if (party.members.some(x => x.characterId === target.id)) throw new GameError(409, `${target.name} já foi convidado.`);
    if (party.members.length >= PARTY_MAX) throw new GameError(409, `O grupo tem no máximo ${PARTY_MAX} aventureiros (contando convites pendentes).`);
    await tx.huntPartyMember.create({ data: { partyId: party.id, characterId: target.id } });
    return { message: `Convite enviado para ${target.name}.` };
  });
}
export async function answerInvite(accountId: number, characterId: number, memberId: number, accept: boolean) {
  integer(memberId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const invite = await tx.huntPartyMember.findFirst({ where: { id: memberId, characterId: c.id, status: 'INVITED' } });
    if (!invite) throw new GameError(404, 'Convite não encontrado.');
    const party = await lockParty(tx, invite.partyId);
    if (!accept) { await tx.huntPartyMember.delete({ where: { id: invite.id } }); return { message: 'Convite recusado.' }; }
    if (party.status !== 'FORMING') throw new GameError(409, 'Esse grupo já partiu para a caçada ou foi desfeito.');
    if (await openMembership(tx, c.id)) throw new GameError(409, 'Você já está num grupo. Saia dele antes de aceitar.');
    if (c.level < minLevel(huntByKey(party.huntKey)!.level)) throw new GameError(409, 'Seu nível ainda não basta para esta caçada.');
    await tx.huntPartyMember.update({ where: { id: invite.id }, data: { status: 'JOINED', activeCharacterId: c.id } });
    return { message: 'Você entrou no grupo.' };
  });
}
export async function leaveParty(accountId: number, characterId: number) {
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const m = await openMembership(tx, c.id);
    if (!m) throw new GameError(409, 'Você não está num grupo.');
    const party = await lockParty(tx, m.partyId);
    if (party.status === 'FIGHTING') throw new GameError(409, 'Termine a caçada antes de sair do grupo.');
    if (party.leaderId === c.id) {
      // O líder saindo desfaz o grupo.
      await tx.huntPartyMember.updateMany({ where: { partyId: party.id }, data: { activeCharacterId: null } });
      await tx.huntPartyMember.deleteMany({ where: { partyId: party.id, status: 'INVITED' } });
      await tx.huntParty.update({ where: { id: party.id }, data: { status: 'CLOSED' } });
      return { message: 'Grupo desfeito.' };
    }
    await tx.huntPartyMember.delete({ where: { id: m.id } });
    return { message: 'Você saiu do grupo.' };
  });
}
export async function removeMember(accountId: number, characterId: number, memberId: number) {
  integer(memberId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const m = await openMembership(tx, c.id);
    if (!m) throw new GameError(409, 'Você não está num grupo.');
    const party = await lockParty(tx, m.partyId);
    if (party.leaderId !== c.id) throw new GameError(403, 'Só o líder tira alguém do grupo.');
    if (party.status !== 'FORMING') throw new GameError(409, 'Não dá para mexer no grupo durante a caçada.');
    const target = party.members.find(x => x.id === memberId);
    if (!target || target.characterId === c.id) throw new GameError(404, 'Participante não encontrado.');
    await tx.huntPartyMember.delete({ where: { id: target.id } });
    return { message: target.status === 'INVITED' ? 'Convite cancelado.' : 'Participante removido.' };
  });
}

// ----- Batalha -----
export async function startGroupHunt(accountId: number, characterId: number) {
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const m = await openMembership(tx, c.id);
    if (!m) throw new GameError(409, 'Você não está num grupo.');
    const party = await lockParty(tx, m.partyId);
    if (party.leaderId !== c.id) throw new GameError(403, 'Só o líder começa a caçada.');
    if (party.status !== 'FORMING') throw new GameError(409, 'O grupo já está caçando.');
    const hunt = playableHunt(party.huntKey), settings = await loadSettings(tx), cost = settings['group.energyCost'];
    const joined = party.members.filter(x => x.status === 'JOINED').sort((a, b) => a.characterId - b.characterId);
    if (joined.length < PARTY_MIN) throw new GameError(409, `São precisos pelo menos ${PARTY_MIN} aventureiros no grupo (convites aceitos).`);
    const state: BattleState = { attack: hunt.attack, defense: hunt.defense, counters: hunt.counters, freed: false, phase: 'FIGHT', choice: null, stats: {} };
    const fighters: Prisma.GroupBattleFighterCreateManyBattleInput[] = [];
    for (const j of joined) {
      const h = await lockCharacterAny(tx, j.characterId);
      if (h.hp <= 0) throw new GameError(409, `${h.name} está sem vida. Cure-se no Templo de Capriel antes.`);
      if (h.energy < cost) throw new GameError(409, `${h.name} precisa de ${cost} de energia.`);
      if (h.huntEndsAt) throw new GameError(409, `${h.name} tem uma caça pendente para resolver.`);
      if (h.level < minLevel(hunt.level)) throw new GameError(409, `${h.name} precisa do nível ${minLevel(hunt.level)}.`);
      if (await tx.battle.findFirst({ where: { characterId: h.id, isFinished: false }, select: { id: true } })) throw new GameError(409, `${h.name} está num combate solo.`);
      const equipment = await tx.inventoryItem.findMany({ where: { characterId: h.id, isEquipped: true }, include: { blueprint: true } });
      const s = combatStats(h, equipment);
      state.stats[h.id] = { name: h.name, attack: s.attack, defense: s.defense, criticalChance: s.criticalChance, dodgeChance: s.dodgeChance };
      await tx.character.update({ where: { id: h.id }, data: { energy: { decrement: cost } } });
      fighters.push({ characterId: h.id, vocation: h.vocation, hp: h.hp, maxHp: h.maxHp, mana: h.mana, maxMana: h.maxMana, activeCharacterId: h.id });
    }
    await tx.huntPartyMember.deleteMany({ where: { partyId: party.id, status: 'INVITED' } });
    await tx.huntParty.update({ where: { id: party.id }, data: { status: 'FIGHTING' } });
    const hp = hunt.hpPerHero * joined.length;
    const battle = await tx.groupBattle.create({ data: { partyId: party.id, huntKey: hunt.key, bossHp: hp, bossMaxHp: hp, state: state as unknown as Prisma.InputJsonValue,
      deadlineAt: new Date(Date.now() + settings['group.roundSeconds'] * 1000), log: [hunt.story], fighters: { createMany: { data: fighters } } } });
    return { message: 'A caçada começou! Cada um escolhe sua ação na rodada.', battleId: battle.id };
  });
}

// Trava a batalha e todos os participantes (em ordem de id); confere que quem pede é um deles, da conta autenticada.
async function lockForRound(tx: Tx, accountId: number, characterId: number, battleId: number, expectedRound: number) {
  integer(battleId); integer(expectedRound, 1);
  const b = await lockBattle(tx, battleId);
  if (!b.fighters.some(f => f.characterId === characterId)) throw new GameError(404, 'Batalha não encontrada.');
  for (const f of b.fighters) await (f.characterId === characterId ? lockCharacter(tx, accountId, characterId) : lockCharacterAny(tx, f.characterId));
  if (b.isFinished) throw new GameError(409, 'A caçada já terminou.');
  if (b.round !== expectedRound) throw new GameError(409, 'A rodada já mudou. Atualizando…');
  return b;
}
export async function chooseGroupAction(accountId: number, characterId: number, battleId: number, expectedRound: number, rawAction: unknown) {
  if (typeof rawAction !== 'string' || !(rawAction in groupActions)) throw new GameError(400, 'Ação inválida.');
  const action = rawAction as GroupAction;
  return transaction(async tx => {
    const b = await lockForRound(tx, accountId, characterId, battleId, expectedRound);
    const me = b.fighters.find(f => f.characterId === characterId)!;
    if (me.hp <= 0) throw new GameError(409, 'Você caiu nesta caçada; seus companheiros continuam.');
    const phase = bossOf(b.state as unknown as BattleState, huntByKey(b.huntKey)!, b.bossHp, b.bossMaxHp).phase;
    if (!actionsFor(me.vocation, phase).includes(action)) throw new GameError(400, phase === 'CHOICE' ? 'Agora o grupo vota: derrotar ou fazer o dragão dormir.' : 'Essa ação não é da sua vocação.');
    if (me.mana < groupActions[action].mana) throw new GameError(409, 'Mana insuficiente.');
    await tx.groupBattleFighter.update({ where: { id: me.id }, data: { action } });
    me.action = action;
    if (b.fighters.every(f => f.hp <= 0 || f.action)) await resolveRound(tx, b);
    return { message: '' };
  });
}
// Qualquer participante pode fechar a rodada depois do prazo: quem não escolheu, defende.
export async function advanceGroupRound(accountId: number, characterId: number, battleId: number, expectedRound: number) {
  return transaction(async tx => {
    const b = await lockForRound(tx, accountId, characterId, battleId, expectedRound);
    if (b.deadlineAt.getTime() > Date.now()) throw new GameError(409, 'A rodada ainda está aberta.');
    await resolveRound(tx, b);
    return { message: '' };
  });
}

type LockedBattle = Awaited<ReturnType<typeof lockBattle>>;
async function resolveRound(tx: Tx, b: LockedBattle) {
  const s = b.state as unknown as BattleState, settings = await loadSettings(tx), hunt = huntByKey(b.huntKey)!;
  const fighters: GroupFighter[] = b.fighters.map(f => ({ characterId: f.characterId, name: s.stats[f.characterId].name, vocation: f.vocation, hp: f.hp, maxHp: f.maxHp,
    mana: f.mana, maxMana: f.maxMana, attack: s.stats[f.characterId].attack, defense: s.stats[f.characterId].defense,
    criticalChance: s.stats[f.characterId].criticalChance, dodgeChance: s.stats[f.characterId].dodgeChance, action: f.action as GroupAction | null }));
  const r = resolveGroupRound(b.round, bossOf(s, hunt, b.bossHp, b.bossMaxHp), fighters, dice, hunt);
  const done = r.outcome !== 'ONGOING';
  for (const f of r.fighters) {
    const row = b.fighters.find(x => x.characterId === f.characterId)!;
    await tx.groupBattleFighter.update({ where: { id: row.id }, data: { hp: f.hp, mana: f.mana, action: null, ...(done ? { activeCharacterId: null } : {}) } });
  }
  await tx.groupBattle.update({ where: { id: b.id }, data: { bossHp: r.boss.hp, state: { ...s, counters: r.boss.counters, freed: r.boss.freed, phase: r.boss.phase, choice: r.boss.choice } as unknown as Prisma.InputJsonValue,
    round: done ? b.round : b.round + 1, deadlineAt: new Date(Date.now() + settings['group.roundSeconds'] * 1000), log: [`Rodada ${b.round}`, ...r.log],
    isFinished: done, outcome: r.outcome } });
  if (done) await finish(tx, b, r.fighters, r.outcome, r.boss, settings);
}

async function finish(tx: Tx, b: LockedBattle, fighters: GroupFighter[], outcome: string, boss: GroupBoss, settings: Awaited<ReturnType<typeof loadSettings>>) {
  const hunt = huntByKey(b.huntKey)!, ref = { type: 'groupBattle', id: b.id }, freed = boss.freed;
  // A escolha do dragão fica no Diário de cada participante, ganhando recompensa ou não.
  const fate = boss.choice === 'SLAY' ? ' O grupo escolheu derrotar o dragão: uma vitória militar.' : boss.choice === 'SLEEP' ? ' O grupo escolheu fazer o dragão voltar a dormir: começa uma aliança entre os povos e as criaturas.' : '';
  // O grupo continua formado para caçar de novo.
  await tx.huntParty.update({ where: { id: b.partyId }, data: { status: 'FORMING' } });
  const material = await tx.itemBlueprint.findUnique({ where: { name: materialForLevel(hunt.level).name } });
  for (const f of fighters) {
    const row = b.fighters.find(x => x.characterId === f.characterId)!;
    const c = await tx.character.findUniqueOrThrow({ where: { id: f.characterId } });
    if (outcome !== 'VICTORY') {
      await tx.character.update({ where: { id: c.id }, data: { hp: Math.min(f.hp, c.maxHp), mana: Math.min(f.mana, c.maxMana) } });
      await event(tx, c.id, 'GROUP', `${outcome === 'DEFEAT' ? 'Derrota' : 'A fera escapou'}: ${hunt.title}`, outcome === 'DEFEAT' ? 'Todo o grupo caiu. Cure-se no templo e tentem de novo, cada um no seu papel.' : `A caçada passou de 30 rodadas e ${hunt.creature} fugiu.`);
      continue;
    }
    if (await weeklyRewards(tx, c.id, hunt.key) >= settings['group.weeklyRewards']) {
      await tx.character.update({ where: { id: c.id }, data: { hp: Math.min(f.hp, c.maxHp), mana: Math.min(f.mana, c.maxMana) } });
      await event(tx, c.id, 'GROUP', `Vitória: ${hunt.title}`, `Você ajudou o grupo, mas já recebeu as ${settings['group.weeklyRewards']} recompensas desta caçada nos últimos 7 dias.${fate}`);
      await awardAchievements(tx, c.id);
      continue;
    }
    const bonus = freed ? settings['group.freedBonusPercent'] : 0;
    const xp = scaleInt(scaleInt(scaleInt(hunt.experience, settings['economy.xpRewardPercent']), settings['group.rewardPercent']), 100 + bonus);
    const gold = scaleInt(scaleInt(scaleInt(dice(hunt.goldMin, hunt.goldMax), settings['economy.goldRewardPercent']), settings['group.rewardPercent']), 100 + bonus);
    const gained = gainExperience(c, xp);
    await tx.character.update({ where: { id: c.id }, data: { hp: Math.min(f.hp, c.maxHp), mana: Math.min(f.mana, c.maxMana), ...gained.data } });
    await addGold(tx, c.id, BigInt(gold), 'GROUP_HUNT', ref);
    const materials = settings['group.materials'];
    if (material && materials > 0) await addItem(tx, c.id, material.id, materials, 'GROUP_HUNT', ref);
    await tx.groupBattleFighter.update({ where: { id: row.id }, data: { rewarded: true, rewardGold: BigInt(gold), rewardExperience: xp } });
    await event(tx, c.id, 'GROUP', `Vitória em grupo: ${hunt.title}`,
      `${freed && hunt.bonusText ? `O grupo conseguiu ${hunt.bonusText} (bônus). ` : ''}+${xp.toLocaleString('pt-BR')} XP, +${gold.toLocaleString('pt-BR')} ouro${material && materials ? ` e ${materials}× ${material.name}` : ''}.${fate}`);
    await awardAchievements(tx, c.id);
  }
}

// Um personagem numa caçada em grupo em andamento não faz combate solo nem mexe no que a luta usa.
export async function inGroupBattle(tx: Tx, characterId: number) {
  return !!await tx.groupBattleFighter.findUnique({ where: { activeCharacterId: characterId }, select: { id: true } });
}
