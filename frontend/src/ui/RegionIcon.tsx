import {useState} from 'react';
import Icon from './GameIcon';
// Ícone próprio de cada local de caça (arte do projeto em /assets/regions, gerada por scripts/region-icons.mjs).
// Se a imagem não carregar, cai para o sprite do TibiaWiki que a região já usava.
export default function RegionIcon({region,fallback,size=32}:{region:string;fallback:string;size?:number}){
  const [failed,setFailed]=useState(false);
  if(failed)return <Icon name={fallback} size={size}/>;
  return <img className="region-icon" src={`/assets/regions/${region}.svg`} width={size} height={size} alt="" onError={()=>setFailed(true)}/>;
}
