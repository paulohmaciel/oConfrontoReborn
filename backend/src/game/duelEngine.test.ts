import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDuelAction, resolveDuelRound, type DuelFighter } from './duelEngine';
import { arenaFee, canChallenge, DUEL_MAX_ROUNDS, honorDelta, lootEligible, wagerCap } from '../../../shared/pvp';

// Dado previsível: valor médio do intervalo; para chances (1..100) devolve 100, ou seja, sem crítico e sem esquiva.
const mid = (min: number, max: number) => max === 100 && min === 1 ? 100 : Math.floor((min + max) / 2);
const hero = (id: number, extra: Partial<DuelFighter> = {}): DuelFighter => ({ characterId: id, name: `H${id}`, vocation: 'KNIGHT', hp: 1000, maxHp: 1000, mana: 200, maxMana: 200,
  attack: 300, defense: 100, agility: 10, criticalChance: 0, dodgeChance: 0, action: 'ATTACK', missed: 0, ...extra });

test('quem tem mais agilidade age primeiro; empate decidido pelo dado', () => {
  const r = resolveDuelRound(1, [hero(1, { agility: 10 }), hero(2, { agility: 30 })], mid);
  assert.equal(r.record.moves[1].first, true);
  assert.equal(r.record.moves[0].first, false);
  const first = resolveDuelRound(1, [hero(1), hero(2)], () => 0);
  assert.equal(first.record.moves[0].first, true);
  const second = resolveDuelRound(1, [hero(1), hero(2)], (min, max) => max === 1 ? 1 : mid(min, max));
  assert.equal(second.record.moves[1].first, true);
});

test('quem cai antes de agir não age', () => {
  const r = resolveDuelRound(1, [hero(1, { agility: 50, attack: 5000 }), hero(2, { hp: 100 })], mid);
  assert.equal(r.outcome, 'VICTORY');
  assert.equal(r.winnerId, 1);
  assert.equal(r.fighters[1].hp, 0);
  assert.equal(r.record.moves[1].acted, false);
  assert.equal(r.fighters[0].hp, 1000);
});

test('Interromper agindo antes corta o golpe forte; agindo depois, não', () => {
  const fast = resolveDuelRound(1, [hero(1, { agility: 50, action: 'INTERRUPT' }), hero(2, { action: 'FIFTH_HIT' })], mid);
  assert.equal(fast.record.moves[1].interrupted, true);
  assert.equal(fast.record.moves[1].dealt, 0);
  assert.equal(fast.fighters[0].hp, 1000);
  assert.equal(fast.fighters[1].mana, 200 - 35, 'o golpe cortado gasta a mana mesmo assim');
  const slow = resolveDuelRound(1, [hero(1, { action: 'INTERRUPT' }), hero(2, { agility: 50, action: 'FIFTH_HIT' })], mid);
  assert.equal(slow.record.moves[1].interrupted, false);
  assert.ok(slow.fighters[0].hp < 1000);
});

test('Defender reduz o dano recebido; sem mana a ação vira golpe comum', () => {
  const open = resolveDuelRound(1, [hero(1, { agility: 50 }), hero(2)], mid);
  const guarded = resolveDuelRound(1, [hero(1, { agility: 50 }), hero(2, { action: 'DEFEND_SHIELD' })], mid);
  assert.ok(guarded.record.moves[0].dealt < open.record.moves[0].dealt);
  assert.deepEqual(effectiveDuelAction({ vocation: 'KNIGHT', mana: 5, action: 'HEAL' }), { action: 'ATTACK', auto: false });
  const r = resolveDuelRound(1, [hero(1, { mana: 5, action: 'HEAL', hp: 500 }), hero(2)], mid);
  assert.equal(r.record.moves[0].action, 'ATTACK');
  assert.equal(r.record.moves[0].healed, 0);
});

test('Curar recupera vida e gasta mana', () => {
  const r = resolveDuelRound(1, [hero(1, { agility: 50, hp: 400, action: 'HEAL' }), hero(2, { action: 'DEFEND_SHIELD' })], mid);
  assert.ok(r.record.moves[0].healed > 0);
  assert.equal(r.fighters[0].mana, 180);
});

test('rendição entrega a vitória (mesmo contra quem sumiu); os dois se rendendo é empate', () => {
  const absent = resolveDuelRound(3, [hero(1, { action: 'FLEE' }), hero(2, { action: null, missed: 1 })], mid);
  assert.equal(absent.outcome, 'FORFEIT');
  assert.equal(absent.winnerId, 2);
  const r = resolveDuelRound(3, [hero(1, { action: 'FLEE' }), hero(2)], mid);
  assert.equal(r.outcome, 'FORFEIT');
  assert.equal(r.winnerId, 2);
  assert.equal(r.fighters[1].hp, 1000, 'ninguém golpeia na rodada da rendição');
  const both = resolveDuelRound(3, [hero(1, { action: 'FLEE' }), hero(2, { action: 'FLEE' })], mid);
  assert.equal(both.outcome, 'DRAW');
  assert.equal(both.winnerId, null);
});

