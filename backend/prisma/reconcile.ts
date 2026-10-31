import 'dotenv/config';
import { prisma } from '../src/core/db';
import { goldDrift, itemDrift } from '../src/economy/reconcile';
// Uso: npm run economy:reconcile   (somente leitura; sai com código 1 se houver diferença)
(async () => {
  const [gold, items] = await Promise.all([goldDrift(prisma, 1000), itemDrift(prisma, 1000)]);
  if (!gold.length) console.log('OK ouro: confere com o livro-razão.'); else { console.error(`${gold.length} personagem(ns) com diferença de ouro:`); console.table(gold); process.exitCode = 1; }
  if (!items.length) console.log('OK itens: a mochila confere com o livro-razão de itens.'); else { console.error(`${items.length} item(ns) com diferença (kits antigos? rode npm run economy:opening):`); console.table(items); process.exitCode = 1; }
})().finally(() => prisma.$disconnect());
