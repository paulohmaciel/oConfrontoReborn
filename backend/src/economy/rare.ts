// Itens raros: todo equipamento que chega ao +10 ganha um número exclusivo (por tipo de item) e uma história.
// O registro (RareItem) NUNCA é apagado: quando o item sai do jogo ele só passa a "RETIRED", e a história permanece.
// Chamar sempre dentro da transação, depois de lockCharacter.
import { Prisma } from '@prisma/client';
type Tx = Prisma.TransactionClient;

export const RARE_TIER = 10;
export const retireReasons = { NPC_SELL: 'Vendido ao NPC', ADMIN: 'Removido pela equipe' } as const;

/** Registra o item recém-chegado ao +10. Idempotente: se já for raro, devolve o registro existente. */
export async function makeRare(tx: Tx, item: { id: number; blueprintId: number; rareItemId: number | null }, creatorId: number, creatorName: string) {
  if (item.rareItemId) return tx.rareItem.findUniqueOrThrow({ where: { id: item.rareItemId } });
  // Trava o tipo de item para os números saírem em sequência e sem repetição, mesmo com duas forjas ao mesmo tempo.
  await tx.$queryRaw`SELECT id FROM ItemBlueprint WHERE id = ${item.blueprintId} FOR UPDATE`;
  const last = await tx.rareItem.aggregate({ where: { blueprintId: item.blueprintId }, _max: { serial: true } });
  const serial = (last._max.serial ?? 0) + 1;
  const rare = await tx.rareItem.create({ data: { blueprintId: item.blueprintId, serial, creatorId, firstOfKind: serial === 1 } });
  await tx.inventoryItem.update({ where: { id: item.id }, data: { rareItemId: rare.id } });
  await tx.rareItemEvent.create({ data: { rareItemId: rare.id, kind: 'CREATED', detail: `Aprimorado até +${RARE_TIER} por ${creatorName}.` } });
  if (rare.firstOfKind) await tx.rareItemEvent.create({ data: { rareItemId: rare.id, kind: 'FIRST', detail: `Primeiro ${RARE_TIER === 10 ? '+10' : ''} deste tipo de equipamento.` } });
  return rare;
}

/** O item raro saiu de circulação (vendido ao NPC, removido pela equipe). A história fica marcada como "destruído". */
export async function retireRare(tx: Tx, rareItemId: number | null | undefined, reason: keyof typeof retireReasons) {
  if (!rareItemId) return;
  await tx.rareItem.update({ where: { id: rareItemId }, data: { status: 'RETIRED', retiredAt: new Date(), retiredReason: retireReasons[reason] } });
  await tx.rareItemEvent.create({ data: { rareItemId, kind: 'RETIRED', detail: retireReasons[reason] + '.' } });
}

/** Dados públicos para inspeção. O nome do criador só aparece se ele não pediu anonimato. */
export function publicRare(r: { id: number; serial: number; firstOfKind: boolean; status: string; createdAt: Date; retiredAt: Date | null; retiredReason: string | null;
  blueprint: { name: string; spriteUrl: string }; creator: { name: string; fameHidden: boolean } | null; events?: { kind: string; detail: string; createdAt: Date }[] }) {
  const show = r.creator && !r.creator.fameHidden;
  return {
    id: r.id, name: r.blueprint.name, spriteUrl: r.blueprint.spriteUrl, serial: r.serial, label: `${r.blueprint.name} +${RARE_TIER} — Nº ${String(r.serial).padStart(6, '0')}`,
    creator: show ? r.creator!.name : null, anonymous: !!r.creator && !show, firstOfKind: r.firstOfKind,
    status: r.status, destroyed: r.status !== 'CIRCULATING', createdAt: r.createdAt, retiredAt: r.retiredAt, retiredReason: r.retiredReason,
    // A história não cita o criador pelo nome (o texto gravado serve só à equipe); marcos públicos são genéricos.
    events: r.events?.map(e => ({ kind: e.kind, at: e.createdAt, detail: e.kind === 'CREATED' ? (show ? e.detail : `Aprimorado até +${RARE_TIER} por um aventureiro anônimo.`) : e.detail })),
  };
}
