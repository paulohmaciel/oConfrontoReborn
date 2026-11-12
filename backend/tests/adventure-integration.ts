import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {prisma,transaction} from '../src/core/db';
import {createApp} from '../src/server';
import {hashPassword} from '../src/core/password';
import {chooseVocation,claimJourney,journeyState} from '../src/game/adventureService';
import {BattleService} from '../src/game/battleService';
import {upgrade} from '../src/game/gameService';
test('MySQL: jornada completa, vocação, regiões, chefe e diário',async t=>{
  assert.match(process.env.DATABASE_URL??'',/\/[^/?]*_test(?:\?|$)/);
  const tag=randomUUID().slice(0,8),password='Adventure-test-2026!';
  const a=await prisma.account.create({data:{email:`adventure-${tag}@example.invalid`,password:await hashPassword(password),characters:{create:{name:`Jornada ${tag}`,strength:100,hp:1000,maxHp:1000,energy:1000,maxEnergy:1000,mana:1000,maxMana:1000,goldInHand:10000n}}},include:{characters:true}});
  const c=a.characters[0];
  const oldSword=await prisma.itemBlueprint.findUniqueOrThrow({where:{name:'Sword'}});
  const original=await prisma.inventoryItem.create({data:{characterId:c.id,blueprintId:oldSword.id,isEquipped:true,equippedSlot:'WEAPON'}});
  const rat=await prisma.monster.findUniqueOrThrow({where:{name:'Rat'}}),boss=await prisma.monster.findUniqueOrThrow({where:{name:'Guardião da Pedreira'}});
  const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}/api`;let cookie='';
  const request=(p:string,body?:unknown)=>fetch(base+p,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:process.env.APP_ORIGIN??'http://localhost:5173','X-Game-Client':'oconfronto','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  // Luta até o fim (o número de golpes depende do balanceamento do catálogo, não deste teste).
  async function winRat(){const b=await BattleService.start(a.id,c.id,rat.id);let status='ONGOING';for(let v=0;v<30&&status==='ONGOING';v++)status=(await BattleService.turn(a.id,c.id,b.id,v,'ATTACK')).status;assert.equal(status,'VICTORY');}
  try {
    const login=await request('/auth/login',{email:a.email,password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];
    await t.test('região bloqueada é validada pelo servidor',async()=>{await assert.rejects(()=>BattleService.start(a.id,c.id,boss.id),/terras ainda estão fechadas/);});
    await t.test('vocação de personagem existente preserva os itens',async()=>{
      await chooseVocation(a.id,c.id,'PALADIN');assert(await prisma.inventoryItem.findUnique({where:{id:original.id}}));
      assert.equal((await prisma.character.findUniqueOrThrow({where:{id:c.id}})).vocation,'PALADIN');
      await assert.rejects(()=>chooseVocation(a.id,c.id,'DRUID'),/já foi escolhida/);
      await assert.rejects(()=>chooseVocation(a.id,c.id,'__proto__'),/quatro vocações/);
    });
    await t.test('recompensa inicial concorrente é concedida uma vez',async()=>{
      const before=await prisma.character.findUniqueOrThrow({where:{id:c.id}});
      await Promise.all([claimJourney(a.id,c.id,0),claimJourney(a.id,c.id,0)]);
      assert.equal((await prisma.character.findUniqueOrThrow({where:{id:c.id}})).goldInHand,before.goldInHand+25n);
      const health=await prisma.itemBlueprint.findUniqueOrThrow({where:{name:'Health Potion'}});
      assert.equal((await prisma.inventoryItem.aggregate({where:{characterId:c.id,blueprintId:health.id},_sum:{quantity:true}}))._sum.quantity,2);
    });
    await t.test('não permite pular objetivos ou receber sem completar',async()=>{
      await assert.rejects(()=>claimJourney(a.id,c.id,4),/desatualizada/);await assert.rejects(()=>claimJourney(a.id,c.id,1),/Complete o objetivo/);
    });
    await t.test('vitórias, melhoria e tarefa fazem a jornada avançar',async()=>{
      await winRat();await winRat();await claimJourney(a.id,c.id,1);
      await upgrade(a.id,c.id,original.id,0,randomUUID());await claimJourney(a.id,c.id,2);
      const task=await prisma.taskBlueprint.findUniqueOrThrow({where:{title:'Caçada: Rat'}});
      assert.equal((await request(`/characters/${c.id}/tasks/${task.id}/accept`,{})).status,200);
      for(let i=0;i<5;i++)await winRat();
      assert.equal((await request(`/characters/${c.id}/tasks/${task.id}/claim`,{})).status,200);
      await claimJourney(a.id,c.id,3);
      const state=await transaction(tx=>journeyState(tx,c.id));assert(state.regions.find(r=>r.key==='quarry')?.unlocked);
    });
    await t.test('chefe anuncia golpe e pode ser interrompido em combate persistido',async()=>{
      await prisma.character.update({where:{id:c.id},data:{strength:10}});
      const b=await BattleService.start(a.id,c.id,boss.id);
      await BattleService.turn(a.id,c.id,b.id,0,'ATTACK');
      const charge=await BattleService.turn(a.id,c.id,b.id,1,'ATTACK');assert.equal(charge.intent.kind,'HEAVY');
      const interrupt=await BattleService.turn(a.id,c.id,b.id,2,'INTERRUPT');assert.equal(interrupt.received,0);assert.match(interrupt.log.join(' '),/interrompe o golpe/);
      let version=3;for(let i=0;i<60;i++){const r=await BattleService.turn(a.id,c.id,b.id,version++,'ATTACK');if(r.status==='VICTORY')break;}
      assert.equal((await prisma.battle.findUniqueOrThrow({where:{id:b.id}})).outcome,'VICTORY');
    });
    await t.test('jornada final libera ruínas e reenvio não duplica ouro',async()=>{
      await claimJourney(a.id,c.id,4);const before=await prisma.character.findUniqueOrThrow({where:{id:c.id}});
      await claimJourney(a.id,c.id,4);assert.equal((await prisma.character.findUniqueOrThrow({where:{id:c.id}})).goldInHand,before.goldInHand);
      const state=await transaction(tx=>journeyState(tx,c.id));assert.equal(state.step,5);assert(state.regions.find(r=>r.key==='ruins')?.unlocked);
    });
    await t.test('início guiado: atributos, Templo, venda, anúncio e amigo fecham a jornada, cada um uma vez',async()=>{
      await assert.rejects(()=>claimJourney(a.id,c.id,5),/Complete o objetivo/);
      await prisma.character.update({where:{id:c.id},data:{strength:{increment:1}}});await claimJourney(a.id,c.id,5);
      await assert.rejects(()=>claimJourney(a.id,c.id,6),/Complete o objetivo/);
      await prisma.character.update({where:{id:c.id},data:{templeReadyAt:new Date()}});await claimJourney(a.id,c.id,6);
      await prisma.itemLedger.create({data:{characterId:c.id,blueprintId:original.blueprintId,delta:-1,reason:'NPC_SELL'}});await claimJourney(a.id,c.id,7);
      await assert.rejects(()=>claimJourney(a.id,c.id,8),/Complete o objetivo/);
      await prisma.marketListing.create({data:{sellerId:c.id,blueprintId:original.blueprintId,price:10n,status:'CANCELLED'}});await claimJourney(a.id,c.id,8);
      const ally=await prisma.account.create({data:{email:`ally-${randomUUID().slice(0,8)}@example.invalid`,password:'x',characters:{create:{name:`Aliado ${randomUUID().slice(0,8)}`}}},include:{characters:true}});
      await prisma.friendship.create({data:{requesterId:ally.characters[0].id,addresseeId:c.id,status:'PENDING'}});
      await assert.rejects(()=>claimJourney(a.id,c.id,9),/Complete o objetivo/);
      await prisma.friendship.updateMany({where:{addresseeId:c.id},data:{status:'ACCEPTED',respondedAt:new Date()}});
      const before=await prisma.character.findUniqueOrThrow({where:{id:c.id}});
      await claimJourney(a.id,c.id,9);await claimJourney(a.id,c.id,9);
      assert.equal((await prisma.character.findUniqueOrThrow({where:{id:c.id}})).goldInHand,before.goldInHand+250n);
      const state=await transaction(tx=>journeyState(tx,c.id));assert(state.finished);assert.equal(state.step,10);
    });
    await t.test('efeito de status: criatura do pântano envenena, o efeito fica guardado na batalha e some quando ela termina',async()=>{
      // Criatura de teste no Pântano Sombrio: muita vida e golpe fraco, para a luta durar; o herói vai ao nível da região.
      const toad=await prisma.monster.create({data:{name:`Sapo de Teste ${tag}`,level:80,regionKey:'swamp',hp:1_000_000,attack:400,defense:0,experience:1,goldMin:1,goldMax:1,spriteUrl:''}});
      await prisma.character.update({where:{id:c.id},data:{level:80,hp:100000,maxHp:100000}});
      const b=await BattleService.start(a.id,c.id,toad.id);
      assert.equal((await BattleService.snapshot(a.id,c.id,b.id)).monsterStatus,'POISON');
      let poisoned=false,ticked=false;
      for(let v=0;v<60&&!(poisoned&&ticked);v++){
        const r=await BattleService.turn(a.id,c.id,b.id,v,'ATTACK');assert.equal(r.status,'ONGOING');
        if(r.inflicted==='POISON')poisoned=true;
        if(r.effectDamage>0){ticked=true;assert.equal(r.turns.at(-1)?.effectDamage,r.effectDamage);}
      }
      assert(poisoned,'o veneno deveria ter entrado em 60 golpes');assert(ticked,'o veneno deveria ter causado dano');
      // Recarregar a tela mostra o mesmo estado; fugir encerra a batalha e os efeitos.
      const snap=await BattleService.snapshot(a.id,c.id,b.id);
      await prisma.battle.update({where:{id:b.id},data:{lastLog:{log:[],turns:[],effects:[{kind:'POISON',turns:2},{kind:'INVENTADO',turns:9}]}}});
      assert.deepEqual((await BattleService.snapshot(a.id,c.id,b.id)).effects,[{kind:'POISON',turns:2}]);
      const fled=await BattleService.turn(a.id,c.id,b.id,snap.turnVersion,'FLEE');assert.equal(fled.status,'FLED');
      assert.deepEqual((await BattleService.snapshot(a.id,c.id,b.id)).effects,[]);
    });
    await t.test('limite de duração: no último turno sem vencedor a batalha termina como retirada, sem recompensa',async()=>{
      const wall=await prisma.monster.create({data:{name:`Muralha de Teste ${tag}`,level:1,regionKey:'outskirts',hp:1_000_000,attack:1,defense:0,experience:999,goldMin:999,goldMax:999,spriteUrl:''}});
      const b=await BattleService.start(a.id,c.id,wall.id);
      await prisma.battle.update({where:{id:b.id},data:{turnVersion:58}});
      assert.equal((await BattleService.turn(a.id,c.id,b.id,58,'ATTACK')).status,'ONGOING');
      const before=await prisma.character.findUniqueOrThrow({where:{id:c.id}});
      const last=await BattleService.turn(a.id,c.id,b.id,59,'ATTACK');
      assert.equal(last.status,'FLED');assert.match(last.log.join(' '),/60 turnos/);assert.equal(last.rewards.gold,'0');
      const after=await prisma.character.findUniqueOrThrow({where:{id:c.id}});
      assert.equal(after.goldInHand,before.goldInHand);assert.equal(after.experience,before.experience);
      assert.equal((await prisma.battle.findUniqueOrThrow({where:{id:b.id}})).isFinished,true);
    });
    await t.test('diário retorna conquistas, bestiário e histórico real',async()=>{
      const response=await request(`/characters/${c.id}/journal`);assert.equal(response.status,200);const j=await response.json();
      const ev=await (await request(`/characters/${c.id}/journal/events`)).json();assert(ev.items.length>0&&ev.total>=ev.items.length);assert(j.achievements.find((a:any)=>a.key==='boss-slayer')?.unlockedAt);
      assert.equal(j.bestiary.find((m:any)=>m.id===boss.id)?.wins,1);const h=await (await request(`/characters/${c.id}/battles`)).json();assert(h.items.some((b:any)=>b.rewardRecorded&&BigInt(b.rewardGold)>0));
      assert.equal((await request(`/characters/${c.id+999999}/journal`)).status,404);assert.equal((await request(`/characters/${c.id+999999}/battles`)).status,404);
    });
  } finally {await new Promise<void>(r=>server.close(()=>r()));await prisma.$disconnect();}
});
