import {fmt} from '../../lib/format';
import type {Hero,Blueprint,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
export default function ShopPanel({hero,shop,busy,command}:{hero:Hero;shop:Blueprint[];busy:boolean;command:Cmd}){
  return <section className="panel"><div className="section-title"><h2>Suprimentos e equipamentos</h2><span>Preço por unidade</span></div><div className="shop-list">{shop.map(i=><article key={i.id}><Icon name={i.name} size={40}/><div><h3>{i.name}</h3><p>Nv. {i.minLevel} · {i.slot.toLowerCase()}</p></div><button disabled={busy||BigInt(hero.goldInHand)<BigInt(i.price??i.npcPrice)} onClick={()=>void command('shop',{blueprintId:i.id,quantity:1})}>{fmt(i.price??i.npcPrice)} <Icon name="Gold Coin" size={20}/></button></article>)}</div></section>;
}
