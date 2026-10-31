import test from 'node:test';
import assert from 'node:assert/strict';
import { goldReasons, itemReasons, settingDefs, settingKeys, validSetting, defaultSettings, percentOf, saleFee, npcBuyPrice, npcSellPrice, scaleInt, upgradeSuccessPercent, resolveUpgrade } from '../../shared/economy';
import { can, permissionsOf, roles } from '../../shared/permissions';
import { vocationAllowed, isPromoted, promotedOf, baseVocation, vocationLabel, promotion } from '../../shared/adventure';
import { combatStats } from './combatStats';

test('taxas usam inteiros; taxa ligada cobra no mínimo 1 e nunca mais que o preço', () => {
  assert.equal(saleFee(100n, 5), 5n);
  assert.equal(saleFee(19n, 5), 1n);
  assert.equal(saleFee(1n, 5), 1n);
  assert.equal(saleFee(1n, 50), 1n);
  assert.equal(saleFee(500n, 0), 0n);
  assert.equal(saleFee(1_000_000_000_000n, 50), 500_000_000_000n);
  assert.equal(percentOf(7n, 0), 0n);
  assert.throws(() => percentOf(10n, -1));
  assert.throws(() => percentOf(10n, 1.5));
});
test('padrões preservam o comportamento anterior da loja, NPC e ferreiro', () => {
  const d = defaultSettings();
  assert.equal(npcBuyPrice(80, d['economy.npcBuyPercent']), 80n);
  assert.equal(npcSellPrice(80, d['economy.npcSellPercent']), 40n);
  assert.equal(npcSellPrice(25, d['economy.npcSellPercent']), 12n); // floor(25/2), como antes
  assert.equal(scaleInt(15, d['economy.goldRewardPercent']), 15);
  assert.equal(npcBuyPrice(1, 50), 1n); // preço nunca vira zero
});
test('configurações validam chave, tipo e intervalo', () => {
  assert.equal(validSetting('market.saleFeePercent', 10), true);
  assert.equal(validSetting('market.saleFeePercent', 51), false);
  assert.equal(validSetting('market.saleFeePercent', 5.5), false);
  assert.equal(validSetting('market.saleFeePercent', '5'), false);
  assert.equal(validSetting('__proto__', 1), false);
  assert.equal(validSetting('constructor', 1), false);
  for (const k of settingKeys) { const d = settingDefs[k]; assert(d.default >= d.min && d.default <= d.max, k); }
});
test('todo motivo de ouro e de item é classificado como fonte, ralo ou transferência', () => {
  for (const kind of [...Object.values(goldReasons), ...Object.values(itemReasons)]) assert(['source', 'sink', 'transfer'].includes(kind));
  assert.equal(goldReasons.MARKET_FEE, 'sink');
  assert.equal(goldReasons.MARKET_SALE, 'transfer');
  assert.equal(goldReasons.NPC_SELL, 'source');
});
test('permissões: apoio não altera economia; só administrador mexe em configurações e Premium', () => {
  assert.equal(can('PLAYER', 'tickets.read'), false);
  assert.equal(can('SUPPORT', 'tickets.reply'), true);
  assert.equal(can('SUPPORT', 'punish.apply'), false);
  assert.equal(can('MODERATOR', 'punish.apply'), true);
  assert.equal(can('MODERATOR', 'settings.write'), false);
  assert.equal(can('MODERATOR', 'gold.adjust'), false);
  assert.equal(can('ADMIN', 'premium.grant'), true);
  assert.equal(can('NOPE', 'tickets.read'), false);
  assert.deepEqual(permissionsOf('PLAYER'), []);
  assert.deepEqual([...roles], ['PLAYER', 'SUPPORT', 'MODERATOR', 'ADMIN']);
});
test('promoção mantém a classe base, o acesso a itens e melhora os atributos', () => {
  assert.equal(isPromoted('KNIGHT'), false);
  assert.equal(isPromoted(promotedOf.KNIGHT), true);
  assert.equal(baseVocation('ELITE_KNIGHT'), 'KNIGHT');
  assert.equal(vocationLabel('MASTER_SORCERER'), 'Mestre Feiticeiro');
  assert.equal(vocationAllowed('ALL', 'ELDER_DRUID'), true);
  assert.equal(vocationAllowed('KNIGHT', 'ELITE_KNIGHT'), true);
  assert.equal(vocationAllowed('KNIGHT,PALADIN', 'ROYAL_PALADIN'), true);
  assert.equal(vocationAllowed('KNIGHT', 'DRUID'), false);
  const c = { strength: 30, agility: 20, resistance: 20, level: 20 };
  for (const [base, up] of [['KNIGHT', 'ELITE_KNIGHT'], ['PALADIN', 'ROYAL_PALADIN'], ['SORCERER', 'MASTER_SORCERER'], ['DRUID', 'ELDER_DRUID']] as const) {
    const a = combatStats({ ...c, vocation: base }, []), b = combatStats({ ...c, vocation: up }, []);
    assert(b.attack > a.attack, up); assert(b.defense > a.defense, up); assert.equal(b.criticalChance, a.criticalChance + promotion.critical);
  }
});

