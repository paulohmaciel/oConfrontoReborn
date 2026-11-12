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

// ----- Efeitos de status (shared/statusEffects.ts) -----
const max = (_a: number, b: number) => b;
test('sem efeito e sem criatura que cause efeito, o turno é o mesmo de antes', () => {
  const plain = resolveTurn(player, monster, 'ATTACK', min);
  assert.deepEqual(plain.effects, []); assert.equal(plain.effectDamage, 0); assert.equal(plain.inflicted, null);
});
test('criatura venenosa aplica o veneno quando acerta; o veneno só começa a doer no turno seguinte', () => {
  // min: a rolagem 1..100 dá 1, então o efeito entra. Vida máxima 100: veneno tira 3 por turno, por 3 turnos.
  const first = resolveTurn(player, { ...monster, status: 'POISON' }, 'ATTACK', min);
  assert.equal(first.inflicted, 'POISON'); assert.deepEqual(first.effects, [{ kind: 'POISON', turns: 3 }]); assert.equal(first.effectDamage, 0);
  const second = resolveTurn({ ...player, hp: first.hp, effects: first.effects }, monster, 'ATTACK', min);
  assert.equal(second.effectDamage, 3); assert.deepEqual(second.effects, [{ kind: 'POISON', turns: 2 }]);
  assert.equal(second.hp, first.hp - second.received - 3);
  // max: a rolagem dá 100 e o efeito não entra.
  assert.equal(resolveTurn(player, { ...monster, status: 'POISON' }, 'ATTACK', max).inflicted, null);
});
test('erguer a guarda impede o efeito; o efeito pode derrubar o herói', () => {
  assert.equal(resolveTurn(player, { ...monster, status: 'BURN' }, 'DEFEND_SHIELD', min).inflicted, null);
  const dying = resolveTurn({ ...player, hp: 2, defense: 1000, effects: [{ kind: 'POISON', turns: 2 }] }, monster, 'ATTACK', min);
  assert.equal(dying.hp, 0); assert.equal(dying.status, 'DEFEAT');
});
test('queimadura respeita a resistência a fogo; a cura do Druida limpa os efeitos, a dos outros não', () => {
  const burn = [{ kind: 'BURN' as const, turns: 2 }];
  assert.equal(resolveTurn({ ...player, effects: burn }, monster, 'ATTACK', min).effectDamage, 4);
  assert.equal(resolveTurn({ ...player, effects: burn, fireResistance: 50 }, monster, 'ATTACK', min).effectDamage, 2);
  assert.deepEqual(resolveTurn({ ...player, vocation: 'ELDER_DRUID', effects: burn }, monster, 'HEAL', min).effects, []);
  assert.deepEqual(resolveTurn({ ...player, vocation: 'KNIGHT', effects: burn }, monster, 'HEAL', min).effects, [{ kind: 'BURN', turns: 1 }]);
});
test('lento: golpe 15% mais fraco e sem esquiva; o efeito acaba sozinho', () => {
  const slow = [{ kind: 'SLOW' as const, turns: 1 }];
  const normal = resolveTurn(player, monster, 'ATTACK', min), slowed = resolveTurn({ ...player, effects: slow }, monster, 'ATTACK', min);
  assert.equal(slowed.dealt, Math.floor(normal.dealt * 85 / 100)); assert.deepEqual(slowed.effects, []);
  // Com esquiva garantida (dado mínimo), só quem não está lento escapa.
  assert.equal(resolveTurn({ ...player, dodgeChance: 100 }, monster, 'ATTACK', min).dodged, true);
  assert.equal(resolveTurn({ ...player, dodgeChance: 100, effects: slow }, monster, 'ATTACK', min).dodged, false);
});
test('vitória e fuga encerram os efeitos', () => {
  const effects = [{ kind: 'POISON' as const, turns: 3 }];
  assert.deepEqual(resolveTurn({ ...player, effects }, { ...monster, hp: 1 }, 'ATTACK', min).effects, []);
  assert.deepEqual(resolveTurn({ ...player, effects }, monster, 'FLEE', min).effects, []);
});

// ----- Chefes com duas fases -----
test('chefe abaixo de metade da vida entra em fúria: avisa na virada e bate 10% mais forte; criatura comum não tem fase', () => {
  const boss = { ...monster, isBoss: true, turn: 0, hp: 65, maxHp: 100, attack: 100 }, strong = { ...player, hp: 1000, maxHp: 1000, defense: 0, attack: 15 };
  // min: golpe do herói de 15, com crítico (65 → 50, exatamente metade): a fúria começa neste turno.
  const turning = resolveTurn(strong, boss, 'ATTACK', min);
  assert.equal(turning.monsterHp, 50); assert.equal(turning.phase, 2); assert.match(turning.log.join(' '), /entra em fúria/);
  const calm = resolveTurn(strong, { ...boss, hp: 100 }, 'ATTACK', min);
  assert.equal(calm.phase, 1); assert.equal(turning.received, Math.floor(calm.received * 1.1 + 1e-9));
  // Já em fúria: não repete o aviso.
  assert.doesNotMatch(resolveTurn(strong, { ...boss, hp: 40 }, 'ATTACK', min).log.join(' '), /entra em fúria/);
  // Sem ser chefe, ou sem a vida cheia informada, não há fase 2.
  assert.equal(resolveTurn(strong, { ...boss, isBoss: false }, 'ATTACK', min).phase, 1);
  assert.equal(resolveTurn(strong, { ...monster, isBoss: true, turn: 0, hp: 20, attack: 100 }, 'ATTACK', min).phase, 1);
});
