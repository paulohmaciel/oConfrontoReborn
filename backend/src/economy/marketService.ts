import { Prisma } from '@prisma/client';
import { prisma, transaction, lockCharacter, lockCharacterAny } from '../core/db';
import { GameError, integer } from '../core/engine';
import { once } from '../core/operations';
import { addGold, addItem, assertNotFavorite, recordItem } from './economy';
import { loadSettings } from '../core/settings';
import { saleFee } from '../../../shared/economy';
const MAX_GOLD = 1000000000000n;
const MAX_OPEN_LISTINGS = 20;
export function parsePrice(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,12}$/.test(value)) throw new GameError(400, 'Preço inválido.');
  const n = BigInt(value);
  if (n > MAX_GOLD) throw new GameError(400, 'Preço acima do limite.');
  return n;
}
async function assertCanTrade(tx: Prisma.TransactionClient, accountId: number) {
  const now = new Date();
  const ban = await tx.punishment.findFirst({ where: { accountId, kind: 'MARKET_BAN', revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } });
  if (ban) throw new GameError(403, 'Você está impedido de usar o mercado no momento.');
}
export async function listItem(accountId: number, characterId: number, itemId: number, priceText: unknown, key: string) {
  integer(itemId); const price = parsePrice(priceText);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['list', itemId, price.toString()], async () => {
      await assertCanTrade(tx, accountId);
      if (await tx.battle.findFirst({ where: { characterId, isFinished: false }, select: { id: true } })) throw new GameError(409, 'Encerre o combate antes de anunciar.');
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId } });
      if (!item) throw new GameError(404, 'Item não encontrado.');
      if (item.isEquipped || item.equippedSlot || item.quantity < 1) throw new GameError(409, 'Desequipe o item primeiro.');
      assertNotFavorite(item, 'anunciar');
      if (await tx.marketListing.count({ where: { sellerId: characterId, status: 'OPEN' } }) >= MAX_OPEN_LISTINGS) throw new GameError(409, `Limite de ${MAX_OPEN_LISTINGS} anúncios abertos.`);
      const settings = await loadSettings(tx), listingFee = BigInt(settings['market.listingFeeGold']);
      if (c.goldInHand < listingFee) throw new GameError(409, `Ouro insuficiente para a taxa de anúncio (${listingFee}).`);
      const expiresAt = new Date(Date.now() + settings['market.durationHours'] * 3_600_000);
      const listing = await tx.marketListing.create({ data: { sellerId: characterId, blueprintId: item.blueprintId, quantity: item.quantity, upgradeTier: item.upgradeTier, rareItemId: item.rareItemId, price, expiresAt, listingFee } });
      await addGold(tx, characterId, -listingFee, 'MARKET_LISTING_FEE', { type: 'listing', id: listing.id });
      await tx.inventoryItem.delete({ where: { id: item.id } });
      await recordItem(tx, characterId, item.blueprintId, -item.quantity, 'MARKET_LIST', { type: 'listing', id: listing.id }, item.upgradeTier);
      return { listingId: listing.id, expiresAt, listingFee: listingFee.toString() };
    });
  });
}
export async function buyListing(accountId: number, characterId: number, listingId: number) {
  integer(listingId);
  return transaction(async tx => {
    // Ordem global: personagens em ordem de ID, depois anúncio. Evita deadlock em compras cruzadas.
    const hint = await tx.marketListing.findUnique({ where: { id: listingId }, select: { sellerId: true, seller: { select: { accountId: true } } } });
    if (!hint) throw new GameError(404, 'Anúncio não encontrado.');
    if (hint.sellerId === characterId) throw new GameError(409, 'Você não pode comprar seu anúncio.');
    // Entre personagens da mesma conta o mercado viraria um caixa de transferência de ouro (só 5% de taxa). Use o próprio inventário.
    if (hint.seller.accountId === accountId) throw new GameError(409, 'Você não pode comprar anúncios de outro personagem da sua conta.');
    for (const id of [characterId, hint.sellerId].sort((a,b) => a-b)) {
      await tx.$queryRaw`SELECT id FROM \`Character\` WHERE id = ${id} FOR UPDATE`;
    }
    const buyer = await lockCharacter(tx, accountId, characterId);
    await assertCanTrade(tx, accountId);
    await tx.$queryRaw`SELECT id FROM MarketListing WHERE id = ${listingId} FOR UPDATE`;
    const listing = await tx.marketListing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.status === 'SOLD' && listing.buyerId === characterId) return { listingId, status: 'SOLD' };
    if (listing.status !== 'OPEN') throw new GameError(409, 'Anúncio indisponível.');
    if (listing.expiresAt && listing.expiresAt <= new Date()) throw new GameError(409, 'Este anúncio expirou.');
    if (listing.price <= 0 || buyer.goldInHand < listing.price) throw new GameError(409, 'Ouro insuficiente.');
    const settings = await loadSettings(tx), fee = saleFee(listing.price, settings['market.saleFeePercent']);
    const ref = { type: 'listing', id: listingId };
    await addGold(tx, characterId, 0n - listing.price, 'MARKET_PURCHASE', ref);
    await addGold(tx, listing.sellerId, listing.price, 'MARKET_SALE', ref);
    await addGold(tx, listing.sellerId, -fee, 'MARKET_FEE', ref);
    await addItem(tx, characterId, listing.blueprintId, listing.quantity, 'MARKET_BUY', ref, listing.upgradeTier, listing.rareItemId);
    await tx.marketListing.update({ where: { id: listingId }, data: { status: 'SOLD', buyerId: characterId, soldAt: new Date(), fee } });
    return { listingId, status: 'SOLD', fee: fee.toString() };
  });
}
export async function cancelListing(accountId: number, characterId: number, listingId: number) {
  integer(listingId);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    await tx.$queryRaw`SELECT id FROM MarketListing WHERE id = ${listingId} FOR UPDATE`;
    const listing = await tx.marketListing.findFirst({ where: { id: listingId, sellerId: characterId } });
    if (!listing) throw new GameError(404, 'Anúncio não encontrado.');
    if (listing.status === 'CANCELLED' || listing.status === 'EXPIRED') return { listingId, status: listing.status };
    if (listing.status !== 'OPEN') throw new GameError(409, 'Anúncio já vendido.');
    await addItem(tx, characterId, listing.blueprintId, listing.quantity, 'MARKET_RETURN', { type: 'listing', id: listingId }, listing.upgradeTier, listing.rareItemId);
    await tx.marketListing.update({ where: { id: listingId }, data: { status: 'CANCELLED' } });
    return { listingId, status: 'CANCELLED' };
  });
}
// Devolve ao vendedor os itens de anúncios vencidos (a taxa de anúncio não é reembolsada). Idempotente; seguro rodar em paralelo.
export async function expireListings(limit = 50) {
  const due = await prisma.marketListing.findMany({ where: { status: 'OPEN', expiresAt: { lte: new Date() } }, select: { id: true, sellerId: true }, orderBy: { id: 'asc' }, take: limit });
  let expired = 0;
  for (const { id, sellerId } of due) {
    try {
      await transaction(async tx => {
        await lockCharacterAny(tx, sellerId);
        await tx.$queryRaw`SELECT id FROM MarketListing WHERE id = ${id} FOR UPDATE`;
        const listing = await tx.marketListing.findUniqueOrThrow({ where: { id } });
        if (listing.status !== 'OPEN' || !listing.expiresAt || listing.expiresAt > new Date()) return;
        await addItem(tx, sellerId, listing.blueprintId, listing.quantity, 'MARKET_RETURN', { type: 'listing', id }, listing.upgradeTier, listing.rareItemId);
        await tx.marketListing.update({ where: { id }, data: { status: 'EXPIRED' } });
        expired++;
      });
    } catch (error) { console.error(`[mercado] falha ao expirar o anúncio ${id}:`, error instanceof Error ? error.message : error); }
  }
  return expired;
}
