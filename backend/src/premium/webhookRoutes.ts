import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { verifySignature, mpConfigured } from './mercadopago';
import { processMercadoPagoPayment } from './premiumService';

export const webhookRoutes = Router();
// Tolerância entre o `ts` assinado e o relógio do servidor (a documentação deixa o valor a critério do integrador).
const WEBHOOK_MAX_AGE_SECONDS = 300;
// Montada ANTES de protectOrigin/authenticate: quem chama é o Mercado Pago. A autenticidade vem da assinatura HMAC.
webhookRoutes.post('/webhooks/mercadopago', asyncRoute(async (req, res) => {
  if (!mpConfigured()) { res.status(503).json({ error: 'Pagamentos não configurados.' }); return; }
  // Só o `data.id` da query entra na assinatura; o id do corpo não é assinado e por isso é ignorado.
  const dataId = typeof req.query['data.id'] === 'string' ? req.query['data.id'] : undefined;
  if (!verifySignature({ xSignature: req.get('x-signature'), xRequestId: req.get('x-request-id'), dataId, secret: process.env.MP_WEBHOOK_SECRET!, maxAgeSeconds: WEBHOOK_MAX_AGE_SECONDS })) {
    res.status(401).json({ error: 'Assinatura inválida ou antiga.' }); return;
  }
  const topic = String(req.body?.type ?? req.query.type ?? req.query.topic ?? '');
  if (topic !== 'payment' || !dataId || !/^[0-9]{1,20}$/.test(dataId)) { res.json({ ok: true, ignored: true }); return; }
  // Erros transitórios viram 5xx para o Mercado Pago tentar de novo; eventos repetidos retornam 200.
  const outcome = await processMercadoPagoPayment(dataId);
  res.json({ ok: true, outcome });
}));
