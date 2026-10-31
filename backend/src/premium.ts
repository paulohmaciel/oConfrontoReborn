import { Prisma, PrismaClient } from '@prisma/client';
import { lockAccount } from './db';
import { layoutPeriods } from '../../shared/premium';
type Db = Prisma.TransactionClient | PrismaClient;
const DAY = 86_400_000;
// Executar dentro de transação que já travou a conta (lockAccount).
export async function recomputePeriods(tx: Prisma.TransactionClient, accountId: number) {
  const periods = await tx.premiumPeriod.findMany({ where: { accountId }, orderBy: { id: 'asc' } });
  for (const slot of layoutPeriods(periods)) {
    const current = periods.find(p => p.id === slot.id)!;
    if (current.startsAt.getTime() !== slot.startsAt.getTime() || current.endsAt.getTime() !== slot.endsAt.getTime())
      await tx.premiumPeriod.update({ where: { id: slot.id }, data: { startsAt: slot.startsAt, endsAt: slot.endsAt } });
  }
}
export async function grantPeriod(tx: Prisma.TransactionClient, input: { accountId: number; days: number; source: 'PURCHASE' | 'PROMO' | 'CORRECTION'; orderId?: number; reason?: string; createdById?: number }) {
  await lockAccount(tx, input.accountId);
  const now = new Date();
  const period = await tx.premiumPeriod.create({ data: { accountId: input.accountId, source: input.source, orderId: input.orderId ?? null, days: input.days,
    startsAt: now, endsAt: new Date(now.getTime() + input.days * DAY), reason: input.reason ?? null, createdById: input.createdById ?? null, createdAt: now } });
  await recomputePeriods(tx, input.accountId);
  return tx.premiumPeriod.findUniqueOrThrow({ where: { id: period.id } });
}
export async function revokePeriod(tx: Prisma.TransactionClient, periodId: number, actorId: number | null, reason: string) {
  const period = await tx.premiumPeriod.findUniqueOrThrow({ where: { id: periodId } });
  await lockAccount(tx, period.accountId);
  if (!period.revokedAt) await tx.premiumPeriod.update({ where: { id: periodId }, data: { revokedAt: new Date(), revokedById: actorId, revokeReason: reason.slice(0, 500) } });
  await recomputePeriods(tx, period.accountId);
}
export async function premiumStatus(db: Db, accountId: number) {
  const now = new Date();
  const periods = await db.premiumPeriod.findMany({ where: { accountId, revokedAt: null, endsAt: { gt: now } }, orderBy: { endsAt: 'desc' } });
  const active = periods.some(p => p.startsAt <= now);
  return { active, until: active ? periods[0].endsAt : null, upcoming: !active && periods.length > 0 ? periods[periods.length - 1].startsAt : null };
}
export async function isPremium(db: Db, accountId: number) { return (await premiumStatus(db, accountId)).active; }
