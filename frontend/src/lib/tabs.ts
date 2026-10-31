export const tabs=[['journey','Jornada','Torch|Backpack'],['journal','Diário','Strange Talisman|Ring of the Sky'],['hunt','Caçar','Dragon Lord|Dragon'],['group','Caçada em grupo','Mammoth|Bear'],['duel','Duelo','Warlord Sword|Fire Sword'],['news','Novidades','Candelabrum|Torch'],['bag','Inventário','Backpack'],['shop','Mercador','Gold Coin'],['market','Mercado','Golden Amulet|Platinum Amulet'],['forge','Ferreiro','War Hammer|Sword'],['temple','Templo de Capriel','Ultimate Healing Rune|Health Potion'],['tasks','Missões','Hunting Spear|Rotworm'],['stats','Atributos','Magic Longsword'],['characters','Personagens','Hero|Mastermind Shield'],['premium','Premium','Crown|Platinum Amulet'],['ledger','Extrato','Gold Coin'],['support','Suporte','Cure Poison Rune|Ring of the Sky'],['atlas','Ícones','Crown Helmet|Demon Helmet'],['profile','Perfil','Hero|Mastermind Shield'],['forum','Fórum','Strange Talisman|Backpack']] as const;
export type Tab=typeof tabs[number][0]|'admin';
export const adminTab=['admin','Equipe','Royal Helmet|Demon Helmet'] as const;
// Celular: 5 atalhos fixos no menu inferior; o resto fica no menu sanduíche, em grupos.
export const mobileMain:readonly Tab[]=['journey','hunt','bag','forge','temple'];
export const shortLabels:Partial<Record<Tab,string>>={bag:'Mochila',temple:'Templo'};
export const drawerGroups:readonly (readonly [string,readonly Tab[]])[]=[['Aventura',['group','duel','journal','tasks','stats','characters']],['Comunidade',['profile','forum']],['Comércio',['shop','market','ledger']],['Conta',['news','premium','support','atlas','admin']]];
// Endereço de cada aba (/atributos, /inventario…): atualizar a página ou abrir o link mantém a pessoa onde estava.
export const tabSlugs:Record<Tab,string>={journey:'jornada',journal:'diario',hunt:'cacar',group:'cacada-em-grupo',duel:'duelo',news:'novidades',bag:'inventario',shop:'mercador',market:'mercado',forge:'ferreiro',temple:'templo',tasks:'missoes',stats:'atributos',characters:'personagens',premium:'premium',ledger:'extrato',support:'suporte',atlas:'icones',admin:'equipe',profile:'perfil',forum:'forum'};
export const pathForTab=(tab:Tab,param='')=>tab==='journey'?'/':`/${tabSlugs[tab]}${param?`/${encodeURIComponent(param)}`:''}`;
// Segundo pedaço do endereço (ex.: /perfil/Mestre → "Mestre").
export const paramFromPath=(pathname:string)=>{try{return decodeURIComponent(pathname.replace(/^\/+|\/+$/g,'').split('/')[1]??'');}catch{return '';}};
export function tabFromPath(pathname:string):Tab|null{
  const slug=decodeURIComponent(pathname).replace(/^\/+|\/+$/g,'').split('/')[0].toLowerCase();
  if(!slug)return 'journey';
  if(slug==='tarefas')return 'tasks'; // endereço antigo
  return (Object.keys(tabSlugs) as Tab[]).find(t=>tabSlugs[t]===slug)??null;
}
// Menu lateral em seções (computador). O celular usa o menu inferior + as seções do menu sanduíche.
export const sidebarGroups:readonly (readonly [string,readonly Tab[]])[]=[['Aventura',['journey','hunt','group','duel','tasks','journal']],['Personagem',['bag','stats','characters','temple']],['Comércio',['shop','market','forge','ledger']],['Comunidade',['profile','forum']],['Conta',['news','premium','support','atlas','admin']]];
