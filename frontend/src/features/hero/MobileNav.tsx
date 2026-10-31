import {useEffect,useRef} from 'react';
import {mobileMain,shortLabels,drawerGroups,type Tab} from '../../lib/tabs';
import type {Hero} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import ThemeToggle from '../../ui/ThemeToggle';
import {classLabel} from '../../../../shared/adventure';
type TabRow=readonly [Tab,string,string];
type Roster={id:number;name:string;level:number;vocation:string}[];
// Menu inferior do celular: os 5 lugares mais usados, sempre à mão.
export function MobileBar({tabs,tab,fighting,onTab}:{tabs:readonly TabRow[];tab:Tab;fighting:boolean;onTab:(t:Tab)=>void}){
  const byId=new Map(tabs.map(t=>[t[0],t]));
  return <nav className="mobile-bar" aria-label="Atalhos">{mobileMain.map(id=>{const t=byId.get(id);if(!t)return null;
    return <button key={id} className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>onTab(id)}><Icon name={t[2]} size={24}/><span>{shortLabels[id]??t[1]}</span>{id==='hunt'&&fighting&&<i className="battle-dot" aria-label="Combate em andamento"/>}</button>;})}</nav>;
}
// Menu sanduíche: personagem, demais abas em grupos, tema e saída.
export function MobileDrawer({open,onClose,hero,roster,busy,fighting,tabs,tab,onTab,onSelectCharacter,onLogout}:{open:boolean;onClose:()=>void;hero:Hero;roster:Roster;busy:boolean;fighting:boolean;tabs:readonly TabRow[];tab:Tab;onTab:(t:Tab)=>void;onSelectCharacter:(id:number)=>void;onLogout:()=>void}){
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!open)return;
    const opener=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    closeRef.current?.focus();document.body.style.overflow='hidden';
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=overflow;opener?.focus();};},[open]);
  if(!open)return null;
  const byId=new Map(tabs.map(t=>[t[0],t])),go=(id:Tab)=>{onTab(id);onClose();};
  return <div className="mobile-drawer-layer"><div className="mobile-backdrop" onClick={onClose}/>
    <div className="mobile-drawer" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu do jogo">
      <div className="drawer-head"><div className="crest"><Icon name={hero.profileEmblem??'Mastermind Shield'} size={40}/></div><div><h2>{hero.name}</h2><p>{classLabel(hero.vocation,hero.classTier)} · Nível {hero.level}</p></div>
        <button ref={closeRef} type="button" className="quiet drawer-close" aria-label="Fechar menu" onClick={onClose}>✕</button></div>
      {roster.length>1&&<select className="char-switch" aria-label="Trocar de personagem" value={hero.id} disabled={busy||fighting} onChange={e=>{onSelectCharacter(Number(e.target.value));onClose();}}>{roster.map(c=><option key={c.id} value={c.id}>{c.name} · Nv. {c.level}</option>)}</select>}
      {drawerGroups.map(([title,ids])=>{const rows=ids.map(id=>byId.get(id)).filter((r):r is TabRow=>!!r);if(!rows.length)return null;
        return <section key={title} aria-label={title}><span className="eyebrow">{title.toUpperCase()}</span>{rows.map(([id,label,icon])=><button key={id} type="button" className={tab===id?'nav-item active':'nav-item'} aria-current={tab===id?'page':undefined} onClick={()=>go(id)}><Icon name={icon} size={24}/><span>{label}</span>{id==='stats'&&hero.statPoints>0&&<b className="badge">{hero.statPoints}</b>}</button>)}</section>;})}
      <div className="drawer-foot"><ThemeToggle/><button type="button" className="quiet" onClick={()=>{onClose();onLogout();}}>Sair</button></div>
      <p className="drawer-legal"><a href="https://www.tibiawiki.com.br/" target="_blank" rel="noreferrer">Sprites via TibiaWiki</a><span>Imagens © CipSoft GmbH</span><a href="/legal/termos.html" target="_blank" rel="noreferrer">Termos</a><a href="/legal/privacidade.html" target="_blank" rel="noreferrer">Privacidade</a><a href="/legal/reembolso.html" target="_blank" rel="noreferrer">Reembolso</a></p>
    </div></div>;
}
