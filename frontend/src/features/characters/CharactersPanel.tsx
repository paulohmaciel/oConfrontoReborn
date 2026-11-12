import {useEffect,useState} from 'react';
import {VocationPicker} from '../adventure/AdventurePanels';
import {api} from '../../lib/api';
import {fmt} from '../../lib/format';
import type {Hero,GameConfig} from '../../lib/types';
import {useAction,Feedback} from '../../ui/Feedback';
import type {Command} from '../../ui/Feedback';
import Icon from '../../ui/GameIcon';
import {vocations,baseVocation,classLabel,classNames,classLevels,classTierOf,classCost,classBonus,MAX_CLASS_TIER,type BaseVocation} from '../../../../shared/adventure';
type CharList={characters:{id:number;name:string;level:number;vocation:string;classTier?:number}[];limit:number;premium:boolean};
export default function CharactersPanel({hero,config,command,onPremium,onSelect,onCreated}:{hero:Hero;config:GameConfig|null;command:Command;onPremium:()=>void;onSelect:(id:number)=>void;onCreated:(id:number)=>void}) {
  const [list,setList]=useState<CharList|null>(null),[name,setName]=useState(''),[vocation,setVocation]=useState<BaseVocation>('KNIGHT'),{busy,error,ok,run}=useAction();
  const load=()=>api<CharList>('/characters').then(setList).catch(()=>{});
  useEffect(()=>{void load();},[hero.id,hero.vocation]);
  const tier=classTierOf(hero.vocation,hero.classTier),next=tier+1,nextLevel=classLevels[next-1],nextCost=config&&next<=MAX_CLASS_TIER?classCost(next,config.promotionGold):null;
  const canPromote=hero.vocationChosen&&next<=MAX_CLASS_TIER&&hero.level>=nextLevel;
  const names=classNames[baseVocation(hero.vocation)];
  return <>
    <section className="panel"><div className="section-title"><h2>Seus personagens</h2><span>{list?`${list.characters.length}/${list.limit}`:''}</span></div>
      <Feedback error={error} ok={ok}/>
      {list?.characters.map(c=><div className="market-row" key={c.id}><Icon name={vocations[(Object.keys(vocations).includes(c.vocation)?c.vocation:'KNIGHT') as BaseVocation]?.icon??'Sword'} size={40}/><div><h3>{c.name}</h3><p>{classLabel(c.vocation,c.classTier)} · Nível {c.level}</p></div><button disabled={busy||c.id===hero.id} onClick={()=>onSelect(c.id)}>{c.id===hero.id?'Em uso':'Jogar'}</button></div>)}
      {list&&list.characters.length<list.limit&&<form className="ops-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const c=await api<{id:number}>('/characters',{name,vocation});setName('');await load();onCreated(c.id);},'Personagem criado.');}}>
        <h3>Novo personagem</h3><p className="muted">Experimente outra vocação. Personagens extras começam com 100 de ouro e o equipamento inicial.</p>
        <label>Nome<input value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={24} required/></label>
        <VocationPicker value={vocation} onChange={setVocation} disabled={busy}/>
        <button className="primary" disabled={busy}>Criar personagem</button></form>}
      {list&&list.characters.length>=list.limit&&<p className="muted">{list.premium?'Você atingiu o limite de personagens do Premium.':<>Sua conta gratuita tem {list.limit} {list.limit===1?'personagem':'personagens'}. O Premium libera personagens extras para experimentar outras vocações — suas classes e progressão continuam independentes. <button type="button" className="link-button" onClick={onPremium}>Conhecer o Premium →</button></>}</p>}
    </section>
    <section className="panel"><div className="section-title"><h2>Classe e promoção</h2><span>{classLabel(hero.vocation,hero.classTier)}</span></div>
      <p className="muted">Uma nova classe em cada marco até o nível 1000. A 1ª (nível {classLevels[0]}) dá +10% de ataque e defesa e +2 de crítico; cada classe seguinte soma +{Math.round(classBonus.attack*100)}% de ataque e defesa e +{classBonus.critical} de crítico. Sua progressão, equipamentos e habilidades continuam.</p>
      <ol className="class-ladder">{names.map((n,i)=>{const t=i+1,state=t<=tier?'done':t===next?'next':'locked';
        return <li key={n} className={state}><b>{t<=tier?'✓':t}</b><div><strong>{n}</strong><small>Nível {classLevels[i]}{state!=='done'&&config?` · ${fmt(classCost(t,config.promotionGold).toString())} ouro`:''}</small></div></li>;})}</ol>
      {next<=MAX_CLASS_TIER?<><button className="primary" disabled={!canPromote||!!hero.activeBattleId||nextCost===null||BigInt(hero.goldInHand)<nextCost} onClick={()=>void command('promote',{})}>Tornar-se {names[next-1]}{nextCost!==null?` · ${fmt(nextCost.toString())} ouro`:''}</button>
        {!canPromote&&<p className="muted">{hero.vocationChosen?`Disponível no nível ${nextLevel} (você está no ${hero.level}).`:'Escolha uma vocação na Jornada primeiro.'}</p>}</>
        :<p>Você chegou à classe mais alta da sua vocação.</p>}
    </section></>;
}

// ===== Premium =====
