import {useState} from 'react';
import manifest from '../../public/assets/tibia/manifest.json';
const icons=new Map(manifest.entries.map(e=>[e.name,e.path]));
// `tier` (melhoria do item): +7 e +8 com brilho discreto, +9 forte, +10 em chamas (raro). "Menos movimento" deixa tudo parado.
export default function Icon({name,size=32,src,fire=false,tier=0}:{name:string;size?:number;src?:string;fire?:boolean;tier?:number}) {
  const [failed,setFailed]=useState(false);
  // "A|B" = tenta A (sprite novo) e cai para B se ainda não foi importado.
  const names=name.split('|');const label=names[0];
  const image=names.map(n=>icons.get(n)).find(Boolean)??src;
  if(!image||failed)return <span className="missing-icon" title={label}>?</span>;
  const burning=fire||tier>=10,glow=!burning&&tier>=9?'glow-strong':!burning&&tier>=7?'glow-soft':'';
  const img=<img className="sprite" src={image} width={size} height={size} alt={burning?`${label} (+10, em chamas)`:tier>=7?`${label} (+${tier}, brilhando)`:label} onError={()=>setFailed(true)}/>;
  if(burning)return <span className="fire-icon" title="Item raro +10">{img}</span>;
  return glow?<span className={`tier-glow ${glow}`} title={`Melhorado +${tier}`}>{img}</span>:img;
}
