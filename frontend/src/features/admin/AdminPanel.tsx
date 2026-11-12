import {useEffect,useRef,useState} from 'react';
import {Limited,LimitedRows} from '../../ui/ShowMore';
import {api} from '../../lib/api';
import {fmt,brl,when} from '../../lib/format';
import {reasonLabel} from '../ledger/reasonLabel';
import type {Permission} from '../../../../shared/permissions';
const msg=(e:unknown)=>e instanceof Error?e.message:'Ocorreu um erro.';
type Me={role:string;permissions:Permission[]};
const roleName:Record<string,string>={SUPPORT:'Apoio',MODERATOR:'Moderação',ADMIN:'Administração'};
function useAct(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  async function run(work:()=>Promise<unknown>,done='Feito.'){if(busy)return;setBusy(true);setError('');setOk('');try{await work();setOk(done);}catch(e){setError(msg(e));}finally{setBusy(false);}}
  return {busy,error,ok,run};
}
const Msg=({error,ok}:{error:string;ok:string})=><>{error&&<div className="error notice" role="alert">{error}</div>}{ok&&<div className="success notice" role="status">{ok}</div>}</>;
export default function AdminPanel({onLeave}:{onLeave?:()=>void}) {
  const [me,setMe]=useState<Me|null>(null),[tab,setTab]=useState(''),[error,setError]=useState('');
  useEffect(()=>{api<Me>('/admin/me').then(m=>{setMe(m);setTab(first(m));}).catch(e=>setError(msg(e)));},[]);
  const first=(m:Me)=>[['tickets.read','tickets'],['accounts.read','accounts'],['economy.read','economy'],['settings.read','settings'],['orders.read','orders'],['audit.read','audit']].find(([p])=>m.permissions.includes(p as Permission))?.[1]??'';
  if(error)return <section className="panel"><p className="error" role="alert">{error}</p></section>;
  if(!me)return <section className="panel"><p>Carregando…</p></section>;
  const has=(p:Permission)=>me.permissions.includes(p);
  const tabs=[has('tickets.read')&&['tickets','Atendimento'],has('accounts.read')&&['accounts','Contas'],has('economy.read')&&['economy','Economia'],has('settings.read')&&['settings','Configurações'],has('orders.read')&&['orders','Pagamentos'],has('audit.read')&&['audit','Auditoria']].filter(Boolean) as string[][];
  return <><section className="panel"><div className="section-title"><h2>Painel da equipe</h2><span className="pill">{roleName[me.role]??me.role}</span></div>
    <div className="admin-bar" role="tablist">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active-chip':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
    <p className="muted">Toda alteração exige um motivo e fica registrada na auditoria com seu nome.</p></section>
    {tab==='tickets'&&<Tickets can={has('tickets.reply')}/>}{tab==='accounts'&&<Accounts has={has}/>}{tab==='economy'&&<Economy/>}{tab==='settings'&&<Settings canWrite={has('settings.write')}/>}{tab==='orders'&&<Orders canManage={has('orders.manage')}/>}{tab==='audit'&&<Audit/>}</>;
}

