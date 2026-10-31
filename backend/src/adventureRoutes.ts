import {Router} from 'express';
import {asyncRoute} from './auth';
import {prisma,transaction,lockCharacter} from './db';
import {integer,GameError} from './engine';
import {chooseVocation,claimJourney,journeyState} from './adventureService';
import {achievementDefinitions} from '../../shared/adventure';
export const adventureRoutes=Router();
adventureRoutes.get('/characters/:id/journey',asyncRoute(async(req,res)=>{
  const id=integer(Number(req.params.id));
  res.json(await transaction(async tx=>{await lockCharacter(tx,res.locals.accountId,id);return journeyState(tx,id);}));
}));
adventureRoutes.post('/characters/:id/vocation',asyncRoute(async(req,res)=>{res.json(await chooseVocation(res.locals.accountId,integer(Number(req.params.id)),req.body?.vocation));}));
adventureRoutes.post('/characters/:id/journey/claim',asyncRoute(async(req,res)=>{res.json(await claimJourney(res.locals.accountId,integer(Number(req.params.id)),integer(req.body?.expectedStep,0)));}));
adventureRoutes.get('/characters/:id/journal',asyncRoute(async(req,res)=>{
  const characterId=integer(Number(req.params.id)),before=integer(Number(req.query.before??2147483647));
  if(!await prisma.character.findFirst({where:{id:characterId,accountId:res.locals.accountId},select:{id:true}}))throw new GameError(404,'Personagem não encontrado.');
  const [events,achievements,groups,history]=await Promise.all([
    prisma.adventureEvent.findMany({where:{characterId,id:{lt:before}},orderBy:{id:'desc'},take:21}),
    prisma.characterAchievement.findMany({where:{characterId}}),
    prisma.battle.groupBy({by:['monsterId','outcome'],where:{characterId},_count:{_all:true}}),
    prisma.battle.findMany({where:{characterId,isFinished:true},orderBy:{id:'desc'},take:20,include:{monster:{select:{name:true,spriteUrl:true}}}})
  ]);
  const monsters=await prisma.monster.findMany({where:{id:{in:[...new Set(groups.map(g=>g.monsterId))]}}});
  res.json({events:events.slice(0,20),nextBefore:events.length>20?events[19].id:null,
    achievements:achievementDefinitions.map(d=>({...d,unlockedAt:achievements.find(a=>a.key===d.key)?.unlockedAt??null})),
    bestiary:monsters.map(m=>({...m,wins:groups.filter(g=>g.monsterId===m.id&&g.outcome==='VICTORY').reduce((n,g)=>n+g._count._all,0),encounters:groups.filter(g=>g.monsterId===m.id).reduce((n,g)=>n+g._count._all,0)})),history});
}));
