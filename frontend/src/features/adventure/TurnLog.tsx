import {useState} from 'react';
import Icon from '../../ui/GameIcon';
import {LimitedRows} from '../../ui/ShowMore';
import type {TurnRecord} from '../../lib/types';
const n=(v:number)=>v.toLocaleString('pt-BR');
const actionIcon:Record<string,string>={HEAL:'Health Potion',DEFEND_SHIELD:'Mastermind Shield',FLEE:'Boots of Haste',INTERRUPT:'Fire Sword'};

// O que você fez no turno, em uma linha curta (também usada no histórico completo).
function mine(t:TurnRecord,labels:Record<string,string>){
  if(t.action==='FLEE')return 'Fugiu';
  if(t.action==='HEAL')return `${labels.HEAL}: +${n(t.healed)} de vida`;
  return `${labels[t.action]??t.action}: ${n(t.dealt)} de dano${t.crit?' (crítico!)':''}`;
}
// Sem ação do monstro: ou ele caiu no seu golpe, ou você fugiu antes.
const foeDown=(t:TurnRecord)=>t.foe==='NONE'&&t.monsterHp===0;
function theirs(t:TurnRecord){
  if(foeDown(t))return 'Derrotado';
  if(t.foe==='NONE')return t.action==='FLEE'?'Ficou para trás':'—';
  if(t.foe==='CHARGE')return 'Concentrou forças';
  if(t.foe==='INTERRUPTED')return 'Golpe pesado interrompido';
  if(t.dodged)return 'Você esquivou';
  return `${t.foe==='HEAVY'?'Golpe pesado':'Ataque'}: ${n(t.received)} de dano`;
}

// Última rodada em um só quadro (seu golpe × golpe da criatura) e, sob demanda, o combate inteiro.
export default function TurnLog({turns,log,turnVersion,heroName,heroIcon,monsterName,monsterSprite,labels}:{turns:TurnRecord[];log:string[];turnVersion:number;heroName:string;heroIcon:string;monsterName:string;monsterSprite:string;labels:Record<string,string>}){
  const [all,setAll]=useState(false);
  const last=turns.at(-1);
  if(!last)return log.length?<div className="battle-log" role="log" aria-live="polite">{log.map((l,i)=><p key={`${turnVersion}-${i}`}>{l}</p>)}</div>:null;
  const total=turns.reduce((s,t)=>({dealt:s.dealt+t.dealt,received:s.received+t.received,healed:s.healed+t.healed,crits:s.crits+(t.crit?1:0),dodges:s.dodges+(t.dodged?1:0)}),{dealt:0,received:0,healed:0,crits:0,dodges:0});
  const struck=last.foe==='ATTACK'||last.foe==='HEAVY';
  return <div className="turn-log" aria-live="polite">
    <div className="turn-head"><h3>Última rodada · Turno {last.turn}</h3><button type="button" className="link-button" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'Esconder histórico':`Ver histórico completo (${turns.length}) →`}</button></div>
    <div className="turn-duel">
      <article className={`turn-side hero-side ${last.crit?'crit':''}`}>
        <Icon name={actionIcon[last.action]??heroIcon} size={40}/>
        <div><small>Seu golpe · {heroName}</small><b>{labels[last.action]??last.action}</b>
          <p className="turn-number">{last.action==='HEAL'?<span className="heal">+{n(last.healed)}</span>:last.action==='FLEE'?<span>Fuga</span>:last.action==='DEFEND_SHIELD'&&!last.dealt?<span>Defesa</span>:<span className="hit">−{n(last.dealt)}</span>}</p>
          <p className="turn-tag">{last.action==='HEAL'?'vida recuperada':last.action==='FLEE'?'você saiu do combate':`na criatura${last.crit?' · crítico!':''}`}</p></div>
      </article>
      <span className="turn-vs" aria-hidden="true"><Icon name="Logout Block Icon" size={27}/></span>
      <article className={`turn-side foe-side ${last.foe==='HEAVY'?'heavy':''} ${foeDown(last)?'down':''}`}>
        <Icon name={monsterName} src={monsterSprite} size={40}/>
        <div><small>Golpe da criatura · {monsterName}</small><b>{last.foe==='HEAVY'?'Golpe pesado':last.foe==='CHARGE'?'Concentração':last.foe==='INTERRUPTED'?'Interrompido':foeDown(last)?'Derrotado!':last.foe==='NONE'?'Ficou para trás':'Ataque'}</b>
          <p className="turn-number">{struck?(last.dodged?<span>Esquiva!</span>:<span className="hit">−{n(last.received)}</span>):foeDown(last)?<span className="heal">Vitória</span>:last.action==='FLEE'?<span>Fuga</span>:<span>0</span>}</p>
          <p className="turn-tag">{struck?(last.dodged?'você desviou do golpe':'em você'):foeDown(last)?'não resistiu ao seu golpe':last.action==='FLEE'?'você escapou do combate':theirs(last)}</p></div>
      </article>
    </div>
    {all&&<div className="turn-history">
      <div className="stat-tiles"><div><b>{n(total.dealt)}</b><span>dano causado</span></div><div><b>{n(total.received)}</b><span>dano recebido</span></div><div><b>{n(total.healed)}</b><span>vida curada</span></div><div><b>{total.crits}</b><span>críticos</span></div><div><b>{total.dodges}</b><span>esquivas</span></div></div>
      <table className="admin-table turn-table"><thead><tr><th>Turno</th><th>Você</th><th>Criatura</th><th>Sua vida</th></tr></thead><tbody>
        <LimitedRows items={[...turns].reverse()} cols={4} render={t=><tr key={t.turn}><td>{t.turn}</td><td className={t.crit?'crit':''}>{mine(t,labels)}</td><td>{theirs(t)}</td><td>{n(t.hp)} / {n(t.maxHp)}</td></tr>}/>
      </tbody></table></div>}
  </div>;
}
