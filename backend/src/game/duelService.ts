// Duelo (PvP) entre amigos: desafio, aceite, rodadas com prazo, rendição, histórico, ranking de honra e varredura de prazos.
// O duelo NUNCA mexe na vida, mana, XP, ouro ou itens do personagem: vida e mana da luta vivem em DuelFighter; no fim só mudam pvpWins/pvpLosses.
// Ordem das travas: desafio/convite = personagem de quem age → duelo → outro personagem.
// Rodada (escolher, fechar, render-se, varredura) = duelo → personagens em ordem de id (como a caçada em grupo), para a varredura não travar contra os jogadores.
import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma, transaction, lockCharacter, lockCharacterAny } from '../core/db';
import { GameError, integer } from '../core/engine';
import { loadSettings } from '../core/settings';
import { pageOf, paged } from '../core/http';
import { combatStats } from './combatStats';
import { event, awardAchievements } from './adventureService';
import { canChallenge, duelActionCosts, duelActionHelp, duelActionLabels, duelActions, levelGap, type DuelAction, type DuelRoundRecord } from '../../../shared/pvp';
import { resolveDuelRound, type DuelFighter as EngineFighter } from './duelEngine';
type Tx = Prisma.TransactionClient;
const dice = (min: number, max: number) => randomInt(min, max + 1);
const card = { id: true, name: true, level: true, vocation: true, classTier: true, profileAvatar: true, profileEmblem: true } as const;
const DAY = 24 * 3600 * 1000, HOUR = 3600 * 1000;
const ROUNDS_KEPT = 60;
// Força de cada lado, gravada no aceite (trocar equipamento no meio do duelo não muda a luta).
type FighterStats = { name: string; attack: number; defense: number; agility: number; criticalChance: number; dodgeChance: number };
type DuelState = { stats: Record<string, FighterStats> };
const finishedOutcomes = ['VICTORY', 'FORFEIT', 'EXPIRED', 'DRAW'];

async function lockDuel(tx: Tx, duelId: number) {
  await tx.$queryRaw`SELECT id FROM \`Duel\` WHERE id = ${duelId} FOR UPDATE`;
  const d = await tx.duel.findUnique({ where: { id: duelId }, include: { fighters: { orderBy: { characterId: 'asc' } } } });
  if (!d) throw new GameError(404, 'Duelo não encontrado.');
  return d;
}
type LockedDuel = Awaited<ReturnType<typeof lockDuel>>;
const rulesOf = (s: Awaited<ReturnType<typeof loadSettings>>) => ({ minLevel: s['pvp.minLevel'], levelBandPercent: s['pvp.levelBandPercent'] });
async function pvpBlocked(tx: Tx, accountId: number) {
  const now = new Date();
  return !!await tx.punishment.findFirst({ where: { accountId, kind: 'PVP_BLOCK', revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true } });
}
// Duelos do dia: desafios feitos e duelos aceitos nas últimas 24 h (convites recusados, cancelados ou vencidos não contam).
async function duelsToday(db: Tx | typeof prisma, characterId: number) {
  return db.duel.count({ where: { createdAt: { gte: new Date(Date.now() - DAY) }, outcome: { notIn: ['DECLINED', 'CANCELLED', 'LAPSED'] },
    OR: [{ challengerId: characterId }, { opponentId: characterId, status: { not: 'INVITED' } }] } });
}
async function areFriends(db: Tx | typeof prisma, a: number, b: number) {
  return !!await db.friendship.findFirst({ where: { status: 'ACCEPTED', OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] }, select: { id: true } });
}
async function activeDuel(db: Tx | typeof prisma, characterId: number) {
  return db.duelFighter.findUnique({ where: { activeCharacterId: characterId }, select: { duelId: true } });
}

