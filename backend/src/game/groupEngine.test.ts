import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveAction, resolveGroupRound, type GroupBoss, type GroupFighter } from './groupEngine';
import { CHOICE_AT, groupIntent, huntByKey, MAX_ROUNDS } from '../../../shared/groupHunt';

const mid = (min: number, max: number) => Math.floor((min + max) / 2);
const serra = huntByKey('serra')!, floresta = huntByKey('floresta')!, lago = huntByKey('lago')!, dragao = huntByKey('dragao')!;
const fighter = (id: number, vocation: string, action: GroupFighter['action'], extra: Partial<GroupFighter> = {}): GroupFighter =>
  ({ characterId: id, name: `H${id}`, vocation, hp: 1000, maxHp: 1000, mana: 200, maxMana: 200, attack: 300, defense: 100, criticalChance: 0, dodgeChance: 0, action, ...extra });
const boss = (extra: Partial<GroupBoss> = {}): GroupBoss => ({ hp: 10000, maxHp: 10000, attack: 400, defense: 200, mechanic: 'chains', counters: 3, maxCounters: 3, freed: false, phase: 'FIGHT', choice: null, ...extra });
const attackRound = [1, 2, 3].find(r => groupIntent(r).kind === 'ATTACK')!, stompRound = [1, 2, 3].find(r => groupIntent(r).kind === 'STOMP')!;

test('ação de outra vocação, sem mana ou não escolhida vira Defender; voto só na escolha final', () => {
  assert.equal(effectiveAction({ vocation: 'DRUID', mana: 200, action: 'HOLD' }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'PALADIN', mana: 5, action: 'AIM' }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'KNIGHT', mana: 0, action: null }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'ELITE_KNIGHT', mana: 50, action: 'HOLD' }), 'HOLD');
  assert.equal(effectiveAction({ vocation: 'KNIGHT', mana: 50, action: 'SLAY' }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'KNIGHT', mana: 0, action: 'SLAY' }, 'CHOICE'), 'SLAY');
  assert.equal(effectiveAction({ vocation: 'KNIGHT', mana: 50, action: 'ATTACK' }, 'CHOICE'), null);
});

test('Serra: quem segura recebe o ataque; a mira dobra com o Cavaleiro segurando e parte uma corrente', () => {
  const alone = resolveGroupRound(attackRound, boss(), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'DRUID', 'ATTACK')], mid, serra);
  const held = resolveGroupRound(attackRound, boss(), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'KNIGHT', 'HOLD')], mid, serra);
  const aimAlone = 10000 - alone.boss.hp - (300 - 100), aimHeld = 10000 - held.boss.hp - Math.floor(300 * .8 - 100);
  assert(aimHeld > aimAlone * 1.4, `mira com Cavaleiro (${aimHeld}) deve ser bem maior que sozinha (${aimAlone})`);
  assert.equal(held.boss.counters, 2);
  assert.equal(held.fighters.find(f => f.characterId === 1)!.hp, 1000, 'o Paladino não apanha quando o Cavaleiro segura');
  assert(held.fighters.find(f => f.characterId === 2)!.hp < 1000);
  assert.equal(held.fighters[0].mana, 200 - 15);
  const freed = resolveGroupRound(1, boss({ hp: 50, counters: 1 }), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'KNIGHT', 'HOLD')], mid, serra);
  assert.equal(freed.outcome, 'VICTORY'); assert.equal(freed.boss.freed, true);
  const alone6 = resolveGroupRound(6, boss(), [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'DRUID', 'ATTACK')], mid, serra);
  assert.equal(alone6.boss.counters, 0); assert.equal(alone6.boss.freed, false);
});

test('o Feiticeiro interrompe o golpe pesado; sem ele, todos apanham', () => {
  const broken = resolveGroupRound(stompRound, boss(), [fighter(1, 'SORCERER', 'BREAK_SEAL'), fighter(2, 'KNIGHT', 'ATTACK')], mid, serra);
  assert(broken.fighters.every(f => f.hp === 1000));
  const hit = resolveGroupRound(stompRound, boss(), [fighter(1, 'KNIGHT', 'DEFEND'), fighter(2, 'PALADIN', 'ATTACK')], mid, serra);
  const [defended, open] = hit.fighters;
  assert(defended.hp < 1000 && open.hp < defended.hp, 'quem defende perde menos');
});

