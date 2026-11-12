import 'dotenv/config';
import { prisma } from '../src/core/db';
import { goldDrift, itemDrift, feederAlerts } from '../src/economy/reconcile';
// Uso: npm run economy:reconcile   (somente leitura; sai com código 1 se houver diferença)
(async () => {
  const [gold, items] = await Promise.all([goldDrift(prisma, 1000), itemDrift(prisma, 1000)]);
  if (!gold.length) console.log('OK ouro: confere com o livro-razão.'); else { console.error(`${gold.length} personagem(ns) com diferença de ouro:`); console.table(gold); process.exitCode = 1; }
  if (!items.length) console.log('OK itens: a mochila confere com o livro-razão de itens.'); else { console.error(`${items.length} item(ns) com diferença (kits antigos? rode npm run economy:opening):`); console.table(items); process.exitCode = 1; }
  // Sinal para a equipe (não muda o código de saída): contas que venderam para várias contas recém-criadas.
  const feeders = await feederAlerts(prisma);
  if (!feeders.length) console.log('OK fluxo: nenhuma conta recebeu ouro de várias contas novas pelo Mercado nos últimos 7 dias.');
  else { console.warn(`Atenção: ${feeders.length} conta(s) venderam no Mercado para 3 ou mais contas criadas há menos de 7 dias (confira no painel da Equipe):`); console.table(feeders); }
})().finally(() => prisma.$disconnect());
