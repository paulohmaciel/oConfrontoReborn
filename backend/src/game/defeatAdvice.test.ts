import test from 'node:test';
import assert from 'node:assert/strict';
import { defeatAdvice, type DefeatFacts } from './defeatAdvice';

const base: DefeatFacts = { heroLevel: 5, monsterLevel: 5, monsterHp: 40, monsterMaxHp: 100, statPoints: 0, isBoss: false, lastIntent: 'ATTACK',
  lastAction: 'ATTACK', monsterElement: 'PHYSICAL', fireResistance: 0, healthPotions: 0, mana: 0, healCost: 10 };

test('derrota: golpe pesado sem defesa é apontado como motivo', () => {
  const a = defeatAdvice({ ...base, isBoss: true, lastIntent: 'HEAVY' });
  assert.match(a.reasons.join(' '), /golpe pesado/);
  assert.match(a.tips.join(' '), /Defender ou Interromper/);
  assert.equal(defeatAdvice({ ...base, isBoss: true, lastIntent: 'HEAVY', lastAction: 'DEFEND_SHIELD' }).reasons.some(r => /golpe pesado/.test(r)), false);
});

test('derrota: diferença de nível, fogo, pontos livres, poções e mana viram dicas', () => {
  const a = defeatAdvice({ ...base, monsterLevel: 9, monsterElement: 'FIRE', statPoints: 3, healthPotions: 2, mana: 30 });
  assert.match(a.reasons.join(' '), /nível 9/);
  assert.match(a.reasons.join(' '), /fogo/);
  assert.equal(a.tips.length, 4); // no máximo 3 dicas + Templo
  assert.match(a.tips.at(-1)!, /Templo/);
});

test('derrota: sempre há motivo e o percentual de vida do monstro fica entre 0 e 100', () => {
  const a = defeatAdvice(base);
  assert.equal(a.monsterHpPercent, 40);
  assert.ok(a.reasons.length >= 1);
  assert.match(defeatAdvice({ ...base, monsterHp: 10 }).reasons.join(' '), /por pouco/);
  assert.equal(defeatAdvice({ ...base, monsterHp: 500 }).monsterHpPercent, 100);
});
