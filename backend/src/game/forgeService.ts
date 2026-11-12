// Ferreiro além da melhoria: fabricar com materiais, reforjar para um item de nível maior e desmontar em materiais.
// Toda mutação trava o personagem, passa por addGold/addItem/recordItem/takeStack e é idempotente pela chave da operação.
import { Prisma } from '@prisma/client';
import { once } from '../core/operations';
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { loadSettings } from '../core/settings';
import { addGold, addItem, assertNotFavorite, recordItem, takeStack } from '../economy/economy';
import { event } from './adventureService';
import { requireIdle } from './gameService';
import { npcBuyPrice, percentOf, type Settings } from '../../../shared/economy';
import { vocationAllowed } from '../../../shared/adventure';
import { forgeMaterials, forgeableSlots, isForgeable, materialForLevel, reforgeKeptTier, salvageReturn } from '../../../shared/forge';
type Tx = Prisma.TransactionClient;
interface ForgeBlueprint { id: number; name: string; slot: string; minLevel: number; npcPrice: number; vocations: string }

const shopPrice = (bp: ForgeBlueprint, s: Settings) => npcBuyPrice(bp.npcPrice, s['economy.npcBuyPercent']);
export const craftCost = (bp: ForgeBlueprint, s: Settings) => percentOf(shopPrice(bp, s), s['forge.craftPricePercent']);
export const reforgeCost = (bp: ForgeBlueprint, s: Settings) => percentOf(shopPrice(bp, s), s['forge.reforgePricePercent']);
function requireForgeable(bp: ForgeBlueprint) {
  if (!isForgeable(bp.slot) || bp.npcPrice <= 0) throw new GameError(409, 'O Ferreiro não trabalha com este item.');
}
async function materialOf(tx: Tx, level: number) {
  const m = materialForLevel(level), bp = await tx.itemBlueprint.findUnique({ where: { name: m.name } });
  if (!bp) throw new GameError(503, 'Os materiais do Ferreiro ainda não foram cadastrados (rode npm run seed).');
  return bp;
}
async function ownedItem(tx: Tx, characterId: number, itemId: number) {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId }, include: { blueprint: true } });
  if (!item) throw new GameError(404, 'Item não encontrado.');
  if (item.rareItemId) throw new GameError(409, 'Itens raros (+10) não podem ser reforjados nem desmontados: o número de série pertence a este item.');
  if (item.quantity !== 1) throw new GameError(409, 'O Ferreiro trabalha com um item por vez.');
  assertNotFavorite(item, 'reforjar ou desmontar');
  requireForgeable(item.blueprint);
  return item;
}

export async function craft(accountId: number, characterId: number, blueprintId: number, key: string) {
  integer(blueprintId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['craft', blueprintId], async () => {
      await requireIdle(tx, characterId);
      const bp = await tx.itemBlueprint.findUnique({ where: { id: blueprintId } });
      if (!bp) throw new GameError(404, 'Item não encontrado.');
      requireForgeable(bp);
      if (bp.minLevel > c.level) throw new GameError(409, `Você precisa do nível ${bp.minLevel} para fabricar ${bp.name}.`);
      const settings = await loadSettings(tx), gold = craftCost(bp, settings), material = await materialOf(tx, bp.minLevel), qty = settings['forge.craftMaterials'];
      const ref = { type: 'blueprint', id: bp.id };
      await takeStack(tx, characterId, material.id, qty, 'FORGE_MATERIAL_USE', ref);
      await addGold(tx, characterId, -gold, 'FORGE_CRAFT', ref);
      const item = await addItem(tx, characterId, bp.id, 1, 'FORGE_CRAFT', ref);
      await event(tx, characterId, 'FORGE', `Fabricado: ${bp.name}`, `Gastou ${qty} ${material.name} e ${gold} ouro.`);
      return { message: `${bp.name} fabricado.`, itemId: item.id };
    });
  });
}

export async function reforge(accountId: number, characterId: number, itemId: number, targetId: number, key: string) {
  integer(itemId); integer(targetId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['reforge', itemId, targetId], async () => {
      await requireIdle(tx, characterId);
      const item = await ownedItem(tx, characterId, itemId);
      const target = await tx.itemBlueprint.findUnique({ where: { id: targetId } });
      if (!target) throw new GameError(404, 'Item novo não encontrado.');
      requireForgeable(target);
      if (target.slot !== item.blueprint.slot) throw new GameError(409, 'Só dá para reforjar em um item do mesmo tipo.');
      if (target.minLevel <= item.blueprint.minLevel) throw new GameError(409, 'Escolha um item de nível maior que o atual.');
      if (target.minLevel > c.level) throw new GameError(409, `Você precisa do nível ${target.minLevel} para usar ${target.name}.`);
      if (!vocationAllowed(target.vocations, c.vocation)) throw new GameError(409, 'Sua vocação não usa o item novo.');
      const settings = await loadSettings(tx), gold = reforgeCost(target, settings), material = await materialOf(tx, target.minLevel), qty = settings['forge.craftMaterials'];
      const ref = { type: 'item', id: item.id }, tier = reforgeKeptTier(item.upgradeTier);
      await takeStack(tx, characterId, material.id, qty, 'FORGE_MATERIAL_USE', ref);
      await addGold(tx, characterId, -gold, 'FORGE_REFORGE', ref);
      // O mesmo item (mesma linha, mesmo slot se estiver equipado) passa a ser o novo; o extrato registra a troca.
      await tx.inventoryItem.update({ where: { id: item.id }, data: { blueprintId: target.id, upgradeTier: tier } });
      await recordItem(tx, characterId, item.blueprintId, -1, 'FORGE_REFORGE_OUT', ref, item.upgradeTier);
      await recordItem(tx, characterId, target.id, 1, 'FORGE_REFORGE_IN', ref, tier);
      await event(tx, characterId, 'FORGE', `Reforjado: ${item.blueprint.name} → ${target.name}`, `Melhoria +${item.upgradeTier} virou +${tier}. Gastou ${qty} ${material.name} e ${gold} ouro.`);
      return { message: `${item.blueprint.name} virou ${target.name}${tier ? ` +${tier}` : ''}.` };
    });
  });
}

