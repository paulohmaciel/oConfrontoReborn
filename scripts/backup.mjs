// Backup do banco MySQL: dump comprimido + manifesto com SHA-256 e contagem de linhas por tabela.
// Uso: npm run backup            (lê DATABASE_URL do .env)
//      BACKUP_KEEP=14 BACKUP_DIR=backups npm run backup
// Requer o cliente `mysqldump`/`mysql` no PATH (o Laragon traz; ex.: C:\laragon\bin\mysql\...\bin).
import 'dotenv/config';
import { spawnSync, spawn } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createWriteStream, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function parseDbUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'mysql:') throw new Error('DATABASE_URL precisa ser mysql://');
  return { host: u.hostname, port: u.port || '3306', user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: decodeURIComponent(u.pathname.slice(1)) };
}
// A senha vai por variável de ambiente (MYSQL_PWD), nunca na linha de comando, para não aparecer na lista de processos.
export const clientArgs = db => ['-h', db.host, '-P', db.port, '-u', db.user];
export const clientEnv = db => ({ ...process.env, MYSQL_PWD: db.password });
export function tableCounts(db, database = db.database) {
  const tables = spawnSync('mysql', [...clientArgs(db), '-N', '-B', '-e', `SHOW TABLES FROM \`${database}\``], { env: clientEnv(db), encoding: 'utf8' });
  if (tables.status !== 0) throw new Error('Falha ao listar tabelas: ' + tables.stderr);
  const counts = {};
  for (const name of tables.stdout.split('\n').filter(Boolean)) {
    const r = spawnSync('mysql', [...clientArgs(db), '-N', '-B', '-e', `SELECT COUNT(*) FROM \`${database}\`.\`${name}\``], { env: clientEnv(db), encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Falha ao contar ${name}: ${r.stderr}`);
    counts[name] = Number(r.stdout.trim());
  }
  return counts;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definido.');
  const db = parseDbUrl(process.env.DATABASE_URL);
  const dir = path.resolve(process.env.BACKUP_DIR ?? 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${db.database}-${stamp}.sql.gz`);
  const counts = tableCounts(db);
  await new Promise((resolve, reject) => {
    const dump = spawn('mysqldump', [...clientArgs(db), '--single-transaction', '--routines', '--hex-blob', '--default-character-set=utf8mb4', db.database], { env: clientEnv(db) });
    const out = createWriteStream(file);
    let err = '', code = null, closed = false;
    const settle = () => { if (code === null || !closed) return; code === 0 ? resolve() : reject(new Error('mysqldump falhou: ' + err)); };
    dump.stderr.on('data', d => { err += d; });
    dump.on('error', reject);
    dump.on('close', c => { code = c; settle(); });
    out.on('finish', () => { closed = true; settle(); });
    dump.stdout.pipe(createGzip()).pipe(out);
  });
  const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
  const manifest = { database: db.database, createdAt: new Date().toISOString(), file: path.basename(file), bytes: statSync(file).size, sha256: sha, tableCounts: counts };
  writeFileSync(file + '.json', JSON.stringify(manifest, null, 2));
  const keep = Math.max(1, Number(process.env.BACKUP_KEEP ?? 14));
  const old = readdirSync(dir).filter(n => n.startsWith(db.database + '-') && n.endsWith('.sql.gz')).sort().reverse().slice(keep);
  for (const n of old) { rmSync(path.join(dir, n)); rmSync(path.join(dir, n + '.json'), { force: true }); }
  console.log(`Backup criado: ${file} (${manifest.bytes} bytes). Mantidos os ${keep} mais recentes.`);
  console.log('Backup só vale depois de restaurar: rode `npm run backup:verify` periodicamente.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
}
