// Catálogo do jogo (itens e monstros). Lido pelo seed (upsert) e pelos simuladores de nível.
// Atributos são balanceamento desta adaptação, não cópia automática da wiki. Sprites: TibiaWiki (manifest.json).
import type { ItemSlot } from '@prisma/client';

export interface CatalogItem { name: string; slot: ItemSlot; attack: number; defense: number; armor: number; npcPrice: number; minLevel: number;
  vocations?: string; magicAttack?: number; criticalChance?: number; fireResistance?: number; speed?: number }
const item = (name: string, slot: ItemSlot, minLevel: number, attack: number, defense: number, armor: number, npcPrice: number, extra: Partial<CatalogItem> = {}): CatalogItem =>
  ({ name, slot, attack, defense, armor, npcPrice, minLevel, ...extra });
// Preço de loja dos equipamentos novos: cresce com o quadrado do nível (≈ 20–90 lutas da própria faixa).
const price = (level: number) => Math.round((12 * level * level + 200) / 10) * 10;
const KNIGHT = { vocations: 'KNIGHT' }, PALADIN = { vocations: 'PALADIN' }, MAGE = { vocations: 'SORCERER,DRUID' };

export const items: CatalogItem[] = [
  // Itens originais (valores mantidos).
  item('Sword', 'WEAPON', 1, 12, 10, 0, 80), item('Wooden Shield', 'SHIELD', 1, 0, 10, 0, 50),
  item('Leather Armor', 'ARMOR', 1, 0, 0, 4, 60), item('Leather Helmet', 'HELMET', 1, 0, 0, 1, 25), item('Backpack', 'BACKPACK', 1, 0, 0, 0, 20),
  item('Demon Helmet', 'HELMET', 30, 0, 0, 10, 40000), item('Magic Plate Armor', 'ARMOR', 40, 0, 0, 17, 90000, { fireResistance: 25 }),
  item('Golden Legs', 'LEGS', 25, 0, 0, 9, 30000), item('Boots of Haste', 'BOOTS', 20, 0, 0, 2, 30000, { speed: 8 }),
  item('Mastermind Shield', 'SHIELD', 30, 0, 37, 0, 50000, { fireResistance: 20 }), item('Magic Longsword', 'WEAPON', 50, 55, 40, 0, 150000),
  item('Fire Sword', 'WEAPON', 15, 35, 20, 0, 4000, { criticalChance: 2 }), item('Platinum Amulet', 'AMULET', 10, 0, 0, 2, 2500, { fireResistance: 15 }),
  item('Ring of the Sky', 'RING', 20, 0, 0, 1, 30000, { criticalChance: 8 }), item('Health Potion', 'CONSUMABLE', 1, 0, 0, 0, 50),
  item('Mana Potion', 'CONSUMABLE', 1, 0, 0, 0, 60), item('Pedra de Proteção', 'LOOT', 1, 0, 0, 0, 0), item('Gold Coin', 'LOOT', 1, 0, 0, 0, 0),
  item('Bow', 'WEAPON', 1, 12, 0, 0, 80, { criticalChance: 3, speed: 3 }), item('Wand of Vortex', 'WEAPON', 1, 0, 0, 0, 80, { magicAttack: 12 }),
  item('Snakebite Rod', 'WEAPON', 1, 0, 0, 0, 80, { magicAttack: 10 }),
  // Fase 1 (níveis até 100). Armas novas têm vocação para dar identidade a cada classe.
  item('Longsword', 'WEAPON', 6, 20, 12, 0, price(6), KNIGHT), item('Spike Sword', 'WEAPON', 25, 42, 20, 0, price(25), KNIGHT),
  item('Dragon Lance', 'WEAPON', 35, 50, 14, 0, price(35), { ...KNIGHT, criticalChance: 3 }), item('Giant Sword', 'WEAPON', 60, 66, 22, 0, price(60), KNIGHT),
  item('Bright Sword', 'WEAPON', 70, 74, 24, 0, price(70), { ...KNIGHT, criticalChance: 3 }), item('Warlord Sword', 'WEAPON', 85, 86, 30, 0, price(85), KNIGHT),
  item('Guardian Halberd', 'WEAPON', 100, 100, 26, 0, price(100), { ...KNIGHT, criticalChance: 4 }),
  item('Spear', 'WEAPON', 6, 18, 0, 0, price(6), { ...PALADIN, criticalChance: 2 }), item('Crossbow', 'WEAPON', 20, 34, 0, 0, price(20), { ...PALADIN, criticalChance: 4, speed: 2 }),
  item('Hunting Spear', 'WEAPON', 40, 50, 0, 0, price(40), { ...PALADIN, criticalChance: 5 }), item('Throwing Star', 'WEAPON', 65, 68, 0, 0, price(65), { ...PALADIN, criticalChance: 6, speed: 3 }),
  item('Staff', 'WEAPON', 6, 0, 6, 0, price(6), { ...MAGE, magicAttack: 18 }), item('Skull Staff', 'WEAPON', 35, 0, 8, 0, price(35), { ...MAGE, magicAttack: 34 }),
  item('Steel Shield', 'SHIELD', 8, 0, 16, 0, price(8)), item('Dragon Shield', 'SHIELD', 20, 0, 26, 0, price(20), { fireResistance: 10 }),
  item('Tower Shield', 'SHIELD', 45, 0, 44, 0, price(45)), item('Great Shield', 'SHIELD', 75, 0, 56, 0, price(75)),
  item('Guardian Shield', 'SHIELD', 95, 0, 66, 0, price(95), { fireResistance: 10 }),
  item('Studded Armor', 'ARMOR', 5, 0, 0, 6, price(5)), item('Chain Armor', 'ARMOR', 10, 0, 0, 8, price(10)), item('Plate Armor', 'ARMOR', 18, 0, 0, 11, price(18)),
  item('Knight Armor', 'ARMOR', 28, 0, 0, 13, price(28)), item('Crown Armor', 'ARMOR', 55, 0, 0, 19, price(55)), item('Golden Armor', 'ARMOR', 70, 0, 0, 22, price(70)),
  item('Dragon Scale Mail', 'ARMOR', 85, 0, 0, 25, price(85), { fireResistance: 15 }), item('Royal Draken Mail', 'ARMOR', 100, 0, 0, 28, price(100), { fireResistance: 20 }),
  item('Blue Robe', 'ARMOR', 15, 0, 0, 7, price(15), { ...MAGE, magicAttack: 6 }), item('Terra Mantle', 'ARMOR', 45, 0, 0, 12, price(45), { ...MAGE, magicAttack: 12 }),
  item('Royal Scale Robe', 'ARMOR', 75, 0, 0, 18, price(75), { ...MAGE, magicAttack: 20 }),
  item('Brass Helmet', 'HELMET', 5, 0, 0, 2, price(5)), item('Steel Helmet', 'HELMET', 15, 0, 0, 5, price(15)), item('Crown Helmet', 'HELMET', 55, 0, 0, 11, price(55)),
  item('Royal Helmet', 'HELMET', 75, 0, 0, 13, price(75)), item('Golden Helmet', 'HELMET', 95, 0, 0, 15, price(95), { criticalChance: 2 }),
  item('Terra Hood', 'HELMET', 45, 0, 0, 5, price(45), { ...MAGE, magicAttack: 6 }), item('Hat of the Mad', 'HELMET', 70, 0, 0, 7, price(70), { ...MAGE, magicAttack: 12 }),
  item('Studded Legs', 'LEGS', 5, 0, 0, 2, price(5)), item('Plate Legs', 'LEGS', 15, 0, 0, 5, price(15)), item('Knight Legs', 'LEGS', 40, 0, 0, 10, price(40)),
  item('Crown Legs', 'LEGS', 55, 0, 0, 11, price(55)), item('Dragon Scale Legs', 'LEGS', 85, 0, 0, 14, price(85), { fireResistance: 10 }),
  item('Leather Boots', 'BOOTS', 3, 0, 0, 1, price(3)), item('Steel Boots', 'BOOTS', 35, 0, 0, 4, price(35)), item('Golden Boots', 'BOOTS', 80, 0, 0, 6, price(80), { speed: 4 }),
  item('Dragon Necklace', 'AMULET', 15, 0, 0, 0, price(15), { fireResistance: 10 }), item('Strange Talisman', 'AMULET', 30, 0, 0, 0, price(30), { ...MAGE, magicAttack: 8 }),
  item('Stone Skin Amulet', 'AMULET', 45, 0, 0, 3, price(45)), item('Crystal Necklace', 'AMULET', 70, 0, 0, 3, price(70), { criticalChance: 4 }),
  item('Crystal Ring', 'RING', 60, 0, 0, 0, price(60), { criticalChance: 10, speed: 2 }),
  // Munição / foco (equipamento permanente, não empilha): flechas e virotes para o Arqueiro, runas de foco para os magos.
  item('Arrow', 'AMMO', 20, 8, 0, 0, price(20), PALADIN), item('Poison Arrow', 'AMMO', 45, 16, 0, 0, price(45), { ...PALADIN, criticalChance: 2 }),
  item('Bolt', 'AMMO', 80, 26, 0, 0, price(80), PALADIN), item('Burst Arrow', 'AMMO', 120, 40, 0, 0, price(120), { ...PALADIN, criticalChance: 3 }),
  item('Power Bolt', 'AMMO', 170, 58, 0, 0, price(170), { ...PALADIN, criticalChance: 4 }), item('Throwing Knife', 'AMMO', 230, 76, 0, 0, price(230), { ...PALADIN, criticalChance: 6 }),
  item('Light Magic Missile Rune', 'AMMO', 20, 0, 0, 0, price(20), { ...MAGE, magicAttack: 6 }), item('Heavy Magic Missile Rune', 'AMMO', 45, 0, 0, 0, price(45), { ...MAGE, magicAttack: 12 }),
  item('Fireball Rune', 'AMMO', 70, 0, 0, 0, price(70), { ...MAGE, magicAttack: 18 }), item('Great Fireball Rune', 'AMMO', 100, 0, 0, 0, price(100), { ...MAGE, magicAttack: 26 }),
  item('Explosion Rune', 'AMMO', 130, 0, 0, 0, price(130), { ...MAGE, magicAttack: 34 }), item('Soulfire Rune', 'AMMO', 165, 0, 0, 0, price(165), { ...MAGE, magicAttack: 44 }),
  item('Sudden Death Rune', 'AMMO', 210, 0, 0, 0, price(210), { ...MAGE, magicAttack: 56 }),
  // Fase 2 (níveis 100 a 250).
  item('Naginata', 'WEAPON', 115, 112, 28, 0, price(115), KNIGHT), item('Great Axe', 'WEAPON', 130, 124, 24, 0, price(130), { ...KNIGHT, criticalChance: 3 }),
  item('Obsidian Lance', 'WEAPON', 145, 136, 30, 0, price(145), KNIGHT), item('Guardian Axe', 'WEAPON', 160, 148, 32, 0, price(160), { ...KNIGHT, criticalChance: 4 }),
  item('Icy Barbarian Axe', 'WEAPON', 175, 160, 30, 0, price(175), KNIGHT), item('Earth Barbarian Axe', 'WEAPON', 190, 172, 32, 0, price(190), KNIGHT),
  item('Energy Barbarian Axe', 'WEAPON', 210, 188, 34, 0, price(210), { ...KNIGHT, criticalChance: 5 }),
  item('Fiery Barbarian Axe', 'WEAPON', 235, 206, 36, 0, price(235), { ...KNIGHT, criticalChance: 5, fireResistance: 15 }),
  item('Ornamented Shield', 'SHIELD', 115, 0, 74, 0, price(115)), item('Griffin Shield', 'SHIELD', 135, 0, 84, 0, price(135)),
  item('Castle Shield', 'SHIELD', 160, 0, 96, 0, price(160)), item('Rose Shield', 'SHIELD', 190, 0, 110, 0, price(190), { fireResistance: 10 }),
  item('Dark Shield', 'SHIELD', 220, 0, 124, 0, price(220)),
  item('Noble Armor', 'ARMOR', 120, 0, 0, 32, price(120)), item('Dark Armor', 'ARMOR', 160, 0, 0, 38, price(160), { fireResistance: 10 }),
  item('Red Robe', 'ARMOR', 130, 0, 0, 22, price(130), { ...MAGE, magicAttack: 28 }),
  item('Winged Helmet', 'HELMET', 115, 0, 0, 17, price(115), { speed: 3 }), item('Warrior Helmet', 'HELMET', 130, 0, 0, 18, price(130)),
  item('Crusader Helmet', 'HELMET', 150, 0, 0, 20, price(150)), item('Legion Helmet', 'HELMET', 175, 0, 0, 22, price(175)),
  item('Dark Helmet', 'HELMET', 200, 0, 0, 24, price(200)), item('Viking Helmet', 'HELMET', 225, 0, 0, 26, price(225), { criticalChance: 2 }),
  item('Worn Firewalker Boots', 'BOOTS', 140, 0, 0, 8, price(140), { fireResistance: 15 }), item('Worn Soft Boots', 'BOOTS', 190, 0, 0, 9, price(190), { speed: 6 }),
  item('Golden Amulet', 'AMULET', 150, 0, 0, 4, price(150), { criticalChance: 5 }),
];

