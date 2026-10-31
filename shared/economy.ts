// Regras econômicas compartilhadas entre servidor e interface. Valores em ouro são sempre inteiros/BigInt.
export type FlowKind = 'source' | 'sink' | 'transfer';
// Fonte = ouro entra no mundo. Ralo = ouro sai do mundo. Transferência = muda de dono (soma zero, exceto taxas, que são ralos separados).
export const goldReasons = {
  MONSTER: 'source', TASK: 'source', JOURNEY: 'source', NPC_SELL: 'source', STARTER: 'source', ADMIN_GRANT: 'source',
  NPC_BUY: 'sink', UPGRADE: 'sink', PROMOTION: 'sink', MARKET_FEE: 'sink', MARKET_LISTING_FEE: 'sink', ADMIN_REMOVE: 'sink',
  MARKET_SALE: 'transfer', MARKET_PURCHASE: 'transfer',
} as const satisfies Record<string, FlowKind>;
export type GoldReason = keyof typeof goldReasons;
export const itemReasons = {
  LOOT: 'source', JOURNEY: 'source', NPC_BUY: 'source', STARTER: 'source', ADMIN_GRANT: 'source',
  NPC_SELL: 'sink', POTION_USE: 'sink', ADMIN_REMOVE: 'sink', UPGRADE_BREAK: 'sink', PROTECTION_USE: 'sink', OPENING: 'source',
  MARKET_LIST: 'transfer', MARKET_RETURN: 'transfer', MARKET_BUY: 'transfer',
} as const satisfies Record<string, FlowKind>;
export type ItemReason = keyof typeof itemReasons;

export interface SettingDef { default: number; min: number; max: number; label: string; unit: string; group: string }
export const settingDefs = {
  'market.saleFeePercent': { default: 5, min: 0, max: 50, label: 'Taxa sobre vendas no mercado (mínimo 1 de ouro)', unit: '%', group: 'Mercado' },
  'market.listingFeeGold': { default: 10, min: 0, max: 1_000_000, label: 'Taxa fixa para anunciar', unit: 'ouro', group: 'Mercado' },
  'market.durationHours': { default: 48, min: 1, max: 720, label: 'Duração dos anúncios', unit: 'horas', group: 'Mercado' },
  'economy.goldRewardPercent': { default: 100, min: 10, max: 500, label: 'Ouro de monstros e tarefas', unit: '%', group: 'Recompensas' },
  'economy.xpRewardPercent': { default: 100, min: 10, max: 500, label: 'XP de monstros e tarefas', unit: '%', group: 'Recompensas' },
  'economy.npcBuyPercent': { default: 100, min: 50, max: 300, label: 'Preço da loja NPC', unit: '%', group: 'Preços' },
  'economy.npcSellPercent': { default: 50, min: 0, max: 100, label: 'Pagamento do NPC por itens', unit: '%', group: 'Preços' },
  'economy.upgradePricePercent': { default: 100, min: 10, max: 500, label: 'Preço das melhorias do Ferreiro', unit: '%', group: 'Preços' },
  'upgrade.safeUntilTier': { default: 3, min: 0, max: 10, label: 'Melhorias seguras até o nível (+N nunca falha)', unit: '+N', group: 'Ferreiro' },
  'upgrade.breakFromTier': { default: 6, min: 0, max: 10, label: 'Só pode quebrar ao tentar sair de +N ou mais (6 = a partir da tentativa de chegar ao +7)', unit: '+N', group: 'Ferreiro' },
  'upgrade.breakOnFailPercent': { default: 50, min: 0, max: 100, label: 'Chance de o item quebrar quando a melhoria falha', unit: '%', group: 'Ferreiro' },
  'class.promotionGold': { default: 5000, min: 0, max: 100_000_000, label: 'Custo da promoção de classe', unit: 'ouro', group: 'Classes' },
  'characters.free': { default: 1, min: 1, max: 10, label: 'Personagens por conta gratuita', unit: '', group: 'Personagens' },
  'characters.premium': { default: 4, min: 1, max: 20, label: 'Personagens por conta Premium', unit: '', group: 'Personagens' },
  'premium.priceCents': { default: 0, min: 0, max: 1_000_000, label: 'Preço do passe Premium (centavos de R$; 0 = desativado)', unit: 'centavos', group: 'Premium' },
  'premium.days': { default: 30, min: 1, max: 365, label: 'Duração do passe Premium', unit: 'dias', group: 'Premium' },
  'premium.presetLimit': { default: 5, min: 1, max: 20, label: 'Conjuntos de equipamento salvos', unit: '', group: 'Premium' },
} as const satisfies Record<string, SettingDef>;
export type SettingKey = keyof typeof settingDefs;
export type Settings = Record<SettingKey, number>;
export const settingKeys = Object.keys(settingDefs) as SettingKey[];
export function defaultSettings(): Settings { return Object.fromEntries(settingKeys.map(k => [k, settingDefs[k].default])) as Settings; }
export function validSetting(key: string, value: unknown): value is number {
  if (!Object.prototype.hasOwnProperty.call(settingDefs, key)) return false;
  const d = settingDefs[key as SettingKey];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= d.min && value <= d.max;
}
// Percentuais inteiros evitam erros de ponto flutuante. Arredonda para baixo.
export function percentOf(amount: bigint, percent: number): bigint {
  if (!Number.isSafeInteger(percent) || percent < 0) throw new RangeError('Percentual inválido.');
  return amount * BigInt(percent) / 100n;
}
// Com taxa ligada, a taxa mínima é 1 de ouro (senão vendas baratas escapariam do ralo), e nunca passa do preço.
export function saleFee(price: bigint, feePercent: number): bigint {
  if (feePercent === 0 || price <= 0n) return 0n;
  const fee = percentOf(price, feePercent);
  return fee < 1n ? 1n : fee > price ? price : fee;
}
export function scaleInt(value: number, percent: number): number { return Number(percentOf(BigInt(value), percent)); }
export function npcBuyPrice(npcPrice: number, percent: number): bigint { return npcPrice <= 0 ? 0n : percentOf(BigInt(npcPrice), percent) || 1n; }
export function npcSellPrice(npcPrice: number, percent: number): bigint { return percentOf(BigInt(npcPrice), percent); }

