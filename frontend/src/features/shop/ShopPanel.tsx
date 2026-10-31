import {useState} from 'react';
import {fmt} from '../../lib/format';
import type {Hero,Blueprint,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import {vocationAllowed} from '../../../../shared/adventure';
export default function ShopPanel({hero,shop,busy,command}:{hero:Hero;shop:Blueprint[];busy:boolean;command:Cmd}){
  const [usable,setUsable]=useState(true),[q,setQ]=useState('');
  // Com o catálogo até o nível 1000, a lista completa é longa: por padrão mostra só o que o personagem já pode usar.
  const term=q.trim().toLowerCase();
  // Mais úteis primeiro: equipamentos do seu nível no topo (as poções e o básico ficam no fim).
  const list=(usable?shop.filter(i=>i.minLevel<=hero.level&&vocationAllowed(i.vocations??'ALL',hero.vocation)):shop).filter(i=>!term||i.name.toLowerCase().includes(term)).sort((a,b)=>b.minLevel-a.minLevel||a.npcPrice-b.npcPrice);
  return <section className="panel"><div className="section-title"><h2>Suprimentos e equipamentos</h2><span>Preço por unidade</span></div>
    <label className="shop-filter"><input type="checkbox" checked={usable} onChange={e=>setUsable(e.target.checked)}/> Só o que posso usar ({list.length} de {shop.length})</label>
    <input className="mission-search" aria-label="Buscar no Mercador" placeholder="Buscar item pelo nome…" value={q} maxLength={40} onChange={e=>setQ(e.target.value)}/>
    <div className="shop-list"><Limited items={list} label="Ver mais itens" render={i=><article key={i.id}><Icon name={i.name} src={i.spriteUrl} size={40}/><div><h3>{i.name}</h3><p>Nv. {i.minLevel} · {i.slot.toLowerCase()}</p></div><button disabled={busy||BigInt(hero.goldInHand)<BigInt(i.price??i.npcPrice)} onClick={()=>void command('shop',{blueprintId:i.id,quantity:1})}>{fmt(i.price??i.npcPrice)} <Icon name="Gold Coin" size={20}/></button></article>}/></div></section>;
}
