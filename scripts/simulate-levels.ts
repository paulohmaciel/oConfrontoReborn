// Uso: npm run levels:simulate -- [lutas=400] [melhoria=0] [lutasPorHora=100]
// Coloca um personagem de cada vocação no nível de cada monstro do catálogo (o que o seed grava), com o melhor
// equipamento da loja e os pontos distribuídos de forma típica, e simula lutas com o motor do jogo. Não toca no banco.
import { items, monsters } from '../backend/prisma/catalog';
import { evaluate, resetRng } from './levelSim';
import { vocations } from '../shared/adventure';
import { MAX_LEVEL, expForLevel, monsterXpTarget } from '../shared/progression';

const [fights = 400, tier = 0, perHour = 100] = process.argv.slice(2).map(Number);
const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5), n = (x: number) => Math.round(x).toLocaleString('pt-BR');
console.log(`\nNíveis — ${fights} lutas por linha, equipamento +${tier}, vida e mana cheias no início de cada luta.`);
console.log('Lutas/nível = XP para subir no nível do monstro ÷ XP do monstro. Alvo da curva: ~31 (PLANO-NIVEIS.md).\n');
console.log('nível  monstro                      XP      alvo  lutas/nív  vocação      vitória  turnos  vida perdida');
for (const m of [...monsters].sort((a, b) => a.level - b.level)) {
  const toNext = Number(expForLevel(m.level + 1) - expForLevel(m.level)), perLevel = toNext / Math.max(1, m.experience);
  resetRng();
  evaluate(m.level, m, items, fights, tier).rows.forEach((r, i) => {
    const head = i === 0 ? `${String(m.level).padStart(5)}  ${(m.name + (m.isBoss ? ' (chefe)' : '')).padEnd(26)} ${n(m.experience).padStart(7)} ${n(monsterXpTarget(m.level)).padStart(8)}  ${perLevel.toFixed(0).padStart(9)}  ` : ' '.repeat(65);
    console.log(`${head}${vocations[r.voc].name.padEnd(11)} ${pct(r.win)}  ${r.turns.toFixed(1).padStart(6)}  ${pct(r.lost).padStart(12)}`);
  });
}
const top = monsters.filter(m => !m.isBoss).sort((a, b) => b.level - a.level)[0], boss = monsters.filter(m => m.isBoss).sort((a, b) => b.level - a.level)[0];
console.log(`\nÚltimo monstro comum: nível ${top?.level ?? '?'} (${top?.name ?? '—'}). Último chefe: nível ${boss?.level ?? '?'} (${boss?.name ?? '—'}). Teto do jogo: ${MAX_LEVEL}.`);
console.log(`Na curva-alvo, a ${perHour} lutas/h: nível 100 em ~${n(hours(100))} h, 250 em ~${n(hours(250))} h, ${MAX_LEVEL} em ~${n(hours(MAX_LEVEL))} h.\n`);
function hours(target: number) {
  let total = 0;
  for (let l = 1; l < target; l++) total += Number(expForLevel(l + 1) - expForLevel(l)) / Math.max(1, monsterXpTarget(Math.max(1, l - 3)));
  return total / perHour;
}