// ----- Leitura -----
export async function duelState(accountId: number, characterId: number, rawQuery: unknown) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true, level: true, vocation: true, vocationChosen: true, pvpWins: true, pvpLosses: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const settings = await loadSettings(prisma), rules = rulesOf(settings), now = new Date();
  const q = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 24).toLowerCase() : '';
  const rows = await prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ requesterId: c.id }, { addresseeId: c.id }] },
    include: { requester: { select: { ...card, vocationChosen: true } }, addressee: { select: { ...card, vocationChosen: true } } }, take: 500 });
  const friendList = rows.map(f => f.requesterId === c.id ? f.addressee : f.requester).filter(f => !q || f.name.toLowerCase().includes(q));
  // Primeiro quem está na faixa, depois por nível mais próximo; até 10 (a busca acha os outros).
  const friends = friendList.map(({ vocationChosen, ...f }) => ({ ...f, blocked: canChallenge(c, { level: f.level, vocationChosen }, rules) }))
    .sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || Math.abs(a.level - c.level) - Math.abs(b.level - c.level)).slice(0, 10);
  const invite = { status: 'INVITED', inviteExpiresAt: { gt: now } } as const;
  const [received, sent, today] = await Promise.all([
    prisma.duel.findMany({ where: { ...invite, opponentId: c.id }, orderBy: { id: 'desc' }, take: 10, include: { challenger: { select: card } } }),
    prisma.duel.findMany({ where: { ...invite, challengerId: c.id }, orderBy: { id: 'desc' }, take: 10, include: { opponent: { select: card } } }),
    duelsToday(prisma, c.id),
  ]);
  // O duelo em andamento; se não houver, o último terminado nos últimos 30 minutos (para mostrar o resultado).
  const active = await activeDuel(prisma, c.id)
    ?? await prisma.duelFighter.findFirst({ where: { characterId: c.id, duel: { status: 'FINISHED', outcome: { in: finishedOutcomes }, finishedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } } }, orderBy: { duelId: 'desc' }, select: { duelId: true } });
  return { now, record: { wins: c.pvpWins, losses: c.pvpLosses, streak: await streakOf(c.id) }, eligible: canChallenge(c, c, rules), today,
    rules: { ...rules, dailyLimit: settings['pvp.dailyLimit'], roundHours: settings['pvp.roundHours'], inviteHours: settings['pvp.inviteHours'], gap: levelGap(c.level, c.level, rules.levelBandPercent) },
    friends, received: received.map(d => ({ id: d.id, from: d.challenger, expiresAt: d.inviteExpiresAt })), sent: sent.map(d => ({ id: d.id, to: d.opponent, expiresAt: d.inviteExpiresAt })),
    duel: active ? await duelView(active.duelId, c.id) : null };
}
// Sequência atual de vitórias (do duelo mais recente para trás).
async function streakOf(characterId: number) {
  const last = await prisma.duel.findMany({ where: { status: 'FINISHED', outcome: { in: finishedOutcomes }, OR: [{ challengerId: characterId }, { opponentId: characterId }] }, orderBy: { id: 'desc' }, take: 50, select: { winnerId: true } });
  let n = 0; for (const d of last) { if (d.winnerId !== characterId) break; n++; } return n;
}
async function duelView(duelId: number, viewerId: number) {
  const d = await prisma.duel.findUnique({ where: { id: duelId }, include: { fighters: { orderBy: { id: 'asc' }, include: { character: { select: card } } } } });
  if (!d) return null;
  const me = d.fighters.find(f => f.characterId === viewerId), foe = d.fighters.find(f => f.characterId !== viewerId);
  if (!me || !foe) return null;
  const side = (f: typeof me, mine: boolean) => ({ characterId: f.characterId, character: f.character, vocation: f.vocation, hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana,
    // O oponente só vê SE você escolheu, nunca O QUÊ.
    ready: f.action !== null, action: mine ? f.action : null, missed: f.missed });
  const costs = duelActionCosts(me.vocation), labels = duelActionLabels(me.vocation);
  return { id: d.id, round: d.round, status: d.status, outcome: d.outcome, winnerId: d.winnerId, deadlineAt: d.deadlineAt, finishedAt: d.finishedAt,
    me: side(me, true), foe: side(foe, false),
    actions: duelActions.map(a => ({ key: a, label: labels[a], mana: costs[a], help: duelActionHelp[a] })),
    rounds: ((d.log ?? []) as unknown as DuelRoundRecord[]) };
}
export async function duelHistory(accountId: number, characterId: number, query: Record<string, unknown>) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const { page, skip, take } = pageOf(query);
  const where = { status: 'FINISHED', outcome: { in: finishedOutcomes }, OR: [{ challengerId: c.id }, { opponentId: c.id }] };
  const [rows, total] = await Promise.all([
    prisma.duel.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { challenger: { select: card }, opponent: { select: card } } }),
    prisma.duel.count({ where }),
  ]);
  return paged(rows.map(d => ({ id: d.id, opponent: d.challengerId === c.id ? d.opponent : d.challenger, outcome: d.outcome, won: d.winnerId === c.id, draw: d.winnerId === null,
    rounds: d.round, finishedAt: d.finishedAt })), total, page);
}
// Ranking de honra: só vitórias em duelo, por classe; nunca por ouro. Respeita quem escondeu a fama. Cache de 60 s.
const rankingCache = new Map<string, { at: number; data: unknown }>();
export async function duelRanking(rawTier: unknown) {
  const tier = rawTier === undefined || rawTier === '' ? null : Math.max(0, Math.min(8, Math.floor(Number(rawTier) || 0)));
  const key = String(tier), hit = rankingCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.data;
  const rows = await prisma.character.findMany({ where: { pvpWins: { gt: 0 }, fameHidden: false, ...(tier === null ? {} : { classTier: tier }) },
    orderBy: [{ pvpWins: 'desc' }, { pvpLosses: 'asc' }, { name: 'asc' }], take: 10, select: { ...card, pvpWins: true, pvpLosses: true } });
  const data = { tier, items: rows };
  rankingCache.set(key, { at: Date.now(), data });
  return data;
}

