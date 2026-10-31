import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import {Pager,usePaged} from '../../ui/Pager';
import {vocations,type BaseVocation} from '../../../../shared/adventure';
import type {Hero,JourneyState,Journal,Memory,BattleRecord} from '../../lib/types';
export function VocationPicker({value,onChange,disabled=false}:{value:BaseVocation;onChange:(v:BaseVocation)=>void;disabled?:boolean}) {
  return <div className="vocation-grid" role="group" aria-label="Escolha sua vocação">{(Object.keys(vocations) as BaseVocation[]).map(v=><button type="button" key={v} className={`vocation-card ${value===v?'chosen':''}`} aria-pressed={value===v} disabled={disabled} onClick={()=>onChange(v)}>
    <Icon name={vocations[v].icon} size={36}/><strong>{vocations[v].name}</strong><small>{vocations[v].role}</small><span>{vocations[v].description}</span>
  </button>)}</div>;
}
type Go=(tab:'hunt'|'forge'|'tasks'|'bag'|'temple'|'journal')=>void;
export function JourneyPanel({hero,state,busy,command,go}:{hero:Hero;state:JourneyState|null;busy:boolean;command:(action:string,body?:unknown)=>Promise<void>;go:Go}) {
  const [vocation,setVocation]=useState<BaseVocation>('KNIGHT');
  if(!state)return <section className="panel"><p>Carregando sua jornada…</p></section>;
  const active=state.steps.find(s=>s.active);
  return <><div className="intro-banner"><div><span className="eyebrow">SEUS PRIMEIROS PASSOS</span><h2>{state.finished?'Os portões estão abertos.':'Uma aventura, um passo de cada vez.'}</h2><p>{state.finished?'Explore as regiões, complete seu bestiário e aperfeiçoe sua estratégia.':`${state.step} de ${state.steps.length} etapas concluídas. As recompensas são recebidas uma única vez.`}</p></div><Icon name="Backpack" size={64}/></div>
    {hero.hp===0&&<div className="notice">Seu personagem está sem vida. <button className="link-button" onClick={()=>go('temple')}>Visitar o Templo de Capriel</button></div>}
    {!hero.vocationChosen&&<section className="panel journey-vocation"><h2>Como você quer lutar?</h2><p className="muted">Escolha com cuidado. Seu inventário será preservado e a arma da vocação será entregue na mochila.</p><VocationPicker value={vocation} onChange={setVocation} disabled={busy||!!hero.activeBattleId}/><button className="primary" disabled={busy||!!hero.activeBattleId} onClick={()=>void command('vocation',{vocation})}>Confirmar {vocations[vocation].name}</button></section>}
    <section className="panel journey-steps"><div className="section-title"><h2>Jornada do aventureiro</h2><span>{state.step}/{state.steps.length}</span></div>{state.steps.map(s=><article className={`journey-step ${s.claimed?'completed':s.active?'current':'locked'}`} key={s.key}>
      <div className="step-number">{s.claimed?'✓':s.index+1}</div><Icon name={s.icon} size={36}/><div><h3>{s.title}</h3><p>{s.description}</p><small>{s.claimed?'Concluída':s.active?`${s.current}/${s.target}`:'Conclua a etapa anterior'} · +{s.xp} XP · +{s.gold} ouro{s.index===0?' · 2 poções de vida + 1 de mana':''}</small></div>
      {s.active&&(s.ready?<button className="primary" disabled={busy||!!hero.activeBattleId} onClick={()=>void command('journey/claim',{expectedStep:s.index})}>Receber recompensa</button>:s.action!=='vocation'?<button disabled={busy} onClick={()=>go(s.action as 'hunt'|'forge'|'tasks')}>Ir ao objetivo</button>:null)}
    </article>)}</section>
    {active?.key==='boss'&&<div className="notice">Na pedreira, enfrente o guardião: quando ele anunciar o golpe pesado, escolha Defender ou Interromper.</div>}
    
  </>;
}
export function JournalPanel({characterId}:{characterId:number}) {
  const [data,setData]=useState<Journal|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;api<Journal>(`/characters/${characterId}/journal`).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[characterId]);
  const battles=usePaged<BattleRecord>(`/characters/${characterId}/battles`),events=usePaged<Memory>(`/characters/${characterId}/journal/events`);
  if(error&&!data)return <div className="error" role="alert">{error}</div>;
  if(!data)return <section className="panel">Abrindo seu diário…</section>;
  return <><section className="panel"><div className="section-title"><h2>Conquistas</h2><span>{data.achievements.filter(a=>a.unlockedAt).length}/{data.achievements.length}</span></div><div className="achievement-grid">{data.achievements.map(a=><article key={a.key} className={a.unlockedAt?'earned':''}><Icon name={a.icon} size={36}/><h3>{a.name}</h3><p>{a.description}</p><small>{a.unlockedAt?`Conquistada em ${new Date(a.unlockedAt).toLocaleDateString('pt-BR')}`:'Ainda não conquistada'}</small></article>)}</div></section>
  <section className="panel journal-section"><h2>Bestiário</h2><p className="muted">Criaturas que você encontrou. Encontros incluem fugas e derrotas.</p><div className="bestiary-grid"><Limited items={data.bestiary} label="Ver mais criaturas" render={m=><article key={m.id}><Icon name={m.name} src={m.spriteUrl} size={48}/><h3>{m.name}</h3><p>{m.wins} vitória(s) · {m.encounters} encontro(s)</p></article>}/></div>{!data.bestiary.length&&<p className="empty">Seu primeiro encontro será registrado aqui.</p>}</section>
  <section className="panel journal-section"><div className="section-title"><h2>Últimos combates</h2><span>{battles.total.toLocaleString('pt-BR')}</span></div>{battles.items.map(b=><div className="market-row" key={b.id}><Icon name={b.monster.name} src={b.monster.spriteUrl} size={32}/><div><h3>{b.monster.name}</h3><p>{new Date(b.createdAt).toLocaleString('pt-BR')} · {{VICTORY:'Vitória',DEFEAT:'Derrota',FLED:'Fuga'}[b.outcome]??b.outcome}</p></div><span className="muted">{b.rewardRecorded?`+${b.rewardExperience} XP · +${b.rewardGold} gp`:'Registro anterior à atualização'}</span></div>)}{!battles.items.length&&!battles.loading&&<p className="empty">Nenhum combate concluído ainda.</p>}<Pager page={battles.page} pages={battles.pages} busy={battles.loading} onPage={p=>void battles.go(p)}/></section>
  <section className="panel journal-section"><h2>Memórias da aventura</h2>{events.error&&<p className="error" role="alert">{events.error}</p>}{events.items.map(e=><article className="timeline-event" key={e.id}><small>{new Date(e.createdAt).toLocaleString('pt-BR')}</small><h3>{e.title}</h3><p>{e.description}</p></article>)}{!events.items.length&&!events.loading&&<p className="empty">Novas conquistas e aventuras aparecerão aqui.</p>}<Pager page={events.page} pages={events.pages} busy={events.loading} onPage={p=>void events.go(p)}/></section></>;
}
