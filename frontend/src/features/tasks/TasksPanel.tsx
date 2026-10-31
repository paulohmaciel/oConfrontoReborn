import {useState} from 'react';
import {fmt} from '../../lib/format';
import type {Hero,Task,GameConfig,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {missionFor} from '../../../../shared/missions';
type Filter='open'|'active'|'done'|'all';
const filters:[Filter,string][]=[['open','Disponíveis'],['active','Em andamento'],['done','Concluídas'],['all','Todas']];
// Mural de missões: cada caçada tem nome, quem pede e uma história (shared/missions.ts).
export default function TasksPanel({hero,tasks,config,busy,fighting,command}:{hero:Hero;tasks:Task[];config:GameConfig|null;busy:boolean;fighting:boolean;command:Cmd}){
  const [filter,setFilter]=useState<Filter>('open');
  const state=(t:Task)=>{const p=t.playerTasks[0];return p?.isCompleted?'done':p?'active':'open';};
  const list=tasks.filter(t=>filter==='all'||state(t)===filter&&(filter!=='open'||t.minLevel<=hero.level)).sort((a,b)=>filter==='open'?b.minLevel-a.minLevel:a.minLevel-b.minLevel);
  const count=(f:Filter)=>tasks.filter(t=>state(t)===f&&(f!=='open'||t.minLevel<=hero.level)).length;
  return <section className="panel"><div className="section-title"><h2>Mural de missões</h2><span>Uma recompensa por missão</span></div>
    <div className="mission-filters" role="group" aria-label="Filtrar missões">{filters.map(([f,label])=><button key={f} type="button" className={filter===f?'active-chip':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{label}{f!=='all'?` (${count(f)})`:''}</button>)}</div>
    {list.map(t=>{const p=t.playerTasks[0],mission=missionFor(t.monster.name),kills=Math.min(p?.currentKills??0,t.requiredKills),ready=!!p&&!p.isCompleted&&kills>=t.requiredKills;
      return <article className={`mission ${state(t)}`} key={t.id}><Icon name={t.monster.name} src={t.monster.spriteUrl} size={48}/>
        <div className="mission-body"><span className="eyebrow">{mission.giver.toUpperCase()}</span><h3>{mission.title}</h3><p className="mission-story">{mission.story}</p>
          <p className="mission-goal">Derrote {t.requiredKills}× {t.monster.name} · Nv. {t.minLevel}+ · {fmt(Math.floor(t.rewardExp*(config?.xpPercent??100)/100))} XP + {fmt(Math.floor(t.rewardGold*(config?.goldPercent??100)/100))} ouro</p>
          {p&&!p.isCompleted&&<div className="mission-progress"><progress max={t.requiredKills} value={kills} aria-label={`Progresso: ${kills} de ${t.requiredKills}`}/><small>{kills}/{t.requiredKills}</small></div>}</div>
        <button className={ready?'primary':''} disabled={busy||fighting||hero.level<t.minLevel||p?.isCompleted||(!!p&&!ready)} onClick={()=>void command(`tasks/${t.id}/${p?'claim':'accept'}`)}>{p?.isCompleted?'Concluída':ready?'Receber':p?'Em andamento':hero.level<t.minLevel?`Nv. ${t.minLevel}`:'Aceitar'}</button></article>;})}
    {!list.length&&<p className="empty">{filter==='open'?'Nenhuma missão nova para o seu nível agora.':filter==='active'?'Você não tem missões em andamento.':'Nenhuma missão aqui ainda.'}</p>}
  </section>;
}