// ----- Desafio e convite -----
export async function challenge(accountId: number, characterId: number, rawName: unknown) {
  if (typeof rawName !== 'string' || rawName.trim().length < 3) throw new GameError(400, 'Informe o nome do amigo.');
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId), settings = await loadSettings(tx);
    if (await pvpBlocked(tx, accountId)) throw new GameError(403, 'Sua conta está proibida de duelar no momento.');
    const target = await tx.character.findUnique({ where: { name: rawName.trim() }, select: { id: true, name: true, level: true, vocationChosen: true, accountId: true } });
    if (!target || target.id === c.id) throw new GameError(404, 'Personagem não encontrado.');
    if (target.accountId === c.accountId) throw new GameError(409, 'Seus próprios personagens não duelam entre si.');
    if (!await areFriends(tx, c.id, target.id)) throw new GameError(403, `${target.name} precisa ser seu amigo (peça amizade pelo perfil).`);
    const blocked = canChallenge(c, target, rulesOf(settings));
    if (blocked) throw new GameError(409, blocked);
    if (await activeDuel(tx, c.id)) throw new GameError(409, 'Termine seu duelo atual antes de desafiar outro aventureiro.');
    if (await duelsToday(tx, c.id) >= settings['pvp.dailyLimit']) throw new GameError(429, `Você já duelou ${settings['pvp.dailyLimit']} vezes nas últimas 24 horas. Descanse as armas.`);
    const pending = await tx.duel.findFirst({ where: { status: 'INVITED', inviteExpiresAt: { gt: new Date() }, OR: [{ challengerId: c.id, opponentId: target.id }, { challengerId: target.id, opponentId: c.id }] }, select: { id: true } });
    if (pending) throw new GameError(409, `Já existe um desafio aberto entre você e ${target.name}.`);
    await tx.duel.create({ data: { challengerId: c.id, opponentId: target.id, inviteExpiresAt: new Date(Date.now() + settings['pvp.inviteHours'] * HOUR) } });
    return { message: `Desafio lançado a ${target.name}. Ele tem ${settings['pvp.inviteHours']} h para aceitar.` };
  });
}
export async function answerDuel(accountId: number, characterId: number, duelId: number, accept: boolean) {
  integer(duelId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const d = await lockDuel(tx, duelId);
    if (d.opponentId !== c.id || d.status !== 'INVITED') throw new GameError(404, 'Desafio não encontrado.');
    if (d.inviteExpiresAt.getTime() <= Date.now()) throw new GameError(409, 'Esse desafio já perdeu a validade.');
    if (!accept) { await tx.duel.update({ where: { id: d.id }, data: { status: 'FINISHED', outcome: 'DECLINED', finishedAt: new Date() } }); return { message: 'Desafio recusado.' }; }
    const settings = await loadSettings(tx);
    if (await pvpBlocked(tx, accountId)) throw new GameError(403, 'Sua conta está proibida de duelar no momento.');
    const rival = await lockCharacterAny(tx, d.challengerId);
    if (await pvpBlocked(tx, rival.accountId)) throw new GameError(409, `${rival.name} não pode duelar no momento.`);
    const blocked = canChallenge(rival, c, rulesOf(settings));
    if (blocked) throw new GameError(409, blocked);
    if (await activeDuel(tx, c.id)) throw new GameError(409, 'Termine seu duelo atual antes de aceitar outro.');
    if (await activeDuel(tx, rival.id)) throw new GameError(409, `${rival.name} já está em outro duelo. Tente depois.`);
    if (await duelsToday(tx, c.id) >= settings['pvp.dailyLimit']) throw new GameError(429, `Você já duelou ${settings['pvp.dailyLimit']} vezes nas últimas 24 horas. Descanse as armas.`);
    const state: DuelState = { stats: {} }, fighters: Prisma.DuelFighterCreateManyDuelInput[] = [];
    for (const h of [c, rival].sort((a, b) => a.id - b.id)) {
      const equipment = await tx.inventoryItem.findMany({ where: { characterId: h.id, isEquipped: true }, include: { blueprint: true } });
      const s = combatStats(h, equipment);
      state.stats[h.id] = { name: h.name, attack: s.attack, defense: s.defense, agility: h.agility, criticalChance: s.criticalChance, dodgeChance: s.dodgeChance };
      // Cópia da vida e mana máximas: o duelo começa com os dois inteiros e não mexe na vida real.
      fighters.push({ characterId: h.id, vocation: h.vocation, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana, activeCharacterId: h.id });
    }
    await tx.duel.update({ where: { id: d.id }, data: { status: 'FIGHTING', outcome: 'ONGOING', startedAt: new Date(), state: state as unknown as Prisma.InputJsonValue,
      deadlineAt: new Date(Date.now() + settings['pvp.roundHours'] * HOUR), log: [], fighters: { createMany: { data: fighters } } } });
    return { message: `Duelo aceito! Você e ${rival.name} escolhem em segredo o golpe de cada rodada.` };
  });
}
export async function cancelChallenge(accountId: number, characterId: number, duelId: number) {
  integer(duelId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const d = await lockDuel(tx, duelId);
    if (d.challengerId !== c.id || d.status !== 'INVITED') throw new GameError(404, 'Desafio não encontrado.');
    await tx.duel.update({ where: { id: d.id }, data: { status: 'FINISHED', outcome: 'CANCELLED', finishedAt: new Date() } });
    return { message: 'Desafio retirado.' };
  });
}

