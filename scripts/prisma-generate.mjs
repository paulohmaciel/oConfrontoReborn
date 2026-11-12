// `npm run generate`: gera o Prisma Client mesmo com o jogo aberto no Windows.
// O servidor em execução mantém o motor do Prisma (query_engine-windows.dll.node) carregado; o Windows não deixa apagá-lo,
// e o `prisma generate` falhava com "EPERM: operation not permitted, unlink". O Windows deixa RENOMEAR um arquivo em uso:
// então o motor atual é afastado (…em-uso-<data>), o novo é gerado no lugar, e o jogo aberto segue com a cópia antiga até reiniciar.
// As cópias antigas que ninguém usa mais são apagadas aqui mesmo, na próxima vez.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const dir = path.join('node_modules', '.prisma', 'client');
const engine = path.join(dir, 'query_engine-windows.dll.node');
const aside = 'query_engine-windows.dll.node.em-uso-';

let moved = '';
if (process.platform === 'win32' && existsSync(dir)) {
  for (const file of readdirSync(dir).filter(f => f.startsWith(aside))) {
    try { unlinkSync(path.join(dir, file)); } catch { /* ainda carregado por um jogo aberto: fica para a próxima */ }
  }
  if (existsSync(engine)) {
    try { moved = path.join(dir, `${aside}${Date.now()}`); renameSync(engine, moved); } catch (e) { moved = ''; console.warn(`Aviso: não consegui afastar o motor do Prisma (${e instanceof Error ? e.message : e}).`); }
  }
}
try {
  execFileSync(process.execPath, [path.join('node_modules', 'prisma', 'build', 'index.js'), 'generate', '--schema', 'backend/prisma/schema.prisma'], { stdio: 'inherit' });
} catch (e) {
  // Falhou: devolve o motor antigo ao lugar, para o projeto não ficar sem ele.
  if (moved && !existsSync(engine)) renameSync(moved, engine);
  process.exit(typeof e === 'object' && e && 'status' in e && typeof e.status === 'number' ? e.status : 1);
}
