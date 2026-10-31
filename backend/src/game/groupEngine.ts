// Rodada da caçada em grupo. Função pura: não consulta banco e não concede recompensas (quem faz isso é groupHuntService).
import type { Dice } from '../core/engine';
import { baseVocation, vocations } from '../../../shared/adventure';
import { actionsFor, groupActions, groupIntent, MAX_ROUNDS, type GroupAction } from '../../../shared/groupHunt';

export interface GroupFighter {
  characterId: number; name: string; vocation: string; hp: number; maxHp: number; mana: number; maxMana: number;
  attack: number; defense: number; criticalChance: number; dodgeChance: number; action: GroupAction | null;
}
export interface GroupBoss { hp: number; maxHp: number; attack: number; defense: number; chains: number; freed: boolean }
export type GroupOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT' | 'ESCAPED';

// Ação válida para a vocação e com mana; senão (inclusive quem não escolheu a tempo) vira Defender.
export function effectiveAction(f: Pick<GroupFighter, 'vocation' | 'mana' | 'action'>): GroupAction {
  const a = f.action;
  return a && actionsFor(f.vocation).includes(a) && f.mana >= groupActions[a].mana ? a : 'DEFEND';
}

export function resolveGroupRound(round: number, bossIn: GroupBoss, fightersIn: GroupFighter[], dice: Dice) {
  const boss = { ...bossIn }, fighters = fightersIn.map(f => ({ ...f })), log: string[] = [];
  const alive = () => fighters.filter(f => f.hp > 0);
  const acts = new Map<number, GroupAction>();
  for (const f of alive()) {
    const a = effectiveAction(f);
    if (!f.action) log.push(`${f.name} não escolheu a tempo e se defendeu.`);
    f.mana -= groupActions[a].mana; acts.set(f.characterId, a);
  }
  const holder = alive().find(f => acts.get(f.characterId) === 'HOLD');
  if (holder) log.push(`${holder.name} segura a fera.`);
  const enraged = boss.chains > 0 ? 1.3 : 1;

  // 1) O grupo age.
  for (const f of alive()) {
    const a = acts.get(f.characterId)!;
    if (a === 'DEFEND') continue;
    if (a === 'HEAL_ALL') {
      const power = vocations[baseVocation(f.vocation)].healing;
      for (const ally of alive()) {
        const healed = Math.min(ally.maxHp - ally.hp, dice(Math.floor(ally.maxHp * .1 * power), Math.floor(ally.maxHp * .18 * power)));
        ally.hp += healed;
      }
      log.push(`${f.name} cura o grupo.`);
      continue;
    }
    const mult = a === 'AIM' ? (holder ? 2.6 : 1.6) : a === 'HOLD' ? .8 : a === 'BREAK_SEAL' ? 1.1 : 1;
    // Quebrar selo é magia: ignora a defesa da fera.
    const base = Math.max(2, f.attack * mult - (a === 'BREAK_SEAL' ? 0 : boss.defense * .5));
    let dealt = dice(Math.floor(base * .8), Math.ceil(base * 1.2));
    if (dice(1, 100) <= f.criticalChance) dealt = Math.floor(dealt * 1.5);
    boss.hp = Math.max(0, boss.hp - dealt);
    log.push(`${f.name} ${a === 'AIM' ? 'acerta o ponto fraco' : a === 'BREAK_SEAL' ? 'quebra um selo' : 'ataca'}: ${dealt} de dano.`);
    if (a === 'AIM' && boss.chains > 0) {
      boss.chains--;
      log.push(boss.chains ? `A flecha parte uma corrente do laço (restam ${boss.chains}).` : 'A última corrente se parte: a fera está livre e se acalma!');
      if (!boss.chains) boss.freed = true;
    }
  }
  // Sem Paladino, o laço só arrebenta sozinho depois de muito esforço (a campanha avisa: sem mira, mais risco).
  if (boss.chains > 0 && round >= 6 && !fighters.some(f => baseVocation(f.vocation) === 'PALADIN')) { boss.chains = 0; log.push('O laço arrebenta sozinho.'); }
  if (boss.hp === 0) { log.push(boss.freed ? 'A fera, livre do laço, recua para a serra. Vitória!' : 'A fera cai. Vitória!'); return { boss, fighters, log, outcome: 'VICTORY' as GroupOutcome }; }

  // 2) A fera age.
  const intent = groupIntent(round).kind;
  const hit = (f: GroupFighter, power: number) => {
    const a = acts.get(f.characterId)!;
    const defense = f.defense * (a === 'DEFEND' ? 2.5 : a === 'HOLD' ? 2.2 : 1);
    const base = Math.max(1, boss.attack * power * enraged - defense * .4);
    let received = dice(Math.max(1, Math.floor(base * .75)), Math.max(1, Math.ceil(base * 1.25)));
    if (f.dodgeChance > 0 && dice(1, 100) <= f.dodgeChance) { log.push(`${f.name} esquivou!`); return; }
    if (intent === 'STOMP' && a === 'DEFEND') received = Math.max(1, Math.floor(received * .45));
    f.hp = Math.max(0, f.hp - received);
    log.push(`A fera causa ${received} de dano em ${f.name}.${f.hp === 0 ? ` ${f.name} caiu!` : ''}`);
  };
  if (intent === 'CHARGE') log.push('A fera concentra forças.');
  else if (intent === 'STOMP') {
    const breaker = alive().find(f => acts.get(f.characterId) === 'BREAK_SEAL');
    if (breaker) log.push(`${breaker.name} interrompe o pisoteio!`);
    else for (const f of alive()) hit(f, 1.1);
  } else {
    const targets = alive();
    hit(holder && holder.hp > 0 ? holder : targets[dice(0, targets.length - 1)], 1.6);
  }
  if (!alive().length) { log.push('Todo o grupo caiu.'); return { boss, fighters, log, outcome: 'DEFEAT' as GroupOutcome }; }
  if (round >= MAX_ROUNDS) { log.push('A fera foge para o alto da serra.'); return { boss, fighters, log, outcome: 'ESCAPED' as GroupOutcome }; }
  return { boss, fighters, log, outcome: 'ONGOING' as GroupOutcome };
}
