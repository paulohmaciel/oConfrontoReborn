// Simula chamadas do Mercado Pago ao SEU servidor local para testar a segurança do webhook, sem gastar dinheiro.
// Uso: node scripts/mp-webhook-sim.mjs [http://localhost:3333] [id_de_pagamento_real_do_sandbox]
// Lê MP_WEBHOOK_SECRET do .env. Com um id de pagamento real de teste, também exercita aprovação e duplicidade.
import 'dotenv/config';
import { createHmac, randomUUID } from 'node:crypto';

const base = process.argv[2] ?? 'http://localhost:3333';
const paymentId = process.argv[3] ?? '999999999999';
const secret = process.env.MP_WEBHOOK_SECRET;
if (!secret) { console.error('Defina MP_WEBHOOK_SECRET no .env (o mesmo do painel do Mercado Pago).'); process.exit(1); }

function signed(id, { ts = String(Date.now()), secretUsed = secret, requestId = randomUUID() } = {}) {
  const v1 = createHmac('sha256', secretUsed).update(`id:${String(id).toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
}
async function post(label, id, headers, expect) {
  const res = await fetch(`${base}/api/webhooks/mercadopago?data.id=${id}&type=payment`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ type: 'payment', data: { id: String(id) } }) });
  const body = await res.text();
  const ok = expect(res.status);
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${label} → ${res.status} ${body.slice(0, 120)}`);
  return ok;
}
const results = [];
results.push(await post('sem assinatura é rejeitado', paymentId, {}, s => s === 401));
results.push(await post('assinatura com segredo errado é rejeitada', paymentId, signed(paymentId, { secretUsed: 'outro-segredo' }), s => s === 401));
results.push(await post('assinatura de outro pagamento é rejeitada', paymentId, signed('111'), s => s === 401));
results.push(await post('assinatura válida é aceita pela verificação (200 com id real; 5xx/404 do MP com id falso é esperado)', paymentId, signed(paymentId), s => s !== 401));
const dup = signed(paymentId);
const a = await post('1ª entrega', paymentId, dup, s => s !== 401);
const b = await post('reentrega idêntica não pode dar erro de assinatura nem duplicar Premium (confira o Extrato/Premium)', paymentId, dup, s => s !== 401);
results.push(a, b);
console.log(results.every(Boolean) ? '\nVerificação de assinatura: tudo certo.' : '\nHá falhas acima.');
process.exit(results.every(Boolean) ? 0 : 1);
