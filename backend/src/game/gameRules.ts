import { GameError } from '../core/engine';
import { levelForExperience, levelGains } from '../../../shared/progression';
export const stats = ['strength', 'vitality', 'agility', 'resistance'] as const;
export type Stat = typeof stats[number];
export function parseStat(value: unknown): Stat {
  if (typeof value !== 'string' || !stats.includes(value as Stat))
    throw new GameError(400, 'Atributo inválido.');
  return value as Stat;
}
// Subida de nível única para combate, jornada e tarefas. `data` vai direto no update do personagem (já travado).
export function gainExperience(c: { experience: bigint; level: number }, xp: number) {
  const experience = c.experience + BigInt(xp), level = levelForExperience(experience, c.level), up = level - c.level;
  return { experience, level, leveledUp: up > 0, data: { experience, level,
    maxHp: { increment: up * levelGains.hp }, maxMana: { increment: up * levelGains.mana }, statPoints: { increment: up * levelGains.statPoints } } };
}
// Regra proposta para esta adaptação; não representa a fórmula do PHP/Tibia.
export function upgradePrice(npcPrice: number, currentTier: number): bigint {
  if (!Number.isSafeInteger(npcPrice) || npcPrice < 1 || !Number.isSafeInteger(currentTier) || currentTier < 0 || currentTier >= 10)
    throw new GameError(409, 'Item indisponível para melhoria ou no limite +10.');
  return BigInt(npcPrice) * BigInt(currentTier + 1);
}
