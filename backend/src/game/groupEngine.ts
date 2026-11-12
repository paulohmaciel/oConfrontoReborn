// Rodada da caçada em grupo. Função pura: não consulta banco e não concede recompensas (quem faz isso é groupHuntService).
import type { Dice } from '../core/engine';
import { baseVocation, vocations } from '../../../shared/adventure';
import { actionsFor, CHOICE_AT, groupActions, groupIntent, MAX_ROUNDS, type GroupAction, type GroupHunt, type GroupPhase, type Mechanic } from '../../../shared/groupHunt';

export interface GroupFighter {
  characterId: number; name: string; vocation: string; hp: number; maxHp: number; mana: number; maxMana: number;
  attack: number; defense: number; criticalChance: number; dodgeChance: number; action: GroupAction | null;
}
// `counters`: correntes (chains), camadas do encantamento (enchant), ilusões (mist) ou selos (dragon).
// `freed`: o grupo cumpriu o objetivo da mecânica (libertou a fera / desfez o encantamento) e ganha bônus.
export interface GroupBoss {
  hp: number; maxHp: number; attack: number; defense: number; mechanic: Mechanic; counters: number; maxCounters: number;
  freed: boolean; phase: GroupPhase; choice: 'SLAY' | 'SLEEP' | null;
}
export type GroupOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT' | 'ESCAPED';
type HuntText = Pick<GroupHunt, 'creature' | 'heavy' | 'victory'>;

