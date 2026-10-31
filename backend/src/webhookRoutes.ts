import { Router } from 'express';
import { asyncRoute } from './auth';
import { verifySignature, mpConfigured } from './mercadopago';
import { processMercadoPagoPayment } from './premiumService';

export const webhookRoutes = Router();
// Montada ANTES de protectOrigin/authenticate: quem chama é o Mercado Pago. A autenticidade vem da assinatura HMAC.
webhookRoutes.post('/webhooks/mercadopago', asyncRoute(async (req, res) => {
  if (!mpConfigured()) { res.status(503).json({ error: 'Pagamentos não configurados.' }); return; }
  const queryId = typeof req.query['data.id'] === 'string' ? req.query['data.id'] : undefined;
  const dataId = queryId ?? (typeof req.body?.data?.id === 'string' || typeof req.body?.data?.id === 'number' ? String(req.body.data.id) : undefined);
  if (!verifySignature({ xSignature: req.get('x-signature'), xRequestId: req.get('x-request-id'), dataId: queryId, secret: process.env.MP_WEBHOOK_SECRET! })) {
    res.status(401).json({ error: 'Assinatura inválida.' }); return;
  }
  const topic = String(req.body?.type ?? req.query.type ?? req.query.topic ?? '');
  if (topic !== 'payment' || !dataId || !/^[0-9]{1,20}$/.test(dataId)) { res.json({ ok: true, ignored: true }); return; }
  // Erros transitórios viram 5xx para o Mercado Pago tentar de novo; eventos repetidos retornam 200.
  const outcome = await processMercadoPagoPayment(dataId);
  res.json({ ok: true, outcome });
}));
