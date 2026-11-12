import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../../lib/api';
import {msg} from '../../lib/format';
import type {Hero,Perform} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Feedback} from '../../ui/Feedback';
import {classLabel,baseVocation,vocations} from '../../../../shared/adventure';
import {groupActions,type GroupAction,type GroupHunt} from '../../../../shared/groupHunt';
type Card={id:number;name:string;level:number;vocation:string;classTier:number;profileAvatar:string|null;profileEmblem:string|null};
type Fighter={characterId:number;character:Card;vocation:string;hp:number;maxHp:number;mana:number;maxMana:number;ready:boolean;action:GroupAction|null;actions:GroupAction[];rewardGold:string;rewardExperience:number;rewarded:boolean};
type Battle={id:number;huntKey:string;name:string;sprite:string;round:number;deadlineAt:string;outcome:string;isFinished:boolean;bossHp:number;bossMaxHp:number;mechanic:'chains'|'enchant'|'mist'|'dragon';counters:number;maxCounters:number;freed:boolean;phase:'FIGHT'|'CHOICE';choice:'SLAY'|'SLEEP'|null;bonusText:string|null;intent:{kind:string;label:string};log:string[];fighters:Fighter[]};
type State={now:string;minLevel:number;level:number;hunts:(GroupHunt&{minLevel:number;rewardsThisWeek:number})[];invites:{id:number;huntKey:string;leader:Card}[];
  party:{id:number;huntKey:string;status:string;leaderId:number;members:{id:number;status:string;character:Card}[]}|null;friends:Card[];battle:Battle|null;
  settings:{energyCost:number;roundSeconds:number;weeklyRewards:number;partyMin:number;partyMax:number}};
const Avatar=({c,size=36}:{c:Card;size?:number})=><Icon name={c.profileAvatar??c.profileEmblem??'Hero'} size={size}/>;
const bar=(v:number,max:number)=>`${Math.max(0,Math.min(100,Math.round(v/Math.max(1,max)*100)))}%`;
const outcomeLabel:Record<string,string>={VICTORY:'Vitória!',DEFEAT:'Derrota',ESCAPED:'A criatura escapou'};
// Situação da mecânica de cada caçada, em uma linha.
function mechanicLine(b:Battle){
  if(b.mechanic==='chains')return b.freed?'A fera foi libertada do laço.':b.isFinished?'A fera terminou presa no laço (libertá-la dá bônus).':b.counters?`Laço: ${b.counters} de ${b.maxCounters} correntes. Presa, a fera fica furiosa (só a mira do Paladino parte as correntes).`:'O laço arrebentou.';
  if(b.mechanic==='enchant')return b.freed?'O encantamento foi desfeito: o espírito voltou a si.':b.counters?`Encantamento: ${b.counters} de ${b.maxCounters} camadas. Enquanto existir, o espírito recebe metade do dano (só Quebrar selo desfaz).`:'O encantamento se desfez.';
  if(b.mechanic==='mist')return b.counters?`Névoa: ${b.counters} ilusão(ões). Golpes comuns podem acertar um reflexo; a mira acha o verdadeiro e a luz do Feiticeiro tira ilusões. O veneno queima todos se o Druida não curar.`:'A névoa abriu: sem ilusões nesta rodada (ela engrossa de novo com o tempo). Cuidado com o veneno.';
  if(b.phase==='CHOICE'&&!b.isFinished)return 'O dragão está de joelhos. Cada um vota: derrotá-lo ou fazê-lo voltar a dormir (empate = dormir).';
  if(b.choice)return b.choice==='SLAY'?'O grupo derrotou o dragão: vitória militar.':'O grupo fez o dragão voltar a dormir: começa uma aliança entre povos e criaturas.';
  return b.counters?`Selos do controle: ${b.counters} de ${b.maxCounters}. Preso a eles, o dragão fica furioso (Feiticeiro e Paladino quebram).`:'Os selos se partiram: o dragão está livre do controle.';
}

