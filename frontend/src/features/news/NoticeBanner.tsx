import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import Icon from '../../ui/GameIcon';
import {changelog} from '../../../../shared/changelog';
type Notice={id:number;kind:string;message:string;endsAt:string|null};
type Feat={id:number;name:string;spriteUrl:string;serial:number;creator:string|null;firstOfKind:boolean};
const SEEN='oconfronto.novidades.vista',HIDDEN='oconfronto.avisos.ocultos',FEATS='oconfronto.feitos.ocultos';
const read=(k:string)=>{try{return localStorage.getItem(k)??'';}catch{return '';}};
const write=(k:string,v:string)=>{try{localStorage.setItem(k,v);}catch{/* sem armazenamento: só não lembra */}};
export const markNewsSeen=()=>write(SEEN,changelog[0]?.id??'');

// Avisos da equipe (manutenção, eventos) no topo de todas as telas, inclusive a de entrada.
// Com `onOpenNews`, também lembra quem ainda não viu a última atualização.
// Com `onOpenRares` (jogador dentro do jogo), anuncia também quem levou um equipamento ao +10 nas últimas 48 horas.
export default function NoticeBanner({onOpenNews,onOpenRares}:{onOpenNews?:()=>void;onOpenRares?:()=>void}){
  const [feats,setFeats]=useState<Feat[]>([]),[featsHidden,setFeatsHidden]=useState(()=>read(FEATS).split(',').filter(Boolean));
  useEffect(()=>{if(!onOpenRares)return;const load=()=>api<Feat[]>('/rare-items/latest').then(setFeats).catch(()=>{});void load();const t=setInterval(load,5*60_000);return()=>clearInterval(t);},[!!onOpenRares]);
  const hideFeat=(id:number)=>{const next=[...featsHidden,String(id)].slice(-30);setFeatsHidden(next);write(FEATS,next.join(','));};
  const feat=onOpenRares?feats.find(f=>!featsHidden.includes(String(f.id))):undefined;
  const [notices,setNotices]=useState<Notice[]>([]),[hidden,setHidden]=useState(()=>read(HIDDEN).split(',').filter(Boolean)),[seen,setSeen]=useState(()=>read(SEEN));
  useEffect(()=>{const load=()=>api<Notice[]>('/notices').then(setNotices).catch(()=>{});void load();const t=setInterval(load,5*60_000);return()=>clearInterval(t);},[]);
  const hide=(id:number)=>{const next=[...hidden,String(id)].slice(-20);setHidden(next);write(HIDDEN,next.join(','));};
  const latest=changelog[0],showNews=!!onOpenNews&&!!latest&&seen!==latest.id;
  const visible=notices.filter(n=>n.kind==='MAINTENANCE'||!hidden.includes(String(n.id)));
  if(!visible.length&&!showNews&&!feat)return null;
  return <div className="notice-stack">
    {visible.map(n=><div key={n.id} className={`game-notice ${n.kind==='MAINTENANCE'?'maintenance':''}`} role={n.kind==='MAINTENANCE'?'alert':'status'}>
      <Icon name={n.kind==='MAINTENANCE'?'Torch':'Candelabrum'} size={24}/><p><b>{n.kind==='MAINTENANCE'?'Manutenção: ':'Aviso: '}</b>{n.message}{n.endsAt?` (até ${new Date(n.endsAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})})`:''}</p>
      {n.kind!=='MAINTENANCE'&&<button className="link-button" aria-label="Fechar aviso" onClick={()=>hide(n.id)}>Fechar</button>}</div>)}
    {feat&&<div className="game-notice feat" role="status"><Icon name={feat.name} src={feat.spriteUrl} size={24} tier={10}/><p><b>Feito em Capriel: </b>{feat.creator??'um aventureiro anônimo'} levou {feat.name} ao +10{feat.firstOfKind?', o primeiro do tipo':''} (Nº {String(feat.serial).padStart(6,'0')}).</p>
      <button className="link-button" onClick={()=>{hideFeat(feat.id);onOpenRares!();}}>Ver itens raros</button>
      <button className="link-button" aria-label="Fechar anúncio" onClick={()=>hideFeat(feat.id)}>Fechar</button></div>}
    {showNews&&<div className="game-notice news" role="status"><Icon name="Candelabrum" size={24}/><p><b>Novidade: </b>{latest.title}.</p>
      <button className="link-button" onClick={()=>{markNewsSeen();setSeen(latest.id);onOpenNews!();}}>Ver novidades</button>
      <button className="link-button" aria-label="Dispensar" onClick={()=>{markNewsSeen();setSeen(latest.id);}}>Dispensar</button></div>}
  </div>;
}
