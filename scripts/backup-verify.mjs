// Prova que o backup restaura: confere o SHA-256, restaura numa base descartável `<base>_restore_check`
// e compara a contagem de linhas de cada tabela com o manifesto. Nunca toca na base de produção.
// Uso: npm run backup:verify [arquivo.sql.gz]   (sem argumento, usa o backup mais recente)
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { parseDbUrl, clientArgs, clientEnv, tableCounts } from './backup.mjs';

const db = parseDbUrl(process.env.DATABASE_URL ?? '');
const dir = path.resolve(process.env.BACKUP_DIR ?? 'backups');
const file = process.argv[2] ? path.resolve(process.argv[2]) : (() => {
  const latest = readdirSync(dir).filter(n => n.startsWith(db.database + '-') && n.endsWith('.sql.gz')).sort().pop();
  if (!latest) throw new Error('Nenhum backup encontrado em ' + dir);
  return path.join(dir, latest);
})();
const manifest = JSON.parse(readFileSync(file + '.json', 'utf8'));
const raw = readFileSync(file);
if (createHash('sha256').update(raw).digest('hex') !== manifest.sha256) { console.error('FALHA: o arquivo não confere com o SHA-256 do manifesto (corrompido ou alterado).'); process.exit(1); }
const scratch = `${manifest.database}_restore_check`;
if (!/_restore_check$/.test(scratch) || scratch === db.database) throw new Error('Base de verificação inválida.');
const sql = (statement) => { const r = spawnSync('mysql', clientArgs(db), { env: clientEnv(db), input: statement, encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };
try {
  sql(`DROP DATABASE IF EXISTS \`${scratch}\`; CREATE DATABASE \`${scratch}\` CHARACTER SET utf8mb4;`);
  const restore = spawnSync('mysql', [...clientArgs(db), scratch], { env: clientEnv(db), input: gunzipSync(raw), maxBuffer: 1 << 30 });
  if (restore.status !== 0) throw new Error('Restauração falhou: ' + restore.stderr);
  const restored = tableCounts(db, scratch);
  const problems = [];
  for (const [table, count] of Object.entries(manifest.tableCounts)) if (restored[table] !== count) problems.push(`${table}: manifesto=${count}, restaurado=${restored[table] ?? 'ausente'}`);
  for (const table of Object.keys(restored)) if (!(table in manifest.tableCounts)) problems.push(`${table}: tabela inesperada`);
  if (problems.length) { console.error('FALHA na verificação:\n - ' + problems.join('\n - ')); process.exitCode = 1; }
  else console.log(`OK: ${path.basename(file)} restaurou ${Object.keys(restored).length} tabelas com as mesmas contagens do momento do backup.`);
} finally {
  try { sql(`DROP DATABASE IF EXISTS \`${scratch}\``); } catch { /* limpeza best-effort */ }
}
