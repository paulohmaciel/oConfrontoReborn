import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { prisma } from '../core/db';
import { GameError } from '../core/engine';

export const analyticsRoutes = Router();
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
type Incoming = { name?: unknown; page?: unknown; contentType?: unknown; contentId?: unknown; test?: unknown };

// Dados mínimos e previsíveis: nomes técnicos, rota e identificação curta do conteúdo. Nunca texto digitado pelo jogador.
function parse(row: Incoming) {
  const name = clean(row.name, 64), page = clean(row.page, 120), contentType = clean(row.contentType, 64), contentId = clean(row.contentId, 120);
  if (!/^[a-z][a-z0-9_]{2,63}$/.test(name)) throw new GameError(400, 'Nome de evento inválido. Use letras minúsculas, números e _.');
  if (page && !page.startsWith('/')) throw new GameError(400, 'Página do evento inválida.');
  if (contentType && !/^[a-z][a-z0-9_:-]{1,63}$/.test(contentType)) throw new GameError(400, 'Tipo de conteúdo inválido.');
  return { name, page: page || null, contentType: contentType || null, contentId: contentId || null, isTest: row.test === true };
}

analyticsRoutes.post('/analytics/events', asyncRoute(async (req, res) => {
  const raw: Incoming[] = Array.isArray(req.body?.events) ? req.body.events : [req.body];
  if (!raw.length || raw.length > 100) throw new GameError(400, 'Envie de 1 a 100 eventos por vez.');
  const data = raw.map(parse).map(event => ({ ...event, accountId: res.locals.accountId as number }));
  await prisma.analyticsEvent.createMany({ data });
  res.status(201).json({ recorded: data.length });
}));
