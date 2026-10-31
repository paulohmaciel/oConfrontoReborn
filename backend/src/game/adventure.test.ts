import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTurn,monsterIntent} from '../core/engine';
import {combatStats} from './combatStats';
import {baseVocation,skillCosts,regions,vocations} from '../../../shared/adventure';
import {items,monsters} from '../../prisma/catalog';
import {gainExperience} from './gameRules';
import {MAX_LEVEL,expForLevel,levelForExperience,levelGains,monsterXpTarget} from '../../../shared/progression';
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
test('subida de nível: vários níveis de uma vez, ganhos por nível e teto de 1000',()=>{
  const g=gainExperience({experience:0n,level:1},Number(expForLevel(4)));
  assert.equal(g.level,4);assert.equal(g.leveledUp,true);
  assert.deepEqual(g.data.maxHp,{increment:3*levelGains.hp});assert.deepEqual(g.data.statPoints,{increment:3*levelGains.statPoints});
  const none=gainExperience({experience:150n,level:2},10);
  assert.equal(none.level,2);assert.equal(none.leveledUp,false);assert.deepEqual(none.data.maxMana,{increment:0});
  const top=gainExperience({experience:expForLevel(MAX_LEVEL),level:MAX_LEVEL},1_000_000_000);
  assert.equal(top.level,MAX_LEVEL);assert.equal(top.leveledUp,false);assert.equal(top.experience,expForLevel(MAX_LEVEL)+1_000_000_000n);
  assert.equal(levelForExperience(expForLevel(MAX_LEVEL+50)),MAX_LEVEL);
  assert.equal(levelForExperience(0n,7),7,'nunca desce de nível');
});
test('curva de XP do personagem não mudou e a curva-alvo dá ~31 lutas por nível',()=>{
  assert.equal(expForLevel(2),100n);assert.equal(expForLevel(60),3_256_800n);assert.equal(expForLevel(1000),16_566_949_800n);
  for(const l of [60,200,1000]){const fights=Number(expForLevel(l+1)-expForLevel(l))/monsterXpTarget(l);assert(fights>28&&fights<34,`nível ${l}: ${fights}`);}
});
test('catálogo: todo monstro está numa região que existe e abre antes do nível dele, e segue a curva de XP',()=>{
  for(const m of monsters){
    const region=regions.find(r=>r.key===m.regionKey);
    assert(region,`${m.name}: região ${m.regionKey} não existe`);assert(region.minLevel<=m.level,`${m.name}: região abre no ${region.minLevel}, monstro é nível ${m.level}`);
    assert(m.hp>0&&m.attack>0&&m.goldMax>=m.goldMin,`${m.name}: atributos inválidos`);
    if(m.level>=12)assert(m.experience>=monsterXpTarget(m.level)*.85,`${m.name}: XP abaixo da curva`);
  }
  assert.equal(new Set(monsters.map(m=>m.name)).size,monsters.length,'nomes de monstro repetidos');
  assert.equal(new Set(items.map(i=>i.name)).size,items.length,'nomes de item repetidos');
  for(const i of items)if(i.vocations)for(const v of i.vocations.split(','))assert(v in vocations,`${i.name}: vocação ${v} inválida`);
});
test('missões: todo monstro do catálogo tem nome, quem pede e história próprios, sem nomes repetidos',async()=>{
  const {missionFor}=await import('../../../shared/missions');
  const all=monsters.map(x=>({name:x.name,...missionFor(x.name)}));
  for(const x of all){assert.notEqual(x.giver,'Mural de missões de Capriel',`${x.name} caiu na história genérica`);assert(x.story.length>40,`${x.name}: história curta`);assert(!/thais/i.test(x.story+x.title+x.giver),`${x.name} ainda cita Thais`);}
  assert.equal(new Set(all.map(x=>x.title)).size,all.length,'títulos de missão repetidos');
});
