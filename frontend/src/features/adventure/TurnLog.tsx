import {useState} from 'react';
import Icon from '../../ui/GameIcon';
import {LimitedRows} from '../../ui/ShowMore';
import type {TurnRecord} from '../../lib/types';
const n=(v:number)=>v.toLocaleString('pt-BR');
const pct=(v:number,max:number)=>`${Math.max(0,Math.min(100,Math.round(v/Math.max(1,max)*100)))}%`;
const actionIcon:Record<string,string>={HEAL:'Health Potion',DEFEND_SHIELD:'Mastermind Shield',FLEE:'Boots of Haste',INTERRUPT:'Fire Sword'};

// O que você fez no turno, em uma linha curta (também usada no histórico completo).
function mine(t:TurnRecord,labels:Record<string,string>){
  if(t.action==='FLEE')return 'Fugiu';
  if(t.action==='HEAL')return `${labels.HEAL}: +${n(t.healed)} de vida`;
  return `${labels[t.action]??t.action}: ${n(t.dealt)} de dano${t.crit?' (crítico!)':''}`;
}
function theirs(t:TurnRecord){
  if(t.foe==='NONE')return '—';
  if(t.foe==='CHARGE')return 'Concentrou forças';
  if(t.foe==='INTERRUPTED')return 'Golpe pesado interrompido';
  if(t.dodged)return 'Você esquivou';
  return `${t.foe==='HEAVY'?'Golpe pesado':'Ataque'}: ${n(t.received)} de dano`;
}

// Último turno como dois cartões lado a lado (seu ataque × ataque do monstro) e, sob demanda, o combate inteiro.
export default function TurnLog({turns,log,turnVersion,heroName,heroIcon,monsterName,monsterSprite,labels}:{turns:TurnRecord[];log:string[];turnVersion:number;heroName:string;heroIcon:string;monsterName:string;monsterSprite:string;labels:Record<string,string>}){
  const [all,setAll]=useState(false);
  const last=turns.at(-1);
  if(!last)return log.length?<div className="battle-log" role="log" aria-live="polite">{log.map((l,i)=><p key={`${turnVersion}-${i}`}>{l}</p>)}</div>:null;
  const total=turns.reduce((s,t)=>({dealt:s.dealt+t.dealt,received:s.received+t.received,healed:s.healed+t.healed,crits:s.crits+(t.crit?1:0),dodges:s.dodges+(t.dodged?1:0)}),{dealt:0,received:0,healed:0,crits:0,dodges:0});
  return <div className="turn-log" aria-live="polite">
    <div className="turn-head"><span className="eyebrow">Turno {last.turn}</span></div>
    <div className="turn-cards">
      <article className={`turn-card hero-side ${last.crit?'crit':''}`}>
        <header><Icon name={actionIcon[last.action]??heroIcon} size={32}/><div><small>Seu turno · {heroName}</small><b>{labels[last.action]??last.action}</b></div></header>
        <p className="turn-number">{last.action==='HEAL'?<span className="heal">+{n(last.healed)}</span>:last.action==='FLEE'?<span>Fuga</span>:last.action==='DEFEND_SHIELD'&&!last.dealt?<span>Defesa</span>:<span className="hit">−{n(last.dealt)}</span>}</p>
        <p className="turn-tag">{last.action==='HEAL'?'vida recuperada':last.action==='FLEE'?'você saiu do combate':`no monstro${last.crit?' · CRÍTICO!':''}`}</p>
        <div className="mini-bar"><span style={{width:pct(last.monsterHp,last.monsterMaxHp)}}/></div><small>Monstro: {n(last.monsterHp)} / {n(last.monsterMaxHp)}</small>
      </article>
      <span className="turn-vs" aria-hidden="true">⚔</span>
      <article className={`turn-card foe-side ${last.foe==='HEAVY'?'heavy':''}`}>
        <header><Icon name={monsterName} src={monsterSprite} size={32}/><div><small>Turno do monstro · {monsterName}</small><b>{last.foe==='HEAVY'?'Golpe pesado':last.foe==='CHARGE'?'Concentração':last.foe==='INTERRUPTED'?'Interrompido':last.foe==='NONE'?'Sem reação':'Ataque'}</b></div></header>
        <p className="turn-number">{last.foe==='ATTACK'||last.foe==='HEAVY'?(last.dodged?<span>Esquiva!</span>:<span className="hit">−{n(last.received)}</span>):<span>—</span>}</p>
        <p className="turn-tag">{last.foe==='ATTACK'||last.foe==='HEAVY'?(last.dodged?'você desviou do golpe':'em você'):theirs(last)}</p>
        <div className="mini-bar mine"><span style={{width:pct(last.hp,last.maxHp)}}/></div><small>Você: {n(last.hp)} / {n(last.maxHp)}</small>
      </article>
    </div>
    <button type="button" className="link-button turn-toggle" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'Esconder histórico':`Ver histórico completo (${turns.length} ${turns.length===1?'turno':'turnos'})`}</button>
    {all&&<div className="turn-history">
      <div className="stat-tiles"><div><b>{n(total.dealt)}</b><span>dano causado</span></div><div><b>{n(total.received)}</b><span>dano recebido</span></div><div><b>{n(total.healed)}</b><span>vida curada</span></div><div><b>{total.crits}</b><span>críticos</span></div><div><b>{total.dodges}</b><span>esquivas</span></div></div>
      <table className="admin-table turn-table"><thead><tr><th>Turno</th><th>Você</th><th>Monstro</th><th>Sua vida</th></tr></thead><tbody>
        <LimitedRows items={[...turns].reverse()} cols={4} render={t=><tr key={t.turn}><td>{t.turn}</td><td className={t.crit?'crit':''}>{mine(t,labels)}</td><td>{theirs(t)}</td><td>{n(t.hp)} / {n(t.maxHp)}</td></tr>}/>
      </tbody></table></div>}
  </div>;
}
