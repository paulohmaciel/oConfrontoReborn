import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from './lib/api';
import {fmt} from './lib/format';
import ThemeToggle from './ui/ThemeToggle';
import Icon from './ui/GameIcon';
import {tabs,adminTab,type Tab} from './lib/tabs';
import HuntPanel from './features/adventure/HuntPanel';
import {JourneyPanel,JournalPanel} from './features/adventure/AdventurePanels';
import {type BaseVocation} from '../../shared/adventure';
import LoginScreen from './features/auth/LoginScreen';
import {verifyEmailToken} from './features/auth/RecoveryForms';
import Sidebar from './features/hero/Sidebar';
import {MobileBar,MobileDrawer} from './features/hero/MobileNav';
import TemplePanel from './features/hero/TemplePanel';
import StatsPanel from './features/hero/StatsPanel';
import BagPanel from './features/inventory/BagPanel';
import EquipmentPanel from './features/inventory/EquipmentPanel';
import ShopPanel from './features/shop/ShopPanel';
import MarketPanel from './features/market/MarketPanel';
import ForgePanel from './features/forge/ForgePanel';
import TasksPanel from './features/tasks/TasksPanel';
import AtlasPanel from './features/atlas/AtlasPanel';
import CharactersPanel from './features/characters/CharactersPanel';
import PremiumPanel from './features/premium/PremiumPanel';
import LedgerPanel from './features/ledger/LedgerPanel';
import SupportPanel from './features/support/SupportPanel';
import AdminPanel from './features/admin/AdminPanel';
import type {Hero,Item,Monster,Battle,Blueprint,Listing,Task,JourneyState,GameConfig} from './lib/types';
export default function App(){
 const [signed,setSigned]=useState(false),[checking,setChecking]=useState(true),[register,setRegister]=useState(false);
 const [hero,setHero]=useState<Hero|null>(null),[tab,setTab]=useState<Tab>('journey'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [monsters,setMonsters]=useState<Monster[]>([]),[shop,setShop]=useState<Blueprint[]>([]),[inventory,setInventory]=useState<{items:Item[];total:number;page:number}>({items:[],total:0,page:1});
 const [market,setMarket]=useState<Listing[]>([]),[tasks,setTasks]=useState<Task[]>([]),[battle,setBattle]=useState<Battle|null>(null),[selected,setSelected]=useState<Item|null>(null),[price,setPrice]=useState('100'),[search,setSearch]=useState('');
 const [atlasSearch,setAtlasSearch]=useState('');
 const [journeyState,setJourneyState]=useState<JourneyState|null>(null),[signupVocation,setSignupVocation]=useState<BaseVocation>('KNIGHT');
 const [config,setConfig]=useState<GameConfig|null>(null),[staff,setStaff]=useState(false),[premiumActive,setPremiumActive]=useState(false),[roster,setRoster]=useState<{id:number;name:string;level:number;vocation:string}[]>([]);
 const [authView,setAuthView]=useState<'form'|'forgot'|'reset'>(()=>new URLSearchParams(location.search).has('redefinir')?'reset':'form'),[resetToken]=useState(()=>new URLSearchParams(location.search).get('redefinir')??''),[landing,setLanding]=useState('');
 const [bagFilter,setBagFilter]=useState({slot:'',q:'',fav:false}),bagFilterRef=useRef(bagFilter);
 const [menuOpen,setMenuOpen]=useState(false);
 const bagPage=useRef(1); const lock=useRef(false);const heroId=useRef<number|null>(null);
 const notifyError=(e:unknown)=>{setError(e instanceof Error?e.message:'Ocorreu um erro.');if(e instanceof ApiError&&e.status===401){setSigned(false);setHero(null);heroId.current=null;}};
 async function refresh(id:number,page=1){
  const f=bagFilterRef.current,query=`page=${page}${f.slot?`&slot=${f.slot}`:''}${f.q?`&q=${encodeURIComponent(f.q)}`:''}${f.fav?'&favorites=1':''}`;
  const [h,bag]=await Promise.all([api<Hero>(`/characters/${id}`),api<typeof inventory>(`/characters/${id}/inventory?${query}`)]);
  bagPage.current=bag.page; setHero(h);setInventory(bag);
  setJourneyState(await api<JourneyState>(`/characters/${id}/journey`));
  if(h.activeBattleId)setBattle(await api<Battle>(`/characters/${id}/battles/${h.activeBattleId}`));
 }
 async function enter(preferred?:number){
  const me=await api<{characters:{id:number;name:string;level:number;vocation:string}[]}>('/me');if(!me.characters.length)throw new Error('Conta sem personagem.');
  let saved:number|null=null;try{saved=Number(localStorage.getItem('oc_character'))||null;}catch{}
  const id=[preferred,saved].find(c=>c&&me.characters.some(x=>x.id===c))??me.characters[0].id;
  heroId.current=id;setRoster(me.characters);await refresh(id);
  const [m,s]=await Promise.all([api<Monster[]>('/monsters'),api<Blueprint[]>('/shop')]);setMonsters(m);setShop(s);
  api<GameConfig>('/config').then(setConfig).catch(()=>{});api<{role:string}>('/admin/me').then(()=>setStaff(true)).catch(()=>setStaff(false));
  api<{active:boolean}>('/premium').then(p=>setPremiumActive(p.active)).catch(()=>{});setSigned(true);
 }
 async function selectCharacter(id:number){await perform(async()=>{heroId.current=id;try{localStorage.setItem('oc_character',String(id));}catch{}setBattle(null);setBagFilter({slot:'',q:'',fav:false});bagFilterRef.current={slot:'',q:'',fav:false};const me=await api<{characters:typeof roster}>('/me');setRoster(me.characters);setTab('journey');},'');}
 async function afterCreated(id:number){await enter(id);try{localStorage.setItem('oc_character',String(id));}catch{}setTab('journey');}
 async function reloadPremium(){if(heroId.current)await refresh(heroId.current,bagPage.current);api<{active:boolean}>('/premium').then(p=>setPremiumActive(p.active)).catch(()=>{});}
 useEffect(()=>{
  const params=new URLSearchParams(location.search);const verify=params.get('verificar'),premium=params.get('premium');
  if(params.has('verificar')||params.has('redefinir')||params.has('premium'))history.replaceState(null,'',location.pathname);
  if(verify)void verifyEmailToken(verify).then(setLanding);
  if(premium)setLanding(premium==='ok'?'Pagamento recebido! Seu Premium será liberado assim que o Mercado Pago confirmar.':premium==='pendente'?'Pagamento pendente. Assim que for confirmado, o Premium é liberado automaticamente.':'O pagamento não foi concluído. Você pode tentar novamente quando quiser.');
  enter().catch(e=>{if(!(e instanceof ApiError&&e.status===401))notifyError(e);}).finally(()=>setChecking(false));
 },[]);
 useEffect(()=>{if(!signed||!heroId.current)return;const id=heroId.current;
   if(tab==='market')api<Listing[]>('/market').then(setMarket).catch(notifyError);
   if(tab==='tasks')api<Task[]>(`/characters/${id}/tasks`).then(setTasks).catch(notifyError);
 },[tab,signed]);
 async function perform(work:()=>Promise<unknown>,message='Ação concluída.'){if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{const result=await work();const serverMessage=result&&typeof result==='object'&&'message' in result&&typeof result.message==='string'?result.message:'';setNotice(typeof result==='string'&&result?result:serverMessage||message);setSelected(null);if(heroId.current)await refresh(heroId.current,bagPage.current);
  if(tab==='market')setMarket(await api<Listing[]>('/market'));if(tab==='tasks'&&heroId.current)setTasks(await api<Task[]>(`/characters/${heroId.current}/tasks`));
 }catch(e){notifyError(e);if(heroId.current)await refresh(heroId.current,bagPage.current).catch(()=>{});}finally{lock.current=false;setBusy(false);}}
 const command=(action:string,body:unknown={})=>perform(()=>api(`/characters/${heroId.current}/${action}`,body,crypto.randomUUID()));
 async function authenticateDev(){await perform(async()=>{await api('/auth/dev-login',{});await enter();},'Bem-vindo, Mestre.');}
 async function authenticate(form:HTMLFormElement){const values={...Object.fromEntries(new FormData(form)),...(register?{vocation:signupVocation}:{})};await perform(async()=>{await api(`/auth/${register?'register':'login'}`,values);await enter();},'Bem-vindo ao Confronto.');}
 async function turn(action:string){if(!battle)return;await perform(async()=>{const result=await api<Battle>(`/characters/${heroId.current}/battles/${battle.battleId}/turns`,{action,expectedTurn:battle.turnVersion});setBattle(result);},'');}
 const start=(m:Monster)=>perform(async()=>{const b=await api<{id:number}>(`/characters/${heroId.current}/battles`,{monsterId:m.id});setBattle(await api<Battle>(`/characters/${heroId.current}/battles/${b.id}`));},'');
 if(checking)return <div className="loading-screen">Abrindo os portões…</div>;
 if(!signed||!hero)return <LoginScreen authView={authView} setAuthView={setAuthView} resetToken={resetToken} register={register} setRegister={setRegister} signupVocation={signupVocation} setSignupVocation={setSignupVocation} busy={busy} error={error} setError={setError} landing={landing} authenticate={authenticate} authenticateDev={authenticateDev}/>;
 const fighting=!!hero.activeBattleId,allTabs:readonly (readonly [Tab,string,string])[]=staff?[...tabs,adminTab]:tabs;
 const goTab=(id:Tab)=>{setTab(id);setSearch('');setSelected(null);window.scrollTo(0,0);};
 const logout=()=>void perform(async()=>{await api('/auth/logout',{});setSigned(false);setHero(null);heroId.current=null;setBattle(null);setStaff(false);setPremiumActive(false);},'');
 return <div className={`shell ${hero.profileFrame?`frame-${hero.profileFrame}`:''}`}><header className="topbar"><div className="wordmark">O CONFRONTO<span>CRÔNICAS DE UM AVENTUREIRO</span></div><div className="top-meta"><ThemeToggle/><span className="online-dot"/> Mundo local <span className="separator">|</span><Icon name="Gold Coin" size={24}/><b>{fmt(hero.goldInHand)}</b><button className="quiet logout" onClick={logout}>Sair</button>
  <button type="button" className="menu-button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={()=>setMenuOpen(true)}><span/><span/><span/>{hero.statPoints>0&&<i className="menu-dot" aria-label="Pontos de atributo para distribuir"/>}</button></div></header>
 <MobileDrawer open={menuOpen} onClose={()=>setMenuOpen(false)} hero={hero} roster={roster} busy={busy} fighting={fighting} tabs={allTabs} tab={tab} onTab={goTab} onSelectCharacter={id=>void selectCharacter(id)} onLogout={logout}/>
 <MobileBar tabs={allTabs} tab={tab} fighting={fighting} onTab={goTab}/>
 <div className="game-layout"><Sidebar hero={hero} roster={roster} busy={busy} fighting={fighting} tabs={allTabs} tab={tab} onTab={goTab} onSelectCharacter={id=>void selectCharacter(id)}/>
 <main><div className="page-heading"><div><span className="eyebrow">{fighting?'COMBATE EM ANDAMENTO':'PREPARE SEU PRÓXIMO PASSO'}</span><h1>{allTabs.find(t=>t[0]===tab)?.[1]}</h1></div><span className="world-tag">THAIS · AVENTUREIROS</span></div>{error&&<div className="error notice" role="alert">{error}</div>}{notice&&<div className="success notice" role="status">{notice}</div>}{landing&&<div className="success notice" role="status">{landing} <button className="link-button" onClick={()=>setLanding('')}>Fechar</button></div>}{fighting&&tab!=='hunt'&&<div className="notice">Seu combate continua ativo. <button className="link-button" onClick={()=>setTab('hunt')}>Voltar ao combate</button></div>}
 {tab==='journey'&&<JourneyPanel hero={hero} state={journeyState} busy={busy} command={command} go={setTab}/>}
 {tab==='journal'&&<JournalPanel characterId={hero.id}/>}
 {tab==='characters'&&<CharactersPanel hero={hero} config={config} command={command} onSelect={id=>void selectCharacter(id)} onCreated={id=>void afterCreated(id)}/>}
 {tab==='premium'&&<PremiumPanel hero={hero} onChanged={reloadPremium}/>}
 {tab==='ledger'&&<LedgerPanel characterId={hero.id}/>}
 {tab==='support'&&<SupportPanel/>}
 {tab==='admin'&&staff&&<AdminPanel/>}
 {tab==='hunt'&&<HuntPanel hero={hero} state={journeyState} monsters={monsters} battle={battle} busy={busy} start={start} turn={turn} goTemple={()=>setTab('temple')} dismiss={()=>setBattle(null)}/>}
 {tab==='bag'&&<div className="equipment-inline"><EquipmentPanel hero={hero} busy={busy} fighting={fighting} command={command}/></div>}
 {tab==='bag'&&<BagPanel hero={hero} inventory={inventory} selected={selected} setSelected={setSelected} bagFilter={bagFilter} setBagFilter={setBagFilter} premiumActive={premiumActive} busy={busy} fighting={fighting} config={config} price={price} setPrice={setPrice} command={command} perform={perform} onApplyFilter={()=>{bagFilterRef.current=bagFilter;void perform(()=>refresh(hero.id,1),'');}} goPage={p=>void perform(()=>refresh(hero.id,p),'')}/>}
 {tab==='shop'&&<ShopPanel hero={hero} shop={shop} busy={busy} command={command}/>}
 {tab==='market'&&<MarketPanel hero={hero} market={market} setMarket={setMarket} config={config} busy={busy} perform={perform} command={command}/>}
 {tab==='forge'&&<ForgePanel hero={hero} inventory={inventory} config={config} busy={busy} fighting={fighting} perform={perform}/>}
 {tab==='temple'&&<TemplePanel hero={hero} busy={busy} fighting={fighting} command={command}/>}
 {tab==='tasks'&&<TasksPanel hero={hero} tasks={tasks} config={config} busy={busy} fighting={fighting} command={command}/>}
 {tab==='stats'&&<StatsPanel hero={hero} busy={busy} fighting={fighting} command={command}/>}
 {tab==='atlas'&&<AtlasPanel/>}
 </main><EquipmentPanel hero={hero} busy={busy} fighting={fighting} command={command}/></div></div>;
}
