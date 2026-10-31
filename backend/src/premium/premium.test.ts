import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { layoutPeriods } from '../../../shared/premium';
import { verifySignature } from './mercadopago';

const DAY = 86_400_000, t0 = new Date('2026-11-01T12:00:00Z');
const at = (days: number) => new Date(t0.getTime() + days * DAY);
test('renovação começa quando o acesso atual termina', () => {
  const slots = layoutPeriods([{ id: 1, createdAt: t0, days: 30, revokedAt: null }, { id: 2, createdAt: at(10), days: 30, revokedAt: null }]);
  assert.equal(slots[0].endsAt.getTime(), at(30).getTime());
  assert.equal(slots[1].startsAt.getTime(), at(30).getTime());
  assert.equal(slots[1].endsAt.getTime(), at(60).getTime());
});
test('compra após o vencimento começa na data da compra (sem lacuna retroativa)', () => {
  const slots = layoutPeriods([{ id: 1, createdAt: t0, days: 30, revokedAt: null }, { id: 2, createdAt: at(45), days: 30, revokedAt: null }]);
  assert.equal(slots[1].startsAt.getTime(), at(45).getTime());
  assert.equal(slots[1].endsAt.getTime(), at(75).getTime());
});
test('reembolso do primeiro período antecipa o seguinte, mas nunca para antes da sua compra', () => {
  const slots = layoutPeriods([{ id: 1, createdAt: t0, days: 30, revokedAt: at(1) }, { id: 2, createdAt: at(10), days: 30, revokedAt: null }]);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].id, 2);
  assert.equal(slots[0].startsAt.getTime(), at(10).getTime());
});
test('ordem de entrada não altera o resultado e concessões promocionais empilham', () => {
  const a = layoutPeriods([{ id: 2, createdAt: at(5), days: 7, revokedAt: null }, { id: 1, createdAt: t0, days: 30, revokedAt: null }]);
  assert.deepEqual(a.map(s => s.id), [1, 2]);
  assert.equal(a[1].endsAt.getTime(), at(37).getTime());
});

const secret = 'segredo-de-teste';
function sign(dataId: string, requestId: string, ts: string, key = secret) {
  return `ts=${ts},v1=${createHmac('sha256', key).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex')}`;
}
test('assinatura do Mercado Pago: aceita a válida e converte data.id para minúsculas', () => {
  assert.equal(verifySignature({ xSignature: sign('ABC123', 'req-1', '1700000000'), xRequestId: 'req-1', dataId: 'ABC123', secret }), true);
  assert.equal(verifySignature({ xSignature: sign('987654321', 'req-1', '1700000000'), xRequestId: 'req-1', dataId: '987654321', secret }), true);
});
test('assinatura do Mercado Pago: rejeita segredo, id, request-id, ts ou formato incorretos', () => {
  const good = sign('555', 'req-1', '1700000000');
  assert.equal(verifySignature({ xSignature: sign('555', 'req-1', '1700000000', 'outro'), xRequestId: 'req-1', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: good, xRequestId: 'req-1', dataId: '556', secret }), false);
  assert.equal(verifySignature({ xSignature: good, xRequestId: 'req-2', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: good.replace('1700000000', '1700000001'), xRequestId: 'req-1', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: undefined, xRequestId: 'req-1', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: 'lixo', xRequestId: 'req-1', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: 'ts=1,v1=zz', xRequestId: 'req-1', dataId: '555', secret }), false);
  assert.equal(verifySignature({ xSignature: '', xRequestId: '', dataId: '', secret }), false);
});