type TicketRow={id:number;kind:string;subject:string;status:string;updatedAt:string;account:{email:string}};
type TicketFull={id:number;kind:string;subject:string;status:string;account:{id:number;email:string};reported:{id:number;name:string;accountId:number}|null;messages:{id:number;body:string;internal:boolean;authorAccountId:number;createdAt:string}[]};
function Tickets({can}:{can:boolean}) {
  const [status,setStatus]=useState(''),[rows,setRows]=useState<TicketRow[]>([]),[t,setT]=useState<TicketFull|null>(null),[body,setBody]=useState(''),[internal,setInternal]=useState(false),a=useAct();
  const load=()=>api<TicketRow[]>(`/admin/tickets${status?`?status=${status}`:''}`).then(setRows).catch(()=>{});
  const open=(id:number)=>api<TicketFull>(`/admin/tickets/${id}`).then(setT).catch(()=>{});
  useEffect(()=>{void load();},[status]);
  return <><section className="panel"><div className="admin-bar"><select aria-label="Filtro" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="OPEN">Abertos</option><option value="IN_PROGRESS">Em atendimento</option><option value="RESOLVED">Resolvidos</option></select><button onClick={()=>void load()}>Atualizar</button></div>
    <table className="admin-table"><thead><tr><th>#</th><th>Tipo</th><th>Assunto</th><th>Conta</th><th>Status</th><th/></tr></thead><tbody><LimitedRows items={rows} cols={10} render={r=><tr key={r.id}><td>{r.id}</td><td>{r.kind==='REPORT'?'Denúncia':'Suporte'}</td><td>{r.subject}</td><td>{r.account.email}</td><td>{r.status}</td><td><button onClick={()=>void open(r.id)}>Abrir</button></td></tr>}/></tbody></table>{!rows.length&&<p className="empty">Nada por aqui.</p>}</section>
    {t&&<section className="panel"><div className="section-title"><h2>#{t.id} · {t.subject}</h2><span className="pill">{t.status}</span></div><Msg error={a.error} ok={a.ok}/>
      <p className="muted">Conta: {t.account.email} (#{t.account.id}){t.reported?` · Denunciado: ${t.reported.name} (personagem #${t.reported.id}, conta #${t.reported.accountId})`:''}</p>
      <div className="thread">{t.messages.map(m=><div key={m.id} className={m.authorAccountId===t.account.id?'bubble':'bubble staff'}><small>{m.authorAccountId===t.account.id?'Jogador':'Equipe'}{m.internal?' · nota interna':''} · {when(m.createdAt)}</small><p>{m.body}</p></div>)}</div>
      {can&&<><form className="ops-inline" onSubmit={e=>{e.preventDefault();void a.run(async()=>{await api(`/admin/tickets/${t.id}/messages`,{body,internal});setBody('');await open(t.id);await load();},'Enviado.');}}>
        <input aria-label="Mensagem" value={body} onChange={e=>setBody(e.target.value)} required minLength={2} maxLength={2000} placeholder="Resposta ao jogador ou nota interna"/>
        <label style={{flexDirection:'row',alignItems:'center'}}><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)} style={{flex:'0 0 auto'}}/> Nota interna</label><button disabled={a.busy}>Enviar</button></form>
        <div className="admin-bar" style={{marginTop:12}}>{['OPEN','IN_PROGRESS','RESOLVED'].map(s=><button key={s} disabled={a.busy||t.status===s} onClick={()=>void a.run(async()=>{await api(`/admin/tickets/${t.id}/status`,{status:s});await open(t.id);await load();},'Status atualizado.')}>{s==='OPEN'?'Reabrir':s==='IN_PROGRESS'?'Em atendimento':'Resolver'}</button>)}</div></>}</section>}</>;
}

