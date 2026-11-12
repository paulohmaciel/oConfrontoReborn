// Regras puras da sincronização do Confrontation (app Godot): o que o servidor aceita de um save novo.
// Sem banco e sem relógio próprio: tudo entra por parâmetro, para os testes unitários cobrirem cada teto.
import type { Settings } from '../../../shared/economy';

/** O progresso que importa para a economia e os rankings, lido de um save do app. */
export interface Progress {
  /** Ouro ganho na vida toda (`counters.gold`): só cresce, gastar não diminui. */
  goldTotal: bigint;
  /** XP ganho pelo herói na vida toda (`counters.xp`). */
  xpTotal: bigint;
  /** Itens coletados na vida toda (`counters.items`). */
  items: number;
  /** Fase mais longe alcançada (`furthest`). */
  furthest: number;
  /** Vigília mais alta (`counters.vigil_best`, ou `vigil` se maior). */
  vigilBest: number;
  /** Poder da companhia em campo, calculado pelo app com a fórmula do jogo. */
  power: bigint;
}
export type Metric = keyof Progress;
export const progressKeys: Metric[] = ['goldTotal', 'xpTotal', 'items', 'furthest', 'vigilBest', 'power'];

/** O começo de um jogo novo: base do primeiro envio. */
export const freshProgress = (): Progress => ({ goldTotal: 0n, xpTotal: 0n, items: 0, furthest: 1, vigilBest: 0, power: 0n });

export type Caps = Pick<Settings, 'confrontation.goldPerHour' | 'confrontation.xpPerHour' | 'confrontation.stageGrowthPercent'
  | 'confrontation.itemsPerHour' | 'confrontation.stagesPerHour' | 'confrontation.maxStage' | 'confrontation.vigilPerHour'
  | 'confrontation.powerPercentPerHour' | 'confrontation.powerPerHour' | 'confrontation.firstSyncHours'>;

/** Teto por hora de ouro ou XP numa fase: base × (crescimento/100)^(fase − 1). */
export function perHourAtStage(base: number, growthPercent: number, stage: number): number {
  return base * Math.pow(growthPercent / 100, Math.max(0, stage - 1));
}
const bigFloor = (n: number) => (Number.isFinite(n) && n > 0 ? BigInt(Math.floor(Math.min(n, 9e18))) : 0n);

/**
 * Compara o que o app diz com o último registro verificado e devolve o que entra.
 * Cada número pode crescer no máximo o teto × horas desde o último envio aceito (relógio do servidor).
 * Pode descer à vontade (um jogo novo, por exemplo): o "melhor de sempre" do ranking não desce.
 * `adjusted` lista as métricas cortadas.
 */
export function capProgress(prev: Progress, claimed: Progress, hours: number, caps: Caps): { accepted: Progress; adjusted: Metric[] } {
  const h = Math.max(0, Number.isFinite(hours) ? hours : 0);
  const adjusted: Metric[] = [];
  const maxStage = caps['confrontation.maxStage'];
  const clampNum = (key: Metric, value: number, limit: number) => { if (value > limit) { adjusted.push(key); return limit; } return value; };
  const clampBig = (key: Metric, value: bigint, limit: bigint) => { if (value > limit) { adjusted.push(key); return limit; } return value; };

  const furthest = clampNum('furthest', claimed.furthest, Math.min(maxStage, prev.furthest + Math.floor(caps['confrontation.stagesPerHour'] * h)));
  // O teto de ouro e XP segue a fase alcançada (a mais alta entre a anterior e a aceita agora): fases novas pagam mais.
  const stage = Math.max(prev.furthest, furthest);
  const growth = caps['confrontation.stageGrowthPercent'];
  const goldTotal = clampBig('goldTotal', claimed.goldTotal, prev.goldTotal + bigFloor(perHourAtStage(caps['confrontation.goldPerHour'], growth, stage) * h));
  const xpTotal = clampBig('xpTotal', claimed.xpTotal, prev.xpTotal + bigFloor(perHourAtStage(caps['confrontation.xpPerHour'], growth, stage) * h));
  const items = clampNum('items', claimed.items, prev.items + Math.floor(caps['confrontation.itemsPerHour'] * h));
  // A Vigília só existe depois da última fase da campanha.
  const vigilLimit = furthest >= maxStage ? prev.vigilBest + Math.floor(caps['confrontation.vigilPerHour'] * h) : prev.vigilBest;
  const vigilBest = clampNum('vigilBest', claimed.vigilBest, vigilLimit);
  // Poder: o maior entre crescer uma porcentagem do último verificado e somar um tanto fixo por hora (para quem parte de pouco).
  const byPercent = prev.power + bigFloor(Number(prev.power) * caps['confrontation.powerPercentPerHour'] / 100 * h);
  const byFlat = prev.power + bigFloor(caps['confrontation.powerPerHour'] * h);
  const power = clampBig('power', claimed.power, byPercent > byFlat ? byPercent : byFlat);
  return { accepted: { goldTotal, xpTotal, items, furthest, vigilBest, power }, adjusted };
}

