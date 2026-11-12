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

// Distribuição típica dos pontos por vocação (força, vitalidade, agilidade, resistência).
// É a base do simulador que equilibra os monstros e aparece como referência na tela de Atributos.
export const typicalSplit = { KNIGHT: [.6, .4, 0, 0], PALADIN: [.5, .2, .3, 0], SORCERER: [.1, .3, 0, .6], DRUID: [.1, .3, 0, .6] } as const;
export const BASE_ATTRIBUTE = 10;
export function typicalAttributes(vocation: keyof typeof typicalSplit, level: number) {
  const points = 3 + (level - 1) * levelGains.statPoints, [s, v, a, r] = typicalSplit[vocation].map(f => Math.floor(points * f));
  return { strength: BASE_ATTRIBUTE + s, vitality: BASE_ATTRIBUTE + v, agility: BASE_ATTRIBUTE + a, resistance: BASE_ATTRIBUTE + r };
}
