import {useEffect,useRef,useState} from 'react';
import {api} from '../../lib/api';
import {fmt,brl,when,msg} from '../../lib/format';
import type {Hero} from '../../lib/types';
import type {Tab} from '../../lib/tabs';
import {useAction,Feedback} from '../../ui/Feedback';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import {premiumBenefits,frames,profileTitles,emblems,titleName,premiumPhase,type PremiumPhase} from '../../../../shared/premium';
import {vocationLabel} from '../../../../shared/adventure';
type Overview={enabled:boolean;priceCents:number;days:number;active:boolean;until:string|null;upcoming:string|null;lastEndedAt:string|null;pendingCheckout:boolean;emailVerified:boolean;
  orders:{id:number;status:string;amountCents:number;days:number;createdAt:string;paidAt:string|null}[];perks:{presetLimit:number;charactersFree:number;charactersPremium:number}};
type Preset={id:number;name:string};
type Stats={days:number;totals:{battles:number;victories:number;defeats:number;flees:number;gold:string;experience:number;winRate:number};byMonster:{name:string;battles:number;victories:number;gold:string;experience:number}[];byDay:{day:string;battles:number;victories:number;gold:string;experience:number}[]};
export type PaymentReturn='ok'|'pendente'|'falhou';
const orderStatus:Record<string,string>={PENDING:'Aguardando pagamento',PAID:'Pago',FAILED:'Não concluído',REFUNDED:'Reembolsado',CANCELLED:'Cancelado'};
const headline:Record<PremiumPhase,string>={free:'Mais conforto para sua jornada',active:'Seu Premium está ativo',expiring:'Seu Premium está terminando',queued:'Seu Premium já está agendado',ended:'Seu Premium terminou'};
// Onde cada benefício fica: uma seção desta página ou outra aba do jogo.
const where:Record<string,{tab?:Tab;anchor?:string;label:string}>={appearance:{anchor:'premium-profile',label:'Escolher moldura'},presets:{anchor:'premium-presets',label:'Montar conjuntos'},bag:{tab:'bag',label:'Abrir a mochila'},
  diary:{anchor:'premium-diary',label:'Ver o diário'},profile:{anchor:'premium-profile',label:'Editar perfil'},characters:{tab:'characters',label:'Criar personagem'}};
