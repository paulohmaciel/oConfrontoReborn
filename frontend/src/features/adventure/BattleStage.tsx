import {useEffect,useRef,useState} from 'react';
import Icon from '../../ui/GameIcon';
import manifest from '../../../public/assets/tibia/manifest.json';
import type {Battle,TurnRecord} from '../../lib/types';

// Arena animada: o herói à esquerda e a criatura à direita encenam o último turno (avanço, golpe, dano, cura, guarda, esquiva, queda).
// Só encena o que o servidor já resolveu: nenhuma regra de combate mora aqui. Com "Animações: desligadas" os bonecos ficam parados
// e os números aparecem sem movimento (a regra global de data-motion="reduce" zera as animações).
type Float={text:string;kind:'dmg'|'crit'|'heal'|'miss'|'fx'};
type Step={hero?:string;foe?:string;heroFloat?:Float;foeFloat?:Float;shake?:boolean;projectile?:boolean;ms:number};
const n=(v:number)=>v.toLocaleString('pt-BR');
// Boneco de cada vocação (sprites do TibiaWiki já registrados no manifesto) e o que voa quando o golpe é à distância.
export const heroSprite:Record<string,string>={KNIGHT:'Hero',PALADIN:'Hunter',SORCERER:'Warlock',DRUID:'Monk'};
const projectileIcon:Record<string,string>={PALADIN:'Arrow',SORCERER:'Great Fireball Rune',DRUID:'Heavy Magic Missile Rune'};

const spritePath=new Map(manifest.entries.map(e=>[e.name,e.path]));
// Os sprites do Tibia têm 64×64, mas muitos bonecos ocupam só parte desse quadro. Para ninguém ficar miúdo, a arena mede a área
// desenhada do primeiro quadro, amplia até o dobro para ela encher o espaço e a apoia no chão, centralizada.
function StageSprite({src,alt,size}:{src:string;alt:string;size:number}){
  const [fit,setFit]=useState(''),[failed,setFailed]=useState(false);
  if(!src||failed)return <span className="missing-icon" title={alt}>?</span>;
  const measure=(img:HTMLImageElement)=>{try{
    const w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)return;
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return;
    g.drawImage(img,0,0);const d=g.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>24){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(maxX<0)return;
    const k=Math.min(2,w/(maxX-minX+1),h/(maxY-minY+1)),tx=(.5-(minX+maxX+1)/2/w*k)*100,ty=(1-(maxY+1)/h*k)*100;
    setFit(`translate(${tx.toFixed(2)}%,${ty.toFixed(2)}%) scale(${k.toFixed(3)})`);
  }catch{/* sem medição: fica no tamanho normal */}};
  return <span className="stage-sprite" style={{width:size,height:size}}><img className="sprite" src={src} alt={alt} style={fit?{transform:fit}:undefined} onLoad={e=>measure(e.currentTarget)} onError={()=>setFailed(true)}/></span>;
}

function script(t:TurnRecord,melee:boolean):Step[]{
  const s:Step[]=[],guard=t.action==='DEFEND_SHIELD';
  if(['ATTACK','TRIPLE_HIT','FIFTH_HIT','INTERRUPT'].includes(t.action)){
    s.push({hero:melee?'lunge':'cast',projectile:!melee,ms:melee?260:340});
    s.push({foe:t.monsterHp<=0?'hit dying':'hit',foeFloat:{text:`−${n(t.dealt)}`,kind:t.crit?'crit':'dmg'},shake:t.crit||t.action==='FIFTH_HIT',ms:440});
  } else if(t.action==='HEAL')s.push({hero:'heal',heroFloat:{text:`+${n(t.healed)}`,kind:'heal'},ms:560});
  else if(guard)s.push({hero:'guard',ms:320});
  else if(t.action==='FLEE'){s.push({hero:'flee',ms:520});return s;}
  if(t.foe==='ATTACK'||t.foe==='HEAVY'){
    s.push({foe:t.foe==='HEAVY'?'lunge heavy':'lunge',hero:guard?'guard':undefined,ms:300});
    s.push(t.dodged?{hero:'dodge',heroFloat:{text:'Esquiva!',kind:'miss'},ms:440}
      :{hero:guard?'hit guard':'hit',heroFloat:{text:`−${n(t.received)}`,kind:t.foe==='HEAVY'?'crit':'dmg'},shake:t.foe==='HEAVY',ms:440});
  } else if(t.foe==='CHARGE')s.push({foe:'charge',foeFloat:{text:'Concentrando…',kind:'fx'},ms:560});
  else if(t.foe==='INTERRUPTED')s.push({foe:'stagger',foeFloat:{text:'Interrompido!',kind:'miss'},ms:500});
  if(t.effectDamage)s.push({hero:'hit',heroFloat:{text:`−${n(t.effectDamage)}`,kind:'fx'},ms:400});
  return s;
}

