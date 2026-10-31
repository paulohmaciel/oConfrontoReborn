import { Router } from 'express';
import { asyncRoute } from './auth';
import { prisma, transaction } from './db';
import { GameError, integer } from './engine';

export const supportRoutes = Router();
const MAX_OPEN = 5;
function text(value: unknown, field: string, min: number, max: number) {
  const v = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  if (v.length < min || v.length > max) throw new GameError(400, `${field} deve ter de ${min} a ${max} caracteres.`);
  return v;
}
supportRoutes.get('/support/tickets', asyncRoute(async (_req, res) => {
  res.json(await prisma.supportTicket.findMany({ where: { accountId: res.locals.accountId }, orderBy: { id: 'desc' }, take: 30, select: { id: true, kind: true, subject: true, status: true, createdAt: true, updatedAt: true } }));
}));
supportRoutes.post('/support/tickets', asyncRoute(async (req, res) => {
  const accountId = res.locals.accountId;
  const kind = req.body?.kind === 'REPORT' ? 'REPORT' : 'SUPPORT';
  const subject = text(req.body?.subject, 'O assunto', 4, 120), body = text(req.body?.body, 'A mensagem', 10, 2000);
  let reportedCharacterId: number | null = null;
  if (kind === 'REPORT') {
    const name = text(req.body?.reportedName, 'O nome do personagem denunciado', 3, 24);
    const target = await prisma.character.findUnique({ where: { name }, select: { id: true, accountId: true } });
    if (!target) throw new GameError(404, 'Personagem denunciado não encontrado.');
    if (target.accountId === accountId) throw new GameError(400, 'Você não pode denunciar seu próprio personagem.');
    reportedCharacterId = target.id;
  }
  const ticket = await transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM \`Account\` WHERE id = ${accountId} FOR UPDATE`;
    if (await tx.supportTicket.count({ where: { accountId, status: { not: 'RESOLVED' } } }) >= MAX_OPEN) throw new GameError(429, `Você já tem ${MAX_OPEN} atendimentos abertos. Aguarde a resposta antes de abrir outro.`);
    const t = await tx.supportTicket.create({ data: { accountId, kind, subject, reportedCharacterId } });
    await tx.supportMessage.create({ data: { ticketId: t.id, authorAccountId: accountId, body } });
    return t;
  });
  res.status(201).json({ id: ticket.id });
}));
supportRoutes.get('/support/tickets/:ticketId', asyncRoute(async (req, res) => {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: integer(Number(req.params.ticketId)), accountId: res.locals.accountId },
    include: { messages: { where: { internal: false }, orderBy: { id: 'asc' }, take: 200 } } });
  if (!ticket) throw new GameError(404, 'Atendimento não encontrado.');
  res.json({ id: ticket.id, kind: ticket.kind, subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt,
    messages: ticket.messages.map(m => ({ id: m.id, body: m.body, fromStaff: m.authorAccountId !== ticket.accountId, createdAt: m.createdAt })) });
}));
supportRoutes.post('/support/tickets/:ticketId/messages', asyncRoute(async (req, res) => {
  const accountId = res.locals.accountId, id = integer(Number(req.params.ticketId)), body = text(req.body?.body, 'A mensagem', 2, 2000);
  await transaction(async tx => {
    const locked = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM \`SupportTicket\` WHERE id = ${id} AND accountId = ${accountId} FOR UPDATE`;
    if (locked.length !== 1) throw new GameError(404, 'Atendimento não encontrado.');
    if (await tx.supportMessage.count({ where: { ticketId: id } }) >= 200) throw new GameError(409, 'Este atendimento atingiu o limite de mensagens.');
    await tx.supportMessage.create({ data: { ticketId: id, authorAccountId: accountId, body } });
    await tx.supportTicket.update({ where: { id }, data: { status: 'OPEN' } });
  });
  res.json({ ok: true });
}));
