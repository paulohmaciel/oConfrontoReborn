import {useState} from 'react';
import {fmt} from '../../lib/format';
import type {Hero} from '../../lib/types';
import {baseVocation,classLabel} from '../../../../shared/adventure';
import {typicalAttributes} from '../../../../shared/progression';
const axes=[['strength','Força'],['vitality','Vitalidade'],['agility','Agilidade'],['resistance','Resistência']] as const;
type Key=typeof axes[number][0];
const SIZE=320,C=SIZE/2,R=104,RINGS=4;
// Ponto do eixo i (começa no topo e gira no sentido horário) a uma fração f do raio.
const at=(i:number,f:number)=>{const a=-Math.PI/2+i*2*Math.PI/axes.length;return [C+Math.cos(a)*R*f,C+Math.sin(a)*R*f] as const;};
const shape=(vals:Record<Key,number>,max:number)=>axes.map(([k],i)=>at(i,vals[k]/max).join(',')).join(' ');
// Radar dos atributos: você × a distribuição típica da sua vocação no seu nível (a mesma usada para equilibrar os monstros).
export default function AttributeRadar({hero}:{hero:Hero}){
  const [hover,setHover]=useState<number|null>(null);
  const you:Record<Key,number>={strength:hero.strength,vitality:hero.vitality,agility:hero.agility,resistance:hero.resistance};
  const typical=hero.vocationChosen?typicalAttributes(baseVocation(hero.vocation),hero.level):null;
  const max=Math.max(1,...axes.flatMap(([k])=>[you[k],typical?.[k]??0]));
  const vocation=classLabel(hero.vocation,hero.classTier);
  return <div className="attr-radar">
    <div className="radar-legend" aria-hidden="true"><span><i className="swatch you"/>Você</span>{typical&&<span><i className="swatch typical"/>Típico de {vocation} no nível {hero.level}</span>}</div>
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Radar dos atributos: ${axes.map(([k,l])=>`${l} ${you[k]}`).join(', ')}${typical?`. Típico: ${axes.map(([k,l])=>`${l} ${typical[k]}`).join(', ')}`:''}.`} onMouseLeave={()=>setHover(null)}>
      {Array.from({length:RINGS},(_,r)=><polygon key={r} className="ring" points={axes.map((_,i)=>at(i,(r+1)/RINGS).join(',')).join(' ')}/>)}
      {axes.map((_,i)=>{const [x,y]=at(i,1);return <line key={i} className="spoke" x1={C} y1={C} x2={x} y2={y}/>;})}
      {typical&&<polygon className="series typical" points={shape(typical,max)}/>}
      <polygon className="series you" points={shape(you,max)}/>
      {axes.map(([k],i)=>{const [x,y]=at(i,you[k]/max);return <circle key={k} className="dot you" cx={x} cy={y} r={4}/>;})}
      {typical&&axes.map(([k],i)=>{const [x,y]=at(i,typical[k]/max);return <circle key={k} className="dot typical" cx={x} cy={y} r={4}/>;})}
      {axes.map(([,label],i)=>{const [x,y]=at(i,1.2);return <text key={label} className="axis-label" x={x} y={y} textAnchor={Math.abs(x-C)<1?'middle':x>C?'start':'end'} dominantBaseline={Math.abs(y-C)<1?'middle':y>C?'hanging':'auto'}>{label}</text>;})}
      {/* Áreas de toque maiores que o ponto: uma por eixo, mostram os dois valores. */}
      {axes.map(([k],i)=>{const [x,y]=at(i,Math.max(you[k],typical?.[k]??0)/max);return <circle key={k} className="hit" cx={x} cy={y} r={18} tabIndex={0} aria-label={`${axes[i][1]}: você ${you[k]}${typical?`, típico ${typical[k]}`:''}`} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} onClick={()=>setHover(i)}/>;})}
    </svg>
    {hover!==null&&(()=>{const [k,l]=axes[hover];return <div className="radar-tip" role="status"><b>{l}</b><span><i className="swatch you"/>Você: {fmt(you[k])}</span>{typical&&<span><i className="swatch typical"/>Típico: {fmt(typical[k])}</span>}</div>;})()}
    <table className="radar-table"><thead><tr><th scope="col">Atributo</th><th scope="col">Você</th>{typical&&<th scope="col">Típico</th>}{typical&&<th scope="col">Diferença</th>}</tr></thead>
      <tbody>{axes.map(([k,l])=>{const d=typical?you[k]-typical[k]:0;return <tr key={k}><th scope="row">{l}</th><td>{fmt(you[k])}</td>{typical&&<td>{fmt(typical[k])}</td>}{typical&&<td>{d>0?`+${fmt(d)}`:d<0?`−${fmt(-d)}`:'='}</td>}</tr>;})}</tbody></table>
    <p className="muted">{typical?`"Típico" é como um ${vocation} do seu nível costuma distribuir os pontos — é a base usada para equilibrar os monstros. Não é obrigatório: é só uma referência.`:'Escolha uma vocação na Jornada para comparar com a distribuição típica.'}</p>
  </div>;
}
