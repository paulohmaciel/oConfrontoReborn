import {reasonLabel} from './reasonLabel';
import {fmt,when} from '../../lib/format';
import Icon from '../../ui/GameIcon';
import {Pager,usePaged} from '../../ui/Pager';
type LedgerEntry={id:number;delta:string;balanceAfter:string;reason:string;kind:string;createdAt:string};
type History={id:number;item:{name:string;spriteUrl:string};quantity:number;upgradeTier:number;price:string;fee:string;status:string;role:'SELLER'|'BUYER';soldAt:string|null;createdAt:string};
const statusLabel:Record<string,string>={SOLD:'Vendido',CANCELLED:'Cancelado',EXPIRED:'Expirado'};
export default function LedgerPanel({characterId}:{characterId:number}) {
  const entries=usePaged<LedgerEntry>(`/characters/${characterId}/ledger`),history=usePaged<History>(`/characters/${characterId}/market/history`);
  return <>
    <section className="panel"><div className="section-title"><h2>Extrato de ouro</h2><Icon name="Gold Coin" size={28}/></div><p className="muted">Cada entrada e saída de ouro do seu personagem, da mais recente para a mais antiga.</p>{entries.error&&<p className="error" role="alert">{entries.error}</p>}
      {entries.items.map(e=><div className="ledger-row" key={e.id}><span>{when(e.createdAt)}</span><span>{reasonLabel[e.reason]??e.reason}</span><b className={BigInt(e.delta)<0n?'neg':'pos'}>{BigInt(e.delta)>0n?'+':''}{fmt(e.delta)}</b><small>saldo {fmt(e.balanceAfter)}</small></div>)}
      {!entries.items.length&&!entries.error&&!entries.loading&&<p className="empty">Nenhuma movimentação ainda.</p>}
      <Pager page={entries.page} pages={entries.pages} busy={entries.loading} onPage={p=>void entries.go(p)}/></section>
    <section className="panel"><div className="section-title"><h2>Histórico do mercado</h2><span>{history.total}</span></div>
      {history.items.map(h=><div className="ledger-row" key={h.id}><span>{h.soldAt?when(h.soldAt):when(h.createdAt)}</span><span><Icon name={h.item.name} src={h.item.spriteUrl} size={22}/> {h.item.name} +{h.upgradeTier} ×{h.quantity}</span><b>{h.status==='SOLD'?`${h.role==='SELLER'?'Vendeu':'Comprou'} por ${fmt(h.price)}`:statusLabel[h.status]??h.status}</b>{h.status==='SOLD'&&h.role==='SELLER'&&<small>taxa {fmt(h.fee)}</small>}</div>)}
      {!history.items.length&&!history.loading&&<p className="empty">Você ainda não concluiu negociações.</p>}
      <Pager page={history.page} pages={history.pages} busy={history.loading} onPage={p=>void history.go(p)}/></section></>;
}
