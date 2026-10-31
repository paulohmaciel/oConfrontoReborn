import { GameError } from '../core/engine';
export const stats = ['strength', 'vitality', 'agility', 'resistance'] as const;
export type Stat = typeof stats[number];
export function parseStat(value: unknown): Stat {
  if (typeof value !== 'string' || !stats.includes(value as Stat))
    throw new GameError(400, 'Atributo inválido.');
  return value as Stat;
}
// Regra proposta para esta adaptação; não representa a fórmula do PHP/Tibia.
export function upgradePrice(npcPrice: number, currentTier: number): bigint {
  if (!Number.isSafeInteger(npcPrice) || npcPrice < 1 || !Number.isSafeInteger(currentTier) || currentTier < 0 || currentTier >= 10)
    throw new GameError(409, 'Item indisponível para melhoria ou no limite +10.');
  return BigInt(npcPrice) * BigInt(currentTier + 1);
}
