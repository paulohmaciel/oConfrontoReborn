import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTurn,monsterIntent} from './engine';
import {combatStats} from './combatStats';
import {baseVocation,skillCosts} from '../../shared/adventure';
const player={hp:100,maxHp:200,mana:100,attack:30,defense:20};
const monster={hp:10000,attack:60,defense:0};
const max=(a:number,b:number)=>b;
test('vocações alteram dano, defesa e crítico de forma distinta',()=>{
  const c={strength:10,agility:10,resistance:10,level:1};
  const knight=combatStats({...c,vocation:'KNIGHT'},[]),paladin=combatStats({...c,vocation:'PALADIN'},[]),mage=combatStats({...c,vocation:'SORCERER'},[]);
  assert(knight.defense>mage.defense);assert(paladin.criticalChance>knight.criticalChance);assert(mage.attack>knight.attack);
  assert.equal(baseVocation('ELDER_DRUID'),'DRUID');assert.equal(baseVocation('__proto__'),'KNIGHT');
});
test('druida cura mais e gasta menos mana',()=>{
  const druid=resolveTurn({...player,vocation:'DRUID'},monster,'HEAL',max),knight=resolveTurn({...player,vocation:'KNIGHT'},monster,'HEAL',max);
  assert(druid.healed>knight.healed);assert(druid.mana>knight.mana);assert.equal(skillCosts('SORCERER').FIFTH_HIT,28);
});
test('chefe carrega golpe e anuncia o próximo ataque',()=>{
  const result=resolveTurn(player,{...monster,isBoss:true,turn:1},'ATTACK',max);
  assert.equal(result.received,0);assert.match(result.log.join(' '),/concentra energia/);assert.equal(monsterIntent({...monster,isBoss:true},2).warning,true);
});
test('interromper cancela o golpe pesado e consome mana',()=>{
  const result=resolveTurn(player,{...monster,isBoss:true,turn:2},'INTERRUPT',max);
  assert.equal(result.received,0);assert.equal(result.mana,88);assert(result.dealt>0);assert.match(result.log.join(' '),/interrompeu/);
});
test('defender mitiga golpe pesado; resistência mitiga fogo',()=>{
  const enemy={...monster,isBoss:true,turn:2,element:'FIRE'};
  const hit=resolveTurn(player,enemy,'ATTACK',max),guard=resolveTurn(player,enemy,'DEFEND_SHIELD',max),resist=resolveTurn({...player,fireResistance:50},enemy,'ATTACK',max);
  assert(guard.received<hit.received);assert(resist.received<hit.received);
});
test('efeitos dos equipamentos respeitam os limites de crítico, fogo e esquiva',()=>{
  const gear={upgradeTier:0,blueprint:{attack:0,defense:0,armor:0,magicAttack:0,criticalChance:99,fireResistance:99,speed:99}};
  const stats=combatStats({strength:10,agility:10,resistance:10,level:1,vocation:'PALADIN'},[gear]);
  assert.equal(stats.criticalChance,45);assert.equal(stats.fireResistance,75);assert.equal(stats.dodgeChance,20);
});