// Regras entre configurações: cada valor pode estar no seu intervalo e a combinação ainda criar ouro do nada.
// Comprar no NPC e revender ao NPC nunca pode dar lucro (venda <= compra), senão o jogador imprime dinheiro em loop.
export function settingsConflict(values: Pick<Settings, 'economy.npcBuyPercent' | 'economy.npcSellPercent'>): string | null {
  if (values['economy.npcSellPercent'] > values['economy.npcBuyPercent'])
    return 'O NPC não pode pagar mais por um item do que cobra por ele (a venda ao NPC não pode superar o preço da loja), ou o jogador imprime ouro comprando e revendendo.';
  return null;
}

// ----- Melhoria de equipamentos (risco) -----
// Chance de passar de +N para +N+1. Até o nível seguro (padrão +3) nunca falha; depois, o risco cresce.
const riskyUpgradeChance = [85, 75, 65, 55, 45, 35, 25] as const; // de +3→+4 até +9→+10
export const maxUpgradeTier = 10;
export function upgradeSuccessPercent(currentTier: number, safeUntilTier: number): number {
  if (!Number.isInteger(currentTier) || currentTier < 0 || currentTier >= maxUpgradeTier) throw new RangeError('Nível inválido.');
  if (currentTier < safeUntilTier) return 100;
  return riskyUpgradeChance[Math.max(0, Math.min(riskyUpgradeChance.length - 1, currentTier - 3))];
}
// Pedra de Proteção: item de loot raro (nunca vendido por dinheiro real). Só é gasta quando salva um item que quebraria.
export const PROTECTION_STONE = 'Pedra de Proteção';
export type UpgradeOutcome = 'SUCCESS' | 'FAILED' | 'BROKE';
export type UpgradeResult = UpgradeOutcome | 'PROTECTED';
// Os dois sorteios (1..100) vêm de fora para a regra ser testável. Falhou: o ouro já foi gasto; o item pode quebrar.
export interface UpgradeRules { safeUntilTier: number; breakFromTier: number; breakOnFailPercent: number }
// Chance (0..100) de o item QUEBRAR ao tentar sair de +currentTier: só existe a partir de breakFromTier, e só quando a tentativa falha.
export function upgradeBreakPercent(currentTier: number, rules: UpgradeRules): number {
  if (currentTier < rules.breakFromTier) return 0;
  return (100 - upgradeSuccessPercent(currentTier, rules.safeUntilTier)) * rules.breakOnFailPercent / 100;
}
export function resolveUpgrade(currentTier: number, rules: UpgradeRules, rollSuccess: number, rollBreak: number): UpgradeOutcome {
  if (rollSuccess <= upgradeSuccessPercent(currentTier, rules.safeUntilTier)) return 'SUCCESS';
  return currentTier >= rules.breakFromTier && rollBreak <= rules.breakOnFailPercent ? 'BROKE' : 'FAILED';
}