export interface CatalogMonster { name: string; level: number; regionKey: string; isBoss?: boolean; element?: 'FIRE' | 'PHYSICAL'; sprite?: string;
  hp: number; attack: number; defense: number; experience: number; goldMin: number; goldMax: number }
// Vida, ataque e defesa calibrados por `npm run levels:calibrate` (4–6 turnos e ~12% de vida por luta comum; chefes ~2× e ~40%).
// XP segue `monsterXpTarget` (shared/progression.ts), com piso de 18 × nível no começo; chefes novos dão o dobro.
// Ouro: de nível × (3 + nível/8) ao dobro disso (acompanha os monstros originais: Dragon 100–250, Demon 500–1.200).
// <monstros>
export const monsters: CatalogMonster[] = [
  { name: 'Rat', level: 1, regionKey: 'outskirts', hp: 146, attack: 22, defense: 11, experience: 25, goldMin: 5, goldMax: 15 },
  { name: 'Wolf', level: 3, regionKey: 'outskirts', hp: 188, attack: 25, defense: 14, experience: 40, goldMin: 8, goldMax: 22 },
  { name: 'Guardião da Pedreira', level: 4, regionKey: 'quarry', isBoss: true, sprite: 'Cyclops', hp: 370, attack: 47, defense: 16, experience: 180, goldMin: 70, goldMax: 110 },
  { name: 'Rotworm', level: 5, regionKey: 'outskirts', hp: 341, attack: 31, defense: 17, experience: 80, goldMin: 15, goldMax: 35 },
  { name: 'Orc', level: 5, regionKey: 'quarry', hp: 341, attack: 31, defense: 17, experience: 95, goldMin: 20, goldMax: 40 },
  { name: 'Minotaur', level: 8, regionKey: 'quarry', hp: 516, attack: 35, defense: 23, experience: 140, goldMin: 25, goldMax: 55 },
  { name: 'Ghoul', level: 10, regionKey: 'ruins', hp: 586, attack: 40, defense: 26, experience: 180, goldMin: 35, goldMax: 70 },
  { name: 'Cyclops', level: 12, regionKey: 'quarry', hp: 902, attack: 41, defense: 29, experience: 250, goldMin: 30, goldMax: 70 },
  { name: 'Dragon', level: 25, regionKey: 'ruins', element: 'FIRE', hp: 2592, attack: 85, defense: 62, experience: 1000, goldMin: 100, goldMax: 250 },
  { name: 'Dragon Lord', level: 40, regionKey: 'ruins', isBoss: true, element: 'FIRE', hp: 5600, attack: 263, defense: 86, experience: 2560, goldMin: 200, goldMax: 500 },
  { name: 'Demon', level: 60, regionKey: 'abyss', isBoss: true, element: 'FIRE', hp: 8610, attack: 380, defense: 126, experience: 6000, goldMin: 500, goldMax: 1200 },
  { name: 'Bug', level: 2, regionKey: 'outskirts', hp: 172, attack: 23, defense: 13, experience: 36, goldMin: 7, goldMax: 14 },
  { name: 'Snake', level: 4, regionKey: 'outskirts', hp: 250, attack: 26, defense: 16, experience: 72, goldMin: 14, goldMax: 28 },
  { name: 'Dwarf', level: 7, regionKey: 'quarry', hp: 467, attack: 31, defense: 22, experience: 126, goldMin: 27, goldMax: 54 },
  { name: 'Skeleton', level: 7, regionKey: 'ruins', hp: 467, attack: 31, defense: 22, experience: 126, goldMin: 27, goldMax: 54 },
  { name: 'Dwarf Soldier', level: 11, regionKey: 'quarry', hp: 667, attack: 40, defense: 27, experience: 198, goldMin: 48, goldMax: 96 },
  { name: 'Dwarf Guard', level: 15, regionKey: 'quarry', hp: 1342, attack: 52, defense: 40, experience: 360, goldMin: 73, goldMax: 146 },
  { name: 'Orc Spearman', level: 15, regionKey: 'orc_camp', hp: 1342, attack: 52, defense: 40, experience: 360, goldMin: 73, goldMax: 146 },
  { name: 'Mummy', level: 16, regionKey: 'ruins', hp: 1388, attack: 53, defense: 41, experience: 410, goldMin: 80, goldMax: 160 },
  { name: 'Orc Warrior', level: 18, regionKey: 'orc_camp', hp: 1596, attack: 56, defense: 45, experience: 518, goldMin: 95, goldMax: 190 },
  { name: 'Stone Golem', level: 19, regionKey: 'quarry', hp: 1650, attack: 57, defense: 46, experience: 578, goldMin: 102, goldMax: 204 },
  { name: 'Bonelord', level: 21, regionKey: 'ruins', hp: 2165, attack: 70, defense: 55, experience: 706, goldMin: 118, goldMax: 236 },
  { name: 'Orc Shaman', level: 22, regionKey: 'orc_camp', hp: 2272, attack: 72, defense: 57, experience: 774, goldMin: 127, goldMax: 254 },
  { name: 'Amazon', level: 26, regionKey: 'orc_camp', hp: 2656, attack: 79, defense: 64, experience: 1082, goldMin: 163, goldMax: 326 },
  { name: 'Orc Berserker', level: 29, regionKey: 'orc_camp', hp: 2939, attack: 86, defense: 68, experience: 1346, goldMin: 192, goldMax: 384 },
  { name: 'Minotaur Archer', level: 31, regionKey: 'labyrinth', hp: 3059, attack: 97, defense: 70, experience: 1538, goldMin: 213, goldMax: 426 },
  { name: 'Valkyrie', level: 33, regionKey: 'orc_camp', hp: 3242, attack: 99, defense: 74, experience: 1742, goldMin: 235, goldMax: 470 },
  { name: 'Minotaur Mage', level: 35, regionKey: 'labyrinth', hp: 3415, attack: 100, defense: 78, experience: 1960, goldMin: 258, goldMax: 516 },
  { name: 'Orc Leader', level: 36, regionKey: 'orc_camp', isBoss: true, hp: 4995, attack: 147, defense: 79, experience: 4148, goldMin: 270, goldMax: 540 },
  { name: 'Minotaur Guard', level: 41, regionKey: 'labyrinth', hp: 3823, attack: 110, defense: 87, experience: 2690, goldMin: 333, goldMax: 666 },
  { name: 'Demon Skeleton', level: 46, regionKey: 'abyss', hp: 4336, attack: 113, defense: 98, experience: 3386, goldMin: 403, goldMax: 806 },
  { name: 'Fire Devil', level: 51, regionKey: 'abyss', element: 'FIRE', hp: 4875, attack: 181, defense: 112, experience: 4162, goldMin: 478, goldMax: 956 },
  { name: 'Fire Elemental', level: 56, regionKey: 'abyss', element: 'FIRE', hp: 5214, attack: 194, defense: 119, experience: 5018, goldMin: 560, goldMax: 1120 },
  { name: 'Frost Troll', level: 60, regionKey: 'frost', hp: 5509, attack: 141, defense: 126, experience: 5760, goldMin: 630, goldMax: 1260 },
  { name: 'Winter Wolf', level: 64, regionKey: 'frost', hp: 5772, attack: 144, defense: 132, experience: 6554, goldMin: 704, goldMax: 1408 },
  { name: 'Polar Bear', level: 69, regionKey: 'frost', hp: 6098, attack: 149, defense: 139, experience: 7618, goldMin: 802, goldMax: 1604 },
  { name: 'Mammoth', level: 75, regionKey: 'frost', hp: 6963, attack: 159, defense: 158, experience: 9000, goldMin: 928, goldMax: 1856 },
  { name: 'Swamp Troll', level: 80, regionKey: 'swamp', hp: 7336, attack: 165, defense: 167, experience: 10240, goldMin: 1040, goldMax: 2080 },
  { name: 'Killer Caiman', level: 85, regionKey: 'swamp', hp: 7713, attack: 177, defense: 176, experience: 11560, goldMin: 1158, goldMax: 2316 },
  { name: 'Witch', level: 90, regionKey: 'swamp', hp: 8082, attack: 182, defense: 184, experience: 12960, goldMin: 1283, goldMax: 2566 },
  { name: 'Giant Spider', level: 100, regionKey: 'swamp', isBoss: true, hp: 13409, attack: 339, defense: 199, experience: 32000, goldMin: 1550, goldMax: 3100 },
  { name: 'Necromancer', level: 100, regionKey: 'crypt', hp: 8793, attack: 202, defense: 199, experience: 16000, goldMin: 1550, goldMax: 3100 },
  { name: 'Wailing Widow', level: 108, regionKey: 'crypt', hp: 9361, attack: 209, defense: 211, experience: 18662, goldMin: 1782, goldMax: 3564 },
  { name: 'Black Knight', level: 116, regionKey: 'crypt', hp: 9803, attack: 227, defense: 222, experience: 21530, goldMin: 2030, goldMax: 4060 },
  { name: 'Warlock', level: 125, regionKey: 'crypt', isBoss: true, hp: 16019, attack: 408, defense: 238, experience: 50000, goldMin: 2328, goldMax: 4656 },
  { name: 'Assassin', level: 126, regionKey: 'citadel', hp: 10564, attack: 239, defense: 239, experience: 25402, goldMin: 2363, goldMax: 4726 },
  { name: 'Elf Scout', level: 133, regionKey: 'citadel', hp: 11401, attack: 241, defense: 258, experience: 28302, goldMin: 2610, goldMax: 5220 },
  { name: 'Elf Arcanist', level: 141, regionKey: 'citadel', hp: 11958, attack: 251, defense: 271, experience: 31810, goldMin: 2908, goldMax: 5816 },
  { name: 'Monk', level: 149, regionKey: 'citadel', hp: 12597, attack: 259, defense: 285, experience: 35522, goldMin: 3222, goldMax: 6444 },
  { name: 'Hero', level: 158, regionKey: 'citadel', isBoss: true, hp: 20032, attack: 467, defense: 299, experience: 79884, goldMin: 3595, goldMax: 7190 },
  { name: 'Water Elemental', level: 162, regionKey: 'capriel', hp: 13537, attack: 282, defense: 306, experience: 41990, goldMin: 3767, goldMax: 7534 },
  { name: 'Young Sea Serpent', level: 172, regionKey: 'capriel', hp: 14402, attack: 291, defense: 326, experience: 47334, goldMin: 4214, goldMax: 8428 },
  { name: 'Elemental de Fogo Ancestral', level: 185, regionKey: 'capriel', element: 'FIRE', sprite: 'Fire Elemental', hp: 15320, attack: 397, defense: 348, experience: 54760, goldMin: 4833, goldMax: 9666 },
  { name: 'Golem Ancestral', level: 198, regionKey: 'capriel', sprite: 'Stone Golem', hp: 16227, attack: 322, defense: 369, experience: 62726, goldMin: 5495, goldMax: 10990 },
  { name: 'Gosma Primordial', level: 210, regionKey: 'capriel', sprite: 'Slime', hp: 17275, attack: 335, defense: 392, experience: 70560, goldMin: 6143, goldMax: 12286 },
  { name: 'Serpente Abissal', level: 222, regionKey: 'capriel', sprite: 'Young Sea Serpent', hp: 18097, attack: 352, defense: 411, experience: 78854, goldMin: 6827, goldMax: 13654 },
  { name: 'Dragão Ancião', level: 236, regionKey: 'capriel', element: 'FIRE', sprite: 'Dragon Lord', hp: 19273, attack: 500, defense: 436, experience: 89114, goldMin: 7670, goldMax: 15340 },
  { name: 'Infernatil', level: 250, regionKey: 'capriel', isBoss: true, element: 'FIRE', hp: 31674, attack: 1005, defense: 459, experience: 200000, goldMin: 8563, goldMax: 17126 },
];
// </monstros>
