// Uso: npm run dev:accounts              → lista as contas de desenvolvimento que existem neste banco
//      npm run dev:accounts -- --bloquear → tranca cada uma (não apaga nada)
// Contas de desenvolvimento: mestre@, rival@, mestre1@localhost.dev, vendedor-teste@example.invalid e qualquer @localhost.dev.
// Em produção elas já não conseguem entrar (devAccountBlocked em account/auth.ts). Trancar é o passo que falta antes de abrir o jogo:
// troca a senha por uma aleatória que ninguém conhece, tira o cargo de equipe, encerra os acessos e cancela os anúncios abertos
// (os itens voltam para a mochila do próprio personagem). Personagens, livros-razão e histórico ficam como estão.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { DEV_EMAILS } from '../src/account/auth';
import { cancelListing } from '../src/economy/marketService';

async function main() {
  const lock = process.argv.includes('--bloquear');
  const accounts = await prisma.account.findMany({ where: { OR: [{ email: { in: [...DEV_EMAILS] } }, { email: { endsWith: '@localhost.dev' } }] }, orderBy: { id: 'asc' },
    include: { characters: { select: { id: true, name: true, level: true, goldInHand: true } }, _count: { select: { sessions: true } } } });
  if (!accounts.length) { console.log('Nenhuma conta de desenvolvimento neste banco.'); return; }
  for (const a of accounts) {
    const ids = a.characters.map(c => c.id);
    const open = await prisma.marketListing.findMany({ where: { sellerId: { in: ids }, status: 'OPEN' }, select: { id: true, sellerId: true } });
    console.log(`${a.email} · cargo ${a.role} · ${a._count.sessions} acesso(s) · ${open.length} anúncio(s) aberto(s) · personagens: ${a.characters.map(c => `${c.name} (nv. ${c.level}, ${c.goldInHand} de ouro)`).join(', ') || 'nenhum'}`);
    if (!lock) continue;
    for (const l of open) await cancelListing(a.id, l.sellerId, l.id);
    await prisma.$transaction([
      prisma.account.update({ where: { id: a.id }, data: { password: await hashPassword(randomBytes(24).toString('hex')), role: 'PLAYER' } }),
      prisma.session.deleteMany({ where: { accountId: a.id } }),
      prisma.adminAuditLog.create({ data: { actorAccountId: a.id, action: 'DEV_ACCOUNT_LOCK', targetType: 'ACCOUNT', targetId: a.id, reason: 'Trancada pelo script de servidor (dev:accounts --bloquear)', details: { cargoAnterior: a.role, anunciosCancelados: open.length } } }),
    ]);
    console.log('  → trancada: senha trocada, cargo PLAYER, acessos encerrados, anúncios cancelados.');
  }
  if (!lock) console.log('\nNada foi alterado. Para trancar essas contas: npm run dev:accounts -- --bloquear');
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
