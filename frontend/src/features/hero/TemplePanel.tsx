import type {Hero,Cmd} from '../../lib/types';
import Icon from '../../ui/GameIcon';
export default function TemplePanel({hero,busy,fighting,command}:{hero:Hero;busy:boolean;fighting:boolean;command:Cmd}){
  return <section className="panel temple"><Icon name="Health Potion" size={72}/><span className="eyebrow">UM MOMENTO DE DESCANSO</span><h2>Templo de Caipriel</h2><p>Recupere sua vida, mana e energia gratuitamente.<br/>Uma bênção fica disponível a cada 5 minutos, fora de combate.</p><button className="primary" disabled={busy||fighting} onClick={()=>void command('temple')}>Receber bênção</button>{hero.templeReadyAt&&<p className="muted">Próxima bênção: {new Date(hero.templeReadyAt).toLocaleTimeString('pt-BR')}</p>}</section>;
}
