export const tabs=[['journey','Jornada','Torch|Backpack'],['journal','Diário','Strange Talisman|Ring of the Sky'],['hunt','Caçar','Dragon Lord|Dragon'],['bag','Inventário','Backpack'],['shop','Mercador','Gold Coin'],['market','Mercado','Golden Amulet|Platinum Amulet'],['forge','Ferreiro','War Hammer|Sword'],['temple','Templo de Capriel','Ultimate Healing Rune|Health Potion'],['tasks','Tarefas','Hunting Spear|Rotworm'],['stats','Atributos','Magic Longsword'],['characters','Personagens','Hero|Mastermind Shield'],['premium','Premium','Crown|Platinum Amulet'],['ledger','Extrato','Gold Coin'],['support','Suporte','Cure Poison Rune|Ring of the Sky'],['atlas','Ícones','Crown Helmet|Demon Helmet']] as const;
export type Tab=typeof tabs[number][0]|'admin';
export const adminTab=['admin','Equipe','Royal Helmet|Demon Helmet'] as const;
// Celular: 5 atalhos fixos no menu inferior; o resto fica no menu sanduíche, em grupos.
export const mobileMain:readonly Tab[]=['journey','hunt','bag','forge','temple'];
export const shortLabels:Partial<Record<Tab,string>>={bag:'Mochila',temple:'Templo'};
export const drawerGroups:readonly (readonly [string,readonly Tab[]])[]=[['Aventura',['journal','tasks','stats','characters']],['Comércio',['shop','market','ledger']],['Conta',['premium','support','atlas','admin']]];
// Endereço de cada aba (/atributos, /inventario…): atualizar a página ou abrir o link mantém a pessoa onde estava.
export const tabSlugs:Record<Tab,string>={journey:'jornada',journal:'diario',hunt:'cacar',bag:'inventario',shop:'mercador',market:'mercado',forge:'ferreiro',temple:'templo',tasks:'tarefas',stats:'atributos',characters:'personagens',premium:'premium',ledger:'extrato',support:'suporte',atlas:'icones',admin:'equipe'};
export const pathForTab=(tab:Tab)=>tab==='journey'?'/':`/${tabSlugs[tab]}`;
export function tabFromPath(pathname:string):Tab|null{
  const slug=decodeURIComponent(pathname).replace(/^\/+|\/+$/g,'').split('/')[0].toLowerCase();
  if(!slug)return 'journey';
  return (Object.keys(tabSlugs) as Tab[]).find(t=>tabSlugs[t]===slug)??null;
}
