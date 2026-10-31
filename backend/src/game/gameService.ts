import { once } from '../core/operations';
import { Prisma } from '@prisma/client';
import { transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { parseStat, upgradePrice } from './gameRules';
import {event,awardAchievements} from './adventureService';
import { addGold, recordItem } from '../economy/economy';
import { loadSettings } from '../core/settings';
import { randomInt } from 'node:crypto';
import { makeRare, retireRare, RARE_TIER } from '../economy/rare';
import { BASE_ATTRIBUTE } from '../../../shared/progression';
// Cada ponto em Vitalidade dá +15 de vida máxima; em Resistência, +15 de mana máxima.
const STAT_BONUS = 15;
import { statsResetCost, npcSellPrice, percentOf, resolveUpgrade, upgradeSuccessPercent, PROTECTION_STONE, type UpgradeOutcome, type UpgradeResult } from '../../../shared/economy';

export async function requireIdle(tx: Prisma.TransactionClient, characterId: number) {
  if (await tx.battle.findFirst({ where: { characterId, isFinished: false }, select: { id: true } }))
    throw new GameError(409, 'Encerre o combate antes desta operação.');
}

// Distribui um ou vários pontos de uma vez no mesmo atributo.
export async function addStat(accountId: number, characterId: number, rawStat: unknown, key: string, amount = 1) {
  const stat = parseStat(rawStat);
  integer(amount);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ["stat", stat, amount], async () => {
    await requireIdle(tx, characterId);
    if (c.statPoints <= 0) throw new GameError(409, 'Sem pontos disponíveis.');
    if (amount > c.statPoints) throw new GameError(409, `Você tem só ${c.statPoints} pontos disponíveis.`);
    const data: Prisma.CharacterUpdateInput = { statPoints: { decrement: amount } };
    data[stat] = { increment: amount };
    if (stat === 'vitality') { data.maxHp = { increment: STAT_BONUS * amount }; data.hp = { increment: STAT_BONUS * amount }; }
    if (stat === 'resistance') { data.maxMana = { increment: STAT_BONUS * amount }; data.mana = { increment: STAT_BONUS * amount }; }
    await tx.character.update({ where: { id: characterId }, data });
    return { stat, value: c[stat] + amount, statPoints: c.statPoints - amount, message: amount > 1 ? `+${amount.toLocaleString('pt-BR')} pontos distribuídos.` : undefined };
    });
  });
}

// Devolve todos os pontos distribuídos (atributos voltam à base) mediante ouro. Vida e mana máximas perdem o bônus de Vitalidade e Resistência.
export async function resetStats(accountId: number, characterId: number, key: string) {
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['stats-reset'], async () => {
      await requireIdle(tx, characterId);
      const spent = { strength: Math.max(0, c.strength - BASE_ATTRIBUTE), vitality: Math.max(0, c.vitality - BASE_ATTRIBUTE), agility: Math.max(0, c.agility - BASE_ATTRIBUTE), resistance: Math.max(0, c.resistance - BASE_ATTRIBUTE) };
      const total = spent.strength + spent.vitality + spent.agility + spent.resistance;
      if (!total) throw new GameError(409, 'Nenhum ponto distribuído para devolver.');
      const settings = await loadSettings(tx), cost = statsResetCost(c.level, settings['stats.resetBaseGold'], settings['stats.resetGoldPerLevelSquared']);
      if (c.goldInHand < cost) throw new GameError(409, `Redistribuir custa ${cost.toLocaleString('pt-BR')} ouro.`);
      await addGold(tx, characterId, -cost, 'STATS_RESET');
      const maxHp = Math.max(1, c.maxHp - spent.vitality * STAT_BONUS), maxMana = Math.max(0, c.maxMana - spent.resistance * STAT_BONUS);
      await tx.character.update({ where: { id: characterId }, data: { strength: c.strength - spent.strength, vitality: c.vitality - spent.vitality, agility: c.agility - spent.agility, resistance: c.resistance - spent.resistance,
        statPoints: { increment: total }, maxHp, maxMana, hp: Math.min(c.hp, maxHp), mana: Math.min(c.mana, maxMana) } });
      const said = `${total.toLocaleString('pt-BR')} ${total === 1 ? 'ponto devolvido' : 'pontos devolvidos'} por ${cost.toLocaleString('pt-BR')} ouro`;
      await event(tx, characterId, 'STATS', 'Atributos redistribuídos', `${said}.`);
      return { message: `${said}. Distribua de novo como quiser.`, statPoints: c.statPoints + total, cost: cost.toString() };
    });
  });
}

