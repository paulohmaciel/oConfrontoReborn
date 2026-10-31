import {useState} from 'react';
import {msg} from '../lib/format';
export type Command=(action:string,body?:unknown)=>Promise<void>;
export function useAction(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
  async function run(work:()=>Promise<unknown>,done=''){if(busy)return;setBusy(true);setError('');setOk('');try{const r=await work();setOk(typeof r==='string'&&r?r:done);}catch(e){setError(msg(e));}finally{setBusy(false);}}
  return {busy,error,ok,run,setError};
}
export const Feedback=({error,ok}:{error:string;ok:string})=><>{error&&<div className="error notice" role="alert">{error}</div>}{ok&&<div className="success notice" role="status">{ok}</div>}</>;
