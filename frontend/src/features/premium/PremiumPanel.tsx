import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import {fmt,brl,when,msg} from '../../lib/format';
import type {Hero} from '../../lib/types';
import {useAction,Feedback} from '../../ui/Feedback';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import {premiumBenefits,frames,profileTitles,emblems} from '../../../../shared/premium';
type Overview={enabled:boolean;priceCents:number;days:number;active:boolean;until:string|null;emailVerified:boolean;orders:{id:number;status:string;amountCents:number;days:number;createdAt:string;paidAt:string|null}[]};
type Preset={id:number;name:string};
type Stats={days:number;totals:{battles:number;victories:number;defeats:number;flees:number;gold:string;experience:number;winRate:number};byMonster:{name:string;battles:number;victories:number;gold:string;experience:number}[];byDay:{day:string;battles:number;victories:number;gold:string;experience:number}[]};
const orderStatus:Record<string,string>={PENDING:'Aguardando pagamento',PAID:'Pago',FAILED:'Não concluído',REFUNDED:'Reembolsado',CANCELLED:'Cancelado'};
export default function PremiumPanel({hero,onChanged}:{hero:Hero;onChanged:()=>Promise<void>|void}) {
  const [o,setO]=useState<Overview|null>(null),{busy,error,ok,run}=useAction();
  const load=()=>api<Overview>('/premium').then(setO).catch(e=>{});
  useEffect(()=>{void load();},[]);
  if(!o)return <section className="panel"><p>Carregando…</p></section>;
  return <>
    <section className="panel premium-hero"><span className="eyebrow">PASSE DE {o.days} DIAS</span><h2>{o.active?'Seu Premium está ativo':'Mais conforto para sua jornada'}</h2>
      <p className="muted">O Premium oferece organização e personalização. <b>Ele não altera as regras de combate</b>, e os modos claro e escuro continuam disponíveis para todos.</p>
      <div className="benefit-grid">{premiumBenefits.map(b=><div key={b.key}><strong>{b.title}</strong><span>{b.description}</span></div>)}</div>
      <Feedback error={error} ok={ok}/>
      {o.active&&<p className="success notice">Ativo até {when(o.until)}. Comprar de novo soma {o.days} dias ao final do período atual.</p>}
      {!o.emailVerified&&<div className="notice">Confirme seu e-mail para comprar. <button className="link-button" disabled={busy} onClick={()=>void run(async()=>{return (await api<{message:string}>('/auth/resend-verification',{})).message;})}>Reenviar link de confirmação</button></div>}
      {o.enabled?<button className="primary" disabled={busy||!o.emailVerified} onClick={()=>void run(async()=>{const r=await api<{url:string}>('/premium/checkout',{});window.location.assign(r.url);})}>{o.active?'Renovar':'Ativar'} por {brl(o.priceCents)} · Pix ou cartão</button>
        :<p className="muted">O Premium ainda não está à venda. Em breve, via Mercado Pago (Pix e cartão).</p>}
      <p className="muted">O acesso é liberado depois que o pagamento é confirmado pelo servidor — normalmente em instantes no Pix.</p>
    </section>
    {o.active&&<><PresetSection hero={hero} onChanged={onChanged}/><ProfileSection hero={hero} onChanged={onChanged}/><StatsSection hero={hero}/></>}
    {o.orders.length>0&&<section className="panel"><div className="section-title"><h2>Seus pedidos</h2></div>{o.orders.map(x=><div className="ledger-row" key={x.id}><span>#{x.id} · {when(x.createdAt)}</span><span>{x.days} dias · {brl(x.amountCents)}</span><b>{orderStatus[x.status]??x.status}</b></div>)}</section>}
  </>;
}
function PresetSection({hero,onChanged}:{hero:Hero;onChanged:()=>Promise<void>|void}) {
  const [presets,setPresets]=useState<Preset[]>([]),[name,setName]=useState(''),{busy,error,ok,run}=useAction();
  const load=()=>api<Preset[]>(`/characters/${hero.id}/presets`).then(setPresets).catch(()=>{});
  useEffect(()=>{void load();},[hero.id]);
  return <section className="panel"><div className="section-title"><h2>Conjuntos de equipamento</h2><span>{presets.length}</span></div><Feedback error={error} ok={ok}/>
    <p className="muted">Salve o que você está usando agora e troque de conjunto fora de combate.</p>
    {presets.map(p=><div className="market-row" key={p.id}><Icon name="Backpack" size={32}/><div><h3>{p.name}</h3></div>
      <button disabled={busy||!!hero.activeBattleId} onClick={()=>void run(async()=>{const r=await api<{equipped:number;skipped:number}>(`/characters/${hero.id}/presets/${p.id}/apply`,{});await onChanged();return `${r.equipped} item(ns) equipado(s)${r.skipped?`, ${r.skipped} indisponível(is)`:''}.`;})}>Equipar</button>
      <button disabled={busy} onClick={()=>void run(async()=>{await api(`/characters/${hero.id}/presets/${p.id}/delete`,{});await load();},'Conjunto removido.')}>Excluir</button></div>)}
    <form className="ops-inline" onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/characters/${hero.id}/presets`,{name});setName('');await load();},'Conjunto salvo.');}}>
      <input placeholder="Nome do conjunto" aria-label="Nome do conjunto" value={name} onChange={e=>setName(e.target.value)} maxLength={30} required/><button disabled={busy}>Salvar equipamento atual</button></form></section>;
}
function ProfileSection({hero,onChanged}:{hero:Hero;onChanged:()=>Promise<void>|void}) {
  const [title,setTitle]=useState(hero.profileTitle??''),[emblem,setEmblem]=useState(hero.profileEmblem??''),[frame,setFrame]=useState(hero.profileFrame??'none'),[bio,setBio]=useState(hero.profileBio??''),{busy,error,ok,run}=useAction();
  return <section className="panel"><div className="section-title"><h2>Perfil e aparência</h2><Icon name={emblem||'Mastermind Shield'} size={32}/></div><Feedback error={error} ok={ok}/>
    <form className="ops-form" onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/characters/${hero.id}/profile`,{title:title||null,emblem:emblem||null,frame,bio});await onChanged();},'Perfil atualizado.');}}>
      <label>Título<select value={title} onChange={e=>setTitle(e.target.value)}><option value="">Nenhum</option>{profileTitles.map(t=><option key={t.key} value={t.key}>{t.name}</option>)}</select></label>
      <label>Emblema<select value={emblem} onChange={e=>setEmblem(e.target.value)}><option value="">Nenhum</option>{emblems.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Moldura do retrato<select value={frame} onChange={e=>setFrame(e.target.value)}>{frames.map(f=><option key={f.key} value={f.key}>{f.name}</option>)}</select></label>
      <label>Apresentação ({bio.length}/160)<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={160} rows={3}/></label>
      <button className="primary" disabled={busy}>Salvar perfil</button></form></section>;
}
function StatsSection({hero}:{hero:Hero}) {
  const [days,setDays]=useState(7),[s,setS]=useState<Stats|null>(null),[err,setErr]=useState('');
  useEffect(()=>{setErr('');api<Stats>(`/characters/${hero.id}/hunt-stats?days=${days}`).then(setS).catch(e=>setErr(msg(e)));},[hero.id,days]);
  const peak=Math.max(1,...(s?.byDay.map(d=>d.battles)??[1]));
  return <section className="panel"><div className="section-title"><h2>Diário detalhado</h2><span><button className={days===7?'active-chip':''} onClick={()=>setDays(7)}>7 dias</button> <button className={days===30?'active-chip':''} onClick={()=>setDays(30)}>30 dias</button></span></div>
    {err&&<p className="error" role="alert">{err}</p>}{s&&<>
      <div className="stat-tiles"><div><b>{s.totals.battles}</b><span>combates</span></div><div><b>{s.totals.winRate}%</b><span>vitórias</span></div><div><b>{fmt(s.totals.gold)}</b><span>ouro</span></div><div><b>{fmt(s.totals.experience)}</b><span>XP</span></div></div>
      {s.byDay.length>0&&<div className="day-bars" role="img" aria-label="Combates por dia">{s.byDay.map(d=><div key={d.day} title={`${d.day}: ${d.battles} combates, ${d.victories} vitórias`}><i style={{height:`${Math.max(6,d.battles/peak*100)}%`}}/><small>{d.day.slice(8)}/{d.day.slice(5,7)}</small></div>)}</div>}
      <Limited items={s.byMonster} label="Ver mais criaturas" render={m=><div className="ledger-row" key={m.name}><span>{m.name}</span><span>{m.victories}/{m.battles} vitórias</span><b>{fmt(m.gold)} ouro · {fmt(m.experience)} XP</b></div>}/>
      {!s.byMonster.length&&<p className="empty">Sem combates neste período.</p>}</>}</section>;
}

// ===== Extrato e histórico do mercado =====
