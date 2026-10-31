import { PROTECTION_STONE } from '../../../shared/economy';
import { Router } from 'express';
import type { Prisma, ItemSlot } from '@prisma/client';
import { asyncRoute, pageOf, paged } from '../core/http';
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer, getExpForLevel } from '../core/engine';
import { buyListing, cancelListing, listItem, expireListings } from '../economy/marketService';
import { loadSettings } from '../core/settings';
import { isPremium } from '../premium/premium';
import { npcBuyPrice } from '../../../shared/economy';
import { forgeableSlots } from '../../../shared/forge';
import { combatStats } from './combatStats';
export const readRoutes = Router();
readRoutes.get('/me', asyncRoute(async (_req, res) => {
  const characters = await prisma.character.findMany({ where: { accountId: res.locals.accountId }, select: { id: true, name: true, level: true, vocation: true, classTier: true } });
  res.json({ characters });
}));
readRoutes.get('/characters/:id', asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id));
  // Leitura sem bloqueio: o painel consulta com frequência e não deve competir com as mutações do personagem.
  const c = await prisma.character.findFirst({ where: { id, accountId: res.locals.accountId } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const [equipment, active, stones] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { characterId: id, isEquipped: true }, include: { blueprint: true, rareItem: { select: { id: true, serial: true, status: true } } } }),
    prisma.battle.findFirst({ where: { characterId: id, isFinished: false }, select: { id: true } }),
    prisma.inventoryItem.aggregate({ where: { characterId: id, blueprint: { name: PROTECTION_STONE } }, _sum: { quantity: true } })]);
  res.json({ ...c, equipment, protectionStones: stones._sum.quantity ?? 0, activeBattleId: active?.id ?? null, combat: combatStats(c,equipment), nextLevelExp: getExpForLevel(c.level+1) });
}));
readRoutes.get('/characters/:id/inventory', asyncRoute(async (req, res) => {
  const id = integer(Number(req.params.id));
  const page = integer(Number(req.query.page ?? 1));
  const character = await prisma.character.findFirst({ where: { id, accountId: res.locals.accountId }, select: { id: true } });
  if (!character) throw new GameError(404, 'Personagem não encontrado.');
  const slot = typeof req.query.slot === 'string' && /^[A-Z]{3,12}$/.test(req.query.slot) ? req.query.slot : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 40) : '';
  const onlyFavorites = req.query.favorites === '1';
  // Busca por nome e favoritos fazem parte da organização avançada da mochila (Premium).
  if ((q || onlyFavorites) && !await isPremium(prisma, res.locals.accountId)) throw new GameError(402, 'Busca e favoritos fazem parte do Premium.');
  const blueprint: Prisma.ItemBlueprintWhereInput = { ...(slot ? { slot: slot as ItemSlot } : {}), ...(q ? { name: { contains: q } } : {}) };
  const where: Prisma.InventoryItemWhereInput = { characterId: id, isEquipped: false, ...(Object.keys(blueprint).length ? { blueprint } : {}), ...(onlyFavorites ? { favorite: true } : {}) };
  const [items,total] = await Promise.all([prisma.inventoryItem.findMany({ where, include: { blueprint: true, rareItem: { select: { id: true, serial: true, status: true } } }, orderBy: { id: 'asc' }, take: 10, skip: (page-1)*10 }),prisma.inventoryItem.count({ where })]);
  res.json(paged(items, total, page));
}));
readRoutes.get('/monsters', asyncRoute(async (_req,res) => { res.json(await prisma.monster.findMany({ orderBy: { level: 'asc' }, take: 200 })); }));
readRoutes.get('/shop', asyncRoute(async (_req,res) => {
  // Equipamento acima do nível configurado só sai do Ferreiro (fabricar/reforjar) ou do loot.
  const settings = await loadSettings(prisma);
  const items = await prisma.itemBlueprint.findMany({ where: { npcPrice: { gt: 0 }, OR: [{ slot: { notIn: [...forgeableSlots] } }, { minLevel: { lte: settings['shop.maxEquipmentLevel'] } }] }, orderBy: { npcPrice: 'asc' }, take: 400 });
  res.json(items.map(i => ({ ...i, price: Number(npcBuyPrice(i.npcPrice, settings['economy.npcBuyPercent'])) })));
}));
readRoutes.get('/market', asyncRoute(async (req,res) => {
  const { page, skip, take } = pageOf(req.query), q = String(req.query.q ?? '').trim().slice(0, 40);
  await expireListings(20);
  // Mais recentes primeiro; a busca filtra pelo nome do item.
  const where: Prisma.MarketListingWhereInput = { status: 'OPEN', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], ...(q ? { blueprint: { name: { contains: q } } } : {}) };
  const [items, total] = await Promise.all([prisma.marketListing.findMany({ where, include: { blueprint: true, seller: { select: { name: true } } }, orderBy: { id: 'desc' }, skip, take }), prisma.marketListing.count({ where })]);
  res.json(paged(items, total, page));
}));
readRoutes.post('/characters/:id/market', asyncRoute(async (req,res) => { res.json(await listItem(res.locals.accountId, integer(Number(req.params.id)), integer(req.body?.itemId), req.body?.price, req.get('idempotency-key') ?? '')); }));
readRoutes.post('/characters/:id/market/:listing/buy', asyncRoute(async (req,res) => { res.json(await buyListing(res.locals.accountId, integer(Number(req.params.id)), integer(Number(req.params.listing)))); }));
readRoutes.post('/characters/:id/market/:listing/cancel', asyncRoute(async (req,res) => { res.json(await cancelListing(res.locals.accountId, integer(Number(req.params.id)), integer(Number(req.params.listing)))); }));
