import {useEffect,useState} from 'react';
import {VocationPicker} from '../adventure/AdventurePanels';
import {api} from '../../lib/api';
import {fmt} from '../../lib/format';
import type {Hero,GameConfig} from '../../lib/types';
import {useAction,Feedback} from '../../ui/Feedback';
import type {Command} from '../../ui/Feedback';
import Icon from '../../ui/GameIcon';
import {vocations,vocationLabel,isPromoted,promotion,type BaseVocation} from '../../../../shared/adventure';
type CharList={characters:{id:number;name:string;level:number;vocation:string}[];limit:number;premium:boolean};
export default function CharactersPanel({hero,config,command,onPremium,onSelect,onCreated}:{hero:Hero;config:GameConfig|null;command:Command;onPremium:()=>void;onSelect:(id:number)=>void;onCreated:(id:number)=>void}) {
  const [list,setList]=useState<CharList|null>(null),[name,setName]=useState(''),[vocation,setVocation]=useState<BaseVocation>('KNIGHT'),{busy,error,ok,run}=useAction();
  const load=()=>api<CharList>('/characters').then(setList).catch(()=>{});
  useEffect(()=>{void load();},[hero.id,hero.vocation]);
  const canPromote=hero.vocationChosen&&!isPromoted(hero.vocation)&&hero.level>=promotion.minLevel;
  return <>
    <section className="panel"><div className="section-title"><h2>Seus personagens</h2><span>{list?`${list.characters.length}/${list.limit}`:''}</span></div>
      <Feedback error={error} ok={ok}/>
      {list?.characters.map(c=><div className="market-row" key={c.id}><Icon name={vocations[(Object.keys(vocations).includes(c.vocation)?c.vocation:'KNIGHT') as BaseVocation]?.icon??'Sword'} size={40}/><div><h3>{c.name}</h3><p>{vocationLabel(c.vocation)} · Nível {c.level}</p></div><button disabled={busy||c.id===hero.id} onClick={()=>onSelect(c.id)}>{c.id===hero.id?'Em uso':'Jogar'}</button></div>)}
      {list&&list.characters.length<list.limit&&<form className="ops-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const c=await api<{id:number}>('/characters',{name,vocation});setName('');await load();onCreated(c.id);},'Personagem criado.');}}>
        <h3>Novo personagem</h3><p className="muted">Experimente outra vocação. Personagens extras começam com 100 de ouro e o equipamento inicial.</p>
        <label>Nome<input value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={24} required/></label>
        <VocationPicker value={vocation} onChange={setVocation} disabled={busy}/>
        <button className="primary" disabled={busy}>Criar personagem</button></form>}
      {list&&list.characters.length>=list.limit&&<p className="muted">{list.premium?'Você atingiu o limite de personagens do Premium.':<>Sua conta gratuita tem {list.limit} {list.limit===1?'personagem':'personagens'}. O Premium libera personagens extras para experimentar outras vocações — suas classes e progressão continuam independentes. <button type="button" className="link-button" onClick={onPremium}>Conhecer o Premium →</button></>}</p>}
    </section>
    <section className="panel"><div className="section-title"><h2>Classe e promoção</h2><span>{vocationLabel(hero.vocation)}</span></div>
      {isPromoted(hero.vocation)?<p>Seu personagem foi promovido: <b>+10% de ataque e defesa</b> e <b>+{promotion.critical}% de crítico</b>.</p>:<>
        <p className="muted">A partir do nível {promotion.minLevel}, a promoção fortalece a vocação em 10% de ataque e defesa e +{promotion.critical}% de crítico. Sua progressão, equipamentos e habilidades continuam.</p>
        <button className="primary" disabled={!canPromote||!!hero.activeBattleId||(config!==null&&BigInt(hero.goldInHand)<BigInt(config.promotionGold))} onClick={()=>void command('promote',{})}>Promover{config?` · ${fmt(config.promotionGold)} ouro`:''}</button>
        {!canPromote&&<p className="muted">{hero.vocationChosen?`Disponível no nível ${promotion.minLevel} (você está no ${hero.level}).`:'Escolha uma vocação na Jornada primeiro.'}</p>}</>}
    </section></>;
}

// ===== Premium =====
