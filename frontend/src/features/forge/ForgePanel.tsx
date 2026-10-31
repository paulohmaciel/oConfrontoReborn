import {useEffect,useState} from 'react';
import {api} from '../../lib/api';
import {fmt} from '../../lib/format';
import type {Hero,Item,GameConfig,Perform} from '../../lib/types';
import Icon from '../../ui/GameIcon';
import {upgradeSuccessPercent,upgradeBreakPercent} from '../../../../shared/economy';
import {vocationAllowed} from '../../../../shared/adventure';
import {isForgeable,materialForLevel,reforgeKeptTier,salvageReturn} from '../../../../shared/forge';
type Recipe={id:number;name:string;slot:string;minLevel:number;vocations:string;spriteUrl:string;attack:number;defense:number;armor:number;magicAttack:number;material:string;craftGold:string;reforgeGold:string};
type Overview={level:number;craftMaterials:number;salvageMaterials:number;shopMaxLevel:number;materials:{name:string;minLevel:number;spriteUrl:string;have:number}[];recipes:Recipe[]};
type Mode='upgrade'|'craft'|'reforge'|'salvage';
const modes:[Mode,string][]=[['upgrade','Melhorar'],['craft','Fabricar'],['reforge','Reforjar'],['salvage','Desmontar']];
const slotNames:Record<string,string>={WEAPON:'Arma',ARMOR:'Armadura',HELMET:'Elmo',LEGS:'Pernas',BOOTS:'Botas',SHIELD:'Escudo',AMULET:'Amuleto',RING:'Anel',AMMO:'Flecha / runa'};
const stats=(r:Recipe)=>[r.attack&&`ATK ${r.attack}`,r.magicAttack&&`Magia ${r.magicAttack}`,r.defense&&`DEF ${r.defense}`,r.armor&&`ARM ${r.armor}`].filter(Boolean).join(' · ');
export default function ForgePanel({hero,inventory,config,busy,fighting,perform}:{hero:Hero;inventory:{items:Item[]};config:GameConfig|null;busy:boolean;fighting:boolean;perform:Perform}){
  const [mode,setMode]=useState<Mode>('upgrade'),[o,setO]=useState<Overview|null>(null),[loadError,setLoadError]=useState('');
  const load=()=>api<Overview>(`/characters/${hero.id}/forge`).then(r=>{setO(r);setLoadError('');}).catch(e=>setLoadError(e instanceof Error?e.message:'Não foi possível abrir o Ferreiro.'));
  useEffect(()=>{void load();},[hero.id,hero.level]);
  // Depois de fabricar, reforjar ou desmontar, recarrega materiais e custos junto com a mochila.
  const act=(work:()=>Promise<unknown>,message?:string)=>perform(async()=>{const r=await work();await load();return r;},message);
  const have=(name:string)=>o?.materials.find(m=>m.name===name)?.have??0;
  const owned=[...hero.equipment,...inventory.items].filter(i=>isForgeable(i.blueprint.slot)&&i.quantity===1);
  return <section className="panel"><div className="section-title"><h2>Forja do aventureiro</h2><Icon name="Magic Longsword" size={40}/></div>
    <div className="forge-tabs" role="tablist" aria-label="O que fazer no Ferreiro">{modes.map(([m,label])=><button key={m} role="tab" aria-selected={mode===m} className={mode===m?'active-chip':''} onClick={()=>setMode(m)}>{label}</button>)}</div>
    {mode!=='upgrade'&&o&&<div className="forge-materials" aria-label="Seus materiais">{o.materials.map(m=><div key={m.name} className={materialForLevel(hero.level).name===m.name?'current':''} title={`${m.name}: nível ${m.minLevel}+`}><Icon name={m.name} src={m.spriteUrl} size={28}/><b>{m.have}</b><small>{m.name}</small></div>)}</div>}
    {mode!=='upgrade'&&loadError&&<p className="error" role="alert">{loadError}</p>}
    {mode==='upgrade'&&<UpgradeSection hero={hero} items={owned.filter(i=>i.blueprint.slot!=='AMMO')} config={config} busy={busy} fighting={fighting} perform={perform}/>}
    {mode==='craft'&&o&&<CraftSection hero={hero} o={o} have={have} busy={busy||fighting} act={act}/>}
    {mode==='reforge'&&o&&<ReforgeSection hero={hero} o={o} items={owned.filter(i=>!i.rareItem)} have={have} busy={busy||fighting} act={act}/>}
    {mode==='salvage'&&o&&<SalvageSection hero={hero} o={o} items={owned.filter(i=>!i.rareItem&&!i.isEquipped)} busy={busy||fighting} act={act}/>}
    {mode!=='upgrade'&&<p className="muted">Materiais caem dos monstros da mesma faixa de nível (chefes sempre deixam alguns) e podem ser trocados no Mercado. O Mercador vende equipamentos só até o nível {o?.shopMaxLevel??100}; acima disso, o equipamento vem daqui ou do loot. A lista de itens seus mostra o equipamento e a página atual da mochila.</p>}
  </section>;
}
type Act=(work:()=>Promise<unknown>,message?:string)=>Promise<void>;
function Cost({material,qty,have,gold}:{material:string;qty:number;have:number;gold:string}){
  return <span className={have<qty?'forge-cost short':'forge-cost'}>{qty}× {material} ({have}) · {fmt(gold)} ouro</span>;
}
function CraftSection({hero,o,have,busy,act}:{hero:Hero;o:Overview;have:(n:string)=>number;busy:boolean;act:Act}){
  const [slot,setSlot]=useState(''),[mine,setMine]=useState(true);
  const list=o.recipes.filter(r=>(!slot||r.slot===slot)&&(!mine||(r.minLevel<=hero.level&&vocationAllowed(r.vocations,hero.vocation)))).sort((a,b)=>b.minLevel-a.minLevel).slice(0,60);
  return <>
    <p className="muted">Fabrique qualquer equipamento do seu nível com {o.craftMaterials} materiais da faixa do item + ouro.</p>
    <div className="forge-filters"><select aria-label="Tipo de item" value={slot} onChange={e=>setSlot(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(slotNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <label><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> Só o que posso usar</label></div>
    {list.map(r=>{const enough=have(r.material)>=o.craftMaterials&&BigInt(hero.goldInHand)>=BigInt(r.craftGold),allowed=r.minLevel<=hero.level;
      return <div className="market-row" key={r.id}><Icon name={r.name} src={r.spriteUrl} size={40}/><div><h3>{r.name}</h3><p>Nv. {r.minLevel} · {slotNames[r.slot]??r.slot}{stats(r)?` · ${stats(r)}`:''}</p><p><Cost material={r.material} qty={o.craftMaterials} have={have(r.material)} gold={r.craftGold}/></p></div>
        <button disabled={busy||!enough||!allowed} title={!allowed?`Nível ${r.minLevel} necessário`:undefined} onClick={()=>void act(()=>api(`/characters/${hero.id}/forge/craft`,{blueprintId:r.id},crypto.randomUUID()))}>Fabricar</button></div>;})}
    {!list.length&&<p className="empty">Nenhum item com esses filtros.</p>}
  </>;
}
function ReforgeSection({hero,o,items,have,busy,act}:{hero:Hero;o:Overview;items:Item[];have:(n:string)=>number;busy:boolean;act:Act}){
  const [pick,setPick]=useState<number|null>(null);
  const item=items.find(i=>i.id===pick)??null;
  const targets=item?o.recipes.filter(r=>r.slot===item.blueprint.slot&&r.minLevel>item.blueprint.minLevel&&r.minLevel<=hero.level&&vocationAllowed(r.vocations,hero.vocation)).sort((a,b)=>b.minLevel-a.minLevel):[];
  return <>
    <p className="muted">Troque um item seu por um do mesmo tipo e de nível maior, sem começar do zero: ele guarda metade da melhoria (um +6 vira +3). Custa {o.craftMaterials} materiais da faixa do item novo + ouro. Itens raros (+10) não podem ser reforjados.</p>
    <div className="forge-pick" role="group" aria-label="Item para reforjar">{items.map(i=><button key={i.id} className={pick===i.id?'bag-slot selected':'bag-slot'} onClick={()=>setPick(i.id)} title={`${i.blueprint.name} +${i.upgradeTier}`}><Icon name={i.blueprint.name} src={i.blueprint.spriteUrl} size={36}/><small className="bag-name">{i.blueprint.name}</small><span>{i.upgradeTier?`+${i.upgradeTier}`:''}{i.isEquipped?' ⚔':''}</span></button>)}</div>
    {!items.length&&<p className="empty">Nenhum equipamento para reforjar.</p>}
    {item&&<><h3 className="forge-subtitle">{item.blueprint.name}{item.upgradeTier?` +${item.upgradeTier}`:''} pode virar:</h3>
      {targets.map(r=>{const enough=have(r.material)>=o.craftMaterials&&BigInt(hero.goldInHand)>=BigInt(r.reforgeGold),tier=reforgeKeptTier(item.upgradeTier);
        return <div className="market-row" key={r.id}><Icon name={r.name} src={r.spriteUrl} size={40}/><div><h3>{r.name}{tier?` +${tier}`:''}</h3><p>Nv. {r.minLevel}{stats(r)?` · ${stats(r)}`:''}</p><p><Cost material={r.material} qty={o.craftMaterials} have={have(r.material)} gold={r.reforgeGold}/></p></div>
          <button disabled={busy||!enough} onClick={()=>{if(!window.confirm(`Reforjar ${item.blueprint.name}${item.upgradeTier?` +${item.upgradeTier}`:''} em ${r.name}${tier?` +${tier}`:''}? O item antigo deixa de existir.`))return;void act(async()=>{const res=await api(`/characters/${hero.id}/forge/reforge`,{itemId:item.id,targetId:r.id},crypto.randomUUID());setPick(null);return res;});}}>Reforjar</button></div>;})}
      {!targets.length&&<p className="empty">Ainda não há item maior desse tipo para o seu nível e vocação.</p>}</>}
  </>;
}
function SalvageSection({hero,o,items,busy,act}:{hero:Hero;o:Overview;items:Item[];busy:boolean;act:Act}){
  return <>
    <p className="muted">Desmonte equipamentos que você não usa: o item some e você recebe {o.salvageMaterials} materiais da faixa dele (+1 a cada 3 níveis de melhoria). Equipados e raros (+10) não aparecem aqui.</p>
    {items.map(i=>{const material=materialForLevel(i.blueprint.minLevel).name,qty=salvageReturn(o.salvageMaterials,i.upgradeTier);
      return <div className="market-row" key={i.id}><Icon name={i.blueprint.name} src={i.blueprint.spriteUrl} size={40}/><div><h3>{i.blueprint.name}{i.upgradeTier?` +${i.upgradeTier}`:''}</h3><p>Nv. {i.blueprint.minLevel} · rende {qty}× {material}</p></div>
        <button disabled={busy||qty<1} onClick={()=>{if(!window.confirm(`Desmontar ${i.blueprint.name}${i.upgradeTier?` +${i.upgradeTier}`:''}? O item some e você recebe ${qty}× ${material}.`))return;void act(()=>api(`/characters/${hero.id}/forge/salvage`,{itemId:i.id,confirmUpgraded:i.upgradeTier>0},crypto.randomUUID()));}}>Desmontar</button></div>;})}
    {!items.length&&<p className="empty">Nenhum equipamento solto na mochila para desmontar.</p>}
  </>;
}
function UpgradeSection({hero,items,config,busy,fighting,perform}:{hero:Hero;items:Item[];config:GameConfig|null;busy:boolean;fighting:boolean;perform:Perform}){
  const [protect,setProtect]=useState(false);
  const [hidden,setHidden]=useState(hero.fameHidden??false);
  const stones=hero.protectionStones??0;
  const rules={safeUntilTier:config?.safeUntilTier??3,breakFromTier:config?.breakFromTier??6,breakOnFailPercent:config?.breakOnFailPercent??50};
  return <><p className="muted">Até +{rules.safeUntilTier} a melhoria é garantida. Acima disso ela pode falhar e o ouro é gasto de qualquer forma. A partir da tentativa de chegar ao +{rules.breakFromTier+1}, uma falha pode destruir o item e todo o investimento nele (as chances exatas aparecem em cada item). A Pedra de Proteção, rara e encontrada em caçadas, salva o item de uma quebra e só é gasta quando isso acontece. Você tem {stones}. {stones>0&&<label className="price-label"><input type="checkbox" checked={protect} onChange={e=>setProtect(e.target.checked)}/> Usar Pedra de Proteção nas tentativas com risco de quebra</label>} Cada nível acrescenta 10% aos atributos. Custo: preço base × próximo nível.</p>{items.map(i=><div className="market-row" key={i.id}><Icon name={i.blueprint.name} src={i.blueprint.spriteUrl} size={40} fire={i.upgradeTier>=10}/><div><h3>{i.blueprint.name}{i.rareItem?` · RARO Nº ${String(i.rareItem.serial).padStart(6,'0')}`:''}</h3><p>+{i.upgradeTier} → +{Math.min(10,i.upgradeTier+1)}{i.upgradeTier<10&&(()=>{const c=upgradeSuccessPercent(i.upgradeTier,rules.safeUntilTier),b=upgradeBreakPercent(i.upgradeTier,rules);return c===100?' · garantido':` · ${c}% sucesso · ${100-c-b}% falha (item preservado)${b>0?` · ${b}% DESTRÓI o item`:''}`;})()}</p></div><button disabled={busy||fighting||i.upgradeTier>=10||BigInt(hero.goldInHand)<BigInt(Math.max(1,Math.floor(i.blueprint.npcPrice*(i.upgradeTier+1)*(config?.upgradePercent??100)/100)))} onClick={()=>{const b=upgradeBreakPercent(i.upgradeTier,rules);const usePro=protect&&stones>0&&b>0;if(b>0&&!usePro&&!window.confirm(`${i.blueprint.name} +${i.upgradeTier}: esta tentativa tem ${b}% de chance de DESTRUIR o item e perder todo o investimento nele (${100-upgradeSuccessPercent(i.upgradeTier,rules.safeUntilTier)-b}% de falhar sem perdê-lo). O ouro é gasto de qualquer forma. Tentar mesmo assim?`))return;void perform(async()=>{const r=await api<{outcome:'SUCCESS'|'FAILED'|'BROKE'|'PROTECTED';upgradeTier:number;spent:string;rareSerial?:number|null;firstOfKind?:boolean}>(`/characters/${hero.id}/upgrade`,{itemId:i.id,expectedTier:i.upgradeTier,useProtection:usePro},crypto.randomUUID());if(r.outcome==='PROTECTED')return `A melhoria falhou e ${i.blueprint.name} ia quebrar, mas a Pedra de Proteção o salvou. Segue em +${r.upgradeTier}. Foram gastos ${fmt(r.spent)} ouro.`;return r.outcome==='SUCCESS'?(r.rareSerial?`Incrível! ${i.blueprint.name} chegou ao +10 e virou um item RARO: Nº ${String(r.rareSerial).padStart(6,'0')}${r.firstOfKind?' (o primeiro do seu tipo!)':''}.`:`Sucesso! ${i.blueprint.name} agora está em +${r.upgradeTier}.`):r.outcome==='FAILED'?`A melhoria falhou, mas ${i.blueprint.name} resistiu e segue em +${r.upgradeTier}. Foram gastos ${fmt(r.spent)} ouro.`:`${i.blueprint.name} quebrou na forja! Foram gastos ${fmt(r.spent)} ouro.`;});}}>Melhorar · {fmt(Math.max(1,Math.floor(i.blueprint.npcPrice*(i.upgradeTier+1)*(config?.upgradePercent??100)/100)))} gp</button></div>)}<p className="muted">Mostra equipamentos e a página atual da mochila.</p><label className="price-label"><input type="checkbox" checked={hidden} onChange={e=>{const v=e.target.checked;void perform(async()=>{await api(`/characters/${hero.id}/privacy`,{fameHidden:v});setHidden(v);},v?'Seu nome não aparecerá nos registros de itens raros.':'Seu nome voltará a aparecer nos registros de itens raros.');}}/> Ocultar meu nome nos registros públicos de itens raros (+10)</label></>;
}
