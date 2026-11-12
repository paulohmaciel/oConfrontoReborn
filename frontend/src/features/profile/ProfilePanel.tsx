import {useEffect,useState} from 'react';
import AskReason from '../../ui/AskReason';
import {api} from '../../lib/api';
import type {Hero,Perform} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import {Pager,usePaged} from '../../ui/Pager';
import {classLabel} from '../../../../shared/adventure';
import {titleName} from '../../../../shared/premium';
import {freeAvatars,premiumAvatars,limits} from '../../../../shared/community';
type Card={id:number;name:string;level:number;vocation:string;classTier:number;profileAvatar:string|null;profileEmblem:string|null};
type DuelRecord={wins:number;losses:number;honor:number;streak:number;recent:{id:number;mode:string;outcome:string;finishedAt:string|null;result:'WIN'|'LOSS'|'DRAW';foe:string}[]};
type Profile={profile:Card&{profileTitle:string|null;profileFrame:string|null;profileAbout:string|null;profileBio:string|null};duels:DuelRecord|null;owner:boolean;sameAccount:boolean;friendCount:number;scrapCount:number;testimonialCount:number;
  relation:{id:number;status:string;incoming:boolean}|null};
type Scrap={id:number;text:string;createdAt:string;author:Card};type Testimonial=Scrap&{status:string};type Visit={visitedAt:string;visitor:Card};
type Mine={id:number;profileAvatar:string|null;profileAbout:string|null;profileHideVisits:boolean;premium:boolean;aboutLimit:number;incoming:{id:number;from:Card}[];outgoing:{id:number;to:Card}[];pendingTestimonials:number};
type Section='scraps'|'testimonials'|'visits';
const date=(d:string)=>new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
const Avatar=({c,size=40}:{c:Card;size?:number})=><Icon name={c.profileAvatar??c.profileEmblem??'Hero'} size={size}/>;
// Perfil de comunidade (estilo Orkut): cartão, amigos, recados, depoimentos e, no próprio perfil, visitas e pedidos.
export default function ProfilePanel({hero,name,openProfile,perform}:{hero:Hero;name:string;openProfile:(name:string)=>void;perform:Perform}){
  const [p,setP]=useState<Profile|null>(null),[mine,setMine]=useState<Mine|null>(null),[error,setError]=useState(''),[section,setSection]=useState<Section>('scraps'),[editing,setEditing]=useState(false),[version,setVersion]=useState(0);
  // Listas do perfil em páginas de 10; `version` recarrega a página atual depois de cada ação.
  const list=(kind:string)=>`/community/profiles/${encodeURIComponent(name)}/${kind}?as=${hero.id}`,friends=usePaged<Card>(list('friends'),version);
  const load=async()=>{try{const r=await api<Profile>(`/community/profiles/${encodeURIComponent(name)}?as=${hero.id}`);setP(r);setError('');setVersion(v=>v+1);if(r.owner)setMine(await api<Mine>(`/characters/${hero.id}/community`));}catch(e){setError(e instanceof Error?e.message:'Perfil indisponível.');setP(null);}};
  useEffect(()=>{setSection('scraps');setEditing(false);void load();},[name,hero.id]);
  // Ações da comunidade recarregam o perfil depois de concluídas.
  const act=(path:string,body:unknown,done?:()=>void)=>perform(async()=>{const r=await api(`/characters/${hero.id}/community/${path}`,body);done?.();await load();return r;});
  return <div className="profile-page">
    <SearchBox openProfile={openProfile}/>
    {error&&<section className="panel"><p className="error" role="alert">{error}</p></section>}
    {p&&<div className="profile-grid">
      <aside className="profile-side">
        <section className={`panel profile-card-main ${p.profile.profileFrame?`frame-${p.profile.profileFrame}`:''}`}>
          <div className="crest profile-avatar"><Avatar c={p.profile} size={72}/></div>
          <h2>{p.profile.name}</h2>{p.profile.profileTitle&&<small className="hero-title">{titleName(p.profile.profileTitle)}</small>}
          <p className="muted">{classLabel(p.profile.vocation,p.profile.classTier)} · Nível {p.profile.level}</p>
          {(p.profile.profileAbout||p.profile.profileBio)&&<p className="profile-about">{p.profile.profileAbout??p.profile.profileBio}</p>}
          {p.owner?<button onClick={()=>setEditing(!editing)}>{editing?'Fechar edição':'Editar perfil'}</button>:!p.sameAccount&&<FriendButton p={p} act={act}/>}
        </section>
        {editing&&mine&&<Editor mine={mine} act={act} onDone={()=>setEditing(false)}/>}
        {p.duels&&<Duels d={p.duels} owner={p.owner} openProfile={openProfile}/>}
        <section className="panel"><div className="section-title"><h2>Amigos</h2><span>{p.friendCount}</span></div>
          <div className="friend-grid">{friends.items.map(f=><button key={f.id} className="friend" onClick={()=>openProfile(f.name)} title={`${f.name} · Nv. ${f.level}`}><Avatar c={f} size={36}/><small>{f.name}</small></button>)}</div>
          <Pager page={friends.page} pages={friends.pages} busy={friends.loading} onPage={n=>void friends.go(n)}/>
          {!p.friendCount&&<p className="muted">{p.owner?'Você ainda não tem amigos aqui. Procure jogadores na busca acima.':'Ainda sem amigos.'}</p>}
        </section>
      </aside>
      <section className="panel profile-main">
        <div className="profile-tabs" role="tablist">{([['scraps',`Recados (${p.scrapCount})`],['testimonials',`Depoimentos (${p.testimonialCount})${p.owner&&mine?.pendingTestimonials?` · ${mine.pendingTestimonials} novo(s)`:''}`],...(p.owner?[['visits',`Visitas e pedidos${mine&&mine.incoming.length?` (${mine.incoming.length})`:''}`]]:[])] as [Section,string][]).map(([s,l])=><button key={s} role="tab" aria-selected={section===s} className={section===s?'active-chip':''} onClick={()=>setSection(s)}>{l}</button>)}</div>
        {section==='scraps'&&<Scraps p={p} hero={hero} act={act} openProfile={openProfile} path={list('scraps')} version={version}/>}
        {section==='testimonials'&&<Testimonials p={p} act={act} openProfile={openProfile} path={list('testimonials')} version={version}/>}
        {section==='visits'&&p.owner&&mine&&<Visits mine={mine} act={act} openProfile={openProfile} path={list('visitors')} version={version}/>}
      </section>
    </div>}
  </div>;
}
type Act=(path:string,body:unknown,done?:()=>void)=>Promise<void>;
function SearchBox({openProfile}:{openProfile:(n:string)=>void}){
  const [q,setQ]=useState(''),[found,setFound]=useState<Card[]>([]);
  useEffect(()=>{if(q.trim().length<2){setFound([]);return;}const t=setTimeout(()=>void api<Card[]>(`/community/search?q=${encodeURIComponent(q.trim())}`).then(setFound).catch(()=>setFound([])),250);return()=>clearTimeout(t);},[q]);
  return <div className="profile-search"><input aria-label="Procurar jogador" placeholder="Procurar jogador pelo nome…" value={q} maxLength={24} onChange={e=>setQ(e.target.value)}/>
    {found.length>0&&<div className="search-results">{found.map(c=><button key={c.id} onClick={()=>{setQ('');openProfile(c.name);}}><Avatar c={c} size={28}/><span>{c.name}</span><small>{classLabel(c.vocation,c.classTier)} · Nv. {c.level}</small></button>)}</div>}</div>;
}
function FriendButton({p,act}:{p:Profile;act:Act}){
  const r=p.relation;
  if(!r)return <button className="primary" onClick={()=>void act('friends',{to:p.profile.name})}>Adicionar amigo</button>;
  if(r.status==='ACCEPTED')return <button onClick={()=>{if(window.confirm(`Desfazer a amizade com ${p.profile.name}?`))void act(`friends/${r.id}/remove`,{});}}>Amigos ✓</button>;
  if(r.incoming)return <div className="inline-actions"><button className="primary" onClick={()=>void act(`friends/${r.id}/accept`,{})}>Aceitar amizade</button><button onClick={()=>void act(`friends/${r.id}/decline`,{})}>Recusar</button></div>;
  return <button onClick={()=>void act(`friends/${r.id}/remove`,{})}>Pedido enviado · cancelar</button>;
}
const duelResult={WIN:'Venceu',LOSS:'Perdeu para',DRAW:'Empatou com'} as const,duelMode:Record<string,string>={HONOR:'honra',GOLD:'aposta de ouro',LOOT:'espólio'};
// Registro de duelos no perfil: vitórias, derrotas, sequência, honra e os cinco últimos.
function Duels({d,owner,openProfile}:{d:DuelRecord;owner:boolean;openProfile:(name:string)=>void}){
  const total=d.wins+d.losses;
  return <section className="panel profile-duels"><div className="section-title"><h2>Duelos</h2><span>{total?`${Math.round(d.wins*100/total)}% de vitórias`:''}</span></div>
    <dl className="duel-record"><div><dt>Vitórias</dt><dd>{d.wins}</dd></div><div><dt>Derrotas</dt><dd>{d.losses}</dd></div><div><dt>Sequência</dt><dd>{d.streak}</dd></div><div><dt>Honra</dt><dd>{d.honor}</dd></div></dl>
    {d.recent.length?<ul className="duel-recent">{d.recent.map(r=><li key={r.id} className={r.result.toLowerCase()}><span>{duelResult[r.result]} <button className="link-button" onClick={()=>openProfile(r.foe)}>{r.foe}</button></span><small>{duelMode[r.mode]??r.mode}{r.finishedAt?` · ${new Date(r.finishedAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`:''}</small></li>)}</ul>
      :<p className="muted">{owner?'Você ainda não duelou. Desafie um amigo na aba Duelo.':'Ainda sem duelos.'}</p>}
  </section>;
}
function Report({kind,id,act}:{kind:'scrap'|'testimonial';id:number;act:Act}){
  return <AskReason label="Denunciar" question="Por que você está denunciando? A equipe vai analisar." onSubmit={reason=>void act('report',{kind,id,reason})}/>;
}
type ListProps={act:Act;openProfile:(n:string)=>void;path:string;version:number};
function Scraps({p,hero,act,openProfile,path,version}:ListProps&{p:Profile;hero:Hero}){
  const [text,setText]=useState(''),scraps=usePaged<Scrap>(path,version);
  return <>
    <form className="ops-form profile-write" onSubmit={e=>{e.preventDefault();void act('scraps',{to:p.profile.name,text},()=>setText(''));}}>
      <label>{p.owner?'Escrever no seu mural':`Deixar um recado para ${p.profile.name}`} ({text.length}/{limits.scrap})<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={limits.scrap} rows={3} required/></label>
      <button className="primary">Enviar recado</button></form>
    {scraps.items.map(s=><article className="post" key={s.id}><button className="post-avatar" onClick={()=>openProfile(s.author.name)} aria-label={`Perfil de ${s.author.name}`}><Avatar c={s.author}/></button>
      <div><p className="post-head"><button className="link-button" onClick={()=>openProfile(s.author.name)}>{s.author.name}</button> <small>{date(s.createdAt)}</small></p><p className="post-text">{s.text}</p>
        <p className="post-actions">{(p.owner||s.author.id===hero.id)&&<button className="link-button" onClick={()=>{if(window.confirm('Apagar este recado?'))void act(`scraps/${s.id}/delete`,{});}}>Apagar</button>}{s.author.id!==hero.id&&<Report kind="scrap" id={s.id} act={act}/>}</p></div></article>)}
    {!scraps.total&&!scraps.loading&&<p className="empty">Nenhum recado ainda.</p>}<Pager page={scraps.page} pages={scraps.pages} busy={scraps.loading} onPage={n=>void scraps.go(n)}/>
  </>;
}
function Testimonials({p,act,openProfile,path,version}:ListProps&{p:Profile}){
  // O servidor já filtra: o dono recebe também os pendentes; cada página separa os dois grupos.
  const [text,setText]=useState(''),list=usePaged<Testimonial>(path,version);
  const pending=list.items.filter(t=>t.status==='PENDING'),approved=list.items.filter(t=>t.status==='APPROVED');
  return <>
    {!p.owner&&!p.sameAccount&&<form className="ops-form profile-write" onSubmit={e=>{e.preventDefault();void act('testimonials',{to:p.profile.name,text},()=>setText(''));}}>
      <label>Escrever um depoimento sobre {p.profile.name} ({text.length}/{limits.testimonial})<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={limits.testimonial} rows={4} required/></label>
      <p className="muted">O depoimento só aparece depois que {p.profile.name} aprovar. Se você já escreveu um, este substitui o anterior.</p>
      <button className="primary">Enviar depoimento</button></form>}
    {p.owner&&pending.length>0&&<h3 className="profile-subtitle">Esperando sua aprovação</h3>}
    {[...(p.owner?pending:[]),...approved].map(t=><article className={`post ${t.status==='PENDING'?'pending':''}`} key={t.id}><button className="post-avatar" onClick={()=>openProfile(t.author.name)} aria-label={`Perfil de ${t.author.name}`}><Avatar c={t.author}/></button>
      <div><p className="post-head"><button className="link-button" onClick={()=>openProfile(t.author.name)}>{t.author.name}</button> <small>{date(t.createdAt)}</small></p><p className="post-text">{t.text}</p>
        <p className="post-actions">{p.owner&&t.status==='PENDING'&&<><button className="link-button" onClick={()=>void act(`testimonials/${t.id}/approve`,{})}>Aprovar</button><button className="link-button" onClick={()=>void act(`testimonials/${t.id}/reject`,{})}>Recusar</button></>}
          {p.owner&&t.status==='APPROVED'&&<button className="link-button" onClick={()=>{if(window.confirm('Tirar este depoimento do seu perfil?'))void act(`testimonials/${t.id}/delete`,{});}}>Remover</button>}
          {!p.owner&&<Report kind="testimonial" id={t.id} act={act}/>}</p></div></article>)}
    {!list.total&&!list.loading&&<p className="empty">Nenhum depoimento ainda.</p>}<Pager page={list.page} pages={list.pages} busy={list.loading} onPage={n=>void list.go(n)}/>
  </>;
}
function Visits({mine,act,openProfile,path,version}:ListProps&{mine:Mine}){
  const visitors=usePaged<Visit>(path,version);
  return <>
    {mine.incoming.length>0&&<><h3 className="profile-subtitle">Pedidos de amizade</h3><Limited items={mine.incoming} label="Ver mais pedidos" render={f=><div className="market-row" key={f.id}><Avatar c={f.from}/><div><h3><button className="link-button" onClick={()=>openProfile(f.from.name)}>{f.from.name}</button></h3><p>{classLabel(f.from.vocation,f.from.classTier)} · Nv. {f.from.level}</p></div>
      <button className="primary" onClick={()=>void act(`friends/${f.id}/accept`,{})}>Aceitar</button><button onClick={()=>void act(`friends/${f.id}/decline`,{})}>Recusar</button></div>}/></>}
    {mine.outgoing.length>0&&<p className="muted">Pedidos enviados esperando resposta: {mine.outgoing.map(f=>f.to.name).join(', ')}.</p>}
    <h3 className="profile-subtitle">Quem visitou seu perfil</h3>
    <label className="price-label"><input type="checkbox" checked={mine.profileHideVisits} onChange={e=>void act('profile',{hideVisits:e.target.checked})}/> Visitar perfis sem aparecer na lista dos outros</label>
    <div className="friend-grid">{visitors.items.map(v=><button key={v.visitor.id} className="friend" onClick={()=>openProfile(v.visitor.name)} title={date(v.visitedAt)}><Avatar c={v.visitor} size={36}/><small>{v.visitor.name}</small></button>)}</div>
    <Pager page={visitors.page} pages={visitors.pages} busy={visitors.loading} onPage={n=>void visitors.go(n)}/>
    {!visitors.total&&!visitors.loading&&<p className="muted">Ninguém visitou ainda.</p>}
  </>;
}
function Editor({mine,act,onDone}:{mine:Mine;act:Act;onDone:()=>void}){
  const [avatar,setAvatar]=useState(mine.profileAvatar??''),[about,setAbout]=useState(mine.profileAbout??'');
  return <section className="panel"><div className="section-title"><h2>Editar perfil</h2></div>
    <form className="ops-form" onSubmit={e=>{e.preventDefault();void act('profile',{avatar:avatar||null,about},onDone);}}>
      <fieldset className="avatar-picker"><legend>Imagem de perfil</legend>
        <Limited items={freeAvatars} label="Ver mais imagens" render={a=><button type="button" key={a} title={a} aria-label={a} aria-pressed={avatar===a} className={avatar===a?'selected':''} onClick={()=>setAvatar(a)}><Icon name={a} size={36}/></button>}/>
        <Limited items={premiumAvatars} label="Ver mais lendárias" render={a=><button type="button" key={a} title={mine.premium?a:`${a} (Premium)`} aria-label={`${a}${mine.premium?'':' — Premium'}`} aria-pressed={avatar===a} disabled={!mine.premium} className={`${avatar===a?'selected':''} legendary`} onClick={()=>setAvatar(a)}><Icon name={a} size={36}/>{!mine.premium&&<i aria-hidden="true">👑</i>}</button>}/>
      </fieldset>
      {!mine.premium&&<p className="muted">As imagens com coroa (lendárias) e a descrição de até {limits.aboutPremium} caracteres fazem parte do Premium.</p>}
      <label>Sobre você ({about.length}/{mine.aboutLimit})<textarea value={about} onChange={e=>setAbout(e.target.value)} maxLength={mine.aboutLimit} rows={5}/></label>
      <button className="primary">Salvar perfil</button></form></section>;
}
