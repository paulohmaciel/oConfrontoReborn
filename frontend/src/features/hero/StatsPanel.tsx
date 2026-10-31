import {useState} from 'react';
import {api} from '../../lib/api';
import {fmt} from '../../lib/format';
import type {Hero,Cmd,GameConfig,Perform} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import AttributeRadar from './AttributeRadar';
import {baseVocation,vocationLabel} from '../../../../shared/adventure';
import {typicalAttributes,BASE_ATTRIBUTE} from '../../../../shared/progression';
import {statsResetCost} from '../../../../shared/economy';
const stats=[['strength','Força','Aumenta o ataque.','Sword'],['vitality','Vitalidade','+15 de vida máxima.','Health Potion'],['agility','Agilidade','Aumenta o crítico, até 45% com bônus.','Boots of Haste'],['resistance','Resistência','Defesa e +15 de mana máxima.','Mastermind Shield']] as const;
type Stat=typeof stats[number][0];
const steps=[1,10,100,0] as const; // 0 = todos os pontos disponíveis
export default function StatsPanel({hero,config,busy,fighting,command,perform}:{hero:Hero;config:GameConfig|null;busy:boolean;fighting:boolean;command:Cmd;perform:Perform}){
  const [step,setStep]=useState<number>(1);
  const amount=Math.max(1,Math.min(step||hero.statPoints,hero.statPoints));
  const spent=stats.reduce((t,[s])=>t+Math.max(0,hero[s]-BASE_ATTRIBUTE),0);
  const resetCost=config?statsResetCost(hero.level,config.statsResetBaseGold,config.statsResetPerLevelSquared):null;
  // Quanto falta em cada atributo para chegar à distribuição típica da vocação, limitado aos pontos livres.
  const plan=(()=>{if(!hero.vocationChosen)return [];const target=typicalAttributes(baseVocation(hero.vocation),hero.level);let left=hero.statPoints;
    return stats.map(([s])=>{const add=Math.min(left,Math.max(0,target[s]-hero[s]));left-=add;return [s,add] as [Stat,number];}).filter(([,n])=>n>0);})();
  const planned=plan.reduce((t,[,n])=>t+n,0),blocked=busy||fighting;
  return <div className="stats-page"><section className="panel"><div className="section-title"><h2>Desenvolva seu personagem</h2><span>{fmt(hero.statPoints)} {hero.statPoints===1?'ponto disponível':'pontos disponíveis'}</span></div>
    {hero.statPoints>0&&<div className="stat-steps" role="group" aria-label="Pontos por clique"><span>Por clique:</span>{steps.map(n=><button key={n} type="button" className={step===n?'active-chip':''} aria-pressed={step===n} onClick={()=>setStep(n)}>{n?`+${n}`:'Tudo'}</button>)}</div>}
    {stats.map(([s,l,d,i])=><div className="market-row" key={s}><Icon name={i} size={40}/><div><h3>{l} <b>{fmt(hero[s])}</b></h3><p>{d}</p></div>
      <button disabled={blocked||hero.statPoints<1} onClick={()=>void command('stats',{stat:s,amount})}>Aumentar +{fmt(amount)}</button></div>)}
    {planned>0&&<div className="stat-plan"><p className="muted">Sugestão: {plan.map(([s,n])=>`${stats.find(x=>x[0]===s)![1]} +${fmt(n)}`).join(' · ')} deixa você como o típico de {vocationLabel(hero.vocation)} no nível {hero.level}.</p>
      <button disabled={blocked} onClick={()=>void perform(async()=>{for(const [stat,n] of plan)await api(`/characters/${hero.id}/stats`,{stat,amount:n},crypto.randomUUID());return `${fmt(planned)} pontos distribuídos como o típico.`;})}>Distribuir como o típico (+{fmt(planned)})</button></div>}
  </section>
  <section className="panel"><div className="section-title"><h2>Seu perfil de atributos</h2></div><AttributeRadar hero={hero}/></section>
  <section className="panel"><div className="section-title"><h2>Redistribuir pontos</h2><Icon name="Ultimate Healing Rune|Health Potion" size={32}/></div>
    <p className="muted">Devolve todos os pontos que você já distribuiu ({fmt(spent)}) para escolher de novo. A vida e a mana máximas perdem o bônus de Vitalidade e Resistência até você redistribuir.{resetCost!==null&&` Custo no nível ${hero.level}: ${fmt(resetCost.toString())} ouro.`}</p>
    <button disabled={blocked||spent<1||resetCost===null||BigInt(hero.goldInHand)<(resetCost??0n)} onClick={()=>{if(!window.confirm(`Devolver ${fmt(spent)} pontos por ${fmt((resetCost??0n).toString())} ouro? Os atributos voltam a ${BASE_ATTRIBUTE}.`))return;void command('stats/reset',{});}}>Redistribuir · {resetCost!==null?fmt(resetCost.toString()):'…'} ouro</button>
    {spent<1&&<p className="muted">Você ainda não distribuiu pontos.</p>}
  </section></div>;
}