test('Floresta: o encantamento corta o dano à metade e só a magia o desfaz (com bônus)', () => {
  const enchanted = boss({ mechanic: 'enchant', counters: 3 });
  const half = resolveGroupRound(2, enchanted, [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'PALADIN', 'AIM')], mid, floresta);
  const full = resolveGroupRound(2, { ...enchanted, counters: 0 }, [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'PALADIN', 'AIM')], mid, floresta);
  assert(10000 - half.boss.hp < (10000 - full.boss.hp) * .6);
  assert.equal(half.boss.counters, 3, 'a mira não desfaz o encantamento');
  const undone = resolveGroupRound(2, { ...enchanted, counters: 1 }, [fighter(1, 'SORCERER', 'BREAK_SEAL'), fighter(2, 'KNIGHT', 'ATTACK')], mid, floresta);
  assert.equal(undone.boss.counters, 0); assert.equal(undone.boss.freed, true);
});

test('Lago: ilusões desviam golpes comuns, a mira acha o verdadeiro, a luz tira ilusão e o Druida corta o veneno', () => {
  const misty = boss({ mechanic: 'mist', counters: 2, maxCounters: 2 });
  const always = (_min: number, max: number) => max; // dado no máximo: golpe comum sempre cai numa ilusão
  const r = resolveGroupRound(2, misty, [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'PALADIN', 'AIM')], always, lago);
  assert(r.log.some(l => l.includes('reflexo')));
  assert(r.log.some(l => l.includes('H2 acerta o ponto fraco')));
  assert(r.fighters.every(f => f.hp < 1000), 'o veneno queima quem não foi curado');
  const lit = resolveGroupRound(2, misty, [fighter(1, 'SORCERER', 'BREAK_SEAL'), fighter(2, 'DRUID', 'HEAL_ALL', { hp: 900 })], mid, lago);
  assert.equal(lit.boss.counters, 1);
  assert(lit.log.some(l => l.includes('segura o veneno')));
});

test('Dragão: selos deixam o dragão furioso; com pouca vida o grupo vota (empate = dormir)', () => {
  const sealed = boss({ mechanic: 'dragon', counters: 4, maxCounters: 4 });
  const raged = resolveGroupRound(attackRound, sealed, [fighter(1, 'KNIGHT', 'HOLD'), fighter(2, 'DRUID', 'DEFEND')], mid, dragao);
  const calm = resolveGroupRound(attackRound, { ...sealed, counters: 0 }, [fighter(1, 'KNIGHT', 'HOLD'), fighter(2, 'DRUID', 'DEFEND')], mid, dragao);
  assert(raged.fighters[0].hp < calm.fighters[0].hp);
  const broken = resolveGroupRound(2, sealed, [fighter(1, 'SORCERER', 'BREAK_SEAL'), fighter(2, 'PALADIN', 'AIM')], mid, dragao);
  assert.equal(broken.boss.counters, 2, 'Feiticeiro e Paladino quebram um selo cada');
  const kneel = resolveGroupRound(2, { ...sealed, hp: Math.floor(10000 * CHOICE_AT) + 10 }, [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'PALADIN', 'AIM')], mid, dragao);
  assert.equal(kneel.outcome, 'ONGOING'); assert.equal(kneel.boss.phase, 'CHOICE'); assert(kneel.boss.hp > 0);
  const tie = resolveGroupRound(3, kneel.boss, [fighter(1, 'KNIGHT', 'SLAY'), fighter(2, 'PALADIN', 'SLEEP')], mid, dragao);
  assert.equal(tie.outcome, 'VICTORY'); assert.equal(tie.boss.choice, 'SLEEP');
  const slay = resolveGroupRound(3, kneel.boss, [fighter(1, 'KNIGHT', 'SLAY'), fighter(2, 'PALADIN', 'SLAY'), fighter(3, 'DRUID', 'SLEEP')], mid, dragao);
  assert.equal(slay.boss.choice, 'SLAY'); assert.equal(slay.boss.hp, 0);
});

test('derrota quando todos caem e fuga depois do limite de rodadas', () => {
  const lost = resolveGroupRound(1, boss({ attack: 99999 }), [fighter(1, 'PALADIN', 'ATTACK', { hp: 1 }), fighter(2, 'DRUID', 'ATTACK', { hp: 0 })], mid, serra);
  assert.equal(lost.outcome, 'DEFEAT');
  const escaped = resolveGroupRound(MAX_ROUNDS, boss(), [fighter(1, 'KNIGHT', 'DEFEND'), fighter(2, 'KNIGHT', 'DEFEND')], mid, serra);
  assert.equal(escaped.outcome, 'ESCAPED');
});