test('configurações: o NPC não pode pagar mais do que cobra (evita imprimir ouro)', async () => {
  const { settingsConflict } = await import('../../shared/economy');
  assert.equal(settingsConflict({ 'economy.npcBuyPercent': 100, 'economy.npcSellPercent': 50 }), null);
  assert.equal(settingsConflict({ 'economy.npcBuyPercent': 60, 'economy.npcSellPercent': 60 }), null);
  assert.match(settingsConflict({ 'economy.npcBuyPercent': 50, 'economy.npcSellPercent': 100 }) ?? '', /imprime/);
});
test('comprar e revender ao NPC nunca dá lucro, para qualquer preço com venda <= compra', () => {
  for (const buyPct of [50, 75, 100, 300]) for (const sellPct of [0, 25, 50, buyPct]) {
    if (sellPct > buyPct) continue;
    for (let price = 1; price <= 500; price++) assert(npcSellPrice(price, sellPct) <= npcBuyPrice(price, buyPct), `${price} @ ${buyPct}/${sellPct}`);
  }
});

test('melhoria: segura até o nível configurado, depois o risco cresce até +10', () => {
  assert.deepEqual([0, 1, 2].map(t => upgradeSuccessPercent(t, 3)), [100, 100, 100]);
  assert.deepEqual([3, 4, 5, 6, 7, 8, 9].map(t => upgradeSuccessPercent(t, 3)), [85, 75, 65, 55, 45, 35, 25]);
  assert.equal(upgradeSuccessPercent(0, 0), 85);   // sem zona segura, o tier 0 ainda usa a primeira faixa de risco
  assert.equal(upgradeSuccessPercent(9, 10), 100); // zona segura até o fim
  assert.throws(() => upgradeSuccessPercent(10, 3));
});
test('melhoria: sucesso, falha que preserva o item e falha que quebra dependem só dos sorteios', () => {
  const rules = { safeUntilTier: 3, breakOnFailPercent: 50 };
  assert.equal(resolveUpgrade(5, rules, 65, 100), 'SUCCESS');  // 65 <= 65%
  assert.equal(resolveUpgrade(5, rules, 66, 51), 'FAILED');    // falhou, 51 > 50 -> o item resiste
  assert.equal(resolveUpgrade(5, rules, 66, 50), 'BROKE');     // falhou, 50 <= 50 -> quebra
  assert.equal(resolveUpgrade(1, rules, 100, 1), 'SUCCESS');   // zona segura nunca falha
  assert.equal(resolveUpgrade(5, { ...rules, breakOnFailPercent: 0 }, 100, 1), 'FAILED');
  assert.equal(resolveUpgrade(5, { ...rules, breakOnFailPercent: 100 }, 100, 100), 'BROKE');
});
test('melhoria: a esperança de sucesso por tentativa bate com a tabela (simulação)', () => {
  let ok = 0; const n = 100_000; let seed = 1;
  const rnd = () => (seed = (seed * 48271) % 2147483647) % 100 + 1;
  for (let i = 0; i < n; i++) if (resolveUpgrade(6, { safeUntilTier: 3, breakOnFailPercent: 50 }, rnd(), rnd()) === 'SUCCESS') ok++;
  assert(Math.abs(ok / n - 0.55) < 0.01, String(ok / n));
});
