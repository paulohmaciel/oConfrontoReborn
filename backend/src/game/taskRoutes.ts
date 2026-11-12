import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { gainExperience } from './gameRules';
import {event} from './adventureService';
import {recordGold} from '../economy/economy';
import {loadSettings} from '../core/settings';
import {scaleInt} from '../../../shared/economy';
export const taskRoutes=Router();
taskRoutes.get('/characters/:id/tasks',asyncRoute(async(req,res)=>{
  const id=integer(Number(req.params.id));
  if(!await prisma.character.findFirst({where:{id,accountId:res.locals.accountId}}))throw new GameError(404,'Personagem não encontrado.');
  const tasks=await prisma.taskBlueprint.findMany({include:{monster:true,playerTasks:{where:{characterId:id}}},take:300,orderBy:{minLevel:'asc'}});
  res.json(tasks);
}));
taskRoutes.post('/characters/:id/tasks/:taskId/:action',asyncRoute(async(req,res)=>{
  const characterId=integer(Number(req.params.id)),taskId=integer(Number(req.params.taskId));
  if(!['accept','claim'].includes(req.params.action))throw new GameError(400,'Ação inválida.');
  const result=await transaction(async tx=>{
    const c=await lockCharacter(tx,res.locals.accountId,characterId);
    if(await tx.battle.findFirst({where:{characterId,isFinished:false}}))throw new GameError(409,'Encerre o combate primeiro.');
    const task=await tx.taskBlueprint.findUnique({where:{id:taskId}});
    if(!task||c.level<task.minLevel)throw new GameError(409,'Tarefa indisponível para seu nível.');
    if(req.params.action==='accept') {
      await tx.characterTask.upsert({where:{characterId_taskId:{characterId,taskId}},update:{},create:{characterId,taskId}});
      return {message:'Tarefa aceita.'};
    }
    const progress=await tx.characterTask.findUnique({where:{characterId_taskId:{characterId,taskId}}});
    if(!progress||progress.currentKills<task.requiredKills)throw new GameError(409,'Tarefa ainda incompleta.');
    if(progress.isCompleted)return {message:'Recompensa já recebida.'};
    const settings=await loadSettings(tx),rewardExp=scaleInt(task.rewardExp,settings['economy.xpRewardPercent']),rewardGold=scaleInt(task.rewardGold,settings['economy.goldRewardPercent']);
    await tx.character.update({where:{id:characterId},data:{...gainExperience(c,rewardExp).data,goldInHand:{increment:BigInt(rewardGold)}}});
    await recordGold(tx,characterId,BigInt(rewardGold),c.goldInHand+BigInt(rewardGold),'TASK',{type:'task',id:taskId});
    await tx.characterTask.update({where:{id:progress.id},data:{isCompleted:true}});
    await event(tx,characterId,'TASK',task.title,`Tarefa concluída. +${rewardExp} XP e +${rewardGold} ouro.`);
    return {message:`Recompensa recebida: ${rewardExp} XP e ${rewardGold} ouro.`};
  });res.json(result);
}));
