
export const fmt=(n:string|number)=>BigInt(n).toLocaleString('pt-BR');
export const brl=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const when=(d:string|null|undefined)=>d?new Date(d).toLocaleString('pt-BR'):'—';
export const msg=(e:unknown)=>e instanceof Error?e.message:'Ocorreu um erro.';
