import {fmt} from '../../lib/format';
import type {Tab} from '../../lib/tabs';
import type {Hero} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {vocationLabel} from '../../../../shared/adventure';
import {MAX_LEVEL,expForLevel} from '../../../../shared/progression';
function Meter({label,value,max,kind='hp'}:{label:string;value:number;max:number;kind?:string}){return <div className="meter"><div><span>{label}</span><b>{value} <small>/ {max}</small></b></div><progress className={kind} aria-label={label} max={Math.max(1,max)} value={value}/></div>;}
// Barra do nível atual: quanto da XP entre o início deste nível e o próximo já foi feita.
function XpMeter({hero}:{hero:Hero}){
  const max=hero.level>=MAX_LEVEL,start=expForLevel(hero.level),next=expForLevel(hero.level+1),xp=BigInt(hero.experience);
  const done=max?1:Math.min(1,Math.max(0,Number((xp-start)*10000n/(next-start))/10000));
  const left=max?0n:next-xp;
  return <div className="xp-meter"><div className="xp"><span>Nível {hero.level}{max?'':` → ${hero.level+1}`}</span><b>{max?'Nível máximo':`${(done*100).toFixed(1).replace('.',',')}%`}</b></div>
    <progress className="xp-bar" aria-label={max?'Nível máximo':`Experiência do nível ${hero.level}: ${(done*100).toFixed(1)}%`} max={1} value={done}/>
    <small className="xp-detail">{fmt(hero.experience)} XP{max?'':` · faltam ${fmt(left.toString())}`}</small></div>;
}
export default function Sidebar({hero,roster,busy,fighting,tabs,tab,onTab,onSelectCharacter}:{hero:Hero;roster:{id:number;name:string;level:number;vocation:string}[];busy:boolean;fighting:boolean;tabs:readonly (readonly [Tab,string,string])[];tab:Tab;onTab:(t:Tab)=>void;onSelectCharacter:(id:number)=>void}){
  return <aside className="sidebar"><div className="hero-summary"><div className="crest"><Icon name={hero.profileEmblem??'Mastermind Shield'} size={48}/></div><div><span className="eyebrow">SEU PERSONAGEM</span><h2>{hero.name}</h2>{hero.profileTitle&&<small className="hero-title">{({adventurer:'Aventureiro',hunter:'Caçador',blacksmith:'Amigo do Ferreiro',explorer:'Explorador',guardian:'Guardião de Capriel',dragonbane:'Terror dos Dragões'} as Record<string,string>)[hero.profileTitle]??''}</small>}<p>{vocationLabel(hero.vocation)} · Nível {hero.level}</p></div></div>{roster.length>1&&<select className="char-switch" aria-label="Trocar de personagem" value={hero.id} disabled={busy||fighting} onChange={e=>onSelectCharacter(Number(e.target.value))}>{roster.map(c=><option key={c.id} value={c.id}>{c.name} · Nv. {c.level}</option>)}</select>}<div className="resources"><Meter label="Vida" value={hero.hp} max={hero.maxHp}/><Meter label="Mana" value={hero.mana} max={hero.maxMana} kind="mana"/><Meter label="Energia" value={hero.energy} max={hero.maxEnergy} kind="energy"/><XpMeter hero={hero}/></div>
 <nav aria-label="Locais do jogo">{tabs.map(([id,label,icon])=><button key={id} className={tab===id?'nav-item active':'nav-item'} onClick={()=>onTab(id)}><Icon name={icon} size={24}/><span>{label}</span>{id==='stats'&&hero.statPoints>0&&<b className="badge">{hero.statPoints}</b>}{id==='hunt'&&fighting&&<i className="battle-dot"/>}</button>)}</nav><div className="sidebar-foot">O CONFRONTO / v0.5.0<br/><a href="https://www.tibiawiki.com.br/" target="_blank" rel="noreferrer">Sprites via TibiaWiki</a><span>Imagens © CipSoft GmbH</span><a href="/legal/termos.html" target="_blank" rel="noreferrer">Termos</a><a href="/legal/privacidade.html" target="_blank" rel="noreferrer">Privacidade</a><a href="/legal/reembolso.html" target="_blank" rel="noreferrer">Reembolso</a></div></aside>;
}
