// Uso: npm run admin:role -- email@exemplo.com ADMIN   (cargos: PLAYER, SUPPORT, MODERATOR, ADMIN)
// Cargos só podem ser alterados aqui, por quem tem acesso ao servidor. Nenhuma rota da API concede cargos.
import 'dotenv/config';
import { PrismaClient, type AccountRole } from '@prisma/client';
const roles = ['PLAYER', 'SUPPORT', 'MODERATOR', 'ADMIN'];
async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !roles.includes(role)) { console.error(`Uso: npm run admin:role -- email@exemplo.com ${roles.join('|')}`); process.exitCode = 1; return; }
  const prisma = new PrismaClient();
  try {
    const account = await prisma.account.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!account) { console.error('Conta não encontrada.'); process.exitCode = 1; return; }
    await prisma.$transaction([
      prisma.account.update({ where: { id: account.id }, data: { role: role as AccountRole } }),
      prisma.adminAuditLog.create({ data: { actorAccountId: account.id, action: 'ROLE_CHANGE', targetType: 'ACCOUNT', targetId: account.id, reason: 'Alterado pelo script de servidor (admin:role)', details: { de: account.role, para: role } } }),
    ]);
    console.log(`Conta ${account.email}: cargo ${account.role} → ${role}.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
