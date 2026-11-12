// Herói típico e luta simulada, usados por `levels:simulate` e `levels:calibrate`. Usa o motor do jogo; não toca no banco.
import { resolveTurn, monsterIntent, type Action } from '../backend/src/core/engine';
import { combatStats } from '../backend/src/game/combatStats';
import { vocations, promotion, promotedOf, skillCosts, vocationAllowed, type BaseVocation } from '../shared/adventure';
import { levelGains } from '../shared/progression';
import type { CatalogItem } from '../backend/prisma/catalog';

export const allVocations = Object.keys(vocations) as BaseVocation[];
let seed = 12345; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
export const resetRng = (s = 12345) => { seed = s; };
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
// Distribuição típica dos pontos ganhos (força, vitalidade, agilidade, resistência).
const split: Record<BaseVocation, [number, number, number, number]> = { KNIGHT: [.6, .4, 0, 0], PALADIN: [.5, .2, .3, 0], SORCERER: [.1, .3, 0, .6], DRUID: [.1, .3, 0, .6] };
const gearSlots = ['WEAPON', 'ARMOR', 'HELMET', 'LEGS', 'BOOTS', 'SHIELD', 'AMULET', 'RING', 'AMMO'];
const power = (i: CatalogItem) => i.attack + (i.magicAttack ?? 0) + i.defense + i.armor + (i.criticalChance ?? 0) + (i.fireResistance ?? 0) / 2 + (i.speed ?? 0);
export type Hero = ReturnType<typeof hero>;
export interface Foe { hp: number; attack: number; defense: number; isBoss?: boolean; element?: string }

// Personagem no nível, com os pontos distribuídos e o melhor equipamento da loja que ele pode usar.
export function hero(voc: BaseVocation, level: number, items: CatalogItem[], tier = 0) {
  const points = 3 + (level - 1) * levelGains.statPoints, [s, v, a, r] = split[voc].map(f => Math.floor(points * f));
  const c = { strength: 10 + s, vitality: 10 + v, agility: 10 + a, resistance: 10 + r, level, vocation: level >= promotion.minLevel ? promotedOf[voc] : voc };
  const gear = gearSlots.flatMap(slot => {
    const best = items.filter(i => i.slot === slot && i.npcPrice > 0 && i.minLevel <= level && vocationAllowed(i.vocations ?? 'ALL', c.vocation)).sort((x, y) => power(y) - power(x))[0];
    return best ? [{ upgradeTier: tier, blueprint: { magicAttack: 0, criticalChance: 0, fireResistance: 0, speed: 0, ...best } }] : [];
  });
  const maxHp = 150 + (level - 1) * levelGains.hp + v * 15, maxMana = 55 + (level - 1) * levelGains.mana + r * 15;
  return { c, maxHp, maxMana, stats: combatStats(c, gear) };
}
// Política de jogador atento: cura com pouca vida, defende golpe anunciado, usa a habilidade mais forte que puder.
function choose(hp: number, maxHp: number, mana: number, costs: Record<Action, number>, warning: boolean): Action {
  if (hp < maxHp * .35 && mana >= costs.HEAL) return 'HEAL';
  if (warning && mana >= costs.DEFEND_SHIELD) return 'DEFEND_SHIELD';
  if (mana >= costs.FIFTH_HIT + costs.HEAL) return 'FIFTH_HIT';
  if (mana >= costs.TRIPLE_HIT + costs.HEAL) return 'TRIPLE_HIT';
  return 'ATTACK';
}
export function fight(h: Hero, m: Foe) {
  const costs = skillCosts(h.c.vocation);
  let hp = h.maxHp, mana = h.maxMana, monsterHp = m.hp, turn = 0;
  while (turn < 60) {
    const action = choose(hp, h.maxHp, mana, costs, monsterIntent({ ...m, turn }, turn).warning);
    const r = resolveTurn({ hp, maxHp: h.maxHp, mana, ...h.stats, agility: h.c.agility, vocation: h.c.vocation },
      { hp: monsterHp, attack: m.attack, defense: m.defense, isBoss: m.isBoss, turn, element: m.element }, action, dice);
    hp = r.hp; mana = r.mana; monsterHp = r.monsterHp; turn++;
    if (r.status !== 'ONGOING') return { won: r.status === 'VICTORY', turns: turn, hpLost: 1 - hp / h.maxHp };
  }
  return { won: false, turns: turn, hpLost: 1 - hp / h.maxHp };
}
// Média das quatro vocações, com `fights` lutas cada.
export function evaluate(level: number, m: Foe, items: CatalogItem[], fights = 200, tier = 0) {
  const rows = allVocations.map(voc => {
    const h = hero(voc, level, items, tier);
    let wins = 0, turns = 0, lost = 0;
    for (let i = 0; i < fights; i++) { const r = fight(h, m); if (r.won) wins++; turns += r.turns; lost += r.hpLost; }
    return { voc, win: wins / fights, turns: turns / fights, lost: lost / fights };
  });
  const avg = (k: 'win' | 'turns' | 'lost') => rows.reduce((t, r) => t + r[k], 0) / rows.length;
  return { rows, win: avg('win'), turns: avg('turns'), lost: avg('lost') };
}
