import { Router } from 'express';
import { asyncRoute } from '../core/http';
import { integer } from '../core/engine';
import { decideTestimonial, deleteScrap, myCommunity, publicProfile, reportContent, requestFriend, respondFriend, searchCharacters, updateCommunityProfile, writeScrap, writeTestimonial } from './communityService';

export const communityRoutes = Router();
const id = (v: unknown) => integer(Number(v));
// Leituras: perfil público pelo nome (?as=<personagem que está olhando>) e busca de personagens.
communityRoutes.get('/community/profiles/:name', asyncRoute(async (req, res) => {
  res.json(await publicProfile(res.locals.accountId, req.params.name, req.query.as ? id(req.query.as) : null));
}));
communityRoutes.get('/community/search', asyncRoute(async (req, res) => { res.json(await searchCharacters(req.query.q)); }));
communityRoutes.get('/characters/:id/community', asyncRoute(async (req, res) => { res.json(await myCommunity(res.locals.accountId, id(req.params.id))); }));
// Mudanças: sempre em nome de um personagem da conta (o serviço trava e confere).
communityRoutes.post('/characters/:id/community/profile', asyncRoute(async (req, res) => { res.json(await updateCommunityProfile(res.locals.accountId, id(req.params.id), req.body ?? {})); }));
communityRoutes.post('/characters/:id/community/scraps', asyncRoute(async (req, res) => { res.json(await writeScrap(res.locals.accountId, id(req.params.id), req.body?.to, req.body?.text)); }));
communityRoutes.post('/characters/:id/community/scraps/:scrapId/delete', asyncRoute(async (req, res) => { res.json(await deleteScrap(res.locals.accountId, id(req.params.id), id(req.params.scrapId))); }));
communityRoutes.post('/characters/:id/community/testimonials', asyncRoute(async (req, res) => { res.json(await writeTestimonial(res.locals.accountId, id(req.params.id), req.body?.to, req.body?.text)); }));
communityRoutes.post('/characters/:id/community/testimonials/:tid/:action', asyncRoute(async (req, res) => { res.json(await decideTestimonial(res.locals.accountId, id(req.params.id), id(req.params.tid), req.params.action)); }));
communityRoutes.post('/characters/:id/community/friends', asyncRoute(async (req, res) => { res.json(await requestFriend(res.locals.accountId, id(req.params.id), req.body?.to)); }));
communityRoutes.post('/characters/:id/community/friends/:fid/:action', asyncRoute(async (req, res) => { res.json(await respondFriend(res.locals.accountId, id(req.params.id), id(req.params.fid), req.params.action)); }));
communityRoutes.post('/characters/:id/community/report', asyncRoute(async (req, res) => { res.json(await reportContent(res.locals.accountId, id(req.params.id), req.body?.kind, req.body?.id, req.body?.reason)); }));