// ----- Rodadas -----
// Trava o duelo e os dois personagens (em ordem de id); confere que quem pede é um deles, da conta autenticada.
async function lockForRound(tx: Tx, accountId: number, characterId: number, duelId: number, expectedRound: number | null) {
  integer(duelId); if (expectedRound !== null) integer(expectedRound, 1);
  const d = await lockDuel(tx, duelId);
  if (!d.fighters.some(f => f.characterId === characterId)) throw new GameError(404, 'Duelo não encontrado.');
  for (const f of d.fighters) await (f.characterId === characterId ? lockCharacter(tx, accountId, characterId) : lockCharacterAny(tx, f.characterId));
  if (d.status !== 'FIGHTING') throw new GameError(409, 'Esse duelo já terminou.');
  if (expectedRound !== null && d.round !== expectedRound) throw new GameError(409, 'Essa rodada já passou.');
  return d;
}
export async function chooseDuelAction(accountId: number, characterId: number, duelId: number, expectedRound: number, rawAction: unknown) {
  if (typeof rawAction !== 'string' || !duelActions.includes(rawAction as DuelAction) || rawAction === 'FLEE') throw new GameError(400, 'Ação inválida.');
  const action = rawAction as DuelAction;
  return transaction(async tx => {
    const d = await lockForRound(tx, accountId, characterId, duelId, expectedRound);
    const me = d.fighters.find(f => f.characterId === characterId)!;
    if (me.action) throw new GameError(409, 'Você já escolheu nesta rodada. Aguarde o oponente.');
    if (me.mana < duelActionCosts(me.vocation)[action]) throw new GameError(409, 'Mana insuficiente.');
    await tx.duelFighter.update({ where: { id: me.id }, data: { action } });
    me.action = action;
    if (d.fighters.every(f => f.action)) { await resolveRound(tx, d); return { message: '' }; }
    return { message: 'Golpe escolhido. Aguardando o oponente.' };
  });
}
// Qualquer um dos dois fecha a rodada depois do prazo: quem não escolheu, defende.
export async function advanceDuel(accountId: number, characterId: number, duelId: number, expectedRound: number) {
  return transaction(async tx => {
    const d = await lockForRound(tx, accountId, characterId, duelId, expectedRound);
    if (d.deadlineAt && d.deadlineAt.getTime() > Date.now()) throw new GameError(409, 'A rodada ainda está aberta.');
    await resolveRound(tx, d);
    return { message: '' };
  });
}
// Render-se encerra o duelo na hora, em qualquer rodada.
export async function forfeitDuel(accountId: number, characterId: number, duelId: number) {
  return transaction(async tx => {
    const d = await lockForRound(tx, accountId, characterId, duelId, null);
    d.fighters.find(f => f.characterId === characterId)!.action = 'FLEE';
    await resolveRound(tx, d);
    return { message: 'Você se rendeu.' };
  });
}

