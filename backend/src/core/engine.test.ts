import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpForLevel, parseAction, resolveTurn } from './engine';
import { parseStat, upgradePrice } from '../game/gameRules';
const player = { hp: 90, maxHp: 100, mana: 50, attack: 30, defense: 10 };
const monster = { hp: 100, attack: 10, defense: 5 };
const min = (a: number, _b: number) => a;
test('defesa sem mana rejeita o turno', () => {
  assert.throws(() => resolveTurn({ ...player, mana: 0 }, monster, 'DEFEND_SHIELD', min), /Mana insuficiente/);
});
test('cura relata apenas HP recuperado e cobra mana', () => {
  const result = resolveTurn(player, monster, 'HEAL', min);
  assert.equal(result.healed, 10); assert.equal(result.mana, 30); assert.equal(result.dealt, 0);
});
test('vitória não permite contra-ataque', () => {
  const result = resolveTurn(player, { ...monster, hp: 1 }, 'ATTACK', min);
  assert.equal(result.status, 'VICTORY'); assert.equal(result.received, 0); assert.equal(result.hp, 90);
});
test('não executa batalha encerrada', () => {
  assert.throws(() => resolveTurn(player, { ...monster, hp: 0 }, 'ATTACK', min), /encerrado/);
  assert.throws(() => resolveTurn({ ...player, hp: 0 }, monster, 'ATTACK', min), /encerrado/);
});
test('ação desconhecida é rejeitada em runtime', () => assert.throws(() => parseAction('GIVE_GOLD')));
test('fuga não muda recursos', () => {
  const result = resolveTurn(player, monster, 'FLEE', min);
  assert.equal(result.status, 'FLED'); assert.equal(result.hp, player.hp); assert.equal(result.mana, player.mana);
});
test('limiares XP usam bigint', () => {
  assert.equal(getExpForLevel(1), 0n); assert.equal(getExpForLevel(2), 100n); assert.equal(getExpForLevel(3), 200n);
});
test('atributos arbitrários não podem modificar ouro, IDs, nível ou pontos', () => {
  for (const field of ['goldInHand', 'accountId', 'level', 'statPoints', '__proto__', null, {}]) {
    assert.throws(() => parseStat(field), /Atributo inválido/);
  }
  assert.equal(parseStat('vitality'), 'vitality');
});
test('ferreiro cobra custo crescente e respeita limite de tier', () => {
  assert.equal(upgradePrice(100, 0), 100n);
  assert.equal(upgradePrice(100, 9), 1000n);
  for (const tier of [-1, 10, 1.5]) assert.throws(() => upgradePrice(100, tier));
  assert.throws(() => upgradePrice(-100, 0));
});
