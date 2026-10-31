import { createHmac, timingSafeEqual } from 'node:crypto';
import { GameError } from '../core/engine';
const API = 'https://api.mercadopago.com';
export const mpConfigured = () => !!(process.env.MP_ACCESS_TOKEN && process.env.MP_WEBHOOK_SECRET);

// Manifesto documentado pelo Mercado Pago: id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;
// `maxAgeSeconds` (opcional) recusa notificações cujo `ts` esteja longe demais de `now` (replay). O Mercado Pago manda o ts
// em milissegundos na prática e em segundos em parte da documentação: valores acima de 10^12 são tratados como ms.
export function verifySignature(input: { xSignature: string | undefined; xRequestId: string | undefined; dataId: string | undefined; secret: string; maxAgeSeconds?: number; now?: number }): boolean {
  if (!input.xSignature) return false;
  const fields: Record<string, string> = {};
  for (const part of input.xSignature.split(',')) { const i = part.indexOf('='); if (i > 0) fields[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  const { ts, v1 } = fields;
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  if (input.maxAgeSeconds !== undefined) {
    if (!/^[0-9]{1,16}$/.test(ts)) return false;
    const tsMs = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000;
    if (Math.abs((input.now ?? Date.now()) - tsMs) > input.maxAgeSeconds * 1000) return false;
  }
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId.toLowerCase()}`);
  if (input.xRequestId) parts.push(`request-id:${input.xRequestId}`);
  parts.push(`ts:${ts}`);
  const expected = createHmac('sha256', input.secret).update(parts.join(';') + ';').digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new GameError(503, 'Pagamentos ainda não foram configurados.');
  const { idempotencyKey, ...rest } = init;
  const response = await fetch(API + path, { ...rest, signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) } });
  if (!response.ok) throw new Error(`Mercado Pago respondeu ${response.status}.`);
  return await response.json() as T;
}
export interface MpPayment { id: number | string; status: string; status_detail?: string; external_reference?: string | null; transaction_amount?: number; currency_id?: string }
export const fetchPayment = (id: string) => call<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
export async function createPreference(order: { id: number; amountCents: number; days: number }, baseUrl: string) {
  const https = baseUrl.startsWith('https://');
  return call<{ id: string; init_point: string }>('/checkout/preferences', { method: 'POST', idempotencyKey: `premium-order-${order.id}`, body: JSON.stringify({
    items: [{ id: `premium-${order.days}d`, title: `O Confronto Premium — ${order.days} dias`, quantity: 1, currency_id: 'BRL', unit_price: order.amountCents / 100 }],
    external_reference: String(order.id),
    notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    back_urls: { success: `${baseUrl}/?premium=ok`, pending: `${baseUrl}/?premium=pendente`, failure: `${baseUrl}/?premium=falhou` },
    ...(https ? { auto_return: 'approved' } : {}),
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }], installments: 1 },
    statement_descriptor: 'OCONFRONTO',
  }) });
}
