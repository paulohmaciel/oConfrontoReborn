import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveAction, resolveGroupRound, type GroupBoss, type GroupFighter } from './groupEngine';
import { groupIntent, MAX_ROUNDS } from '../../../shared/groupHunt';

const mid = (min: number, max: number) => Math.floor((min + max) / 2);
const fighter = (id: number, vocation: string, action: GroupFighter['action'], extra: Partial<GroupFighter> = {}): GroupFighter =>
  ({ characterId: id, name: `H${id}`, vocation, hp: 1000, maxHp: 1000, mana: 200, maxMana: 200, attack: 300, defense: 100, criticalChance: 0, dodgeChance: 0, action, ...extra });
const boss = (extra: Partial<GroupBoss> = {}): GroupBoss => ({ hp: 10000, maxHp: 10000, attack: 400, defense: 200, chains: 3, freed: false, ...extra });

test('ação de outra vocação, sem mana ou não escolhida vira Defender', () => {
  assert.equal(effectiveAction({ vocation: 'DRUID', mana: 200, action: 'HOLD' }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'PALADIN', mana: 5, action: 'AIM' }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'KNIGHT', mana: 0, action: null }), 'DEFEND');
  assert.equal(effectiveAction({ vocation: 'ELITE_KNIGHT', mana: 50, action: 'HOLD' }), 'HOLD');
});

test('quem segura recebe o ataque; a mira dobra com o Cavaleiro segurando e parte uma corrente', () => {
  const round = [1, 2, 3].find(r => groupIntent(r).kind === 'ATTACK')!;
  const alone = resolveGroupRound(round, boss(), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'DRUID', 'ATTACK')], mid);
  const held = resolveGroupRound(round, boss(), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'KNIGHT', 'HOLD')], mid);
  const aimAlone = 10000 - alone.boss.hp - (300 - 100), aimHeld = 10000 - held.boss.hp - Math.floor(300 * .8 - 100);
  assert(aimHeld > aimAlone * 1.4, `mira com Cavaleiro (${aimHeld}) deve ser bem maior que sozinha (${aimAlone})`);
  assert.equal(held.boss.chains, 2);
  assert.equal(held.fighters.find(f => f.characterId === 1)!.hp, 1000, 'o Paladino não apanha quando o Cavaleiro segura');
  assert(held.fighters.find(f => f.characterId === 2)!.hp < 1000);
  assert.equal(held.fighters[0].mana, 200 - 15);
});

test('o Feiticeiro interrompe o pisoteio; sem ele, todos apanham', () => {
  const stomp = [1, 2, 3].find(r => groupIntent(r).kind === 'STOMP')!;
  const broken = resolveGroupRound(stomp, boss(), [fighter(1, 'SORCERER', 'BREAK_SEAL'), fighter(2, 'KNIGHT', 'ATTACK')], mid);
  assert(broken.fighters.every(f => f.hp === 1000));
  const hit = resolveGroupRound(stomp, boss(), [fighter(1, 'KNIGHT', 'DEFEND'), fighter(2, 'PALADIN', 'ATTACK')], mid);
  const [defended, open] = hit.fighters;
  assert(defended.hp < 1000 && open.hp < defended.hp, 'quem defende perde menos');
});

test('cura do Druida, libertar a fera, derrota e fuga após o limite de rodadas', () => {
  const healed = resolveGroupRound(2, boss(), [fighter(1, 'DRUID', 'HEAL_ALL'), fighter(2, 'KNIGHT', 'DEFEND', { hp: 300 })], mid);
  assert(healed.fighters[1].hp > 300);
  const freed = resolveGroupRound(1, boss({ hp: 50, chains: 1 }), [fighter(1, 'PALADIN', 'AIM'), fighter(2, 'KNIGHT', 'HOLD')], mid);
  assert.equal(freed.outcome, 'VICTORY'); assert.equal(freed.boss.freed, true);
  const lost = resolveGroupRound(1, boss({ attack: 99999 }), [fighter(1, 'PALADIN', 'ATTACK', { hp: 1 }), fighter(2, 'DRUID', 'ATTACK', { hp: 0 })], mid);
  assert.equal(lost.outcome, 'DEFEAT');
  const escaped = resolveGroupRound(MAX_ROUNDS, boss(), [fighter(1, 'KNIGHT', 'DEFEND'), fighter(2, 'KNIGHT', 'DEFEND')], mid);
  assert.equal(escaped.outcome, 'ESCAPED');
});

test('sem Paladino o laço arrebenta sozinho na 6ª rodada', () => {
  const r = resolveGroupRound(6, boss(), [fighter(1, 'KNIGHT', 'ATTACK'), fighter(2, 'DRUID', 'ATTACK')], mid);
  assert.equal(r.boss.chains, 0); assert.equal(r.boss.freed, false);
});
