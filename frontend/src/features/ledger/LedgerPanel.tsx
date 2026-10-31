import {useEffect,useState} from 'react';
import {reasonLabel} from './reasonLabel';
import {api} from '../../lib/api';
import {fmt,when,msg} from '../../lib/format';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
type LedgerEntry={id:number;delta:string;balanceAfter:string;reason:string;kind:string;createdAt:string};
type History={id:number;item:{name:string;spriteUrl:string};quantity:number;upgradeTier:number;price:string;fee:string;status:string;role:'SELLER'|'BUYER';soldAt:string|null;createdAt:string};
const statusLabel:Record<string,string>={SOLD:'Vendido',CANCELLED:'Cancelado',EXPIRED:'Expirado'};
export default function LedgerPanel({characterId}:{characterId:number}) {
  const [entries,setEntries]=useState<LedgerEntry[]>([]),[next,setNext]=useState<number|null>(null),[history,setHistory]=useState<History[]>([]),[error,setError]=useState('');
  useEffect(()=>{setError('');api<{entries:LedgerEntry[];nextBefore:number|null}>(`/characters/${characterId}/ledger`).then(r=>{setEntries(r.entries);setNext(r.nextBefore);}).catch(e=>setError(msg(e)));
    api<History[]>(`/characters/${characterId}/market/history`).then(setHistory).catch(()=>{});},[characterId]);
  async function more(){if(next===null)return;try{const r=await api<{entries:LedgerEntry[];nextBefore:number|null}>(`/characters/${characterId}/ledger?before=${next}`);setEntries([...entries,...r.entries]);setNext(r.nextBefore);}catch(e){setError(msg(e));}}
  return <>
    <section className="panel"><div className="section-title"><h2>Extrato de ouro</h2><Icon name="Gold Coin" size={28}/></div><p className="muted">Cada entrada e saída de ouro do seu personagem, em ordem.</p>{error&&<p className="error" role="alert">{error}</p>}
      <Limited items={entries} label="Ver mais" render={e=><div className="ledger-row" key={e.id}><span>{when(e.createdAt)}</span><span>{reasonLabel[e.reason]??e.reason}</span><b className={BigInt(e.delta)<0n?'neg':'pos'}>{BigInt(e.delta)>0n?'+':''}{fmt(e.delta)}</b><small>saldo {fmt(e.balanceAfter)}</small></div>}/>
      {!entries.length&&!error&&<p className="empty">Nenhuma movimentação ainda.</p>}{next!==null&&<button onClick={()=>void more()}>Ver mais</button>}</section>
    <section className="panel"><div className="section-title"><h2>Histórico do mercado</h2><span>{history.length}</span></div>
      <Limited items={history} label="Ver mais" render={h=><div className="ledger-row" key={h.id}><span>{h.soldAt?when(h.soldAt):when(h.createdAt)}</span><span><Icon name={h.item.name} src={h.item.spriteUrl} size={22}/> {h.item.name} +{h.upgradeTier} ×{h.quantity}</span><b>{h.status==='SOLD'?`${h.role==='SELLER'?'Vendeu':'Comprou'} por ${fmt(h.price)}`:statusLabel[h.status]??h.status}</b>{h.status==='SOLD'&&h.role==='SELLER'&&<small>taxa {fmt(h.fee)}</small>}</div>}/>
      {!history.length&&<p className="empty">Você ainda não concluiu negociações.</p>}</section></>;
}

// ===== Suporte e denúncias =====
