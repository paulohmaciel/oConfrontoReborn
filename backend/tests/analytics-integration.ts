import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { prisma } from '../src/core/db';
import { createApp } from '../src/server';
import { hashPassword } from '../src/core/password';

test('MySQL: eventos de produto — lote autenticado, sem dados livres e painel da equipe', async () => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = 'Analytics-test-2026!', hash = await hashPassword(password);
  const [player, admin] = await Promise.all(['player', 'admin'].map(role => prisma.account.create({ data: { email: `analytics-${tag}-${role}@example.invalid`, password: hash, role: role === 'admin' ? 'ADMIN' : 'PLAYER', characters: { create: { name: `Analytics ${role} ${tag}` } } } })));
  const server = createApp().listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`, origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const call = (cookie: string, path: string, body?: unknown) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-Game-Client': 'oconfronto', Origin: origin, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (email: string) => (await call('', '/auth/login', { email, password })).headers.get('set-cookie')?.split(';')[0] ?? '';
  try {
    const [playerCookie, adminCookie] = await Promise.all([login(player.email), login(admin.email)]);
    assert.equal((await call('', '/analytics/events', { name: 'page_view', page: '/jornada' })).status, 401);
    const recorded = await call(playerCookie, '/analytics/events', { events: Array.from({ length: 20 }, () => ({ name: 'page_view', page: '/jornada', test: true })) });
    assert.equal(recorded.status, 201); assert.equal((await recorded.json() as { recorded: number }).recorded, 20);
    assert.equal((await call(playerCookie, '/analytics/events', { name: 'select_content', page: '/duelo', contentType: 'select', contentId: 'modo:gold', test: true })).status, 201);
    assert.equal((await call(playerCookie, '/analytics/events', { name: 'Page View', page: '/jornada' })).status, 400);
    assert.equal((await call(playerCookie, '/analytics/events', { name: 'page_view', page: 'jornada' })).status, 400);
    assert.equal((await call(playerCookie, '/analytics/events', { events: Array.from({ length: 101 }, () => ({ name: 'page_view', page: '/jornada' })) })).status, 400);
    assert.equal((await call(playerCookie, '/admin/analytics')).status, 403);
    const dashboard = await (await call(adminCookie, '/admin/analytics?days=1')).json() as { total: number; testEvents: number; byName: { name: string; count: number }[]; events: { items: { name: string }[] } };
    assert(dashboard.total >= 21); assert(dashboard.testEvents >= 21); assert.equal(dashboard.byName.find(e => e.name === 'page_view')?.count, 20); assert.equal(dashboard.events.items.length, 10);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect(); }
});
