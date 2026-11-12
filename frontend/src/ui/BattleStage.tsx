import {useEffect,useRef,useState} from 'react';
import Icon from './GameIcon';
import manifest from '../../public/assets/tibia/manifest.json';
import {applyMotion} from '../lib/theme';
import sheets from '../lib/spriteSheets.json';

// Arena animada, usada na caçada, no Duelo e na Caçada em grupo: lutadores à esquerda e à direita encenam a rodada que o servidor
// já resolveu (avanço, projétil, tranco, números que sobem, cura, guarda, esquiva, queda). Nenhuma regra de combate mora aqui.
// Cada tela monta a lista de passos (`steps`) e muda `turn` quando há uma rodada nova; abrir uma luta em andamento não repete a última.
export type Float={text:string;kind:'dmg'|'crit'|'heal'|'miss'|'fx'};
// `cls`: lunge | cast | hit | heal | guard | dodge | flee | charge | stagger, com os modificadores heavy, late (acontece no impacto) e dying.
export type Cue={who:string;cls?:string;float?:Float;shot?:string};
export type Step={cues:Cue[];shake?:boolean;ms:number};
// `sheet`: folha de sprites própria (4 colunas × 6 linhas, virada para a direita). Com ela o boneco anima quadro a quadro;
// sem ela, usa o sprite parado do TibiaWiki (`src`) com os movimentos de corpo inteiro.
export type StageFighter={id:string;name:string;src:string;sheet?:string;size?:number;boss?:boolean;rage?:boolean;down?:boolean;gone?:boolean;fx?:string};
const paths=new Map(manifest.entries.map(e=>[e.name,e.path]));
export const spriteOf=(name:string,fallback='')=>paths.get(name)??fallback;
// Boneco de cada vocação (sprites do TibiaWiki já registrados no manifesto) e o que voa quando o golpe é à distância.
const heroSprites:Record<string,string>={KNIGHT:'Hero',PALADIN:'Hunter',SORCERER:'Warlock',DRUID:'Monk'};
const shots:Record<string,string>={PALADIN:'Arrow',SORCERER:'Great Fireball Rune',DRUID:'Heavy Magic Missile Rune'};
export const heroSpriteOf=(baseVocation:string)=>spriteOf(heroSprites[baseVocation]??'Hero',spriteOf('Hero'));
export const shotOf=(baseVocation:string)=>shots[baseVocation];
// Arte própria do jogo (frontend/public/assets/sprites, ver CREDITOS.md lá). Linhas da folha: 1 parado, 2 avançar, 3 atacar,
// 4 defender, 5 curar, 6 apanhar (2 quadros) e cair (2 quadros). Quem não tem folha continua com o sprite do TibiaWiki.
// A lista do que existe vem de lib/spriteSheets.json, escrito por `npm run art` (o build roda antes): salvar o PNG com o nome do ART.md basta.
const heroSheets:Record<string,string>=sheets.heroes,monsterSheets:Record<string,string>=sheets.monsters;
const nameOfPath=new Map(manifest.entries.map(e=>[e.path,e.name]));
const sheetUrl=(file?:string)=>file?`/assets/sprites/${file}.png`:undefined;
export const heroSheetOf=(baseVocation:string)=>sheetUrl(heroSheets[baseVocation]);
// As criaturas das Eras e de Capriel usam o sprite da original; por isso a folha é achada pelo sprite, e só depois pelo nome.
export const monsterSheetOf=(name:string,spritePath?:string)=>sheetUrl(monsterSheets[nameOfPath.get(spritePath??'')??'']??monsterSheets[name]);
// O desenho ocupa cerca de 70% do quadro da folha, então o quadro é mostrado maior que um sprite comum.
export const SHEET_SCALE=1.5;
export const stageNumber=(v:number)=>v.toLocaleString('pt-BR');

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

export default function BattleStage({scene,turn,left,right,steps}:{scene:string|number;turn:string|number;left:StageFighter[];right:StageFighter[];steps:Step[]}){
  const [playing,setPlaying]=useState<Step[]>([]),[index,setIndex]=useState(-1);
  const [still,setStill]=useState(()=>document.documentElement.dataset.motion==='reduce');
  const seen=useRef(`${scene}:${turn}`),latest=useRef(steps);latest.current=steps;
  useEffect(()=>{
    const key=`${scene}:${turn}`;if(key===seen.current)return;
    const sameScene=seen.current.split(':')[0]===String(scene);seen.current=key;
    if(!sameScene||!latest.current.length){setPlaying([]);setIndex(-1);return;}
    setPlaying(latest.current);setIndex(0);
  },[scene,turn]);
  useEffect(()=>{
    if(index<0)return;if(index>=playing.length){setIndex(-1);return;}
    const t=setTimeout(()=>setIndex(i=>i+1),playing[index].ms);return()=>clearTimeout(t);
  },[index,playing]);
  const active=index>=0&&index<playing.length,step=active?playing[index]:null;
  const fallen=new Set(active?playing.slice(0,index+1).flatMap(s=>s.cues).filter(c=>c.cls?.includes('dying')).map(c=>c.who):[]);
  const toggle=()=>{const next=still?'full':'reduce';applyMotion(next);setStill(!still);};
  const fighter=(f:StageFighter,side:'left'|'right',many:boolean)=>{
    const cue=step?.cues.find(c=>c.who===f.id),dying=!!cue?.cls?.includes('dying');
    const down=active?fallen.has(f.id)&&!dying:!!f.down,gone=!active&&!!f.gone;
    const cls=['fighter',side,f.sheet?'sheeted':'',f.boss?'boss':'',f.rage&&!down?'rage':'',many?'many':'',down?'down':gone?'gone':cue?.cls??'idle'].join(' ');
    return <div className={cls} key={f.id}>
      <div className={`body ${f.fx??''}`}>{f.sheet?<span className="sheet-sprite sprite" role="img" aria-label={f.name} style={{width:Math.round((f.size??128)*SHEET_SCALE),height:Math.round((f.size??128)*SHEET_SCALE),backgroundImage:`url(${f.sheet})`}}/>:<StageSprite src={f.src} alt={f.name} size={f.size??128}/>}</div>
      {cue?.cls?.includes('guard')&&<span className="guard-shield"><Icon name="Mastermind Shield" size={many?40:56}/></span>}
      {cue?.float&&<b key={`${index}-${f.id}`} className={`float ${cue.float.kind} ${cue.cls?.includes('late')?'late':''}`}>{cue.float.text}</b>}
      <span className="nameplate">{f.name}</span>
    </div>;
  };
  const shotCues=step?.cues.filter(c=>c.shot)??[];
  return <div className="battle-stage-wrap">
    <div className={`battle-stage ${step?.shake?'shake':''}`} key={scene} aria-hidden="true">
      <div className="stage-floor"/>
      <div className={`stage-side left ${left.length>1?'many':''}`}>{left.map(f=>fighter(f,'left',left.length>1))}</div>
      {shotCues.map(c=><span key={`${index}-${c.who}`} className={`projectile ${left.some(f=>f.id===c.who)?'left':'right'}`}><Icon name={c.shot!} size={36}/></span>)}
      <div className={`stage-side right ${right.length>1?'many':''}`}>{right.map(f=>fighter(f,'right',right.length>1))}</div>
    </div>
    <button type="button" className="link-button stage-motion" aria-pressed={!still} title="Vale para o jogo todo; também fica em Configurações." onClick={toggle}>{still?'Animações desligadas · ligar':'Animações ligadas · desligar'}</button>
  </div>;
}