export async function heal(accountId: number, characterId: number) {
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    await requireIdle(tx, characterId);
    if (c.huntEndsAt) throw new GameError(409, 'Resolva a caça pendente.');
    if (c.templeReadyAt && c.templeReadyAt > new Date()) throw new GameError(409, 'O Templo de Capriel ficará disponível novamente em breve.');
    const templeReadyAt = new Date(Date.now() + 5*60*1000);
    await tx.character.update({ where: { id: characterId }, data: { hp: c.maxHp, mana: c.maxMana, energy: c.maxEnergy, templeReadyAt } });
    return { hp: c.maxHp, mana: c.maxMana, energy: c.maxEnergy, templeReadyAt };
  });
}

export async function unequip(accountId: number, characterId: number, itemId: number) {
  integer(itemId);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    await requireIdle(tx, characterId);
    const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId } });
    if (!item) throw new GameError(404, 'Item não encontrado.');
    await tx.inventoryItem.update({ where: { id: itemId }, data: { isEquipped: false, equippedSlot: null } });
    return { itemId, isEquipped: false };
  });
}

export async function sellNpc(accountId: number, characterId: number, itemId: number, confirmUpgraded = false) {
  integer(itemId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    await requireIdle(tx, characterId);
    const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId }, include: { blueprint: true } });
    if (!item) throw new GameError(404, 'Item não encontrado.');
    if (item.isEquipped || item.equippedSlot !== null || item.quantity < 1 || item.blueprint.npcPrice < 1)
      throw new GameError(409, 'Item indisponível para venda. Desequipe-o primeiro.');
    // O NPC paga só o preço-base: a melhoria se perderia. Quem quer valorizar o item deve anunciá-lo no mercado.
    if (item.upgradeTier > 0 && !confirmUpgraded)
      throw new GameError(409, `Este item está melhorado (+${item.upgradeTier}). O NPC paga só o preço-base e a melhoria se perde. Anuncie no mercado para vendê-lo por mais.`);
    const settings = await loadSettings(tx);
    const proceeds = npcSellPrice(item.blueprint.npcPrice, settings['economy.npcSellPercent']) * BigInt(item.quantity);
    await tx.inventoryItem.delete({ where: { id: itemId } });
    await retireRare(tx, item.rareItemId, 'NPC_SELL');
    await recordItem(tx, characterId, item.blueprintId, -item.quantity, 'NPC_SELL', { type: 'blueprint', id: item.blueprintId }, item.upgradeTier);
    await addGold(tx, characterId, proceeds, 'NPC_SELL', { type: 'blueprint', id: item.blueprintId });
    return { received: proceeds.toString(), goldInHand: (c.goldInHand + proceeds).toString() };
  });
}

