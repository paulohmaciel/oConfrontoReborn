import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import manifest from '../../public/assets/tibia/manifest.json';
import {itemArt} from '../lib/itemArt';
import {motionStill,watchMotion} from '../lib/theme';
const icons=new Map(manifest.entries.map(e=>[e.name,e.path]));
// Lado, em pixels, do GIF próprio de um item (public/assets/items): o canvas do ícone parado guarda esse tamanho.
const OWN_ART_SIDE=128;

// O primeiro quadro de um GIF, que é o ícone parado do item: um <img> não deixa parar a animação, um canvas não anima.
function StillFrame({src,size,alt,onError}:{src:string;size:number;alt:string;onError:()=>void}){
  const ref=useRef<HTMLCanvasElement>(null),failed=useRef(onError);failed.current=onError;
  useEffect(()=>{
    let alive=true;const img=new Image();
    img.onload=()=>{const canvas=ref.current,ctx=canvas?.getContext('2d');if(!alive||!canvas||!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);};
    img.onerror=()=>{if(alive)failed.current();};
    img.src=src;
    return()=>{alive=false;};
  },[src]);
  return <canvas ref={ref} className="sprite own-art" width={OWN_ART_SIDE} height={OWN_ART_SIDE} style={{width:size,height:size}} role="img" aria-label={alt}/>;
}

// Um item com arte própria (GIF animado em public/assets/items, lib/itemArt.ts) usa a sua; os outros, o sprite do TibiaWiki.
// `tier` (melhoria do item): +7 e +8 com brilho discreto, +9 forte, +10 em chamas (raro). "Menos movimento" deixa tudo parado,
// inclusive o GIF, que fica no primeiro quadro.
export default function Icon({name,size=32,src,fire=false,tier=0}:{name:string;size?:number;src?:string;fire?:boolean;tier?:number}) {
  // Guarda QUAL imagem falhou (e não só "falhou"): a mesma linha pode receber outro item depois.
  const [failed,setFailed]=useState(''),[ownFailed,setOwnFailed]=useState('');
  const still=useSyncExternalStore(watchMotion,motionStill);
  // "A|B" = tenta A (sprite novo) e cai para B se ainda não foi importado.
  const names=name.split('|');const label=names[0];
  const drawn=names.map(n=>itemArt(n)).find(Boolean)??null,own=drawn&&drawn!==ownFailed?drawn:null;
  const image=own??names.map(n=>icons.get(n)).find(Boolean)??src;
  if(!image||image===failed)return <span className="missing-icon" title={label}>?</span>;
  const burning=fire||tier>=10,glow=!burning&&tier>=9?'glow-strong':!burning&&tier>=7?'glow-soft':'';
  const alt=burning?`${label} (+10, em chamas)`:tier>=7?`${label} (+${tier}, brilhando)`:label;
  // Se o GIF próprio não carregar (figura ainda fora do servidor), o ícone volta para o sprite antigo em vez de sumir.
  const img=own&&still?<StillFrame src={own} size={size} alt={alt} onError={()=>setOwnFailed(own)}/>
    :<img className={own?'sprite own-art':'sprite'} src={image} width={size} height={size} alt={alt} loading={own?'lazy':undefined} decoding="async" onError={()=>own?setOwnFailed(own):setFailed(image)}/>;
  if(burning)return <span className="fire-icon" title="Item raro +10">{img}</span>;
  return glow?<span className={`tier-glow ${glow}`} title={`Melhorado +${tier}`}>{img}</span>:img;
}
