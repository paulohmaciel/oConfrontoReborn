// Uso: npm run master:create                      (cria a conta com senha ALEATÓRIA, que não é exibida)
//      npm run master:create -- --aleatoria       (gera uma senha aleatória nova e a mostra UMA vez)
//      npm run master:create -- --senha "SuaSenhaDeNoMinimo10"
// Cria (ou redefine a senha de) a conta ADMIN local mestre@localhost.dev com um personagem "Mestre".
// Não existe senha padrão: sem --aleatoria ou --senha a conta só entra pelo botão "Mestre" (DEV_QUICK_LOGIN=1, loopback).
// Só roda fora de produção. Não apaga nada: se a conta existir e ninguém pedir troca, não mexe (o iniciar.bat chama sempre).
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/core/password';
import { createCharacterKit } from '../src/game/characterService';
const EMAIL = 'mestre@localhost.dev';
async function main() {
  if (process.env.NODE_ENV === 'production') { console.error('Recusado: este script não roda em produção.'); process.exitCode = 1; return; }
  const i = process.argv.indexOf('--senha');
  const show = process.argv.includes('--aleatoria');
  const password = i > -1 ? String(process.argv[i + 1] ?? '') : randomBytes(18).toString('base64url') + '#7a';
  if (password.length < 10 || password.length > 128) { console.error('A senha precisa ter de 10 a 128 caracteres.'); process.exitCode = 1; return; }
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.account.findUnique({ where: { email: EMAIL } });
    const explicit = i > -1 || show;
    if (existing && !explicit) { console.log(`\n  Login master já existe: ${EMAIL}. Entre pelo botão "Mestre" (modo desenvolvimento) ou defina uma senha com -- --aleatoria / -- --senha.\n`); return; }
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
    const shown = i > -1 ? '(a senha informada)' : show ? password : '(aleatória, não exibida — entre pelo botão "Mestre")';
    console.log(`\n  Login master pronto (somente para este computador)\n  E-mail: ${EMAIL}\n  Senha:  ${shown}\n\n  Esta é uma conta de desenvolvimento. Antes de publicar o jogo, apague-a (veja o TODO.md).\n`);
  } finally { await prisma.$disconnect(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
