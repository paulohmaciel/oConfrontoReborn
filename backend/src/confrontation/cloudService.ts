// Save na nuvem do Confrontation e rankings. Um envio passa pelos tetos de `syncRules` dentro de uma
// transação com a conta travada (`lockAccount`): dois envios ao mesmo tempo nunca gastam a mesma franquia de horas.
import { prisma, lockAccount } from '../core/db';
import { GameError } from '../core/engine';
import { loadSettings } from '../core/settings';
import { PAGE_SIZE } from '../core/http';
import {
  capProgress, hoursSince, isConfrontationSave, isoWeek, progressJson, progressOf, rankMetrics, withGoldCut,
  type Progress, type RankMetric,
} from './syncRules';

/** Tamanho máximo do save em texto JSON. O corpo da rota aceita um pouco mais (512 KB). */
export const MAX_SAVE_CHARS = 450_000;

const recordOf = (s: { goldTotal: bigint; xpTotal: bigint; items: number; furthest: number; vigilBest: number; power: bigint }): Progress =>
  ({ goldTotal: s.goldTotal, xpTotal: s.xpTotal, items: s.items, furthest: s.furthest, vigilBest: s.vigilBest, power: s.power });

/** Resumo do save guardado (sem os dados), ou `null`. */
export async function saveInfo(accountId: number) {
  const s = await prisma.confrontationSave.findUnique({ where: { accountId }, select: { version: true, savedAt: true, clientSavedAt: true, sizeBytes: true, goldTotal: true, xpTotal: true, items: true, furthest: true, vigilBest: true, power: true } });
  if (!s) return null;
  return { version: s.version, savedAt: s.savedAt.toISOString(), clientSavedAt: s.clientSavedAt?.toISOString() ?? null, sizeBytes: s.sizeBytes, verified: progressJson(recordOf(s)) };
}

/** O save guardado, com os dados, ou `null`. */
export async function loadSave(accountId: number) {
  const s = await prisma.confrontationSave.findUnique({ where: { accountId } });
  if (!s) return null;
  return { version: s.version, savedAt: s.savedAt.toISOString(), data: JSON.parse(s.data) as unknown, verified: progressJson(recordOf(s)) };
}

// `adjusted`: o que foi cortado — nomes das métricas de `Progress` e 'gold' (só o ouro em mãos, acima do total da vida).
export type PutResult =
  | { conflict: true; version: number; savedAt: string }
  | { conflict: false; version: number; savedAt: string; adjusted: string[]; hours: number; verified: ReturnType<typeof progressJson>; data?: unknown };

/**
 * Guarda um save novo. `baseVersion` é a versão que o app recebeu por último (0 = nunca enviou);
 * se a nuvem tem outra, é conflito (outro aparelho enviou antes), a menos que `force`.
 * Com ou sem `force`, os tetos valem contra o último registro verificado.
 */
