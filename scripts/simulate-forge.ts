// Uso: npm run forge:simulate -- [preçoNPC=1000] [alvo=10] [segurosAté=3] [quebraAPartirDe=6] [quebraNaFalha=50]
// Mostra quanto custa, em média, chegar ao +10 com as regras do jogo. Não toca no banco.
import { analyzeForge, monteCarloForge } from '../shared/forgeSim';
import { upgradePrice } from '../backend/src/game/gameRules';

const [npc = 1000, target = 10, safe = 3, from = 6, brk = 50] = process.argv.slice(2).map(Number);
const rules = { safeUntilTier: safe, breakFromTier: from, breakOnFailPercent: brk };
const cost = (t: number) => Number(upgradePrice(npc, t));
const a = analyzeForge(rules, target, cost, npc);
const n = (x: number) => Math.round(x).toLocaleString('pt-BR');
console.log(`\nFerreiro — item de ${n(npc)} ouro (NPC), alvo +${target}; seguro até +${safe}; quebra a partir da tentativa de sair de +${from}; ${brk}% das falhas quebram\n`);
console.log('de   sucesso  falha(preserva)  QUEBRA   custo da tentativa');
for (const s of a.steps) console.log(`+${String(s.tier).padEnd(3)} ${String(s.successPct).padStart(5)}%  ${String(s.failKeepPct).padStart(11)}%  ${String(s.breakPct).padStart(7)}%   ${n(s.cost).padStart(12)}`);
console.log(`\nChance de UM item chegar a +${target} sem nunca quebrar: ${(a.survivalChance * 100).toFixed(1)}%`);
console.log(`Itens-base queimados em média por um +${target}:        ${a.expectedItemsUsed.toFixed(1)}`);
console.log(`Tentativas em média:                                 ${a.expectedAttempts.toFixed(1)}`);
console.log(`Ouro médio (melhorias + reposição dos itens quebrados): ${n(a.expectedGold)}`);
let x = 12345; const rng = () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
const mc = monteCarloForge(rules, target, cost, npc, 20000, rng);
console.log(`Conferência por sorteio (20.000 rodadas): ${n(mc.expectedGold)} ouro, ${mc.expectedItemsUsed.toFixed(1)} itens.\n`);