test('quem não escolhe só defende; duas rodadas seguidas sem escolher perde o duelo', () => {
  const once = resolveDuelRound(1, [hero(1, { action: null }), hero(2, { agility: 50 })], mid);
  assert.equal(once.outcome, 'ONGOING');
  assert.equal(once.record.moves[0].auto, true);
  assert.equal(once.record.moves[0].dealt, 0);
  assert.equal(once.fighters[0].missed, 1);
  const twice = resolveDuelRound(2, [hero(1, { action: null, missed: 1 }), hero(2)], mid);
  assert.equal(twice.outcome, 'EXPIRED');
  assert.equal(twice.winnerId, 2);
  const back = resolveDuelRound(2, [hero(1, { action: 'ATTACK', missed: 1 }), hero(2)], mid);
  assert.equal(back.fighters[0].missed, 0, 'escolher zera a contagem');
});

test('rodadas esgotadas terminam empatadas; dano escalado pela configuração', () => {
  const r = resolveDuelRound(DUEL_MAX_ROUNDS, [hero(1, { action: 'DEFEND_SHIELD' }), hero(2, { action: 'DEFEND_SHIELD' })], mid);
  assert.equal(r.outcome, 'DRAW');
  const full = resolveDuelRound(1, [hero(1, { agility: 50 }), hero(2)], mid, 100);
  const half = resolveDuelRound(1, [hero(1, { agility: 50 }), hero(2)], mid, 50);
  assert.equal(half.record.moves[0].dealt, Math.floor(full.record.moves[0].dealt / 2));
});

test('faixa de nível e nível mínimo', () => {
  const rules = { minLevel: 20, levelBandPercent: 10 };
  assert.equal(canChallenge({ level: 100, vocationChosen: true }, { level: 91, vocationChosen: true }, rules), null);
  assert.match(canChallenge({ level: 100, vocationChosen: true }, { level: 89, vocationChosen: true }, rules) ?? '', /diferença/);
  assert.match(canChallenge({ level: 19, vocationChosen: true }, { level: 20, vocationChosen: true }, rules) ?? '', /nível 20/);
  assert.match(canChallenge({ level: 30, vocationChosen: true }, { level: 30, vocationChosen: false }, rules) ?? '', /oponente/);
  assert.equal(canChallenge({ level: 20, vocationChosen: true }, { level: 21, vocationChosen: true }, rules), null, 'folga mínima de 1 nível');
});

test('honra tipo Elo: vencer quem tem mais honra vale mais; nunca menos de 1', () => {
  assert.equal(honorDelta(1000, 1000, 32), 16);
  assert.ok(honorDelta(1000, 1400, 32) > honorDelta(1400, 1000, 32));
  assert.equal(honorDelta(3000, 100, 32), 1);
});

test('aposta: teto pelo mais pobre; taxa da arena com mínimo de 1', () => {
  assert.equal(wagerCap(10_000n, 2_000n, 10), 200n);
  assert.equal(wagerCap(0n, 5_000n, 10), 0n);
  assert.equal(arenaFee(400n, 5), 20n);
  assert.equal(arenaFee(10n, 5), 1n);
  assert.equal(arenaFee(400n, 0), 0n);
});

test('espólio: nunca equipado, favorito, raro, melhorado demais ou empilhável', () => {
  const base = { isEquipped: false, favorite: false, rareItemId: null, upgradeTier: 0, quantity: 1, slot: 'WEAPON' };
  assert.equal(lootEligible(base, 7), true);
  assert.equal(lootEligible({ ...base, isEquipped: true }, 7), false);
  assert.equal(lootEligible({ ...base, favorite: true }, 7), false);
  assert.equal(lootEligible({ ...base, rareItemId: 3 }, 7), false);
  assert.equal(lootEligible({ ...base, upgradeTier: 7 }, 7), false);
  assert.equal(lootEligible({ ...base, upgradeTier: 6 }, 7), true);
  assert.equal(lootEligible({ ...base, slot: 'CONSUMABLE', quantity: 5 }, 7), false);
  assert.equal(lootEligible({ ...base, slot: 'LOOT' }, 7), false);
});
test('ajustes do duelo: cura menor, defesa que conta menos e dano recebido por vocação', () => {
  const base = { damagePercent: 100, healPercent: 100, defensePercent: 100 };
  const heal = (t: object) => resolveDuelRound(1, [hero(1, { agility: 50, hp: 100, action: 'HEAL' }), hero(2, { action: 'DEFEND_SHIELD' })], mid, { ...base, ...t }).record.moves[0].healed;
  assert.equal(heal({ healPercent: 50 }), Math.floor(heal({}) / 2));
  const hit = (t: object, vocation = 'KNIGHT') => resolveDuelRound(1, [hero(1, { agility: 50 }), hero(2, { vocation, action: 'DEFEND_SHIELD' })], mid, { ...base, ...t }).record.moves[0].dealt;
  assert(hit({ defensePercent: 0 }) > hit({}));
  // O ajuste vale para a vocação base: a classe promovida herda.
  assert.equal(hit({ taken: { PALADIN: 50 } }, 'ROYAL_PALADIN'), Math.max(1, Math.floor(hit({}, 'ROYAL_PALADIN') / 2)));
  assert.equal(hit({ taken: { PALADIN: 50 } }, 'KNIGHT'), hit({}, 'KNIGHT'));
});