export async function putSave(accountId: number, body: any, now = new Date()): Promise<PutResult> {
  const data = body?.data;
  if (!isConfrontationSave(data)) throw new GameError(400, 'Save inválido.');
  const text = JSON.stringify(data);
  if (text.length > MAX_SAVE_CHARS) throw new GameError(413, 'Save maior que o limite permitido.');
  const baseVersion = Number.isSafeInteger(body?.baseVersion) && body.baseVersion >= 0 ? body.baseVersion as number : 0;
  const force = body?.force === true;
  const clientSavedAt = typeof data.last_seen === 'number' && Number.isFinite(data.last_seen) && data.last_seen > 0
    ? new Date(Math.min(data.last_seen * 1000, now.getTime() + 86_400_000)) : null;

  return prisma.$transaction(async tx => {
    await lockAccount(tx, accountId);
    const existing = await tx.confrontationSave.findUnique({ where: { accountId } });
    if (existing && !force && existing.version !== baseVersion)
      return { conflict: true as const, version: existing.version, savedAt: existing.savedAt.toISOString() };
    const caps = await loadSettings(tx);
    const prev = existing ? recordOf(existing) : { goldTotal: 0n, xpTotal: 0n, items: 0, furthest: 1, vigilBest: 0, power: 0n };
    const hours = hoursSince(existing?.verifiedAt ?? null, now, caps);
    const claimed = progressOf(data, body?.summary);
    const capped = capProgress(prev, claimed, hours, caps);
    const accepted = capped.accepted;
    const cut = withGoldCut(data, claimed, accepted);
    const adjusted: string[] = cut && !capped.adjusted.includes('goldTotal') ? [...capped.adjusted, 'gold'] : capped.adjusted;
    const storedText = cut ? JSON.stringify(cut) : text;
    const version = (existing?.version ?? 0) + 1;
    const fields = { version, data: storedText, sizeBytes: Buffer.byteLength(storedText), clientSavedAt, savedAt: now, verifiedAt: now, ...accepted };
    await tx.confrontationSave.upsert({
      where: { accountId },
      create: { accountId, ...fields, syncs: 1, adjustments: adjusted.length ? 1 : 0 },
      update: { ...fields, syncs: { increment: 1 }, adjustments: { increment: adjusted.length ? 1 : 0 } },
    });
    await tx.confrontationSync.create({ data: { accountId, version, hours, claimed: progressJson(claimed), accepted: progressJson(accepted), adjusted: adjusted.join(',') } });
    // Rankings: o melhor valor verificado, geral e da semana. Empate: quem chegou primeiro fica na frente.
    for (const [metric, field] of Object.entries(rankMetrics) as [RankMetric, keyof Progress][]) {
      const value = BigInt(accepted[field]);
      if (metric !== 'STAGE' && value <= 0n) continue;
      for (const period of ['all', isoWeek(now)]) {
        const row = await tx.confrontationRank.findUnique({ where: { accountId_period_metric: { accountId, period, metric } } });
        if (!row) await tx.confrontationRank.create({ data: { accountId, period, metric, value, reachedAt: now } });
        else if (value > row.value) await tx.confrontationRank.update({ where: { id: row.id }, data: { value, reachedAt: now } });
      }
    }
    return { conflict: false as const, version, savedAt: now.toISOString(), adjusted, hours, verified: progressJson(accepted), ...(cut ? { data: cut } : {}) };
  });
}

/** Uma página do ranking (10 por página) e a posição de quem pediu, se tiver entrado. */
export async function rankings(metric: RankMetric, period: 'week' | 'all', page: number, accountId?: number, now = new Date()) {
  const key = period === 'week' ? isoWeek(now) : 'all';
  const where = { period: key, metric };
  const skip = (page - 1) * PAGE_SIZE;
  const [total, rows] = await Promise.all([
    prisma.confrontationRank.count({ where }),
    prisma.confrontationRank.findMany({ where, orderBy: [{ value: 'desc' }, { reachedAt: 'asc' }, { id: 'asc' }], skip, take: PAGE_SIZE,
      include: { account: { select: { characters: { select: { name: true }, orderBy: { id: 'asc' }, take: 1 } } } } }),
  ]);
  const items = rows.map((r, i) => ({ rank: skip + i + 1, name: r.account.characters[0]?.name ?? `Jogador ${r.accountId}`, value: r.value.toString(), mine: r.accountId === accountId }));
  let me: { rank: number; value: string } | null = null;
  if (accountId) {
    const mine = await prisma.confrontationRank.findUnique({ where: { accountId_period_metric: { accountId, period: key, metric } } });
    if (mine) {
      const ahead = await prisma.confrontationRank.count({ where: { ...where, OR: [{ value: { gt: mine.value } }, { value: mine.value, reachedAt: { lt: mine.reachedAt } }, { value: mine.value, reachedAt: mine.reachedAt, id: { lt: mine.id } }] } });
      me = { rank: ahead + 1, value: mine.value.toString() };
    }
  }
  return { metric, period, key, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, items, me };
}
