// Avisos da equipe (manutenção, eventos): leitura pública, sem login, para aparecer também na tela de entrada.
// Criar e encerrar ficam em adminRoutes (permissão notices.manage, motivo e auditoria).
import { Router } from 'express';
import { prisma } from '../core/db';
import { asyncRoute } from '../core/http';

export const publicNoticeRoutes = Router();
export const activeNoticeWhere = () => {
  const now = new Date();
  return { endedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
};
publicNoticeRoutes.get('/notices', asyncRoute(async (_req, res) => {
  const rows = await prisma.gameNotice.findMany({ where: activeNoticeWhere(), orderBy: { id: 'desc' }, take: 3, select: { id: true, kind: true, message: true, endsAt: true } });
  res.json(rows);
}));
