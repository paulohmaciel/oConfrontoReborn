// Rotas do app Godot, em /api/app. Ficam antes de `protectOrigin` porque o app não é um navegador:
// não manda Origin nem cookie, e o token Bearer não é enviado sozinho por outro site (sem risco de CSRF).
import { Router, json } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncRoute } from '../core/http';
import { GameError } from '../core/engine';
import { appAuthenticate, appLogin, appLogout, appOptionalAuth, appRegister, displayName } from './appAuth';
import { loadSave, putSave, rankings, saveInfo } from './cloudService';
import { parseRankMetric } from './syncRules';

const limited = (windowMs: number, limit: number, error: string) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error } });

export function appRouter() {
  const r = Router();
  r.use(json({ limit: '512kb' }));
  r.use(limited(60_000, 120, 'Muitas ações em pouco tempo. Aguarde um minuto.'));
  const authLimit = limited(15 * 60_000, 30, 'Muitas tentativas. Aguarde antes de entrar novamente.');

  r.post('/auth/login', authLimit, asyncRoute(async (req, res) => { res.json(await appLogin(req.body)); }));
  r.post('/auth/register', authLimit, asyncRoute(async (req, res) => {
    const result = await appRegister(req.body);
    if (result.status === 201) res.status(201).json(result.session);
    else res.status(202).json({ pending: true, message: result.message });
  }));
  r.post('/auth/logout', appAuthenticate, asyncRoute(async (_req, res) => { await appLogout(res.locals.tokenHash); res.json({ ok: true }); }));

  r.get('/me', appAuthenticate, asyncRoute(async (_req, res) => {
    const accountId = res.locals.accountId as number;
    res.json({ name: await displayName(accountId), save: await saveInfo(accountId) });
  }));
  r.get('/save', appAuthenticate, asyncRoute(async (_req, res) => { res.json({ save: await loadSave(res.locals.accountId) }); }));
  r.put('/save', appAuthenticate, asyncRoute(async (req, res) => {
    const result = await putSave(res.locals.accountId, req.body);
    if (result.conflict) { res.status(409).json({ error: 'A nuvem tem um save mais novo, enviado de outro aparelho.', version: result.version, savedAt: result.savedAt }); return; }
    res.json(result);
  }));

  r.get('/rankings', appOptionalAuth, asyncRoute(async (req, res) => {
    const metric = parseRankMetric(req.query.metric);
    if (!metric) throw new GameError(400, 'Ranking inválido. Use vigil, power ou stage.');
    const period = req.query.period === 'week' ? 'week' : 'all';
    const page = Math.min(100_000, Math.max(1, Math.floor(Number(req.query.page) || 1)));
    res.json(await rankings(metric, period, page, res.locals.accountId));
  }));

  r.use((_req, res) => { res.status(404).json({ error: 'Rota não encontrada.' }); });
  return r;
}
