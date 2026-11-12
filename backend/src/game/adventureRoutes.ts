import {Router,type Request,type Response} from 'express';
import { asyncRoute, pageOf, paged } from '../core/http';
import {prisma,transaction,lockCharacter} from '../core/db';
import {integer,GameError} from '../core/engine';
import {chooseVocation,claimJourney,journeyState} from './adventureService';
import {achievementDefinitions} from '../../../shared/adventure';
export const adventureRoutes=Router();
adventureRoutes.get('/characters/:id/journey',asyncRoute(async(req,res)=>{
  const id=integer(Number(req.params.id));
  res.json(await transaction(async tx=>{await lockCharacter(tx,res.locals.accountId,id);return journeyState(tx,id);}));
}));
adventureRoutes.post('/characters/:id/vocation',asyncRoute(async(req,res)=>{res.json(await chooseVocation(res.locals.accountId,integer(Number(req.params.id)),req.body?.vocation));}));
adventureRoutes.post('/characters/:id/journey/claim',asyncRoute(async(req,res)=>{res.json(await claimJourney(res.locals.accountId,integer(Number(req.params.id)),integer(req.body?.expectedStep,0)));}));
adventureRoutes.get('/characters/:id/journal',asyncRoute(async(req,res)=>{
  const characterId=await ownCharacter(req,res);
  // Memórias e combates crescem sem limite: vêm paginados por /journal/events e /battles.
  const [achievements,groups]=await Promise.all([
    prisma.characterAchievement.findMany({where:{characterId}}),
    prisma.battle.groupBy({by:['monsterId','outcome'],where:{characterId},_count:{_all:true}})
  ]);
  const monsters=await prisma.monster.findMany({where:{id:{in:[...new Set(groups.map(g=>g.monsterId))]}}});
  res.json({
    achievements:achievementDefinitions.map(d=>({...d,unlockedAt:achievements.find(a=>a.key===d.key)?.unlockedAt??null})),
    bestiary:monsters.map(m=>({...m,wins:groups.filter(g=>g.monsterId===m.id&&g.outcome==='VICTORY').reduce((n,g)=>n+g._count._all,0),encounters:groups.filter(g=>g.monsterId===m.id).reduce((n,g)=>n+g._count._all,0)}))});
}));
async function ownCharacter(req:Request,res:Response){
  const characterId=integer(Number(req.params.id));
  if(!await prisma.character.findFirst({where:{id:characterId,accountId:res.locals.accountId},select:{id:true}}))throw new GameError(404,'Personagem não encontrado.');
  return characterId;
}
adventureRoutes.get('/characters/:id/journal/events',asyncRoute(async(req,res)=>{
  const characterId=await ownCharacter(req,res),{page,skip,take}=pageOf(req.query);
  const [items,total]=await Promise.all([prisma.adventureEvent.findMany({where:{characterId},orderBy:{id:'desc'},skip,take}),prisma.adventureEvent.count({where:{characterId}})]);
  res.json(paged(items,total,page));
}));
adventureRoutes.get('/characters/:id/battles',asyncRoute(async(req,res)=>{
  const characterId=await ownCharacter(req,res),{page,skip,take}=pageOf(req.query),where={characterId,isFinished:true};
  const [items,total]=await Promise.all([prisma.battle.findMany({where,orderBy:{id:'desc'},skip,take,include:{monster:{select:{name:true,spriteUrl:true}}}}),prisma.battle.count({where})]);
  res.json(paged(items,total,page));
}));
// Histórico pessoal do Ferreiro: cada tentativa de melhoria já fica no diário (kind UPGRADE); aqui vem paginado e com o resumo.
const upgradeOutcome = (title: string) => title.endsWith(' quebrou') ? 'BROKE' : title.includes('melhoria falhou') ? 'FAILED' : title.includes('Pedra de Proteção') ? 'PROTECTED' : 'SUCCESS';
adventureRoutes.get('/characters/:id/forge/history',asyncRoute(async(req,res)=>{
  const characterId=await ownCharacter(req,res),{page,skip,take}=pageOf(req.query),where={characterId,kind:'UPGRADE'};
  const [items,total,broke,failed,protectedCount,spent]=await Promise.all([
    prisma.adventureEvent.findMany({where,orderBy:{id:'desc'},skip,take}),prisma.adventureEvent.count({where}),
    prisma.adventureEvent.count({where:{...where,title:{endsWith:' quebrou'}}}),prisma.adventureEvent.count({where:{...where,title:{contains:'melhoria falhou'}}}),
    prisma.adventureEvent.count({where:{...where,title:{contains:'Pedra de Proteção'}}}),
    prisma.goldLedger.aggregate({where:{characterId,reason:'UPGRADE'},_sum:{delta:true}})]);
  res.json({...paged(items.map(e=>({id:e.id,title:e.title,description:e.description,createdAt:e.createdAt,outcome:upgradeOutcome(e.title)})),total,page),
    summary:{attempts:total,success:total-broke-failed-protectedCount,failed,broke,protected:protectedCount,goldSpent:(0n-(spent._sum.delta??0n)).toString()}});
}));
