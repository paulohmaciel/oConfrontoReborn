import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';
import {msg} from '../lib/format';
export type Page<T>={items:T[];total:number;page:number;pages:number};
export const emptyPage=<T,>():Page<T>=>({items:[],total:0,page:1,pages:1});
// Números visíveis: primeira, última e a vizinhança da atual; o resto vira "…".
function numbers(page:number,pages:number):(number|'…')[]{
  const set=new Set([1,pages,page-1,page,page+1].filter(n=>n>=1&&n<=pages)),list=[...set].sort((a,b)=>a-b),out:(number|'…')[]=[];
  list.forEach((n,i)=>{if(i&&n-list[i-1]>1)out.push('…');out.push(n);});return out;
}
// Páginas numeradas para listas que crescem com o jogo (anúncios, extrato, recados…). Some quando há só uma página.
export function Pager({page,pages,onPage,busy=false}:{page:number;pages:number;onPage:(p:number)=>void;busy?:boolean}){
  if(pages<=1)return null;
  return <nav className="pager pages" aria-label="Páginas">
    <button type="button" disabled={busy||page<=1} onClick={()=>onPage(page-1)}>Anterior</button>
    {numbers(page,pages).map((n,i)=>n==='…'?<span key={`g${i}`} className="gap">…</span>:<button type="button" key={n} disabled={busy} aria-current={n===page?'page':undefined} className={n===page?'current':''} onClick={()=>n!==page&&onPage(n)}>{n}</button>)}
    <button type="button" disabled={busy||page>=pages} onClick={()=>onPage(page+1)}>Próxima</button>
    <small>Página {page} de {pages}</small>
  </nav>;
}
// Carrega `path` com ?page=N. Trocar `path` (filtro, busca) volta para a página 1; mudar `refreshKey` ou chamar `reload` busca a página atual de novo.
export function usePaged<T>(path:string|null,refreshKey:unknown=0){
  const [data,setData]=useState<Page<T>>(emptyPage<T>()),[error,setError]=useState(''),[loading,setLoading]=useState(false),seq=useRef(0),current=useRef(1),mounted=useRef(false);
  const go=useCallback(async(p:number)=>{if(!path)return;const id=++seq.current;setLoading(true);
    try{const r=await api<Page<T>>(`${path}${path.includes('?')?'&':'?'}page=${p}`);if(id!==seq.current)return;
      // Se a lista encolheu (ex.: último item da última página saiu), cai para a última página que existe.
      if(r.page>r.pages&&r.total>0){void go(r.pages);return;}current.current=r.page;setData(r);setError('');}
    catch(e){if(id===seq.current)setError(msg(e));}finally{if(id===seq.current)setLoading(false);}},[path]);
  useEffect(()=>{void go(1);},[go]);
  useEffect(()=>{if(mounted.current)void go(current.current);mounted.current=true;},[refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return {...data,error,loading,go,reload:()=>go(data.page)};
}
