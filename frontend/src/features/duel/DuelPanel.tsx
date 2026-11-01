import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../../lib/api';
import {msg} from '../../lib/format';
import type {Hero} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Feedback} from '../../ui/Feedback';
import {LimitedRows} from '../../ui/ShowMore';
import {Pager,usePaged} from '../../ui/Pager';
import FriendsBox from './FriendsBox';
import {classLabel,classNames,baseVocation} from '../../../../shared/adventure';
import {duelActionLabels,modeHelp,modeLabels,outcomeLabels,type DuelAction,type DuelMode,type DuelMove,type DuelOutcome,type DuelRoundRecord} from '../../../../shared/pvp';
type Card={id:number;name:string;level:number;vocation:string;classTier:number;profileAvatar:string|null;profileEmblem:string|null};
type Side={characterId:number;character:Card;vocation:string;hp:number;maxHp:number;mana:number;maxMana:number;ready:boolean;action:DuelAction|null;missed:number};
type Duel={id:number;round:number;status:string;outcome:DuelOutcome;winnerId:number|null;deadlineAt:string|null;finishedAt:string|null;me:Side;foe:Side;
  mode:DuelMode;stake:string;fee:string;honorDelta:number;loot:{id:number;item:string;upgradeTier:number;status:string;winnerId:number;ransomPrice:string}|null;
  actions:{key:DuelAction;label:string;mana:number;help:string}[];rounds:DuelRoundRecord[]};
type Loot={id:number;duelId:number;item:string;sprite:string;upgradeTier:number;ransomPrice:string;expiresAt:string};
type State={now:string;record:{wins:number;losses:number;streak:number;honor:number;marks:number};eligible:string|null;today:number;gold:string;
  rules:{minLevel:number;levelBandPercent:number;dailyLimit:number;roundHours:number;inviteHours:number;wagerMaxPercent:number;wagerFeePercent:number;lootChancePercent:number;
    lootProtectTier:number;ransomHours:number;ransomPercent:number;pairDailyLimit:number;modes:DuelMode[]};
  honorShop:{key:string;kind:'TITLE'|'FRAME';name:string;marks:number;owned:boolean;using:boolean}[];lootsLost:(Loot&{winner:Card})[];lootsWon:(Loot&{loser:Card})[];
  friends:(Card&{blocked:string|null})[];received:{id:number;from:Card;expiresAt:string;mode:DuelMode;wager:string}[];sent:{id:number;to:Card;expiresAt:string;mode:DuelMode;wager:string}[];duel:Duel|null};
type HistoryRow={id:number;opponent:Card;outcome:DuelOutcome;won:boolean;draw:boolean;rounds:number;finishedAt:string;mode:DuelMode;stake:string;fee:string;honorDelta:number;
  loot:{item:string;upgradeTier:number;status:string;mine:boolean}|null};
type Ranking={tier:number|null;items:(Card&{pvpWins:number;pvpLosses:number;honorPoints:number})[]};
const gold=(v:string|bigint)=>BigInt(v).toLocaleString('pt-BR');
const lootStatus:Record<string,string>={OPEN:'pode ser resgatado',RANSOMED:'resgatado',EXPIRED:'prazo de resgate vencido',GONE:'já usado pelo vencedor'};
// O que está em jogo num desafio, em uma frase (convites recebidos e enviados).
function stakeLine(mode:DuelMode,wager:string,r:State['rules']){
  if(mode==='GOLD')return `Aposta de até ${gold(wager)} de ouro de cada um (no aceite, o teto é ${r.wagerMaxPercent}% do ouro do mais pobre; taxa da arena ${r.wagerFeePercent}%).`;
  if(mode==='LOOT')return `Espólio: quem perder tem ${r.lootChancePercent}% de chance de perder UM item da mochila (nunca equipado, favorito, +${r.lootProtectTier} ou mais, ou raro). Dá para resgatar em ${r.ransomHours} h.`;
  return 'Só honra: ninguém perde ouro nem itens.';
}
const n=(v:number)=>v.toLocaleString('pt-BR');
const Avatar=({c,size=36}:{c:Card;size?:number})=><Icon name={c.profileAvatar??c.profileEmblem??'Hero'} size={size}/>;
// Prazo em texto curto: "em 3 h", "em 12 min", "agora".
function relative(ms:number){if(ms<=0)return 'agora';const m=Math.ceil(ms/60000);if(m<60)return `em ${m} min`;const h=Math.round(m/60);return h<48?`em ${h} h`:`em ${Math.round(h/24)} dias`;}
const groups=[{key:'attack',label:'Ataque',icon:'Logout Block Icon',actions:['ATTACK','TRIPLE_HIT','FIFTH_HIT','INTERRUPT']},{key:'support',label:'Suporte',icon:'Guardian Shield',actions:['HEAL','DEFEND_SHIELD']}] as const;
const actionIcon:Partial<Record<DuelAction,string>>={HEAL:'Health Potion',DEFEND_SHIELD:'Mastermind Shield',INTERRUPT:'Fire Sword',FLEE:'Boots of Haste'};
const vocationIcon:Record<string,string>={KNIGHT:'Sword',PALADIN:'Bow',SORCERER:'Wand of Vortex',DRUID:'Snakebite Rod'};

