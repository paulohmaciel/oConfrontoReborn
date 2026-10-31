import {useState} from 'react';
import manifest from '../../public/assets/tibia/manifest.json';
const icons=new Map(manifest.entries.map(e=>[e.name,e.path]));
export default function Icon({name,size=32,src,fire=false}:{name:string;size?:number;src?:string;fire?:boolean}) {
  const [failed,setFailed]=useState(false);
  // "A|B" = tenta A (sprite novo) e cai para B se ainda não foi importado.
  const names=name.split('|');const label=names[0];
  const image=names.map(n=>icons.get(n)).find(Boolean)??src;
  if(!image||failed)return <span className="missing-icon" title={label}>?</span>;
  const img=<img className="sprite" src={image} width={size} height={size} alt={fire?`${label} (+10, em chamas)`:label} onError={()=>setFailed(true)}/>;
  return fire?<span className="fire-icon" title="Item raro +10">{img}</span>:img;
}
