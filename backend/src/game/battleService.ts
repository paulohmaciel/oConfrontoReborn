import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { transaction, lockCharacter } from '../core/db';
import { GameError, integer, parseAction, resolveTurn, monsterIntent, type FoeMove } from '../core/engine';
import { gainExperience } from './gameRules';
import { levelGains } from '../../../shared/progression';
import { combatStats } from './combatStats';
import { regions } from '../../../shared/adventure';
import { event, awardAchievements } from './adventureService';
import { addItem, recordGold } from '../economy/economy';
import { loadSettings } from '../core/settings';
import { scaleInt } from '../../../shared/economy';
import { vocationAllowed, skillCosts } from '../../../shared/adventure';
import { defeatAdvice, type DefeatAdvice } from './defeatAdvice';
import { inGroupBattle } from './groupHuntService';
import { healthPotionNames } from '../../../shared/potions';
import { bossPhase, monsterStatus, statusEffects, type ActiveEffect, type StatusKind } from '../../../shared/statusEffects';
const dice = (min: number, max: number) => randomInt(min, max + 1);
// Histórico do combate, turno a turno, guardado no próprio lastLog (JSON). Formato antigo: só a lista de frases do último turno.
// `effectDamage` e `inflicted` só aparecem nos turnos em que houve efeito de status.
export interface TurnRecord { turn: number; action: string; dealt: number; crit: boolean; healed: number; received: number; dodged: boolean; foe: FoeMove; heavy: boolean; hp: number; maxHp: number; monsterHp: number; monsterMaxHp: number; effectDamage?: number; inflicted?: StatusKind }
// Os efeitos ativos do herói ficam junto do histórico (valem só nesta batalha).
type StoredLog = { log: string[]; turns: TurnRecord[]; effects: ActiveEffect[] };
const MAX_TURNS_KEPT = 200;
function readLog(value: unknown): StoredLog {
  if (Array.isArray(value)) return { log: value as string[], turns: [], effects: [] };
  const v = value as Partial<StoredLog> | null;
  const effects = Array.isArray(v?.effects) ? v.effects.filter(e => e && Object.prototype.hasOwnProperty.call(statusEffects, e.kind) && Number.isInteger(e.turns) && e.turns > 0) : [];
  return { log: v?.log ?? [], turns: v?.turns ?? [], effects };
}

