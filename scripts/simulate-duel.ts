// Uso: npm run duel:simulate -- [duelos=1000] [dano%=100]
// Duelos entre heróis típicos de cada vocação no mesmo nível (mesmo modelo de levels:simulate). Não toca no banco.
// Meta: nenhuma vocação acima de 60% contra outra do mesmo nível.
import { items } from '../backend/prisma/catalog';
import { hero, allVocations } from './levelSim';
import { resolveDuelRound, type DuelFighter } from '../backend/src/game/duelEngine';
import { duelActionCosts, type DuelAction } from '../shared/pvp';
import type { BaseVocation } from '../shared/adventure';

const duels = Number(process.argv[2] ?? 1000), damage = Number(process.argv[3] ?? 100);
let seed = 4242; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

function fighter(id: number, v: BaseVocation, level: number): DuelFighter {
  const h = hero(v, level, items);
  return { characterId: id, name: v, vocation: h.c.vocation, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana,
    attack: h.stats.attack, defense: h.stats.defense, agility: h.c.agility, criticalChance: h.stats.criticalChance, dodgeChance: h.stats.dodgeChance, action: null, missed: 0 };
}
// Política simples: cura ferido, às vezes interrompe, usa o golpe mais forte que a mana permite (guardando mana da cura).
function choose(f: DuelFighter): DuelAction {
  const c = duelActionCosts(f.vocation), r = rng();
  if (f.hp < f.maxHp * .35 && f.mana >= c.HEAL) return 'HEAL';
  if (r < .15 && f.mana >= c.INTERRUPT) return 'INTERRUPT';
  if (r < .25 && f.mana >= c.DEFEND_SHIELD) return 'DEFEND_SHIELD';
  if (f.mana >= c.FIFTH_HIT + c.HEAL) return 'FIFTH_HIT';
  if (f.mana >= c.TRIPLE_HIT + c.HEAL) return 'TRIPLE_HIT';
  return 'ATTACK';
}
function duel(a: BaseVocation, b: BaseVocation, level: number) {
  let wins = 0, draws = 0, rounds = 0;
  for (let n = 0; n < duels; n++) {
    // Metade dos duelos com cada um como desafiante (a ordem da dupla não deve importar).
    let pair: [DuelFighter, DuelFighter] = n % 2 ? [fighter(1, a, level), fighter(2, b, level)] : [fighter(2, b, level), fighter(1, a, level)];
    for (let round = 1; ; round++) {
      pair = pair.map(f => ({ ...f, action: choose(f) })) as typeof pair;
      const r = resolveDuelRound(round, pair, dice, damage);
      pair = r.fighters;
      if (r.outcome !== 'ONGOING') { if (r.winnerId === 1) wins++; if (!r.winnerId) draws++; rounds += round; break; }
    }
  }
  return { win: wins / duels, draw: draws / duels, rounds: rounds / duels };
}
const levels = [20, 100, 300, 600, 1000];
let worst = 0;
for (const level of levels) {
  console.log(`\nNível ${level} — ${duels} duelos por par, dano ${damage}% (taxa de vitória da linha contra a coluna; rodadas médias)`);
  console.log(''.padEnd(10) + allVocations.map(v => v.padStart(16)).join(''));
  for (const a of allVocations) {
    const cells = allVocations.map(b => { if (a === b) return '—'.padStart(16); const r = duel(a, b, level); if (r.win > worst) worst = r.win;
      return `${Math.round(r.win * 100)}% · ${r.rounds.toFixed(1)}r`.padStart(16); });
    console.log(a.padEnd(10) + cells.join(''));
  }
}
console.log(`\nMaior taxa de vitória entre vocações diferentes: ${Math.round(worst * 100)}% (meta: até 60%).`);
