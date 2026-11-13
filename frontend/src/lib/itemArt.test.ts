// Regra do nome do arquivo da arte própria dos itens: a mesma que o catálogo de arte (art-items.md) usa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { baseItem, itemArt, itemFile } from './itemArt';

test('itemFile: minúsculas, sem acento e com hífen', () => {
  assert.equal(itemFile('Sword'), 'sword');
  assert.equal(itemFile('Magic Plate Armor'), 'magic-plate-armor');
  assert.equal(itemFile('Crossbow da 1ª Era'), 'crossbow-da-1-era');
  assert.equal(itemFile('Dragon Shield de Capriel'), 'dragon-shield-de-capriel');
  assert.equal(itemFile('Pedra de Proteção'), 'pedra-de-protecao');
  assert.equal(itemFile('  Gold  Coin '), 'gold-coin');
  assert.equal(itemFile(''), '');
});

test('baseItem: tira só o sufixo de Era ou de Capriel', () => {
  assert.equal(baseItem('Crossbow da 3ª Era'), 'Crossbow');
  assert.equal(baseItem('Royal Scale Robe de Capriel'), 'Royal Scale Robe');
  assert.equal(baseItem('Pedra de Proteção'), 'Pedra de Proteção');
  assert.equal(baseItem('Sword'), 'Sword');
});

test('itemArt: a figura do item, a do item-base para a variante sem figura, ou nada', () => {
  const has = (file: string) => ['sword', 'crossbow', 'crossbow-da-1-era'].includes(file);
  assert.equal(itemArt('Sword', has), '/assets/items/sword.gif');
  assert.equal(itemArt('Crossbow da 1ª Era', has), '/assets/items/crossbow-da-1-era.gif');
  assert.equal(itemArt('Crossbow da 2ª Era', has), '/assets/items/crossbow.gif');
  assert.equal(itemArt('Bow', has), null);
  assert.equal(itemArt('', has), null);
});
