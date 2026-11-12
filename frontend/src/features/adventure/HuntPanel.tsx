import {useEffect,useRef,useState} from 'react';
import Icon from '../../ui/GameIcon';
import TurnLog from './TurnLog';
import {Limited} from '../../ui/ShowMore';
import RegionIcon from '../../ui/RegionIcon';
import type {Hero,JourneyState,Monster,Battle} from '../../lib/types';
import {baseVocation,vocations,skillCosts,skillLabels,regions} from '../../../../shared/adventure';
const n=(v:number)=>v.toLocaleString('pt-BR');
function Life({label,hp,max,kind=''}:{label:string;hp:number;max:number;kind?:string}){return <div className="meter"><div><span>{label}</span><b>{n(hp)} / {n(max)}</b></div><progress className={kind} aria-label={label} max={Math.max(1,max)} value={hp}/></div>;}
// Habilidades da batalha em três grupos: ataque, suporte e fuga.
const skillGroups=[
  {key:'attack',label:'Ataque',icon:'Logout Block Icon',actions:['ATTACK','TRIPLE_HIT','FIFTH_HIT','INTERRUPT']},
  {key:'support',label:'Suporte',icon:'Guardian Shield',actions:['HEAL','DEFEND_SHIELD']},
  {key:'escape',label:'Fuga',icon:'Haste Icon',actions:['FLEE']},
] as const;
const skillIcon:Record<string,string>={HEAL:'Health Potion',DEFEND_SHIELD:'Mastermind Shield',FLEE:'Boots of Haste',INTERRUPT:'Fire Sword'};
export default function HuntPanel({hero,state,monsters,battle,busy,start,turn,dismiss,goTemple}:{hero:Hero;state:JourneyState|null;monsters:Monster[];battle:Battle|null;busy:boolean;goTemple:()=>void;start:(m:Monster)=>Promise<void>;turn:(a:string)=>Promise<void>;dismiss:()=>void}) {
  const [region,setRegion]=useState('outskirts'),[search,setSearch]=useState('');
  // Abre na região liberada mais alta (onde o herói caça hoje); na etapa do Guardião, na Pedreira. Depois que a pessoa escolhe, a escolha fica.
  const chose=useRef(false);
  useEffect(()=>{if(!state||chose.current)return;const open=(k:string)=>!!state.regions.find(r=>r.key===k)?.unlocked;
    if(state.step===4&&open('quarry')){setRegion('quarry');return;}
    const top=regions.filter(r=>open(r.key)).sort((a,b)=>b.minLevel-a.minLevel)[0];if(top)setRegion(top.key);},[state]);
  const profile=vocations[baseVocation(hero.vocation)],costs=skillCosts(hero.vocation),labels=skillLabels(hero.vocation);
  const rematch=battle?monsters.find(m=>m.name===battle.monsterName)??null:null;
  if(battle){const ongoing=battle.status==='ONGOING';return <section className="arena">
    <div className="arena-head"><span className="eyebrow">{ongoing?(battle.isBoss?'Duelo contra um chefe':''):'Fim da batalha'}</span><b>Turno {ongoing?battle.turnVersion+1:battle.turnVersion}{ongoing?' · Sua vez':''}</b></div>
    <div className="fighters"><div><Icon name={profile.icon} size={96}/><h3>{hero.name}</h3><Life label="Sua vida" hp={battle.hp} max={battle.maxHp}/><Life label="Sua mana" kind="mana" hp={battle.mana} max={Math.max(hero.maxMana,battle.mana)}/><p>{profile.name}</p></div>
      <div className="versus"><Icon name="Logout Block Icon" size={54}/><span>VS</span></div>
      <div><Icon name={battle.monsterName} src={battle.monsterSprite} size={96}/><h3>{battle.monsterName}</h3><Life label="Vida do monstro" hp={battle.monsterHp} max={battle.monsterMaxHp}/></div></div>
    {ongoing?<>{battle.isBoss&&<div className={`boss-intent ${battle.intent?.warning?'warning':''}`} role="status">{battle.intent?.label}</div>}
      <h2 className="arena-title">Habilidades</h2>
      <div className="skill-groups">{skillGroups.map(g=><div key={g.key} role="group" aria-label={g.label} className={`skill-group ${g.key}`}><div className="skill-head"><Icon name={g.icon} size={26}/><span>{g.label}</span></div>
        <div className="skill-grid">{g.actions.map(a=><button key={a} type="button" className="skill" disabled={busy||battle.mana<costs[a]} onClick={()=>void turn(a)} title={a==='INTERRUPT'?'Cancela um golpe pesado anunciado pelo chefe.':'Age neste turno.'}><Icon name={skillIcon[a]??profile.icon} size={34}/><b>{labels[a]}</b><small>{costs[a]?`${costs[a]} MP`:'Livre'}</small></button>)}</div></div>)}</div></>
    :<div className="battle-result"><h2>{{VICTORY:'Vitória!',DEFEAT:'Você tombou em batalha.',FLED:'Você bateu em retirada.'}[battle.status]??'A batalha terminou'}</h2>{battle.rewards&&battle.status==='VICTORY'&&<div className="battle-rewards"><p>{battle.rewards.xpGained!==undefined&&<>+{battle.rewards.xpGained} XP · </>}+{battle.rewards.gold} ouro</p>{battle.rewards.leveledUp&&<p className="success">Você subiu para o nível {battle.rewards.level}! Distribua seus pontos em Atributos.</p>}{battle.rewards.droppedItems.length>0&&<p>Encontrou: {battle.rewards.droppedItems.map(d=>`${d.quantity}× ${d.name??'item'}`).join(', ')}</p>}</div>}{battle.status==='DEFEAT'&&battle.defeat&&<div className="defeat-advice"><h3>Como a batalha foi perdida</h3><ul>{battle.defeat.reasons.map(r=><li key={r}>{r}</li>)}</ul><h3>Conselhos para a revanche</h3><ul>{battle.defeat.tips.map(t=><li key={t}>{t}</li>)}</ul></div>}<div className="inline-actions battle-result-actions">{battle.status==='DEFEAT'&&(hero.hp<=0?<button className="primary" onClick={goTemple}>Buscar cura no Templo de Capriel</button>:rematch&&<button className="primary" disabled={busy} onClick={()=>{const m=rematch;dismiss();void start(m);}}>Revanche contra {rematch.name}</button>)}<button className={battle.status==='DEFEAT'?'':'primary'} onClick={dismiss}>Partir para nova caçada</button></div></div>}
    <TurnLog turns={battle.turns??[]} log={battle.log} turnVersion={battle.turnVersion} heroName={hero.name} heroIcon={profile.icon} monsterName={battle.monsterName} monsterSprite={battle.monsterSprite} labels={labels}/></section>;}
  const selected=regions.find(r=>r.key===region)??regions[0];
  const available=state?.regions.find(r=>r.key===region)?.unlocked??region==='outskirts';
  // Mais de 10 regiões: as liberadas mais altas primeiro (onde o herói caça hoje), depois as próximas a liberar.
  const isOpen=(key:string)=>state?.regions.find(s=>s.key===key)?.unlocked??key==='outskirts';
  const ordered=[...regions].sort((a,b)=>Number(isOpen(b.key))-Number(isOpen(a.key))||(isOpen(a.key)?b.minLevel-a.minLevel:a.minLevel-b.minLevel));
  // Nível recomendado = faixa de nível das criaturas da região; o texto diz se está fácil, ideal ou perigoso para o herói.
  const range=(key:string)=>{const lv=monsters.filter(m=>m.regionKey===key).map(m=>m.level);return lv.length?{min:Math.min(...lv),max:Math.max(...lv)}:null;};
  const fit=(key:string)=>{const g=range(key);if(!g)return '';return hero.level<g.min?'Perigoso para você':hero.level>g.max+25?'Fácil para você':'Ideal para você';};
  const levels=(key:string)=>{const g=range(key);return g?(g.min===g.max?`Nv. ${g.min}`:`Nv. ${g.min}–${g.max}`):'';};
  const visible=monsters.filter(m=>m.regionKey===region&&m.name.toLowerCase().includes(search.toLowerCase()));
  return <><div className="region-grid" role="group" aria-label="Regiões de caça"><Limited items={ordered} label="Ver mais regiões" render={r=>{const unlocked=isOpen(r.key);return <button key={r.key} aria-pressed={region===r.key} onClick={()=>{chose.current=true;setRegion(r.key);setSearch('');}} className={region===r.key?'selected':''}><RegionIcon region={r.key} fallback={r.icon} size={40}/><strong>{r.name}</strong><small>{unlocked?`Recomendado ${levels(r.key)} · ${fit(r.key)}`:`Abre no nível ${r.minLevel} · etapa ${r.journeyStep} · criaturas ${levels(r.key)}`}</small></button>;}}/></div>
  <div className="intro-banner"><div><span className="eyebrow">{available?'ALÉM DOS PORTÕES':'TERRAS AINDA FECHADAS'}</span><h2>{selected.name}</h2><p>{selected.description}</p><p className="region-levels"><b>Nível recomendado: {levels(selected.key)||'—'}</b>{available&&fit(selected.key)?` · ${fit(selected.key)} (você está no nível ${hero.level})`:''}</p></div><RegionIcon region={selected.key} fallback={selected.icon} size={88}/></div>
  {!available&&<div className="notice region-notice">Para entrar, alcance o nível {selected.minLevel} e conclua {selected.journeyStep} etapas da jornada. Você pode conhecer as criaturas abaixo.</div>}
  <div className="toolbar"><h2>Criaturas <span>{visible.length}</span></h2><input aria-label="Buscar criatura" placeholder="Buscar criatura…" value={search} onChange={e=>setSearch(e.target.value)}/></div><p className="muted hunt-cost">Cada caçada consome 5 de energia. Os chefes anunciam o golpe pesado: fique atento.</p><div className="monster-grid"><Limited items={visible} label="Ver mais criaturas" render={m=><article className={`monster-card ${m.isBoss?'boss-card':''}`} key={m.id}><div className="card-top"><span className={m.isBoss||m.level>hero.level+5?'tag danger':'tag'}>{m.isBoss?'CHEFE':m.level>hero.level+5?'PERIGOSO':'CAÇA'}</span><span>Nv. {m.level}</span></div><div className="monster-art"><Icon name={m.name} src={m.spriteUrl} size={80}/></div><h3>{m.name}</h3><p className="monster-element">{m.element==='FIRE'?'Dano de fogo':'Dano físico'}{m.isBoss?' · Golpes anunciados':''}</p><div className="monster-facts"><span><b>{m.hp.toLocaleString('pt-BR')}</b>Vida</span><span><b>{m.experience.toLocaleString('pt-BR')}</b>XP</span><span><b>{m.goldMin}–{m.goldMax}</b>Ouro</span></div><button className="hunt-button" disabled={busy||hero.hp<=0||hero.energy<5||!available} onClick={()=>void start(m)}>{available?'Enfrentar':'Terras fechadas'}<span>5 de energia</span></button></article>}/></div>{!visible.length&&<p className="empty">Nenhuma criatura com esse nome ronda estas terras.</p>}</>;
}
