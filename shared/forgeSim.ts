// Simulador do Ferreiro: calcula, SEM sorteio, quanto custa em média chegar ao +10 (ou a outro alvo).
// Usa exatamente as mesmas regras do jogo (upgradeSuccessPercent / upgradeBreakPercent).
import { UpgradeRules, upgradeBreakPercent, upgradeSuccessPercent, resolveUpgrade } from './economy';

export interface ForgeAnalysis {
  target: number;
  /** Chance de um mesmo item chegar ao alvo sem nunca quebrar (0..1). */
  survivalChance: number;
  /** Ouro esperado (item inicial + melhorias + reposição dos itens quebrados, partindo de um item +0 novo. */
  expectedGold: number;
  /** Itens-base esperados para queimar (inclui o primeiro) até conseguir 1 item no alvo. */
  expectedItemsUsed: number;
  /** Tentativas esperadas de melhoria. */
  expectedAttempts: number;
  /** Por nível: chances e custo esperado para sair dele. */
  steps: { tier: number; successPct: number; breakPct: number; failKeepPct: number; cost: number }[];
}

/** Valor esperado de um "custo" somado a cada tentativa (attemptCost) e a cada item quebrado (lossCost), até o alvo. */
function expected(rules: UpgradeRules, safeUntilTier: number, target: number, attemptCost: (tier: number) => number, lossCost: number): number {
  // E[t] = a[t] + k[t]*E0, onde E0 é o valor partindo de +0 (item quebrado volta ao +0 com um item novo).
  let a = 0, k = 0; // E[target] = 0
  for (let t = target - 1; t >= 0; t--) {
    const p = upgradeSuccessPercent(t, safeUntilTier) / 100;
    const b = upgradeBreakPercent(t, rules) / 100;
    const move = p + b; // chance de sair do estado (sucesso ou quebra)
    a = (attemptCost(t) + b * lossCost + p * a) / move;
    k = (b + p * k) / move;
  }
  return a / (1 - k);
}

export function analyzeForge(rules: UpgradeRules, target: number, upgradeCost: (tier: number) => number, baseItemCost: number): ForgeAnalysis {
  if (!Number.isInteger(target) || target < 1 || target > 10) throw new RangeError('Alvo inválido.');
  const s = rules.safeUntilTier;
  let survival = 1;
  const steps: ForgeAnalysis['steps'] = [];
  for (let t = 0; t < target; t++) {
    const p = upgradeSuccessPercent(t, s), b = upgradeBreakPercent(t, rules);
    survival *= p / (p + b);
    steps.push({ tier: t, successPct: p, breakPct: b, failKeepPct: 100 - p - b, cost: upgradeCost(t) });
  }
  return {
    target, survivalChance: survival, steps,
    expectedGold: baseItemCost + expected(rules, s, target, upgradeCost, baseItemCost),
    expectedItemsUsed: 1 + expected(rules, s, target, () => 0, 1),
    expectedAttempts: expected(rules, s, target, () => 1, 0),
  };
}

/** Conferência por sorteio: usa resolveUpgrade de verdade. rng deve devolver [0,1). */
export function monteCarloForge(rules: UpgradeRules, target: number, upgradeCost: (tier: number) => number, baseItemCost: number, runs: number, rng: () => number) {
  let gold = 0, items = 0, attempts = 0;
  const roll = () => 1 + Math.floor(rng() * 100);
  for (let r = 0; r < runs; r++) {
    items++; gold += baseItemCost; let tier = 0;
    while (tier < target) {
      gold += upgradeCost(tier); attempts++;
      const o = resolveUpgrade(tier, rules, roll(), roll());
      if (o === 'SUCCESS') tier++;
      else if (o === 'BROKE') { tier = 0; items++; gold += baseItemCost; }
    }
  }
  return { expectedGold: gold / runs, expectedItemsUsed: items / runs, expectedAttempts: attempts / runs };
}
