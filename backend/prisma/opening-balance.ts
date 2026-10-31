import 'dotenv/config';
import { prisma } from '../src/core/db';
import { itemDrift } from '../src/economy/reconcile';
// Saldo de abertura dos itens: registra no livro-razão os itens que já existiam antes dele (kits e itens da v0.4).
// Uso: npm run economy:opening            (só mostra o que faria)
//      npm run economy:opening -- --apply (grava; rode UMA vez, logo após atualizar, com o servidor parado)
// Só diferenças POSITIVAS (itens na mochila sem lançamento) viram abertura; diferença negativa é problema real e é apenas listada.
(async () => {
  const apply = process.argv.includes('--apply');
  const rows = await itemDrift(prisma, 5000);
  const opening = rows.filter(r => r.difference > 0), suspicious = rows.filter(r => r.difference < 0);
  console.log(`${opening.length} lançamento(s) de abertura${apply ? ' serão gravados' : ' (simulação)'}; ${suspicious.length} diferença(s) negativa(s) ignorada(s).`);
  if (suspicious.length) { console.error('Atenção — itens a menos na mochila do que o livro-razão indica:'); console.table(suspicious); process.exitCode = 1; }
  if (apply && opening.length) {
    await prisma.itemLedger.createMany({ data: opening.map(r => ({ characterId: r.characterId, blueprintId: r.blueprintId, delta: r.difference, upgradeTier: 0, reason: 'OPENING', refType: 'opening', refId: null })) });
    console.log('Gravado. Rode npm run economy:reconcile para conferir.');
  }
})().finally(() => prisma.$disconnect());
