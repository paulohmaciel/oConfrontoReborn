import { once } from '../core/operations';
import { lockCharacter, transaction } from '../core/db';
import { GameError, integer } from '../core/engine';
import { addGold, addItem, isStackable } from '../economy/economy';
import { loadSettings } from '../core/settings';
import { npcBuyPrice } from '../../../shared/economy';
import { vocationAllowed } from '../../../shared/adventure';

export async function equip(accountId: number, characterId: number, itemId: number) {
  integer(itemId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    if (await tx.battle.findFirst({ where: { characterId, isFinished: false } }))
      throw new GameError(409, 'Não é possível trocar equipamentos durante o combate.');
    const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId }, include: { blueprint: true } });
    if (!item) throw new GameError(404, 'Item não encontrado.');
    const blueprint = item.blueprint;
    if (['LOOT', 'CONSUMABLE'].includes(blueprint.slot) || item.quantity !== 1 || blueprint.minLevel > c.level)
      throw new GameError(409, 'Item não pode ser equipado. Separe pilhas antes de equipar.');
    if (!vocationAllowed(blueprint.vocations, c.vocation)) throw new GameError(409, 'Vocação incompatível.');
    await tx.inventoryItem.updateMany({ where: { characterId, equippedSlot: blueprint.slot }, data: { isEquipped: false, equippedSlot: null } });
    return tx.inventoryItem.update({ where: { id: itemId }, data: { isEquipped: true, equippedSlot: blueprint.slot } });
  });
}

// Preço sempre vem do catálogo. Esta operação não deve receber retries automáticos do cliente.
export async function buyNpc(accountId: number, characterId: number, blueprintId: number, quantity: number, key: string) {
  integer(blueprintId); integer(quantity);
  if (quantity > 100) throw new GameError(400, 'Máximo de 100 unidades por compra.');
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ["buy", blueprintId, quantity], async () => {
    const blueprint = await tx.itemBlueprint.findUnique({ where: { id: blueprintId } });
    if (!blueprint || blueprint.npcPrice <= 0) throw new GameError(404, 'Item indisponível.');
    const settings = await loadSettings(tx), cost = npcBuyPrice(blueprint.npcPrice, settings['economy.npcBuyPercent']) * BigInt(quantity);
    if (c.goldInHand < cost) throw new GameError(409, 'Ouro insuficiente.');
    const ref = { type: 'blueprint', id: blueprintId };
    await addGold(tx, characterId, -cost, 'NPC_BUY', ref);
    // Equipamentos são instâncias individuais; apenas loot/consumíveis são empilhados.
    if (isStackable(blueprint.slot)) await addItem(tx, characterId, blueprintId, quantity, 'NPC_BUY', ref);
    else for (let n = 0; n < quantity; n++) await addItem(tx, characterId, blueprintId, 1, 'NPC_BUY', ref);
    return { spent: cost.toString(), goldInHand: (c.goldInHand - cost).toString() };
    });
  });
}