const day=(d:string|null)=>d?new Date(d).toLocaleDateString('pt-BR'):'—';
const scrollTo=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
const WATCH_MS=5000,WATCH_TRIES=36;
export default function PremiumPanel({hero,onChanged,go,returning,onReturnSeen}:{hero:Hero;onChanged:()=>Promise<void>|void;go:(t:Tab)=>void;returning:PaymentReturn|null;onReturnSeen:()=>void}) {
  const [o,setO]=useState<Overview|null>(null),[loadError,setLoadError]=useState(''),[celebrate,setCelebrate]=useState(false),{busy,error,ok,run}=useAction();
  const [watching,setWatching]=useState(returning==='ok'||returning==='pendente'),baseline=useRef<{active:boolean;until:string|null}|null>(null);
  const load=()=>api<Overview>('/premium').then(r=>{setO(r);if(!baseline.current)baseline.current={active:r.active,until:r.until};return r;});
  useEffect(()=>{load().catch(e=>setLoadError(msg(e)));},[]);
  // Na volta do Mercado Pago o webhook pode levar alguns segundos: consulta até o acesso mudar (no máximo 3 minutos).
  useEffect(()=>{if(!watching)return;let tries=0;
    const timer=setInterval(()=>{tries++;load().then(r=>{const b=baseline.current;
      if(r.active&&(!b?.active||r.until!==b.until)){setWatching(false);setCelebrate(true);onReturnSeen();void onChanged();}
      else if(tries>=WATCH_TRIES){setWatching(false);onReturnSeen();}}).catch(()=>{});},WATCH_MS);
    return()=>clearInterval(timer);},[watching]);
  if(!o)return <section className="panel">{loadError?<p className="error" role="alert">{loadError}</p>:<p>Carregando…</p>}</section>;
  const {phase,daysLeft}=premiumPhase(o),unlocked=o.active,p=o.perks;
  const statusLine:Record<PremiumPhase,string>={
    free:'Organização, personalização e conveniência para quem quer apoiar o jogo. Ele não altera as regras de combate: XP, ouro e drops são iguais para todos.',
    active:`Liberado até ${when(o.until)}. Renovar soma ${o.days} dias ao final do período atual, sem perder nenhum dia.`,
    expiring:`${daysLeft===1?'Falta 1 dia':`Faltam ${daysLeft} dias`}. Renove agora e os ${o.days} dias novos começam quando o atual terminar.`,
    queued:`Seu próximo período começa em ${when(o.upcoming)}.`,
    ended:`Terminou em ${day(o.lastEndedAt)}. Seus conjuntos, favoritos e perfil ficaram guardados e voltam assim que você renovar.`};
  const jump=(key:string)=>{const w=where[key];if(w.tab)go(w.tab);else if(w.anchor)scrollTo(w.anchor);};
  const checkout=()=>void run(async()=>{const r=await api<{url:string}>('/premium/checkout',{});window.location.assign(r.url);});
  return <div className="premium-page">
    {celebrate&&<section className="panel premium-celebrate" role="status"><Icon name="Crown" size={48}/><div><h2>Premium ativado!</h2><p className="muted">Obrigado por apoiar O Confronto. Seus benefícios já estão liberados abaixo.</p></div><button className="quiet" onClick={()=>setCelebrate(false)}>Fechar</button></section>}
    {watching&&<div className="notice premium-watch" role="status"><i className="premium-spinner" aria-hidden="true"/>{returning==='pendente'?'Pagamento pendente.':'Pagamento recebido.'} Aguardando a confirmação do Mercado Pago. Esta página atualiza sozinha.</div>}
    {!watching&&!celebrate&&returning&&<div className="notice" role="status">{returning==='falhou'?'O pagamento não foi concluído. Você pode tentar de novo quando quiser.':'A confirmação ainda não chegou. Se o pagamento foi aprovado, o Premium é liberado automaticamente; volte em alguns minutos ou fale com o Suporte.'} <button className="link-button" onClick={onReturnSeen}>Fechar</button></div>}
    <section className={`panel premium-hero phase-${phase}`} id="premium-top">
      <div className="premium-status"><div className="premium-crown"><Icon name="Crown" size={64}/></div><div>
        <span className="eyebrow">{unlocked?`PREMIUM ATIVO · ${daysLeft} ${daysLeft===1?'DIA RESTANTE':'DIAS RESTANTES'}`:`PASSE DE ${o.days} DIAS`}</span>
        <h2>{headline[phase]}</h2><p className="muted">{statusLine[phase]}</p>
        {unlocked&&<div className="premium-meter"><progress max={o.days} value={Math.min(daysLeft,o.days)} aria-label="Dias restantes do Premium"/><small>até {day(o.until)}</small></div>}
      </div></div>
      <Feedback error={error} ok={ok}/>
      {o.enabled?<>
        {(!unlocked||watching||!o.emailVerified)&&<ol className="premium-steps" aria-label="Como ativar">
          <li className={o.emailVerified?'done':'current'}><b>{o.emailVerified?'✓':'1'}</b><div><strong>Confirmar e-mail</strong><span>{o.emailVerified?'E-mail confirmado.':<>Confirme pelo link que enviamos. <button className="link-button" disabled={busy} onClick={()=>void run(async()=>(await api<{message:string}>('/auth/resend-verification',{})).message)}>Reenviar link</button></>}</span></div></li>
          <li className={o.emailVerified&&!watching?'current':watching?'done':''}><b>{watching?'✓':'2'}</b><div><strong>Pagar no Mercado Pago</strong><span>Pix ou cartão, na página segura do Mercado Pago.</span></div></li>
          <li className={watching?'current':''}><b>3</b><div><strong>Liberação automática</strong><span>O servidor confirma o pagamento e libera o acesso. No Pix, em instantes.</span></div></li>
        </ol>}
        <div className="premium-cta"><button className="primary" disabled={busy||!o.emailVerified||watching} onClick={checkout}>{o.pendingCheckout?'Continuar pagamento':unlocked||phase==='queued'?'Renovar':phase==='ended'?'Voltar ao Premium':'Ativar Premium'} · {brl(o.priceCents)}</button>
          <small className="muted">{o.days} dias de acesso · pagamento único, sem renovação automática.</small></div>
      </>:unlocked?<p className="muted">A renovação pelo Mercado Pago ainda não está aberta. Seu acesso atual continua normalmente.</p>:<p className="muted premium-soon">O Premium ainda não está à venda. Em breve, via Mercado Pago (Pix e cartão). Enquanto isso, veja abaixo tudo o que ele vai oferecer e experimente o visual do seu perfil.</p>}
      <div className="benefit-grid premium-benefits">{premiumBenefits.map(b=><div key={b.key} className={unlocked?'unlocked':''}><Icon name={b.icon} size={32}/><strong>{b.title}</strong><span>{b.description}</span>
        {unlocked?<button className="link-button" onClick={()=>jump(b.key)}>{where[b.key].label} →</button>:<small className="pill">Premium</small>}</div>)}</div>
    </section>
    {unlocked?<><PresetSection hero={hero} limit={p.presetLimit} onChanged={onChanged}/><ProfileSection hero={hero} onChanged={onChanged}/><StatsSection hero={hero}/></>
      :<><CompareSection perks={p}/><ProfileSection hero={hero} onChanged={onChanged} locked onUnlock={()=>scrollTo('premium-top')}/></>}
    {o.orders.length>0&&<section className="panel"><div className="section-title"><h2>Seus pedidos</h2></div>{o.orders.map(x=><div className="ledger-row" key={x.id}><span>#{x.id} · {when(x.createdAt)}</span><span>{x.days} dias · {brl(x.amountCents)}</span><b className={`order-${x.status.toLowerCase()}`}>{orderStatus[x.status]??x.status}</b></div>)}</section>}
  </div>;
}
function CompareSection({perks}:{perks:Overview['perks']}) {
  const rows:[string,string,string][]=[['Combate, XP, ouro e drops','Iguais para todos','Iguais para todos'],['Personagens por conta',String(perks.charactersFree),String(perks.charactersPremium)],
    ['Conjuntos de equipamento','—',`Até ${perks.presetLimit}`],['Busca e favoritos na mochila','—','✓'],['Diário de caçadas (7 e 30 dias)','—','✓'],['Título, emblema, moldura e apresentação','—','✓'],['Temas claro e escuro','✓','✓']];
  return <section className="panel"><div className="section-title"><h2>Grátis e Premium, lado a lado</h2></div>
    <table className="compare-table"><thead><tr><th scope="col"><span className="sr-only">Recurso</span></th><th scope="col">Grátis</th><th scope="col">Premium</th></tr></thead>
      <tbody>{rows.map(([label,free,premium])=><tr key={label}><th scope="row">{label}</th><td>{free}</td><td>{premium}</td></tr>)}</tbody></table></section>;
}
function ProfileCard({hero,title,emblem,frame,bio}:{hero:Hero;title:string;emblem:string;frame:string;bio:string}) {
  return <div className={`profile-card ${frame!=='none'?`frame-${frame}`:''}`}><div className="crest"><Icon name={emblem||'Mastermind Shield'} size={48}/></div>
    <div><h3>{hero.name}</h3>{title&&<small className="hero-title">{titleName(title)}</small>}<p className="muted">{vocationLabel(hero.vocation)} · Nível {hero.level}</p>{bio&&<p className="profile-bio">“{bio}”</p>}</div></div>;
}
function ProfileSection({hero,onChanged,locked=false,onUnlock}:{hero:Hero;onChanged:()=>Promise<void>|void;locked?:boolean;onUnlock?:()=>void}) {
  const [title,setTitle]=useState(hero.profileTitle??''),[emblem,setEmblem]=useState(hero.profileEmblem??''),[frame,setFrame]=useState(hero.profileFrame??'none'),[bio,setBio]=useState(hero.profileBio??''),{busy,error,ok,run}=useAction();
  return <section className="panel" id="premium-profile"><div className="section-title"><h2>{locked?'Experimente seu visual':'Perfil e aparência'}</h2>{locked&&<small className="pill">Prévia</small>}</div><Feedback error={error} ok={ok}/>
    {locked&&<p className="muted">Monte o seu perfil à vontade. A prévia não é salva: para usar no jogo, ative o Premium.</p>}
    <div className="profile-editor"><ProfileCard hero={hero} title={title} emblem={emblem} frame={frame} bio={bio}/>
    <form className="ops-form" onSubmit={e=>{e.preventDefault();if(locked){onUnlock?.();return;}void run(async()=>{await api(`/characters/${hero.id}/profile`,{title:title||null,emblem:emblem||null,frame,bio});await onChanged();},'Perfil atualizado.');}}>
      <label>Título<select value={title} onChange={e=>setTitle(e.target.value)}><option value="">Nenhum</option>{profileTitles.map(t=><option key={t.key} value={t.key}>{t.name}</option>)}</select></label>
      <fieldset className="emblem-picker"><legend>Emblema</legend>{emblems.map(x=><button type="button" key={x} title={x} aria-label={x} aria-pressed={emblem===x} className={emblem===x?'selected':''} onClick={()=>setEmblem(emblem===x?'':x)}><Icon name={x} size={32}/></button>)}</fieldset>
      <fieldset className="frame-picker"><legend>Moldura do retrato</legend>{frames.map(f=><button type="button" key={f.key} aria-pressed={frame===f.key} className={`${frame===f.key?'selected':''} swatch-${f.key}`} onClick={()=>setFrame(f.key)}><i/>{f.name}</button>)}</fieldset>
      <label>Apresentação ({bio.length}/160)<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={160} rows={3}/></label>
      <button className="primary" disabled={busy}>{locked?'Ativar Premium para salvar':'Salvar perfil'}</button></form></div></section>;
}
function PresetSection({hero,limit,onChanged}:{hero:Hero;limit:number;onChanged:()=>Promise<void>|void}) {
  const [presets,setPresets]=useState<Preset[]>([]),[name,setName]=useState(''),{busy,error,ok,run}=useAction();
  const load=()=>api<Preset[]>(`/characters/${hero.id}/presets`).then(setPresets).catch(()=>{});
  useEffect(()=>{void load();},[hero.id]);
  return <section className="panel" id="premium-presets"><div className="section-title"><h2>Conjuntos de equipamento</h2><span>{presets.length}/{limit}</span></div><Feedback error={error} ok={ok}/>
    <p className="muted">Salve o que você está usando agora e troque de conjunto fora de combate.</p>
    {presets.map(p=><div className="market-row" key={p.id}><Icon name="Golden Armor" size={32}/><div><h3>{p.name}</h3></div>
      <button disabled={busy||!!hero.activeBattleId} onClick={()=>void run(async()=>{const r=await api<{equipped:number;skipped:number}>(`/characters/${hero.id}/presets/${p.id}/apply`,{});await onChanged();return `${r.equipped} item(ns) equipado(s)${r.skipped?`, ${r.skipped} indisponível(is)`:''}.`;})}>Equipar</button>
      <button disabled={busy} onClick={()=>void run(async()=>{await api(`/characters/${hero.id}/presets/${p.id}/delete`,{});await load();},'Conjunto removido.')}>Excluir</button></div>)}
    {!presets.length&&<p className="empty">Nenhum conjunto ainda. Equipe seus itens de caçada e salve-os aqui.</p>}
    <form className="ops-inline" onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/characters/${hero.id}/presets`,{name});setName('');await load();},'Conjunto salvo.');}}>
      <input placeholder="Nome do conjunto" aria-label="Nome do conjunto" value={name} onChange={e=>setName(e.target.value)} maxLength={30} required/><button disabled={busy}>Salvar equipamento atual</button></form></section>;
}
function StatsSection({hero}:{hero:Hero}) {
  const [days,setDays]=useState(7),[s,setS]=useState<Stats|null>(null),[err,setErr]=useState('');
  useEffect(()=>{setErr('');api<Stats>(`/characters/${hero.id}/hunt-stats?days=${days}`).then(setS).catch(e=>setErr(msg(e)));},[hero.id,days]);
  const peak=Math.max(1,...(s?.byDay.map(d=>d.battles)??[1]));
  return <section className="panel" id="premium-diary"><div className="section-title"><h2>Diário detalhado</h2><span><button className={days===7?'active-chip':''} onClick={()=>setDays(7)}>7 dias</button> <button className={days===30?'active-chip':''} onClick={()=>setDays(30)}>30 dias</button></span></div>
    {err&&<p className="error" role="alert">{err}</p>}{s&&<>
      <div className="stat-tiles"><div><b>{s.totals.battles}</b><span>combates</span></div><div><b>{s.totals.winRate}%</b><span>vitórias</span></div><div><b>{fmt(s.totals.gold)}</b><span>ouro</span></div><div><b>{fmt(s.totals.experience)}</b><span>XP</span></div></div>
      {s.byDay.length>0&&<div className="day-bars" role="img" aria-label="Combates por dia">{s.byDay.map(d=><div key={d.day} title={`${d.day}: ${d.battles} combates, ${d.victories} vitórias`}><i style={{height:`${Math.max(6,d.battles/peak*100)}%`}}/><small>{d.day.slice(8)}/{d.day.slice(5,7)}</small></div>)}</div>}
      <Limited items={s.byMonster} label="Ver mais criaturas" render={m=><div className="ledger-row" key={m.name}><span>{m.name}</span><span>{m.victories}/{m.battles} vitórias</span><b>{fmt(m.gold)} ouro · {fmt(m.experience)} XP</b></div>}/>
      {!s.byMonster.length&&<p className="empty">Sem combates neste período.</p>}</>}</section>;
}
