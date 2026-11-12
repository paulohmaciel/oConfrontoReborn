import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once as eventOnce } from 'node:events';
import { createApp } from '../src/server';
import { prisma } from '../src/core/db';
import { BattleService } from '../src/game/battleService';
import { hashPassword } from '../src/core/password';
import { buyNpc, equip } from '../src/game/inventoryService';
import { listItem, buyListing, cancelListing } from '../src/economy/marketService';
import { sellNpc, addStat, upgrade, usePotion, heal } from '../src/game/gameService';
test('MySQL: autenticação, isolamento, transações e economia',async t=>{
  assert.match(process.env.DATABASE_URL??'',/\/[^/?]*_test(?:\?|$)/,'Use uma base dedicada terminada em _test.');
  const suffix=randomUUID().slice(0,8), password='Test-local-2026!';
  const hash=await hashPassword(password);
  const fixtures=[];
  for(let n=0;n<3;n++)fixtures.push(await prisma.account.create({data:{email:`test-${suffix}-${n}@example.invalid`,password:hash,characters:{create:{name:`Test ${suffix} ${n}`,level:5,goldInHand:10000n,hp:1000,maxHp:1000,strength:100,statPoints:1}}},include:{characters:true}}));
  const [a,b,c]=fixtures,hero=a.characters[0],buyer=b.characters[0],other=c.characters[0];
  const bp=await prisma.itemBlueprint.findUniqueOrThrow({where:{name:'Sword'}});
  const monster=await prisma.monster.create({data:{name:`Test Rat ${suffix}`,hp:1,attack:1,defense:0,experience:1,goldMin:10,goldMax:10,spriteUrl:''}});
  const server=createApp().listen(0,'127.0.0.1');await eventOnce(server,'listening');
  const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}/api`;
  const origin=process.env.APP_ORIGIN??'http://localhost:5173';
  let cookie='';
  const request=(path:string,body?:unknown,extra:Record<string,string>={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Game-Client':'oconfronto',Origin:origin,Cookie:cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)});
  try {
    await t.test('API rejeita acesso sem sessão',async()=>{assert.equal((await request('/me')).status,401);});
    await t.test('login estabelece cookie HttpOnly e não expõe senha',async()=>{const r=await request('/auth/login',{email:a.email,password});assert.equal(r.status,200);const header=r.headers.get('set-cookie')!;assert.match(header,/HttpOnly/);cookie=header.split(';')[0];assert.equal((await request('/me')).status,200);});
    await t.test('origem externa não pode executar mutações',async()=>{assert.equal((await request(`/characters/${hero.id}/temple`,{}, {Origin:'https://example.invalid'})).status,403);});
    await t.test('conta não lê ou altera outro personagem',async()=>{assert.equal((await request(`/characters/${buyer.id}`)).status,404);const item=await prisma.inventoryItem.create({data:{characterId:buyer.id,blueprintId:bp.id}});await assert.rejects(()=>sellNpc(a.id,hero.id,item.id),/não encontrado/);assert(await prisma.inventoryItem.findUnique({where:{id:item.id}}));});
    await t.test('BigInt sai como string sem perda de precisão',async()=>{const r=await request(`/characters/${hero.id}`);assert.equal(r.status,200);const data=await r.json();assert.equal(typeof data.goldInHand,'string');assert.equal(typeof data.experience,'string');});
    await t.test('start simultâneo cria uma batalha e gasta energia uma vez',async()=>{const before=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});const result=await Promise.all([BattleService.start(a.id,hero.id,monster.id),BattleService.start(a.id,hero.id,monster.id)]);assert.equal(result[0].id,result[1].id);const after=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});assert.equal(after.energy,before.energy-5);});
    await t.test('vitória concorrente recompensa somente uma vez',async()=>{const battle=await prisma.battle.findFirstOrThrow({where:{characterId:hero.id,isFinished:false}});const before=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});const outcomes=await Promise.allSettled([BattleService.turn(a.id,hero.id,battle.id,0,'ATTACK'),BattleService.turn(a.id,hero.id,battle.id,0,'ATTACK')]);assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);const after=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});assert.equal(after.goldInHand,before.goldInHand+10n);await assert.rejects(()=>BattleService.turn(a.id,hero.id,battle.id,1,'ATTACK'));});
    await t.test('falha no loot desfaz todo o turno',async()=>{await prisma.monsterLoot.create({data:{monsterId:monster.id,blueprintId:bp.id,dropChance:2,maxAmount:1}});const battle=await BattleService.start(a.id,hero.id,monster.id);const before=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});await assert.rejects(()=>BattleService.turn(a.id,hero.id,battle.id,0,'ATTACK'),/loot inválida/);const after=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});assert.equal(after.goldInHand,before.goldInHand);assert.equal((await prisma.battle.findUniqueOrThrow({where:{id:battle.id}})).turnVersion,0);await BattleService.turn(a.id,hero.id,battle.id,0,'FLEE');});
    await t.test('NPC impede saldo negativo sob concorrência',async()=>{await prisma.character.update({where:{id:hero.id},data:{goldInHand:BigInt(bp.npcPrice)}});const results=await Promise.allSettled([buyNpc(a.id,hero.id,bp.id,1,randomUUID()),buyNpc(a.id,hero.id,bp.id,1,randomUUID())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.character.findUniqueOrThrow({where:{id:hero.id}})).goldInHand,0n);});
    await t.test('reenvio idempotente não repete compra',async()=>{await prisma.character.update({where:{id:hero.id},data:{goldInHand:1000n}});const key=randomUUID(),before=await prisma.inventoryItem.count({where:{characterId:hero.id}});await buyNpc(a.id,hero.id,bp.id,1,key);await buyNpc(a.id,hero.id,bp.id,1,key);assert.equal(await prisma.inventoryItem.count({where:{characterId:hero.id}}),before+1);await assert.rejects(()=>buyNpc(a.id,hero.id,bp.id,2,key),/outra operação/);});
    await t.test('treino valida campo e não gasta duas vezes o último ponto',async()=>{await assert.rejects(()=>addStat(a.id,hero.id,'statPoints',randomUUID()),/inválido/);const results=await Promise.allSettled([addStat(a.id,hero.id,'strength',randomUUID()),addStat(a.id,hero.id,'strength',randomUUID())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.character.findUniqueOrThrow({where:{id:hero.id}})).statPoints,0);});
    await t.test('ferreiro rejeita tier repetido',async()=>{const item=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:bp.id}});await upgrade(a.id,hero.id,item.id,0,randomUUID());await assert.rejects(()=>upgrade(a.id,hero.id,item.id,0,randomUUID()),/desatualizado/);});
    await t.test('mercado mantém custódia e aceita somente um comprador',async()=>{const item=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:bp.id,upgradeTier:2}});const {listingId}=await listItem(a.id,hero.id,item.id,'100',randomUUID());assert.equal(await prisma.inventoryItem.findUnique({where:{id:item.id}}),null);const before=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});const results=await Promise.allSettled([buyListing(b.id,buyer.id,listingId),buyListing(c.id,other.id,listingId)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await prisma.character.findUniqueOrThrow({where:{id:hero.id}})).goldInHand,before.goldInHand+95n);const listing=await prisma.marketListing.findUniqueOrThrow({where:{id:listingId}});assert.equal(listing.status,'SOLD');assert(await prisma.inventoryItem.findFirst({where:{characterId:listing.buyerId!,upgradeTier:2}}));await assert.rejects(()=>cancelListing(a.id,hero.id,listingId));});
    await t.test('cancelamento repetido devolve item uma vez',async()=>{const item=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:bp.id}});const {listingId}=await listItem(a.id,hero.id,item.id,'100',randomUUID());const before=await prisma.inventoryItem.count({where:{characterId:hero.id}});await cancelListing(a.id,hero.id,listingId);await cancelListing(a.id,hero.id,listingId);assert.equal(await prisma.inventoryItem.count({where:{characterId:hero.id}}),before+1);});
    await t.test('poção consome uma unidade e reenvio não duplica efeito',async()=>{
      const potion=await prisma.itemBlueprint.findUniqueOrThrow({where:{name:'Health Potion'}});
      const item=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:potion.id,quantity:2}});
      await prisma.character.update({where:{id:hero.id},data:{hp:500}});
      const key=randomUUID();await usePotion(a.id,hero.id,item.id,key);await usePotion(a.id,hero.id,item.id,key);
      const healed=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});assert.equal(healed.hp,Math.min(healed.maxHp,500+100+Math.floor(healed.maxHp*.1)),'Health Potion: 100 + 10% da vida máxima, uma vez só com a mesma chave');
      assert.equal((await prisma.inventoryItem.findUniqueOrThrow({where:{id:item.id}})).quantity,1);
    });
    await t.test('equipamentos concorrentes mantêm apenas um item por slot',async()=>{
      const first=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:bp.id}});
      const second=await prisma.inventoryItem.create({data:{characterId:hero.id,blueprintId:bp.id}});
      await Promise.all([equip(a.id,hero.id,first.id),equip(a.id,hero.id,second.id)]);
      assert.equal(await prisma.inventoryItem.count({where:{characterId:hero.id,equippedSlot:'WEAPON',isEquipped:true}}),1);
    });
    await t.test('Templo cura e bloqueia recarga imediata',async()=>{
      await heal(a.id,hero.id);
      const state=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});
      assert.equal(state.hp,state.maxHp);assert.equal(state.energy,state.maxEnergy);
      await assert.rejects(()=>heal(a.id,hero.id),/disponível novamente/);
    });
    await t.test('tarefa concede a recompensa uma vez mesmo sob concorrência',async()=>{
      const task=await prisma.taskBlueprint.create({data:{title:`Test task ${suffix}`,monsterId:monster.id,requiredKills:1,rewardExp:1,rewardGold:50}});
      await prisma.characterTask.create({data:{characterId:hero.id,taskId:task.id,currentKills:1}});
      const before=await prisma.character.findUniqueOrThrow({where:{id:hero.id}});
      const results=await Promise.all([request(`/characters/${hero.id}/tasks/${task.id}/claim`,{}),request(`/characters/${hero.id}/tasks/${task.id}/claim`,{})]);
      assert(results.every(r=>r.status===200));
      assert.equal((await prisma.character.findUniqueOrThrow({where:{id:hero.id}})).goldInHand,before.goldInHand+50n);
    });
    await t.test('cadastro cria personagem equipado e senha com hash',async()=>{
      const email=`register-${suffix}@example.invalid`;
      const response=await request('/auth/register',{email,password,name:`Novo ${suffix}`});
      assert.equal(response.status,201);
      const account=await prisma.account.findUniqueOrThrow({where:{email},include:{characters:{include:{inventory:true}}}});
      assert.match(account.password,/^scrypt:/);assert.notEqual(account.password,password);
      assert.equal(account.characters[0].inventory.filter(i=>i.isEquipped).length,5);
    });
    await t.test('logout revoga a sessão',async()=>{assert.equal((await request('/auth/logout',{})).status,200);assert.equal((await request('/me')).status,401);});
  } finally { await new Promise<void>(resolve=>server.close(()=>resolve()));await prisma.$disconnect(); }
});
