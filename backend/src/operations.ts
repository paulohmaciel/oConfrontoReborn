import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { GameError } from './engine';
// Executar depois de adquirir o lock do personagem, na MESMA transação da mutação.
export async function once<T>(tx: Prisma.TransactionClient, characterId: number, key: string, payload: unknown, run: () => Promise<T>): Promise<T> {
  if (!/^[a-f0-9-]{36}$/.test(key)) throw new GameError(400, 'Chave de operação inválida.');
  const id = `${characterId}:${key}`;
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const previous = await tx.operation.findUnique({ where: { key: id } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new GameError(409, 'Chave já usada por outra operação.');
    return previous.result as T;
  }
  const result = await run();
  await tx.operation.create({ data: { key: id, fingerprint, result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue } });
  return result;
}
