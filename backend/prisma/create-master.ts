// Uso: npm run master:create            (senha temporária de desenvolvimento: Mestre-Temp-2026!)
//      npm run master:create -- --resetar     (volta para a senha temporária)
//      npm run master:create -- --aleatoria   (gera uma senha aleatória e mostra UMA vez)
//      npm run master:create -- --senha "SuaSenhaDeNoMinimo10"
// Cria (ou redefine a senha de) a conta ADMIN local mestre@localhost.dev com um personagem "Mestre".
// Só roda fora de produção. Não apaga nada: se a conta existir, apenas troca a senha e garante o cargo ADMIN.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/core/password';
import { createCharacterKit } from '../src/game/characterService';
const EMAIL = 'mestre@localhost.dev';
// SENHA TEMPORÁRIA DE DESENVOLVIMENTO (conhecida de propósito). TODO antes de publicar: apagar a conta e/ou usar `--senha` ou a senha aleatória (`--aleatoria`).
const TEMP_PASSWORD = 'Mestre-Temp-2026!';
async function main() {
  if (process.env.NODE_ENV === 'production') { console.error('Recusado: este script não roda em produção.'); process.exitCode = 1; return; }
  const i = process.argv.indexOf('--senha');
  const password = i > -1 ? String(process.argv[i + 1] ?? '') : process.argv.includes('--aleatoria') ? randomBytes(9).toString('base64url') + '#7a' : TEMP_PASSWORD;
  if (password.length < 10 || password.length > 128) { console.error('A senha precisa ter de 10 a 128 caracteres.'); process.exitCode = 1; return; }
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.account.findUnique({ where: { email: EMAIL } });
    const explicit = i > -1 || process.argv.includes('--aleatoria') || process.argv.includes('--resetar');
    // Já existe e ninguém pediu para trocar a senha: não mexe (assim o iniciar.bat pode chamar este script sempre).
    if (existing && !explicit) { console.log(`\n  Login master já existe: ${EMAIL} (senha temporária de desenvolvimento: ${TEMP_PASSWORD}, se você não a trocou).\n`); return; }
    const hash = await hashPassword(password);
    if (existing) {
      await prisma.$transaction([
        prisma.account.update({ where: { id: existing.id }, data: { password: hash, role: 'ADMIN', emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } }),
        prisma.session.deleteMany({ where: { accountId: existing.id } }),
      ]);
    } else {
      await prisma.$transaction(async tx => {
        const a = await tx.account.create({ data: { email: EMAIL, password: hash, role: 'ADMIN', emailVerifiedAt: new Date() } });
        await createCharacterKit(tx, a.id, 'Mestre', 'KNIGHT', { vocationChosen: true, startingGold: 1_000_000n });
      });
    }
    console.log(`\n  Login master pronto (somente para este computador)\n  E-mail: ${EMAIL}\n  Senha:  ${password}\n\n  Esta é uma conta de desenvolvimento. Antes de publicar o jogo, apague-a (veja o TODO.md).\n`);
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
