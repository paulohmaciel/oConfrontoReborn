import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { prisma } from '../core/db';
import { GameError, integer } from '../core/engine';
import { loadSettings } from '../core/settings';
import { goldReasons } from '../../../shared/economy';
import { publicRare } from './rare';

export const economyRoutes = Router();
// Valores que a interface precisa para mostrar preços e taxas corretos (nada sensível).
economyRoutes.get('/config', asyncRoute(async (_req, res) => {
  const s = await loadSettings(prisma);
  res.json({ saleFeePercent: s['market.saleFeePercent'], listingFeeGold: s['market.listingFeeGold'], listingHours: s['market.durationHours'], npcBuyPercent: s['economy.npcBuyPercent'],
    npcSellPercent: s['economy.npcSellPercent'], upgradePercent: s['economy.upgradePricePercent'], promotionGold: s['class.promotionGold'], presetLimit: s['premium.presetLimit'], xpPercent: s['economy.xpRewardPercent'], goldPercent: s['economy.goldRewardPercent'], safeUntilTier: s['upgrade.safeUntilTier'], breakFromTier: s['upgrade.breakFromTier'], breakOnFailPercent: s['upgrade.breakOnFailPercent'] });
}));
economyRoutes.get('/characters/:id/ledger', asyncRoute(async (req, res) => {
  const characterId = integer(Number(req.params.id)), before = integer(Number(req.query.before ?? 2147483647));
  if (!await prisma.character.findFirst({ where: { id: characterId, accountId: res.locals.accountId }, select: { id: true } })) throw new GameError(404, 'Personagem não encontrado.');
  const rows = await prisma.goldLedger.findMany({ where: { characterId, id: { lt: before } }, orderBy: { id: 'desc' }, take: 31 });
  res.json({ entries: rows.slice(0, 30).map(r => ({ id: r.id, delta: r.delta.toString(), balanceAfter: r.balanceAfter.toString(), reason: r.reason, kind: goldReasons[r.reason as keyof typeof goldReasons] ?? 'source', createdAt: r.createdAt })), nextBefore: rows.length > 30 ? rows[29].id : null });
}));
economyRoutes.get('/characters/:id/market/history', asyncRoute(async (req, res) => {
  const characterId = integer(Number(req.params.id));
  if (!await prisma.character.findFirst({ where: { id: characterId, accountId: res.locals.accountId }, select: { id: true } })) throw new GameError(404, 'Personagem não encontrado.');
  const rows = await prisma.marketListing.findMany({ where: { status: { not: 'OPEN' }, OR: [{ sellerId: characterId }, { buyerId: characterId }] }, include: { blueprint: { select: { name: true, spriteUrl: true } } }, orderBy: { id: 'desc' }, take: 50 });
  res.json(rows.map(l => ({ id: l.id, item: l.blueprint, quantity: l.quantity, upgradeTier: l.upgradeTier, price: l.price.toString(), fee: l.fee.toString(), status: l.status,
    role: l.sellerId === characterId ? 'SELLER' : 'BUYER', soldAt: l.soldAt, createdAt: l.createdAt })));
}));
// Preços recentes ajudam a precificar. Sem nomes de jogadores.
economyRoutes.get('/market/sales', asyncRoute(async (_req, res) => {
  const rows = await prisma.marketListing.findMany({ where: { status: 'SOLD' }, include: { blueprint: { select: { name: true, spriteUrl: true } } }, orderBy: { id: 'desc' }, take: 20 });
  res.json(rows.map(l => ({ id: l.id, item: l.blueprint, quantity: l.quantity, upgradeTier: l.upgradeTier, price: l.price.toString(), soldAt: l.soldAt })));
}));

// ----- Itens raros (equipamentos +10): inspeção para qualquer jogador conectado -----
const rareInclude = { blueprint: { select: { name: true, spriteUrl: true } }, creator: { select: { name: true, fameHidden: true } } } as const;
economyRoutes.get('/rare-items', asyncRoute(async (req, res) => {
  const blueprintId = req.query.blueprintId ? integer(Number(req.query.blueprintId)) : undefined;
  const [rows, circulating, destroyed] = await Promise.all([
    prisma.rareItem.findMany({ where: blueprintId ? { blueprintId } : {}, include: rareInclude, orderBy: { id: 'desc' }, take: 50 }),
    prisma.rareItem.count({ where: { status: 'CIRCULATING', ...(blueprintId ? { blueprintId } : {}) } }),
    prisma.rareItem.count({ where: { status: { not: 'CIRCULATING' }, ...(blueprintId ? { blueprintId } : {}) } })]);
  res.json({ circulating, destroyed, items: rows.map(publicRare) });
}));
economyRoutes.get('/rare-items/:id', asyncRoute(async (req, res) => {
  const r = await prisma.rareItem.findUnique({ where: { id: integer(Number(req.params.id)) }, include: { ...rareInclude, events: { orderBy: { id: 'asc' }, take: 50 } } });
  if (!r) throw new GameError(404, 'Item raro não encontrado.');
  res.json(publicRare(r));
}));
