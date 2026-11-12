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
import { addGold, recordItem } from '../economy/economy';
import { PROTECTION_STONE } from '../../../shared/economy';
import { event, awardAchievements } from './adventureService';
import { arenaFee, canChallenge, duelActionCosts, duelActionHelp, duelActionLabels, duelActions, duelModes, honorCosmetic, honorCosmetics, honorDelta, levelGap, lootEligible, modeLabels, wagerCap,
  type DuelAction, type DuelMode, type DuelRoundRecord } from '../../../shared/pvp';
import { resolveDuelRound, duelTuningOf, type DuelFighter as EngineFighter } from './duelEngine';
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
// Duelos com ouro ou espólio entre o mesmo par nas últimas 24 h (desafios abertos contam).
async function pairStakesToday(db: Tx | typeof prisma, a: number, b: number) {
  return db.duel.count({ where: { mode: { not: 'HONOR' }, createdAt: { gte: new Date(Date.now() - DAY) }, outcome: { notIn: ['DECLINED', 'CANCELLED', 'LAPSED'] },
    OR: [{ challengerId: a, opponentId: b }, { challengerId: b, opponentId: a }] } });
}
async function areFriends(db: Tx | typeof prisma, a: number, b: number) {
  return !!await db.friendship.findFirst({ where: { status: 'ACCEPTED', OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] }, select: { id: true } });
}
async function activeDuel(db: Tx | typeof prisma, characterId: number) {
  return db.duelFighter.findUnique({ where: { activeCharacterId: characterId }, select: { duelId: true } });
}