type AccountRow={id:number;email:string;role:string;emailVerifiedAt:string|null;createdAt:string;characters:{id:number;name:string;level:number;vocation:string}[]};
type AccountFull=Omit<AccountRow,"characters">&{premium:{active:boolean;until:string|null};characters:{id:number;name:string;level:number;vocation:string;goldInHand:string;goldInBank:string}[];punishments:{id:number;kind:string;reason:string;createdAt?:string;startsAt:string;expiresAt:string|null;revokedAt:string|null}[];periods:{id:number;source:string;days:number;startsAt:string;endsAt:string;revokedAt:string|null;reason:string|null}[];orders:{id:number;status:string;amountCents:number;createdAt:string}[];tickets:{id:number;subject:string;status:string}[]};
type GoldEntry={id:number;delta:string;balanceAfter:string;reason:string;createdAt:string};
type ItemEntry={id:number;delta:number;item:string;reason:string;upgradeTier:number;createdAt:string};
// Uma chave por tentativa: o mesmo clique repetido reenvia a mesma chave (o servidor aplica uma vez); mudar os dados gera outra.
function useOpKey(){const ref=useRef<{sig:string;key:string}|null>(null);return{get:(sig:string)=>{if(!ref.current||ref.current.sig!==sig)ref.current={sig,key:crypto.randomUUID()};return ref.current.key;},clear:()=>{ref.current=null;}};}
function Accounts({has}:{has:(p:Permission)=>boolean}) {
  const goldKey=useOpKey(),premiumKey=useOpKey();
  const [q,setQ]=useState(''),[rows,setRows]=useState<AccountRow[]>([]),[acc,setAcc]=useState<AccountFull|null>(null),a=useAct();
  const [reason,setReason]=useState(''),[kind,setKind]=useState('WARNING'),[hours,setHours]=useState(''),[days,setDays]=useState('7'),[delta,setDelta]=useState(''),[charId,setCharId]=useState<number|null>(null),[gold,setGold]=useState<GoldEntry[]>([]),[items,setItems]=useState<ItemEntry[]>([]);
  const open=(id:number)=>api<AccountFull>(`/admin/accounts/${id}`).then(setAcc);
  const act=(work:()=>Promise<unknown>,done?:string)=>a.run(async()=>{await work();if(acc)await open(acc.id);},done);
  async function ledger(id:number){setCharId(id);const [g,i]=await Promise.all([api<{entries:GoldEntry[]}>(`/admin/ledger/gold?characterId=${id}`),api<{entries:ItemEntry[]}>(`/admin/ledger/items?characterId=${id}`)]);setGold(g.entries);setItems(i.entries);}
  return <><section className="panel"><form className="ops-inline" onSubmit={e=>{e.preventDefault();void a.run(async()=>setRows(await api<AccountRow[]>(`/admin/accounts?q=${encodeURIComponent(q)}`)),'');}}><input aria-label="Buscar" placeholder="E-mail ou nome do personagem" value={q} onChange={e=>setQ(e.target.value)} minLength={2} required/><button disabled={a.busy}>Buscar</button></form><Msg error={a.error} ok={a.ok}/>
    <table className="admin-table"><tbody><LimitedRows items={rows} cols={10} render={r=><tr key={r.id}><td>#{r.id}</td><td>{r.email}{r.role!=='PLAYER'&&<> <span className="pill">{r.role}</span></>}</td><td>{r.characters.map(c=>c.name).join(', ')}</td><td><button onClick={()=>void open(r.id)}>Ver</button></td></tr>}/></tbody></table></section>
    {acc&&<section className="panel"><div className="section-title"><h2>{acc.email}</h2><span className="pill">{acc.role}</span></div>
      <p className="muted">Conta #{acc.id} · criada em {when(acc.createdAt)} · e-mail {acc.emailVerifiedAt?'confirmado':'não confirmado'} · Premium {acc.premium.active?`até ${when(acc.premium.until)}`:'inativo'}</p>
      <label className="ops-form" style={{margin:'0 0 14px'}}>Motivo (obrigatório para qualquer ação abaixo)<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label>
      <h3>Personagens</h3><table className="admin-table"><tbody>{acc.characters.map(c=><tr key={c.id}><td>#{c.id} {c.name}</td><td>Nv. {c.level} · {c.vocation}</td><td>{fmt(c.goldInHand)} ouro</td><td><button onClick={()=>void ledger(c.id)}>Extrato</button></td></tr>)}</tbody></table>
      {has('gold.adjust')&&charId&&<form className="ops-inline" onSubmit={e=>{e.preventDefault();void act(()=>api(`/admin/characters/${charId}/gold`,{delta,reason},goldKey.get(`${charId}|${delta}|${reason}`)).then(()=>{goldKey.clear();return ledger(charId);}),'Ouro ajustado.');}}><input aria-label="Variação" inputMode="numeric" placeholder="Ex.: 500 ou -500" value={delta} onChange={e=>setDelta(e.target.value)} required/><button disabled={a.busy}>Ajustar ouro do personagem #{charId}</button></form>}
      {charId&&<><h3>Ouro (últimas entradas)</h3>{gold.map(g=><div className="ledger-row" key={g.id}><span>{when(g.createdAt)}</span><span>{reasonLabel[g.reason]??g.reason}</span><b className={BigInt(g.delta)<0n?'neg':'pos'}>{fmt(g.delta)}</b><small>saldo {fmt(g.balanceAfter)}</small></div>)}
        <h3>Itens (últimas entradas)</h3>{items.map(g=><div className="ledger-row" key={g.id}><span>{when(g.createdAt)}</span><span>{g.item} +{g.upgradeTier} · {g.reason}</span><b className={g.delta<0?'neg':'pos'}>{g.delta>0?'+':''}{g.delta}</b><small/></div>)}</>}
      {has('punish.apply')&&<><h3>Punições</h3><Limited items={acc.punishments} label="Ver mais" render={p=><div className="ledger-row" key={p.id}><span>{p.kind} · {when(p.startsAt)}</span><span>{p.reason}</span><b>{p.revokedAt?'revogada':p.expiresAt?`até ${when(p.expiresAt)}`:'sem prazo'}</b>{!p.revokedAt&&<button disabled={a.busy} onClick={()=>void act(()=>api(`/admin/punishments/${p.id}/revoke`,{reason}),'Punição revogada.')}>Revogar</button>}</div>}/>
        <form className="ops-inline" onSubmit={e=>{e.preventDefault();void act(()=>api(`/admin/accounts/${acc.id}/punishments`,{kind,reason,...(hours?{hours:Number(hours)}:{})}),'Punição aplicada.');}}><select aria-label="Tipo" value={kind} onChange={e=>setKind(e.target.value)}><option value="WARNING">Advertência</option><option value="MARKET_BAN">Bloquear mercado</option><option value="BAN">Banir conta</option></select><input aria-label="Horas" inputMode="numeric" placeholder="Horas (vazio = sem prazo)" value={hours} onChange={e=>setHours(e.target.value)}/><button disabled={a.busy}>Aplicar</button></form></>}
      {has('premium.grant')&&<><h3>Premium</h3><Limited items={acc.periods} label="Ver mais" render={p=><div className="ledger-row" key={p.id}><span>{p.source} · {p.days} dias</span><span>{when(p.startsAt)} → {when(p.endsAt)}</span><b>{p.revokedAt?'revogado':'ativo'}</b>{!p.revokedAt&&<button disabled={a.busy} onClick={()=>void act(()=>api(`/admin/premium-periods/${p.id}/revoke`,{reason}),'Período revogado.')}>Revogar</button>}</div>}/>
        <form className="ops-inline" onSubmit={e=>{e.preventDefault();void act(()=>api(`/admin/accounts/${acc.id}/premium`,{days:Number(days),reason},premiumKey.get(`${acc.id}|${days}|${reason}`)).then(r=>{premiumKey.clear();return r;}),'Dias concedidos.');}}><input aria-label="Dias" inputMode="numeric" value={days} onChange={e=>setDays(e.target.value)} required/><button disabled={a.busy}>Conceder dias de Premium</button></form></>}
      {acc.tickets.length>0&&<><h3>Atendimentos</h3><Limited items={acc.tickets} label="Ver mais" render={t=><div key={t.id}>#{t.id} · {t.subject} <span className="pill">{t.status}</span></div>}/></>}</section>}</>;
}

type Econ={days:number;inflow:string;outflow:string;net:string;circulation:{inHand:string;inBank:string;characters:number};gold:{reason:string;kind:string;total:string;count:number}[];items:{reason:string;kind:string;total:number;count:number}[];daily:{day:string;kind:string;total:string}[];market:{byStatus:{status:string;count:number}[];sales:number;volume:string;fees:string};premium:{active:number;paidOrders:number;revenueCents:number}};
function Economy() {
  const [days,setDays]=useState(7),[d,setD]=useState<Econ|null>(null),[err,setErr]=useState('');
  useEffect(()=>{setErr('');api<Econ>(`/admin/economy?days=${days}`).then(setD).catch(e=>setErr(msg(e)));},[days]);
  const kindName:Record<string,string>={source:'Entra no mundo',sink:'Sai do mundo',transfer:'Entre jogadores'};
  return <section className="panel"><div className="section-title"><h2>Indicadores da economia</h2><span>{[1,7,30].map(n=><button key={n} className={days===n?'active-chip':''} onClick={()=>setDays(n)}>{n===1?'24 h':`${n} dias`}</button>)}</span></div>{err&&<p className="error" role="alert">{err}</p>}
    {d&&<><div className="stat-tiles"><div><b>{fmt(d.inflow)}</b><span>ouro criado</span></div><div><b>{fmt(d.outflow)}</b><span>ouro removido</span></div><div><b className={BigInt(d.net)>0n?'neg':'pos'}>{BigInt(d.net)>0n?'+':''}{fmt(d.net)}</b><span>saldo líquido do mundo</span></div><div><b>{fmt(d.circulation.inHand)}</b><span>em circulação ({d.circulation.characters} personagens)</span></div></div>
      <p className="muted">Saldo líquido positivo = mais ouro entrando do que saindo (inflação). Taxas e compras no NPC são os principais ralos.</p>
      <table className="admin-table"><thead><tr><th>Origem/destino</th><th>Tipo</th><th>Total</th><th>Eventos</th></tr></thead><tbody><LimitedRows items={d.gold} cols={10} render={g=><tr key={g.reason}><td>{reasonLabel[g.reason]??g.reason}</td><td>{kindName[g.kind]}</td><td>{fmt(g.total)}</td><td>{g.count}</td></tr>}/></tbody></table>
      <h3>Itens</h3><table className="admin-table"><tbody><LimitedRows items={d.items} cols={10} render={i=><tr key={i.reason}><td>{i.reason}</td><td>{kindName[i.kind]}</td><td>{i.total}</td><td>{i.count}</td></tr>}/></tbody></table>
      <h3>Mercado</h3><p>{d.market.sales} vendas · volume {fmt(d.market.volume)} · taxas coletadas {fmt(d.market.fees)} · anúncios: {d.market.byStatus.map(s=>`${s.status} ${s.count}`).join(', ')||'—'}</p>
      <h3>Premium</h3><p>{d.premium.active} contas ativas · {d.premium.paidOrders} pedidos pagos no período · {brl(d.premium.revenueCents)}</p>
      <h3>Por dia</h3><table className="admin-table"><tbody><LimitedRows items={d.daily} cols={10} render={r=><tr key={r.day+r.kind}><td>{r.day}</td><td>{kindName[r.kind==='in'?'source':r.kind==='out'?'sink':'transfer']}</td><td>{fmt(r.total)}</td></tr>}/></tbody></table></>}</section>;
}

type SettingRow={key:string;value:number;label:string;unit:string;group:string;min:number;max:number;default:number};
function Settings({canWrite}:{canWrite:boolean}) {
  const [rows,setRows]=useState<SettingRow[]>([]),[draft,setDraft]=useState<Record<string,string>>({}),[reason,setReason]=useState(''),a=useAct();
  const load=()=>api<SettingRow[]>('/admin/settings').then(r=>{setRows(r);setDraft(Object.fromEntries(r.map(x=>[x.key,String(x.value)])));}).catch(()=>{});
  useEffect(()=>{void load();},[]);
  const groups=[...new Set(rows.map(r=>r.group))];
  const changed=Object.fromEntries(rows.filter(r=>draft[r.key]!==undefined&&Number(draft[r.key])!==r.value).map(r=>[r.key,Number(draft[r.key])]));
  return <section className="panel"><div className="section-title"><h2>Preços, taxas e recompensas</h2></div><Msg error={a.error} ok={a.ok}/><p className="muted">Mudanças valem imediatamente para novas ações. Use com cuidado: percentuais de recompensa e preço mudam a economia inteira.</p>
    <form onSubmit={e=>{e.preventDefault();void a.run(async()=>{await api('/admin/settings',{values:changed,reason},undefined,'PUT');await load();},'Configurações salvas.');}}>
      <div className="admin-grid">{groups.map(g=><div key={g}><h3>{g}</h3>{rows.filter(r=>r.group===g).map(r=><label className="setting-row" key={r.key}><span>{r.label}<br/><small>{r.min}–{r.max} {r.unit} · padrão {r.default}</small></span><input type="number" inputMode="numeric" min={r.min} max={r.max} step={1} value={draft[r.key]??''} onChange={e=>setDraft({...draft,[r.key]:e.target.value})} disabled={!canWrite}/></label>)}</div>)}</div>
      {canWrite&&<div className="ops-inline"><input aria-label="Motivo" placeholder="Motivo da alteração (obrigatório)" value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={500} required/><button className="primary" disabled={a.busy||!Object.keys(changed).length}>Salvar {Object.keys(changed).length||''} alteração(ões)</button></div>}</form></section>;
}

type OrderRow={id:number;status:string;amountCents:number;days:number;createdAt:string;paidAt:string|null;providerPaymentId:string|null;account:{email:string}};
function Orders({canManage}:{canManage:boolean}) {
  const [rows,setRows]=useState<OrderRow[]>([]),[reason,setReason]=useState(''),a=useAct();
  const load=()=>api<OrderRow[]>('/admin/orders').then(setRows).catch(()=>{});
  useEffect(()=>{void load();},[]);
  return <section className="panel"><div className="section-title"><h2>Pedidos do Premium</h2><button onClick={()=>void load()}>Atualizar</button></div><Msg error={a.error} ok={a.ok}/>
    {canManage&&<input aria-label="Motivo" placeholder="Motivo (para marcar reembolso)" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} style={{marginBottom:10,width:'100%'}}/>}
    <table className="admin-table"><thead><tr><th>#</th><th>Conta</th><th>Valor</th><th>Status</th><th>Pagamento</th><th/></tr></thead><tbody><LimitedRows items={rows} cols={10} render={o=><tr key={o.id}><td>{o.id}</td><td>{o.account.email}</td><td>{brl(o.amountCents)} · {o.days} d</td><td>{o.status}</td><td>{o.providerPaymentId??'—'}</td><td>{canManage&&o.status==='PAID'&&<button disabled={a.busy} onClick={()=>void a.run(async()=>{await api(`/admin/orders/${o.id}/refund`,{reason});await load();},'Reembolso registrado; acesso revogado.')}>Registrar reembolso</button>}</td></tr>}/></tbody></table>
    <p className="muted">O reembolso em si é feito no painel do Mercado Pago. Normalmente o aviso automático já revoga o acesso; use o botão apenas se ele não chegar.</p></section>;
}

type AuditRow={id:number;actorAccountId:number;action:string;targetType:string;targetId:number|null;reason:string;details:unknown;createdAt:string};
function Audit() {
  const [rows,setRows]=useState<AuditRow[]>([]),[next,setNext]=useState<number|null>(null);
  useEffect(()=>{api<{entries:AuditRow[];nextBefore:number|null}>('/admin/audit').then(r=>{setRows(r.entries);setNext(r.nextBefore);}).catch(()=>{});},[]);
  async function more(){if(next===null)return;const r=await api<{entries:AuditRow[];nextBefore:number|null}>(`/admin/audit?before=${next}`);setRows([...rows,...r.entries]);setNext(r.nextBefore);}
  return <section className="panel"><div className="section-title"><h2>Auditoria</h2></div><table className="admin-table"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Motivo</th></tr></thead><tbody><LimitedRows items={rows} cols={10} render={r=><tr key={r.id}><td>{when(r.createdAt)}</td><td>#{r.actorAccountId}</td><td>{r.action}</td><td>{r.targetType}{r.targetId?` #${r.targetId}`:''}</td><td>{r.reason}{r.details?<><br/><small>{JSON.stringify(r.details)}</small></>:null}</td></tr>}/></tbody></table>{next!==null&&<button onClick={()=>void more()}>Ver mais</button>}</section>;
}