export async function salvage(accountId: number, characterId: number, itemId: number, confirmUpgraded: boolean, key: string) {
  integer(itemId);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['salvage', itemId, confirmUpgraded], async () => {
      await requireIdle(tx, characterId);
      const item = await ownedItem(tx, characterId, itemId);
      if (item.isEquipped || item.equippedSlot !== null) throw new GameError(409, 'Desequipe o item antes de desmontar.');
      if (item.upgradeTier > 0 && !confirmUpgraded)
        throw new GameError(409, `Este item está melhorado (+${item.upgradeTier}). Ao desmontar, a melhoria vira materiais extras e o item some. Confirme para continuar.`);
      const settings = await loadSettings(tx), material = await materialOf(tx, item.blueprint.minLevel);
      const qty = salvageReturn(settings['forge.salvageMaterials'], item.upgradeTier), ref = { type: 'blueprint', id: item.blueprintId };
      await tx.inventoryItem.delete({ where: { id: item.id } });
      await recordItem(tx, characterId, item.blueprintId, -1, 'FORGE_SALVAGE', ref, item.upgradeTier);
      if (qty > 0) await addItem(tx, characterId, material.id, qty, 'FORGE_SALVAGE_MATERIAL', ref);
      await event(tx, characterId, 'FORGE', `Desmontado: ${item.blueprint.name}`, `Recebeu ${qty} ${material.name}.`);
      return { message: `${item.blueprint.name} desmontado: +${qty} ${material.name}.` };
    });
  });
}

// O que a tela do Ferreiro precisa: materiais na mochila e o catálogo que dá para fabricar/reforjar, com os custos já calculados.
export async function forgeOverview(accountId: number, characterId: number) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { level: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const [settings, materialRows, recipes] = await Promise.all([loadSettings(prisma),
    prisma.itemBlueprint.findMany({ where: { name: { in: forgeMaterials.map(m => m.name) } }, select: { id: true, name: true, spriteUrl: true } }),
    prisma.itemBlueprint.findMany({ where: { npcPrice: { gt: 0 }, slot: { in: [...forgeableSlots] } }, orderBy: [{ minLevel: 'asc' }, { id: 'asc' }], take: 400 })]);
  // Toda a mochila que o Ferreiro pode trabalhar (não só a página aberta no Inventário).
  const bag = await prisma.inventoryItem.findMany({ where: { characterId, isEquipped: false, quantity: 1, blueprint: { slot: { in: [...forgeableSlots] } } },
    include: { blueprint: true, rareItem: { select: { id: true, serial: true, status: true } } }, orderBy: [{ upgradeTier: 'desc' }, { id: 'asc' }], take: 200 });
  const stacks = await prisma.inventoryItem.groupBy({ by: ['blueprintId'], where: { characterId, isEquipped: false, blueprintId: { in: materialRows.map(m => m.id) } }, _sum: { quantity: true } });
  const have = new Map(stacks.map(s => [s.blueprintId, s._sum.quantity ?? 0]));
  const materials = forgeMaterials.map(m => { const row = materialRows.find(r => r.name === m.name); return { name: m.name, minLevel: m.minLevel, spriteUrl: row?.spriteUrl ?? '', have: row ? have.get(row.id) ?? 0 : 0 }; });
  return { level: c.level, craftMaterials: settings['forge.craftMaterials'], salvageMaterials: settings['forge.salvageMaterials'], shopMaxLevel: settings['shop.maxEquipmentLevel'], materials, bag,
    recipes: recipes.map(r => ({ id: r.id, name: r.name, slot: r.slot, minLevel: r.minLevel, vocations: r.vocations, spriteUrl: r.spriteUrl, attack: r.attack, defense: r.defense, armor: r.armor, magicAttack: r.magicAttack,
      material: materialForLevel(r.minLevel).name, craftGold: craftCost(r, settings).toString(), reforgeGold: reforgeCost(r, settings).toString() })) };
}
