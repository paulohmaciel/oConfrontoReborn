export const vocations = {
  KNIGHT: { name: 'Cavaleiro', icon: 'Sword', role: 'Defesa e combate corpo a corpo', description: 'Defesa 20% maior e uma postura segura para enfrentar golpes pesados.', attackScale: 1, defenseScale: 1.2, critical: 0, dodge: 0, healing: 1, starter: 'Sword' },
  PALADIN: { name: 'Arqueiro', icon: 'Bow', role: 'Precisão e ataques críticos', description: 'Combina força e agilidade, com +8 pontos de crítico e 5% de esquiva.', attackScale: 1, defenseScale: 1, critical: 8, dodge: 5, healing: 1, starter: 'Bow' },
  SORCERER: { name: 'Feiticeiro', icon: 'Wand of Vortex', role: 'Dano mágico e explosão', description: 'Magia ofensiva 25% mais forte, habilidades mais econômicas e defesa 15% menor.', attackScale: 1.25, defenseScale: .85, critical: 0, dodge: 0, healing: .9, starter: 'Wand of Vortex' },
  DRUID: { name: 'Druida', icon: 'Snakebite Rod', role: 'Cura e sobrevivência', description: 'Cura 45% mais forte e mais barata, com dano mágico sustentado.', attackScale: 1.05, defenseScale: 1, critical: 0, dodge: 0, healing: 1.45, starter: 'Snakebite Rod' },
} as const;
export type BaseVocation = keyof typeof vocations;
export function baseVocation(value: string): BaseVocation {
  if (value === 'ELITE_KNIGHT') return 'KNIGHT';
  if (value === 'ROYAL_PALADIN') return 'PALADIN';
  if (value === 'MASTER_SORCERER') return 'SORCERER';
  if (value === 'ELDER_DRUID') return 'DRUID';
  return Object.prototype.hasOwnProperty.call(vocations, value) ? value as BaseVocation : 'KNIGHT';
}
// Promoção: disponível a partir do nível 20, por uma taxa configurável (class.promotionGold).
export const promotion = { minLevel: 20, attackScale: 1.1, defenseScale: 1.1, critical: 2 } as const;
export const promotedOf: Record<BaseVocation, string> = { KNIGHT: 'ELITE_KNIGHT', PALADIN: 'ROYAL_PALADIN', SORCERER: 'MASTER_SORCERER', DRUID: 'ELDER_DRUID' };
export const promotedNames: Record<string, string> = { ELITE_KNIGHT: 'Cavaleiro de Elite', ROYAL_PALADIN: 'Arqueiro Real', MASTER_SORCERER: 'Mestre Feiticeiro', ELDER_DRUID: 'Druida Ancião' };
export function isPromoted(value: string) { return Object.prototype.hasOwnProperty.call(promotedNames, value); }
export function vocationLabel(value: string) { return promotedNames[value] ?? vocations[baseVocation(value)].name; }
// Itens com vocations "ALL" servem a todos. Listas usam a vocação base: um Cavaleiro de Elite usa itens de KNIGHT.
export function vocationAllowed(allowed: string, vocation: string) {
  const list = allowed.split(',').map(v => v.trim());
  return list.includes('ALL') || list.includes(vocation) || list.includes(baseVocation(vocation));
}
export function skillCosts(value: string) {
  const v = baseVocation(value);
  return { ATTACK: 0, TRIPLE_HIT: v === 'SORCERER' ? 12 : 15, FIFTH_HIT: v === 'SORCERER' ? 28 : 35,
    HEAL: v === 'DRUID' ? 14 : 20, DEFEND_SHIELD: 10, INTERRUPT: 12, FLEE: 0 };
}
export function skillLabels(value: string) {
  const v = baseVocation(value);
  return { ATTACK: v === 'PALADIN' ? 'Disparar' : v === 'SORCERER' || v === 'DRUID' ? 'Rajada' : 'Atacar',
    TRIPLE_HIT: v === 'PALADIN' ? 'Tiro preciso' : v === 'SORCERER' ? 'Explosão' : v === 'DRUID' ? 'Espinhos' : 'Triplo hit',
    FIFTH_HIT: v === 'PALADIN' ? 'Salva de flechas' : v === 'SORCERER' ? 'Tempestade' : v === 'DRUID' ? 'Fúria natural' : 'Quinto hit',
    HEAL: 'Curar', DEFEND_SHIELD: 'Defender', INTERRUPT: 'Interromper', FLEE: 'Fugir' };
}
export const regions = [
  { key: 'outskirts', name: 'Arredores de Thais', icon: 'Rat', minLevel: 1, journeyStep: 0, description: 'Campos e túneis próximos à cidade. O lugar ideal para seus primeiros encontros.' },
  { key: 'quarry', name: 'Pedreira dos Gigantes', icon: 'Cyclops', minLevel: 2, journeyStep: 4, description: 'Escavações antigas dominadas por gigantes. Prove seu valor contra o guardião.' },
  { key: 'ruins', name: 'Ruínas Flamejantes', icon: 'Dragon', minLevel: 5, journeyStep: 5, description: 'Uma fortaleza esquecida. Leve proteção contra fogo e observe os chefes.' },
  { key: 'orc_camp', name: 'Acampamento Orc', icon: 'Orc Leader', minLevel: 15, journeyStep: 5, description: 'Tendas, paliçadas e guerreiras do norte. O Líder Orc comanda tudo lá do alto.' },
  { key: 'abyss', name: 'Portões do Abismo', icon: 'Demon', minLevel: 20, journeyStep: 5, description: 'O território dos demônios. Um desafio para aventureiros bem preparados.' },
  { key: 'labyrinth', name: 'Labirinto dos Minotauros', icon: 'Minotaur Guard', minLevel: 30, journeyStep: 5, description: 'Corredores de pedra onde arqueiros e magos minotauros vigiam cada curva.' },
  { key: 'frost', name: 'Terras Geladas', icon: 'Polar Bear', minLevel: 60, journeyStep: 5, description: 'Neve sem fim, trolls do gelo e mamutes. Só os bem equipados atravessam.' },
  { key: 'swamp', name: 'Pântano Sombrio', icon: 'Giant Spider', minLevel: 80, journeyStep: 5, description: 'Águas paradas, crocodilos e bruxas. No fundo da teia, a Aranha Gigante espera.' },
  { key: 'crypt', name: 'Cripta Esquecida', icon: 'Necromancer', minLevel: 100, journeyStep: 5, description: 'Corredores sob a terra onde necromantes erguem os mortos. O Bruxo guarda o último salão.' },
  { key: 'citadel', name: 'Cidadela dos Renegados', icon: 'Assassin', minLevel: 125, journeyStep: 5, description: 'Assassinos, elfos exilados e monges sem ordem. O Herói caído comanda a muralha.' },
  { key: 'sanctuary', name: 'Santuário Elemental', icon: 'Infernatil', minLevel: 160, journeyStep: 5, description: 'Elementais antigos e dragões anciões guardam o santuário. No altar, Infernatil.' },
  // Eras (250–1000): as regiões antigas voltam muito mais fortes, cada Era com um chefe próprio.
  { key: 'era1', name: 'Ruínas da 1ª Era', icon: 'Demon', minLevel: 250, journeyStep: 5, description: 'As ruínas acordaram com os monstros de antes, agora séculos mais fortes. O Demônio da 1ª Era guarda o fim.' },
  { key: 'era2', name: 'Geleiras da 2ª Era', icon: 'Verminor', minLevel: 400, journeyStep: 5, description: 'O gelo eterno guarda feras e mortos-vivos de outra era. Verminor reina sobre a nevasca.' },
  { key: 'era3', name: 'Cidadela da 3ª Era', icon: 'Hero', minLevel: 550, journeyStep: 5, description: 'Heróis caídos e magos esquecidos defendem uma cidadela que não existe mais.' },
  { key: 'era4', name: 'Abismo da 4ª Era', icon: 'Dragon Lord', minLevel: 700, journeyStep: 5, description: 'O abismo mais fundo, onde dragões e demônios antigos esperam por quem chegou tão longe.' },
  // A região final é sempre a mais perigosa do jogo: o Vale da Perdição, terra de Capriel.
  { key: 'capriel', name: 'Vale da Perdição', icon: 'Apocalypse', minLevel: 850, journeyStep: 5, description: 'O lugar mais temido do mundo. Tudo o que já existiu luta aqui na sua forma final, e no fim do vale espera Apocalypse. Poucos voltam.' },
] as const;
export const journey = [
  { key: 'vocation', title: 'Encontre sua vocação', description: 'Escolha como você quer lutar. Sua escolha será permanente nesta etapa.', icon: 'Sword', target: 1, gold: 25, xp: 0, action: 'vocation' },
  { key: 'victories', title: 'Primeiros confrontos', description: 'Derrote dois Rats nos arredores e aprenda a controlar os turnos.', icon: 'Rat', target: 2, gold: 50, xp: 50, action: 'hunt' },
  { key: 'upgrade', title: 'Prepare seu equipamento', description: 'Visite o Ferreiro e melhore um equipamento para +1.', icon: 'Magic Longsword', target: 1, gold: 50, xp: 50, action: 'forge' },
  { key: 'task', title: 'Um trabalho bem-feito', description: 'Complete uma tarefa e receba sua recompensa. Depois, siga para a pedreira.', icon: 'Rotworm', target: 1, gold: 75, xp: 75, action: 'tasks' },
  { key: 'boss', title: 'O guardião da pedreira', description: 'Derrote o Guardião da Pedreira. Defenda ou interrompa seu golpe anunciado.', icon: 'Cyclops', target: 1, gold: 150, xp: 150, action: 'hunt' },
] as const;
export const achievementDefinitions = [
  { key: 'first-victory', name: 'Primeiro confronto', description: 'Vença seu primeiro combate.', icon: 'Sword' },
  { key: 'hunter', name: 'Caçador dedicado', description: 'Vença dez combates.', icon: 'Rotworm' },
  { key: 'blacksmith', name: 'Aço aperfeiçoado', description: 'Melhore um equipamento para +1.', icon: 'Magic Longsword' },
  { key: 'explorer', name: 'Além dos portões', description: 'Desbloqueie a pedreira pela jornada.', icon: 'Backpack' },
  { key: 'boss-slayer', name: 'Quebra-gigantes', description: 'Derrote um chefe.', icon: 'Cyclops' },
] as const;
