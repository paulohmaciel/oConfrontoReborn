// Confere as "gavetas": cada pasta só pode depender das gavetas abaixo dela. Uso: npm run check:drawers
// Regras (backend, de baixo para cima): core < economy < premium < game < account < admin < server.
// Frontend: lib < ui < features/* < App/main; features só importam outra feature se estiver na lista abaixo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const backendOrder = ['core', 'economy', 'premium', 'game', 'account', 'admin', 'server'];
const featureLinks = { admin: ['ledger'], auth: ['adventure'], characters: ['adventure'] }; // exceções declaradas
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
})('.');

const importsOf = file => [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(m => path.normalize(path.join(path.dirname(file), m[1])));
const problems = [];
const backendDrawer = f => { const p = f.split(path.sep); return p[0] === 'backend' && p[1] === 'src' ? (p.length > 3 ? p[2] : 'server') : null; };
const frontendPart = f => { const p = f.split(path.sep); if (p[0] !== 'frontend' || p[1] !== 'src') return null; if (p[2] === 'features') return { kind: 'feature', name: p[3] }; if (p.length > 3) return { kind: p[2] }; return { kind: 'app' }; };

for (const file of files) {
  const isTest = /\.test\.tsx?$/.test(file) || file.startsWith(path.join('backend', 'tests'));
  const from = file.split(path.sep);
  for (const target of importsOf(file)) {
    const t = target.split(path.sep);
    if (t[0] === 'frontend' && t[1] === 'public') continue; // dados estáticos (ex.: manifest de sprites) podem ser lidos pelo seed
    // regras globais
    if (from[0] === 'shared' && (t[0] === 'backend' || t[0] === 'frontend')) problems.push(`${file}: shared não pode importar ${t[0]}`);
    if (from[0] === 'frontend' && t[0] === 'backend') problems.push(`${file}: frontend não pode importar backend (use shared/)`);
    if (from[0] === 'backend' && t[0] === 'frontend') problems.push(`${file}: backend não pode importar frontend`);
    // backend: só gavetas abaixo
    const a = backendDrawer(file), b = t[0] === 'backend' && t[1] === 'src' ? (t.length > 3 ? t[2] : 'server') : null;
    if (a && b && a !== b && !isTest && backendOrder.indexOf(b) > backendOrder.indexOf(a))
      problems.push(`${file}: a gaveta ${a} não pode depender de ${b} (só das de baixo: ${backendOrder.slice(0, backendOrder.indexOf(a)).join(', ') || 'nenhuma'})`);
    // frontend
    const fa = frontendPart(file);
    if (fa && t[0] === 'frontend' && t[1] === 'src') {
      const fb = frontendPart(target + '.ts');
      if (fa.kind === 'lib' && fb.kind !== 'lib') problems.push(`${file}: lib não pode depender de ${fb.kind}`);
      if (fa.kind === 'ui' && !['lib', 'ui'].includes(fb.kind)) problems.push(`${file}: ui só pode depender de lib`);
      if (fa.kind === 'feature' && fb.kind === 'app') problems.push(`${file}: feature não pode importar App/main`);
      if (fa.kind === 'feature' && fb.kind === 'feature' && fa.name !== fb.name && !(featureLinks[fa.name] ?? []).includes(fb.name))
        problems.push(`${file}: a feature ${fa.name} não pode importar a feature ${fb.name} (declare em featureLinks se for intencional)`);
    }
  }
}
if (problems.length) { console.error('Dependências fora das gavetas:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log(`OK: ${files.length} arquivos respeitam as gavetas.`);
