// Uso: npm run group:simulate -- [lutas=300]
// Simula as quatro caçadas em grupo com heróis típicos do nível de cada uma (mesmo modelo de levels:simulate). Não toca no banco.
import { items } from '../backend/prisma/catalog';
import { hero, resetRng } from './levelSim';
import { resolveGroupRound, type GroupBoss, type GroupFighter } from '../backend/src/game/groupEngine';
import { groupHunts, groupIntent, groupActions, type GroupAction, type GroupHunt } from '../shared/groupHunt';
import type { BaseVocation } from '../shared/adventure';

const fights = Number(process.argv[2] ?? 300);
let seed = 777; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
type Policy = (f: GroupFighter, all: GroupFighter[], round: number, boss: GroupBoss, hunt: GroupHunt) => GroupAction;

// Grupo atento: cada um faz o seu papel; no golpe pesado, quem não quebra o golpe defende.
const teamwork: Policy = (f, all, round, boss, hunt) => {
  if (boss.phase === 'CHOICE') return 'SLEEP';
  const v = f.vocation, can = (a: GroupAction) => f.mana >= groupActions[a].mana, stomp = groupIntent(round, hunt).kind === 'STOMP';
  const sorcerer = all.some(o => o.hp > 0 && o.vocation === 'SORCERER' && o.mana >= groupActions.BREAK_SEAL.mana);
  const hurt = all.some(o => o.hp > 0 && o.hp < o.maxHp * (boss.mechanic === 'mist' ? .8 : .5));
  if (v === 'DRUID' && can('HEAL_ALL') && hurt) return 'HEAL_ALL';
  if (v === 'SORCERER' && can('BREAK_SEAL') && (stomp || boss.counters > 0 || true)) return 'BREAK_SEAL';
  if (stomp && !sorcerer) return 'DEFEND';
  if (v === 'KNIGHT' && can('HOLD') && all.find(o => o.hp > 0 && o.vocation === 'KNIGHT') === f) return 'HOLD';
  if (v === 'PALADIN' && can('AIM')) return 'AIM';
  return 'ATTACK';
};
const careless: Policy = (_f, _all, _round, boss) => boss.phase === 'CHOICE' ? 'SLAY' : 'ATTACK';

function run(hunt: GroupHunt, party: BaseVocation[], policy: Policy) {
  let wins = 0, bonus = 0, rounds = 0, hpLeft = 0;
  resetRng();
  for (let n = 0; n < fights; n++) {
    let fighters: GroupFighter[] = party.map((v, i) => { const h = hero(v, hunt.level, items);
      return { characterId: i + 1, name: v, vocation: v, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana,
        attack: h.stats.attack, defense: h.stats.defense, criticalChance: h.stats.criticalChance, dodgeChance: h.stats.dodgeChance, action: null }; });
    const hp = hunt.hpPerHero * party.length;
    let boss: GroupBoss = { hp, maxHp: hp, attack: hunt.attack, defense: hunt.defense, mechanic: hunt.mechanic, counters: hunt.counters, maxCounters: hunt.counters, freed: false, phase: 'FIGHT', choice: null };
    for (let round = 1; ; round++) {
      fighters = fighters.map(f => ({ ...f, action: f.hp > 0 ? policy(f, fighters, round, boss, hunt) : null }));
      const r = resolveGroupRound(round, boss, fighters, dice, hunt);
      boss = r.boss; fighters = r.fighters;
      if (r.outcome !== 'ONGOING') { if (r.outcome === 'VICTORY') { wins++; if (boss.freed) bonus++; } rounds += round; hpLeft += fighters.reduce((s, f) => s + f.hp / f.maxHp, 0) / fighters.length; break; }
    }
  }
  const pct = (x: number) => `${Math.round(x / fights * 100)}%`.padStart(4);
  return `vitórias ${pct(wins)}${hunt.bonusText ? ` · bônus ${pct(bonus)}` : ''} · rodadas ${(rounds / fights).toFixed(1).padStart(4)} · vida restante ${pct(hpLeft)}`;
}
const parties: BaseVocation[][] = [['KNIGHT', 'PALADIN'], ['DRUID', 'SORCERER'], ['KNIGHT', 'KNIGHT'], ['KNIGHT', 'PALADIN', 'DRUID'], ['KNIGHT', 'PALADIN', 'DRUID', 'SORCERER'], ['KNIGHT', 'KNIGHT', 'KNIGHT', 'KNIGHT']];
const only = process.argv[3];
for (const hunt of groupHunts.filter(h => !only || h.key === only)) {
  console.log(`\n${hunt.name} — nível ${hunt.level}, ${fights} lutas por grupo`);
  for (const p of parties) {
    console.log(`${p.join('+').padEnd(32)} papel: ${run(hunt, p, teamwork)}`);
    console.log(`${''.padEnd(32)} só ataca: ${run(hunt, p, careless)}`);
  }
}
