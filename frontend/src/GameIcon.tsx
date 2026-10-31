import {useState} from 'react';
import manifest from '../public/assets/tibia/manifest.json';
const icons=new Map(manifest.entries.map(e=>[e.name,e.path]));
export default function Icon({name,size=32,src}:{name:string;size?:number;src?:string}) {
  const [failed,setFailed]=useState(false);
  const image=icons.get(name)??src;
  return !image||failed?<span className="missing-icon" title={name}>?</span>:<img className="sprite" src={image} width={size} height={size} alt={name} onError={()=>setFailed(true)}/>;
}
