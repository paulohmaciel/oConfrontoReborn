import {useState} from 'react';
import {api,ApiError} from '../../lib/api';
import {useAction} from '../../ui/Feedback';
export function ForgotForm({onBack}:{onBack:()=>void}) {
  const [email,setEmail]=useState(''),{busy,error,ok,run}=useAction();
  return <form className="login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{return (await api<{message:string}>('/auth/forgot-password',{email})).message;});}}>
    <div className="wordmark">O CONFRONTO<span>CRÔNICAS DE UM AVENTUREIRO</span></div><h2>Recuperar senha</h2>
    <label>E-mail da conta<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
    {error&&<p role="alert" className="error">{error}</p>}{ok&&<p role="status" className="success">{ok}</p>}
    <button className="primary" disabled={busy}>Enviar link</button><button type="button" className="link-button" onClick={onBack}>Voltar</button></form>;
}
export function ResetForm({token,onDone}:{token:string;onDone:()=>void}) {
  const [password,setPassword]=useState(''),[done,setDone]=useState(false),{busy,error,run}=useAction();
  return <form className="login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/auth/reset-password',{token,password});setDone(true);});}}>
    <div className="wordmark">O CONFRONTO<span>CRÔNICAS DE UM AVENTUREIRO</span></div><h2>Nova senha</h2>
    {done?<><p className="success">Senha alterada. Entre com a nova senha.</p><button type="button" className="primary" onClick={onDone}>Ir para a entrada</button></>:<>
      <label>Nova senha<input type="password" minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/></label>
      <p className="muted">De 10 a 128 caracteres. Todas as sessões abertas serão encerradas.</p>{error&&<p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy}>Salvar nova senha</button><button type="button" className="link-button" onClick={onDone}>Cancelar</button></>}</form>;
}
export async function verifyEmailToken(token:string):Promise<string> {
  try{await api('/auth/verify-email',{token});return 'E-mail confirmado. Obrigado!';}catch(e){return e instanceof ApiError?e.message:'Não foi possível confirmar o e-mail.';}
}
