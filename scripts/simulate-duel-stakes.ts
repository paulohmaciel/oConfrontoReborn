// Uso: npm run duel:stakes -- [dias=30] [jogadores=200] [nível=100] [chanceEspólio%=25] [taxaAposta%=5]
// O que um jogador pode GANHAR ou PERDER num duelo, e o que isso faz com a economia de uma vila de jogadores.
// Usa o motor real do duelo (duelEngine.ts) com os dois lados agindo; o resto (apostas, espólio, resgate, honra) é proposta
// para decisão do dono: nada aqui existe no jogo ainda. Não toca no banco.
import { items } from '../backend/prisma/catalog';
import { hero, allVocations } from './levelSim';
import { resolveDuelRound, type DuelFighter } from '../backend/src/game/duelEngine';
import { duelActionCosts, levelGap, type DuelAction } from '../shared/pvp';
import type { BaseVocation } from '../shared/adventure';

const [days, population, baseLevel, lootChance, wagerFee] = [30, 200, 100, 25, 5].map((d, i) => Number(process.argv[2 + i] ?? d));
let seed = 777; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
const pct = (n: number) => `${Math.round(n * 100)}%`;

// ----- Proposta de regras (tudo configurável por loadSettings se for aprovado) -----
const rules = {
  dailyLimit: 10,          // pvp.dailyLimit (já existe)
  levelBandPercent: 10,    // pvp.levelBandPercent (já existe)
  wagerMaxPercent: 10,     // aposta: no máximo N% do ouro em mãos do mais pobre dos dois
  wagerFeePercent: wagerFee, // taxa da arena sobre o pote (ralo)
  lootChancePercent: lootChance, // espólio: chance de o vencedor levar UM item da mochila do perdedor
  lootProtectTier: 7,      // itens +7 ou mais nunca caem (como a forja: raro demais para perder num dado)
  ransomHours: 48,         // o perdedor pode resgatar o item pagando ao vencedor o preço de loja
  ransomPercent: 100,      // resgate custa N% do preço de loja (vai para o vencedor, não some)
  honorK: 32,              // pontos de honra tipo Elo
  honorWin: 10, honorLoss: 4, // marcas de honra (moeda cosmética, só entra: ganha ao vencer, pouco ao perder)
};
type Mode = 'HONRA' | 'OURO' | 'ESPOLIO';
const modeMix: Record<Mode, number> = { HONRA: .5, OURO: .3, ESPOLIO: .2 }; // como os jogadores escolhem (desafiante propõe; oponente aceita 80%)

interface BagItem { name: string; price: number; tier: number }
interface Player {
  id: number; voc: BaseVocation; level: number; tier: number; smart: boolean;
  gold: number; bag: BagItem[]; honor: number; marks: number; wins: number; losses: number; streak: number; best: number;
  goldStart: number; wealthStart: number; duelsToday: number; lostItems: number; wonItems: number; ransomed: number;
}
const gearPrice = (level: number) => Math.round((12 * level * level + 200) / 10) * 10; // mesmo preço da loja em catalog.ts
const wealth = (p: Player) => p.gold + p.bag.reduce((t, i) => t + i.price, 0);
function makePlayer(id: number): Player {
  const level = Math.max(1, baseLevel + dice(-Math.floor(baseLevel * .08), Math.floor(baseLevel * .08)));
  const unit = gearPrice(level);
  // Ouro em mãos: entre 1 e 6 equipamentos da faixa; mochila com 3 a 8 itens vendáveis da faixa (preço 20–100% do equipamento).
  const bag = Array.from({ length: dice(3, 8) }, () => {
    const it = pick(items.filter(i => i.npcPrice > 0 && i.minLevel <= level && i.minLevel >= level * .4)) ?? { name: 'Sword', npcPrice: 80 };
    return { name: it.name, price: it.npcPrice, tier: rng() < .15 ? dice(1, 8) : 0 };
  });
  const p: Player = { id, voc: pick(allVocations), level, tier: dice(0, 4), smart: rng() < .6, gold: unit * (1 + rng() * 5), bag,
    honor: 1000, marks: 0, wins: 0, losses: 0, streak: 0, best: 0, goldStart: 0, wealthStart: 0, duelsToday: 0, lostItems: 0, wonItems: 0, ransomed: 0 };
  p.goldStart = p.gold; p.wealthStart = wealth(p);
  return p;
}
function fighter(p: Player): DuelFighter {
  const h = hero(p.voc, p.level, items, p.tier);
  return { characterId: p.id, name: `#${p.id}`, vocation: h.c.vocation, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana,
    attack: h.stats.attack, defense: h.stats.defense, agility: h.c.agility, criticalChance: h.stats.criticalChance, dodgeChance: h.stats.dodgeChance, action: null, missed: 0 };
}
function choose(f: DuelFighter, smart: boolean): DuelAction {
  const c = duelActionCosts(f.vocation), r = rng();
  if (!smart) return pick(['ATTACK', 'ATTACK', 'TRIPLE_HIT', 'DEFEND_SHIELD', 'HEAL'].filter(a => f.mana >= c[a as DuelAction]) as DuelAction[]) ?? 'ATTACK';
  if (f.hp < f.maxHp * .35 && f.mana >= c.HEAL) return 'HEAL';
  if (r < .15 && f.mana >= c.INTERRUPT) return 'INTERRUPT';
  if (r < .25 && f.mana >= c.DEFEND_SHIELD) return 'DEFEND_SHIELD';
  if (f.mana >= c.FIFTH_HIT + c.HEAL) return 'FIFTH_HIT';
  if (f.mana >= c.TRIPLE_HIT + c.HEAL) return 'TRIPLE_HIT';
  return 'ATTACK';
}
// Um duelo completo com os dois agindo a cada rodada. Devolve o vencedor (ou null no empate) e as rodadas.
function fightDuel(a: Player, b: Player) {
  let pair: [DuelFighter, DuelFighter] = [fighter(a), fighter(b)];
  for (let round = 1; ; round++) {
    pair = [{ ...pair[0], action: choose(pair[0], a.smart) }, { ...pair[1], action: choose(pair[1], b.smart) }];
    const r = resolveDuelRound(round, pair, dice, 100);
    pair = r.fighters;
    if (r.outcome !== 'ONGOING') return { winner: r.winnerId === a.id ? a : r.winnerId === b.id ? b : null, rounds: round, outcome: r.outcome };
  }
}

