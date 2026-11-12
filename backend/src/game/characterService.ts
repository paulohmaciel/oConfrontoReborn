import { Prisma, type Vocation } from '@prisma/client';
import { transaction, lockCharacter, lockAccount } from '../core/db';
import { GameError } from '../core/engine';
import { addGold, recordGold, recordItem } from '../economy/economy';
import { loadSettings } from '../core/settings';
import { isPremium } from '../premium/premium';
import { event } from './adventureService';
import { promotedOf, baseVocation, vocations, classLevels, classTierOf, classLabel, classCost, classBonus, MAX_CLASS_TIER, type BaseVocation } from '../../../shared/adventure';

export const CHARACTER_NAME = /^[\p{L}][\p{L}0-9 ]{2,23}$/u;
export function parseCharacterName(value: unknown) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!CHARACTER_NAME.test(name)) throw new GameError(400, 'Nome deve ter entre 3 e 24 letras, números ou espaços.');
  return name;
}
export function parseVocation(value: unknown): BaseVocation {
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(vocations, value)) throw new GameError(400, 'Vocação inválida.');
  return value as BaseVocation;
}
// Personagem + kit inicial (arma da vocação, escudo, armadura, elmo, mochila), tudo registrado no livro-razão.
export async function createCharacterKit(tx: Prisma.TransactionClient, accountId: number, name: string, vocation: BaseVocation, opts: { vocationChosen: boolean; startingGold: bigint }) {
  const c = await tx.character.create({ data: { accountId, name, vocation, vocationChosen: opts.vocationChosen, statPoints: 3, goldInHand: opts.startingGold } });
  if (opts.startingGold > 0n) await recordGold(tx, c.id, opts.startingGold, opts.startingGold, 'STARTER');
  const starter = await tx.itemBlueprint.findMany({ where: { name: { in: [vocations[vocation].starter, 'Wooden Shield', 'Leather Armor', 'Leather Helmet', 'Backpack'] } } });
  await tx.inventoryItem.createMany({ data: starter.map(bp => ({ characterId: c.id, blueprintId: bp.id, isEquipped: true, equippedSlot: bp.slot })) });
  for (const bp of starter) await recordItem(tx, c.id, bp.id, 1, 'STARTER');
  return c;
}
export async function characterLimit(tx: Prisma.TransactionClient, accountId: number) {
  const [settings, premium] = await Promise.all([loadSettings(tx), isPremium(tx, accountId)]);
  return { limit: premium ? settings['characters.premium'] : settings['characters.free'], premium };
}
// Personagens extras começam com pouco ouro para que contas secundárias não virem um atalho de economia.
export const EXTRA_CHARACTER_GOLD = 100n;
export async function createExtraCharacter(accountId: number, rawName: unknown, rawVocation: unknown) {
  const name = parseCharacterName(rawName), vocation = parseVocation(rawVocation);
  try {
    return await transaction(async tx => {
      await lockAccount(tx, accountId);
      const [count, { limit }] = await Promise.all([tx.character.count({ where: { accountId } }), characterLimit(tx, accountId)]);
      if (count >= limit) throw new GameError(409, count >= 1 && limit === 1 ? 'Sua conta gratuita tem 1 personagem. O Premium libera personagens extras para experimentar outras vocações.' : 'Limite de personagens da conta atingido.');
      const c = await createCharacterKit(tx, accountId, name, vocation, { vocationChosen: true, startingGold: EXTRA_CHARACTER_GOLD });
      await event(tx, c.id, 'VOCATION', 'Uma nova vocação', `Você começou como ${vocations[vocation].name}.`);
      return { id: c.id, name: c.name, vocation: c.vocation };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new GameError(409, 'Esse nome já está em uso.');
    throw e;
  }
}
export async function promoteCharacter(accountId: number, characterId: number) {
  return transaction(async tx => {
    const c = await lockCharacter(tx, accountId, characterId);
    // Sobe para a próxima classe: a 1ª é a promoção (muda a vocação); da 2ª à 8ª, só o classTier.
    if (!c.vocationChosen) throw new GameError(409, 'Escolha uma vocação antes de ser promovido.');
    const current = classTierOf(c.vocation, c.classTier), next = current + 1;
    if (next > MAX_CLASS_TIER) throw new GameError(409, 'Seu personagem já está na classe mais alta.');
    const needLevel = classLevels[next - 1];
    if (c.level < needLevel) throw new GameError(409, `A próxima classe exige nível ${needLevel}.`);
    if (await tx.battle.findFirst({ where: { characterId, isFinished: false } })) throw new GameError(409, 'Encerre o combate antes da promoção.');
    const settings = await loadSettings(tx), cost = classCost(next, settings['class.promotionGold']);
    if (c.goldInHand < cost) throw new GameError(409, `A próxima classe custa ${cost.toLocaleString('pt-BR')} ouro.`);
    const vocation = next === 1 ? promotedOf[baseVocation(c.vocation)] : c.vocation, name = classLabel(vocation, next);
    await addGold(tx, characterId, -cost, 'PROMOTION');
    await tx.character.update({ where: { id: characterId }, data: { vocation: vocation as Vocation, classTier: next, promotedAt: new Date() } });
    const bonus = next === 1 ? 'Ataque e defesa +10% e +2 de crítico.' : `Ataque e defesa +${Math.round(classBonus.attack * 100)}% e +${classBonus.critical} de crítico.`;
    await event(tx, characterId, 'PROMOTION', name, `Nova classe por ${cost.toLocaleString('pt-BR')} ouro. ${bonus}`);
    return { vocation, classTier: next, className: name, spent: cost.toString(), message: `Você agora é ${name}! ${bonus}` };
  });
}
