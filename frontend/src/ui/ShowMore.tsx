import {useEffect,useState,type ReactNode} from 'react';
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
// Lista que mostra 10 itens e um "Ver mais" (use no lugar de {itens.map(...)} em qualquer tela).
export function Limited<T>({items,render,label,step=PAGE}:{items:readonly T[];render:(item:T,index:number)=>ReactNode;label?:string;step?:number}){
  const {visible,rest,more}=useShowMore(items,items.length,step);
  return <>{visible.map(render)}<ShowMore rest={rest} onMore={more} label={label}/></>;
}
// Mesma regra para linhas de tabela: o "Ver mais" vira uma linha da própria tabela.
export function LimitedRows<T>({items,render,cols}:{items:readonly T[];render:(item:T,index:number)=>ReactNode;cols:number}){
  const {visible,rest,more}=useShowMore(items,items.length);
  return <>{visible.map(render)}{rest>0&&<tr><td colSpan={cols}><ShowMore rest={rest} onMore={more}/></td></tr>}</>;
}