// Caçada em grupo com amigos (A Caçada das Quatro Marcas): grupo, convites e a batalha em rodadas com prazo.
export default function GroupHuntPanel({hero,perform,openProfile}:{hero:Hero;perform:Perform;openProfile:(name:string)=>void}){
  const [s,setS]=useState<State|null>(null),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState(''),[clock,setClock]=useState(Date.now());
  const offset=useRef(0),lastOutcome=useRef('');
  const load=useCallback(async()=>{try{const r=await api<State>(`/characters/${hero.id}/group${q.trim()?`?q=${encodeURIComponent(q.trim())}`:''}`);offset.current=new Date(r.now).getTime()-Date.now();setS(r);}catch(e){setError(msg(e));}},[hero.id,q]);
  // Atualiza sozinho: rápido durante a caçada e enquanto o grupo se forma; devagar quando não há nada acontecendo.
  const live=!!s&&(s.party!==null||s.invites.length>0||(!!s.battle&&!s.battle.isFinished));
  useEffect(()=>{void load();const t=setInterval(()=>void load(),live?3000:15000);return()=>clearInterval(t);},[load,live]);
  useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(t);},[]);
  // Quando a caçada termina, recarrega o herói (vida, XP, ouro, energia).
  useEffect(()=>{const o=s?.battle?.isFinished?`${s.battle.id}:${s.battle.outcome}`:'';if(o&&lastOutcome.current&&o!==lastOutcome.current)void perform(async()=>'', '');if(o)lastOutcome.current=o;else if(s?.battle)lastOutcome.current='ongoing';},[s?.battle?.id,s?.battle?.isFinished]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(path:string,body:unknown={},refreshHero=false){if(busy)return;setBusy(true);setError('');setOk('');
    try{const r=await api<{message?:string}>(`/characters/${hero.id}/group/${path}`,body);if(r?.message)setOk(r.message);await load();if(refreshHero)await perform(async()=>'', '');}catch(e){setError(msg(e));await load();}finally{setBusy(false);}}
  // Prazo vencido: qualquer participante fecha a rodada (quem não escolheu, defende). Erros de corrida são ignorados.
  const b=s?.battle,remaining=b&&!b.isFinished?Math.max(0,Math.ceil((new Date(b.deadlineAt).getTime()-(clock+offset.current))/1000)):0;
  const advancing=useRef(0);
  useEffect(()=>{if(b&&!b.isFinished&&remaining===0&&advancing.current!==b.round){advancing.current=b.round;void api(`/characters/${hero.id}/group/battles/${b.id}/advance`,{round:b.round}).catch(()=>{}).then(()=>load());}},[remaining,b?.round,b?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if(!s)return <section className="panel">{error?<p className="error" role="alert">{error}</p>:'Reunindo o grupo…'}</section>;
  const locked=s.level<s.minLevel,party=s.party,leader=party?.leaderId===hero.id,joined=party?.members.filter(m=>m.status==='JOINED')??[];
  const hunt=s.hunts.find(h=>h.key===(b&&!b.isFinished?b.huntKey:party?.huntKey));
  return <div className="group-page">
    <section className="panel intro-banner group-intro"><div><span className="eyebrow">CAÇADA EM GRUPO</span><h2>A Caçada das Quatro Marcas</h2>
      <p>Quatro criaturas lendárias guardam o equilíbrio ao redor de Capriel, e alguém começou a caçá-las. O templo reúne amigos para chegar antes dos caçadores: o Cavaleiro segura, o Paladino mira de longe, o Druida cura e o Feiticeiro quebra selos.</p>
      <p className="muted">Grupos de {s.settings.partyMin} a {s.settings.partyMax} amigos, a partir do nível {s.minLevel}. Cada participante gasta {s.settings.energyCost} de energia; cada rodada dura {s.settings.roundSeconds} s.</p></div><Icon name="Mammoth" size={88}/></section>
    <Feedback error={error} ok={ok}/>
    {locked&&<section className="panel notice">A caçada em grupo abre no nível {s.minLevel}. Você está no nível {s.level}: continue caçando e chame seus amigos pelo perfil enquanto isso.</section>}

    {b&&<BattleView b={b} hero={hero} remaining={remaining} busy={busy} choose={a=>void act(`battles/${b.id}/act`,{round:b.round,action:a})} openProfile={openProfile}/>}

    {s.invites.length>0&&!(b&&!b.isFinished)&&<section className="panel"><div className="section-title"><h2>Convites para caçar</h2><span>{s.invites.length}</span></div>
      {s.invites.map(i=><div className="market-row" key={i.id}><Avatar c={i.leader}/><div><h3><button className="link-button" onClick={()=>openProfile(i.leader.name)}>{i.leader.name}</button> chama você</h3><p>{s.hunts.find(h=>h.key===i.huntKey)?.name}</p></div>
        <button className="primary" disabled={busy||!!party} title={party?'Saia do seu grupo antes':''} onClick={()=>void act(`invites/${i.id}/accept`)}>Aceitar</button><button disabled={busy} onClick={()=>void act(`invites/${i.id}/decline`)}>Recusar</button></div>)}</section>}

    {party&&!(b&&!b.isFinished)&&hunt&&<section className="panel"><div className="section-title"><h2>Seu grupo · {hunt.title}</h2><span>{joined.length}/{s.settings.partyMax}</span></div>
      <div className="party-grid">{party.members.map(m=><article key={m.id} className={m.status==='INVITED'?'party-member invited':'party-member'}>
        <button className="post-avatar" onClick={()=>openProfile(m.character.name)} aria-label={`Perfil de ${m.character.name}`}><Avatar c={m.character} size={44}/></button>
        <div><h3>{m.character.name}{m.character.id===party.leaderId&&<span className="tag">LÍDER</span>}</h3><p>{classLabel(m.character.vocation,m.character.classTier)} · Nv. {m.character.level}</p>
          <p className="muted">{m.status==='INVITED'?'Convite enviado, esperando resposta':hunt.roles[baseVocation(m.character.vocation)]??''}</p></div>
        {leader&&m.character.id!==hero.id&&<button className="link-button" disabled={busy} onClick={()=>void act('remove',{memberId:m.id})}>{m.status==='INVITED'?'Cancelar':'Remover'}</button>}</article>)}</div>
      {leader&&party.members.length<s.settings.partyMax&&<div className="invite-box"><h3 className="profile-subtitle">Convidar amigos (nível {hunt.minLevel}+)</h3>
        <input className="mission-search" aria-label="Buscar amigo" placeholder="Buscar amigo pelo nome…" value={q} maxLength={24} onChange={e=>setQ(e.target.value)}/>
        {s.friends.map(f=><div className="market-row" key={f.id}><Avatar c={f}/><div><h3>{f.name}</h3><p>{classLabel(f.vocation,f.classTier)} · Nv. {f.level}</p></div><button disabled={busy} onClick={()=>void act('invite',{name:f.name})}>Convidar</button></div>)}
        {!s.friends.length&&<p className="muted">{q.trim()?'Nenhum amigo com esse nome e nível.':`Nenhum amigo do nível ${hunt.minLevel} ou mais para convidar. Faça amizades pelo perfil e pelo fórum.`}</p>}</div>}
      <div className="inline-actions group-actions">
        {leader&&<button className="primary" disabled={busy||joined.length<s.settings.partyMin} onClick={()=>void act('start',{},true)}>Começar a caçada ({s.settings.energyCost} de energia de cada um)</button>}
        {leader&&joined.length<s.settings.partyMin&&<span className="muted">Precisa de pelo menos {s.settings.partyMin} no grupo (convites aceitos).</span>}
        {!leader&&<span className="muted">Esperando o líder começar a caçada.</span>}
        <button disabled={busy} onClick={()=>{if(!leader||window.confirm('Sair desfaz o grupo para todos. Continuar?'))void act('leave');}}>{leader?'Desfazer grupo':'Sair do grupo'}</button></div></section>}

    <section className="panel"><div className="section-title"><h2>As quatro caçadas</h2><span>{s.settings.weeklyRewards} recompensas por caçada a cada 7 dias</span></div>
      <div className="group-hunts">{s.hunts.map(h=><article key={h.key} className={h.available?'group-hunt':'group-hunt soon'}><Icon name={h.sprite} size={56}/><div>
        <span className="eyebrow">{h.order}ª caçada · nível {h.minLevel}</span><h3>{h.name}</h3><p>{h.story}</p>
        {h.available?<><ul className="role-list">{(Object.keys(vocations) as (keyof typeof vocations)[]).map(v=>h.roles[v]&&<li key={v}><b>{vocations[v].name==='Arqueiro'?'Paladino':vocations[v].name}:</b> {h.roles[v]}</li>)}</ul>
          <p className="muted">Recompensas recebidas nesta semana: {h.rewardsThisWeek}/{s.settings.weeklyRewards}</p>
          {h.bonusText&&<p className="muted">Bônus de recompensa se o grupo conseguir {h.bonusText}.</p>}
          {!party&&<button className="primary" disabled={busy||s.level<h.minLevel} onClick={()=>void act('party',{huntKey:h.key})}>{s.level<h.minLevel?`Abre no nível ${h.minLevel}`:'Montar grupo'}</button>}</>
          :<p className="tag">Em breve</p>}</div></article>)}</div></section>
  </div>;
}

function BattleView({b,hero,remaining,busy,choose,openProfile}:{b:Battle;hero:Hero;remaining:number;busy:boolean;choose:(a:GroupAction)=>void;openProfile:(n:string)=>void}){
  const me=b.fighters.find(f=>f.characterId===hero.id);
  return <section className="panel group-battle"><div className="section-title"><h2>{b.name}</h2><span>{b.isFinished?outcomeLabel[b.outcome]??b.outcome:`Rodada ${b.round} · ${remaining}s`}</span></div>
    <div className="boss-card"><Icon name={b.sprite} size={80}/><div className="boss-info">
      <div className="gbar"><span style={{width:bar(b.bossHp,b.bossMaxHp)}}/></div><p>{b.bossHp.toLocaleString('pt-BR')} / {b.bossMaxHp.toLocaleString('pt-BR')} de vida</p>
      <p className={b.freed||b.choice==='SLEEP'?'pos':'muted'}>{mechanicLine(b)}</p>
      {!b.isFinished&&b.phase==='FIGHT'&&<p className={b.intent.kind==='STOMP'?'intent warning':'intent'}>{b.intent.label}</p>}</div></div>
    <div className="party-grid">{b.fighters.map(f=><article key={f.characterId} className={f.hp<=0?'party-member down':'party-member'}>
      <button className="post-avatar" onClick={()=>openProfile(f.character.name)} aria-label={`Perfil de ${f.character.name}`}><Icon name={f.character.profileAvatar??f.character.profileEmblem??'Hero'} size={40}/></button>
      <div><h3>{f.character.name} {!b.isFinished&&f.hp>0&&<small className={f.ready?'pos':'muted'}>{f.ready?(b.phase==='CHOICE'?'✓ votou':'✓ pronto'):(b.phase==='CHOICE'?'votando…':'escolhendo…')}</small>}{f.hp<=0&&<small className="neg"> caiu</small>}</h3>
        <div className="gbar hp"><span style={{width:bar(f.hp,f.maxHp)}}/></div><small>{f.hp}/{f.maxHp} vida · {f.mana}/{f.maxMana} mana</small>
        {b.isFinished&&b.outcome==='VICTORY'&&<p className="muted">{f.rewarded?`+${f.rewardExperience.toLocaleString('pt-BR')} XP · +${Number(f.rewardGold).toLocaleString('pt-BR')} ouro`:'Sem recompensa (limite da semana)'}</p>}</div></article>)}</div>
    {!b.isFinished&&me&&me.hp>0&&<div className="group-choice"><h3 className="profile-subtitle">{b.phase==='CHOICE'?'Seu voto':'Sua ação nesta rodada'}{me.action?`: ${groupActions[me.action].label} (pode trocar até a rodada fechar)`:''}</h3>
      <div className="action-grid">{me.actions.map(a=><button key={a} className={me.action===a?'primary':''} disabled={busy||me.mana<groupActions[a].mana} title={groupActions[a].help} onClick={()=>choose(a)}>
        <strong>{groupActions[a].label}</strong><small>{groupActions[a].help}{groupActions[a].mana?` · ${groupActions[a].mana} mana`:''}</small></button>)}</div></div>}
    {!b.isFinished&&me&&me.hp<=0&&<p className="notice">Você caiu. Torça pelos companheiros: a recompensa da vitória é de todos.</p>}
    {b.log.length>0&&<div className="battle-log" role="log" aria-live="polite">{b.log.map((l,i)=><p key={`${b.round}-${i}`}>{l}</p>)}</div>}
  </section>;
}
