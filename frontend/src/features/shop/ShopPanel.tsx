import {useState} from 'react';
import {fmt} from '../../lib/format';
import type {Hero,Blueprint,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import ItemTabs,{inCategory,itemCategories} from '../../ui/ItemTabs';
import {vocationAllowed} from '../../../../shared/adventure';
import {describePotion,bestPotionFor} from '../../../../shared/potions';
export default function ShopPanel({hero,shop,busy,command}:{hero:Hero;shop:Blueprint[];busy:boolean;command:Cmd}){
  // Começa nas poções: é o que se compra toda hora.
  const [usable,setUsable]=useState(true),[q,setQ]=useState(''),[tab,setTab]=useState<string>('potions');
  // Com o catálogo até o nível 1000, a lista completa é longa: por padrão mostra só o que o personagem já pode usar.
  const term=q.trim().toLowerCase();
  const base=(usable?shop.filter(i=>i.minLevel<=hero.level&&vocationAllowed(i.vocations??'ALL',hero.vocation)):shop).filter(i=>!term||i.name.toLowerCase().includes(term));
  const counts=Object.fromEntries(itemCategories.map(c=>[c.key,base.filter(i=>inCategory(i.slot,c.key)).length]));
  // Mais úteis primeiro: equipamentos do seu nível no topo (as poções e o básico ficam no fim).
  const list=base.filter(i=>inCategory(i.slot,tab)).sort((a,b)=>b.minLevel-a.minLevel||a.npcPrice-b.npcPrice);
  const best=[bestPotionFor(hero.level,'hp'),bestPotionFor(hero.level,'mana')];
  return <section className="panel"><div className="section-title"><h2>Suprimentos e equipamentos</h2><span>Preço por unidade</span></div>
    <ItemTabs value={tab} onChange={setTab} counts={counts}/>
    <label className="shop-filter"><input type="checkbox" checked={usable} onChange={e=>setUsable(e.target.checked)}/> Só o que posso usar ({base.length} de {shop.length})</label>
    <input className="mission-search" aria-label="Buscar no Mercador" placeholder="Buscar item pelo nome…" value={q} maxLength={40} onChange={e=>setQ(e.target.value)}/>
    {tab==='potions'&&<p className="muted">Para o seu nível, as melhores são {best[0]} e {best[1]}. Poções mais fortes pedem nível mínimo e curam um valor fixo mais uma parte da sua vida/mana máxima.</p>}
    {!list.length&&<p className="empty">Nada nesta aba{usable?' para o seu nível':''}{term?' com esse nome':''}.</p>}
    <div className="shop-list"><Limited items={list} label="Ver mais itens" render={i=>{const effect=describePotion(i.name);return <article key={i.id} className={best.includes(i.name)?'recommended':''}><Icon name={i.name} src={i.spriteUrl} size={40}/><div><h3>{i.name}{best.includes(i.name)&&<span className="tag">MELHOR PARA VOCÊ</span>}</h3><p>Nv. {i.minLevel} · {effect??i.slot.toLowerCase()}</p></div><button disabled={busy||BigInt(hero.goldInHand)<BigInt(i.price??i.npcPrice)} onClick={()=>void command('shop',{blueprintId:i.id,quantity:1})}>{fmt(i.price??i.npcPrice)} <Icon name="Gold Coin" size={20}/></button></article>;}}/></div></section>;
}
