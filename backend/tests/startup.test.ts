import test from 'node:test';
import assert from 'node:assert/strict';
import { startupSafetyErrors, startupWarnings } from '../src/server';
import { devAccountBlocked, DEV_EMAILS } from '../src/account/auth';

// Travas de inicialização e contas de desenvolvimento. Não toca no banco.
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
test('servidor recusa subir em combinações perigosas de .env', () => {
  assert.deepEqual(startupSafetyErrors(env({ NODE_ENV: 'development', HOST: '127.0.0.1', DEV_QUICK_LOGIN: '1' })), []);
  assert.match(startupSafetyErrors(env({ NODE_ENV: 'development', HOST: '0.0.0.0', DEV_QUICK_LOGIN: '1' }))[0], /DEV_QUICK_LOGIN/);
  assert.match(startupSafetyErrors(env({ NODE_ENV: 'development', APP_ORIGIN: 'https://jogo.example' }))[0], /NODE_ENV=production/);
  // Produção: e-mail só no terminal e atalho de desenvolvimento não passam.
  assert.match(startupSafetyErrors(env({ NODE_ENV: 'production', APP_ORIGIN: 'https://jogo.example' })).join(' '), /MAIL_DRIVER=console/);
  assert.match(startupSafetyErrors(env({ NODE_ENV: 'production', MAIL_DRIVER: 'resend', DEV_QUICK_LOGIN: '1' })).join(' '), /DEV_QUICK_LOGIN=1 em produção/);
  assert.deepEqual(startupSafetyErrors(env({ NODE_ENV: 'production', APP_ORIGIN: 'https://jogo.example', MAIL_DRIVER: 'resend' })), []);
  assert.deepEqual(startupSafetyErrors(env({ NODE_ENV: 'production', ALLOW_CONSOLE_MAIL: '1' })), []);
});
test('aviso de proxy: TRUST_PROXY com HOST público', () => {
  assert.deepEqual(startupWarnings(env({ TRUST_PROXY: '1', HOST: '127.0.0.1' })), []);
  assert.deepEqual(startupWarnings(env({ HOST: '0.0.0.0' })), []);
  assert.match(startupWarnings(env({ TRUST_PROXY: '1', HOST: '0.0.0.0' }))[0], /forja o próprio IP/);
});
test('contas de desenvolvimento não entram em produção', () => {
  for (const email of DEV_EMAILS) {
    assert.equal(devAccountBlocked(email, env({ NODE_ENV: 'production' })), true);
    assert.equal(devAccountBlocked(email, env({ NODE_ENV: 'development' })), false);
  }
  assert.equal(devAccountBlocked('qualquer@localhost.dev', env({ NODE_ENV: 'production' })), true);
  assert.equal(devAccountBlocked('jogador@example.com', env({ NODE_ENV: 'production' })), false);
});