// Ação válida para a vocação, a fase e a mana; senão (inclusive quem não escolheu a tempo) vira Defender.
export function effectiveAction(f: Pick<GroupFighter, 'vocation' | 'mana' | 'action'>, phase: GroupPhase = 'FIGHT'): GroupAction | null {
  const a = f.action;
  if (phase === 'CHOICE') return a && actionsFor(f.vocation, 'CHOICE').includes(a) ? a : null;
  return a && actionsFor(f.vocation).includes(a) && f.mana >= groupActions[a].mana ? a : 'DEFEND';
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function resolveGroupRound(round: number, bossIn: GroupBoss, fightersIn: GroupFighter[], dice: Dice, hunt: HuntText) {
  const boss = { ...bossIn }, fighters = fightersIn.map(f => ({ ...f })), log: string[] = [], who = cap(hunt.creature);
  const alive = () => fighters.filter(f => f.hp > 0);
  const has = (v: string) => alive().some(f => baseVocation(f.vocation) === v);

  // Escolha final do dragão: maioria decide; empate ou ninguém votando = fazer dormir.
  if (boss.phase === 'CHOICE') {
    const votes = alive().map(f => effectiveAction(f, 'CHOICE'));
    const slay = votes.filter(v => v === 'SLAY').length, sleep = votes.filter(v => v === 'SLEEP').length;
    boss.choice = slay > sleep ? 'SLAY' : 'SLEEP';
    log.push(`Votos: ${slay} para derrotar, ${sleep} para fazer dormir.`);
    if (boss.choice === 'SLAY') { boss.hp = 0; log.push('O grupo derrota o dragão. As quatro marcas se apagam com ele: uma vitória militar.'); }
    else log.push('O grupo canta as palavras antigas e o dragão volta a dormir sob a fortaleza. Começa uma aliança entre os povos e as criaturas.');
    return { boss, fighters, log, outcome: 'VICTORY' as GroupOutcome };
  }

  const acts = new Map<number, GroupAction>();
  for (const f of alive()) {
    const a = effectiveAction(f)!;
    if (!f.action) log.push(`${f.name} não escolheu a tempo e se defendeu.`);
    f.mana -= groupActions[a].mana; acts.set(f.characterId, a);
  }
  const did = (a: GroupAction) => alive().filter(f => acts.get(f.characterId) === a);
  const holder = did('HOLD')[0];
  if (holder) log.push(`${holder.name} segura ${hunt.creature}.`);
  const enraged = boss.counters > 0 && boss.mechanic === 'chains' ? 1.3 : boss.counters > 0 && boss.mechanic === 'dragon' ? 1.35 : 1;

  // 1) O grupo age.
  for (const f of alive()) {
    const a = acts.get(f.characterId)!;
    if (a === 'DEFEND') continue;
    if (a === 'HEAL_ALL') {
      const power = vocations[baseVocation(f.vocation)].healing;
      for (const ally of alive()) ally.hp += Math.min(ally.maxHp - ally.hp, dice(Math.floor(ally.maxHp * .1 * power), Math.floor(ally.maxHp * .18 * power)));
      log.push(`${f.name} cura o grupo.`);
      continue;
    }
    // Névoa: golpe comum pode acertar uma ilusão; a mira sempre acha o verdadeiro.
    if (boss.mechanic === 'mist' && boss.counters > 0 && a !== 'AIM' && dice(1, boss.counters + 2) > 2) {
      log.push(`${f.name} acerta um reflexo na névoa.`);
    } else {
      const mult = a === 'AIM' ? (holder ? 2.6 : 1.6) : a === 'HOLD' ? .8 : a === 'BREAK_SEAL' ? 1.1 : 1;
      // Quebrar selo é magia: ignora a defesa.
      const base = Math.max(2, f.attack * mult - (a === 'BREAK_SEAL' ? 0 : boss.defense * .5));
      let dealt = dice(Math.floor(base * .8), Math.ceil(base * 1.2));
      if (dice(1, 100) <= f.criticalChance) dealt = Math.floor(dealt * 1.5);
      if (boss.mechanic === 'enchant' && boss.counters > 0) dealt = Math.max(1, Math.floor(dealt / 2));
      boss.hp = Math.max(0, boss.hp - dealt);
      log.push(`${f.name} ${a === 'AIM' ? 'acerta o ponto fraco' : a === 'BREAK_SEAL' ? 'lança a magia' : 'ataca'}: ${dealt} de dano.`);
    }
    if (boss.counters > 0) {
      const breaks = (a === 'AIM' && (boss.mechanic === 'chains' || boss.mechanic === 'dragon')) || (a === 'BREAK_SEAL' && boss.mechanic !== 'chains');
      if (breaks) {
        boss.counters--;
        const left = boss.counters ? ` (restam ${boss.counters})` : '';
        log.push(boss.mechanic === 'chains' ? (boss.counters ? `A flecha parte uma corrente do laço${left}.` : 'A última corrente se parte: a fera está livre e se acalma!')
          : boss.mechanic === 'enchant' ? (boss.counters ? `Uma camada do encantamento se desfaz${left}.` : 'O encantamento dos mineiros se desfaz: o espírito volta a si!')
          : boss.mechanic === 'mist' ? `A luz abre a névoa: uma ilusão some${left}.`
          : (boss.counters ? `Um selo do controle se parte${left}.` : 'O último selo se parte: o dragão está livre do controle dos caçadores!'));
        if (!boss.counters && (boss.mechanic === 'chains' || boss.mechanic === 'enchant')) boss.freed = true;
      }
    }
  }
  // Sem quem resolva a mecânica, ela cede sozinha depois de muito esforço (a campanha avisa: mais risco).
  if (boss.counters > 0) {
    if (boss.mechanic === 'chains' && round >= 6 && !has('PALADIN')) { boss.counters = 0; log.push('O laço arrebenta sozinho.'); }
    if (boss.mechanic === 'enchant' && round >= 8 && !has('SORCERER')) { boss.counters = 0; log.push('O encantamento enfraquece com o tempo e se desfaz.'); }
    if (boss.mechanic === 'dragon' && round >= 10 && !has('SORCERER') && !has('PALADIN')) { boss.counters = 0; log.push('Os selos se apagam sozinhos.'); }
  }
  // Névoa volta a engrossar a cada 5 rodadas.
  if (boss.mechanic === 'mist' && round % 5 === 0 && boss.counters < boss.maxCounters) { boss.counters++; log.push('A névoa engrossa: uma nova ilusão aparece.'); }

  if (boss.mechanic === 'dragon' && boss.hp <= boss.maxHp * CHOICE_AT) {
    boss.hp = Math.max(1, boss.hp); boss.phase = 'CHOICE';
    log.push('O dragão cai de joelhos. Votem: derrotá-lo ou fazê-lo voltar a dormir.');
    return { boss, fighters, log, outcome: 'ONGOING' as GroupOutcome };
  }
  if (boss.hp === 0) { log.push(hunt.victory); return { boss, fighters, log, outcome: 'VICTORY' as GroupOutcome }; }

  // 2) A criatura age.
  const intent = groupIntent(round, hunt).kind;
  const hit = (f: GroupFighter, power: number) => {
    const a = acts.get(f.characterId)!;
    const defense = f.defense * (a === 'DEFEND' ? 2.5 : a === 'HOLD' ? 2.2 : 1);
    const base = Math.max(1, boss.attack * power * enraged - defense * .4);
    let received = dice(Math.max(1, Math.floor(base * .75)), Math.max(1, Math.ceil(base * 1.25)));
    if (f.dodgeChance > 0 && dice(1, 100) <= f.dodgeChance) { log.push(`${f.name} esquivou!`); return; }
    if (intent === 'STOMP' && a === 'DEFEND') received = Math.max(1, Math.floor(received * .45));
    f.hp = Math.max(0, f.hp - received);
    log.push(`${who} causa ${received} de dano em ${f.name}.${f.hp === 0 ? ` ${f.name} caiu!` : ''}`);
  };
  if (intent === 'CHARGE') log.push(`${who} concentra forças.`);
  else if (intent === 'STOMP') {
    const breaker = did('BREAK_SEAL')[0];
    if (breaker) log.push(`${breaker.name} interrompe o golpe!`);
    else for (const f of alive()) hit(f, 1.1);
  } else {
    const targets = alive();
    hit(holder && holder.hp > 0 ? holder : targets[dice(0, targets.length - 1)], 1.6);
  }
  // Veneno do lago: corta a vida de todos, a não ser que o Druida tenha curado nesta rodada.
  if (boss.mechanic === 'mist' && alive().length) {
    if (did('HEAL_ALL').length) log.push('O remédio do Druida segura o veneno.');
    else { for (const f of alive()) f.hp = Math.max(0, f.hp - Math.max(1, Math.floor(f.maxHp * .02))); log.push('O veneno do lago queima a todos.'); }
  }
  if (!alive().length) { log.push('Todo o grupo caiu.'); return { boss, fighters, log, outcome: 'DEFEAT' as GroupOutcome }; }
  if (round >= MAX_ROUNDS) { log.push(`${who} foge.`); return { boss, fighters, log, outcome: 'ESCAPED' as GroupOutcome }; }
  return { boss, fighters, log, outcome: 'ONGOING' as GroupOutcome };
}
