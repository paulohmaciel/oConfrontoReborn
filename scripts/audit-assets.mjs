// Lista todo sprite usado, com origem e hash, para revisão de licença. Uso: npm run assets:audit
import { readFileSync } from 'node:fs';
const m = JSON.parse(readFileSync('frontend/public/assets/tibia/manifest.json', 'utf8'));
console.log(`Origem: ${m.source}\nCrédito: ${m.credit}\nTexto de copyright consultado: ${m.copyrightSource}\n`);
console.log(`${m.entries.length} sprites:\n`);
for (const e of m.entries) console.log(`- ${e.name.padEnd(18)} ${e.sourceMethod.padEnd(22)} ${e.sourcePage ?? e.sourceUrl}`);
const weak = m.entries.filter(e => e.sourceMethod !== 'public-file-verified');
if (weak.length) console.log(`\nAtenção: ${weak.length} sprite(s) sem verificação pública do arquivo: ${weak.map(e => e.name).join(', ')}`);
console.log('\nTodos são arte da CipSoft GmbH. Para lançamento comercial, substitua-os (ver ASSETS-LICENCA.md).');
