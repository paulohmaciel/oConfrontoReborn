// Comunidade: galeria de imagens de perfil (sprites do TibiaWiki), limites de texto e limpeza de mensagens.
// Grátis para todos; o Premium libera os "lendários" e uma descrição maior. Nada aqui altera combate.
export const freeAvatars = [
  'Hero', 'Amazon', 'Valkyrie', 'Monk', 'Elf Scout', 'Elf Arcanist', 'Dwarf', 'Dwarf Guard', 'Assassin', 'Hunter', 'Bandit', 'Smuggler',
  'Necromancer', 'Warlock', 'Witch', 'Black Knight', 'Wild Warrior', 'Orc Warrior', 'Orc Shaman', 'Minotaur', 'Minotaur Mage', 'Cyclops',
  'Dragon', 'Wolf', 'Winter Wolf', 'Polar Bear', 'Bear', 'Lion', 'Panda', 'Deer', 'Rat', 'Spider', 'Snake', 'Mummy', 'Skeleton',
  'Bonelord', 'Stone Golem', 'Fire Elemental', 'Water Elemental', 'Mammoth',
] as const;
export const premiumAvatars = ['Demon', 'Dragon Lord', 'Infernatil', 'Verminor', 'Apocalypse', 'Fire Devil', 'Demon Skeleton', 'Giant Spider', 'Young Sea Serpent', 'Wailing Widow'] as const;
export const isAvatar = (name: string, premium: boolean) => (freeAvatars as readonly string[]).includes(name) || (premium && (premiumAvatars as readonly string[]).includes(name));

export const limits = { aboutFree: 500, aboutPremium: 2000, scrap: 500, testimonial: 1000, scrapCooldownSeconds: 15, pendingFriendRequests: 50 } as const;
// Texto puro: tira caracteres de controle (menos a quebra de linha), espaços nas pontas e linhas vazias em excesso.
export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
