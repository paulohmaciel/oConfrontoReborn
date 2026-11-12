import type { RequestHandler } from 'express';
// Envolve um handler async para que erros (inclusive rejeições) cheguem ao tratador de erros do Express.
export const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };

// Páginas numeradas (10 por página por padrão): `?page=N` vira skip/take, e a resposta leva o total para a tela montar "1 2 3 … N".
export const PAGE_SIZE = 10;
export function pageOf(query: Record<string, unknown>, size = PAGE_SIZE) {
  const page = Math.min(100_000, Math.max(1, Math.floor(Number(query.page) || 1)));
  return { page, skip: (page - 1) * size, take: size };
}
export const paged = <T>(items: T[], total: number, page: number, size = PAGE_SIZE) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / size)) });
