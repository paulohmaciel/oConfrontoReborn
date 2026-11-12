import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings } from '../../../shared/economy';
import { capProgress, freshProgress, hoursSince, isoWeek, perHourAtStage, progressOf, withGoldCut, isConfrontationSave, parseRankMetric, type Progress } from './syncRules';

const caps = defaultSettings();
const at = (p: Partial<Progress>): Progress => ({ ...freshProgress(), ...p });

test('dentro do teto, tudo o que o app diz entra', () => {
  const claimed = at({ goldTotal: 20_000n, xpTotal: 10_000n, items: 100, furthest: 3, power: 5_000n });
  const { accepted, adjusted } = capProgress(freshProgress(), claimed, 1, caps);
  assert.deepEqual(adjusted, []);
  assert.deepEqual(accepted, claimed);
});

test('ouro acima do teto por hora é cortado no teto da fase', () => {
  const prev = at({ goldTotal: 1_000n, furthest: 1 });
  const { accepted, adjusted } = capProgress(prev, at({ goldTotal: 10_000_000n, furthest: 1 }), 2, caps);
  assert.deepEqual(adjusted, ['goldTotal']);
  assert.equal(accepted.goldTotal, 1_000n + BigInt(caps['confrontation.goldPerHour'] * 2));
});

test('o teto de ouro e XP cresce com a fase alcançada', () => {
  assert.equal(perHourAtStage(1000, 145, 1), 1000);
  assert.equal(Math.round(perHourAtStage(1000, 145, 3)), Math.round(1000 * 1.45 * 1.45));
  const low = capProgress(at({ furthest: 1 }), at({ xpTotal: 10n ** 12n, furthest: 1 }), 1, caps).accepted.xpTotal;
  const high = capProgress(at({ furthest: 10 }), at({ xpTotal: 10n ** 12n, furthest: 10 }), 1, caps).accepted.xpTotal;
  assert(high > low * 20n);
});

test('fases, itens e vigília têm teto próprio', () => {
  const { accepted, adjusted } = capProgress(at({ furthest: 2 }), at({ furthest: 20, items: 99_999, vigilBest: 5 }), 0.5, caps);
  assert.equal(accepted.furthest, 2 + 3);
  assert.equal(accepted.items, 300);
  assert.equal(accepted.vigilBest, 0, 'sem chegar à última fase, a Vigília não conta');
  assert.deepEqual(adjusted.sort(), ['furthest', 'items', 'vigilBest']);
});

test('a Vigília cresce no teto por hora depois da última fase', () => {
  const prev = at({ furthest: 20, vigilBest: 10 });
  const { accepted } = capProgress(prev, at({ furthest: 20, vigilBest: 500 }), 2, caps);
  assert.equal(accepted.vigilBest, 10 + 60);
});

test('fase nunca passa da última da campanha', () => {
  const { accepted } = capProgress(at({ furthest: 19 }), at({ furthest: 25 }), 10, caps);
  assert.equal(accepted.furthest, 20);
});

test('poder: o maior entre a porcentagem do anterior e o fixo por hora', () => {
  const small = capProgress(at({ power: 100n }), at({ power: 10n ** 9n }), 1, caps).accepted.power;
  assert.equal(small, 100n + 20_000n);
  const big = capProgress(at({ power: 1_000_000n }), at({ power: 10n ** 9n }), 1, caps).accepted.power;
  assert.equal(big, 1_500_000n);
});

test('número que desce entra (jogo novo), sem ajuste', () => {
  const { accepted, adjusted } = capProgress(at({ goldTotal: 5_000n, furthest: 7 }), at({ goldTotal: 0n, furthest: 1 }), 0, caps);
  assert.deepEqual(adjusted, []);
  assert.equal(accepted.goldTotal, 0n);
  assert.equal(accepted.furthest, 1);
});

test('sem tempo passado nada cresce', () => {
  const prev = at({ goldTotal: 5n });
  assert.equal(capProgress(prev, at({ goldTotal: 6n }), 0, caps).accepted.goldTotal, 5n);
  assert.equal(capProgress(prev, at({ goldTotal: 6n }), Number.NaN, caps).accepted.goldTotal, 5n);
});

test('horas pelo relógio do servidor; primeiro envio usa a franquia', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  assert.equal(hoursSince(null, now, caps), caps['confrontation.firstSyncHours']);
  assert.equal(hoursSince(new Date('2026-11-12T09:00:00Z'), now, caps), 3);
  assert.equal(hoursSince(new Date('2026-11-13T09:00:00Z'), now, caps), 0, 'relógio voltando não dá horas negativas');
});

test('lê o progresso do save e ignora lixo', () => {
  const data = { v: 1, members: [], gold: 50.7, furthest: 4, vigil: 3, counters: { gold: 1234.9, xp: 99, items: 7, vigil_best: 2 } };
  assert(isConfrontationSave(data));
  assert.deepEqual(progressOf(data, { power: 777.4 }), { goldTotal: 1234n, xpTotal: 99n, items: 7, furthest: 4, vigilBest: 3, power: 777n });
  assert.deepEqual(progressOf({ v: 1, counters: { gold: -5, xp: 'x', items: Infinity } }, null), freshProgress());
  assert(!isConfrontationSave({ v: 2, members: [], counters: {}, gold: 0 }));
  assert(!isConfrontationSave([]));
});

test('ouro cortado sai do ouro em mãos e do total, sem ficar negativo', () => {
  const data = { v: 1, gold: 9_000, counters: { gold: 10_000, kills: 3 } };
  const claimed = at({ goldTotal: 10_000n }), accepted = at({ goldTotal: 4_000n });
  assert.deepEqual(withGoldCut(data, claimed, accepted), { v: 1, gold: 3_000, counters: { gold: 4_000, kills: 3 } });
  assert.equal(withGoldCut({ ...data, gold: 100 }, claimed, accepted)!.gold, 0);
  assert.equal(withGoldCut(data, claimed, claimed), null);
});

test('semana ISO em UTC', () => {
  assert.equal(isoWeek(new Date('2026-11-12T12:00:00Z')), '2026-W46');
  assert.equal(isoWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01');
  assert.equal(isoWeek(new Date('2027-01-01T00:00:00Z')), '2026-W53');
});

test('métrica de ranking', () => {
  assert.equal(parseRankMetric('vigil'), 'VIGIL');
  assert.equal(parseRankMetric('POWER'), 'POWER');
  assert.equal(parseRankMetric('constructor'), null);
});
