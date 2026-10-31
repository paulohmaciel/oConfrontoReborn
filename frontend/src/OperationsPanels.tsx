import {useEffect,useState} from 'react';
import {api,ApiError} from './api';
import Icon from './GameIcon';
import {VocationPicker} from './AdventurePanels';
import {vocations,vocationLabel,isPromoted,promotion,type BaseVocation} from '../../shared/adventure';
import {premiumBenefits,frames,profileTitles,emblems} from '../../shared/premium';
import type {Hero,GameConfig} from './types';
export const fmt=(n:string|number)=>BigInt(n).toLocaleString('pt-BR');
export const brl=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const when=(d:string|null|undefined)=>d?new Date(d).toLocaleString('pt-BR'):'—';
const msg=(e:unknown)=>e instanceof Error?e.message:'Ocorreu um erro.';
type Command=(action:string,body?:unknown)=>Promise<void>;
function useAction(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  async function run(work:()=>Promise<unknown>,done=''){if(busy)return;setBusy(true);setError('');setOk('');try{const r=await work();setOk(typeof r==='string'&&r?r:done);}catch(e){setError(msg(e));}finally{setBusy(false);}}
  return {busy,error,ok,run,setError};
}
const Feedback=({error,ok}:{error:string;ok:string})=><>{error&&<div className="error notice" role="alert">{error}</div>}{ok&&<div className="success notice" role="status">{ok}</div>}</>;

// ===== Personagens e classes =====
type CharList={characters:{id:number;name:string;level:number;vocation:string}[];limit:number;premium:boolean};
export function CharactersPanel({hero,config,command,onSelect,onCreated}:{hero:Hero;config:GameConfig|null;command:Command;onSelect:(id:number)=>void;onCreated:(id:number)=>void}) {
  const [list,setList]=useState<CharList|null>(null),[name,setName]=useState(''),[vocation,setVocation]=useState<BaseVocation>('KNIGHT'),{busy,error,ok,run}=useAction();
  const load=()=>api<CharList>('/characters').then(setList).catch(()=>{});
  useEffect(()=>{void load();},[hero.id,hero.vocation]);
  const canPromote=hero.vocationChosen&&!isPromoted(hero.vocation)&&hero.level>=promotion.minLevel;
  return <>
    <section className="panel"><div className="section-title"><h2>Seus personagens</h2><span>{list?`${list.characters.length}/${list.limit}`:''}</span></div>
      <Feedback error={error} ok={ok}/>
      {list?.characters.map(c=><div className="market-row" key={c.id}><Icon name={vocations[(Object.keys(vocations).includes(c.vocation)?c.vocation:'KNIGHT') as BaseVocation]?.icon??'Sword'} size={40}/><div><h3>{c.name}</h3><p>{vocationLabel(c.vocation)} · Nível {c.level}</p></div><button disabled={busy||c.id===hero.id} onClick={()=>onSelect(c.id)}>{c.id===hero.id?'Em uso':'Jogar'}</button></div>)}
      {list&&list.characters.length<list.limit&&<form className="ops-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const c=await api<{id:number}>('/characters',{name,vocation});setName('');await load();onCreated(c.id);},'Personagem criado.');}}>
        <h3>Novo personagem</h3><p className="muted">Experimente outra vocação. Personagens extras começam com 100 de ouro e o equipamento inicial.</p>
        <label>Nome<input value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={24} required/></label>
        <VocationPicker value={vocation} onChange={setVocation} disabled={busy}/>
        <button className="primary" disabled={busy}>Criar personagem</button></form>}
      {list&&list.characters.length>=list.limit&&<p className="muted">{list.premium?'Você atingiu o limite de personagens do Premium.':'Sua conta gratuita tem 1 personagem. O Premium libera personagens extras para experimentar outras vocações — suas classes e progressão continuam independentes.'}</p>}
    </section>
    <section className="panel"><div className="section-title"><h2>Classe e promoção</h2><span>{vocationLabel(hero.vocation)}</span></div>
      {isPromoted(hero.vocation)?<p>Seu personagem foi promovido: <b>+10% de ataque e defesa</b> e <b>+{promotion.critical}% de crítico</b>.</p>:<>
        <p className="muted">A partir do nível {promotion.minLevel}, a promoção fortalece a vocação em 10% de ataque e defesa e +{promotion.critical}% de crítico. Sua progressão, equipamentos e habilidades continuam.</p>
        <button className="primary" disabled={!canPromote||!!hero.activeBattleId||(config!==null&&BigInt(hero.goldInHand)<BigInt(config.promotionGold))} onClick={()=>void command('promote',{})}>Promover{config?` · ${fmt(config.promotionGold)} ouro`:''}</button>
        {!canPromote&&<p className="muted">{hero.vocationChosen?`Disponível no nível ${promotion.minLevel} (você está no ${hero.level}).`:'Escolha uma vocação na Jornada primeiro.'}</p>}</>}
    </section></>;
}

