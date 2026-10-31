export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export async function api<T>(path:string,body?:unknown,operationKey?:string,method?:'PUT'):Promise<T>{
  const response=await fetch(`/api${path}`,{credentials:'same-origin',method:method??(body===undefined?'GET':'POST'),
    headers:{'Content-Type':'application/json','X-Game-Client':'oconfronto',...(operationKey?{'Idempotency-Key':operationKey}:{})},
    body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({error:'Resposta inválida do servidor.'}));
  if(!response.ok)throw new ApiError(response.status,data.error??'Não foi possível completar a ação.');
  return data as T;
}
