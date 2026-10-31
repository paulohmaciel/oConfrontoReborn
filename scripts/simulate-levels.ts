// Uso: npm run levels:simulate -- [lutas=400] [melhoria=0] [lutasPorHora=100]
// Coloca um personagem de cada vocação no nível de cada monstro do banco, com o melhor equipamento disponível
// e os pontos distribuídos de forma típica, e simula lutas com o motor do jogo. Só LÊ o banco.
import { PrismaClient } from '@prisma/client';
import { resolveTurn, monsterIntent, type Action } from '../backend/src/core/engine';
import { combatStats } from '../backend/src/game/combatStats';
import { vocations, promotion, promotedOf, skillCosts, vocationAllowed, type BaseVocation } from '../shared/adventure';
import { MAX_LEVEL, expForLevel, levelGains, monsterXpTarget } from '../shared/progression';

const [fights = 400, tier = 0, perHour = 100] = process.argv.slice(2).map(Number);
const prisma = new PrismaClient();
let seed = 12345; const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const dice = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
// Distribuição típica dos pontos ganhos (força, vitalidade, agilidade, resistência).
const split: Record<BaseVocation, [number, number, number, number]> = { KNIGHT: [.6, .4, 0, 0], PALADIN: [.5, .2, .3, 0], SORCERER: [.1, .3, 0, .6], DRUID: [.1, .3, 0, .6] };
const gearSlots = ['WEAPON', 'ARMOR', 'HELMET', 'LEGS', 'BOOTS', 'SHIELD', 'AMULET', 'RING'];
type Blueprint = Awaited<ReturnType<typeof prisma.itemBlueprint.findMany>>[number];
type Monster = Awaited<ReturnType<typeof prisma.monster.findMany>>[number];

function hero(voc: BaseVocation, level: number, items: Blueprint[]) {
  const points = 3 + (level - 1) * levelGains.statPoints, [s, v, a, r] = split[voc].map(f => Math.floor(points * f));
  const c = { strength: 10 + s, vitality: 10 + v, agility: 10 + a, resistance: 10 + r, level, vocation: level >= promotion.minLevel ? promotedOf[voc] : voc };
  const gear = gearSlots.flatMap(slot => {
    const best = items.filter(i => i.slot === slot && i.minLevel <= level && vocationAllowed(i.vocations, c.vocation))
      .sort((x, y) => (y.attack + y.magicAttack + y.defense + y.armor) - (x.attack + x.magicAttack + x.defense + x.armor))[0];
    return best ? [{ upgradeTier: tier, blueprint: best }] : [];
  });
  const maxHp = 150 + (level - 1) * levelGains.hp + v * 15, maxMana = 55 + (level - 1) * levelGains.mana + r * 15;
  return { c, maxHp, maxMana, stats: combatStats(c, gear) };
}
// Política simples de jogador atento: cura com pouca vida, defende golpe anunciado, usa a habilidade mais forte que puder.
function choose(hp: number, maxHp: number, mana: number, costs: Record<Action, number>, warning: boolean): Action {
  if (hp < maxHp * .35 && mana >= costs.HEAL) return 'HEAL';
  if (warning && mana >= costs.DEFEND_SHIELD) return 'DEFEND_SHIELD';
  if (mana >= costs.FIFTH_HIT + costs.HEAL) return 'FIFTH_HIT';
  if (mana >= costs.TRIPLE_HIT + costs.HEAL) return 'TRIPLE_HIT';
  return 'ATTACK';
}
function fight(h: ReturnType<typeof hero>, m: Monster) {
  const costs = skillCosts(h.c.vocation);
  let hp = h.maxHp, mana = h.maxMana, monsterHp = m.hp, turn = 0;
  while (turn < 60) {
    const action = choose(hp, h.maxHp, mana, costs, monsterIntent(m, turn).warning);
    const r = resolveTurn({ hp, maxHp: h.maxHp, mana, ...h.stats, agility: h.c.agility, vocation: h.c.vocation },
      { hp: monsterHp, attack: m.attack, defense: m.defense, isBoss: m.isBoss, turn, element: m.element }, action, dice);
    hp = r.hp; mana = r.mana; monsterHp = r.monsterHp; turn++;
    if (r.status !== 'ONGOING') return { won: r.status === 'VICTORY', turns: turn, hpLost: 1 - hp / h.maxHp };
  }
  return { won: false, turns: turn, hpLost: 1 - hp / h.maxHp };
}

async function main() {
  const [monsters, items] = await Promise.all([prisma.monster.findMany({ orderBy: [{ level: 'asc' }, { id: 'asc' }] }),
    prisma.itemBlueprint.findMany({ where: { slot: { notIn: ['LOOT', 'CONSUMABLE', 'AMMO', 'BACKPACK'] } } })]);
  const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5), n = (x: number) => Math.round(x).toLocaleString('pt-BR');
  console.log(`\nNíveis — ${fights} lutas por linha, equipamento +${tier}, vida e mana cheias no início de cada luta.`);
  console.log('Lutas/nível = XP para subir no nível do monstro ÷ XP do monstro. Alvo da curva: ~31 (PLANO-NIVEIS.md).\n');
  console.log('nível  monstro                 XP     alvo    lutas/nív  vocação      vitória  turnos  vida perdida');
  for (const m of monsters) {
    const toNext = Number(expForLevel(m.level + 1) - expForLevel(m.level)), perLevel = toNext / Math.max(1, m.experience);
    for (const voc of Object.keys(vocations) as BaseVocation[]) {
      const h = hero(voc, m.level, items);
      let wins = 0, turns = 0, lost = 0;
      for (let i = 0; i < fights; i++) { const r = fight(h, m); if (r.won) wins++; turns += r.turns; lost += r.hpLost; }
      const head = voc === 'KNIGHT' ? `${String(m.level).padStart(5)}  ${(m.name + (m.isBoss ? ' (chefe)' : '')).padEnd(22)} ${n(m.experience).padStart(6)} ${n(monsterXpTarget(m.level)).padStart(7)}  ${perLevel.toFixed(0).padStart(9)}  ` : ' '.repeat(57);
      console.log(`${head}${vocations[voc].name.padEnd(11)} ${pct(wins / fights)}  ${(turns / fights).toFixed(1).padStart(6)}  ${pct(lost / fights).padStart(12)}`);
    }
  }
  const top = monsters.filter(m => !m.isBoss).at(-1), boss = monsters.filter(m => m.isBoss).at(-1);
  console.log(`\nÚltimo monstro comum: nível ${top?.level ?? '?'} (${top?.name ?? '—'}). Último chefe: nível ${boss?.level ?? '?'} (${boss?.name ?? '—'}). Teto do jogo: ${MAX_LEVEL}.`);
  console.log(`Na curva-alvo, a ${perHour} lutas/h: nível 100 em ~${n(hours(100))} h, 250 em ~${n(hours(250))} h, ${MAX_LEVEL} em ~${n(hours(MAX_LEVEL))} h.\n`);
}
function hours(target: number) {
  let total = 0;
  for (let l = 1; l < target; l++) total += Number(expForLevel(l + 1) - expForLevel(l)) / Math.max(1, monsterXpTarget(Math.max(1, l - 3)));
  return total / perHour;
}
main().finally(() => prisma.$disconnect());