// ===== Premium =====
type Overview={enabled:boolean;priceCents:number;days:number;active:boolean;until:string|null;emailVerified:boolean;orders:{id:number;status:string;amountCents:number;days:number;createdAt:string;paidAt:string|null}[]};
type Preset={id:number;name:string};
type Stats={days:number;totals:{battles:number;victories:number;defeats:number;flees:number;gold:string;experience:number;winRate:number};byMonster:{name:string;battles:number;victories:number;gold:string;experience:number}[];byDay:{day:string;battles:number;victories:number;gold:string;experience:number}[]};
const orderStatus:Record<string,string>={PENDING:'Aguardando pagamento',PAID:'Pago',FAILED:'Não concluído',REFUNDED:'Reembolsado',CANCELLED:'Cancelado'};
export function PremiumPanel({hero,onChanged}:{hero:Hero;onChanged:()=>Promise<void>|void}) {
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
      {s.byMonster.map(m=><div className="ledger-row" key={m.name}><span>{m.name}</span><span>{m.victories}/{m.battles} vitórias</span><b>{fmt(m.gold)} ouro · {fmt(m.experience)} XP</b></div>)}
      {!s.byMonster.length&&<p className="empty">Sem combates neste período.</p>}</>}</section>;
}

// ===== Extrato e histórico do mercado =====
type LedgerEntry={id:number;delta:string;balanceAfter:string;reason:string;kind:string;createdAt:string};
type History={id:number;item:{name:string;spriteUrl:string};quantity:number;upgradeTier:number;price:string;fee:string;status:string;role:'SELLER'|'BUYER';soldAt:string|null;createdAt:string};
export const reasonLabel:Record<string,string>={MONSTER:'Caçada',TASK:'Tarefa',JOURNEY:'Jornada',NPC_SELL:'Venda ao NPC',STARTER:'Ouro inicial',ADMIN_GRANT:'Ajuste da equipe (+)',NPC_BUY:'Compra no NPC',UPGRADE:'Ferreiro',PROMOTION:'Promoção de classe',MARKET_FEE:'Taxa de venda',MARKET_LISTING_FEE:'Taxa de anúncio',ADMIN_REMOVE:'Ajuste da equipe (−)',MARKET_SALE:'Venda no mercado',MARKET_PURCHASE:'Compra no mercado',UPGRADE_BREAK:'Item quebrou na forja',OPENING:'Saldo de abertura',LOOT:'Loot',POTION_USE:'Poção usada',MARKET_LIST:'Anunciado',MARKET_RETURN:'Devolvido do mercado',MARKET_BUY:'Compra no mercado'};
const statusLabel:Record<string,string>={SOLD:'Vendido',CANCELLED:'Cancelado',EXPIRED:'Expirado'};
export function LedgerPanel({characterId}:{characterId:number}) {
  const [entries,setEntries]=useState<LedgerEntry[]>([]),[next,setNext]=useState<number|null>(null),[history,setHistory]=useState<History[]>([]),[error,setError]=useState('');
  useEffect(()=>{setError('');api<{entries:LedgerEntry[];nextBefore:number|null}>(`/characters/${characterId}/ledger`).then(r=>{setEntries(r.entries);setNext(r.nextBefore);}).catch(e=>setError(msg(e)));
    api<History[]>(`/characters/${characterId}/market/history`).then(setHistory).catch(()=>{});},[characterId]);
  async function more(){if(next===null)return;try{const r=await api<{entries:LedgerEntry[];nextBefore:number|null}>(`/characters/${characterId}/ledger?before=${next}`);setEntries([...entries,...r.entries]);setNext(r.nextBefore);}catch(e){setError(msg(e));}}
  return <>
    <section className="panel"><div className="section-title"><h2>Extrato de ouro</h2><Icon name="Gold Coin" size={28}/></div><p className="muted">Cada entrada e saída de ouro do seu personagem, em ordem.</p>{error&&<p className="error" role="alert">{error}</p>}
      {entries.map(e=><div className="ledger-row" key={e.id}><span>{when(e.createdAt)}</span><span>{reasonLabel[e.reason]??e.reason}</span><b className={BigInt(e.delta)<0n?'neg':'pos'}>{BigInt(e.delta)>0n?'+':''}{fmt(e.delta)}</b><small>saldo {fmt(e.balanceAfter)}</small></div>)}
      {!entries.length&&!error&&<p className="empty">Nenhuma movimentação ainda.</p>}{next!==null&&<button onClick={()=>void more()}>Ver mais</button>}</section>
    <section className="panel"><div className="section-title"><h2>Histórico do mercado</h2><span>{history.length}</span></div>
      {history.map(h=><div className="ledger-row" key={h.id}><span>{h.soldAt?when(h.soldAt):when(h.createdAt)}</span><span><Icon name={h.item.name} src={h.item.spriteUrl} size={22}/> {h.item.name} +{h.upgradeTier} ×{h.quantity}</span><b>{h.status==='SOLD'?`${h.role==='SELLER'?'Vendeu':'Comprou'} por ${fmt(h.price)}`:statusLabel[h.status]??h.status}</b>{h.status==='SOLD'&&h.role==='SELLER'&&<small>taxa {fmt(h.fee)}</small>}</div>)}
      {!history.length&&<p className="empty">Você ainda não concluiu negociações.</p>}</section></>;
}

