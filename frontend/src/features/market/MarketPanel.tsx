import {useState} from 'react';
import {api} from '../../lib/api';
import {fmt,msg} from '../../lib/format';
import type {Hero,Listing,GameConfig,Perform,Cmd,Blueprint} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Pager,type Page} from '../../ui/Pager';
import ItemTabs,{slotsOf} from '../../ui/ItemTabs';
import {describePotion} from '../../../../shared/potions';
// `slot` guarda a aba (tipo de item) de ui/ItemTabs. A página atual e os filtros ficam junto da lista, para o App recarregar o mesmo lugar depois de comprar/cancelar.
export type Filters={q:string;slot:string;usable:boolean;minTier:number};
export type MarketPage=Page<Listing>&{filters?:Filters};
export const noFilters:Filters={q:'',slot:'',usable:false,minTier:0};
export const marketQuery=(f:Filters|undefined,level:number)=>!f?'':`${f.q?`&q=${encodeURIComponent(f.q)}`:''}${f.slot?`&slot=${slotsOf(f.slot).join(',')}`:''}${f.usable?`&maxLevel=${level}`:''}${f.minTier?`&minTier=${f.minTier}`:''}`;
const statKeys:[keyof Blueprint,string][]=[['attack','ATK'],['magicAttack','Magia'],['defense','DEF'],['armor','ARM'],['criticalChance','Crítico'],['fireResistance','Fogo'],['speed','Esquiva']];
// Diferença dos atributos-base do item anunciado para o equipado no mesmo lugar (sem a melhoria +N, que vale para os dois).
function compare(hero:Hero,l:Listing){
  if(['LOOT','CONSUMABLE'].includes(l.blueprint.slot))return null;
  const eq=hero.equipment.find(e=>e.equippedSlot===l.blueprint.slot);
  if(!eq)return {label:'Nada equipado aqui',parts:[]};
  const parts=statKeys.map(([k,name])=>{const d=Number(l.blueprint[k]??0)-Number(eq.blueprint[k]??0);return d?{name,d}:null;}).filter(Boolean) as {name:string;d:number}[];
  return {label:`vs. ${eq.blueprint.name}${eq.upgradeTier?` +${eq.upgradeTier}`:''}`,parts};
}
export default function MarketPanel({hero,market,setMarket,config,busy,command}:{hero:Hero;market:MarketPage;setMarket:(l:MarketPage)=>void;config:GameConfig|null;busy:boolean;perform:Perform;command:Cmd}){
  const [f,setF]=useState<Filters>(market.filters??noFilters),[loading,setLoading]=useState(false),[error,setError]=useState('');
  // Trocar de página/filtro só lê: não passa por `perform`, que recarregaria a página anterior ao terminar.
  const load=async(page:number,filters=market.filters??noFilters)=>{setLoading(true);try{setMarket({...await api<Page<Listing>>(`/market?page=${page}${marketQuery(filters,hero.level)}`),filters});setError('');}catch(e){setError(msg(e));}finally{setLoading(false);}};
  const apply=(next:Filters)=>{setF(next);void load(1,next);};
  busy=busy||loading;
  const active=market.filters&&(market.filters.q||market.filters.slot||market.filters.usable||market.filters.minTier);
  return <section className="panel"><div className="section-title"><h2>Mercado de aventureiros</h2><button disabled={busy} onClick={()=>void load(market.page)}>Atualizar</button></div><p className="muted">Para vender, ofereça itens pela mochila; o preço vale pela pilha toda.{config?` Taxa de ${config.saleFeePercent}% sobre vendas; anúncios expiram em ${config.listingHours} h. O histórico fica em Extrato.`:''}</p>{error&&<p className="error" role="alert">{error}</p>}
    <ItemTabs value={f.slot} onChange={slot=>apply({...f,slot})}/>
    <form className="mission-search-row market-filters" onSubmit={e=>{e.preventDefault();apply({...f,q:f.q.trim()});}}>
      <input className="mission-search" aria-label="Buscar no mercado" placeholder="Buscar item pelo nome…" value={f.q} maxLength={40} onChange={e=>setF({...f,q:e.target.value})}/><button disabled={busy}>Buscar</button>
      <select aria-label="Melhoria mínima" value={f.minTier} onChange={e=>apply({...f,minTier:Number(e.target.value)})}><option value={0}>Qualquer melhoria</option>{[1,3,5,7,9,10].map(n=><option key={n} value={n}>+{n} ou mais</option>)}</select>
      <label className="shop-filter"><input type="checkbox" checked={f.usable} onChange={e=>apply({...f,usable:e.target.checked})}/> Só o que posso usar (nível {hero.level})</label>
      {active&&<button type="button" disabled={busy} onClick={()=>apply(noFilters)}>Limpar filtros</button>}</form>
    <p className="muted">{market.total.toLocaleString('pt-BR')} anúncio(s){active?' com esses filtros':''} · mais recentes primeiro</p>
    {!market.items.length&&<p className="empty">{active?'Nenhum anúncio com esses filtros.':'Ainda não há ofertas. Seu próximo achado pode ser o primeiro.'}</p>}
    {market.items.map(l=>{const c=compare(hero,l);return <div className="market-row" key={l.id}><Icon name={l.blueprint.name} src={l.blueprint.spriteUrl} size={40} tier={l.upgradeTier}/><div><h3>{l.blueprint.name} +{l.upgradeTier} <small>×{l.quantity}</small></h3><p>{l.seller.name} · Nv. {l.blueprint.minLevel}{describePotion(l.blueprint.name)?` · ${describePotion(l.blueprint.name)}`:''}{l.expiresAt?` · expira ${new Date(l.expiresAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:''}</p>
      {c&&<p className="compare">{c.label}{c.parts.length?': ':''}{c.parts.map(p=><span key={p.name} className={p.d>0?'up':'down'}>{p.d>0?'▲ +':'▼ '}{p.d} {p.name}</span>)}{c.label!=='Nada equipado aqui'&&!c.parts.length?' (mesmos atributos-base)':''}</p>}</div>
      <b>{fmt(l.price)} gp</b><button disabled={busy||(l.sellerId!==hero.id&&BigInt(hero.goldInHand)<BigInt(l.price))} onClick={()=>void command(`market/${l.id}/${l.sellerId===hero.id?'cancel':'buy'}`)}>{l.sellerId===hero.id?'Cancelar':'Comprar'}</button></div>;})}
    <Pager page={market.page} pages={market.pages} busy={busy} onPage={p=>void load(p)}/></section>;
}
