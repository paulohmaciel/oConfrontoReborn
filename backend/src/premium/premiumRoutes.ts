import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { isPremium } from './premium';
import { premiumOverview, startCheckout } from './premiumService';
import { loadSettings } from '../core/settings';
import { frames, profileTitles, emblems } from '../../../shared/premium';
import { vocationAllowed } from '../../../shared/adventure';

export const premiumRoutes = Router();
async function requirePremium(accountId: number) {
  if (!await isPremium(prisma, accountId)) throw new GameError(402, 'Este recurso faz parte do Premium.');
}
async function ownedCharacter(req: { params: Record<string, string> }, accountId: number) {
  const id = integer(Number(req.params.id));
  const c = await prisma.character.findFirst({ where: { id, accountId }, select: { id: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  return id;
}
premiumRoutes.get('/premium', asyncRoute(async (_req, res) => { res.json(await premiumOverview(res.locals.accountId)); }));
premiumRoutes.post('/premium/checkout', asyncRoute(async (_req, res) => { res.json(await startCheckout(res.locals.accountId)); }));

// ----- Conjuntos de equipamento -----
premiumRoutes.get('/characters/:id/presets', asyncRoute(async (req, res) => {
  const id = await ownedCharacter(req, res.locals.accountId);
  res.json(await prisma.characterPreset.findMany({ where: { characterId: id }, orderBy: { id: 'asc' } }));
}));
premiumRoutes.post('/characters/:id/presets', asyncRoute(async (req, res) => {
  const accountId = res.locals.accountId, characterId = integer(Number(req.params.id));
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 1 || name.length > 30) throw new GameError(400, 'Dê ao conjunto um nome de 1 a 30 caracteres.');
  res.json(await transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    if (!await isPremium(tx, accountId)) throw new GameError(402, 'Este recurso faz parte do Premium.');
    const settings = await loadSettings(tx);
    const equipped = await tx.inventoryItem.findMany({ where: { characterId, isEquipped: true }, select: { id: true } });
    if (!equipped.length) throw new GameError(409, 'Equipe algo antes de salvar um conjunto.');
    const existing = await tx.characterPreset.findUnique({ where: { characterId_name: { characterId, name } } });
    if (!existing && await tx.characterPreset.count({ where: { characterId } }) >= settings['premium.presetLimit']) throw new GameError(409, `Limite de ${settings['premium.presetLimit']} conjuntos.`);
    const itemIds = equipped.map(i => i.id);
    return existing ? tx.characterPreset.update({ where: { id: existing.id }, data: { itemIds } }) : tx.characterPreset.create({ data: { characterId, name, itemIds } });
  }));
}));
premiumRoutes.post('/characters/:id/presets/:presetId/apply', asyncRoute(async (req, res) => {
  const accountId = res.locals.accountId, characterId = integer(Number(req.params.id)), presetId = integer(Number(req.params.presetId));
  res.json(await transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    if (!await isPremium(tx, accountId)) throw new GameError(402, 'Este recurso faz parte do Premium.');
    if (await tx.battle.findFirst({ where: { characterId, isFinished: false } })) throw new GameError(409, 'Não é possível trocar equipamentos durante o combate.');
    const preset = await tx.characterPreset.findFirst({ where: { id: presetId, characterId } });
    if (!preset) throw new GameError(404, 'Conjunto não encontrado.');
    const ids = (Array.isArray(preset.itemIds) ? preset.itemIds : []).filter((n): n is number => typeof n === 'number');
    const items = await tx.inventoryItem.findMany({ where: { id: { in: ids }, characterId }, include: { blueprint: true } });
    let equipped = 0, skipped = ids.length - items.length;
    const usedSlots = new Set<string>();
    for (const item of items) {
      const bp = item.blueprint;
      if (['LOOT', 'CONSUMABLE'].includes(bp.slot) || item.quantity !== 1 || bp.minLevel > c.level || !vocationAllowed(bp.vocations, c.vocation) || usedSlots.has(bp.slot)) { skipped++; continue; }
      usedSlots.add(bp.slot);
      await tx.inventoryItem.updateMany({ where: { characterId, equippedSlot: bp.slot, id: { not: item.id } }, data: { isEquipped: false, equippedSlot: null } });
      await tx.inventoryItem.update({ where: { id: item.id }, data: { isEquipped: true, equippedSlot: bp.slot } });
      equipped++;
    }
    return { equipped, skipped };
  }));
}));
premiumRoutes.post('/characters/:id/presets/:presetId/delete', asyncRoute(async (req, res) => {
  const characterId = await ownedCharacter(req, res.locals.accountId);
  await prisma.characterPreset.deleteMany({ where: { id: integer(Number(req.params.presetId)), characterId } });
  res.json({ ok: true });
}));

