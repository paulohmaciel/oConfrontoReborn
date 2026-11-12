// Entrada do app Godot por token Bearer. As contas e senhas são as mesmas do site; o token é uma linha
// da tabela Session (a mesma do cookie), então "redefinir senha" e o banimento valem para o app também.
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { RequestHandler } from 'express';
import { prisma } from '../core/db';
import { asyncRoute } from '../core/http';
import { GameError } from '../core/engine';
import { hashPassword, verifyPassword } from '../core/password';
import { loadSettings } from '../core/settings';
import { notifyMail, publicUrl } from '../core/mailer';
import { createCharacterKit, parseCharacterName } from '../game/characterService';
import { activeBan, digest, validPassword } from '../account/auth';
import { sendVerification } from '../account/accountTokens';

const DAY = 24 * 3_600_000;
const BEARER = /^Bearer ([a-f0-9]{64})$/;

function credentials(body: any) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !validPassword(password))
    throw new GameError(400, 'Informe um e-mail válido e uma senha de 10 a 128 caracteres.');
  return { email, password: password as string };
}
function banText(ban: { reason: string; expiresAt: Date | null }) {
  return `Conta suspensa${ban.expiresAt ? ` até ${ban.expiresAt.toLocaleString('pt-BR')}` : ' por tempo indeterminado'}. Motivo: ${ban.reason}`;
}

/** Nome público da conta no app: o do primeiro personagem (o mesmo que aparece no site). */
export async function displayName(accountId: number) {
  const c = await prisma.character.findFirst({ where: { accountId }, orderBy: { id: 'asc' }, select: { name: true } });
  return c?.name ?? `Jogador ${accountId}`;
}

/** Cria um token novo para a conta. Só o hash fica no banco. */
export async function issueAppToken(accountId: number) {
  const days = (await loadSettings(prisma))['confrontation.sessionDays'];
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + days * DAY);
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { tokenHash: digest(token), accountId, expiresAt } });
  return { token, expiresAt: expiresAt.toISOString(), name: await displayName(accountId) };
}

async function accountOf(header: string | undefined) {
  const m = BEARER.exec(header ?? '');
  if (!m) throw new GameError(401, 'Entre na sua conta.');
  const tokenHash = digest(m[1]);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.expiresAt <= new Date()) throw new GameError(401, 'Sessão expirada. Entre novamente.');
  const ban = await activeBan(session.accountId);
  if (ban) throw new GameError(403, banText(ban));
  // Renovação com o uso: passada a metade da validade, ela volta ao começo.
  const days = (await loadSettings(prisma))['confrontation.sessionDays'];
  if (session.expiresAt.getTime() - Date.now() < days * DAY / 2)
    await prisma.session.update({ where: { tokenHash }, data: { expiresAt: new Date(Date.now() + days * DAY) } });
  return { accountId: session.accountId, tokenHash };
}

/** Exige `Authorization: Bearer <token>`; põe `accountId` e `tokenHash` em `res.locals`. */
export const appAuthenticate: RequestHandler = asyncRoute(async (req, res, next) => {
  const { accountId, tokenHash } = await accountOf(req.get('authorization'));
  res.locals.accountId = accountId;
  res.locals.tokenHash = tokenHash;
  next();
});
/** Como `appAuthenticate`, mas segue sem conta quando não há token válido (rankings são públicos). */
export const appOptionalAuth: RequestHandler = asyncRoute(async (req, res, next) => {
  if (req.get('authorization')) {
    try { res.locals.accountId = (await accountOf(req.get('authorization'))).accountId; } catch { /* sem conta */ }
  }
  next();
});

export async function appLogin(body: unknown) {
  const { email, password } = credentials(body);
  const account = await prisma.account.findUnique({ where: { email } });
  const dummy = 'scrypt:00000000000000000000000000000000:' + '0'.repeat(128);
  const valid = await verifyPassword(password, account?.password ?? dummy);
  if (!valid || !account) throw new GameError(401, 'E-mail ou senha incorretos.');
  const ban = await activeBan(account.id);
  if (ban) throw new GameError(403, banText(ban));
  return issueAppToken(account.id);
}

/**
 * Cadastro pelo app: cria a conta e o primeiro personagem como o cadastro do site (o nome vale nos dois).
 * E-mail já cadastrado responde "confira seu e-mail" sem token, como o site, para não revelar contas.
 */
export async function appRegister(body: any): Promise<{ status: 201; session: Awaited<ReturnType<typeof issueAppToken>> } | { status: 202; message: string }> {
  const { email, password } = credentials(body);
  const name = parseCharacterName(body?.name);
  const hash = await hashPassword(password);
  try {
    const account = await prisma.$transaction(async tx => {
      const a = await tx.account.create({ data: { email, password: hash } });
      await createCharacterKit(tx, a.id, name, 'KNIGHT', { vocationChosen: false, startingGold: 500n });
      return a;
    });
    void sendVerification(account.id, email);
    return { status: 201, session: await issueAppToken(account.id) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const target = String((e.meta as { target?: unknown } | undefined)?.target ?? '');
      if (target.includes('name')) throw new GameError(409, 'Esse nome já está em uso. Escolha outro.');
      notifyMail(email, 'Tentativa de cadastro — O Confronto', `Alguém tentou criar uma conta com este e-mail pelo app Confrontation, mas ele já está cadastrado.\n\nSe foi você, entre com a sua senha de sempre ou use "Esqueci minha senha" em ${publicUrl()}. Se não foi, ignore esta mensagem; nada mudou na sua conta.`);
      return { status: 202, message: 'Quase lá! Enviamos um e-mail para concluir o cadastro. Confira sua caixa de entrada.' };
    }
    throw e;
  }
}

export async function appLogout(tokenHash: string) {
  await prisma.session.deleteMany({ where: { tokenHash } });
}