// ----- Leitura -----
export async function duelState(accountId: number, characterId: number, rawQuery: unknown) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true, level: true, vocation: true, vocationChosen: true, pvpWins: true, pvpLosses: true, honorPoints: true, honorMarks: true, goldInHand: true, profileTitle: true, profileFrame: true } });
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
  const [owned, lost, won] = await Promise.all([
    prisma.characterCosmetic.findMany({ where: { characterId: c.id }, select: { key: true } }),
    prisma.duelLoot.findMany({ where: { loserId: c.id, status: 'OPEN', expiresAt: { gt: now } }, orderBy: { id: 'desc' }, take: 10, include: { winner: { select: card } } }),
    prisma.duelLoot.findMany({ where: { winnerId: c.id, status: 'OPEN', expiresAt: { gt: now } }, orderBy: { id: 'desc' }, take: 10, include: { loser: { select: card } } }),
  ]);
  const blueprints = await prisma.itemBlueprint.findMany({ where: { id: { in: [...lost, ...won].map(l => l.blueprintId) } }, select: { id: true, name: true, spriteUrl: true } });
  const bp = (id: number) => blueprints.find(b => b.id === id);
  const lootView = (l: { id: number; duelId: number; blueprintId: number; upgradeTier: number; ransomPrice: bigint; expiresAt: Date }) => ({ id: l.id, duelId: l.duelId,
    item: bp(l.blueprintId)?.name ?? 'Item', sprite: bp(l.blueprintId)?.spriteUrl ?? '', upgradeTier: l.upgradeTier, ransomPrice: l.ransomPrice.toString(), expiresAt: l.expiresAt });
  const [received, sent, today] = await Promise.all([
    prisma.duel.findMany({ where: { ...invite, opponentId: c.id }, orderBy: { id: 'desc' }, take: 10, include: { challenger: { select: card } } }),
    prisma.duel.findMany({ where: { ...invite, challengerId: c.id }, orderBy: { id: 'desc' }, take: 10, include: { opponent: { select: card } } }),
    duelsToday(prisma, c.id),
  ]);
  // O duelo em andamento; se não houver, o último terminado nos últimos 30 minutos (para mostrar o resultado).
  const active = await activeDuel(prisma, c.id)
    ?? await prisma.duelFighter.findFirst({ where: { characterId: c.id, duel: { status: 'FINISHED', outcome: { in: finishedOutcomes }, finishedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } } }, orderBy: { duelId: 'desc' }, select: { duelId: true } });
  return { now, record: { wins: c.pvpWins, losses: c.pvpLosses, streak: await streakOf(c.id), honor: c.honorPoints, marks: c.honorMarks }, eligible: canChallenge(c, c, rules), today,
    gold: c.goldInHand.toString(),
    rules: { ...rules, dailyLimit: settings['pvp.dailyLimit'], roundHours: settings['pvp.roundHours'], inviteHours: settings['pvp.inviteHours'], gap: levelGap(c.level, c.level, rules.levelBandPercent),
      wagerMaxPercent: settings['pvp.wagerMaxPercent'], wagerFeePercent: settings['pvp.wagerFeePercent'], lootChancePercent: settings['pvp.lootChancePercent'], lootProtectTier: settings['pvp.lootProtectTier'],
      ransomHours: settings['pvp.ransomHours'], ransomPercent: settings['pvp.ransomPercent'], pairDailyLimit: settings['pvp.pairDailyLimit'],
      modes: duelModes.filter(m => m === 'HONOR' || (m === 'GOLD' ? settings['pvp.wagerMaxPercent'] > 0 : settings['pvp.lootChancePercent'] > 0)) },
    honorShop: honorCosmetics.map(h => ({ ...h, owned: owned.some(o => o.key === h.key), using: h.kind === 'TITLE' ? c.profileTitle === h.key : c.profileFrame === h.key })),
    lootsLost: lost.map(l => ({ ...lootView(l), winner: l.winner })), lootsWon: won.map(l => ({ ...lootView(l), loser: l.loser })),
    friends, received: received.map(d => ({ id: d.id, from: d.challenger, expiresAt: d.inviteExpiresAt, mode: d.mode, wager: d.wager.toString() })),
    sent: sent.map(d => ({ id: d.id, to: d.opponent, expiresAt: d.inviteExpiresAt, mode: d.mode, wager: d.wager.toString() })),
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
  const loot = await prisma.duelLoot.findFirst({ where: { duelId: d.id } });
  const lootItem = loot ? await prisma.itemBlueprint.findUnique({ where: { id: loot.blueprintId }, select: { name: true } }) : null;
  return { id: d.id, round: d.round, status: d.status, outcome: d.outcome, winnerId: d.winnerId, deadlineAt: d.deadlineAt, finishedAt: d.finishedAt,
    mode: d.mode, stake: d.stake.toString(), fee: d.fee.toString(), honorDelta: d.honorDelta,
    loot: loot && { id: loot.id, item: lootItem?.name ?? 'Item', upgradeTier: loot.upgradeTier, status: loot.status, winnerId: loot.winnerId, ransomPrice: loot.ransomPrice.toString() },
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
    prisma.duel.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { challenger: { select: card }, opponent: { select: card }, loots: true } }),
    prisma.duel.count({ where }),
  ]);
  const blueprints = await prisma.itemBlueprint.findMany({ where: { id: { in: rows.flatMap(d => d.loots.map(l => l.blueprintId)) } }, select: { id: true, name: true } });
  return paged(rows.map(d => ({ id: d.id, opponent: d.challengerId === c.id ? d.opponent : d.challenger, outcome: d.outcome, won: d.winnerId === c.id, draw: d.winnerId === null,
    rounds: d.round, finishedAt: d.finishedAt, mode: d.mode, stake: d.stake.toString(), fee: d.fee.toString(), honorDelta: d.honorDelta,
    loot: d.loots[0] ? { item: blueprints.find(b => b.id === d.loots[0].blueprintId)?.name ?? 'Item', upgradeTier: d.loots[0].upgradeTier, status: d.loots[0].status, mine: d.loots[0].winnerId === c.id } : null })), total, page);
}
// Ranking de honra: só vitórias em duelo, por classe; nunca por ouro. Respeita quem escondeu a fama. Cache de 60 s.
const rankingCache = new Map<string, { at: number; data: unknown }>();
export async function duelRanking(rawTier: unknown) {
  const tier = rawTier === undefined || rawTier === '' ? null : Math.max(0, Math.min(8, Math.floor(Number(rawTier) || 0)));
  const key = String(tier), hit = rankingCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.data;
  const rows = await prisma.character.findMany({ where: { pvpWins: { gt: 0 }, fameHidden: false, ...(tier === null ? {} : { classTier: tier }) },
    orderBy: [{ honorPoints: 'desc' }, { pvpWins: 'desc' }, { pvpLosses: 'asc' }, { name: 'asc' }], take: 10, select: { ...card, pvpWins: true, pvpLosses: true, honorPoints: true } });
  const data = { tier, items: rows };
  rankingCache.set(key, { at: Date.now(), data });
  return data;
}

