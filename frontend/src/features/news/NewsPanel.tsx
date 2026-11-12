import {useEffect} from 'react';
import {Limited} from '../../ui/ShowMore';
import {changelog} from '../../../../shared/changelog';
import {markNewsSeen} from './NoticeBanner';
const day=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

// Histórico de atualizações do jogo (shared/changelog.ts), da mais recente para a mais antiga.
export default function NewsPanel(){
  useEffect(()=>{markNewsSeen();},[]);
  return <section className="panel"><div className="section-title"><h2>Histórico de atualizações</h2><span>{changelog.length}</span></div>
    <p className="muted">O que mudou no jogo, da atualização mais recente para a mais antiga. Avisos de manutenção aparecem no topo da tela.</p>
    <div className="changelog"><Limited items={changelog} label="Ver atualizações anteriores" render={e=><article key={e.id} className="changelog-entry">
      <span className="eyebrow">{day(e.date)}</span><h3>{e.title}</h3><ul>{e.items.map((t,i)=><li key={i}>{t}</li>)}</ul></article>}/></div></section>;
}
