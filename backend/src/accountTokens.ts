import { createHash, randomBytes } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db';
import { notifyMail, publicUrl } from './mailer';
type Db = Prisma.TransactionClient | PrismaClient;
export const TOKEN_TTL = { VERIFY: 24 * 3_600_000, RESET: 3_600_000 } as const;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// O token em texto puro só existe no e-mail; o banco guarda apenas o hash. Um novo token invalida os anteriores do mesmo tipo.
export async function issueToken(db: Db, accountId: number, kind: 'VERIFY' | 'RESET') {
  const token = randomBytes(32).toString('hex');
  await db.accountToken.deleteMany({ where: { accountId, kind, usedAt: null } });
  await db.accountToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } });
  await db.accountToken.create({ data: { tokenHash: hash(token), accountId, kind, expiresAt: new Date(Date.now() + TOKEN_TTL[kind]) } });
  return token;
}
// Marca como usado de forma atômica: só uma requisição consegue consumir o token.
export async function consumeToken(tx: Prisma.TransactionClient, token: unknown, kind: 'VERIFY' | 'RESET') {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await tx.accountToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt <= new Date()) return null;
  const claimed = await tx.accountToken.updateMany({ where: { tokenHash: row.tokenHash, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? row.accountId : null;
}
export async function sendVerification(accountId: number, email: string) {
  try {
    const token = await issueToken(prisma, accountId, 'VERIFY');
    notifyMail(email, 'Confirme seu e-mail — O Confronto', `Olá, aventureiro!\n\nConfirme seu e-mail para liberar compras e recuperação de conta:\n${publicUrl()}/?verificar=${token}\n\nO link vale por 24 horas. Se você não criou esta conta, ignore esta mensagem.`);
  } catch (error) { console.error('[e-mail] não foi possível preparar a confirmação:', error instanceof Error ? error.message : error); }
}
export async function sendPasswordReset(accountId: number, email: string) {
  const token = await issueToken(prisma, accountId, 'RESET');
  notifyMail(email, 'Redefinir senha — O Confronto', `Recebemos um pedido para redefinir sua senha.\n\nUse o link abaixo (válido por 1 hora):\n${publicUrl()}/?redefinir=${token}\n\nSe não foi você, ignore esta mensagem; sua senha continua a mesma.`);
}
