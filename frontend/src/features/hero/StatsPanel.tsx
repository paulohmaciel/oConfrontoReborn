import type {Hero,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import AttributeRadar from './AttributeRadar';
export default function StatsPanel({hero,busy,fighting,command}:{hero:Hero;busy:boolean;fighting:boolean;command:Cmd}){
  return <div className="stats-page"><section className="panel"><div className="section-title"><h2>Desenvolva seu personagem</h2><span>{hero.statPoints} pontos disponíveis</span></div>{[['strength','Força','Aumenta o ataque.','Sword'],['vitality','Vitalidade','+15 de vida máxima.','Health Potion'],['agility','Agilidade','Aumenta o crítico, até 45% com bônus.','Boots of Haste'],['resistance','Resistência','Defesa e +15 de mana máxima.','Mastermind Shield']].map(([s,l,d,i])=><div className="market-row" key={s}><Icon name={i} size={40}/><div><h3>{l} <b>{hero[s as 'strength']}</b></h3><p>{d}</p></div><button disabled={busy||fighting||hero.statPoints<1} onClick={()=>void command('stats',{stat:s})}>Aumentar +1</button></div>)}</section>
  <section className="panel"><div className="section-title"><h2>Seu perfil de atributos</h2></div><AttributeRadar hero={hero}/></section></div>;
}
