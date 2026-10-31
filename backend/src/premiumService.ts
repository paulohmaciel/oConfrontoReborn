import { Prisma } from '@prisma/client';
import { prisma, transaction, lockAccount } from './db';
import { GameError } from './engine';
import { loadSettings } from './settings';
import { fetchPayment, createPreference, mpConfigured } from './mercadopago';
import { grantPeriod, revokePeriod, premiumStatus } from './premium';
import { publicUrl } from './mailer';

const PENDING_REUSE_MS = 30 * 60_000;

export async function premiumOverview(accountId: number) {
  const [settings, status, account, orders] = await Promise.all([
    loadSettings(prisma), premiumStatus(prisma, accountId),
    prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { emailVerifiedAt: true } }),
    prisma.premiumOrder.findMany({ where: { accountId }, orderBy: { id: 'desc' }, take: 10,
      select: { id: true, status: true, amountCents: true, days: true, createdAt: true, paidAt: true } }),
  ]);
  return { enabled: mpConfigured() && settings['premium.priceCents'] > 0, priceCents: settings['premium.priceCents'], days: settings['premium.days'],
    active: status.active, until: status.until, emailVerified: !!account.emailVerifiedAt, orders };
}

export async function startCheckout(accountId: number) {
  const settings = await loadSettings(prisma);
  const amountCents = settings['premium.priceCents'], days = settings['premium.days'];
  if (!mpConfigured() || amountCents <= 0) throw new GameError(503, 'O Premium ainda não está disponível para compra.');
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { emailVerifiedAt: true } });
  if (!account.emailVerifiedAt) throw new GameError(409, 'Confirme seu e-mail antes de comprar o Premium.');
  const recent = await prisma.premiumOrder.findFirst({ where: { accountId, status: 'PENDING', amountCents, days, checkoutUrl: { not: null }, createdAt: { gt: new Date(Date.now() - PENDING_REUSE_MS) } }, orderBy: { id: 'desc' } });
  if (recent?.checkoutUrl) return { url: recent.checkoutUrl, orderId: recent.id };
  const order = await prisma.premiumOrder.create({ data: { accountId, amountCents, days } });
  try {
    const preference = await createPreference(order, publicUrl());
    await prisma.premiumOrder.update({ where: { id: order.id }, data: { providerPreferenceId: preference.id, checkoutUrl: preference.init_point } });
    return { url: preference.init_point, orderId: order.id };
  } catch (error) {
    console.error('[premium] falha ao criar checkout:', error instanceof Error ? error.message : error);
    await prisma.premiumOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    throw new GameError(502, 'Não foi possível abrir o pagamento agora. Tente novamente em instantes.');
  }
}

export type WebhookOutcome = 'granted' | 'refunded' | 'failed' | 'noop' | 'duplicate' | 'ignored' | 'amount_mismatch';
// Reembolso/estorno local: usado pelo webhook e pelo painel. Revoga o período e reposiciona os seguintes.
export async function applyRefund(tx: Prisma.TransactionClient, orderId: number, actorId: number | null, reason: string) {
  const order = await tx.premiumOrder.findUniqueOrThrow({ where: { id: orderId }, include: { period: true } });
  if (order.status === 'REFUNDED') return false;
  await lockAccount(tx, order.accountId);
  await tx.premiumOrder.update({ where: { id: orderId }, data: { status: 'REFUNDED', refundedAt: new Date() } });
  if (order.period) await revokePeriod(tx, order.period.id, actorId, reason);
  return true;
}

// Chamado depois que a assinatura do webhook foi validada. Nunca confia no corpo: consulta o pagamento na API.
export async function processMercadoPagoPayment(paymentId: string): Promise<WebhookOutcome> {
  const payment = await fetchPayment(paymentId);
  const orderId = Number(payment.external_reference);
  if (!Number.isSafeInteger(orderId) || orderId < 1) return 'ignored';
  const eventKey = `mercadopago:${payment.id}:${payment.status}`;
  return transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM \`PremiumOrder\` WHERE id = ${orderId} FOR UPDATE`;
    if (rows.length !== 1) return 'ignored' as const;
    if (await tx.paymentEvent.findUnique({ where: { eventKey } })) return 'duplicate' as const;
    await tx.paymentEvent.create({ data: { provider: 'MERCADOPAGO', eventKey, payload: JSON.parse(JSON.stringify(payment)) as Prisma.InputJsonValue } });
    const order = await tx.premiumOrder.findUniqueOrThrow({ where: { id: orderId } });
    switch (payment.status) {
      case 'approved': {
        if (order.status === 'PAID' || order.status === 'REFUNDED') return 'noop' as const;
        const cents = Math.round((payment.transaction_amount ?? 0) * 100);
        if (cents !== order.amountCents || (payment.currency_id ?? 'BRL') !== order.currency) {
          console.error(`[premium] valor divergente no pedido ${order.id}: recebido ${cents} ${payment.currency_id}, esperado ${order.amountCents} ${order.currency}`);
          return 'amount_mismatch' as const;
        }
        await tx.premiumOrder.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: new Date(), providerPaymentId: String(payment.id) } });
        await grantPeriod(tx, { accountId: order.accountId, days: order.days, source: 'PURCHASE', orderId: order.id });
        return 'granted' as const;
      }
      case 'refunded': case 'charged_back':
        return (await applyRefund(tx, order.id, null, payment.status === 'refunded' ? 'Reembolso no Mercado Pago' : 'Estorno (chargeback)')) ? 'refunded' as const : 'noop' as const;
      case 'rejected': case 'cancelled':
        if (order.status !== 'PENDING') return 'noop' as const;
        await tx.premiumOrder.update({ where: { id: order.id }, data: { status: 'FAILED' } });
        return 'failed' as const;
      default: return 'noop' as const; // pending, in_process, authorized...
    }
  });
}
