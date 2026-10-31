// Uso (só desenvolvimento): npm run dev:market-demo
// Cria o vendedor "Mercador de Testes" e anuncia alguns itens no Mercado com preços de teste, pelo mesmo serviço do jogo
// (taxa de anúncio, extrato e expiração normais). Rodar de novo só completa o que faltar. Apague a conta antes de publicar.
import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { prisma, transaction } from '../backend/src/core/db';
import { hashPassword } from '../backend/src/core/password';
import { addGold, addItem } from '../backend/src/economy/economy';
import { listItem } from '../backend/src/economy/marketService';

const EMAIL = 'vendedor-teste@example.invalid', NAME = 'Mercador de Testes';
// [item, quantidade, melhoria, preço da pilha]
const offers: [string, number, number, string][] = [
  ['Health Potion', 20, 0, '400'], ['Mana Potion', 20, 0, '500'], ['Fire Sword', 1, 3, '9500'], ['Crossbow', 1, 0, '6000'],
  ['Skull Staff', 1, 0, '20000'], ['Boots of Haste', 1, 0, '45000'], ['Demon Helmet', 1, 5, '85000'], ['Magic Plate Armor', 1, 0, '120000'],
  ['Guardian Halberd', 1, 0, '150000'], ['Royal Draken Mail', 1, 2, '180000'], ['Sudden Death Rune', 1, 0, '900000'],
  ['Rubi Bruto', 10, 0, '2000'], ['Esmeralda Bruta', 8, 0, '15000'], ['Essência Demoníaca', 5, 0, '3000000'], ['Fire Sword de Capriel', 1, 2, '25000000'],
];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Este script é só para desenvolvimento.');
  let account = await prisma.account.findUnique({ where: { email: EMAIL }, include: { characters: true } });
  if (!account) account = await prisma.account.create({ data: { email: EMAIL, password: await hashPassword(randomBytes(24).toString('base64url')),
    characters: { create: { name: NAME, vocation: 'KNIGHT', vocationChosen: true, level: 50 } } }, include: { characters: true } });
  const seller = account.characters[0];
  const open = await prisma.marketListing.findMany({ where: { sellerId: seller.id, status: 'OPEN' }, include: { blueprint: { select: { name: true } } } });
  const listed = new Set(open.map(l => l.blueprint.name));
  let created = 0;
  for (const [name, quantity, tier, price] of offers) {
    if (listed.has(name)) continue;
    const bp = await prisma.itemBlueprint.findUnique({ where: { name } });
    if (!bp) { console.log(`- ${name}: não existe neste banco (rode npm run seed), pulado.`); continue; }
    // O vendedor recebe o item e o ouro da taxa pelo extrato (ADMIN_GRANT), e anuncia pelo serviço normal do Mercado.
    const itemId = await transaction(async tx => {
      await addGold(tx, seller.id, 1000n, 'ADMIN_GRANT', { type: 'dev-market-demo', id: bp.id });
      return (await addItem(tx, seller.id, bp.id, quantity, 'ADMIN_GRANT', { type: 'dev-market-demo', id: bp.id }, tier)).id;
    });
    await listItem(account.id, seller.id, itemId, price, randomUUID());
    console.log(`+ ${name}${tier ? ` +${tier}` : ''} ×${quantity} por ${BigInt(price).toLocaleString('pt-BR')} ouro`);
    created++;
  }
  console.log(`\n${created} anúncio(s) novo(s); ${open.length} já estavam abertos. Vendedor: ${NAME} (${EMAIL}).`);
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
