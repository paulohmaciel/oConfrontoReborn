import { randomInt } from 'node:crypto';
import { transaction, lockCharacter } from '../core/db';
import { GameError, getExpForLevel, integer, parseAction, resolveTurn, monsterIntent } from '../core/engine';
import { combatStats } from './combatStats';
import { regions } from '../../../shared/adventure';
import { event, awardAchievements } from './adventureService';
import { addItem, recordGold } from '../economy/economy';
import { loadSettings } from '../core/settings';
import { scaleInt } from '../../../shared/economy';
import { vocationAllowed } from '../../../shared/adventure';
const dice = (min: number, max: number) => randomInt(min, max + 1);

export class BattleService {
  static async start(accountId: number, characterId: number, monsterId: number) {
    integer(monsterId);
    return transaction(async tx => {
      const character = await lockCharacter(tx, accountId, characterId);
      const existing = await tx.battle.findFirst({ where: { characterId, isFinished: false } });
      if (existing) return existing;
      if (character.hp <= 0 || character.energy < 5) throw new GameError(409, 'Vida ou energia insuficiente.');
      if (character.huntEndsAt) throw new GameError(409, 'Resolva a caça pendente antes de combater.');
      const monster = await tx.monster.findUnique({ where: { id: monsterId } });
      if (!monster || monster.hp <= 0) throw new GameError(404, 'Monstro indisponível.');
      const region=regions.find(r=>r.key===monster.regionKey);
      if(!region||character.level<region.minLevel||character.journeyStep<region.journeyStep)throw new GameError(409,'Região bloqueada. Avance na sua jornada e confira o nível necessário.');
      await tx.character.update({ where: { id: characterId }, data: { energy: { decrement: 5 } } });
      return tx.battle.create({ data: { characterId, activeCharacterId: characterId, monsterId, monsterHp: monster.hp } });
    });
  }

  static async snapshot(accountId: number, characterId: number, battleId: number) {
    integer(battleId);
    return transaction(async tx => {
      const c = await lockCharacter(tx, accountId, characterId);
      const b = await tx.battle.findFirst({ where: { id: battleId, characterId }, include: { monster: true } });
      if (!b) throw new GameError(404, 'Batalha não encontrada.');
      return { battleId: b.id, turnVersion: b.turnVersion, hp: c.hp, maxHp: c.maxHp, mana: c.mana,
        monsterHp: b.monsterHp, monsterMaxHp: b.monster.hp, monsterName: b.monster.name,
        monsterSprite: b.monster.spriteUrl, status: b.outcome, log: (b.lastLog ?? []) as string[],isBoss:b.monster.isBoss,intent:monsterIntent(b.monster,b.turnVersion) };
    });
  }