async function resolveRound(tx: Tx, d: LockedDuel) {
  const s = d.state as unknown as DuelState, settings = await loadSettings(tx);
  const pair = d.fighters.map(f => ({ characterId: f.characterId, name: s.stats[f.characterId].name, vocation: f.vocation, hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana,
    attack: s.stats[f.characterId].attack, defense: s.stats[f.characterId].defense, agility: s.stats[f.characterId].agility,
    criticalChance: s.stats[f.characterId].criticalChance, dodgeChance: s.stats[f.characterId].dodgeChance, action: f.action as DuelAction | null, missed: f.missed })) as [EngineFighter, EngineFighter];
  const r = resolveDuelRound(d.round, pair, dice, settings['pvp.damagePercent']);
  const done = r.outcome !== 'ONGOING';
  for (const f of r.fighters) {
    const row = d.fighters.find(x => x.characterId === f.characterId)!;
    await tx.duelFighter.update({ where: { id: row.id }, data: { hp: f.hp, mana: f.mana, action: null, missed: f.missed, ...(done ? { activeCharacterId: null } : {}) } });
  }
  const rounds = [...((d.log ?? []) as unknown as DuelRoundRecord[]), r.record].slice(-ROUNDS_KEPT);
  await tx.duel.update({ where: { id: d.id }, data: { log: rounds as unknown as Prisma.InputJsonValue, round: done ? d.round : d.round + 1,
    deadlineAt: done ? null : new Date(Date.now() + settings['pvp.roundHours'] * HOUR),
    ...(done ? { status: 'FINISHED', outcome: r.outcome, winnerId: r.winnerId, finishedAt: new Date() } : {}) } });
  if (done) await finish(tx, d, r.outcome, r.winnerId);
}
async function finish(tx: Tx, d: LockedDuel, outcome: string, winnerId: number | null) {
  const s = d.state as unknown as DuelState, name = (id: number) => s.stats[id]?.name ?? 'o oponente';
  for (const f of d.fighters) {
    const foe = d.fighters.find(x => x.characterId !== f.characterId)!.characterId;
    if (winnerId === null) {
      await event(tx, f.characterId, 'DUEL', `Empate com ${name(foe)}`, 'O duelo terminou sem vencedor.');
    } else if (winnerId === f.characterId) {
      await tx.character.update({ where: { id: f.characterId }, data: { pvpWins: { increment: 1 } } });
      await event(tx, f.characterId, 'DUEL', `Venceu ${name(foe)} em duelo`, outcome === 'FORFEIT' ? `${name(foe)} se rendeu.` : outcome === 'EXPIRED' ? `${name(foe)} não voltou à arena.` : `Em ${d.round} ${d.round === 1 ? 'rodada' : 'rodadas'}.`);
    } else {
      await tx.character.update({ where: { id: f.characterId }, data: { pvpLosses: { increment: 1 } } });
      await event(tx, f.characterId, 'DUEL', `Caiu diante de ${name(foe)}`, outcome === 'FORFEIT' ? 'Você se rendeu.' : outcome === 'EXPIRED' ? 'Você não voltou à arena por duas rodadas.' : `Em ${d.round} ${d.round === 1 ? 'rodada' : 'rodadas'}.`);
    }
    await awardAchievements(tx, f.characterId);
  }
}

// Varredura (server.ts, a cada minuto): convites vencidos e rodadas com prazo estourado que ninguém abriu.
export async function expireDuels() {
  const now = new Date();
  await prisma.duel.updateMany({ where: { status: 'INVITED', inviteExpiresAt: { lte: now } }, data: { status: 'FINISHED', outcome: 'LAPSED', finishedAt: now } });
  const late = await prisma.duel.findMany({ where: { status: 'FIGHTING', deadlineAt: { lte: now } }, select: { id: true, round: true }, take: 50 });
  for (const l of late) {
    await transaction(async tx => {
      const d = await lockDuel(tx, l.id);
      if (d.status !== 'FIGHTING' || d.round !== l.round || !d.deadlineAt || d.deadlineAt > new Date()) return;
      for (const f of d.fighters) await lockCharacterAny(tx, f.characterId);
      await resolveRound(tx, d);
    });
  }
  return late.length;
}
