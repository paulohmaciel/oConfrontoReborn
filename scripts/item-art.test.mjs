// A lista da arte própria dos itens só aceita GIF com o nome no formato do jogo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gifNames, oddNames, writeList } from './item-art.mjs';

function folder(names) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'item-art-'));
  for (const name of names) fs.writeFileSync(path.join(dir, name), '');
  return dir;
}

test('gifNames: só GIF com nome em minúsculas e hífen, em ordem', () => {
  const dir = folder(['sword.gif', 'sword.png', 'crossbow-da-1-era.gif', 'Bow.gif', 'fire sword.gif', 'leia-me.md']);
  assert.deepEqual(gifNames(dir), ['crossbow-da-1-era', 'sword']);
  assert.deepEqual(oddNames(dir), ['Bow.gif', 'fire sword.gif']);
  fs.rmSync(dir, { recursive: true });
});

test('gifNames: pasta que não existe dá lista vazia', () => {
  assert.deepEqual(gifNames(path.join(os.tmpdir(), 'item-art-nao-existe')), []);
});

test('writeList: grava { files } em JSON', () => {
  const dir = folder(['bow.gif']), file = path.join(dir, 'lista.json');
  assert.deepEqual(writeList(dir, file), ['bow']);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { files: ['bow'] });
  fs.rmSync(dir, { recursive: true });
});
