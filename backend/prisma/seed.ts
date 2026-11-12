import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import manifest from '../../frontend/public/assets/tibia/manifest.json';
import { items, monsters } from './catalog';
import { materialForLevel } from '../../shared/forge';
const prisma = new PrismaClient();
const sprite = (name: string) => manifest.entries.find(e => e.name === name)?.path ?? '';
// Monstros que já existiam antes da fase 1 de níveis: mantêm a regra de loot original.
const original = new Set(['Rat', 'Wolf', 'Guardião da Pedreira', 'Rotworm', 'Orc', 'Minotaur', 'Ghoul', 'Cyclops', 'Dragon', 'Dragon Lord', 'Demon']);
async function main() {
  const missing = [...items.map(i => i.sprite ?? i.name), ...monsters.map(m => m.sprite ?? m.name)].filter(n => n !== 'Pedra de Proteção' && !sprite(n));
  if (missing.length) throw new Error(`Sem sprite no manifest.json: ${missing.join(', ')}. Importe com npm run icons antes do seed.`);
  for (const { sprite: spriteName, ...i } of items) {
    const data = { magicAttack: 0, criticalChance: 0, fireResistance: 0, speed: 0, vocations: 'ALL', ...i, spriteUrl: sprite(spriteName ?? i.name) };
    await prisma.itemBlueprint.upsert({ where: { name: i.name }, update: data, create: data });
  }
  const loot = async (monsterId: number, name: string, dropChance: number, maxAmount = 1) => {
    const bp = await prisma.itemBlueprint.findUniqueOrThrow({ where: { name } });
    await prisma.monsterLoot.upsert({ where: { monsterId_blueprintId: { monsterId, blueprintId: bp.id } }, update: { dropChance, maxAmount }, create: { monsterId, blueprintId: bp.id, dropChance, maxAmount } });
  };
  const gear = items.filter(i => i.npcPrice > 0 && !['CONSUMABLE', 'LOOT', 'BACKPACK'].includes(i.slot)).sort((a, b) => a.minLevel - b.minLevel);
  for (const [index, m] of monsters.entries()) {
    const { sprite: spriteName, ...fields } = m;
    const data = { isBoss: false, element: 'PHYSICAL', ...fields, spriteUrl: sprite(spriteName ?? m.name) };
    const monster = await prisma.monster.upsert({ where: { name: m.name }, update: data, create: data });
    if (original.has(m.name)) await loot(monster.id, m.level < 12 ? 'Health Potion' : 'Fire Sword', .15);
    else {
      // Poções comuns e, raramente, um equipamento da própria faixa (sorteado entre os da faixa pela ordem do catálogo).
      await loot(monster.id, 'Health Potion', .15);
      await loot(monster.id, 'Mana Potion', .1);
      const band = gear.filter(i => i.minLevel <= m.level && i.minLevel > m.level - 25);
      if (band.length) await loot(monster.id, band[index % band.length].name, m.isBoss ? .08 : .02);
    }
    // Material do Ferreiro da faixa do monstro: 30% de chance (1 a 2); chefes sempre deixam (1 a 6).
    await loot(monster.id, materialForLevel(m.level).name, m.isBoss ? 1 : .3, m.isBoss ? 6 : 2);
    // Pedra de Proteção: queda muito rara (0,3%; chefes 1%) só em monstros de nível 5+. Nunca é vendida por dinheiro real.
    if (m.level >= 5) await loot(monster.id, 'Pedra de Proteção', m.isBoss ? .01 : .003);
    const title = `Caçada: ${m.name}`;
    const taskData = { title, monsterId: monster.id, requiredKills: 5, minLevel: Math.max(1, m.level - 3), rewardExp: m.experience * 5, rewardGold: m.goldMax * 5 };
    await prisma.taskBlueprint.upsert({ where: { title }, update: taskData, create: taskData });
  }
  console.log(`Catálogo e tarefas preparados (${items.length} itens, ${monsters.length} monstros). Crie sua conta na interface. Nenhuma senha padrão foi criada.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
