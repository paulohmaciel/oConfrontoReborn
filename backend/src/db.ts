import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { GameError, integer } from './engine';
export const prisma = new PrismaClient();
export async function transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}
// Todas as mutações do personagem devem obter este mesmo lock, antes de ler seu estado.
export async function lockCharacter(tx: Prisma.TransactionClient, accountId: number, characterId: number) {
  integer(accountId); integer(characterId);
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM \`Character\` WHERE id = ${characterId} AND accountId = ${accountId} FOR UPDATE`;
  if (rows.length !== 1) throw new GameError(404, 'Personagem não encontrado.');
  return tx.character.findUniqueOrThrow({ where: { id: characterId } });
}

// Uso administrativo/serviços internos: não verifica o dono. Nunca exponha a rotas de jogadores.
export async function lockCharacterAny(tx: Prisma.TransactionClient, characterId: number) {
  integer(characterId);
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM \`Character\` WHERE id = ${characterId} FOR UPDATE`;
  if (rows.length !== 1) throw new GameError(404, 'Personagem não encontrado.');
  return tx.character.findUniqueOrThrow({ where: { id: characterId } });
}
// Serializa operações por conta (limite de personagens, períodos Premium).
export async function lockAccount(tx: Prisma.TransactionClient, accountId: number) {
  integer(accountId);
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM \`Account\` WHERE id = ${accountId} FOR UPDATE`;
  if (rows.length !== 1) throw new GameError(404, 'Conta não encontrada.');
}
