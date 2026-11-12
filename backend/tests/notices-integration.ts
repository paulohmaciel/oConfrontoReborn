import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once as eventOnce } from 'node:events';
import { prisma } from '../src/core/db';
import { createApp } from '../src/server';
import { hashPassword } from '../src/core/password';

test('MySQL: avisos da equipe — leitura pública, publicação com permissão, motivo e auditoria', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = 'Avisos-test-2026!', hash = await hashPassword(password);
  const mk = (n: string, extra: object = {}) => prisma.account.create({ data: { email: `aviso-${tag}-${n}@example.invalid`, password: hash, ...extra,
    characters: { create: { name: `Aviso ${n} ${tag}` } } } });
  const [player, support, mod] = await Promise.all([mk('p'), mk('s', { role: 'SUPPORT' }), mk('m', { role: 'MODERATOR' })]);
  const server = createApp().listen(0, '127.0.0.1'); await eventOnce(server, 'listening');
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`, origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const call = (cookie: string, path: string, body?: unknown) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Game-Client': 'oconfronto', Origin: origin, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (email: string) => (await call('', '/auth/login', { email, password })).headers.get('set-cookie')?.split(';')[0] ?? '';
  try {
    const [p, s, m] = await Promise.all([login(player.email), login(support.email), login(mod.email)]);
    const message = `Manutenção às 3h ${tag}`;

    await t.test('jogador e apoio não publicam; moderação publica só com motivo', async () => {
      assert.equal((await call(p, '/admin/notices', { kind: 'MAINTENANCE', message, reason: 'Atualização do servidor' })).status, 403);
      assert.equal((await call(s, '/admin/notices', { kind: 'MAINTENANCE', message, reason: 'Atualização do servidor' })).status, 403);
      assert.equal((await call(m, '/admin/notices', { kind: 'MAINTENANCE', message })).status, 400);
      assert.equal((await call(m, '/admin/notices', { kind: 'MAINTENANCE', message: 'oi', reason: 'Atualização do servidor' })).status, 400);
      const r = await call(m, '/admin/notices', { kind: 'MAINTENANCE', message, hours: 2, reason: 'Atualização do servidor' });
      assert.equal(r.status, 200);
      const notice = await r.json() as { id: number };
      assert(await prisma.adminAuditLog.findFirst({ where: { action: 'NOTICE_CREATE', targetId: notice.id, actorAccountId: mod.id } }));
    });

    await t.test('qualquer um lê os avisos no ar, mesmo sem entrar; encerrar tira do ar e fica auditado', async () => {
      const open = await (await call('', '/notices')).json() as { id: number; message: string; kind: string }[];
      const mine = open.find(n => n.message === message);
      assert(mine); assert.equal(mine.kind, 'MAINTENANCE');
      assert.equal((await call(m, `/admin/notices/${mine.id}/end`, {})).status, 400, 'encerrar também pede motivo');
      assert.equal((await call(m, `/admin/notices/${mine.id}/end`, { reason: 'Manutenção concluída' })).status, 200);
      assert.equal((await call(m, `/admin/notices/${mine.id}/end`, { reason: 'Manutenção concluída' })).status, 404);
      const after = await (await call('', '/notices')).json() as { message: string }[];
      assert(!after.some(n => n.message === message));
      assert(await prisma.adminAuditLog.findFirst({ where: { action: 'NOTICE_END', targetId: mine.id } }));
    });
  } finally { server.close(); }
});
