import { skillCosts, vocations, baseVocation } from '../../../shared/adventure';
import { GENERIC_RAGE_LINE } from '../../../shared/bosses';
import { statusEffects, STATUS_CHANCE, STATUS_BOSS_CHANCE, SLOW_ATTACK_PERCENT, bossPhase, bossRage, type ActiveEffect, type StatusKind } from '../../../shared/statusEffects';
import { expForLevel } from '../../../shared/progression';
export const actions = ['ATTACK', 'TRIPLE_HIT', 'FIFTH_HIT', 'HEAL', 'DEFEND_SHIELD', 'INTERRUPT', 'FLEE'] as const;
export type Action = typeof actions[number];
export class GameError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function parseAction(value: unknown): Action {
  if (!actions.includes(value as Action)) throw new GameError(400, 'Ação inválida.');
  return value as Action;
}
export function integer(value: unknown, min = 1): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > 2147483647)
    throw new GameError(400, 'Número inteiro fora do intervalo.');
  return value;
}
export function getExpForLevel(level: number): bigint {
  return expForLevel(integer(level));
}
// `effects` = efeitos de status ativos no herói (veneno, queimadura, lentidão). `status` = o que a criatura causa quando acerta.
export interface Fighter { hp: number; maxHp: number; mana: number; attack: number; defense: number; agility?: number; vocation?:string; criticalChance?:number;fireResistance?:number;dodgeChance?:number; effects?: ActiveEffect[] }
// `maxHp` (vida cheia da criatura) permite saber a fase do chefe; sem ele, não há fase 2.
export interface Enemy { hp: number; attack: number; defense: number; isBoss?:boolean; turn?:number;element?:string; status?: StatusKind | null; maxHp?: number }
export function monsterIntent(monster:Enemy, turn=monster.turn??0) {
  if(!monster.isBoss)return {kind:'ATTACK',label:'Ataque comum',warning:false};
  if(turn%3===1)return {kind:'CHARGE',label:'Vai preparar um golpe poderoso. Aproveite para atacar ou curar.',warning:false};
  if(turn%3===2)return {kind:'HEAVY',label:'Golpe pesado no próximo turno! Use Defender ou Interromper.',warning:true};
  return {kind:'ATTACK',label:'Ataque comum',warning:false};
}
export type Dice = (min: number, max: number) => number;
// O que o monstro fez no turno: atacou, golpe pesado, concentrou, foi interrompido, ou nada (fuga/vitória antes dele agir).
export type FoeMove = 'ATTACK' | 'HEAVY' | 'CHARGE' | 'INTERRUPTED' | 'NONE';
// Fórmulas do golpe e da cura do herói, usadas no combate contra monstros e no duelo (backend/src/game/duelEngine.ts).
export const skillMultiplier = (action: Action) => action === 'TRIPLE_HIT' ? 1.85 : action === 'FIFTH_HIT' ? 2.75 : action === 'DEFEND_SHIELD' ? .5 : action === 'INTERRUPT' ? .65 : 1;
export function strike(attacker: Fighter, targetDefense: number, action: Action, dice: Dice) {
  const base = Math.max(2, attacker.attack * skillMultiplier(action) - targetDefense*.5);
  let dealt = dice(Math.floor(base*.8), Math.ceil(base*1.2)), crit = false;
  if (dice(1, 100) <= (attacker.criticalChance??Math.min(30, 10 + Math.floor((attacker.agility ?? 20)/4)))) { dealt = Math.floor(dealt*1.5); crit = true; }
  return { dealt, crit };
}
export function healRoll(f: Pick<Fighter, 'maxHp' | 'vocation'>, dice: Dice) {
  const profile = vocations[baseVocation(f.vocation ?? 'KNIGHT')];
  return dice(Math.floor(f.maxHp*.25*profile.healing), Math.floor(f.maxHp*.45*profile.healing));
}
// Função pura: não consulta banco e não concede recompensas.
export function resolveTurn(player: Fighter, monster: Enemy, action: Action, dice: Dice) {
  if (player.hp <= 0 || monster.hp <= 0) throw new GameError(409, 'Combate encerrado.');
  let hp = player.hp, mana = player.mana, monsterHp = monster.hp;
  let dealt = 0, received = 0, healed = 0, crit = false, dodged = false;
  const log: string[] = [];
  // Efeitos de status: copiados para não alterar a entrada; sem efeitos e sem `monster.status`, nada muda e nenhum dado extra é rolado.
  let effects: ActiveEffect[] = (player.effects ?? []).filter(e => e.turns > 0).map(e => ({ ...e })), effectDamage = 0, inflicted: StatusKind | null = null;
  const slowed = effects.some(e => e.kind === 'SLOW');
  // Fim do turno enquanto a luta continua: os efeitos que já estavam ativos causam dano e perdem um turno; só depois entra o efeito novo.
  const endTurn = (foe: FoeMove) => {
    for (const e of effects) {
      const pct = statusEffects[e.kind].damagePercent;
      if (pct > 0 && hp > 0) {
        let d = Math.max(1, Math.floor(player.maxHp * pct / 100));
        if (e.kind === 'BURN') d = Math.max(1, Math.floor(d * (1 - (player.fireResistance ?? 0) / 100)));
        d = Math.min(d, hp); hp -= d; effectDamage += d;
        log.push(`${statusEffects[e.kind].name}: você perde ${d} de vida.`);
      }
      e.turns--;
    }
    effects = effects.filter(e => e.turns > 0);
    const applied = hp > 0 ? inflicted : null;
    if (applied) {
      effects = [...effects.filter(e => e.kind !== applied), { kind: applied, turns: statusEffects[applied].turns }];
      log.push(`A criatura deixa você ${statusEffects[applied].active.toLowerCase()} por ${statusEffects[applied].turns} turnos.`);
    }
    return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe, effects, effectDamage, inflicted: applied, phase, status: hp === 0 ? 'DEFEAT' as const : 'ONGOING' as const, log };
  };
  if (action === 'FLEE') return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe: 'NONE' as FoeMove, effects: [] as ActiveEffect[], effectDamage, inflicted, phase: 1 as 1 | 2, status: 'FLED' as const, log: ['Você bate em retirada.'] };
  const costs = skillCosts(player.vocation??'KNIGHT');
  // Política explícita: mana insuficiente rejeita o turno inteiro.
  if (mana < costs[action]) throw new GameError(409, 'Mana insuficiente.');
  mana -= costs[action];
  if (action === 'HEAL') {
    healed = Math.min(player.maxHp - hp, healRoll(player, dice));
    hp += healed;
    log.push(`Você recupera ${healed} de vida.`);
    // A cura do Druida também limpa os efeitos de status.
    if (effects.length && baseVocation(player.vocation ?? 'KNIGHT') === 'DRUID') { effects = []; log.push('Sua cura purifica o corpo: os efeitos somem.'); }
  } else {
    ({ dealt, crit } = strike(player, monster.defense, action, dice));
    if (slowed) dealt = Math.max(1, Math.floor(dealt * SLOW_ATTACK_PERCENT / 100));
    monsterHp = Math.max(0, monsterHp - dealt);
    log.push(`Seu golpe causa ${dealt} de dano.`);
  }
  if (monsterHp === 0) return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe: 'NONE' as FoeMove, effects: [] as ActiveEffect[], effectDamage, inflicted, phase: 1 as 1 | 2, status: 'VICTORY' as const, log };
  // Fase do chefe depois do seu golpe: abaixo de metade da vida ele entra em fúria (avisa uma vez, na virada).
  const phase = bossPhase({ isBoss: monster.isBoss, hp: monsterHp, maxHp: monster.maxHp });
  if (phase === 2 && bossPhase(monster) === 1) log.push(GENERIC_RAGE_LINE);
  const intent=monsterIntent(monster);
  if(intent.kind==='CHARGE'||(intent.kind==='HEAVY'&&action==='INTERRUPT')) {
    log.push(intent.kind==='CHARGE'?'O chefe concentra forças para um golpe pesado!':'Você interrompe o golpe pesado do chefe!');
    return endTurn((intent.kind==='CHARGE'?'CHARGE':'INTERRUPTED') as FoeMove);
  }
  const defense = player.defense * (action === 'DEFEND_SHIELD' ? 2.5 : 1);
  const base = Math.max(1, monster.attack*(intent.kind==='HEAVY'?1.8:1)*(phase===2?bossRage.attackPercent/100:1) - defense*.4);
  received = dice(Math.max(1, Math.floor(base*.75)), Math.max(1, Math.ceil(base*1.25)));
  if(monster.element==='FIRE')received=Math.max(1,Math.floor(received*(1-(player.fireResistance??0)/100)));
  if(intent.kind==='HEAVY'&&action==='DEFEND_SHIELD')received=Math.max(1,Math.floor(received*.45));
  // Lento não esquiva.
  if(!slowed&&(player.dodgeChance??0)>0&&dice(1,100)<=(player.dodgeChance??0)){received=0;dodged=true;log.push('Você se esquiva do golpe!');}
  hp = Math.max(0, hp - received);
  log.push(`A criatura revida: ${received} de dano.`);
  // Golpe que acertou pode deixar um efeito; erguer a guarda no turno impede.
  if (monster.status && received > 0 && hp > 0 && action !== 'DEFEND_SHIELD' && dice(1, 100) <= (monster.isBoss ? STATUS_BOSS_CHANCE : STATUS_CHANCE)) inflicted = monster.status;
  return endTurn(intent.kind as FoeMove);
}
