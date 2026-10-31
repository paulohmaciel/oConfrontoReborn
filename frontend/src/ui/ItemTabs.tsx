import Icon from './GameIcon';
// Abas por tipo de item, usadas no Mercador e no Mercado (até 10 opções, pela regra do site).
export const itemCategories=[
  {key:'',label:'Todos',slots:[] as string[],icon:'Gold Coin'},
  {key:'potions',label:'Poções',slots:['CONSUMABLE'],icon:'Great Health Potion|Health Potion'},
  {key:'weapons',label:'Armas',slots:['WEAPON'],icon:'Fire Sword|Sword'},
  {key:'ammo',label:'Munição',slots:['AMMO'],icon:'Power Bolt|Arrow'},
  {key:'armor',label:'Armaduras',slots:['HELMET','ARMOR','LEGS','BOOTS'],icon:'Dragon Scale Mail|Magic Plate Armor'},
  {key:'shields',label:'Escudos',slots:['SHIELD'],icon:'Dragon Shield|Mastermind Shield'},
  {key:'jewels',label:'Joias',slots:['AMULET','RING'],icon:'Platinum Amulet|Ring of the Sky'},
  {key:'other',label:'Outros',slots:['BACKPACK','LOOT'],icon:'Backpack'},
] as const;
export type ItemCategory=typeof itemCategories[number]['key'];
export const inCategory=(slot:string,key:string)=>!key||(itemCategories.find(c=>c.key===key)?.slots as readonly string[]|undefined)?.includes(slot)===true;
export const slotsOf=(key:string)=>(itemCategories.find(c=>c.key===key)?.slots??[]) as readonly string[];
// Filtro aceita uma aba (potions, armor…) ou um tipo exato vindo do equipamento (BACKPACK, HELMET…).
export const slotLabels:Record<string,string>={WEAPON:'Armas',ARMOR:'Armaduras',HELMET:'Elmos',LEGS:'Pernas',BOOTS:'Botas',SHIELD:'Escudos',AMULET:'Amuletos',RING:'Anéis',AMMO:'Munição',BACKPACK:'Mochilas',CONSUMABLE:'Poções',LOOT:'Loot e materiais'};
export const isCategory=(v:string)=>itemCategories.some(c=>c.key===v);
export const slotParam=(v:string)=>isCategory(v)?slotsOf(v).join(','):v;
export default function ItemTabs({value,onChange,counts}:{value:string;onChange:(key:string)=>void;counts?:Record<string,number>}){
  return <div className="item-tabs" role="tablist" aria-label="Tipo de item">{itemCategories.map(c=><button key={c.key} type="button" role="tab" aria-selected={value===c.key} className={value===c.key?'active-chip':''} onClick={()=>onChange(c.key)}>
    <Icon name={c.icon} size={22}/><span>{c.label}{counts&&counts[c.key]!==undefined?` (${counts[c.key]})`:''}</span></button>)}</div>;
}
