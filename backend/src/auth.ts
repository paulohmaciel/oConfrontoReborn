import { Router, type RequestHandler } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { GameError } from './engine';
import { hashPassword, verifyPassword } from './password';
import { vocations, type BaseVocation } from '../../shared/adventure';
import { createCharacterKit, parseCharacterName } from './characterService';
import { sendVerification } from './accountTokens';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
function tokenFromCookie(cookie = '') { return cookie.split(';').map(s => s.trim()).find(s => s.startsWith('oc_session='))?.slice(11) ?? ''; }
export async function activeBan(accountId: number) {
  const now = new Date();
  return prisma.punishment.findFirst({ where: { accountId, kind: 'BAN', revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: { id: 'desc' } });
}
function banMessage(ban: { reason: string; expiresAt: Date | null }) {
  return `Conta suspensa${ban.expiresAt ? ` até ${ban.expiresAt.toLocaleString('pt-BR')}` : ' por tempo indeterminado'}. Motivo: ${ban.reason}`;
}
export const authenticate: RequestHandler = asyncRoute(async (req, res, next) => {
  const token = tokenFromCookie(req.headers.cookie);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new GameError(401, 'Entre na sua conta.');
  const session = await prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { account: { select: { role: true, emailVerifiedAt: true } } } });
  if (!session || session.expiresAt <= new Date()) throw new GameError(401, 'Sessão expirada. Entre novamente.');
  const ban = await activeBan(session.accountId);
  if (ban) throw new GameError(403, banMessage(ban));
  res.locals.accountId = session.accountId;
  res.locals.role = session.account.role;
  res.locals.emailVerified = !!session.account.emailVerifiedAt;
  next();
});
// API usa cookies HttpOnly; toda mutação de navegador exige Origin e cabeçalho não simples.
export const protectOrigin: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('origin') !== (process.env.APP_ORIGIN ?? 'http://localhost:5173') || req.get('x-game-client') !== 'oconfronto')
    return next(new GameError(403, 'Origem da requisição não autorizada.'));
  next();
};
export const authRouter = Router();
export function validPassword(password: unknown): password is string { return typeof password === 'string' && password.length >= 10 && password.length <= 128; }
function credentials(body: any) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validPassword(password))
    throw new GameError(400, 'Informe um e-mail válido e uma senha de 10 a 128 caracteres.');
  return { email, password };
}
async function loginCookie(res: Parameters<RequestHandler>[1], accountId: number) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { tokenHash: digest(token), accountId, expiresAt } });
  res.cookie('oc_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', expires: expiresAt, path: '/' });
}
authRouter.post('/register', asyncRoute(async (req, res) => {
  const { email, password } = credentials(req.body);
  const name = parseCharacterName(req.body.name);
  const hash = await hashPassword(password);
  const choice = req.body.vocation;
  if (choice !== undefined && (typeof choice !== 'string' || !Object.prototype.hasOwnProperty.call(vocations, choice))) throw new GameError(400, 'Vocação inválida.');
  const vocation = (choice ?? 'KNIGHT') as BaseVocation;
  try {
    const account = await prisma.$transaction(async tx => {
      const a = await tx.account.create({ data: { email, password: hash } });
      await createCharacterKit(tx, a.id, name, vocation, { vocationChosen: choice !== undefined, startingGold: 500n });
      return a;
    });
    await loginCookie(res, account.id);
    void sendVerification(account.id, email);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new GameError(409, 'E-mail ou nome indisponível.');
    throw e;
  }
}));
authRouter.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = credentials(req.body);
  const account = await prisma.account.findUnique({ where: { email } });
  const dummy = 'scrypt:00000000000000000000000000000000:' + '0'.repeat(128);
  const valid = await verifyPassword(password, account?.password ?? dummy);
  if (!valid || !account) throw new GameError(401, 'E-mail ou senha incorretos.');
  const ban = await activeBan(account.id);
  if (ban) throw new GameError(403, banMessage(ban));
  await loginCookie(res, account.id);
  res.json({ ok: true });
}));
authRouter.post('/logout', asyncRoute(async (req, res) => {
  await prisma.session.deleteMany({ where: { tokenHash: digest(tokenFromCookie(req.headers.cookie)) } });
  res.clearCookie('oc_session', { path: '/' }); res.json({ ok: true });
}));
