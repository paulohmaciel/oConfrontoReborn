import {useCallback,useEffect,useState} from 'react';
import {api} from '../../lib/api';
import {msg} from '../../lib/format';
import type {Hero} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Feedback} from '../../ui/Feedback';
import {Limited} from '../../ui/ShowMore';
import {classLabel} from '../../../../shared/adventure';
type Card={id:number;name:string;level:number;vocation:string;classTier:number;profileAvatar:string|null;profileEmblem:string|null};
type Community={incoming:{id:number;from:Card}[];outgoing:{id:number;to:Card}[]};
const Avatar=({c}:{c:Card})=><Icon name={c.profileAvatar??c.profileEmblem??'Hero'} size={32}/>;

// Amigos sem sair da aba Duelo: buscar jogador pelo nome, pedir amizade, aceitar/recusar pedidos e cancelar os enviados.
// Usa as rotas da comunidade (as mesmas do botão "Adicionar amigo" do perfil). `changed` avisa o Duelo para recarregar a lista de amigos.
export default function FriendsBox({hero,changed,openProfile}:{hero:Hero;changed:()=>void;openProfile:(name:string)=>void}){
  const [q,setQ]=useState(''),[found,setFound]=useState<Card[]>([]),[mine,setMine]=useState<Community|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  const load=useCallback(()=>api<Community>(`/characters/${hero.id}/community`).then(setMine).catch(e=>setError(msg(e))),[hero.id]);
  useEffect(()=>{void load();const t=setInterval(()=>void load(),20000);return()=>clearInterval(t);},[load]);
  // Busca enquanto digita (a partir de 2 letras), com uma pequena espera para não chamar o servidor a cada tecla.
  useEffect(()=>{const text=q.trim();if(text.length<2){setFound([]);return;}
    const t=setTimeout(()=>void api<Card[]>(`/community/search?q=${encodeURIComponent(text)}`).then(r=>setFound(r.filter(c=>c.id!==hero.id))).catch(()=>{}),300);return()=>clearTimeout(t);},[q,hero.id]);
  async function act(path:string,body:unknown={}){if(busy)return;setBusy(true);setError('');setOk('');
    try{const r=await api<{message?:string}>(`/characters/${hero.id}/community/${path}`,body);if(r?.message)setOk(r.message);await load();changed();}
    catch(e){setError(msg(e));}finally{setBusy(false);}}
  const pendingOut=new Set(mine?.outgoing.map(o=>o.to.id)),pendingIn=new Map(mine?.incoming.map(i=>[i.from.id,i.id]));
  return <section className="panel friends-box"><div className="section-title"><h2>Amigos</h2><span>{mine?`${mine.incoming.length} pedido(s) recebido(s)`:''}</span></div>
    <p className="muted">Só amigos podem se desafiar. Procure o aventureiro pelo nome e peça amizade; quando ele aceitar, ele aparece em "Desafiar um amigo".</p>
    <Feedback error={error} ok={ok}/>
    {mine&&mine.incoming.length>0&&<><h3 className="profile-subtitle">Pedidos recebidos</h3>
      <Limited items={mine.incoming} render={i=><div className="market-row" key={i.id}><Avatar c={i.from}/><div><h3><button className="link-button" onClick={()=>openProfile(i.from.name)}>{i.from.name}</button> quer ser seu amigo</h3>
        <p>{classLabel(i.from.vocation,i.from.classTier)} · Nv. {i.from.level}</p></div>
        <button className="primary" disabled={busy} onClick={()=>void act(`friends/${i.id}/accept`)}>Aceitar</button><button disabled={busy} onClick={()=>void act(`friends/${i.id}/decline`)}>Recusar</button></div>}/></>}
    <label className="friends-search">Procurar aventureiro<input value={q} maxLength={24} placeholder="Digite pelo menos 2 letras do nome…" onChange={e=>setQ(e.target.value)}/></label>
    {found.map(c=><div className="market-row" key={c.id}><Avatar c={c}/><div><h3><button className="link-button" onClick={()=>openProfile(c.name)}>{c.name}</button></h3><p>{classLabel(c.vocation,c.classTier)} · Nv. {c.level}</p></div>
      {pendingIn.has(c.id)?<button className="primary" disabled={busy} onClick={()=>void act(`friends/${pendingIn.get(c.id)}/accept`)}>Aceitar pedido</button>
        :pendingOut.has(c.id)?<span className="tag">PEDIDO ENVIADO</span>
        :<button className="primary" disabled={busy} onClick={()=>void act('friends',{to:c.name})}>Adicionar amigo</button>}</div>)}
    {q.trim().length>=2&&!found.length&&<p className="muted">Ninguém com nome começando por "{q.trim()}".</p>}
    {mine&&mine.outgoing.length>0&&<><h3 className="profile-subtitle">Pedidos enviados</h3>
      <Limited items={mine.outgoing} render={o=><div className="market-row" key={o.id}><Avatar c={o.to}/><div><h3>{o.to.name}</h3><p>Esperando ele aceitar</p></div>
        <button disabled={busy} onClick={()=>void act(`friends/${o.id}/remove`)}>Cancelar pedido</button></div>}/></>}
  </section>;
}