// ----- Organização da mochila e perfil -----
premiumRoutes.post('/characters/:id/inventory/:itemId/favorite', asyncRoute(async (req, res) => {
  const characterId = await ownedCharacter(req, res.locals.accountId);
  await requirePremium(res.locals.accountId);
  if (typeof req.body?.favorite !== 'boolean') throw new GameError(400, 'Valor inválido.');
  const result = await prisma.inventoryItem.updateMany({ where: { id: integer(Number(req.params.itemId)), characterId }, data: { favorite: req.body.favorite } });
  if (!result.count) throw new GameError(404, 'Item não encontrado.');
  res.json({ ok: true });
}));
premiumRoutes.post('/characters/:id/profile', asyncRoute(async (req, res) => {
  const characterId = await ownedCharacter(req, res.locals.accountId);
  await requirePremium(res.locals.accountId);
  const { title, emblem, frame } = req.body ?? {};
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.replace(/[\u0000-\u001f\u007f]/g, ' ').trim() : '';
  if (bio.length > 160) throw new GameError(400, 'A apresentação pode ter até 160 caracteres.');
  if (title !== null && title !== undefined && !profileTitles.some(t => t.key === title)) throw new GameError(400, 'Título inválido.');
  if (emblem !== null && emblem !== undefined && !(emblems as readonly string[]).includes(emblem)) throw new GameError(400, 'Emblema inválido.');
  if (frame !== null && frame !== undefined && !frames.some(f => f.key === frame)) throw new GameError(400, 'Moldura inválida.');
  await prisma.character.update({ where: { id: characterId }, data: { profileTitle: title ?? null, profileEmblem: emblem ?? null, profileFrame: frame && frame !== 'none' ? frame : null, profileBio: bio || null } });
  res.json({ ok: true });
}));

// ----- Diário detalhado -----
premiumRoutes.get('/characters/:id/hunt-stats', asyncRoute(async (req, res) => {
  const characterId = await ownedCharacter(req, res.locals.accountId);
  await requirePremium(res.locals.accountId);
  const days = [7, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const since = new Date(Date.now() - days * 86_400_000);
  const battles = await prisma.battle.findMany({ where: { characterId, isFinished: true, createdAt: { gte: since } }, select: { createdAt: true, outcome: true, rewardGold: true, rewardExperience: true, monsterId: true }, orderBy: { id: 'desc' }, take: 5000 });
  const monsters = await prisma.monster.findMany({ where: { id: { in: [...new Set(battles.map(b => b.monsterId))] } }, select: { id: true, name: true, spriteUrl: true } });
  const totals = { battles: battles.length, victories: 0, defeats: 0, flees: 0, gold: 0n, experience: 0 };
  const byMonster = new Map<number, { name: string; spriteUrl: string; battles: number; victories: number; gold: bigint; experience: number }>();
  const byDay = new Map<string, { battles: number; victories: number; gold: bigint; experience: number }>();
  for (const b of battles) {
    const win = b.outcome === 'VICTORY';
    if (win) totals.victories++; else if (b.outcome === 'DEFEAT') totals.defeats++; else if (b.outcome === 'FLED') totals.flees++;
    totals.gold += b.rewardGold; totals.experience += b.rewardExperience;
    const m = monsters.find(x => x.id === b.monsterId);
    const row = byMonster.get(b.monsterId) ?? { name: m?.name ?? '?', spriteUrl: m?.spriteUrl ?? '', battles: 0, victories: 0, gold: 0n, experience: 0 };
    row.battles++; if (win) row.victories++; row.gold += b.rewardGold; row.experience += b.rewardExperience; byMonster.set(b.monsterId, row);
    const key = b.createdAt.toISOString().slice(0, 10);
    const d = byDay.get(key) ?? { battles: 0, victories: 0, gold: 0n, experience: 0 };
    d.battles++; if (win) d.victories++; d.gold += b.rewardGold; d.experience += b.rewardExperience; byDay.set(key, d);
  }
  res.json({ days, totals: { ...totals, gold: totals.gold.toString(), winRate: totals.battles ? Math.round(totals.victories * 100 / totals.battles) : 0 },
    byMonster: [...byMonster.values()].sort((a, b) => b.battles - a.battles).map(r => ({ ...r, gold: r.gold.toString() })),
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, r]) => ({ day, ...r, gold: r.gold.toString() })) });
}));
