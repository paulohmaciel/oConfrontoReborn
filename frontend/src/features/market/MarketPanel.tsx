import {useState} from 'react';
import {api} from '../../lib/api';
import {fmt,msg} from '../../lib/format';
import type {Hero,Listing,GameConfig,Perform,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Pager,type Page} from '../../ui/Pager';
// A página atual e a busca ficam junto da lista, para o App recarregar o mesmo lugar depois de comprar/cancelar.
export type MarketPage=Page<Listing>&{q?:string};
export default function MarketPanel({hero,market,setMarket,config,busy,perform,command}:{hero:Hero;market:MarketPage;setMarket:(l:MarketPage)=>void;config:GameConfig|null;busy:boolean;perform:Perform;command:Cmd}){
  const [q,setQ]=useState(market.q??''),[loading,setLoading]=useState(false),[error,setError]=useState('');
  // Trocar de página/busca só lê: não passa por `perform`, que recarregaria a página anterior ao terminar.
  const load=async(page:number,term=market.q??'')=>{setLoading(true);try{setMarket({...await api<Page<Listing>>(`/market?page=${page}${term?`&q=${encodeURIComponent(term)}`:''}`),q:term});setError('');}catch(e){setError(msg(e));}finally{setLoading(false);}};
  busy=busy||loading;
  return <section className="panel"><div className="section-title"><h2>Mercado de aventureiros</h2><button disabled={busy} onClick={()=>void load(market.page)}>Atualizar</button></div><p className="muted">Anuncie pela mochila. O preço cobre toda a pilha.{config?` Taxa de ${config.saleFeePercent}% sobre vendas; anúncios expiram em ${config.listingHours} h. O histórico fica em Extrato.`:''}</p>{error&&<p className="error" role="alert">{error}</p>}
    <form className="mission-search-row" onSubmit={e=>{e.preventDefault();void load(1,q.trim());}}><input className="mission-search" aria-label="Buscar no mercado" placeholder="Buscar item pelo nome…" value={q} maxLength={40} onChange={e=>setQ(e.target.value)}/><button disabled={busy}>Buscar</button>{market.q&&<button type="button" disabled={busy} onClick={()=>{setQ('');void load(1,'');}}>Limpar</button>}</form>
    <p className="muted">{market.total.toLocaleString('pt-BR')} anúncio(s){market.q?` para "${market.q}"`:''} · mais recentes primeiro</p>
    {!market.items.length&&<p className="empty">{market.q?'Nenhum anúncio com esse nome.':'Ainda não há ofertas. Seu próximo achado pode ser o primeiro.'}</p>}
    {market.items.map(l=><div className="market-row" key={l.id}><Icon name={l.blueprint.name} src={l.blueprint.spriteUrl} size={40}/><div><h3>{l.blueprint.name} +{l.upgradeTier} <small>×{l.quantity}</small></h3><p>{l.seller.name}{l.expiresAt?` · expira ${new Date(l.expiresAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:''}</p></div><b>{fmt(l.price)} gp</b><button disabled={busy||(l.sellerId!==hero.id&&BigInt(hero.goldInHand)<BigInt(l.price))} onClick={()=>void command(`market/${l.id}/${l.sellerId===hero.id?'cancel':'buy'}`)}>{l.sellerId===hero.id?'Cancelar':'Comprar'}</button></div>)}
    <Pager page={market.page} pages={market.pages} busy={busy} onPage={p=>void load(p)}/></section>;
}
