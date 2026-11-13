import {useState} from 'react';
import {fmt} from '../../lib/format';
import type {Hero,Task,GameConfig,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import CreatureIcon from '../../ui/CreatureIcon';
import {useShowMore,ShowMore} from '../../ui/ShowMore';
import {missionFor} from '../../../../shared/missions';
type Filter='open'|'active'|'done'|'all';
const filters:[Filter,string][]=[['open','Disponíveis'],['active','Em andamento'],['done','Concluídas'],['all','Todas']];
// Faixas de nível do mural (10 no máximo, como toda lista do site); a do personagem já vem aberta.
const bands=[1,25,60,100,160,250,400,550,700,850].map((from,i,all)=>({from,to:(all[i+1]??1001)-1}));
const bandOf=(level:number)=>bands.findIndex(b=>level>=b.from&&level<=b.to);
// Mural de missões: busca, filtro e faixas de nível com abrir/fechar (drill-down), 10 missões por vez.
export default function TasksPanel({hero,tasks,config,busy,fighting,command}:{hero:Hero;tasks:Task[];config:GameConfig|null;busy:boolean;fighting:boolean;command:Cmd}){
  const [filter,setFilter]=useState<Filter>('open'),[q,setQ]=useState(''),[open,setOpen]=useState<Set<number>>(()=>new Set([bandOf(hero.level)]));
  const state=(t:Task)=>{const p=t.playerTasks[0];return p?.isCompleted?'done':p?'active':'open';};
  const passes=(t:Task,f:Filter)=>f==='all'||state(t)===f&&(f!=='open'||t.minLevel<=hero.level);
  const term=q.trim().toLowerCase();
  const matches=(t:Task)=>!term||missionFor(t.monster.name).title.toLowerCase().includes(term)||t.monster.name.toLowerCase().includes(term);
  const list=tasks.filter(t=>passes(t,filter)&&matches(t)).sort((a,b)=>a.minLevel-b.minLevel);
  const count=(f:Filter)=>tasks.filter(t=>passes(t,f)).length;
  const toggle=(i:number)=>setOpen(s=>{const n=new Set(s);if(n.has(i))n.delete(i);else n.add(i);return n;});
  const row=(t:Task)=><MissionRow key={t.id} t={t} hero={hero} config={config} busy={busy} fighting={fighting} command={command}/>;
  return <section className="panel"><div className="section-title"><h2>Mural de missões</h2><span>Uma recompensa por missão</span></div>
    <div className="mission-filters" role="group" aria-label="Filtrar missões">{filters.map(([f,label])=><button key={f} type="button" className={filter===f?'active-chip':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{label}{f!=='all'?` (${count(f)})`:''}</button>)}</div>
    <input className="mission-search" aria-label="Buscar missão" placeholder="Buscar missão ou monstro…" value={q} maxLength={40} onChange={e=>setQ(e.target.value)}/>
    {term?<Flat list={list} row={row}/>:bands.map((b,i)=>{const inBand=list.filter(t=>t.minLevel>=b.from&&t.minLevel<=b.to);if(!inBand.length)return null;
      const all=tasks.filter(t=>t.minLevel>=b.from&&t.minLevel<=b.to),done=all.filter(t=>state(t)==='done').length,isOpen=open.has(i);
      return <div className="mission-band" key={b.from}><button type="button" className="band-head" aria-expanded={isOpen} onClick={()=>toggle(i)}><span>{isOpen?'▾':'▸'} Nível {b.from}–{b.to}{i===bandOf(hero.level)?' · você está aqui':''}</span><small>{inBand.length} {inBand.length===1?'missão':'missões'} · {done}/{all.length} concluídas</small></button>
        {isOpen&&<Flat list={inBand} row={row}/>}</div>;})}
    {!list.length&&<p className="empty">{term?'Nenhuma missão com esse nome.':filter==='open'?'Nenhuma missão nova para o seu nível agora.':filter==='active'?'Você não tem missões em andamento.':'Nenhuma missão aqui ainda.'}</p>}
  </section>;
}
function Flat({list,row}:{list:Task[];row:(t:Task)=>JSX.Element}){
  const {visible,rest,more}=useShowMore(list,list.length);
  return <>{visible.map(row)}<ShowMore rest={rest} onMore={more} label="Ver mais missões"/></>;
}
function MissionRow({t,hero,config,busy,fighting,command}:{t:Task;hero:Hero;config:GameConfig|null;busy:boolean;fighting:boolean;command:Cmd}){
  const p=t.playerTasks[0],mission=missionFor(t.monster.name),kills=Math.min(p?.currentKills??0,t.requiredKills),ready=!!p&&!p.isCompleted&&kills>=t.requiredKills;
  return <article className={`mission ${p?.isCompleted?'done':p?'active':'open'}`}><CreatureIcon name={t.monster.name} src={t.monster.spriteUrl} size={48}/>
    <div className="mission-body"><span className="eyebrow">{mission.giver.toUpperCase()}</span><h3>{mission.title}</h3><p className="mission-story">{mission.story}</p>
      <p className="mission-goal">Derrote {t.requiredKills}× {t.monster.name} · Nv. {t.minLevel}+ · {fmt(Math.floor(t.rewardExp*(config?.xpPercent??100)/100))} XP + {fmt(Math.floor(t.rewardGold*(config?.goldPercent??100)/100))} ouro</p>
      {p&&!p.isCompleted&&<div className="mission-progress"><progress max={t.requiredKills} value={kills} aria-label={`Progresso: ${kills} de ${t.requiredKills}`}/><small>{kills}/{t.requiredKills}</small></div>}</div>
    <button className={ready?'primary':''} disabled={busy||fighting||hero.level<t.minLevel||p?.isCompleted||(!!p&&!ready)} onClick={()=>void command(`tasks/${t.id}/${p?'claim':'accept'}`)}>{p?.isCompleted?'Concluída':ready?'Receber':p?'Em andamento':hero.level<t.minLevel?`Nv. ${t.minLevel}`:'Aceitar'}</button></article>;
}