// ----- Desafio e convite -----
function parseMode(raw: unknown): DuelMode {
  if (raw === undefined || raw === null || raw === '') return 'HONOR';
  if (typeof raw !== 'string' || !(duelModes as readonly string[]).includes(raw)) throw new GameError(400, 'Forma de duelo inválida.');
  return raw as DuelMode;
}
function parseWager(raw: unknown) {
  const text = typeof raw === 'number' && Number.isSafeInteger(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!/^[1-9]\d{0,15}$/.test(text)) throw new GameError(400, 'Informe a aposta em ouro (número inteiro).');
  return BigInt(text);
}
export async function challenge(accountId: number, characterId: number, rawName: unknown, rawMode?: unknown, rawWager?: unknown) {
  if (typeof rawName !== 'string' || rawName.trim().length < 3) throw new GameError(400, 'Informe o nome do amigo.');
  const mode = parseMode(rawMode), wager = mode === 'GOLD' ? parseWager(rawWager) : 0n;
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
    await checkStakes(tx, mode, settings, c.id, target.id);
    if (mode === 'GOLD' && c.goldInHand < wager) throw new GameError(409, 'Você não tem esse ouro para apostar.');
    await tx.duel.create({ data: { challengerId: c.id, opponentId: target.id, mode, wager, inviteExpiresAt: new Date(Date.now() + settings['pvp.inviteHours'] * HOUR) } });
    return { message: `Desafio lançado a ${target.name} (${modeLabels[mode]}${mode === 'GOLD' ? `, até ${wager.toLocaleString('pt-BR')} de ouro` : ''}). Ele tem ${settings['pvp.inviteHours']} h para aceitar.` };
  });
}
type Settings = Awaited<ReturnType<typeof loadSettings>>;
// Formas com ouro ou item: precisam estar ligadas no painel e respeitar o limite por par.
function stakesEnabled(mode: DuelMode, settings: Settings) {
  if (mode === 'GOLD' && settings['pvp.wagerMaxPercent'] <= 0) throw new GameError(409, 'Apostas de ouro estão desligadas no momento.');
  if (mode === 'LOOT' && settings['pvp.lootChancePercent'] <= 0) throw new GameError(409, 'Duelos de espólio estão desligados no momento.');
}
async function checkStakes(tx: Tx, mode: DuelMode, settings: Settings, a: number, b: number) {
  if (mode === 'HONOR') return;
  stakesEnabled(mode, settings);
  if (await pairStakesToday(tx, a, b) >= settings['pvp.pairDailyLimit']) throw new GameError(429, `Vocês dois já fizeram ${settings['pvp.pairDailyLimit']} duelos valendo ouro ou espólio nas últimas 24 horas.`);
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
    const mode = d.mode as DuelMode;
    if (mode !== 'HONOR') stakesEnabled(mode, settings);
    let stake = 0n;
    if (mode === 'GOLD') {
      // Teto calculado aqui, no servidor, com o ouro de agora: N% do ouro em mãos do mais pobre dos dois. Os dois depositam o mesmo valor.
      const cap = wagerCap(c.goldInHand, rival.goldInHand, settings['pvp.wagerMaxPercent']);
      stake = d.wager < cap ? d.wager : cap;
      if (stake < 1n) throw new GameError(409, 'Um de vocês não tem ouro suficiente para essa aposta.');
      await addGold(tx, c.id, -stake, 'DUEL_WAGER', { type: 'duel', id: d.id });
      await addGold(tx, rival.id, -stake, 'DUEL_WAGER', { type: 'duel', id: d.id });
    }
    const state: DuelState = { stats: {} }, fighters: Prisma.DuelFighterCreateManyDuelInput[] = [];
    for (const h of [c, rival].sort((a, b) => a.id - b.id)) {
      const equipment = await tx.inventoryItem.findMany({ where: { characterId: h.id, isEquipped: true }, include: { blueprint: true } });
      const s = combatStats(h, equipment);
      state.stats[h.id] = { name: h.name, attack: s.attack, defense: s.defense, agility: h.agility, criticalChance: s.criticalChance, dodgeChance: s.dodgeChance };
      // Cópia da vida e mana máximas: o duelo começa com os dois inteiros e não mexe na vida real.
      fighters.push({ characterId: h.id, vocation: h.vocation, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana, activeCharacterId: h.id });
    }
    await tx.duel.update({ where: { id: d.id }, data: { status: 'FIGHTING', outcome: 'ONGOING', startedAt: new Date(), stake, state: state as unknown as Prisma.InputJsonValue,
      deadlineAt: new Date(Date.now() + settings['pvp.roundHours'] * HOUR), log: [], fighters: { createMany: { data: fighters } } } });
    return { message: `Duelo aceito${stake ? ` (${stake.toLocaleString('pt-BR')} de ouro de cada um no pote)` : mode === 'LOOT' ? ' (espólio em jogo)' : ''}! Você e ${rival.name} escolhem em segredo o golpe de cada rodada.` };
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
  const r = resolveDuelRound(d.round, pair, dice, duelTuningOf(settings));
  const done = r.outcome !== 'ONGOING';
  for (const f of r.fighters) {
    const row = d.fighters.find(x => x.characterId === f.characterId)!;
    await tx.duelFighter.update({ where: { id: row.id }, data: { hp: f.hp, mana: f.mana, action: null, missed: f.missed, ...(done ? { activeCharacterId: null } : {}) } });
  }
  const rounds = [...((d.log ?? []) as unknown as DuelRoundRecord[]), r.record].slice(-ROUNDS_KEPT);
  await tx.duel.update({ where: { id: d.id }, data: { log: rounds as unknown as Prisma.InputJsonValue, round: done ? d.round : d.round + 1,
    deadlineAt: done ? null : new Date(Date.now() + settings['pvp.roundHours'] * HOUR),
    ...(done ? { status: 'FINISHED', outcome: r.outcome, winnerId: r.winnerId, finishedAt: new Date() } : {}) } });
  if (done) await finish(tx, d, r.outcome, r.winnerId, settings);
}
async function finish(tx: Tx, d: LockedDuel, outcome: string, winnerId: number | null, settings: Settings) {
  const s = d.state as unknown as DuelState, name = (id: number) => s.stats[id]?.name ?? 'o oponente', ref = { type: 'duel', id: d.id };
  const loserId = winnerId === null ? null : d.fighters.find(f => f.characterId !== winnerId)!.characterId;
  // Honra: pontos tipo Elo para quem venceu (empate não mexe) e marcas para os dois.
  let delta = 0;
  if (winnerId !== null && loserId !== null) {
    const [w, l] = await Promise.all([tx.character.findUniqueOrThrow({ where: { id: winnerId }, select: { honorPoints: true } }), tx.character.findUniqueOrThrow({ where: { id: loserId }, select: { honorPoints: true } })]);
    delta = honorDelta(w.honorPoints, l.honorPoints, settings['pvp.honorK']);
    await tx.character.update({ where: { id: winnerId }, data: { honorPoints: { increment: delta }, honorMarks: { increment: settings['pvp.honorMarksWin'] } } });
    await tx.character.update({ where: { id: loserId }, data: { honorPoints: { decrement: Math.min(delta, l.honorPoints) }, honorMarks: { increment: settings['pvp.honorMarksLoss'] } } });
  } else {
    for (const f of d.fighters) await tx.character.update({ where: { id: f.characterId }, data: { honorMarks: { increment: settings['pvp.honorMarksLoss'] } } });
  }
  // Aposta: o vencedor recebe o pote e paga a taxa da arena (ralo); empate devolve a aposta de cada um.
  let fee = 0n;
  if (d.mode === 'GOLD' && d.stake > 0n) {
    if (winnerId === null) for (const f of d.fighters) await addGold(tx, f.characterId, d.stake, 'DUEL_REFUND', ref);
    else {
      fee = arenaFee(d.stake * 2n, settings['pvp.wagerFeePercent']);
      await addGold(tx, winnerId, d.stake * 2n, 'DUEL_PRIZE', ref);
      if (fee > 0n) await addGold(tx, winnerId, -fee, 'DUEL_FEE', ref);
    }
  }
  const lootLine = d.mode === 'LOOT' && winnerId !== null && loserId !== null ? await rollLoot(tx, d.id, winnerId, loserId, settings) : null;
  await tx.duel.update({ where: { id: d.id }, data: { fee, honorDelta: delta } });
  const stakeLine = (mine: boolean) => d.mode === 'GOLD' && d.stake > 0n ? (winnerId === null ? ' A aposta voltou.' : mine ? ` Pote: +${(d.stake * 2n - fee).toLocaleString('pt-BR')} de ouro (taxa da arena ${fee.toLocaleString('pt-BR')}).` : ` Aposta perdida: ${d.stake.toLocaleString('pt-BR')} de ouro.`) : '';
  for (const f of d.fighters) {
    const foe = d.fighters.find(x => x.characterId !== f.characterId)!.characterId;
    if (winnerId === null) {
      await event(tx, f.characterId, 'DUEL', `Empate com ${name(foe)}`, 'O duelo terminou sem vencedor.' + stakeLine(false));
    } else if (winnerId === f.characterId) {
      await tx.character.update({ where: { id: f.characterId }, data: { pvpWins: { increment: 1 } } });
      await event(tx, f.characterId, 'DUEL', `Venceu ${name(foe)} em duelo`, (outcome === 'FORFEIT' ? `${name(foe)} se rendeu.` : outcome === 'EXPIRED' ? `${name(foe)} não voltou à arena.` : `Em ${d.round} ${d.round === 1 ? 'rodada' : 'rodadas'}.`) + ` +${delta} de honra.` + stakeLine(true) + (lootLine ? ` ${lootLine.winner}` : ''));
    } else {
      await tx.character.update({ where: { id: f.characterId }, data: { pvpLosses: { increment: 1 } } });
      await event(tx, f.characterId, 'DUEL', `Caiu diante de ${name(foe)}`, (outcome === 'FORFEIT' ? 'Você se rendeu.' : outcome === 'EXPIRED' ? 'Você não voltou à arena por duas rodadas.' : `Em ${d.round} ${d.round === 1 ? 'rodada' : 'rodadas'}.`) + ` −${delta} de honra.` + stakeLine(false) + (lootLine ? ` ${lootLine.loser}` : ''));
    }
    await awardAchievements(tx, f.characterId);
  }
}