export async function upgrade(accountId: number, characterId: number, itemId: number, expectedTier: number, key: string, useProtection = false) {
  integer(itemId); integer(expectedTier, 0);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    // A chave garante que repetir o pedido devolve o mesmo resultado, em vez de sortear de novo.
    return once(tx, characterId, key, ['upgrade', itemId, expectedTier, useProtection], async () => {
      await requireIdle(tx, characterId);
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId }, include: { blueprint: true } });
      if (!item) throw new GameError(404, 'Item não encontrado (talvez já tenha quebrado).');
      if (item.upgradeTier !== expectedTier) throw new GameError(409, 'Nível do item desatualizado.');
      if (item.quantity !== 1 || ['LOOT', 'CONSUMABLE', 'AMMO'].includes(item.blueprint.slot))
        throw new GameError(409, 'Este item não aceita melhoria.');
      const settings = await loadSettings(tx);
      const cost = percentOf(upgradePrice(item.blueprint.npcPrice, item.upgradeTier), settings['economy.upgradePricePercent']) || 1n;
      if (c.goldInHand < cost) throw new GameError(409, 'Ouro insuficiente.');
      const stone = useProtection ? await tx.inventoryItem.findFirst({ where: { characterId, blueprint: { name: PROTECTION_STONE }, quantity: { gte: 1 }, isEquipped: false }, include: { blueprint: true } }) : null;
      if (useProtection && !stone) throw new GameError(409, 'Você não tem Pedra de Proteção.');
      // O ouro é gasto de qualquer jeito; o resultado (sucesso, falha ou quebra) é decidido aqui, no servidor.
      await addGold(tx, characterId, -cost, 'UPGRADE', { type: 'item', id: itemId });
      const rules = { safeUntilTier: settings['upgrade.safeUntilTier'], breakFromTier: settings['upgrade.breakFromTier'], breakOnFailPercent: settings['upgrade.breakOnFailPercent'] };
      const rolled: UpgradeOutcome = resolveUpgrade(item.upgradeTier, rules, randomInt(1, 101), randomInt(1, 101));
      // A pedra só é consumida quando realmente evitou a quebra.
      let outcome: UpgradeResult = rolled;
      if (rolled === 'BROKE' && stone) {
        await recordItem(tx, characterId, stone.blueprintId, -1, 'PROTECTION_USE', { type: 'item', id: itemId });
        if (stone.quantity === 1) await tx.inventoryItem.delete({ where: { id: stone.id } });
        else await tx.inventoryItem.update({ where: { id: stone.id }, data: { quantity: { decrement: 1 } } });
        outcome = 'PROTECTED';
        await event(tx, characterId, 'UPGRADE', `${item.blueprint.name}: Pedra de Proteção`, `A melhoria falhou e o item teria quebrado, mas a Pedra de Proteção o salvou. Continua em +${item.upgradeTier}. ${cost} ouro perdidos.`);
      }
      const chance = upgradeSuccessPercent(item.upgradeTier, rules.safeUntilTier);
      if (outcome === 'SUCCESS') {
        await tx.inventoryItem.update({ where: { id: itemId }, data: { upgradeTier: { increment: 1 } } });
        if (item.upgradeTier + 1 >= RARE_TIER) await makeRare(tx, item, characterId, c.name);
        await event(tx, characterId, 'UPGRADE', `${item.blueprint.name} +${item.upgradeTier + 1}`, `Melhoria concluída por ${cost} ouro.`);
        await awardAchievements(tx, characterId);
      } else if (outcome === 'PROTECTED') {
        // já tratado acima
      } else if (outcome === 'BROKE') {
        await tx.inventoryItem.delete({ where: { id: itemId } });
        await recordItem(tx, characterId, item.blueprintId, -1, 'UPGRADE_BREAK', { type: 'item', id: itemId }, item.upgradeTier);
        await event(tx, characterId, 'UPGRADE', `${item.blueprint.name} quebrou`, `A melhoria para +${item.upgradeTier + 1} falhou e o item se partiu. ${cost} ouro perdidos.`);
      } else {
        await event(tx, characterId, 'UPGRADE', `${item.blueprint.name}: melhoria falhou`, `O item resistiu e continua em +${item.upgradeTier}. ${cost} ouro perdidos.`);
      }
      const newTier = outcome === 'SUCCESS' ? item.upgradeTier + 1 : item.upgradeTier;
      const rare = newTier >= RARE_TIER ? await tx.rareItem.findFirst({ where: { inventoryItem: { id: itemId } }, select: { serial: true, firstOfKind: true } }) : null;
      return { itemId, outcome, chance, upgradeTier: newTier, spent: cost.toString(), rareSerial: rare?.serial ?? null, firstOfKind: rare?.firstOfKind ?? false };
    });
  });
}

export async function usePotion(accountId: number, characterId: number, itemId: number, key: string) {
  integer(itemId);
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    return once(tx, characterId, key, ['potion', itemId], async () => {
      await requireIdle(tx, characterId);
      if (c.hp <= 0) throw new GameError(409, 'Visite o Templo de Capriel antes de usar uma poção.');
      const item = await tx.inventoryItem.findFirst({ where: { id: itemId, characterId }, include: { blueprint: true } });
      if (!item) throw new GameError(404, 'Item não encontrado.');
      if (item.blueprint.slot !== 'CONSUMABLE' || item.quantity < 1) throw new GameError(409, 'Este item não é uma poção.');
      const health = item.blueprint.name === 'Health Potion';
      const mana = item.blueprint.name === 'Mana Potion';
      if (!health && !mana) throw new GameError(409, 'Consumível sem efeito definido.');
      const recovered = health ? Math.min(100, c.maxHp-c.hp) : Math.min(80, c.maxMana-c.mana);
      if (recovered <= 0) throw new GameError(409, 'Seu recurso já está completo.');
      await recordItem(tx, characterId, item.blueprintId, -1, 'POTION_USE');
      if (item.quantity === 1) await tx.inventoryItem.delete({ where: { id: item.id } });
      else await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: 1 } } });
      await tx.character.update({ where: { id: characterId }, data: health ? { hp: { increment: recovered } } : { mana: { increment: recovered } } });
      return { recovered, resource: health ? 'hp' : 'mana' };
    });
  });
}
