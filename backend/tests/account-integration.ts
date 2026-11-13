import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once as eventOnce } from 'node:events';
import { prisma } from '../src/core/db';
import { createApp } from '../src/server';
import { hashPassword } from '../src/core/password';

// Senha e acessos da conta: trocar a senha logado e sair dos outros aparelhos (SEGURANCA.md, item 11).
test('MySQL: conta — trocar senha exige a atual, encerra os outros acessos e a senha antiga deixa de entrar', async () => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = 'Conta-teste-2026!', next = 'Nova-senha-2026!', email = `conta-${tag}@example.invalid`;
  await prisma.account.create({ data: { email, password: await hashPassword(password), characters: { create: { name: `Conta ${tag}` } } } });
  const server = createApp().listen(0, '127.0.0.1'); await eventOnce(server, 'listening');
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`, origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const call = (cookie: string, path: string, body?: unknown) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Game-Client': 'oconfronto', Origin: origin, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async (pw: string) => { const r = await call('', '/auth/login', { email, password: pw }); return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '' }; };
  try {
    const first = await login(password), second = await login(password);
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    assert.equal((await call('', '/auth/sessions')).status, 401);
    assert.equal((await (await call(first.cookie, '/auth/sessions')).json() as { open: number }).open, 2);
    assert.equal((await call(first.cookie, '/auth/change-password', { currentPassword: 'errada-errada-1', newPassword: next })).status, 403);
    assert.equal((await call(first.cookie, '/auth/change-password', { currentPassword: password, newPassword: 'curta' })).status, 400);
    assert.equal((await call(first.cookie, '/auth/change-password', { currentPassword: password, newPassword: password })).status, 400);
    const changed = await call(first.cookie, '/auth/change-password', { currentPassword: password, newPassword: next });
    assert.equal(changed.status, 200); assert.equal((await changed.json() as { ended: number }).ended, 1);
    // Este aparelho continua; o outro caiu; a senha antiga não entra mais.
    assert.equal((await call(first.cookie, '/me')).status, 200);
    assert.equal((await call(second.cookie, '/me')).status, 401);
    assert.equal((await login(password)).status, 401);
    const third = await login(next);
    assert.equal(third.status, 200);
    const out = await call(third.cookie, '/auth/logout-all', {});
    assert.equal((await out.json() as { ended: number }).ended, 1);
    assert.equal((await call(first.cookie, '/me')).status, 401);
    assert.equal((await call(third.cookie, '/me')).status, 200);
    // Sem a origem do jogo, a troca nem é avaliada.
    assert.equal((await fetch(base + '/auth/logout-all', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: third.cookie }, body: '{}' })).status, 403);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect(); }
});

// Apagar a conta pelo site (Configurações > Apagar a conta): pede a senha e derruba todos os acessos.
test('MySQL: conta — apagar pelo site pede a senha, encerra os acessos e a conta fica sem e-mail e sem nome', async () => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = 'Conta-teste-2026!', email = `apagar-${tag}@example.invalid`;
  const account = await prisma.account.create({ data: { email, password: await hashPassword(password), characters: { create: { name: `Apagar ${tag}` } } } });
  const server = createApp().listen(0, '127.0.0.1'); await eventOnce(server, 'listening');
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`, origin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const call = (cookie: string, path: string, body?: unknown) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Game-Client': 'oconfronto', Origin: origin, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const login = async () => { const r = await call('', '/auth/login', { email, password }); return { status: r.status, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? '' }; };
  try {
    const first = await login(), second = await login();
    assert.equal(first.status, 200); assert.equal(second.status, 200);
    // Sem conta aberta, sem senha ou com a senha errada, nada é apagado.
    assert.equal((await call('', '/auth/delete-account', { password })).status, 401);
    assert.equal((await call(first.cookie, '/auth/delete-account', {})).status, 403);
    assert.equal((await call(first.cookie, '/auth/delete-account', { password: 'errada-errada-1' })).status, 403);
    assert.equal((await fetch(base + '/auth/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: first.cookie }, body: JSON.stringify({ password }) })).status, 403);
    assert.equal((await call(first.cookie, '/me')).status, 200);
    const gone = await call(first.cookie, '/auth/delete-account', { password });
    assert.equal(gone.status, 200);
    assert.match(gone.headers.get('set-cookie') ?? '', /oc_session=;/);
    // Os dois acessos caíram e a senha não entra mais.
    assert.equal((await call(first.cookie, '/me')).status, 401);
    assert.equal((await call(second.cookie, '/me')).status, 401);
    assert.equal((await login()).status, 401);
    // A conta ficou, vazia: sem o e-mail da pessoa e com o personagem sem nome.
    const after = await prisma.account.findUniqueOrThrow({ where: { id: account.id }, include: { characters: true } });
    assert.ok(after.deletedAt); assert.notEqual(after.email, email); assert.match(after.characters[0].name, /^Apagado #/);
    assert.equal(await prisma.session.count({ where: { accountId: account.id } }), 0);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect(); }
});
