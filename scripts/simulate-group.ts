// Uso: npm run group:simulate -- [lutas=400]
// Simula a caçada em grupo com heróis típicos do nível da caçada (mesmo modelo de levels:simulate). Não toca no banco.
import { items } from '../backend/prisma/catalog';
import { hero, resetRng } from './levelSim';
import { resolveGroupRound, type GroupBoss, type GroupFighter } from '../backend/src/game/groupEngine';
import { groupHunts, groupIntent, groupActions, type GroupAction } from '../shared/groupHunt';
import type { BaseVocation } from '../shared/adventure';

const fights = Number(process.argv[2] ?? 400);
let seed = 777; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

// Grupo atento: cada um faz o seu papel; no pisoteio, quem não quebra o selo defende.
function teamwork(f: GroupFighter, all: GroupFighter[], round: number): GroupAction {
  const v = f.vocation, can = (a: GroupAction) => f.mana >= groupActions[a].mana, stomp = groupIntent(round).kind === 'STOMP';
  const sorcerer = all.some(o => o.hp > 0 && o.vocation === 'SORCERER' && o.mana >= groupActions.BREAK_SEAL.mana);
  if (v === 'DRUID' && can('HEAL_ALL') && all.some(o => o.hp > 0 && o.hp < o.maxHp * .5)) return 'HEAL_ALL';
  if (v === 'SORCERER' && stomp && can('BREAK_SEAL')) return 'BREAK_SEAL';
  if (stomp && !sorcerer) return 'DEFEND';
  if (v === 'KNIGHT' && can('HOLD') && all.find(o => o.hp > 0 && o.vocation === 'KNIGHT') === f) return 'HOLD';
  if (v === 'PALADIN' && can('AIM')) return 'AIM';
  if (v === 'SORCERER' && can('BREAK_SEAL')) return 'BREAK_SEAL';
  return 'ATTACK';
}
const careless = (): GroupAction => 'ATTACK';

function run(party: BaseVocation[], policy: typeof teamwork) {
  const hunt = groupHunts[0];
  let wins = 0, freed = 0, rounds = 0, hpLeft = 0;
  resetRng();
  for (let n = 0; n < fights; n++) {
    let fighters: GroupFighter[] = party.map((v, i) => { const h = hero(v, hunt.level, items);
      return { characterId: i + 1, name: v, vocation: v, hp: h.maxHp, maxHp: h.maxHp, mana: h.maxMana, maxMana: h.maxMana,
        attack: h.stats.attack, defense: h.stats.defense, criticalChance: h.stats.criticalChance, dodgeChance: h.stats.dodgeChance, action: null }; });
    let boss: GroupBoss = { hp: hunt.hpPerHero * party.length, maxHp: hunt.hpPerHero * party.length, attack: hunt.attack, defense: hunt.defense, chains: hunt.chains ?? 0, freed: false };
    for (let round = 1; ; round++) {
      fighters = fighters.map(f => ({ ...f, action: f.hp > 0 ? policy(f, fighters, round) : null }));
      const r = resolveGroupRound(round, boss, fighters, dice);
      boss = r.boss; fighters = r.fighters;
      if (r.outcome !== 'ONGOING') { if (r.outcome === 'VICTORY') { wins++; if (boss.freed) freed++; } rounds += round; hpLeft += fighters.reduce((s, f) => s + f.hp / f.maxHp, 0) / fighters.length; break; }
    }
  }
  const pct = (x: number) => `${Math.round(x / fights * 100)}%`.padStart(4);
  return `vitórias ${pct(wins)} · libertou ${pct(freed)} · rodadas ${(rounds / fights).toFixed(1).padStart(4)} · vida restante ${pct(hpLeft)}`;
}
const parties: BaseVocation[][] = [['KNIGHT', 'PALADIN'], ['DRUID', 'SORCERER'], ['KNIGHT', 'KNIGHT'], ['KNIGHT', 'PALADIN', 'DRUID'], ['KNIGHT', 'PALADIN', 'DRUID', 'SORCERER'], ['KNIGHT', 'KNIGHT', 'KNIGHT', 'KNIGHT']];
console.log(`${groupHunts[0].name} — nível ${groupHunts[0].level}, ${fights} lutas por grupo`);
for (const p of parties) {
  console.log(`${p.join('+').padEnd(32)} papel: ${run(p, teamwork)}`);
  console.log(`${''.padEnd(32)} só ataca: ${run(p, careless)}`);
}