export default function BattleStage({battle,heroName,vocation}:{battle:Battle;heroName:string;vocation:string}){
  const last=battle.turns?.length?battle.turns[battle.turns.length-1]:null,melee=vocation==='KNIGHT';
  const [steps,setSteps]=useState<Step[]>([]),[index,setIndex]=useState(-1);
  const seen=useRef<string>(`${battle.battleId}:${last?.turn??0}`);
  // Um turno novo (da mesma batalha) dispara a cena; abrir uma batalha já em andamento não repete o último turno.
  useEffect(()=>{
    const key=`${battle.battleId}:${last?.turn??0}`;if(key===seen.current)return;
    const sameBattle=seen.current.split(':')[0]===String(battle.battleId);seen.current=key;
    if(!last||!sameBattle){setSteps([]);setIndex(-1);return;}
    setSteps(script(last,melee));setIndex(0);
  },[battle.battleId,last?.turn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(index<0)return;if(index>=steps.length){setIndex(-1);return;}
    const t=setTimeout(()=>setIndex(i=>i+1),steps[index].ms);return()=>clearTimeout(t);
  },[index,steps]);
  const playing=index>=0&&index<steps.length,step=playing?steps[index]:null;
  const killedInScene=playing&&steps.slice(0,index+1).some(s=>s.foe?.includes('dying'));
  const foeDown=battle.monsterHp<=0&&(!playing||killedInScene),heroDown=battle.status==='DEFEAT'&&!playing,fled=battle.status==='FLED'&&!playing;
  const heroClass=['fighter','hero',heroDown?'down':fled?'gone':step?.hero??'idle'].join(' ');
  const foeClass=['fighter','foe',battle.isBoss?'boss':'',battle.phase===2&&!foeDown?'rage':'',foeDown&&!step?.foe?.includes('dying')?'down':step?.foe??'idle'].join(' ');
  const burning=battle.effects?.some(e=>e.kind==='BURN'),poisoned=battle.effects?.some(e=>e.kind==='POISON'),slowed=battle.effects?.some(e=>e.kind==='SLOW');
  return <div className={`battle-stage ${step?.shake?'shake':''}`} key={battle.battleId} aria-hidden="true">
    <div className="stage-floor"/>
    <div className={heroClass}>
      <div className={`body ${burning?'fx-burn':''} ${poisoned?'fx-poison':''} ${slowed?'fx-slow':''}`}><StageSprite src={spritePath.get(heroSprite[vocation]??'Hero')??spritePath.get('Hero')??''} alt={heroName} size={128}/></div>
      {step?.hero?.includes('guard')&&<span className="guard-shield"><Icon name="Mastermind Shield" size={56}/></span>}
      {step?.heroFloat&&<b key={`h${index}`} className={`float ${step.heroFloat.kind}`}>{step.heroFloat.text}</b>}
      <span className="nameplate">{heroName}</span>
    </div>
    {step?.projectile&&<span key={`p${index}`} className="projectile"><Icon name={projectileIcon[vocation]??'Arrow'} size={36}/></span>}
    <div className={foeClass}>
      <div className="body"><StageSprite src={spritePath.get(battle.monsterName)??battle.monsterSprite} alt={battle.monsterName} size={battle.isBoss?160:128}/></div>
      {step?.foeFloat&&<b key={`f${index}`} className={`float ${step.foeFloat.kind}`}>{step.foeFloat.text}</b>}
      <span className="nameplate">{battle.monsterName}</span>
    </div>
  </div>;
}
