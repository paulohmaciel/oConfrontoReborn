import { Prisma, type PrismaClient } from '@prisma/client';
// Conciliação: o ouro em mãos de cada personagem deve ser igual ao saldo gravado na última linha do seu livro-razão.
// Qualquer diferença significa que ouro mudou sem passar por addGold/recordGold (bug, edição manual ou concorrência).
// Personagens sem nenhuma linha no livro-razão (anteriores à v0.5.0 e sem movimento) não entram na comparação.
export interface GoldDrift { characterId: number; name: string; goldInHand: string; ledgerBalance: string; difference: string }
export async function goldDrift(db: PrismaClient | Prisma.TransactionClient, limit = 100): Promise<GoldDrift[]> {
  const rows = await db.$queryRaw<{ id: number; name: string; goldInHand: bigint; balanceAfter: bigint }[]>`
    SELECT c.id, c.name, c.goldInHand, l.balanceAfter
    FROM \`Character\` c
    JOIN \`GoldLedger\` l ON l.id = (SELECT MAX(id) FROM \`GoldLedger\` WHERE characterId = c.id)
    WHERE c.goldInHand <> l.balanceAfter
    ORDER BY c.id LIMIT ${Math.max(1, Math.min(limit, 1000))}`;
  return rows.map(r => ({ characterId: r.id, name: r.name, goldInHand: r.goldInHand.toString(), ledgerBalance: r.balanceAfter.toString(), difference: (r.goldInHand - r.balanceAfter).toString() }));
}

// Itens: para cada (personagem, item) a quantidade na mochila deve ser igual à soma do livro-razão de itens (anúncios abertos
// já saíram da mochila e têm lançamento negativo). O nível de melhoria é ignorado: subir de nível não muda a quantidade.
// Kits anteriores ao livro-razão aparecem aqui até receberem o saldo de abertura (npm run economy:opening).
export interface ItemDrift { characterId: number; blueprintId: number; inventory: number; ledger: number; difference: number }
export async function itemDrift(db: PrismaClient | Prisma.TransactionClient, limit = 100): Promise<ItemDrift[]> {
  const rows = await db.$queryRaw<{ characterId: number; blueprintId: number; inv: bigint; led: bigint }[]>`
    SELECT x.characterId, x.blueprintId, SUM(x.inv) AS inv, SUM(x.led) AS led FROM (
      SELECT characterId, blueprintId, SUM(quantity) AS inv, 0 AS led FROM \`InventoryItem\` GROUP BY characterId, blueprintId
      UNION ALL
      SELECT characterId, blueprintId, 0 AS inv, SUM(delta) AS led FROM \`ItemLedger\` GROUP BY characterId, blueprintId
    ) x GROUP BY x.characterId, x.blueprintId HAVING SUM(x.inv) <> SUM(x.led)
    ORDER BY x.characterId, x.blueprintId LIMIT ${Math.max(1, Math.min(limit, 5000))}`;
  return rows.map(r => ({ characterId: r.characterId, blueprintId: r.blueprintId, inventory: Number(r.inv), ledger: Number(r.led), difference: Number(r.inv) - Number(r.led) }));
}

// Fluxo concentrado: conta que, nos últimos `days` dias, vendeu no Mercado para várias contas recém-criadas.
// É o desenho de "contas descartáveis alimentando uma principal" (cada conta nova nasce com ouro e gasta tudo num anúncio caro da principal).
// Não prova nada sozinho: é um sinal para a equipe olhar. Conta nova = criada até `days` dias antes da compra.
export interface FeederAlert { accountId: number; email: string; seller: string; newBuyers: number; goldFromNew: string; goldTotal: string; share: number }
export async function feederAlerts(db: PrismaClient | Prisma.TransactionClient, days = 7, minNewBuyers = 3, minSharePercent = 50): Promise<FeederAlert[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.$queryRaw<{ accountId: number; email: string; seller: string; newBuyers: bigint; goldFromNew: Prisma.Decimal | bigint | null; goldTotal: Prisma.Decimal | bigint | null }[]>`
    SELECT sa.id AS accountId, sa.email, MIN(sc.name) AS seller,
      COUNT(DISTINCT CASE WHEN ba.createdAt >= DATE_SUB(l.soldAt, INTERVAL ${days} DAY) THEN ba.id END) AS newBuyers,
      SUM(CASE WHEN ba.createdAt >= DATE_SUB(l.soldAt, INTERVAL ${days} DAY) THEN l.price ELSE 0 END) AS goldFromNew,
      SUM(l.price) AS goldTotal
    FROM \`MarketListing\` l
    JOIN \`Character\` sc ON sc.id = l.sellerId JOIN \`Account\` sa ON sa.id = sc.accountId
    JOIN \`Character\` bc ON bc.id = l.buyerId JOIN \`Account\` ba ON ba.id = bc.accountId
    WHERE l.status = 'SOLD' AND l.soldAt >= ${since}
    GROUP BY sa.id, sa.email
    HAVING newBuyers >= ${minNewBuyers}
    ORDER BY goldFromNew DESC LIMIT 100`;
  return rows.map(r => { const fromNew = BigInt(String(r.goldFromNew ?? 0).split('.')[0]), total = BigInt(String(r.goldTotal ?? 0).split('.')[0]);
    return { accountId: r.accountId, email: r.email, seller: r.seller, newBuyers: Number(r.newBuyers), goldFromNew: fromNew.toString(), goldTotal: total.toString(), share: total > 0n ? Number(fromNew * 100n / total) : 0 }; })
    .filter(a => a.share >= minSharePercent);
}