const totals = { duels: 0, draws: 0, rounds: 0, byMode: { HONRA: 0, OURO: 0, ESPOLIO: 0 } as Record<Mode, number>,
  goldMoved: 0, feeSunk: 0, itemsMoved: 0, itemValueMoved: 0, ransoms: 0, ransomGold: 0, lootRolls: 0, declined: 0, marks: 0 };
const players = Array.from({ length: population }, (_, i) => makePlayer(i + 1));

function settle(mode: Mode, w: Player, l: Player) {
  // Honra (sempre): pontos tipo Elo + marcas cosméticas. Nada sai do mundo.
  const expected = 1 / (1 + 10 ** ((l.honor - w.honor) / 400));
  const delta = Math.round(rules.honorK * (1 - expected));
  w.honor += delta; l.honor -= delta;
  w.marks += rules.honorWin; l.marks += rules.honorLoss; totals.marks += rules.honorWin + rules.honorLoss;
  if (mode === 'OURO') {
    // Os dois depositaram a mesma aposta ao aceitar (ouro travado, como no mercado). Pote menos taxa vai ao vencedor.
    const wager = Math.floor(Math.min(w.gold, l.gold) * rules.wagerMaxPercent / 100);
    const pot = wager * 2, fee = Math.max(wager > 0 ? 1 : 0, Math.floor(pot * rules.wagerFeePercent / 100));
    w.gold += pot - fee - wager; l.gold -= wager; totals.goldMoved += wager; totals.feeSunk += fee;
  }
  if (mode === 'ESPOLIO') {
    // Chance de o vencedor levar UM item da mochila do perdedor (nunca o equipado, nunca +7 ou mais).
    totals.lootRolls++;
    const eligible = l.bag.filter(i => i.tier < rules.lootProtectTier);
    if (eligible.length && dice(1, 100) <= rules.lootChancePercent) {
      const item = pick(eligible);
      l.bag.splice(l.bag.indexOf(item), 1); l.lostItems++; w.wonItems++;
      totals.itemsMoved++; totals.itemValueMoved += item.price;
      // Resgate: o perdedor paga o preço de loja ao vencedor e o item volta, se tiver ouro e o item valer a pena.
      const price = Math.floor(item.price * rules.ransomPercent / 100);
      if (l.gold >= price && item.price >= wealth(l) * .05) { l.gold -= price; w.gold += price; w.bag.push(item); w.bag.splice(w.bag.indexOf(item), 1); l.bag.push(item); l.ransomed++; totals.ransoms++; totals.ransomGold += price; }
      else w.bag.push(item);
    }
  }
}

for (let day = 1; day <= days; day++) {
  for (const p of players) p.duelsToday = 0;
  // Cada jogador tenta de 0 a 4 desafios por dia contra alguém da faixa de nível.
  for (const a of players) {
    const tries = dice(0, 4);
    for (let t = 0; t < tries && a.duelsToday < rules.dailyLimit; t++) {
      const b = pick(players.filter(x => x !== a && x.duelsToday < rules.dailyLimit && Math.abs(x.level - a.level) <= levelGap(a.level, x.level, rules.levelBandPercent)));
      if (!b) break;
      const r = rng(); const mode: Mode = r < modeMix.HONRA ? 'HONRA' : r < modeMix.HONRA + modeMix.OURO ? 'OURO' : 'ESPOLIO';
      // O oponente recusa mais quando há algo a perder; e nunca aposta o que não tem.
      const accept = mode === 'HONRA' ? .9 : mode === 'OURO' ? (b.gold > 0 ? .7 : 0) : (b.bag.length ? .5 : 0);
      if (rng() > accept) { totals.declined++; continue; }
      a.duelsToday++; b.duelsToday++; totals.duels++; totals.byMode[mode]++;
      const f = fightDuel(a, b); totals.rounds += f.rounds;
      if (!f.winner) { totals.draws++; continue; }
      const w = f.winner, l = w === a ? b : a;
      w.wins++; l.losses++; w.streak++; l.streak = 0; w.best = Math.max(w.best, w.streak);
      settle(mode, w, l);
    }
  }
}

