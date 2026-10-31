import test from 'node:test';
import assert from 'node:assert/strict';
import { percentile, recordError, metrics } from './monitor';

test('percentil de lista vazia e simples', () => {
  assert.equal(percentile([], 95), 0);
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(percentile([10, 20, 30, 40], 95), 40);
});
test('erros recentes ficam limitados a 50 e não vazam para fora do formato esperado', () => {
  for (let i = 0; i < 60; i++) recordError(new Error('falha ' + i), { method: 'GET', path: '/x' }, 'id' + i);
  const m = metrics();
  assert.equal(m.recentErrors.length, 50);
  assert.equal(m.recentErrors[0].message, 'falha 59');
});
