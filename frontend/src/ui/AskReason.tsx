import {useState} from 'react';

// Pede um motivo na própria tela, no lugar de window.prompt: o botão abre uma caixa de texto com Enviar e Cancelar.
// Usa <span> (e não <form>) porque aparece dentro de parágrafos e linhas de ação.
export default function AskReason({label,question,onSubmit,send='Enviar',className='link-button',min=2,max=500,disabled=false}:{label:string;question:string;onSubmit:(reason:string)=>void;send?:string;className?:string;min?:number;max?:number;disabled?:boolean}){
  const [open,setOpen]=useState(false),[text,setText]=useState('');
  const close=()=>{setOpen(false);setText('');};
  if(!open)return <button type="button" className={className} disabled={disabled} onClick={()=>setOpen(true)}>{label}</button>;
  const reason=text.trim();
  return <span className="ask-reason" role="group" aria-label={label}>
    <label>{question}<textarea autoFocus rows={2} maxLength={max} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')close();}}/></label>
    <span className="inline-actions"><button type="button" className="primary" disabled={reason.length<min} onClick={()=>{onSubmit(reason);close();}}>{send}</button><button type="button" onClick={close}>Cancelar</button></span>
  </span>;
}
