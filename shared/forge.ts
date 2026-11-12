// Ferreiro: materiais por faixa de nível e regras de fabricar, reforjar e desmontar.
// Preços e quantidades-base vêm de loadSettings (chaves `forge.*` em shared/economy.ts); aqui ficam só as regras.
export const forgeMaterials = [
  { minLevel: 1, name: 'Minério de Ferro', sprite: 'Iron Ore' },
  { minLevel: 25, name: 'Rubi Bruto', sprite: 'Small Ruby' },
  { minLevel: 60, name: 'Safira Bruta', sprite: 'Small Sapphire' },
  { minLevel: 100, name: 'Esmeralda Bruta', sprite: 'Small Emerald' },
  { minLevel: 160, name: 'Diamante Bruto', sprite: 'Small Diamond' },
  { minLevel: 250, name: 'Lingote de Ouro', sprite: 'Gold Ingot' },
  { minLevel: 550, name: 'Orbe de Almas', sprite: 'Soul Orb' },
  { minLevel: 850, name: 'Essência Demoníaca', sprite: 'Demonic Essence' },
] as const;
export type ForgeMaterial = typeof forgeMaterials[number];
// Material da faixa de um item ou monstro de determinado nível.
export function materialForLevel(level: number): ForgeMaterial {
  let found: ForgeMaterial = forgeMaterials[0];
  for (const m of forgeMaterials) if (m.minLevel <= level) found = m;
  return found;
}
export const forgeableSlots = ['WEAPON', 'ARMOR', 'HELMET', 'LEGS', 'BOOTS', 'SHIELD', 'AMULET', 'RING', 'AMMO'] as const;
export const isForgeable = (slot: string) => (forgeableSlots as readonly string[]).includes(slot);
// Reforjar guarda metade da melhoria (arredonda para baixo): um +7 vira +3 no item novo.
export const reforgeKeptTier = (tier: number) => Math.floor(tier / 2);
// Desmontar devolve a quantidade-base configurada + 1 material a cada 3 níveis de melhoria.
export const salvageReturn = (base: number, tier: number) => base + Math.floor(tier / 3);