// ===== Suporte e denúncias =====
type Ticket={id:number;kind:string;subject:string;status:string;updatedAt:string};
type TicketView={id:number;subject:string;status:string;kind:string;messages:{id:number;body:string;fromStaff:boolean;createdAt:string}[]};
const ticketStatus:Record<string,string>={OPEN:'Aberto',IN_PROGRESS:'Em atendimento',RESOLVED:'Resolvido'};
export function SupportPanel() {
  const [tickets,setTickets]=useState<Ticket[]>([]),[view,setView]=useState<TicketView|null>(null),[kind,setKind]=useState<'SUPPORT'|'REPORT'>('SUPPORT'),[subject,setSubject]=useState(''),[body,setBody]=useState(''),[target,setTarget]=useState(''),[reply,setReply]=useState(''),{busy,error,ok,run}=useAction();
  const load=()=>api<Ticket[]>('/support/tickets').then(setTickets).catch(()=>{});
  const open=(id:number)=>api<TicketView>(`/support/tickets/${id}`).then(setView).catch(()=>{});
  useEffect(()=>{void load();},[]);
  return <>
    <section className="panel"><div className="section-title"><h2>Fale com a equipe</h2></div><Feedback error={error} ok={ok}/>
      <form className="ops-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await api<{id:number}>('/support/tickets',{kind,subject,body,...(kind==='REPORT'?{reportedName:target}:{})});setSubject('');setBody('');setTarget('');await load();await open(r.id);},'Enviado. Responderemos por aqui.');}}>
        <label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as 'SUPPORT'|'REPORT')}><option value="SUPPORT">Pedir ajuda</option><option value="REPORT">Denunciar um jogador</option></select></label>
        {kind==='REPORT'&&<label>Nome do personagem denunciado<input value={target} onChange={e=>setTarget(e.target.value)} maxLength={24} required/></label>}
        <label>Assunto<input value={subject} onChange={e=>setSubject(e.target.value)} minLength={4} maxLength={120} required/></label>
        <label>Mensagem<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={10} maxLength={2000} rows={5} required/></label>
        <button className="primary" disabled={busy}>Enviar</button></form></section>
    <section className="panel"><div className="section-title"><h2>Seus atendimentos</h2><span>{tickets.length}</span></div>
      {tickets.map(t=><div className="market-row" key={t.id}><div><h3>#{t.id} · {t.subject}</h3><p>{t.kind==='REPORT'?'Denúncia':'Suporte'} · {ticketStatus[t.status]??t.status} · {when(t.updatedAt)}</p></div><button onClick={()=>void open(t.id)}>Abrir</button></div>)}
      {!tickets.length&&<p className="empty">Nenhum atendimento aberto.</p>}</section>
    {view&&<section className="panel"><div className="section-title"><h2>#{view.id} · {view.subject}</h2><span>{ticketStatus[view.status]??view.status}</span></div>
      <div className="thread">{view.messages.map(m=><div key={m.id} className={m.fromStaff?'bubble staff':'bubble'}><small>{m.fromStaff?'Equipe':'Você'} · {when(m.createdAt)}</small><p>{m.body}</p></div>)}</div>
      <form className="ops-inline" onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/support/tickets/${view.id}/messages`,{body:reply});setReply('');await open(view.id);await load();},'Mensagem enviada.');}}>
        <input aria-label="Responder" value={reply} onChange={e=>setReply(e.target.value)} minLength={2} maxLength={2000} required placeholder="Escreva uma resposta"/><button disabled={busy}>Responder</button></form></section>}
  </>;
}

// ===== Recuperação de senha e confirmação de e-mail (links enviados por e-mail) =====
export function ForgotForm({onBack}:{onBack:()=>void}) {
  const [email,setEmail]=useState(''),{busy,error,ok,run}=useAction();
  return <form className="login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{return (await api<{message:string}>('/auth/forgot-password',{email})).message;});}}>
    <div className="wordmark">O CONFRONTO<span>CRÔNICAS DE UM AVENTUREIRO</span></div><h2>Recuperar senha</h2>
    <label>E-mail da conta<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
    {error&&<p role="alert" className="error">{error}</p>}{ok&&<p role="status" className="success">{ok}</p>}
    <button className="primary" disabled={busy}>Enviar link</button><button type="button" className="link-button" onClick={onBack}>Voltar</button></form>;
}
export function ResetForm({token,onDone}:{token:string;onDone:()=>void}) {
  const [password,setPassword]=useState(''),[done,setDone]=useState(false),{busy,error,run}=useAction();
  return <form className="login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/auth/reset-password',{token,password});setDone(true);});}}>
    <div className="wordmark">O CONFRONTO<span>CRÔNICAS DE UM AVENTUREIRO</span></div><h2>Nova senha</h2>
    {done?<><p className="success">Senha alterada. Entre com a nova senha.</p><button type="button" className="primary" onClick={onDone}>Ir para a entrada</button></>:<>
      <label>Nova senha<input type="password" minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/></label>
      <p className="muted">De 10 a 128 caracteres. Todas as sessões abertas serão encerradas.</p>{error&&<p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy}>Salvar nova senha</button><button type="button" className="link-button" onClick={onDone}>Cancelar</button></>}</form>;
}
export async function verifyEmailToken(token:string):Promise<string> {
  try{await api('/auth/verify-email',{token});return 'E-mail confirmado. Obrigado!';}catch(e){return e instanceof ApiError?e.message:'Não foi possível confirmar o e-mail.';}
}
