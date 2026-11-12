import { Prisma } from '@prisma/client';
import { transaction, lockCharacter } from '../core/db';
import { GameError } from '../core/engine';
import { gainExperience } from './gameRules';
import { addItem, recordGold } from '../economy/economy';
import { achievementDefinitions, journey, regions, vocations, type BaseVocation } from '../../../shared/adventure';
import { BASE_ATTRIBUTE } from '../../../shared/progression';
type Tx=Prisma.TransactionClient;
export function event(tx:Tx,characterId:number,kind:string,title:string,description:string) {
  return tx.adventureEvent.create({data:{characterId,kind,title,description}});
}
export async function awardAchievements(tx:Tx,characterId:number) {
  const [wins,bosses,upgraded,c,groupWins]=await Promise.all([
    tx.battle.count({where:{characterId,outcome:'VICTORY'}}),tx.battle.count({where:{characterId,outcome:'VICTORY',monster:{isBoss:true}}}),
    tx.inventoryItem.count({where:{characterId,upgradeTier:{gte:1}}}),tx.character.findUniqueOrThrow({where:{id:characterId}}),
    tx.groupBattle.findMany({where:{outcome:'VICTORY',fighters:{some:{characterId}}},distinct:['huntKey'],select:{huntKey:true}})
  ]);
  const conditions:Record<string,boolean>={'first-victory':wins>=1,hunter:wins>=10,blacksmith:upgraded>0,explorer:c.journeyStep>=4,'boss-slayer':bosses>0,'group-hunter':groupWins.length>0,'four-marks':groupWins.length>=4,'first-blood':c.pvpWins>=1,'ten-duels':c.pvpWins+c.pvpLosses>=10};
  for(const def of achievementDefinitions) {
    if(!conditions[def.key])continue;
    if(await tx.characterAchievement.findUnique({where:{characterId_key:{characterId,key:def.key}}}))continue;
    await tx.characterAchievement.create({data:{characterId,key:def.key}});
    await event(tx,characterId,'ACHIEVEMENT',def.name,def.description);
  }
}
export async function journeyState(tx:Tx,characterId:number) {
  const c=await tx.character.findUniqueOrThrow({where:{id:characterId}});
  const [rats,upgraded,tasks,bosses,sold,listed,friends]=await Promise.all([
    tx.battle.count({where:{characterId,outcome:'VICTORY',monster:{name:'Rat'}}}),
    tx.characterAchievement.count({where:{characterId,key:'blacksmith'}}),
    tx.characterTask.count({where:{characterId,isCompleted:true}}),
    tx.battle.count({where:{characterId,outcome:'VICTORY',monster:{name:'Guardião da Pedreira'}}}),
    tx.itemLedger.count({where:{characterId,reason:'NPC_SELL'}}),
    tx.marketListing.count({where:{sellerId:characterId}}),
    tx.friendship.count({where:{status:'ACCEPTED',OR:[{requesterId:characterId},{addresseeId:characterId}]}})
  ]);
  // Mesma ordem de `journey` (shared/adventure.ts). Pontos distribuídos = atributos acima do valor inicial; Templo = já foi usado alguma vez.
  const counts=[c.vocationChosen?1:0,rats,upgraded,tasks,bosses,c.strength+c.vitality+c.agility+c.resistance>4*BASE_ATTRIBUTE?1:0,c.templeReadyAt?1:0,sold,listed,friends];
  return {step:c.journeyStep,finished:c.journeyStep>=journey.length,vocationChosen:c.vocationChosen,
    steps:journey.map((s,i)=>({...s,index:i,current:Math.min(s.target,counts[i]),claimed:i<c.journeyStep,active:i===c.journeyStep,ready:i===c.journeyStep&&counts[i]>=s.target})),
    regions:regions.map(r=>({...r,unlocked:c.level>=r.minLevel&&c.journeyStep>=r.journeyStep}))};
}
export async function chooseVocation(accountId:number,characterId:number,value:unknown) {
  if(typeof value!=='string'||!Object.prototype.hasOwnProperty.call(vocations,value))throw new GameError(400,'Escolha uma das quatro vocações.');
  const vocation=value as BaseVocation;
  return transaction(async tx=>{
    const c=await lockCharacter(tx,accountId,characterId);
    if(c.vocationChosen){if(c.vocation===vocation)return {vocation};throw new GameError(409,'A vocação já foi escolhida.');}
    if(await tx.battle.findFirst({where:{characterId,isFinished:false}}))throw new GameError(409,'Encerre o combate antes de escolher.');
    await tx.character.update({where:{id:characterId},data:{vocation,vocationChosen:true}});
    // Mantém todos os itens existentes. A arma apropriada é entregue na mochila para equipar.
    const bp=await tx.itemBlueprint.findUnique({where:{name:vocations[vocation].starter}});
    if(bp&&!await tx.inventoryItem.findFirst({where:{characterId,blueprintId:bp.id}}))await addItem(tx,characterId,bp.id,1,'STARTER');
    await event(tx,characterId,'VOCATION','Uma nova vocação',`Você escolheu ${vocations[vocation].name}.`);
    return {vocation};
  });
}
export async function claimJourney(accountId:number,characterId:number,expectedStep:number) {
  return transaction(async tx=>{
    const c=await lockCharacter(tx,accountId,characterId);
    if(expectedStep<c.journeyStep)return {message:'Etapa já recebida.'};
    if(expectedStep!==c.journeyStep||!journey[expectedStep])throw new GameError(409,'Etapa da jornada desatualizada.');
    if(await tx.battle.findFirst({where:{characterId,isFinished:false}}))throw new GameError(409,'Encerre o combate antes de receber.');
    const state=await journeyState(tx,characterId),step=state.steps[expectedStep];
    if(!step.ready)throw new GameError(409,'Complete o objetivo desta etapa.');
    const gain=gainExperience(c,step.xp);
    await tx.character.update({where:{id:characterId},data:{journeyStep:{increment:1},goldInHand:{increment:BigInt(step.gold)},...gain.data}});
    if(step.gold>0)await recordGold(tx,characterId,BigInt(step.gold),c.goldInHand+BigInt(step.gold),'JOURNEY',{type:'journey',id:expectedStep});
    if(expectedStep===0) {
      for(const name of ['Health Potion','Mana Potion']) {
        const bp=await tx.itemBlueprint.findUniqueOrThrow({where:{name}});
        await addItem(tx,characterId,bp.id,name==='Health Potion'?2:1,'JOURNEY',{type:'journey',id:expectedStep});
      }
    }
    await event(tx,characterId,'JOURNEY',step.title,`Etapa concluída. +${step.xp} XP e +${step.gold} ouro.`);
    if(expectedStep===3)await event(tx,characterId,'REGION','A pedreira está aberta','Você recebeu autorização para explorar a Pedreira dos Gigantes.');
    await awardAchievements(tx,characterId);
    const gains=[step.xp>0&&`+${step.xp} XP`,step.gold>0&&`+${step.gold} ouro`,expectedStep===0&&'2 poções de vida e 1 de mana'].filter(Boolean).join(', ');
    return {message:`Etapa concluída!${gains?` Você recebeu ${gains}.`:''}${gain.leveledUp?` Subiu para o nível ${gain.level}!`:''}`};
  });
}