// Espólio: com pvp.lootChancePercent, o vencedor leva UM item elegível da mochila do perdedor (os dois já estão travados em finish).
// Pedra de Proteção na mochila do perdedor é gasta e impede a perda. O item muda de dono na mesma linha da mochila (preserva a melhoria).
async function rollLoot(tx: Tx, duelId: number, winnerId: number, loserId: number, settings: Settings) {
  if (dice(1, 100) > settings['pvp.lootChancePercent']) return { winner: 'O espólio não saiu desta vez.', loser: 'Desta vez você não perdeu nenhum item.' };
  const bag = await tx.inventoryItem.findMany({ where: { characterId: loserId, isEquipped: false }, include: { blueprint: { select: { name: true, slot: true, npcPrice: true } } }, orderBy: { id: 'asc' } });
  const candidates = bag.filter(i => i.blueprint.name !== PROTECTION_STONE && lootEligible({ ...i, slot: i.blueprint.slot }, settings['pvp.lootProtectTier']));
  if (!candidates.length) return { winner: 'O espólio saiu, mas não havia item que pudesse ser levado.', loser: 'Nenhum item da sua mochila podia ser levado.' };
  const ref = { type: 'duel', id: duelId };
  const stone = bag.find(i => i.blueprint.name === PROTECTION_STONE && i.quantity >= 1);
  if (stone) {
    await recordItem(tx, loserId, stone.blueprintId, -1, 'PROTECTION_USE', ref);
    if (stone.quantity === 1) await tx.inventoryItem.delete({ where: { id: stone.id } });
    else await tx.inventoryItem.update({ where: { id: stone.id }, data: { quantity: { decrement: 1 } } });
    return { winner: 'O espólio saiu, mas uma Pedra de Proteção salvou o item do oponente.', loser: 'Uma Pedra de Proteção foi gasta e salvou seu item do espólio.' };
  }
  const item = candidates[dice(0, candidates.length - 1)];
  await tx.inventoryItem.update({ where: { id: item.id }, data: { characterId: winnerId, favorite: false } });
  await recordItem(tx, loserId, item.blueprintId, -1, 'DUEL_LOOT_OUT', ref, item.upgradeTier);
  await recordItem(tx, winnerId, item.blueprintId, 1, 'DUEL_LOOT_IN', ref, item.upgradeTier);
  const ransomPrice = BigInt(item.blueprint.npcPrice) * BigInt(settings['pvp.ransomPercent']) / 100n;
  await tx.duelLoot.create({ data: { duelId, loserId, winnerId, inventoryItemId: item.id, blueprintId: item.blueprintId, upgradeTier: item.upgradeTier, ransomPrice,
    expiresAt: new Date(Date.now() + settings['pvp.ransomHours'] * HOUR) } });
  const label = `${item.blueprint.name}${item.upgradeTier ? ` +${item.upgradeTier}` : ''}`;
  return { winner: `Espólio: você levou ${label}. O oponente pode resgatá-lo em ${settings['pvp.ransomHours']} h.`, loser: `Espólio: você perdeu ${label}. Resgate-o em ${settings['pvp.ransomHours']} h por ${ransomPrice.toLocaleString('pt-BR')} de ouro.` };
}
// Resgate: o perdedor paga o preço ao vencedor e o item volta. Se o vencedor já vendeu, anunciou, equipou ou desmontou o item, o resgate acabou.
export async function ransomLoot(accountId: number, characterId: number, lootId: number) {
  integer(lootId);
  return transaction(async tx => {
    const loot = await tx.duelLoot.findUnique({ where: { id: lootId } });
    if (!loot || loot.loserId !== characterId) throw new GameError(404, 'Espólio não encontrado.');
    // Os dois personagens em ordem de id; quem pede é conferido pela conta.
    for (const id of [loot.loserId, loot.winnerId].sort((a, b) => a - b)) await (id === characterId ? lockCharacter(tx, accountId, id) : lockCharacterAny(tx, id));
    const fresh = await tx.duelLoot.findUniqueOrThrow({ where: { id: lootId } });
    if (fresh.status !== 'OPEN') throw new GameError(409, 'Esse espólio já foi resgatado ou perdeu o prazo.');
    if (fresh.expiresAt.getTime() <= Date.now()) throw new GameError(409, 'O prazo do resgate acabou.');
    const item = await tx.inventoryItem.findUnique({ where: { id: fresh.inventoryItemId } });
    if (!item || item.characterId !== fresh.winnerId || item.isEquipped) throw new GameError(409, 'O vencedor já usou, vendeu ou anunciou esse item. O resgate não existe mais.');
    const ref = { type: 'duelLoot', id: lootId };
    await addGold(tx, fresh.loserId, -fresh.ransomPrice, 'DUEL_RANSOM', ref);
    await addGold(tx, fresh.winnerId, fresh.ransomPrice, 'DUEL_RANSOM', ref);
    await tx.inventoryItem.update({ where: { id: item.id }, data: { characterId: fresh.loserId, favorite: false } });
    await recordItem(tx, fresh.winnerId, item.blueprintId, -1, 'DUEL_RANSOM_OUT', ref, item.upgradeTier);
    await recordItem(tx, fresh.loserId, item.blueprintId, 1, 'DUEL_RANSOM_IN', ref, item.upgradeTier);
    await tx.duelLoot.update({ where: { id: lootId }, data: { status: 'RANSOMED', resolvedAt: new Date() } });
    await event(tx, fresh.winnerId, 'DUEL', 'Espólio resgatado', `O dono pagou ${fresh.ransomPrice.toLocaleString('pt-BR')} de ouro e levou o item de volta.`);
    return { message: `Item resgatado por ${fresh.ransomPrice.toLocaleString('pt-BR')} de ouro.` };
  });
}
// Loja da honra: comprar uma aparência gasta marcas e já passa a usá-la; "usar" troca entre as que você tem.
export async function honorCosmeticAction(accountId: number, characterId: number, rawKey: unknown, buy: boolean) {
  const item = typeof rawKey === 'string' ? honorCosmetic(rawKey) : undefined;
  if (!item) throw new GameError(400, 'Aparência inválida.');
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    const owned = await tx.characterCosmetic.findUnique({ where: { characterId_key: { characterId: c.id, key: item.key } } });
    if (buy) {
      if (owned) throw new GameError(409, 'Você já tem essa aparência.');
      if (c.honorMarks < item.marks) throw new GameError(409, `Faltam ${item.marks - c.honorMarks} marcas de honra.`);
      await tx.character.update({ where: { id: c.id }, data: { honorMarks: { decrement: item.marks } } });
      await tx.characterCosmetic.create({ data: { characterId: c.id, key: item.key } });
    } else if (!owned) throw new GameError(409, 'Você ainda não tem essa aparência.');
    await tx.character.update({ where: { id: c.id }, data: item.kind === 'TITLE' ? { profileTitle: item.key } : { profileFrame: item.key } });
    return { message: buy ? `${item.name}: comprado e em uso.` : `Agora você usa ${item.name}.` };
  });
}