// ----- Relatório -----
const sorted = [...players].sort((x, y) => wealth(y) - wealth(x));
const sum = (f: (p: Player) => number) => players.reduce((t, p) => t + f(p), 0);
const gini = (v: number[]) => { const s = [...v].sort((a, b) => a - b), n = s.length, tot = s.reduce((a, b) => a + b, 0); return tot ? s.reduce((acc, x, i) => acc + (2 * (i + 1) - n - 1) * x, 0) / (n * tot) : 0; };
const top10 = sorted.slice(0, Math.ceil(population / 10));
const ruined = players.filter(p => wealth(p) < p.wealthStart * .5).length;
const smartWin = sum(p => p.smart ? p.wins : 0) / Math.max(1, sum(p => p.smart ? p.wins + p.losses : 0));
console.log(`\nDuelos com apostas — ${days} dias, ${population} jogadores perto do nível ${baseLevel}, espólio ${rules.lootChancePercent}%, taxa da aposta ${rules.wagerFeePercent}%`);
console.log(`Duelos: ${fmt(totals.duels)} (honra ${fmt(totals.byMode.HONRA)}, ouro ${fmt(totals.byMode.OURO)}, espólio ${fmt(totals.byMode.ESPOLIO)}); recusados ${fmt(totals.declined)}; empates ${pct(totals.draws / totals.duels)}; ${(totals.rounds / totals.duels).toFixed(1)} rodadas por duelo`);
console.log(`Vitórias de quem joga com atenção: ${pct(smartWin)} (o resto escolhe golpes ao acaso)`);
console.log(`\nOURO — apostado ${fmt(totals.goldMoved)} (muda de mão, soma zero) · taxa da arena ${fmt(totals.feeSunk)} (sai do mundo) · ${pct(totals.feeSunk / Math.max(1, totals.goldMoved * 2))} do pote`);
console.log(`ESPÓLIO — ${fmt(totals.lootRolls)} duelos com item em jogo, ${fmt(totals.itemsMoved)} itens trocaram de dono (${pct(totals.itemsMoved / Math.max(1, totals.lootRolls))}), valor ${fmt(totals.itemValueMoved)} em preço de loja; resgatados ${fmt(totals.ransoms)} (${fmt(totals.ransomGold)} de ouro pagos ao vencedor)`);
console.log(`HONRA — marcas distribuídas ${fmt(totals.marks)} (só cosmético); pontos: melhor ${Math.max(...players.map(p => p.honor))}, pior ${Math.min(...players.map(p => p.honor))}, mediana ${[...players].sort((a, b) => a.honor - b.honor)[Math.floor(population / 2)].honor}`);
console.log(`\nRIQUEZA (ouro + mochila) — Gini antes ${gini(players.map(p => p.wealthStart)).toFixed(2)} → depois ${gini(players.map(wealth)).toFixed(2)}; 10% mais ricos têm ${pct(top10.reduce((t, p) => t + wealth(p), 0) / sum(wealth))}`);
console.log(`Jogadores que perderam mais da metade do que tinham: ${ruined} de ${population} (${pct(ruined / population)}); com ouro zerado: ${players.filter(p => p.gold < 1).length}`);
console.log(`Maior sequência de vitórias: ${Math.max(...players.map(p => p.best))}; quem mais ganhou itens: ${Math.max(...players.map(p => p.wonItems))}; quem mais perdeu itens: ${Math.max(...players.map(p => p.lostItems))}`);
console.log(`\nOs 5 mais ricos (saldo em relação ao começo):`);
for (const p of sorted.slice(0, 5)) console.log(`  #${p.id} ${p.voc.padEnd(9)} nível ${p.level} +${p.tier} ${p.smart ? 'atento ' : 'ao acaso'} · ${fmt(wealth(p))} (${wealth(p) >= p.wealthStart ? '+' : ''}${pct(wealth(p) / p.wealthStart - 1)}) · ${p.wins}V/${p.losses}D · honra ${p.honor}`);
console.log(`Os 5 mais pobres:`);
for (const p of sorted.slice(-5)) console.log(`  #${p.id} ${p.voc.padEnd(9)} nível ${p.level} +${p.tier} ${p.smart ? 'atento ' : 'ao acaso'} · ${fmt(wealth(p))} (${pct(wealth(p) / p.wealthStart - 1)}) · ${p.wins}V/${p.losses}D · itens perdidos ${p.lostItems}, resgatados ${p.ransomed}`);