/** Horas entre dois envios pelo relógio do servidor; o primeiro envio vale `firstSyncHours`. */
export function hoursSince(previous: Date | null, now: Date, caps: Pick<Caps, 'confrontation.firstSyncHours'>): number {
  if (!previous) return caps['confrontation.firstSyncHours'];
  return Math.max(0, (now.getTime() - previous.getTime()) / 3_600_000);
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(Math.min(v, Number.MAX_SAFE_INTEGER)) : 0);
const big = (v: unknown) => { const n = int(v); const b = BigInt(n); return b > MAX_SAFE ? MAX_SAFE : b; };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Confere a forma mínima de um save do Confrontation (`Game.save_data()`, versão 1). */
export function isConfrontationSave(data: unknown): data is Record<string, unknown> {
  return isObject(data) && data.v === 1 && Array.isArray(data.members) && isObject(data.counters) && typeof data.gold === 'number';
}

/** Lê o progresso de um save e do resumo que o app manda junto (só o poder, que depende das fórmulas do jogo). */
export function progressOf(data: Record<string, unknown>, summary: unknown): Progress {
  const counters = isObject(data.counters) ? data.counters : {};
  const s = isObject(summary) ? summary : {};
  return {
    goldTotal: big(counters.gold),
    xpTotal: big(counters.xp),
    items: int(counters.items),
    furthest: Math.max(1, int(data.furthest)),
    vigilBest: Math.max(int(counters.vigil_best), int(data.vigil)),
    power: big(s.power),
  };
}

/**
 * Ouro cortado: tira do ouro em mãos o que passou do teto (sem ficar negativo) e acerta o total da vida.
 * O ouro em mãos nunca passa do total ganho na vida que o servidor aceitou: no jogo todo ouro entra pelo
 * total, então "mais ouro em mãos do que já ganhou" só aparece num save editado.
 * Devolve o save corrigido (cópia) ou `null` quando nada mudou.
 */
export function withGoldCut(data: Record<string, unknown>, claimed: Progress, accepted: Progress): Record<string, unknown> | null {
  const inHand = typeof data.gold === 'number' && Number.isFinite(data.gold) ? data.gold : 0;
  const total = Number(accepted.goldTotal);
  const excess = accepted.goldTotal < claimed.goldTotal ? Number(claimed.goldTotal - accepted.goldTotal) : 0;
  // +1 de folga: o total verificado é inteiro e o ouro do jogo tem centavos.
  const left = inHand - excess;
  const gold = Math.max(0, left > total + 1 ? total : left);
  if (excess === 0 && gold === inHand) return null;
  const counters = { ...(isObject(data.counters) ? data.counters : {}), ...(excess > 0 ? { gold: total } : {}) };
  return { ...data, gold, counters };
}

/** Semana ISO do instante, em UTC: "2026-W46". A semana começa na segunda-feira. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Métricas de ranking: nome curto (coluna `metric`) → campo verificado. */
export const rankMetrics = { VIGIL: 'vigilBest', POWER: 'power', STAGE: 'furthest' } as const satisfies Record<string, Metric>;
export type RankMetric = keyof typeof rankMetrics;
export function parseRankMetric(value: unknown): RankMetric | null {
  const key = typeof value === 'string' ? value.toUpperCase() : '';
  return Object.prototype.hasOwnProperty.call(rankMetrics, key) ? key as RankMetric : null;
}

/** Progresso em JSON (BigInt vira texto), para a auditoria e as respostas. */
export const progressJson = (p: Progress) => ({ ...p, goldTotal: p.goldTotal.toString(), xpTotal: p.xpTotal.toString(), power: p.power.toString() });
