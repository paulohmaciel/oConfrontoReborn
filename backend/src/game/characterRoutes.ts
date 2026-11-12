import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { prisma } from '../core/db';
import { integer } from '../core/engine';
import { createExtraCharacter, characterLimit, promoteCharacter } from './characterService';

export const characterRoutes = Router();
// ----- Personagens e classes -----
characterRoutes.get('/characters', asyncRoute(async (_req, res) => {
  const accountId = res.locals.accountId;
  const [characters, { limit, premium }] = await Promise.all([
    prisma.character.findMany({ where: { accountId }, select: { id: true, name: true, level: true, vocation: true, classTier: true }, orderBy: { id: 'asc' } }), characterLimit(prisma, accountId)]);
  res.json({ characters, limit, premium });
}));
characterRoutes.post('/characters', asyncRoute(async (req, res) => { res.status(201).json(await createExtraCharacter(res.locals.accountId, req.body?.name, req.body?.vocation)); }));
characterRoutes.post('/characters/:id/promote', asyncRoute(async (req, res) => { res.json(await promoteCharacter(res.locals.accountId, integer(Number(req.params.id)))); }));
// Privacidade: qualquer jogador pode ocultar seu nome nos registros públicos de itens raros (vale também para os já existentes).
characterRoutes.post('/characters/:id/privacy', asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id));
  if (typeof req.body?.fameHidden !== 'boolean') return res.status(400).json({ error: 'Valor inválido.' });
  const done = await prisma.character.updateMany({ where: { id, accountId: res.locals.accountId }, data: { fameHidden: req.body.fameHidden } });
  if (done.count !== 1) return res.status(404).json({ error: 'Personagem não encontrado.' });
  res.json({ fameHidden: req.body.fameHidden });
}));