// Varredura (server.ts, a cada minuto): convites vencidos e rodadas com prazo estourado que ninguém abriu.
// Uma linha por vez, cada uma na sua transação curta: uma atualização em massa podia travar (deadlock) contra jogadores mexendo em duelos.
// Se uma linha falhar (ex.: deadlock), segue para as outras; a próxima varredura tenta de novo.
export async function expireDuels() {
  const now = new Date(), retry = async (run: () => Promise<unknown>) => { try { await run(); } catch (e) { console.error('[duelo] varredura:', e instanceof Error ? e.message.trim().split(/\r?\n/).at(-1) : e); } };
  const lapsed = await prisma.duel.findMany({ where: { status: 'INVITED', inviteExpiresAt: { lte: now } }, select: { id: true }, take: 200 });
  for (const d of lapsed) await retry(() => prisma.duel.updateMany({ where: { id: d.id, status: 'INVITED' }, data: { status: 'FINISHED', outcome: 'LAPSED', finishedAt: now } }));
  const loots = await prisma.duelLoot.findMany({ where: { status: 'OPEN', expiresAt: { lte: now } }, select: { id: true }, take: 200 });
  for (const l of loots) await retry(() => prisma.duelLoot.updateMany({ where: { id: l.id, status: 'OPEN' }, data: { status: 'EXPIRED', resolvedAt: now } }));
  const late = await prisma.duel.findMany({ where: { status: 'FIGHTING', deadlineAt: { lte: now } }, select: { id: true, round: true }, take: 50 });
  for (const l of late) {
    await retry(() => transaction(async tx => {
      const d = await lockDuel(tx, l.id);
      if (d.status !== 'FIGHTING' || d.round !== l.round || !d.deadlineAt || d.deadlineAt > new Date()) return;
      for (const f of d.fighters) await lockCharacterAny(tx, f.characterId);
      await resolveRound(tx, d);
    }));
  }
  return late.length;
}
