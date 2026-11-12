// Motor do Duelo (PvP): função pura, sem banco, sem relógio e com dado injetado (como groupEngine.ts).
// Os dois escolhem em segredo; quem tem mais agilidade age primeiro (empate no dado) e quem cai antes de agir não age.
// Golpe e cura usam as mesmas fórmulas do combate (strike/healRoll em core/engine.ts); só o dano final é escalado por pvp.damagePercent.
import { healRoll, strike, type Dice } from '../core/engine';
import { DUEL_MAX_ROUNDS, DUEL_MISSED_LIMIT, duelActionCosts, duelActionLabels, type DuelAction, type DuelMove, type DuelRoundRecord } from '../../../shared/pvp';

export interface DuelFighter {
  characterId: number; name: string; vocation: string; hp: number; maxHp: number; mana: number; maxMana: number;
  attack: number; defense: number; agility: number; criticalChance: number; dodgeChance: number;
  action: DuelAction | null; missed: number;
}
export type DuelResult = 'ONGOING' | 'VICTORY' | 'FORFEIT' | 'EXPIRED' | 'DRAW';
const strong = (a: DuelAction) => a === 'TRIPLE_HIT' || a === 'FIFTH_HIT';

// Ação que vale na rodada: quem não escolheu ergue a guarda (sem custo); sem mana para a escolhida, vira golpe comum.
export function effectiveDuelAction(f: Pick<DuelFighter, 'vocation' | 'mana' | 'action'>): { action: DuelAction; auto: boolean } {
  if (!f.action) return { action: 'DEFEND_SHIELD', auto: true };
  if (f.mana < duelActionCosts(f.vocation)[f.action]) return { action: 'ATTACK', auto: false };
  return { action: f.action, auto: false };
}

export function resolveDuelRound(round: number, pair: readonly [DuelFighter, DuelFighter], dice: Dice, damagePercent = 100) {
  const fighters = pair.map(f => ({ ...f })) as [DuelFighter, DuelFighter];
  const chosen = fighters.map(effectiveDuelAction);
  const moves: DuelMove[] = fighters.map((f, i) => ({ characterId: f.characterId, action: chosen[i].action, auto: chosen[i].auto, acted: false, first: false,
    dealt: 0, crit: false, dodged: false, healed: 0, interrupted: false, hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana }));
  const lines: string[] = [];
  const finish = (outcome: DuelResult, winnerId: number | null) => {
    fighters.forEach((f, i) => { moves[i].hp = f.hp; moves[i].mana = f.mana; f.action = null; });
    const record: DuelRoundRecord = { round, moves, lines };
    return { fighters, record, outcome, winnerId };
  };
  fighters.forEach((f, i) => { f.missed = chosen[i].auto ? f.missed + 1 : 0; });

  // Rendição.
  const flee = chosen.map(c => c.action === 'FLEE');
  if (flee[0] || flee[1]) {
    if (flee[0] && flee[1]) { lines.push('Os dois baixam as armas ao mesmo tempo. Empate.'); return finish('DRAW', null); }
    const loser = flee[0] ? 0 : 1;
    moves[loser].acted = true;
    lines.push(`${fighters[loser].name} baixa a arma e se rende.`);
    return finish('FORFEIT', fighters[1 - loser].characterId);
  }

  // Abandono: duas rodadas seguidas sem escolher.
  const gone = fighters.map(f => f.missed >= DUEL_MISSED_LIMIT);
  if (gone[0] || gone[1]) {
    if (gone[0] && gone[1]) { lines.push('Nenhum dos dois voltou à arena. O duelo termina empatado.'); return finish('DRAW', null); }
    const loser = gone[0] ? 0 : 1, winner = 1 - loser;
    lines.push(`${fighters[loser].name} não voltou à arena por duas rodadas e perde o duelo.`);
    return finish('EXPIRED', fighters[winner].characterId);
  }
  // Os dois pagam a mana do que escolheram.
  fighters.forEach((f, i) => { if (!chosen[i].auto) f.mana -= duelActionCosts(f.vocation)[chosen[i].action]; });
  const order = fighters[0].agility !== fighters[1].agility ? (fighters[0].agility > fighters[1].agility ? [0, 1] : [1, 0]) : (dice(0, 1) === 0 ? [0, 1] : [1, 0]);
  moves[order[0]].first = true;
  lines.push(`${fighters[order[0]].name} é mais rápido e age primeiro.`);
  for (const me of order) {
    const you = 1 - me, f = fighters[me], foe = fighters[you], action = chosen[me].action, label = duelActionLabels(f.vocation)[action];
    if (f.hp <= 0) break;
    if (moves[me].interrupted) { lines.push(`O golpe de ${f.name} foi cortado antes de sair.`); continue; }
    if (chosen[me].auto) { lines.push(`${f.name} não escolheu a tempo e só ergue a guarda.`); continue; }
    moves[me].acted = true;
    if (action === 'HEAL') {
      const healed = Math.min(f.maxHp - f.hp, healRoll(f, dice));
      f.hp += healed; moves[me].healed = healed;
      lines.push(`${f.name} cuida das feridas e recupera ${healed.toLocaleString('pt-BR')} de vida.`);
      continue;
    }
    const guard = chosen[you].action === 'DEFEND_SHIELD' ? 2.5 : 1;
    let { dealt, crit } = strike(f, foe.defense * guard, action, dice);
    dealt = Math.max(1, Math.floor(dealt * damagePercent / 100));
    if (foe.dodgeChance > 0 && dice(1, 100) <= foe.dodgeChance) {
      moves[me].dodged = true;
      lines.push(`${foe.name} se esquiva de ${label}!`);
    } else {
      foe.hp = Math.max(0, foe.hp - dealt); moves[me].dealt = dealt; moves[me].crit = crit;
      lines.push(`${f.name} usa ${label}: ${dealt.toLocaleString('pt-BR')} de dano${crit ? ' (crítico!)' : ''}.`);
    }
    // Interromper só funciona agindo antes do golpe forte do oponente.
    if (action === 'INTERRUPT' && me === order[0] && strong(chosen[you].action)) {
      moves[you].interrupted = true;
      lines.push(`${f.name} corta o ${duelActionLabels(foe.vocation)[chosen[you].action]} de ${foe.name}!`);
    }
    if (foe.hp === 0) lines.push(`${foe.name} cai. ${f.name} vence o duelo!`);
  }
  const down = fighters.findIndex(f => f.hp <= 0);
  if (down >= 0) return finish('VICTORY', fighters[1 - down].characterId);
  if (round >= DUEL_MAX_ROUNDS) { lines.push(`${DUEL_MAX_ROUNDS} rodadas e ninguém caiu. O duelo termina empatado.`); return finish('DRAW', null); }
  return finish('ONGOING', null);
}
