import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import {smooth} from '../../lib/theme';
import type {Hero,Perform} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {useShowMore,ShowMore} from '../../ui/ShowMore';
import {Pager} from '../../ui/Pager';
import {forumCategories,forumLimits} from '../../../../shared/forum';
type Author={id:number;name:string;level:number;profileAvatar:string|null;profileEmblem:string|null};
type Row={id:number;category:string;title:string;score:number;commentCount:number;solvedCommentId:number|null;pinned:boolean;locked:boolean;createdAt:string;author:Author;myVote:number};
type Comment={id:number;parentId:number|null;deleted:boolean;body:string;score:number;createdAt:string;author:Author|null;myVote:number;mine:boolean};
type Full={post:Row&{body:string;mine:boolean};comments:Comment[]};
type Sort='hot'|'new'|'top';
const ago=(d:string)=>{const m=Math.max(1,Math.round((Date.now()-new Date(d).getTime())/60000));return m<60?`${m} min`:m<1440?`${Math.round(m/60)} h`:`${Math.round(m/1440)} d`;};
const cat=(k:string)=>forumCategories.find(c=>c.key===k);
// Fórum estilo Reddit: lista por categoria (10 por vez), tópico com votos, comentários e "resolvido".
export default function ForumPanel({hero,postId,openPost,openProfile,perform}:{hero:Hero;postId:string;openPost:(id:string)=>void;openProfile:(name:string)=>void;perform:Perform}){
  return postId?<PostView key={postId} hero={hero} id={Number(postId)} openPost={openPost} openProfile={openProfile} perform={perform}/>:<ListView hero={hero} openPost={openPost} openProfile={openProfile} perform={perform}/>;
}
function Votes({score,mine,disabled,onVote}:{score:number;mine:number;disabled?:boolean;onVote:(v:number)=>void}){
  return <div className="votes"><button type="button" aria-label="Votar a favor" aria-pressed={mine===1} className={mine===1?'up on':'up'} disabled={disabled} onClick={()=>onVote(mine===1?0:1)}>▲</button><b>{score}</b>
    <button type="button" aria-label="Votar contra" aria-pressed={mine===-1} className={mine===-1?'down on':'down'} disabled={disabled} onClick={()=>onVote(mine===-1?0:-1)}>▼</button></div>;
}
function Who({a,openProfile}:{a:Author;openProfile:(n:string)=>void}){
  return <button type="button" className="link-button who" onClick={()=>openProfile(a.name)}><Icon name={a.profileAvatar??a.profileEmblem??'Hero'} size={20}/>{a.name}</button>;
}
function ListView({hero,openPost,openProfile,perform}:{hero:Hero;openPost:(id:string)=>void;openProfile:(n:string)=>void;perform:Perform}){
  const [category,setCategory]=useState(''),[sort,setSort]=useState<Sort>('hot'),[q,setQ]=useState(''),[rows,setRows]=useState<Row[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[writing,setWriting]=useState(false);
  const load=async(p=1)=>{const r=await api<{posts:Row[];total:number}>(`/forum?as=${hero.id}&sort=${sort}&page=${p}${category?`&category=${category}`:''}${q.trim().length>=2?`&q=${encodeURIComponent(q.trim())}`:''}`);setRows(r.posts);setTotal(r.total);setPage(p);};
  useEffect(()=>{const t=setTimeout(()=>void load(1),q?250:0);return()=>clearTimeout(t);},[category,sort,q]);
  const vote=(r:Row,value:number)=>perform(async()=>{await api(`/characters/${hero.id}/forum/vote`,{postId:r.id,value});await load(1);},'');
  return <div className="forum">
    <section className="panel forum-head"><div className="section-title"><h2>Fórum de Capriel</h2><button className="primary" onClick={()=>setWriting(!writing)}>{writing?'Cancelar':'Novo tópico'}</button></div>
      {writing&&<NewPost hero={hero} perform={perform} done={id=>{setWriting(false);openPost(String(id));}}/>}
      <div className="forum-cats" role="group" aria-label="Categorias"><button className={category===''?'active-chip':''} onClick={()=>setCategory('')}>Todas</button>{forumCategories.map(c=><button key={c.key} title={c.description} className={category===c.key?'active-chip':''} onClick={()=>setCategory(c.key)}><Icon name={c.icon} size={18}/>{c.name}</button>)}</div>
      <div className="forum-tools"><div role="group" aria-label="Ordenar">{([['hot','Em alta'],['new','Novos'],['top','Mais votados']] as [Sort,string][]).map(([s,l])=><button key={s} className={sort===s?'active-chip':''} onClick={()=>setSort(s)}>{l}</button>)}</div>
        <input aria-label="Buscar tópicos" placeholder="Buscar pelo título…" value={q} maxLength={60} onChange={e=>setQ(e.target.value)}/></div>
    </section>
    <section className="panel">{rows.map(r=><article className="thread" key={r.id}><Votes score={r.score} mine={r.myVote} disabled={r.author.id===hero.id} onVote={v=>void vote(r,v)}/>
      <div className="thread-body"><button className="thread-title" onClick={()=>openPost(String(r.id))}>{r.pinned&&<span className="tag">FIXADO</span>} {r.title}</button>
        <p className="thread-meta"><span className="pill">{cat(r.category)?.name??r.category}</span>{r.solvedCommentId&&<span className="pill solved">✓ Resolvida</span>}{r.locked&&<span className="pill">Trancado</span>} <Who a={r.author} openProfile={openProfile}/> · {ago(r.createdAt)} · <button className="link-button" onClick={()=>openPost(String(r.id))}>{r.commentCount} {r.commentCount===1?'comentário':'comentários'}</button></p></div></article>)}
      {!rows.length&&<p className="empty">{q?'Nenhum tópico com esse título.':'Nenhum tópico aqui ainda. Que tal começar um?'}</p>}
      <Pager page={page} pages={Math.max(1,Math.ceil(total/10))} onPage={p=>{void load(p);window.scrollTo({top:0,behavior:smooth()});}}/></section>
  </div>;
}
function NewPost({hero,perform,done}:{hero:Hero;perform:Perform;done:(id:number)=>void}){
  const [category,setCategory]=useState('duvidas'),[title,setTitle]=useState(''),[body,setBody]=useState('');
  return <form className="ops-form forum-new" onSubmit={e=>{e.preventDefault();void perform(async()=>{const r=await api<{id:number;message:string}>(`/characters/${hero.id}/forum/posts`,{category,title,body});done(r.id);return r.message;});}}>
    <label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}>{forumCategories.map(c=><option key={c.key} value={c.key}>{c.name} — {c.description}</option>)}</select></label>
    <label>Título ({title.length}/{forumLimits.title[1]})<input value={title} onChange={e=>setTitle(e.target.value)} minLength={forumLimits.title[0]} maxLength={forumLimits.title[1]} required/></label>
    <label>Texto ({body.length}/{forumLimits.body[1]})<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={forumLimits.body[0]} maxLength={forumLimits.body[1]} rows={6} required/></label>
    <button className="primary">Publicar</button></form>;
}
function PostView({hero,id,openPost,openProfile,perform}:{hero:Hero;id:number;openPost:(id:string)=>void;openProfile:(n:string)=>void;perform:Perform}){
  const [d,setD]=useState<Full|null>(null),[error,setError]=useState(''),[reply,setReply]=useState<number|null>(null);
  const load=()=>api<Full>(`/forum/posts/${id}?as=${hero.id}`).then(r=>{setD(r);setError('');}).catch(e=>setError(e instanceof Error?e.message:'Tópico indisponível.'));
  useEffect(()=>{void load();},[id]);
  const act=(path:string,body:unknown,message?:string)=>perform(async()=>{const r=await api(`/characters/${hero.id}/${path}`,body);await load();return message??r;},message);
  const tops=d?d.comments.filter(c=>c.parentId===null):[];
  const {visible,rest,more}=useShowMore(tops,id);
  if(error)return <section className="panel"><button className="link-button" onClick={()=>openPost('')}>← Voltar ao fórum</button><p className="error" role="alert">{error}</p></section>;
  if(!d)return <section className="panel"><p>Carregando…</p></section>;
  const p=d.post,isQuestion=p.category==='duvidas';
  const report=(kind:string,itemId:number)=>{const reason=window.prompt('Por que você está denunciando? A equipe vai analisar.');if(reason&&reason.trim().length>=2)void act('community/report',{kind,id:itemId,reason});};
  const commentEl=(c:Comment,child=false)=><article className={`comment ${child?'reply':''} ${p.solvedCommentId===c.id?'solved':''}`} key={c.id}>
    {c.deleted?<p className="muted">[comentário apagado]</p>:<>
      <Votes score={c.score} mine={c.myVote} disabled={c.mine} onVote={v=>void act('forum/vote',{commentId:c.id,value:v},'')}/>
      <div className="comment-body"><p className="thread-meta">{c.author&&<Who a={c.author} openProfile={openProfile}/>} · {ago(c.createdAt)}{p.solvedCommentId===c.id&&<span className="pill solved">✓ Resposta que resolveu</span>}</p>
        <p className="post-text">{c.body}</p>
        <p className="post-actions">{!p.locked&&<button className="link-button" onClick={()=>setReply(reply===c.id?null:c.id)}>Responder</button>}
          {p.mine&&isQuestion&&<button className="link-button" onClick={()=>void act(`forum/posts/${p.id}/solve`,{commentId:p.solvedCommentId===c.id?null:c.id})}>{p.solvedCommentId===c.id?'Desmarcar resolvida':'Marcar como resolvida'}</button>}
          {c.mine&&<button className="link-button" onClick={()=>{if(window.confirm('Apagar este comentário?'))void act(`forum/comment/${c.id}/delete`,{});}}>Apagar</button>}
          {!c.mine&&<button className="link-button" onClick={()=>report('comment',c.id)}>Denunciar</button>}</p>
        {reply===c.id&&<CommentForm onSend={body=>act(`forum/posts/${p.id}/comments`,{body,parentId:c.id}).then(()=>setReply(null))} label={`Responder a ${c.author?.name??'comentário'}`}/>}
        {!child&&<Replies list={d.comments.filter(r=>r.parentId===c.id)} render={r=>commentEl(r,true)}/>}</div></>}
  </article>;
  return <div className="forum">
    <section className="panel"><button className="link-button" onClick={()=>openPost('')}>← Voltar ao fórum</button>
      <article className="thread open"><Votes score={p.score} mine={p.myVote} disabled={p.mine} onVote={v=>void act('forum/vote',{postId:p.id,value:v},'')}/>
        <div className="thread-body"><h2 className="thread-heading">{p.title}</h2>
          <p className="thread-meta"><span className="pill">{cat(p.category)?.name}</span>{p.solvedCommentId&&<span className="pill solved">✓ Resolvida</span>} <Who a={p.author} openProfile={openProfile}/> · {ago(p.createdAt)}</p>
          <p className="post-text">{p.body}</p>
          <p className="post-actions">{p.mine?<button className="link-button" onClick={()=>{if(window.confirm('Apagar este tópico?'))void act(`forum/post/${p.id}/delete`,{}).then(()=>openPost(''));}}>Apagar tópico</button>:<button className="link-button" onClick={()=>report('post',p.id)}>Denunciar</button>}</p></div></article></section>
    <section className="panel"><div className="section-title"><h2>{p.commentCount} {p.commentCount===1?'comentário':'comentários'}</h2></div>
      {p.locked?<p className="muted">Este tópico foi trancado pela equipe.</p>:<CommentForm onSend={body=>act(`forum/posts/${p.id}/comments`,{body})} label={isQuestion?'Responder a dúvida':'Comentar'}/>}
      {visible.map(c=>commentEl(c))}<ShowMore rest={rest} onMore={more}/>
      {!tops.length&&<p className="empty">Ninguém comentou ainda.</p>}</section>
  </div>;
}
function Replies({list,render}:{list:Comment[];render:(c:Comment)=>JSX.Element}){
  const {visible,rest,more}=useShowMore(list,'',3);
  return <>{visible.map(render)}<ShowMore rest={rest} onMore={more} label="Ver mais respostas"/></>;
}
function CommentForm({onSend,label}:{onSend:(body:string)=>Promise<unknown>;label:string}){
  const [body,setBody]=useState('');
  return <form className="ops-form forum-comment-form" onSubmit={e=>{e.preventDefault();void onSend(body).then(()=>setBody(''));}}>
    <label>{label} ({body.length}/{forumLimits.comment[1]})<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={forumLimits.comment[0]} maxLength={forumLimits.comment[1]} rows={3} required/></label>
    <button className="primary">Enviar</button></form>;
}
