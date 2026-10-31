import { Prisma } from '@prisma/client';
import { GameError } from '../core/engine';
import type { GoldReason, ItemReason } from '../../../shared/economy';
type Tx = Prisma.TransactionClient;
export interface Ref { type: string; id: number }
// Munição (flechas, virotes e runas de foco) é equipamento permanente: não é gasta em combate, então não empilha.
const STACKABLE = ['LOOT', 'CONSUMABLE'];
export const isStackable = (slot: string) => STACKABLE.includes(slot);

// Favorito é protegido contra perda: venda ao NPC, anúncio, Ferreiro e melhoria que pode quebrar.
export function assertNotFavorite(item: { favorite: boolean }, what: string) {
  if (item.favorite) throw new GameError(409, `Este item é favorito e está protegido. Tire a estrela na mochila para ${what}.`);
}
// Toda alteração de ouro passa por aqui, na mesma transação da operação, e deixa um registro auditável.
// Executar depois de lockCharacter. Saldo negativo desfaz a transação inteira.
export async function addGold(tx: Tx, characterId: number, delta: bigint, reason: GoldReason, ref?: Ref) {
  if (delta === 0n) return null;
  const updated = await tx.character.update({ where: { id: characterId }, data: { goldInHand: { increment: delta } }, select: { goldInHand: true } });
  if (updated.goldInHand < 0n) throw new GameError(409, 'Ouro insuficiente.');
  await recordGold(tx, characterId, delta, updated.goldInHand, reason, ref);
  return updated.goldInHand;
}
// Para quem já atualizou o personagem em outra instrução (ex.: turno de combate).
export function recordGold(tx: Tx, characterId: number, delta: bigint, balanceAfter: bigint, reason: GoldReason, ref?: Ref) {
  return tx.goldLedger.create({ data: { characterId, delta, balanceAfter, reason, refType: ref?.type ?? null, refId: ref?.id ?? null } });
}
export function recordItem(tx: Tx, characterId: number, blueprintId: number, delta: number, reason: ItemReason, ref?: Ref, upgradeTier = 0) {
  return tx.itemLedger.create({ data: { characterId, blueprintId, delta, upgradeTier, reason, refType: ref?.type ?? null, refId: ref?.id ?? null } });
}
// Consome itens empilháveis (ex.: materiais do Ferreiro) de pilhas soltas na mochila. Falta de quantidade desfaz tudo.
export async function takeStack(tx: Tx, characterId: number, blueprintId: number, quantity: number, reason: ItemReason, ref?: Ref) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new GameError(400, 'Quantidade inválida.');
  const stacks = await tx.inventoryItem.findMany({ where: { characterId, blueprintId, isEquipped: false, upgradeTier: 0, rareItemId: null }, orderBy: { id: 'asc' } });
  if (stacks.reduce((t, s) => t + s.quantity, 0) < quantity) throw new GameError(409, 'Materiais insuficientes.');
  let left = quantity;
  for (const s of stacks) {
    if (!left) break;
    const used = Math.min(left, s.quantity);
    if (used === s.quantity) await tx.inventoryItem.delete({ where: { id: s.id } });
    else await tx.inventoryItem.update({ where: { id: s.id }, data: { quantity: { decrement: used } } });
    left -= used;
  }
  await recordItem(tx, characterId, blueprintId, -quantity, reason, ref);
}
// Entrega de itens: pilhas (loot, poções) são somadas em uma linha da mochila em vez de criar uma nova a cada drop.
export async function addItem(tx: Tx, characterId: number, blueprintId: number, quantity: number, reason: ItemReason, ref?: Ref, upgradeTier = 0, rareItemId: number | null = null) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new GameError(400, 'Quantidade inválida.');
  const blueprint = await tx.itemBlueprint.findUniqueOrThrow({ where: { id: blueprintId }, select: { slot: true } });
  let item;
  const existing = isStackable(blueprint.slot) && upgradeTier === 0 && !rareItemId
    ? await tx.inventoryItem.findFirst({ where: { characterId, blueprintId, isEquipped: false, upgradeTier: 0 }, orderBy: { id: 'asc' } }) : null;
  if (existing) item = await tx.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: quantity } } });
  else item = await tx.inventoryItem.create({ data: { characterId, blueprintId, quantity, upgradeTier, rareItemId } });
  await recordItem(tx, characterId, blueprintId, quantity, reason, ref, upgradeTier);
  return item;
}
