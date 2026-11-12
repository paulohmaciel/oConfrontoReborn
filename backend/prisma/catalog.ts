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
  { name: 'Dragon', level: 25, regionKey: 'ruins', element: 'FIRE', hp: 2487, attack: 85, defense: 61, experience: 1000, goldMin: 100, goldMax: 250 },
  { name: 'Dragon Lord', level: 40, regionKey: 'ruins', isBoss: true, element: 'FIRE', hp: 5483, attack: 261, defense: 84, experience: 2560, goldMin: 200, goldMax: 500 },
  { name: 'Demon', level: 60, regionKey: 'abyss', isBoss: true, element: 'FIRE', hp: 8327, attack: 378, defense: 122, experience: 6000, goldMin: 500, goldMax: 1200 },
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
  { name: 'Bonelord', level: 21, regionKey: 'ruins', hp: 2096, attack: 70, defense: 53, experience: 706, goldMin: 118, goldMax: 236 },
  { name: 'Orc Shaman', level: 22, regionKey: 'orc_camp', hp: 2213, attack: 71, defense: 55, experience: 774, goldMin: 127, goldMax: 254 },
  { name: 'Amazon', level: 26, regionKey: 'orc_camp', hp: 2567, attack: 79, defense: 62, experience: 1082, goldMin: 163, goldMax: 326 },
  { name: 'Orc Berserker', level: 29, regionKey: 'orc_camp', hp: 2834, attack: 85, defense: 66, experience: 1346, goldMin: 192, goldMax: 384 },
  { name: 'Minotaur Archer', level: 31, regionKey: 'labyrinth', hp: 2952, attack: 96, defense: 69, experience: 1538, goldMin: 213, goldMax: 426 },
  { name: 'Valkyrie', level: 33, regionKey: 'orc_camp', hp: 3135, attack: 98, defense: 72, experience: 1742, goldMin: 235, goldMax: 470 },
  { name: 'Minotaur Mage', level: 35, regionKey: 'labyrinth', hp: 3320, attack: 100, defense: 76, experience: 1960, goldMin: 258, goldMax: 516 },
  { name: 'Orc Leader', level: 36, regionKey: 'orc_camp', isBoss: true, hp: 4867, attack: 146, defense: 77, experience: 4148, goldMin: 270, goldMax: 540 },
  { name: 'Minotaur Guard', level: 41, regionKey: 'labyrinth', hp: 3759, attack: 110, defense: 85, experience: 2690, goldMin: 333, goldMax: 666 },
  { name: 'Demon Skeleton', level: 46, regionKey: 'abyss', hp: 4168, attack: 113, defense: 95, experience: 3386, goldMin: 403, goldMax: 806 },
  { name: 'Fire Devil', level: 51, regionKey: 'abyss', element: 'FIRE', hp: 4730, attack: 180, defense: 108, experience: 4162, goldMin: 478, goldMax: 956 },
  { name: 'Fire Elemental', level: 56, regionKey: 'abyss', element: 'FIRE', hp: 5038, attack: 194, defense: 115, experience: 5018, goldMin: 560, goldMax: 1120 },
  { name: 'Frost Troll', level: 60, regionKey: 'frost', hp: 5416, attack: 140, defense: 122, experience: 5760, goldMin: 630, goldMax: 1260 },
  { name: 'Winter Wolf', level: 64, regionKey: 'frost', hp: 5682, attack: 144, defense: 128, experience: 6554, goldMin: 704, goldMax: 1408 },
  { name: 'Polar Bear', level: 69, regionKey: 'frost', hp: 6014, attack: 149, defense: 136, experience: 7618, goldMin: 802, goldMax: 1604 },
  { name: 'Mammoth', level: 75, regionKey: 'frost', hp: 6763, attack: 160, defense: 153, experience: 9000, goldMin: 928, goldMax: 1856 },
  { name: 'Swamp Troll', level: 80, regionKey: 'swamp', hp: 7115, attack: 165, defense: 161, experience: 10240, goldMin: 1040, goldMax: 2080 },
  { name: 'Killer Caiman', level: 85, regionKey: 'swamp', hp: 7441, attack: 176, defense: 170, experience: 11560, goldMin: 1158, goldMax: 2316 },
  { name: 'Witch', level: 90, regionKey: 'swamp', hp: 7793, attack: 181, defense: 178, experience: 12960, goldMin: 1283, goldMax: 2566 },
  { name: 'Giant Spider', level: 100, regionKey: 'swamp', isBoss: true, hp: 12920, attack: 343, defense: 192, experience: 32000, goldMin: 1550, goldMax: 3100 },
];
// </monstros>
