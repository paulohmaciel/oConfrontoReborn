import { Router, type RequestHandler, type ErrorRequestHandler } from 'express';
import { BattleService } from './battleService';
import { GameError, integer } from './engine';
import { recordError } from './monitor';
import { buyNpc, equip } from './inventoryService';
import { addStat, heal, sellNpc, unequip, upgrade, usePotion } from './gameService';

// O middleware de autenticação DEVE validar sessão/token e preencher res.locals.accountId.
// Não use IDs recebidos em headers/query/body como identidade autenticada.
export function gameRouter() {
  const router = Router();
  const handle = (run: (accountId: number, characterId: number, req: Parameters<RequestHandler>[0]) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
      Promise.resolve().then(async () => {
        const accountId: unknown = res.locals.accountId;
        if (typeof accountId !== 'number' || !Number.isSafeInteger(accountId) || accountId <= 0)
          throw new GameError(401, 'Autenticação necessária.');
        const result = await run(accountId, integer(Number(req.params.characterId)), req);
        res.json(result);
      }).catch(next);
    };
  router.post('/characters/:characterId/battles', handle((a, c, req) => BattleService.start(a, c, integer(req.body?.monsterId))));
  router.get('/characters/:characterId/battles/:battleId', handle((a, c, req) => BattleService.snapshot(a, c, integer(Number(req.params.battleId)))));
  router.post('/characters/:characterId/battles/:battleId/turns', handle((a, c, req) =>
    BattleService.turn(a, c, integer(Number(req.params.battleId)), integer(req.body?.expectedTurn, 0), req.body?.action)));
  router.post('/characters/:characterId/equip', handle((a, c, req) => equip(a, c, integer(req.body?.itemId))));
  router.post('/characters/:characterId/shop', handle((a, c, req) => buyNpc(a, c, integer(req.body?.blueprintId), integer(req.body?.quantity), req.get('idempotency-key') ?? '')));
  router.post('/characters/:characterId/unequip', handle((a, c, req) => unequip(a, c, integer(req.body?.itemId))));
  router.post('/characters/:characterId/stats', handle((a, c, req) => addStat(a, c, req.body?.stat, req.get('idempotency-key') ?? '')));
  router.post('/characters/:characterId/temple', handle((a, c) => heal(a, c)));
  router.post('/characters/:characterId/sell', handle((a, c, req) => sellNpc(a, c, integer(req.body?.itemId), req.body?.confirmUpgraded === true)));
  router.post('/characters/:characterId/upgrade', handle((a, c, req) => upgrade(a, c, integer(req.body?.itemId), integer(req.body?.expectedTier, 0), String(req.get('idempotency-key') ?? ''))));
  router.post('/characters/:characterId/use', handle((a, c, req) => usePotion(a, c, integer(req.body?.itemId), req.get('idempotency-key') ?? '')));
  return router;
}
export const gameErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof GameError) { res.status(error.status).json({ error: error.message }); return; }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: 'JSON inválido.' }); return;
  }
  if (error && error.status === 413) { res.status(413).json({ error: 'Requisição maior que o limite permitido.' }); return; }
  recordError(error, req, String(res.locals.requestId ?? '-'));
  // O código permite ao jogador citar o erro ao suporte sem expor detalhes internos.
  res.status(500).json({ error: 'Não foi possível concluir a operação.', requestId: res.locals.requestId });
};
