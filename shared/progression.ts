// Progressão de nível (ver PLANO-NIVEIS.md): teto, ganho por nível e a curva-alvo de XP dos monstros.
export const MAX_LEVEL = 1000;
// O que cada nível novo concede. Usado pelo combate, pela jornada e pelas tarefas (gainExperience) e pelo simulador.
export const levelGains = { hp: 5, mana: 5, statPoints: 3 } as const;

// XP total para estar no nível. Curva cúbica do jogo: não mudar, pois recalcularia o nível de quem já joga.
export function expForLevel(level: number): bigint {
  const l = BigInt(level);
  return 50n * (l*l*l - 6n*l*l + 17n*l - 12n) / 3n;
}
// Nível alcançado com essa XP, partindo do atual (nunca desce) e parando no teto. Acima do teto a XP continua contando.
export function levelForExperience(experience: bigint, from = 1): number {
  let level = from;
  while (level < MAX_LEVEL && experience >= expForLevel(level + 1)) level++;
  return level;
}
// XP que um monstro do nível deveria dar: ~31 lutas por nível contra a própria faixa, do 10 ao 1000.
export const monsterXpTarget = (level: number) => Math.round(1.6 * level * level);
