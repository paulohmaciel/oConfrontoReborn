import type { RequestHandler } from 'express';
// Envolve um handler async para que erros (inclusive rejeições) cheguem ao tratador de erros do Express.
export const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
