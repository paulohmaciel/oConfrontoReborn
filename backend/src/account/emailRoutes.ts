import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncRoute } from '../core/http';
import { authenticate, validPassword, MASTER_EMAIL } from './auth';
import { prisma, transaction } from '../core/db';
import { GameError } from '../core/engine';
import { hashPassword, verifyPassword } from '../core/password';
import { notifyMail, publicUrl } from '../core/mailer';
import { consumeToken, sendPasswordReset, sendVerification } from './accountTokens';

// Montado em /api/auth (já sob o limitador geral de autenticação).
export const emailRouter = Router();
const strict = rateLimit({ windowMs: 15 * 60_000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas solicitações. Aguarde antes de tentar novamente.' } });
const RESET_RESPONSE = { ok: true, message: 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.' };
const RESET_INTERVAL_MS = 60_000;

// Pedido de redefinição de senha, usado pelo site (aqui) e pelo app Confrontation (/api/app/auth/forgot-password).
// A resposta é a mesma exista a conta ou não.
export async function requestPasswordReset(rawEmail: unknown) {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GameError(400, 'Informe um e-mail válido.');
  // A conta de desenvolvimento nunca recebe link de redefinição (o domínio dela não é nosso).
  const account = email === MASTER_EMAIL ? null : await prisma.account.findUnique({ where: { email }, select: { id: true } });
  // Intervalo por conta: um pedido por minuto. Assim ninguém inunda a caixa da vítima nem invalida o link que ela acabou de receber.
  const recent = account ? await prisma.accountToken.findFirst({ where: { accountId: account.id, kind: 'RESET', usedAt: null, createdAt: { gt: new Date(Date.now() - RESET_INTERVAL_MS) } }, select: { tokenHash: true } }) : null;
  // Resposta idêntica exista a conta ou não (e tenha ou não pedido há pouco); o envio não bloqueia a resposta.
  if (account && !recent) void sendPasswordReset(account.id, email).catch(error => console.error('[e-mail] falha na redefinição:', error instanceof Error ? error.message : error));
  return RESET_RESPONSE;
}
emailRouter.post('/forgot-password', strict, asyncRoute(async (req, res) => { res.json(await requestPasswordReset(req.body?.email)); }));
emailRouter.post('/reset-password', strict, asyncRoute(async (req, res) => {
  if (!validPassword(req.body?.password)) throw new GameError(400, 'A senha deve ter de 10 a 128 caracteres.');
  const hash = await hashPassword(req.body.password);
  await transaction(async tx => {
    const accountId = await consumeToken(tx, req.body?.token, 'RESET');
    if (!accountId) throw new GameError(400, 'Link inválido ou expirado. Peça um novo.');
    // Quem recebeu o link no e-mail prova que controla o endereço.
    await tx.account.update({ where: { id: accountId }, data: { password: hash } });
    await tx.account.updateMany({ where: { id: accountId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    await tx.session.deleteMany({ where: { accountId } });
  });
  res.json({ ok: true });
}));
emailRouter.post('/verify-email', strict, asyncRoute(async (req, res) => {
  await transaction(async tx => {
    const accountId = await consumeToken(tx, req.body?.token, 'VERIFY');
    if (!accountId) throw new GameError(400, 'Link inválido ou expirado. Peça um novo.');
    await tx.account.updateMany({ where: { id: accountId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  });
  res.json({ ok: true });
}));
emailRouter.post('/resend-verification', authenticate, strict, asyncRoute(async (_req, res) => {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: res.locals.accountId }, select: { id: true, email: true, emailVerifiedAt: true } });
  if (account.emailVerifiedAt) { res.json({ ok: true, message: 'Seu e-mail já está confirmado.' }); return; }
  const recent = await prisma.accountToken.findFirst({ where: { accountId: account.id, kind: 'VERIFY', createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent) throw new GameError(429, 'Aguarde um minuto antes de pedir outro e-mail.');
  await sendVerification(account.id, account.email);
  res.json({ ok: true, message: 'Enviamos um novo link de confirmação.' });
}));

// Trocar a senha com a conta aberta: pede a senha atual e encerra as outras sessões (a deste aparelho continua).
// Limite próprio: errar a senha atual algumas vezes não consome as tentativas de "esqueci a senha".
const accountLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' } });
emailRouter.post('/change-password', authenticate, accountLimit, asyncRoute(async (req, res) => {
  const current = req.body?.currentPassword, next = req.body?.newPassword;
  if (!validPassword(next)) throw new GameError(400, 'A nova senha deve ter de 10 a 128 caracteres.');
  const account = await prisma.account.findUniqueOrThrow({ where: { id: res.locals.accountId }, select: { id: true, email: true, password: true } });
  if (typeof current !== 'string' || current.length > 128 || !(await verifyPassword(current, account.password))) throw new GameError(403, 'A senha atual não confere.');
  if (current === next) throw new GameError(400, 'A nova senha precisa ser diferente da atual.');
  const hash = await hashPassword(next);
  const ended = await transaction(async tx => {
    await tx.account.update({ where: { id: account.id }, data: { password: hash } });
    // Links de redefinição pedidos antes da troca deixam de valer.
    await tx.accountToken.updateMany({ where: { accountId: account.id, kind: 'RESET', usedAt: null }, data: { usedAt: new Date() } });
    return (await tx.session.deleteMany({ where: { accountId: account.id, NOT: { tokenHash: res.locals.sessionHash } } })).count;
  });
  notifyMail(account.email, 'Sua senha foi alterada — O Confronto', `A senha da sua conta em O Confronto acabou de ser trocada.

Se foi você, não precisa fazer nada. Se não foi, use "Esqueci minha senha" em ${publicUrl()} agora e fale com o Suporte.`);
  res.json({ ok: true, ended, message: ended ? `Senha trocada. ${ended} ${ended === 1 ? 'outro acesso foi encerrado' : 'outros acessos foram encerrados'}.` : 'Senha trocada.' });
}));
// Sair de todos os outros aparelhos (inclui o app Confrontation, que usa a mesma tabela de sessões). Este continua aberto.
emailRouter.post('/logout-all', authenticate, accountLimit, asyncRoute(async (_req, res) => {
  const ended = (await prisma.session.deleteMany({ where: { accountId: res.locals.accountId, NOT: { tokenHash: res.locals.sessionHash } } })).count;
  res.json({ ok: true, ended, message: ended ? `${ended} ${ended === 1 ? 'outro acesso foi encerrado' : 'outros acessos foram encerrados'}.` : 'Não havia outro acesso aberto.' });
}));
// Quantos acessos estão abertos nesta conta (para a tela de Configurações).
emailRouter.get('/sessions', authenticate, asyncRoute(async (_req, res) => {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: res.locals.accountId }, select: { email: true, emailVerifiedAt: true } });
  const open = await prisma.session.count({ where: { accountId: res.locals.accountId, expiresAt: { gt: new Date() } } });
  res.json({ email: account.email, emailVerified: !!account.emailVerifiedAt, open });
}));
