import {useEffect,useState} from 'react';
import ThemeToggle, {MotionToggle} from '../../ui/ThemeToggle';
import {api} from '../../lib/api';

type Sessions={email:string;emailVerified:boolean;open:number};
// Configurações: aparência (fica só neste navegador) e segurança da conta (senha e acessos abertos, no servidor).
export default function SettingsPanel(){
  return <><section className="panel settings-panel"><div className="section-title"><h2>Aparência</h2><span>Só neste navegador</span></div>
    <p className="muted">Essas escolhas ficam guardadas neste aparelho. Em outro computador ou celular, escolha de novo.</p>
    <div className="setting-row settings-option"><div><strong>Tema</strong><small>Escuro é o padrão. O claro tem o tom de pergaminho do jogo original.</small></div><ThemeToggle/></div>
    <div className="setting-row settings-option"><div><strong>Animações</strong><small>Desligadas: nada se mexe na tela. Os bonecos da batalha e os ícones animados dos itens ficam parados, e some o fogo dos itens +10, o brilho das classes, a rolagem suave e as transições. Indicado para quem sente tontura ou enjoo com movimento. Elas vêm ligadas; a arena de batalha também tem um botão para desligar.</small></div><MotionToggle/></div>
  </section><AccountSecurity/></>;
}

function AccountSecurity(){
  const [info,setInfo]=useState<Sessions|null>(null),[busy,setBusy]=useState(false),[ok,setOk]=useState(''),[error,setError]=useState('');
  const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[again,setAgain]=useState('');
  const load=()=>api<Sessions>('/auth/sessions').then(setInfo).catch(()=>setInfo(null));
  useEffect(()=>{void load();},[]);
  async function run(action:()=>Promise<{message?:string}>){
    if(busy)return;setBusy(true);setOk('');setError('');
    try{const r=await action();setOk(r.message??'Feito.');await load();}catch(e){setError(e instanceof Error?e.message:'Não foi possível completar a ação.');}finally{setBusy(false);}
  }
  const mismatch=again.length>0&&next!==again,short=next.length>0&&next.length<10;
  return <section className="panel settings-panel"><div className="section-title"><h2>Conta e segurança</h2><span>{info?.email??''}</span></div>
    {ok&&<p className="success notice" role="status">{ok}</p>}{error&&<p className="error notice" role="alert">{error}</p>}
    <form className="settings-form" onSubmit={e=>{e.preventDefault();if(mismatch||short)return;void run(async()=>{const r=await api<{message:string}>('/auth/change-password',{currentPassword:current,newPassword:next});setCurrent('');setNext('');setAgain('');return r;});}}>
      <strong>Trocar a senha</strong><small className="muted">Os outros aparelhos em que a conta estiver aberta serão desconectados. Este continua.</small>
      <label>Senha atual<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} autoComplete="current-password" maxLength={128} required/></label>
      <label>Nova senha<input type="password" value={next} onChange={e=>setNext(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required aria-describedby="new-password-hint"/></label>
      <label>Repita a nova senha<input type="password" value={again} onChange={e=>setAgain(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required aria-invalid={mismatch}/></label>
      <small id="new-password-hint" className={mismatch||short?'error':'muted'}>{mismatch?'As duas senhas novas não são iguais.':'De 10 a 128 caracteres.'}</small>
      <button className="primary" disabled={busy||mismatch||short||!current||!next||!again}>{busy?'Aguarde…':'Trocar senha'}</button>
    </form>
    <div className="setting-row settings-option"><div><strong>Acessos abertos</strong><small>{info?`${info.open===1?'Só este aparelho está com a conta aberta.':`A conta está aberta em ${info.open} lugares, contando este e o app.`} Cada acesso vale por 7 dias.`:'Carregando…'}</small></div>
      <button type="button" disabled={busy||!info||info.open<=1} onClick={()=>void run(()=>api<{message:string}>('/auth/logout-all',{}))}>Sair dos outros aparelhos</button></div>
    {info&&!info.emailVerified&&<div className="setting-row settings-option"><div><strong>E-mail ainda não confirmado</strong><small>Confirme para poder recuperar a conta se esquecer a senha.</small></div>
      <button type="button" disabled={busy} onClick={()=>void run(()=>api<{message:string}>('/auth/resend-verification',{}))}>Reenviar confirmação</button></div>}
  </section>;
}
