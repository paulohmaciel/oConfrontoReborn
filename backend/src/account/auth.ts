import { Router, type RequestHandler } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../core/db';
import { asyncRoute } from '../core/http';
import { GameError } from '../core/engine';
import { hashPassword, verifyPassword } from '../core/password';
import { vocations, type BaseVocation } from '../../../shared/adventure';
import { createCharacterKit, parseCharacterName } from '../game/characterService';
import { sendVerification } from './accountTokens';
import { notifyMail, publicUrl } from '../core/mailer';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
// Conta de desenvolvimento local. Nunca recebe e-mail de redefinição e só existe fora de produção.
export const MASTER_EMAIL = 'mestre@localhost.dev';
export const isLoopbackHost = (host = '127.0.0.1') => ['127.0.0.1', '::1', 'localhost'].includes(host.trim().toLowerCase());

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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = String((e.meta as { target?: unknown } | undefined)?.target ?? '');
      // Nome de personagem é público (perfil, busca): pode dizer que está em uso.
      if (target.includes('name')) throw new GameError(409, 'Esse nome de personagem já está em uso. Escolha outro.');
      // E-mail já cadastrado: resposta igual à de sucesso (sem revelar que a conta existe); o dono do endereço recebe um aviso.
      notifyMail(email, 'Tentativa de cadastro — O Confronto', `Alguém tentou criar uma conta em O Confronto com este e-mail, que já está cadastrado.\n\nSe foi você, entre normalmente em ${publicUrl()} ou use "Esqueci minha senha". Se não foi, ignore esta mensagem; nada mudou na sua conta.`);
      res.status(202).json({ ok: true, pending: true, message: 'Quase lá! Enviamos um e-mail para concluir o cadastro. Confira sua caixa de entrada.' });
      return;
    }
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
// ----- Entrada "mestre" SÓ PARA DESENVOLVIMENTO LOCAL -----
// Só funciona com DEV_QUICK_LOGIN=1, NODE_ENV=development (explícito), servidor escutando só em loopback (HOST)
// e pedido vindo do próprio computador, sem proxy. A conta usa uma senha aleatória que ninguém conhece; não existe senha padrão.
// Esta rota NUNCA muda o cargo de uma conta existente: cargos só por `npm run admin:role`.
export const devQuickLoginEnabled = () =>
  process.env.DEV_QUICK_LOGIN === '1' && process.env.NODE_ENV === 'development' && isLoopbackHost(process.env.HOST);
const devQuickLogin = (req: Parameters<RequestHandler>[0]) =>
  devQuickLoginEnabled() && !req.headers['x-forwarded-for'] && !req.headers['x-real-ip']
  && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
authRouter.get('/dev-login', (req, res) => { res.json({ enabled: devQuickLogin(req) }); });
authRouter.post('/dev-login', asyncRoute(async (req, res) => {
  if (!devQuickLogin(req)) throw new GameError(404, 'Rota não encontrada.');
  let account = await prisma.account.findUnique({ where: { email: MASTER_EMAIL } });
  if (!account) {
    const hash = await hashPassword(randomBytes(24).toString('hex'));
    account = await prisma.$transaction(async tx => {
      const a = await tx.account.create({ data: { email: MASTER_EMAIL, password: hash, role: 'ADMIN', emailVerifiedAt: new Date() } });
      await createCharacterKit(tx, a.id, 'Mestre', 'KNIGHT', { vocationChosen: true, startingGold: 1_000_000n });
      return a;
    });
  } else if (account.role !== 'ADMIN') {
    throw new GameError(403, `A conta ${MASTER_EMAIL} existe sem cargo ADMIN. Conceda o cargo pelo terminal: npm run admin:role -- ${MASTER_EMAIL} ADMIN`);
  }
  await loginCookie(res, account.id);
  res.json({ ok: true });
}));
authRouter.post('/logout', asyncRoute(async (req, res) => {
  await prisma.session.deleteMany({ where: { tokenHash: digest(tokenFromCookie(req.headers.cookie)) } });
  res.clearCookie('oc_session', { path: '/' }); res.json({ ok: true });
}));