export class BattleService {
  static async start(accountId: number, characterId: number, monsterId: number) {
    integer(monsterId);
    return transaction(async tx => {
      const character = await lockCharacter(tx, accountId, characterId);
      const existing = await tx.battle.findFirst({ where: { characterId, isFinished: false } });
      if (existing) return existing;
      if (await inGroupBattle(tx, characterId)) throw new GameError(409, 'Você está numa caçada em grupo. Termine-a antes de caçar sozinho.');
      if (character.hp <= 0 || character.energy < 5) throw new GameError(409, 'Você está ferido ou exausto demais para caçar. Descanse no Templo de Capriel.');
      if (character.huntEndsAt) throw new GameError(409, 'Resolva a caça pendente antes de combater.');
      const monster = await tx.monster.findUnique({ where: { id: monsterId } });
      if (!monster || monster.hp <= 0) throw new GameError(404, 'Essa criatura não está mais por aqui.');
      const region=regions.find(r=>r.key===monster.regionKey);
      if(!region||character.level<region.minLevel||character.journeyStep<region.journeyStep)throw new GameError(409,'Estas terras ainda estão fechadas para você. Avance na jornada e alcance o nível necessário.');
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
        monsterSprite: b.monster.spriteUrl, status: b.outcome, log: readLog(b.lastLog).log, turns: readLog(b.lastLog).turns,isBoss:b.monster.isBoss,intent:monsterIntent(b.monster,b.turnVersion),
        effects: b.isFinished ? [] : readLog(b.lastLog).effects, monsterStatus: monsterStatus(b.monster), phase: bossPhase({ isBoss: b.monster.isBoss, hp: b.monsterHp, maxHp: b.monster.hp }) };
    });
  }

  static async turn(accountId: number, characterId: number, battleId: number, expectedTurn: number, rawAction: unknown) {
    integer(battleId); integer(expectedTurn, 0);
    const action = parseAction(rawAction);
    return transaction(async tx => {
      const c = await lockCharacter(tx, accountId, characterId);
      const b = await tx.battle.findFirst({ where: { id: battleId, characterId }, include: { monster: { include: { loots: { include: { blueprint: { select: { name: true } } } } } } } });
      if (!b) throw new GameError(404, 'Batalha não encontrada.');
      if (b.isFinished || b.turnVersion !== expectedTurn) throw new GameError(409, 'Esse turno já passou ou a batalha terminou. Atualize a tela.');
      const equipment = await tx.inventoryItem.findMany({ where: { characterId, isEquipped: true }, include: { blueprint: true } });
      for (const item of equipment) {
        if (item.quantity !== 1 || item.upgradeTier < 0 || ['LOOT', 'CONSUMABLE'].includes(item.blueprint.slot)
          || item.equippedSlot !== item.blueprint.slot || item.blueprint.minLevel > c.level)
          throw new GameError(409, 'Algo está errado com seu equipamento; revise a mochila.');
        if (!vocationAllowed(item.blueprint.vocations, c.vocation)) throw new GameError(409, 'Vocação incompatível.');
      }
      const stats=combatStats(c,equipment), stored = readLog(b.lastLog);
      const result = resolveTurn({ hp: c.hp, maxHp: c.maxHp, mana: c.mana,
        ...stats,agility:c.agility,vocation:c.vocation,effects:stored.effects },
        { hp: b.monsterHp, attack: b.monster.attack, defense: b.monster.defense,isBoss:b.monster.isBoss,turn:b.turnVersion,element:b.monster.element,status:monsterStatus(b.monster),maxHp:b.monster.hp }, action, dice);
      let gold = 0, xpGain = 0;
      const droppedItems: { blueprintId: number; quantity: number; name: string }[] = [];
      if (result.status === 'VICTORY') {
        if (b.monster.experience < 0 || b.monster.goldMin < 0 || b.monster.goldMax < b.monster.goldMin)
          throw new GameError(409, 'Recompensa do monstro inválida.');
        const settings = await loadSettings(tx);
        xpGain = scaleInt(b.monster.experience, settings['economy.xpRewardPercent']);
        gold = scaleInt(dice(b.monster.goldMin, b.monster.goldMax), settings['economy.goldRewardPercent']);
        for (const loot of b.monster.loots) {
          if (loot.dropChance < 0 || loot.dropChance > 1 || !Number.isFinite(loot.dropChance) || loot.maxAmount < 1)
            throw new GameError(409, 'Tabela de loot inválida. Use probabilidades entre 0 e 1.');
          if (dice(1, 1000000) <= Math.floor(loot.dropChance * 1000000)) {
            const drop = { blueprintId: loot.blueprintId, quantity: dice(1, loot.maxAmount), name: loot.blueprint.name };
            await addItem(tx, characterId, drop.blueprintId, drop.quantity, 'LOOT', { type: 'battle', id: battleId });
            droppedItems.push(drop);
          }
        }
        await tx.characterTask.updateMany({ where: { characterId, isCompleted: false, task: { monsterId: b.monsterId } }, data: { currentKills: { increment: 1 } } });
      }
      const { experience, level, data: levelData } = gainExperience(c, xpGain);
      const heavy = monsterIntent(b.monster, b.turnVersion).kind === 'HEAVY';
      const record: TurnRecord = { turn: b.turnVersion + 1, action, dealt: result.dealt, crit: result.crit, healed: result.healed, received: result.received, dodged: result.dodged,
        foe: result.foe, heavy, hp: result.hp, maxHp: c.maxHp, monsterHp: result.monsterHp, monsterMaxHp: b.monster.hp,
        ...(result.effectDamage ? { effectDamage: result.effectDamage } : {}), ...(result.inflicted ? { inflicted: result.inflicted } : {}) };
      const turns = [...stored.turns, record].slice(-MAX_TURNS_KEPT);
      await tx.character.update({ where: { id: characterId }, data: { hp: result.hp, mana: result.mana, ...levelData, goldInHand: { increment: BigInt(gold) } } });
      if (gold > 0) await recordGold(tx, characterId, BigInt(gold), c.goldInHand + BigInt(gold), 'MONSTER', { type: 'battle', id: battleId });
      await tx.battle.update({ where: { id: battleId }, data: { monsterHp: result.monsterHp,
        isFinished: result.status !== 'ONGOING', activeCharacterId: result.status === 'ONGOING' ? characterId : null,
        turnVersion: { increment: 1 }, outcome: result.status, lastLog: { log: result.log, turns, effects: result.status === 'ONGOING' ? result.effects : [] } as unknown as Prisma.InputJsonValue,
        rewardGold:BigInt(gold),rewardExperience:xpGain,rewardRecorded:result.status!=='ONGOING' } });
      let defeat: DefeatAdvice | null = null;
      if (result.status === 'DEFEAT') {
        const healthPotions = await tx.inventoryItem.aggregate({ where: { characterId, isEquipped: false, blueprint: { name: { in: healthPotionNames } } }, _sum: { quantity: true } });
        defeat = defeatAdvice({ heroLevel: c.level, monsterLevel: b.monster.level, monsterHp: result.monsterHp, monsterMaxHp: b.monster.hp,
          statPoints: c.statPoints, isBoss: b.monster.isBoss, lastIntent: monsterIntent(b.monster, b.turnVersion).kind, lastAction: action,
          monsterElement: b.monster.element, fireResistance: stats.fireResistance, healthPotions: healthPotions._sum.quantity ?? 0,
          mana: c.mana, healCost: skillCosts(c.vocation).HEAL });
      }
      if(result.status!=='ONGOING') {
        await event(tx,characterId,'BATTLE',`${result.status==='VICTORY'?'Vitória':result.status==='DEFEAT'?'Derrota':'Fuga'}: ${b.monster.name}`,
          result.status==='VICTORY'?`+${xpGain} XP e +${gold} ouro. ${droppedItems.length} tipo(s) de item encontrado(s).`:[...result.log,...(defeat?.reasons??[])].join(' '));
        if(result.status==='VICTORY')await awardAchievements(tx,characterId);
      }
      return { ...result, turns, battleId, turnVersion: b.turnVersion+1, maxHp: c.maxHp+(level-c.level)*levelGains.hp, monsterMaxHp: b.monster.hp,
        monsterName: b.monster.name, monsterSprite: b.monster.spriteUrl,isBoss:b.monster.isBoss,intent:monsterIntent(b.monster,b.turnVersion+1), monsterStatus: monsterStatus(b.monster), phase: bossPhase({ isBoss: b.monster.isBoss, hp: result.monsterHp, maxHp: b.monster.hp }), defeat, rewards: { gold: String(gold), experience: experience.toString(), xpGained: xpGain, level, leveledUp: level > c.level, droppedItems } };
    });
  }
}
