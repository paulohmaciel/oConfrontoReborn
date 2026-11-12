import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { authRouter, authenticate, protectOrigin, isLoopbackHost, devQuickLoginEnabled, DEV_EMAILS } from './account/auth';
import { analyticsRoutes } from './account/analyticsRoutes';
import { gameRouter, gameErrorHandler } from './game/routes';
import { readRoutes } from './game/readRoutes';
import { prisma } from './core/db';
import { taskRoutes } from './game/taskRoutes';
import { adventureRoutes } from './game/adventureRoutes';
import { emailRouter } from './account/emailRoutes';
import { webhookRoutes } from './premium/webhookRoutes';
import { premiumRoutes } from './premium/premiumRoutes';
import { economyRoutes } from './economy/economyRoutes';
import { characterRoutes } from './game/characterRoutes';
import { supportRoutes } from './admin/supportRoutes';
import { adminRoutes } from './admin/adminRoutes';
import { publicNoticeRoutes } from './admin/noticeRoutes';
import { communityRoutes } from './community/communityRoutes';
import { expireListings } from './economy/marketService';
import { expireDuels } from './game/duelService';
import { requestId } from './core/monitor';
import { appRouter } from './confrontation/appRoutes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Atrás de proxy reverso (produção), defina TRUST_PROXY=1 para que os limites de uso contem o IP real do visitante.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  // Cabeçalho de proxy chegando sem TRUST_PROXY: todos os visitantes dividiriam o mesmo limite de uso. Avisa uma vez.
  if (!process.env.TRUST_PROXY) { let warned = false; app.use((req, _res, next) => { if (!warned && req.headers['x-forwarded-for']) { warned = true; console.warn('[segurança] Chegou X-Forwarded-For mas TRUST_PROXY não está definido: há um proxy na frente e os limites de uso estão contando o IP dele. Defina TRUST_PROXY=1 no .env (ver OPERACAO.md).'); } next(); }); }
  app.use(requestId());
  app.use(helmet({ contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:'], 'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null } } }));
  app.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
  // App Confrontation (Godot): token Bearer, sem cookie nem Origin. O save pede corpo maior (até 512 KB), por isso vem antes do limite geral.
  app.use('/api/app', appRouter());
  app.use(express.json({ limit: '16kb' }));
  // Para monitor externo de disponibilidade: 200 quando o banco responde, 503 quando não. Sem dados internos.
  app.get('/api/health', async (_req,res) => { const t0 = Date.now(); try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true, dbMs: Date.now() - t0 }); } catch { res.status(503).json({ ok: false }); } });
  // O webhook vem do Mercado Pago (sem cookie e sem Origin do navegador); a autenticidade é verificada pela assinatura HMAC.
  app.use('/api', webhookRoutes);
  app.use('/api', protectOrigin, rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas ações em pouco tempo. Aguarde um minuto.' } }));
  app.use('/api/auth', rateLimit({ windowMs: 15*60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde antes de entrar novamente.' } }), authRouter, emailRouter);
  app.use('/api', publicNoticeRoutes);
  app.use('/api', authenticate, analyticsRoutes, readRoutes, taskRoutes, adventureRoutes, economyRoutes, characterRoutes, premiumRoutes, communityRoutes, supportRoutes, adminRoutes, gameRouter());
  app.use('/api', (_req,res) => { res.status(404).json({ error: 'Rota não encontrada.' }); });
  app.use(gameErrorHandler);
  const dist = path.resolve('dist');
  app.use(express.static(dist));
  app.get('*', (_req,res) => res.sendFile(path.join(dist, 'index.html')));
  return app;
}
// Travas de inicialização: o servidor se recusa a subir numa combinação de .env que abriria a entrada "mestre" ao público
// ou serviria HTTPS sem o modo produção (cookie sem Secure). Para produção use `npm run start:prod`.
export function startupSafetyErrors(env = process.env): string[] {
  const errors: string[] = [];
  const host = env.HOST ?? '127.0.0.1', origin = env.APP_ORIGIN ?? '', production = env.NODE_ENV === 'production';
  if (env.DEV_QUICK_LOGIN === '1' && !production && !isLoopbackHost(host))
    errors.push(`DEV_QUICK_LOGIN=1 com HOST=${host}: a entrada "mestre" só pode existir com o servidor escutando em 127.0.0.1. Remova DEV_QUICK_LOGIN do .env ou use HOST=127.0.0.1.`);
  if (origin.startsWith('https://') && !production)
    errors.push(`APP_ORIGIN=${origin} exige NODE_ENV=production (cookie Secure e CSP). Inicie com: npm run start:prod`);
  // Em produção, e-mail só no terminal significa que ninguém recupera a senha. ALLOW_CONSOLE_MAIL=1 libera (beta fechado, por conta e risco).
  if (production && (env.MAIL_DRIVER ?? 'console') === 'console' && env.ALLOW_CONSOLE_MAIL !== '1')
    errors.push('MAIL_DRIVER=console em produção: recuperação de senha e confirmação de e-mail não chegariam a ninguém. Configure MAIL_DRIVER=resend, RESEND_API_KEY e MAIL_FROM (ou ALLOW_CONSOLE_MAIL=1 para um beta fechado).');
  if (production && env.DEV_QUICK_LOGIN === '1')
    errors.push('DEV_QUICK_LOGIN=1 em produção: remova essa linha do .env.');
  return errors;
}
// Avisos que não impedem a subida.
export function startupWarnings(env = process.env): string[] {
  const warnings: string[] = [];
  if (env.TRUST_PROXY && !isLoopbackHost(env.HOST ?? '127.0.0.1'))
    warnings.push(`TRUST_PROXY ligado com HOST=${env.HOST}: se o servidor também for alcançável direto pela internet, o visitante forja o próprio IP e escapa dos limites de uso. Use HOST=127.0.0.1 atrás do proxy.`);
  return warnings;
}
if (require.main === module) {
  const problems = startupSafetyErrors();
  if (problems.length) { for (const p of problems) console.error(`[segurança] ${p}`); process.exit(1); }
  for (const w of startupWarnings()) console.warn(`[segurança] ${w}`);
  if (process.env.NODE_ENV === 'production') void prisma.account.findMany({ where: { OR: [{ email: { in: [...DEV_EMAILS] } }, { email: { endsWith: '@localhost.dev' } }] }, select: { email: true } })
    .then(found => { if (found.length) console.warn(`[segurança] Contas de desenvolvimento no banco de produção (não conseguem entrar, mas devem ser removidas): ${found.map(a => a.email).join(', ')}. Veja OPERACAO.md.`); }).catch(() => {});
  if (process.env.DEV_QUICK_LOGIN === '1') console.warn(devQuickLoginEnabled() ? '[dev] Entrada "mestre" ligada (somente neste computador). Remova DEV_QUICK_LOGIN do .env antes de publicar.' : '[segurança] DEV_QUICK_LOGIN ignorado: exige NODE_ENV=development e HOST em loopback.');
  const port = Number(process.env.PORT ?? 3333);
  const sweep = setInterval(() => {
    void expireListings().catch(e => console.error('[mercado] varredura falhou:', e instanceof Error ? e.message : e));
    void expireDuels().catch(e => console.error('[duelo] varredura falhou:', e instanceof Error ? e.message : e));
  }, 60_000);
  sweep.unref();
  const server = createApp().listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`Jogo/API: http://localhost:${port}`));
  const stop = () => { clearInterval(sweep); server.close(() => { void prisma.$disconnect().then(() => process.exit(0)); }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