  static async turn(accountId: number, characterId: number, battleId: number, expectedTurn: number, rawAction: unknown) {
    integer(battleId); integer(expectedTurn, 0);
    const action = parseAction(rawAction);
    return transaction(async tx => {
      const c = await lockCharacter(tx, accountId, characterId);
      const b = await tx.battle.findFirst({ where: { id: battleId, characterId }, include: { monster: { include: { loots: true } } } });
      if (!b) throw new GameError(404, 'Batalha não encontrada.');
      if (b.isFinished || b.turnVersion !== expectedTurn) throw new GameError(409, 'Turno desatualizado ou batalha encerrada.');
      const equipment = await tx.inventoryItem.findMany({ where: { characterId, isEquipped: true }, include: { blueprint: true } });
      for (const item of equipment) {
        if (item.quantity !== 1 || item.upgradeTier < 0 || ['LOOT', 'CONSUMABLE'].includes(item.blueprint.slot)
          || item.equippedSlot !== item.blueprint.slot || item.blueprint.minLevel > c.level)
          throw new GameError(409, 'Equipamento inconsistente; revise o inventário.');
        if (!vocationAllowed(item.blueprint.vocations, c.vocation)) throw new GameError(409, 'Vocação incompatível.');
      }
      const stats=combatStats(c,equipment);
      const result = resolveTurn({ hp: c.hp, maxHp: c.maxHp, mana: c.mana,
        ...stats,agility:c.agility,vocation:c.vocation },
        { hp: b.monsterHp, attack: b.monster.attack, defense: b.monster.defense,isBoss:b.monster.isBoss,turn:b.turnVersion,element:b.monster.element }, action, dice);
      let experience = c.experience, level = c.level, gold = 0, xpGain = 0;
      const droppedItems: { blueprintId: number; quantity: number }[] = [];
      if (result.status === 'VICTORY') {
        if (b.monster.experience < 0 || b.monster.goldMin < 0 || b.monster.goldMax < b.monster.goldMin)
          throw new GameError(409, 'Recompensa do monstro inválida.');
        const settings = await loadSettings(tx);
        xpGain = scaleInt(b.monster.experience, settings['economy.xpRewardPercent']);
        experience += BigInt(xpGain);
        gold = scaleInt(dice(b.monster.goldMin, b.monster.goldMax), settings['economy.goldRewardPercent']);
        while (experience >= getExpForLevel(level + 1)) level++;
        for (const loot of b.monster.loots) {
          if (loot.dropChance < 0 || loot.dropChance > 1 || !Number.isFinite(loot.dropChance) || loot.maxAmount < 1)
            throw new GameError(409, 'Tabela de loot inválida. Use probabilidades entre 0 e 1.');
          if (dice(1, 1000000) <= Math.floor(loot.dropChance * 1000000)) {
            const drop = { blueprintId: loot.blueprintId, quantity: dice(1, loot.maxAmount) };
            await addItem(tx, characterId, drop.blueprintId, drop.quantity, 'LOOT', { type: 'battle', id: battleId });
            droppedItems.push(drop);
          }
        }
        await tx.characterTask.updateMany({ where: { characterId, isCompleted: false, task: { monsterId: b.monsterId } }, data: { currentKills: { increment: 1 } } });
      }
      await tx.character.update({ where: { id: characterId }, data: { hp: result.hp, mana: result.mana,
        experience, level, maxHp: { increment: (level-c.level)*5 }, maxMana: { increment: (level-c.level)*5 }, statPoints: { increment: (level-c.level)*3 }, goldInHand: { increment: BigInt(gold) } } });
      if (gold > 0) await recordGold(tx, characterId, BigInt(gold), c.goldInHand + BigInt(gold), 'MONSTER', { type: 'battle', id: battleId });
      await tx.battle.update({ where: { id: battleId }, data: { monsterHp: result.monsterHp,
        isFinished: result.status !== 'ONGOING', activeCharacterId: result.status === 'ONGOING' ? characterId : null,
        turnVersion: { increment: 1 }, outcome: result.status, lastLog: result.log,
        rewardGold:BigInt(gold),rewardExperience:xpGain,rewardRecorded:result.status!=='ONGOING' } });
      if(result.status!=='ONGOING') {
        await event(tx,characterId,'BATTLE',`${result.status==='VICTORY'?'Vitória':result.status==='DEFEAT'?'Derrota':'Fuga'}: ${b.monster.name}`,
          result.status==='VICTORY'?`+${xpGain} XP e +${gold} ouro. ${droppedItems.length} tipo(s) de item encontrado(s).`:result.log.join(' '));
        if(result.status==='VICTORY')await awardAchievements(tx,characterId);
      }
      return { ...result, battleId, turnVersion: b.turnVersion+1, maxHp: c.maxHp+(level-c.level)*5, monsterMaxHp: b.monster.hp,
        monsterName: b.monster.name, monsterSprite: b.monster.spriteUrl,isBoss:b.monster.isBoss,intent:monsterIntent(b.monster,b.turnVersion+1), rewards: { gold: String(gold), experience: experience.toString(), level, droppedItems } };
    });
  }
}
