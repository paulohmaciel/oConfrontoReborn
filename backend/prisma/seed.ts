import 'dotenv/config';
import { PrismaClient, ItemSlot } from '@prisma/client';
import manifest from '../../frontend/public/assets/tibia/manifest.json';
const prisma = new PrismaClient();
const sprite = (name: string) => manifest.entries.find(e => e.name === name)?.path ?? '';
// Atributos são balanceamento desta adaptação, não cópia automática da wiki.
const items: [string, ItemSlot, number, number, number, number, number][] = [
  ['Sword','WEAPON',12,10,0,80,1], ['Wooden Shield','SHIELD',0,10,0,50,1],
  ['Leather Armor','ARMOR',0,0,4,60,1],['Leather Helmet','HELMET',0,0,1,25,1],['Backpack','BACKPACK',0,0,0,20,1],
  ['Demon Helmet','HELMET',0,0,10,40000,30],['Magic Plate Armor','ARMOR',0,0,17,90000,40],
  ['Golden Legs','LEGS',0,0,9,30000,25],['Boots of Haste','BOOTS',0,0,2,30000,20],
  ['Mastermind Shield','SHIELD',0,37,0,50000,30],['Magic Longsword','WEAPON',55,40,0,150000,50],
  ['Fire Sword','WEAPON',35,20,0,4000,15],['Platinum Amulet','AMULET',0,0,2,2500,10],
  ['Ring of the Sky','RING',0,0,1,30000,20],['Health Potion','CONSUMABLE',0,0,0,50,1],
  ['Mana Potion','CONSUMABLE',0,0,0,60,1],['Pedra de Proteção','LOOT',0,0,0,0,1],['Gold Coin','LOOT',0,0,0,0,1]
  ,['Bow','WEAPON',12,0,0,80,1],['Wand of Vortex','WEAPON',0,0,0,80,1],['Snakebite Rod','WEAPON',0,0,0,80,1]
];
const monsters = [
  { name:'Rat',level:1,hp:20,experience:25,attack:8,defense:2,goldMin:5,goldMax:15 },
  { name:'Rotworm',level:5,hp:65,experience:80,attack:22,defense:8,goldMin:15,goldMax:35 },
  { name:'Cyclops',level:12,hp:260,experience:250,attack:50,defense:22,goldMin:30,goldMax:70 },
  { name:'Dragon',level:25,hp:1000,experience:700,attack:110,defense:65,goldMin:100,goldMax:250 },
  { name:'Dragon Lord',level:40,hp:1900,experience:2100,attack:210,defense:120,goldMin:200,goldMax:500 },
  { name:'Demon',level:60,hp:8200,experience:6000,attack:420,defense:250,goldMin:500,goldMax:1200 }
  ,{name:'Wolf',level:3,hp:55,experience:40,attack:16,defense:6,goldMin:8,goldMax:22}
  ,{name:'Orc',level:5,hp:95,experience:95,attack:25,defense:10,goldMin:20,goldMax:40}
  ,{name:'Minotaur',level:8,hp:160,experience:140,attack:34,defense:15,goldMin:25,goldMax:55}
  ,{name:'Ghoul',level:10,hp:220,experience:180,attack:40,defense:20,goldMin:35,goldMax:70}
  ,{name:'Guardião da Pedreira',level:4,hp:180,experience:180,attack:32,defense:14,goldMin:70,goldMax:110}
];
async function main() {
  for(const [name,slot,attack,defense,armor,npcPrice,minLevel] of items) {
    const effects:Record<string,{magicAttack?:number;criticalChance?:number;fireResistance?:number;speed?:number}>={
      Bow:{criticalChance:3,speed:3},'Wand of Vortex':{magicAttack:12},'Snakebite Rod':{magicAttack:10},
      'Boots of Haste':{speed:8},'Ring of the Sky':{criticalChance:8},'Platinum Amulet':{fireResistance:15},
      'Mastermind Shield':{fireResistance:20},'Magic Plate Armor':{fireResistance:25},'Fire Sword':{criticalChance:2},
    };
    const data = { name,slot,attack,defense,armor,npcPrice,minLevel,spriteUrl:sprite(name),magicAttack:0,criticalChance:0,fireResistance:0,speed:0,...effects[name] };
    await prisma.itemBlueprint.upsert({ where:{name},update:data,create:data });
  }
  for(const m of monsters) {
    const regionKey=['Rat','Rotworm','Wolf'].includes(m.name)?'outskirts':['Cyclops','Orc','Minotaur','Guardião da Pedreira'].includes(m.name)?'quarry':m.name==='Demon'?'abyss':'ruins';
    const isBoss=['Guardião da Pedreira','Dragon Lord','Demon'].includes(m.name);
    const data={...m,regionKey,isBoss,element:['Dragon','Dragon Lord','Demon'].includes(m.name)?'FIRE':'PHYSICAL',spriteUrl:sprite(m.name==='Guardião da Pedreira'?'Cyclops':m.name)};
    const monster = await prisma.monster.upsert({ where:{name:m.name},update:data,create:data });
    const bp = await prisma.itemBlueprint.findUniqueOrThrow({where:{name:m.level<12?'Health Potion':'Fire Sword'}});
    await prisma.monsterLoot.upsert({where:{monsterId_blueprintId:{monsterId:monster.id,blueprintId:bp.id}},update:{dropChance:.15,maxAmount:1},create:{monsterId:monster.id,blueprintId:bp.id,dropChance:.15,maxAmount:1}});
    // Pedra de Proteção: queda muito rara (0,3%; chefes 1%) só em monstros de nível 5+. Nunca é vendida por dinheiro real.
    if (m.level >= 5) {
      const stone = await prisma.itemBlueprint.findUniqueOrThrow({where:{name:'Pedra de Proteção'}});
      const chance = isBoss ? .01 : .003;
      await prisma.monsterLoot.upsert({where:{monsterId_blueprintId:{monsterId:monster.id,blueprintId:stone.id}},update:{dropChance:chance,maxAmount:1},create:{monsterId:monster.id,blueprintId:stone.id,dropChance:chance,maxAmount:1}});
    }
    const title = `Caçada: ${m.name}`;
    const taskData = {title,monsterId:monster.id,requiredKills:5,minLevel:Math.max(1,m.level-3),rewardExp:m.experience*5,rewardGold:m.goldMax*5};
    await prisma.taskBlueprint.upsert({where:{title},update:taskData,create:taskData});
  }
  console.log('Catálogo e tarefas preparados. Crie sua conta na interface. Nenhuma senha padrão foi criada.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
