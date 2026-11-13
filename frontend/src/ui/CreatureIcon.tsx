import {useState} from 'react';
import Icon from './GameIcon';
import {creatureFile,portraitUrl} from '../lib/creatureArt';

// Ícone de criatura fora da arena (lista de Caçar, Bestiário, missões, registro da batalha, Caçada em grupo): quem tem arte
// própria mostra o retrato tirado da folha da arena; quem não tem, o sprite do TibiaWiki pelo GameIcon. Se o retrato não
// carregar, volta para o sprite antigo em vez de sumir.
export default function CreatureIcon({name,src,size=32}:{name:string;src?:string;size?:number}){
  const [failed,setFailed]=useState('');
  const own=portraitUrl(creatureFile(name,src));
  if(!own||own===failed)return <Icon name={name} src={src} size={size}/>;
  return <img className="sprite creature-art" src={own} width={size} height={size} alt={name} loading="lazy" decoding="async" onError={()=>setFailed(own)}/>;
}
