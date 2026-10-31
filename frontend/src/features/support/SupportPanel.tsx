import {useEffect,useState} from 'react';
import {Limited} from '../../ui/ShowMore';
import {api} from '../../lib/api';
import {when} from '../../lib/format';
import {useAction,Feedback} from '../../ui/Feedback';
type Ticket={id:number;kind:string;subject:string;status:string;updatedAt:string};
type TicketView={id:number;subject:string;status:string;kind:string;messages:{id:number;body:string;fromStaff:boolean;createdAt:string}[]};
const ticketStatus:Record<string,string>={OPEN:'Aberto',IN_PROGRESS:'Em atendimento',RESOLVED:'Resolvido'};
export default function SupportPanel() {
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
      <Limited items={tickets} label="Ver mais atendimentos" render={t=><div className="market-row" key={t.id}><div><h3>#{t.id} · {t.subject}</h3><p>{t.kind==='REPORT'?'Denúncia':'Suporte'} · {ticketStatus[t.status]??t.status} · {when(t.updatedAt)}</p></div><button onClick={()=>void open(t.id)}>Abrir</button></div>}/>
      {!tickets.length&&<p className="empty">Nenhum atendimento aberto.</p>}</section>
    {view&&<section className="panel"><div className="section-title"><h2>#{view.id} · {view.subject}</h2><span>{ticketStatus[view.status]??view.status}</span></div>
      <div className="thread">{view.messages.map(m=><div key={m.id} className={m.fromStaff?'bubble staff':'bubble'}><small>{m.fromStaff?'Equipe':'Você'} · {when(m.createdAt)}</small><p>{m.body}</p></div>)}</div>
      <form className="ops-inline" onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/support/tickets/${view.id}/messages`,{body:reply});setReply('');await open(view.id);await load();},'Mensagem enviada.');}}>
        <input aria-label="Responder" value={reply} onChange={e=>setReply(e.target.value)} minLength={2} maxLength={2000} required placeholder="Escreva uma resposta"/><button disabled={busy}>Responder</button></form></section>}
  </>;
}

// ===== Recuperação de senha e confirmação de e-mail (links enviados por e-mail) =====
