import {useEffect,useState} from 'react';
// Regra do site: nenhuma lista mostra mais de 10 itens de uma vez. Passou disso, "Ver mais" libera mais 10.
export const PAGE=10;
export function useShowMore<T>(items:readonly T[],resetKey:unknown='',step=PAGE){
  const [count,setCount]=useState(step);
  useEffect(()=>setCount(step),[resetKey,step]);
  return {visible:items.slice(0,count),rest:Math.max(0,items.length-count),more:()=>setCount(c=>c+step)};
}
export function ShowMore({rest,onMore,label='Ver mais'}:{rest:number;onMore:()=>void;label?:string}){
  if(rest<=0)return null;
  return <button type="button" className="show-more" onClick={onMore}>{label} ({Math.min(rest,PAGE)} de {rest})</button>;
}
