import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import {msg,when} from '../../lib/format';
import Icon from '../../ui/GameIcon';
import {Pager,usePaged} from '../../ui/Pager';

type Rare={id:number;name:string;spriteUrl:string;serial:number;label:string;creator:string|null;anonymous:boolean;firstOfKind:boolean;destroyed:boolean;createdAt:string;retiredAt:string|null;retiredReason:string|null;
  events?:{kind:string;at:string;detail:string}[]};
type Totals={circulating:number;destroyed:number;firsts:number};
const filters=[['','Todos'],['circulating','Em circulação'],['destroyed','Destruídos'],['first','Primeiros do tipo']] as const;
const serial=(n:number)=>`Nº ${String(n).padStart(6,'0')}`;
// Coleção pública: todo equipamento que chegou ao +10, com número de série e história. Quem escondeu o nome aparece como anônimo.
export default function RaresPanel({openProfile}:{openProfile:(name:string)=>void}){
  const [filter,setFilter]=useState<string>(''),[search,setSearch]=useState(''),[q,setQ]=useState(''),[open,setOpen]=useState<number|null>(null);
  const [detail,setDetail]=useState<Rare|null>(null),[detailError,setDetailError]=useState(''),[totals,setTotals]=useState<Totals|null>(null);
  // A busca só vai ao servidor depois de uma pausa na digitação.
  useEffect(()=>{const t=setTimeout(()=>setQ(search.trim()),350);return()=>clearTimeout(t);},[search]);
  const list=usePaged<Rare>(`/rare-items?status=${filter}${q?`&q=${encodeURIComponent(q)}`:''}`);
  useEffect(()=>{api<Totals>('/rare-items/totals').then(setTotals).catch(()=>setTotals(null));},[]);
  useEffect(()=>{setDetail(null);setDetailError('');if(open===null)return;let live=true;
    api<Rare>(`/rare-items/${open}`).then(r=>{if(live)setDetail(r);}).catch(e=>{if(live)setDetailError(msg(e));});return()=>{live=false;};},[open]);
  return <section className="panel rares-panel"><div className="section-title"><h2>Itens raros de Capriel</h2><Icon name="Magic Longsword" size={36} tier={10}/></div>
    <p className="muted">Todo equipamento que sobrevive ao Ferreiro até o +10 ganha um número de série e entra para a história. O registro nunca é apagado, nem quando o item é destruído.</p>
    {totals&&<dl className="duel-record rares-totals"><div><dt>Em circulação</dt><dd>{totals.circulating}</dd></div><div><dt>Destruídos</dt><dd>{totals.destroyed}</dd></div><div><dt>Primeiros do tipo</dt><dd>{totals.firsts}</dd></div><div><dt>Forjados</dt><dd>{totals.circulating+totals.destroyed}</dd></div></dl>}
    <input placeholder="Buscar pelo nome do item…" aria-label="Buscar item raro pelo nome" value={search} maxLength={60} onChange={e=>setSearch(e.target.value)}/>
    <div className="profile-tabs" role="group" aria-label="Filtrar itens raros">{filters.map(([k,l])=><button key={k} type="button" aria-pressed={filter===k} className={filter===k?'active-chip':''} onClick={()=>{setFilter(k);setOpen(null);}}>{l}</button>)}</div>
    {list.error&&<p className="error" role="alert">{list.error}</p>}
    {list.items.map(r=><article key={r.id} className={`rare-row ${r.destroyed?'destroyed':''}`}>
      <div className="market-row"><Icon name={r.name} src={r.spriteUrl} size={40} tier={r.destroyed?0:10}/>
        <div><h3>{r.name} +10 · {serial(r.serial)}</h3><p>{r.firstOfKind?'Primeiro do tipo · ':''}{r.destroyed?`Destruído${r.retiredReason?` (${r.retiredReason.toLowerCase()})`:''}`:'Em circulação'} · forjado por {r.creator?<button type="button" className="link-button" onClick={()=>openProfile(r.creator!)}>{r.creator}</button>:'um aventureiro anônimo'} em {when(r.createdAt)}</p></div>
        <button type="button" aria-expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}>{open===r.id?'Fechar':'Ver a história'}</button></div>
      {open===r.id&&<div className="rare-history">{detailError&&<p className="error" role="alert">{detailError}</p>}{!detail&&!detailError&&<p className="muted" role="status">Abrindo o registro…</p>}
        {detail&&<ol>{(detail.events??[]).map((e,i)=><li key={i}><small>{when(e.at)}</small> {e.detail}</li>)}</ol>}</div>}
    </article>)}
    {!list.items.length&&!list.loading&&!list.error&&<p className="empty">{q||filter?'Nenhum item raro com esse filtro.':'Ninguém levou um equipamento ao +10 ainda. O primeiro de cada tipo fica marcado para sempre.'}</p>}
    <Pager page={list.page} pages={list.pages} busy={list.loading} onPage={p=>{setOpen(null);void list.go(p);}}/>
  </section>;
}
