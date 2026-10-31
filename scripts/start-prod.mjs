// Inicia o servidor em modo produção, forçando NODE_ENV=production mesmo que o .env diga outra coisa.
// Uso: npm run start:prod
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const tsx = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
const server = path.join(root, 'backend', 'src', 'server.ts');
const result = spawnSync(tsx, [server], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
process.exit(result.status ?? 1);