// Duelo entre amigos: desafios, a luta em rodadas com prazo, histórico e ranking de honra. A tela só mostra o que o servidor devolve.
export default function DuelPanel({hero,openProfile}:{hero:Hero;openProfile:(name:string)=>void}){
  const [s,setS]=useState<State|null>(null),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState(''),[clock,setClock]=useState(Date.now());
  const [report,setReport]=useState<{id:number;name:string;reason:string}|null>(null);
  const [mode,setMode]=useState<DuelMode>('HONOR'),[wager,setWager]=useState(''),[lootOk,setLootOk]=useState(false),[acceptOk,setAcceptOk]=useState(0);
  const [surrender,setSurrender]=useState(false),[hidden,setHidden]=useState(0),[tier,setTier]=useState(''),[ranking,setRanking]=useState<Ranking|null>(null),[refresh,setRefresh]=useState(0);
  const offset=useRef(0);
  const load=useCallback(async()=>{try{const r=await api<State>(`/characters/${hero.id}/duel${q.trim()?`?q=${encodeURIComponent(q.trim())}`:''}`);offset.current=new Date(r.now).getTime()-Date.now();setS(r);}catch(e){setError(msg(e));}},[hero.id,q]);
  const d=s?.duel&&s.duel.id!==hidden?s.duel:null,fighting=d?.status==='FIGHTING';
  // Atualiza sozinho: rápido durante o duelo ou com desafios abertos; devagar no resto do tempo.
  const live=fighting||!!s?.received.length||!!s?.sent.length;
  useEffect(()=>{void load();const t=setInterval(()=>void load(),live?5000:20000);return()=>clearInterval(t);},[load,live]);
  useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),15000);return()=>clearInterval(t);},[]);
  useEffect(()=>{void api<Ranking>(`/duel/ranking${tier?`?tier=${tier}`:''}`).then(setRanking).catch(()=>{});},[tier,refresh]);
  const history=usePaged<HistoryRow>(`/characters/${hero.id}/duel/history`,refresh);
  const finishedId=d&&!fighting?d.id:0;
  useEffect(()=>{if(finishedId)setRefresh(r=>r+1);},[finishedId]);
  async function act(path:string,body:unknown={}){if(busy)return;setBusy(true);setError('');setOk('');
    try{const r=await api<{message?:string}>(`/characters/${hero.id}/duel/${path}`,body);if(r?.message)setOk(r.message);await load();}catch(e){setError(msg(e));await load();}finally{setBusy(false);setSurrender(false);}}
  // Denúncia de um duelo: abre um atendimento do tipo denúncia (Suporte) com o número do duelo.
  async function sendReport(){if(!report||busy)return;setBusy(true);setError('');setOk('');
    try{await api('/support/tickets',{kind:'REPORT',reportedName:report.name,subject:`Duelo #${report.id}`,body:`Duelo #${report.id} contra ${report.name}: ${report.reason.trim()}`});setOk('Denúncia enviada. Acompanhe a resposta em Suporte.');setReport(null);}
    catch(e){setError(msg(e));}finally{setBusy(false);}}
  // Prazo vencido com a tela aberta: fecha a rodada (quem não escolheu, defende). A varredura do servidor faz o mesmo a cada minuto.
  const left=d?.deadlineAt?new Date(d.deadlineAt).getTime()-(clock+offset.current):0,advanced=useRef(0);
  useEffect(()=>{if(d&&fighting&&left<=0&&advanced.current!==d.round){advanced.current=d.round;void api(`/characters/${hero.id}/duel/${d.id}/advance`,{round:d.round}).catch(()=>{}).then(()=>load());}},[left<=0,d?.round,d?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if(!s)return <section className="panel">{error?<p className="error" role="alert">{error}</p>:'Abrindo a arena…'}</section>;
  // Por que o botão Desafiar está desligado (além do motivo de cada amigo, que aparece na linha dele).
  const blockedWhy=s.today>=s.rules.dailyLimit?`Você já duelou ${s.rules.dailyLimit} vezes nas últimas 24 horas.`
    :mode==='GOLD'&&!wager?'Digite quanto quer apostar para liberar o Desafiar.'
    :mode==='LOOT'&&!lootOk?'Marque que entende o risco do espólio para liberar o Desafiar.':'';
  return <div className="duel-page">
    <section className="panel intro-banner duel-intro"><div><span className="eyebrow">DUELO</span><h2>Arena de Capriel</h2>
      <p>Desafie um amigo para um duelo de honra. Os dois escolhem em segredo o golpe de cada rodada; quem tem mais agilidade age primeiro.</p>
      <p className="muted">Vida, mana e XP nunca mudam. No duelo de Honra nada se perde; valendo ouro ou espólio, o desafio diz o que está em jogo antes de você aceitar.</p></div>
      <div className="duel-record" aria-label="Seu registro de duelos"><div><b>{s.record.wins}</b><span>vitórias</span></div><div><b>{s.record.losses}</b><span>derrotas</span></div><div><b>{s.record.streak}</b><span>em sequência</span></div>
        <div><b>{n(s.record.honor)}</b><span>honra</span></div><div><b>{n(s.record.marks)}</b><span>marcas</span></div></div></section>
    <Feedback error={error} ok={ok}/>
    {s.eligible&&<section className="panel notice">{s.eligible}</section>}

    {d&&<DuelView d={d} hero={hero} left={left} busy={busy} surrender={surrender} setSurrender={setSurrender} openProfile={openProfile}
      choose={a=>void act(`${d.id}/act`,{round:d.round,action:a})} forfeit={()=>void act(`${d.id}/forfeit`)} reload={()=>void load()} close={()=>setHidden(d.id)}
      ransom={id=>void act(`loot/${id}/ransom`)}/>}

    {s.lootsLost.length>0&&<section className="panel duel-loots"><div className="section-title"><h2>Itens perdidos no espólio</h2><span>{s.lootsLost.length}</span></div>
      <p className="muted">Pague o preço ao vencedor e o item volta para a sua mochila. Se ele usar, vender ou anunciar o item antes, o resgate acaba.</p>
      {s.lootsLost.map(l=><div className="market-row" key={l.id}><Icon name={l.item} src={l.sprite} size={36}/><div><h3>{l.item}{l.upgradeTier?` +${l.upgradeTier}`:''}</h3>
        <p>Levado por {l.winner.name} · resgate {relative(new Date(l.expiresAt).getTime()-(clock+offset.current)).replace('em ','vence em ')}</p></div>
        <button className="primary" disabled={busy||BigInt(s.gold)<BigInt(l.ransomPrice)} onClick={()=>void act(`loot/${l.id}/ransom`)}>Resgatar por {gold(l.ransomPrice)} de ouro</button></div>)}</section>}
    {s.lootsWon.length>0&&<section className="panel duel-loots"><div className="section-title"><h2>Espólios que você levou</h2><span>{s.lootsWon.length}</span></div>
      <p className="muted">O antigo dono pode resgatar cada um pagando o preço de loja. Usar, vender ou anunciar o item encerra o resgate.</p>
      {s.lootsWon.map(l=><div className="market-row" key={l.id}><Icon name={l.item} src={l.sprite} size={36}/><div><h3>{l.item}{l.upgradeTier?` +${l.upgradeTier}`:''}</h3>
        <p>De {l.loser.name} · ele pode resgatar por {gold(l.ransomPrice)} de ouro {relative(new Date(l.expiresAt).getTime()-(clock+offset.current)).replace('em ','até daqui a ')}</p></div></div>)}</section>}

    {s.received.length>0&&<section className="panel"><div className="section-title"><h2>Desafios recebidos</h2><span>{s.received.length}</span></div>
      {s.received.map(i=><div className="market-row" key={i.id}><Avatar c={i.from}/><div><h3><button className="link-button" onClick={()=>openProfile(i.from.name)}>{i.from.name}</button> desafia você</h3>
        <p>{classLabel(i.from.vocation,i.from.classTier)} · Nv. {i.from.level} · vale {relative(new Date(i.expiresAt).getTime()-(clock+offset.current)).replace('em ','por mais ')}</p>
        <p className={i.mode==='HONOR'?'duel-stake':'duel-stake risky'}><b>EM JOGO: {modeLabels[i.mode].toUpperCase()}</b> {stakeLine(i.mode,i.wager,s.rules)}</p>
        {i.mode==='LOOT'&&<label className="duel-confirm"><input type="checkbox" checked={acceptOk===i.id} onChange={e=>setAcceptOk(e.target.checked?i.id:0)}/> Entendo que posso perder um item da mochila.</label>}</div>
        <button className="primary" disabled={busy||fighting||(i.mode==='LOOT'&&acceptOk!==i.id)} title={fighting?'Termine seu duelo atual antes':''} onClick={()=>void act(`invites/${i.id}/accept`)}>Aceitar</button>
        <button disabled={busy} onClick={()=>void act(`invites/${i.id}/decline`)}>Recusar</button></div>)}</section>}

    {s.sent.length>0&&<section className="panel"><div className="section-title"><h2>Desafios enviados</h2><span>{s.sent.length}</span></div>
      {s.sent.map(i=><div className="market-row" key={i.id}><Avatar c={i.to}/><div><h3>{i.to.name}</h3><p>{modeLabels[i.mode]}{i.mode==='GOLD'?` · até ${gold(i.wager)} de ouro`:''} · esperando resposta · vence {relative(new Date(i.expiresAt).getTime()-(clock+offset.current))}</p></div>
        <button disabled={busy} onClick={()=>void act(`invites/${i.id}/cancel`)}>Retirar desafio</button></div>)}</section>}

    {!fighting&&!s.eligible&&<section className="panel"><div className="section-title"><h2>Desafiar um amigo</h2><span>{s.today}/{s.rules.dailyLimit} hoje</span></div>
      <p className="muted">Só amigos, de outras contas, com até {s.rules.levelBandPercent}% de diferença de nível. O desafio vale {s.rules.inviteHours} h; cada rodada, {s.rules.roundHours} h (quem não escolhe a tempo defende, e duas rodadas seguidas sem voltar é derrota).</p>
      <div className="duel-modes" role="radiogroup" aria-label="O que está em jogo">{s.rules.modes.map(m=><button key={m} type="button" role="radio" aria-checked={mode===m} className={mode===m?'active-chip':''} onClick={()=>{setMode(m);setLootOk(false);}}>
        <Icon name={m==='HONOR'?'Warlord Sword':m==='GOLD'?'Gold Coin':'Backpack'} size={22}/><span>{modeLabels[m]}</span></button>)}</div>
      <p className={mode==='HONOR'?'duel-stake':'duel-stake risky'}>{modeHelp[mode]}{mode!=='HONOR'?` Até ${s.rules.pairDailyLimit} duelos assim com o mesmo amigo por dia.`:''}</p>
      {mode==='GOLD'&&<div className="duel-wager">
        <label className="price-label">Aposta proposta (ouro)<input inputMode="numeric" value={wager} maxLength={16} onChange={e=>setWager(e.target.value.replace(/\D/g,''))} placeholder="Quanto quer apostar?"/></label>
        <div className="duel-wager-quick" aria-label="Valores rápidos">{[1,5,10].map(pc=>{const v=BigInt(s.gold)*BigInt(pc)/100n;return v>0n&&<button key={pc} type="button" onClick={()=>setWager(v.toString())}>{pc}% · {gold(v)}</button>;})}</div>
        <p className="muted">Você tem {gold(s.gold)} de ouro. No aceite, a aposta de cada um vira no máximo {s.rules.wagerMaxPercent}% do ouro do mais pobre dos dois (pode ficar menor que o proposto); a taxa da arena é {s.rules.wagerFeePercent}% do pote.</p>
        {wager&&BigInt(wager)>BigInt(s.gold)&&<p className="error" role="alert">Você não tem esse ouro: tem {gold(s.gold)}.</p>}</div>}
      {mode==='LOOT'&&<label className="duel-confirm"><input type="checkbox" checked={lootOk} onChange={e=>setLootOk(e.target.checked)}/> Entendo que, se eu perder, posso perder um item da minha mochila ({s.rules.lootChancePercent}% de chance).</label>}
      <input className="mission-search" aria-label="Buscar amigo" placeholder="Buscar amigo pelo nome…" value={q} maxLength={24} onChange={e=>setQ(e.target.value)}/>
      {s.friends.map(f=><div className="market-row" key={f.id}><Avatar c={f}/><div><h3><button className="link-button" onClick={()=>openProfile(f.name)}>{f.name}</button></h3>
        <p>{classLabel(f.vocation,f.classTier)} · Nv. {f.level}</p>{f.blocked&&<p className="muted">{f.blocked}</p>}</div>
        <button className="primary" disabled={busy||!!f.blocked||s.today>=s.rules.dailyLimit||(mode==='GOLD'&&(!wager||BigInt(wager)>BigInt(s.gold)))||(mode==='LOOT'&&!lootOk)} onClick={()=>void act('challenge',{name:f.name,mode,...(mode==='GOLD'?{wager}:{})})}>Desafiar</button></div>)}
      {s.friends.length>0&&blockedWhy&&<p className="muted duel-why">{blockedWhy}</p>}
      {!s.friends.length&&<p className="muted">{q.trim()?'Nenhum amigo com esse nome.':'Você ainda não tem amigos para desafiar. Adicione amigos na seção Amigos, logo abaixo.'}</p>}</section>}
    <FriendsBox hero={hero} changed={()=>void load()} openProfile={openProfile}/>

    <section className="panel"><div className="section-title"><h2>Seus duelos</h2><span>{history.total}</span></div>
      {history.error&&<p className="error" role="alert">{history.error}</p>}
      {history.items.map(h=><div className="market-row" key={h.id}><Avatar c={h.opponent}/><div><h3>{h.draw?'Empate':h.won?'Vitória':'Derrota'} contra <button className="link-button" onClick={()=>openProfile(h.opponent.name)}>{h.opponent.name}</button></h3>
        <p>{outcomeLabels[h.outcome]} · {h.rounds} {h.rounds===1?'rodada':'rodadas'} · {new Date(h.finishedAt).toLocaleDateString('pt-BR')}{h.honorDelta?` · ${h.draw?'':h.won?'+':'−'}${h.honorDelta} de honra`:''}</p>
        {h.mode!=='HONOR'&&<p>{modeLabels[h.mode]}{h.mode==='GOLD'&&BigInt(h.stake)>0n?(h.draw?`: aposta de ${gold(h.stake)} devolvida`:h.won?`: +${gold(BigInt(h.stake)*2n-BigInt(h.fee))} de ouro (taxa ${gold(h.fee)})`:`: −${gold(h.stake)} de ouro`):''}
          {h.mode==='LOOT'?(h.loot?`: ${h.loot.mine?'você levou':'você perdeu'} ${h.loot.item}${h.loot.upgradeTier?` +${h.loot.upgradeTier}`:''} (${lootStatus[h.loot.status]??h.loot.status})`:': nenhum item mudou de dono'):''}</p>}</div>
        <span className={h.draw?'tag':h.won?'tag':'tag danger'}>{h.draw?'EMPATE':h.won?'VITÓRIA':'DERROTA'}</span>
        <button type="button" className="link-button" onClick={()=>setReport({id:h.id,name:h.opponent.name,reason:''})}>Denunciar</button>
        {report?.id===h.id&&<form className="duel-report" onSubmit={e=>{e.preventDefault();void sendReport();}}><label>O que aconteceu neste duelo? A equipe vai analisar.
          <textarea value={report.reason} maxLength={1500} rows={3} onChange={e=>setReport({...report,reason:e.target.value})}/></label>
          <div className="inline-actions"><button className="primary" disabled={busy||report.reason.trim().length<5}>Enviar denúncia</button><button type="button" onClick={()=>setReport(null)}>Cancelar</button></div></form>}</div>)}
      {!history.items.length&&!history.loading&&<p className="muted">Nenhum duelo terminado ainda.</p>}
      <Pager page={history.page} pages={history.pages} onPage={p=>void history.go(p)} busy={history.loading}/></section>

    <section className="panel"><div className="section-title"><h2>Honra</h2>
      <select aria-label="Classe do ranking" value={tier} onChange={e=>setTier(e.target.value)}><option value="">Todas as classes</option>
        {classNames[baseVocation(hero.vocation)].map((name,i)=><option key={name} value={i+1===1?'0':String(i+1)}>{i+1}ª classe</option>)}</select></div>
      <p className="muted">Os 10 aventureiros com mais pontos de honra (vencer quem tem mais honra vale mais). Quem esconde a fama no perfil não aparece.</p>
      {ranking?.items.map((r,i)=><div className="market-row" key={r.id}><b className="duel-rank">{i+1}º</b><Avatar c={r}/><div><h3><button className="link-button" onClick={()=>openProfile(r.name)}>{r.name}</button></h3>
        <p>{classLabel(r.vocation,r.classTier)} · Nv. {r.level}</p></div><span>{n(r.honorPoints)} de honra · {r.pvpWins}V/{r.pvpLosses}D</span></div>)}
      {ranking&&!ranking.items.length&&<p className="muted">Ninguém venceu um duelo nesta classe ainda. A arena espera o primeiro nome.</p>}</section>

    <section className="panel"><div className="section-title"><h2>Loja da honra</h2><span>{n(s.record.marks)} marcas</span></div>
      <p className="muted">Marcas de honra vêm de cada duelo (mais na vitória) e só compram aparência: títulos e moldura. Nunca itens, ouro ou atributos.</p>
      {s.honorShop.map(h=><div className="market-row" key={h.key}><Icon name={h.kind==='TITLE'?'Warlord Sword':'Crown'} size={32}/><div><h3>{h.name}</h3><p>{h.kind==='TITLE'?'Título no perfil':'Moldura do retrato'} · {n(h.marks)} marcas</p></div>
        {h.using?<span className="tag">EM USO</span>:h.owned?<button disabled={busy} onClick={()=>void act('honor/use',{key:h.key})}>Usar</button>
          :<button className="primary" disabled={busy||s.record.marks<h.marks} onClick={()=>void act('honor/buy',{key:h.key})}>Comprar</button>}</div>)}</section>
  </div>;
}

function Bar({label,v,max,kind=''}:{label:string;v:number;max:number;kind?:string}){return <div className="meter"><div><span>{label}</span><b>{n(v)} / {n(max)}</b></div><progress className={kind} aria-label={label} max={Math.max(1,max)} value={v}/></div>;}
function Fighter({f,you,openProfile}:{f:Side;you:boolean;openProfile:(n:string)=>void}){
  return <div><Icon name={f.character.profileAvatar??f.character.profileEmblem??vocationIcon[baseVocation(f.vocation)]??'Hero'} size={72}/>
    <h3><button className="link-button duel-name" onClick={()=>openProfile(f.character.name)}>{f.character.name}</button></h3>
    <Bar label={you?'Sua vida':'Vida'} v={f.hp} max={f.maxHp}/><Bar label={you?'Sua mana':'Mana'} kind="mana" v={f.mana} max={f.maxMana}/>
    <p>{classLabel(f.vocation,f.character.classTier)} · Nv. {f.character.level}</p></div>;
}
function DuelView({d,hero,left,busy,surrender,setSurrender,choose,forfeit,reload,close,ransom,openProfile}:{d:Duel;hero:Hero;left:number;busy:boolean;surrender:boolean;setSurrender:(v:boolean)=>void;
  choose:(a:DuelAction)=>void;forfeit:()=>void;reload:()=>void;close:()=>void;ransom:(id:number)=>void;openProfile:(n:string)=>void}){
  const fighting=d.status==='FIGHTING',last=d.rounds.at(-1),pick=d.actions.find(a=>a.key===d.me.action);
  const result=d.winnerId===null?'Empate':d.winnerId===hero.id?'Vitória!':'Derrota';
  return <section className="arena duel-arena">
    <div className="arena-head"><span className="eyebrow">{fighting?`${modeLabels[d.mode].toUpperCase()}${d.mode==='GOLD'?` · POTE ${gold(BigInt(d.stake)*2n)}`:''} · ${d.foe.ready?'O oponente já escolheu':'O oponente está escolhendo'}`:outcomeLabels[d.outcome].toUpperCase()}</span>
      <b>{fighting?`Rodada ${d.round} · resolve ${relative(left)}`:`Rodada ${d.round}`}</b></div>
    <div className="fighters"><Fighter f={d.me} you openProfile={openProfile}/><div className="versus"><Icon name="Logout Block Icon" size={54}/><span>VS</span></div><Fighter f={d.foe} you={false} openProfile={openProfile}/></div>
    {fighting?<>
      {d.me.missed>0&&<p className="notice">Você não escolheu na rodada passada e só defendeu. Mais uma rodada sem escolher é derrota.</p>}
      {pick?<div className="duel-waiting" role="status"><Icon name={actionIcon[pick.key]??vocationIcon[baseVocation(d.me.vocation)]??'Sword'} size={32}/><div><b>Você escolheu {pick.label}.</b>
        <p className="muted">{d.foe.ready?'Os dois escolheram; a rodada está sendo resolvida.':`Aguardando ${d.foe.character.name}. A rodada fecha ${relative(left)}; se ele não escolher, só defende.`}</p></div>
        <button type="button" disabled={busy} onClick={reload}>Atualizar</button></div>
      :<><h2 className="arena-title">Seu golpe nesta rodada</h2>
        <div className="skill-groups duel-skills">{groups.map(g=><div key={g.key} role="group" aria-label={g.label} className={`skill-group ${g.key}`}><div className="skill-head"><Icon name={g.icon} size={26}/><span>{g.label}</span></div>
          <div className="skill-grid">{g.actions.map(key=>{const a=d.actions.find(x=>x.key===key)!;return <button key={key} type="button" className="skill" disabled={busy||d.me.mana<a.mana} title={a.help} onClick={()=>choose(key)}>
            <Icon name={actionIcon[key]??vocationIcon[baseVocation(d.me.vocation)]??'Sword'} size={34}/><b>{a.label}</b><small>{a.mana?`${a.mana} MP`:'Livre'}</small><span className="skill-help">{a.help}</span></button>;})}</div></div>)}</div></>}
      <div className="duel-surrender">{surrender?<><span>Render-se entrega a vitória a {d.foe.character.name}. Tem certeza?</span>
        <button type="button" className="danger-button" disabled={busy} onClick={forfeit}>Sim, me rendo</button><button type="button" disabled={busy} onClick={()=>setSurrender(false)}>Continuar lutando</button></>
        :<button type="button" disabled={busy} onClick={()=>setSurrender(true)}><Icon name="Haste Icon" size={20}/> Render-se</button>}</div></>
    :<div className="battle-result"><h2>{result}</h2><p>{d.winnerId===hero.id?`Você venceu ${d.foe.character.name}.`:d.winnerId===null?`Você e ${d.foe.character.name} terminaram sem vencedor.`:`${d.foe.character.name} venceu o duelo.`} {outcomeLabels[d.outcome]}.</p>
      {d.honorDelta>0&&<p>{d.winnerId===hero.id?`+${d.honorDelta}`:`−${d.honorDelta}`} de honra.</p>}
      {d.mode==='GOLD'&&BigInt(d.stake)>0n&&<p>{d.winnerId===null?`A aposta de ${gold(d.stake)} voltou para cada um.`:d.winnerId===hero.id?`Você levou o pote: +${gold(BigInt(d.stake)*2n-BigInt(d.fee))} de ouro (taxa da arena ${gold(d.fee)}).`:`Você perdeu a aposta de ${gold(d.stake)} de ouro.`}</p>}
      {d.mode==='LOOT'&&d.winnerId!==null&&<p>{d.loot?(d.loot.winnerId===hero.id?`Espólio: você levou ${d.loot.item}${d.loot.upgradeTier?` +${d.loot.upgradeTier}`:''}.`:`Espólio: você perdeu ${d.loot.item}${d.loot.upgradeTier?` +${d.loot.upgradeTier}`:''}.`)+(d.loot.status!=='OPEN'?` (${lootStatus[d.loot.status]??d.loot.status})`:''):'Nenhum item mudou de dono desta vez.'}</p>}
      <div className="inline-actions battle-result-actions">{d.loot&&d.loot.status==='OPEN'&&d.loot.winnerId!==hero.id&&<button className="primary" disabled={busy} onClick={()=>ransom(d.loot!.id)}>Resgatar por {gold(d.loot.ransomPrice)} de ouro</button>}<button className="primary" onClick={close}>Voltar à arena</button></div></div>}
    {last&&<RoundCard r={last} meId={hero.id} d={d}/>}
    {d.rounds.length>1&&<details className="duel-rounds"><summary>Ver todas as rodadas ({d.rounds.length})</summary>
      <table className="admin-table turn-table"><thead><tr><th>Rodada</th><th>Você</th><th>{d.foe.character.name}</th><th>Sua vida</th></tr></thead><tbody>
        <LimitedRows items={[...d.rounds].reverse()} cols={4} render={r=>{const me=r.moves.find(m=>m.characterId===hero.id)!,foe=r.moves.find(m=>m.characterId!==hero.id)!;
          return <tr key={r.round}><td>{r.round}</td><td>{line(me,duelActionLabels(d.me.vocation))}</td><td>{line(foe,duelActionLabels(d.foe.vocation))}</td><td>{n(me.hp)} / {n(me.maxHp)}</td></tr>;}}/></tbody></table></details>}
  </section>;
}
// Uma linha curta do que cada lado fez na rodada.
function line(m:DuelMove,labels:Record<DuelAction,string>){
  const label=labels[m.action]??actionName[m.action];
  if(m.auto)return 'Não escolheu: só defendeu';
  if(m.action==='FLEE')return 'Rendeu-se';
  if(m.interrupted)return `${label}: cortado antes de sair`;
  if(!m.acted)return 'Caiu antes de agir';
  if(m.action==='HEAL')return `${label}: +${n(m.healed)} de vida`;
  if(m.dodged)return `${label}: esquivado`;
  return `${label}: ${n(m.dealt)} de dano${m.crit?' (crítico!)':''}`;
}
// Nome genérico, só se a vocação não trouxer um.
const actionName:Record<DuelAction,string>={ATTACK:'Ataque',TRIPLE_HIT:'Golpe forte',FIFTH_HIT:'Golpe máximo',HEAL:'Curar',DEFEND_SHIELD:'Defender',INTERRUPT:'Interromper',FLEE:'Render-se'};
function RoundCard({r,meId,d}:{r:DuelRoundRecord;meId:number;d:Duel}){
  const me=r.moves.find(m=>m.characterId===meId)!,foe=r.moves.find(m=>m.characterId!==meId)!;
  const side=(m:DuelMove,who:string,name:string,mine:boolean)=>{const label=mine?d.actions.find(a=>a.key===m.action)?.label??actionName[m.action]:duelActionLabels(d.foe.vocation)[m.action];
    const big=m.auto?<span>Guarda</span>:m.action==='FLEE'?<span>Rendição</span>:m.interrupted?<span>Cortado</span>:!m.acted?<span>Caído</span>:m.action==='HEAL'?<span className="heal">+{n(m.healed)}</span>:m.dodged?<span>Esquiva!</span>:<span className="hit">−{n(m.dealt)}</span>;
    const tag=m.auto?'não escolheu a tempo':m.action==='FLEE'?'baixou a arma':m.interrupted?'golpe interrompido':!m.acted?'caiu antes de agir':m.action==='HEAL'?'vida recuperada':m.dodged?'o golpe errou':`${mine?'no oponente':'em você'}${m.crit?' · crítico!':''}`;
    return <article className={`turn-side ${mine?'hero-side':'foe-side'} ${m.crit?'crit':''}`}><Icon name={actionIcon[m.action]??'Sword'} size={40}/>
      <div><small>{who} · {name}{m.first?' · agiu primeiro':''}</small><b>{m.auto?'Defender':label}</b><p className="turn-number">{big}</p><p className="turn-tag">{tag}</p></div></article>;};
  return <div className="turn-log" aria-live="polite"><div className="turn-head"><h3>Última rodada · Rodada {r.round}</h3></div>
    <div className="turn-duel">{side(me,'Seu golpe',d.me.character.name,true)}<span className="turn-vs" aria-hidden="true"><Icon name="Logout Block Icon" size={27}/></span>{side(foe,'Golpe do oponente',d.foe.character.name,false)}</div>
    {r.lines.length>0&&<div className="battle-log duel-lines">{r.lines.map((l,i)=><p key={i}>{l}</p>)}</div>}</div>;
}
