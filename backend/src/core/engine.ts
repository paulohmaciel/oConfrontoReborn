import { skillCosts, vocations, baseVocation } from '../../../shared/adventure';
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
export interface Fighter { hp: number; maxHp: number; mana: number; attack: number; defense: number; agility?: number; vocation?:string; criticalChance?:number;fireResistance?:number;dodgeChance?:number }
export interface Enemy { hp: number; attack: number; defense: number; isBoss?:boolean; turn?:number;element?:string }
export function monsterIntent(monster:Enemy, turn=monster.turn??0) {
  if(!monster.isBoss)return {kind:'ATTACK',label:'Ataque comum',warning:false};
  if(turn%3===1)return {kind:'CHARGE',label:'Vai preparar um golpe poderoso. Aproveite para atacar ou curar.',warning:false};
  if(turn%3===2)return {kind:'HEAVY',label:'Golpe pesado no próximo turno! Use Defender ou Interromper.',warning:true};
  return {kind:'ATTACK',label:'Ataque comum',warning:false};
}
export type Dice = (min: number, max: number) => number;
// O que o monstro fez no turno: atacou, golpe pesado, concentrou, foi interrompido, ou nada (fuga/vitória antes dele agir).
export type FoeMove = 'ATTACK' | 'HEAVY' | 'CHARGE' | 'INTERRUPTED' | 'NONE';
// Função pura: não consulta banco e não concede recompensas.
export function resolveTurn(player: Fighter, monster: Enemy, action: Action, dice: Dice) {
  if (player.hp <= 0 || monster.hp <= 0) throw new GameError(409, 'Combate encerrado.');
  let hp = player.hp, mana = player.mana, monsterHp = monster.hp;
  let dealt = 0, received = 0, healed = 0, crit = false, dodged = false;
  const log: string[] = [];
  if (action === 'FLEE') return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe: 'NONE' as FoeMove, status: 'FLED' as const, log: ['Você bate em retirada.'] };
  const costs = skillCosts(player.vocation??'KNIGHT');
  const profile=vocations[baseVocation(player.vocation??'KNIGHT')];
  // Política explícita: mana insuficiente rejeita o turno inteiro.
  if (mana < costs[action]) throw new GameError(409, 'Mana insuficiente.');
  mana -= costs[action];
  if (action === 'HEAL') {
    healed = Math.min(player.maxHp - hp, dice(Math.floor(player.maxHp*.25*profile.healing), Math.floor(player.maxHp*.45*profile.healing)));
    hp += healed;
    log.push(`Você recupera ${healed} de vida.`);
  } else {
    const multiplier = action === 'TRIPLE_HIT' ? 1.85 : action === 'FIFTH_HIT' ? 2.75 : action === 'DEFEND_SHIELD' ? .5 : action==='INTERRUPT'?.65:1;
    const base = Math.max(2, player.attack * multiplier - monster.defense*.5);
    dealt = dice(Math.floor(base*.8), Math.ceil(base*1.2));
    if (dice(1, 100) <= (player.criticalChance??Math.min(30, 10 + Math.floor((player.agility ?? 20)/4)))) { dealt = Math.floor(dealt*1.5); crit = true; }
    monsterHp = Math.max(0, monsterHp - dealt);
    log.push(`Seu golpe causa ${dealt} de dano.`);
  }
  if (monsterHp === 0) return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe: 'NONE' as FoeMove, status: 'VICTORY' as const, log };
  const intent=monsterIntent(monster);
  if(intent.kind==='CHARGE'||(intent.kind==='HEAVY'&&action==='INTERRUPT')) {
    log.push(intent.kind==='CHARGE'?'O chefe concentra forças para um golpe pesado!':'Você interrompe o golpe pesado do chefe!');
    return {hp,mana,monsterHp,dealt,received,healed,crit,dodged,foe:(intent.kind==='CHARGE'?'CHARGE':'INTERRUPTED') as FoeMove,status:'ONGOING' as const,log};
  }
  const defense = player.defense * (action === 'DEFEND_SHIELD' ? 2.5 : 1);
  const base = Math.max(1, monster.attack*(intent.kind==='HEAVY'?1.8:1) - defense*.4);
  received = dice(Math.max(1, Math.floor(base*.75)), Math.max(1, Math.ceil(base*1.25)));
  if(monster.element==='FIRE')received=Math.max(1,Math.floor(received*(1-(player.fireResistance??0)/100)));
  if(intent.kind==='HEAVY'&&action==='DEFEND_SHIELD')received=Math.max(1,Math.floor(received*.45));
  if((player.dodgeChance??0)>0&&dice(1,100)<=(player.dodgeChance??0)){received=0;dodged=true;log.push('Você se esquiva do golpe!');}
  hp = Math.max(0, hp - received);
  log.push(`A criatura revida: ${received} de dano.`);
  return { hp, mana, monsterHp, dealt, received, healed, crit, dodged, foe: intent.kind as FoeMove, status: hp === 0 ? 'DEFEAT' as const : 'ONGOING' as const, log };
}
