// Uso: npm run levels:calibrate [-- --write]
// Para cada monstro do catálogo, acha vida, ataque e defesa que dão o ritmo-alvo de luta contra o herói típico do nível
// (média das 4 vocações, melhor equipamento +0). XP e ouro não mudam. Com --write, regrava o bloco <monstros> de catalog.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { items, monsters, type CatalogMonster } from '../backend/prisma/catalog';
import { allVocations, evaluate, hero, resetRng, type Foe } from './levelSim';

// Ritmo-alvo: lutas curtas no começo; depois 5 turnos e ~12% da vida. Chefes: o dobro de turnos e ~40% da vida.
function target(m: CatalogMonster) {
  const turns = m.level < 5 ? 2.5 : m.level < 12 ? 3.5 : 5, lost = m.level < 5 ? .05 : m.level < 12 ? .08 : .12;
  return m.isBoss ? { turns: turns * 2, lost: m.level < 10 ? .3 : .4 } : { turns, lost };
}
function search(lo: number, hi: number, measure: (x: number) => number, goal: number) {
  for (let i = 0; i < 30 && hi - lo > 1; i++) { const mid = Math.round((lo + hi) / 2); if (measure(mid) < goal) lo = mid; else hi = mid; }
  return hi;
}
const fights = 120;
const run = (level: number, foe: Foe) => { resetRng(); return evaluate(level, foe, items, fights); };
const calibrated = monsters.map(m => {
  const goal = target(m), foe: Foe = { hp: 1, attack: 1, defense: 0, isBoss: m.isBoss, element: m.element, regionKey: m.regionKey };
  const avgAttack = allVocations.reduce((t, v) => t + hero(v, m.level, items).stats.attack, 0) / allVocations.length;
  foe.defense = Math.round(avgAttack * .3);
  for (let round = 0; round < 2; round++) {
    foe.hp = search(5, 5_000_000, hp => run(m.level, { ...foe, hp }).turns, goal.turns);
    foe.attack = search(1, 200_000, attack => run(m.level, { ...foe, attack }).lost, goal.lost);
  }
  const r = run(m.level, foe);
  console.log(`${String(m.level).padStart(4)} ${(m.name + (m.isBoss ? ' (chefe)' : '')).padEnd(26)} vida ${String(foe.hp).padStart(7)}  ataque ${String(foe.attack).padStart(5)}  defesa ${String(foe.defense).padStart(4)}  → ${r.turns.toFixed(1)} turnos, ${Math.round(r.lost * 100)}% da vida, ${Math.round(r.win * 100)}% vitórias`);
  return { ...m, hp: foe.hp, attack: foe.attack, defense: foe.defense };
});

if (process.argv.includes('--write')) {
  const file = 'backend/prisma/catalog.ts', src = readFileSync(file, 'utf8');
  const start = src.indexOf('// <monstros>'), end = src.indexOf('// </monstros>');
  const fmt = (m: CatalogMonster) => '  { ' + Object.entries(m).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ') + ' },';
  const block = `// <monstros>\nexport const monsters: CatalogMonster[] = [\n${calibrated.map(fmt).join('\n')}\n];\n`;
  writeFileSync(file, src.slice(0, start) + block + src.slice(end));
  console.log(`\n${file} atualizado (${calibrated.length} monstros).`);
}
