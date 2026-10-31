import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

// Monitoramento em memória: sem dependências e sem dados pessoais. Zera ao reiniciar o servidor;
// para histórico longo, aponte um monitor externo (UptimeRobot etc.) para /api/health e leia os logs JSON.
const startedAt = Date.now();
const recentErrors: { at: string; requestId: string; method: string; path: string; message: string }[] = [];
const window: number[] = []; // durações (ms) das últimas requisições
const totals = { requests: 0, status2xx: 0, status4xx: 0, status5xx: 0 };

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const id = randomUUID();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      totals.requests++;
      if (res.statusCode >= 500) totals.status5xx++; else if (res.statusCode >= 400) totals.status4xx++; else totals.status2xx++;
      window.push(ms); if (window.length > 500) window.shift();
      if (ms > 2000) log('warn', 'requisição lenta', { requestId: id, method: req.method, path: req.path, ms: Math.round(ms) });
    });
    next();
  };
}

export function log(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

export function recordError(error: unknown, req: { method: string; path: string }, id: string) {
  const message = error instanceof Error ? error.message : String(error);
  recentErrors.unshift({ at: new Date().toISOString(), requestId: id, method: req.method, path: req.path, message: message.slice(0, 300) });
  if (recentErrors.length > 50) recentErrors.pop();
  log('error', 'erro não tratado', { requestId: id, method: req.method, path: req.path, message, stack: error instanceof Error ? error.stack?.split('\n').slice(0, 6).join('\n') : undefined });
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)] * 10) / 10;
}

export function metrics() {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    requests: { ...totals, errorRatePercent: totals.requests ? Math.round(totals.status5xx / totals.requests * 10000) / 100 : 0 },
    latencyMs: { samples: window.length, p50: percentile(window, 50), p95: percentile(window, 95), max: window.length ? Math.round(Math.max(...window)) : 0 },
    memoryMb: { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) },
    recentErrors,
  };
}
