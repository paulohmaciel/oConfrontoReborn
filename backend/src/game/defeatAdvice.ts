// Explica uma derrota e sugere o que fazer na revanche. Função pura: não consulta banco nem altera nada.
export interface DefeatFacts {
  heroLevel: number;
  monsterLevel: number;
  monsterHp: number;
  monsterMaxHp: number;
  statPoints: number;
  isBoss: boolean;
  /** Intenção do chefe no turno em que o herói caiu (ver monsterIntent). */
  lastIntent: string;
  lastAction: string;
  monsterElement: string;
  fireResistance: number;
  healthPotions: number;
  /** Mana disponível no início do último turno e custo de Curar. */
  mana: number;
  healCost: number;
}

export interface DefeatAdvice {
  /** Quanto da vida do monstro ainda restava (0–100). */
  monsterHpPercent: number;
  reasons: string[];
  tips: string[];
}

export function defeatAdvice(f: DefeatFacts): DefeatAdvice {
  const monsterHpPercent = Math.max(0, Math.min(100, Math.round(100 * f.monsterHp / Math.max(1, f.monsterMaxHp))));
  const reasons: string[] = [], tips: string[] = [];

  if (f.isBoss && f.lastIntent === 'HEAVY' && f.lastAction !== 'DEFEND_SHIELD' && f.lastAction !== 'INTERRUPT') {
    reasons.push('O golpe pesado anunciado pelo chefe acertou sem defesa.');
    tips.push('Quando aparecer "Golpe pesado no próximo turno!", use Defender ou Interromper.');
  }
  const gap = f.monsterLevel - f.heroLevel;
  if (gap >= 2) {
    reasons.push(`A criatura é nível ${f.monsterLevel} e você está no nível ${f.heroLevel}.`);
    tips.push('Ganhe alguns níveis com criaturas mais fracas antes de voltar.');
  }
  if (f.monsterElement === 'FIRE' && f.fireResistance <= 0) {
    reasons.push('O ataque era de fogo e você não tem proteção contra fogo.');
    tips.push('Equipamentos com resistência ao fogo reduzem esse dano.');
  }
  if (f.statPoints > 0) tips.push(`Você tem ${f.statPoints} ponto(s) de atributo sem usar. Distribua em Atributos.`);
  if (f.healthPotions > 0) tips.push(`Você tem ${f.healthPotions} poção(ões) de vida na mochila. Use entre os combates para entrar com a vida cheia.`);
  if (f.mana >= f.healCost && f.lastAction !== 'HEAL') tips.push('Você ainda tinha mana para Curar. Cure-se quando a vida ficar abaixo da metade.');
  if (monsterHpPercent <= 25) reasons.push(`Foi por pouco: a criatura tinha só ${monsterHpPercent}% da vida.`);
  else if (monsterHpPercent >= 75 && gap < 2) tips.push('Melhore a arma no Ferreiro para causar mais dano.');
  if (!reasons.length) reasons.push(`A criatura ainda tinha ${monsterHpPercent}% da vida quando você caiu.`);
  // A ida ao Templo é sempre necessária (vida zerada), por isso entra por último e nunca é cortada.
  return { monsterHpPercent, reasons, tips: [...tips.slice(0, 3), 'Visite o Templo de Caipriel para recuperar a vida antes da revanche.'] };
}
