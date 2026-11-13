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
  </section><AccountSecurity/><DeleteAccount/></>;
}

// A palavra que a pessoa escreve para confirmar que quer apagar a conta.
const DELETE_WORD='APAGAR';
// Apagar a conta: o servidor pede a senha de novo; aqui a pessoa ainda escreve uma palavra, para não ser um clique perdido.
// O que sai e o que fica: backend/src/account/accountDeletion.ts e /legal/apagar-conta.html.
function DeleteAccount(){
  const [open,setOpen]=useState(false),[password,setPassword]=useState(''),[word,setWord]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const ready=password.length>0&&word.trim().toUpperCase()===DELETE_WORD;
  function close(){setOpen(false);setPassword('');setWord('');setError('');}
  async function erase(){
    if(busy||!ready)return;setBusy(true);setError('');
    // A conta deixou de existir: a página é carregada de novo e mostra a entrada do jogo.
    try{await api<{ok:boolean}>('/auth/delete-account',{password});window.location.assign('/');}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível apagar a conta.');setBusy(false);}
  }
  return <section className="panel settings-panel"><div className="section-title"><h2>Apagar a conta</h2><span>Não tem volta</span></div>
    <p className="muted">Saem do servidor o e-mail, a senha, o perfil, os recados, os depoimentos, as amizades, os atendimentos e o progresso do app Confrontation guardado na nuvem. Os personagens ficam sem nome e ninguém mais entra neles. Ficam guardados, sem o seu nome, os registros de ouro, de itens e de pagamentos, pelo prazo que a lei pede. <a href="/legal/apagar-conta.html" target="_blank" rel="noreferrer">Ler os detalhes</a></p>
    {!open?<button type="button" className="danger-button" onClick={()=>setOpen(true)}>Quero apagar minha conta</button>
    :<form className="settings-form" onSubmit={e=>{e.preventDefault();void erase();}}>
      {error&&<p className="error notice" role="alert">{error}</p>}
      <label>Sua senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" maxLength={128} required autoFocus/></label>
      <label>Escreva {DELETE_WORD} para confirmar<input value={word} onChange={e=>setWord(e.target.value)} autoComplete="off" maxLength={12} required aria-describedby="delete-account-hint"/></label>
      <small id="delete-account-hint" className="muted">A conta é apagada na hora, neste site e no app. Não dá para desfazer.</small>
      <div className="settings-actions"><button className="danger-button" disabled={busy||!ready}>{busy?'Apagando…':'Apagar para sempre'}</button><button type="button" disabled={busy} onClick={close}>Desistir</button></div>
    </form>}
  </section>;
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
