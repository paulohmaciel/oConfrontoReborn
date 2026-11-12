// Regras econômicas compartilhadas entre servidor e interface. Valores em ouro são sempre inteiros/BigInt.
export type FlowKind = 'source' | 'sink' | 'transfer';
// Fonte = ouro entra no mundo. Ralo = ouro sai do mundo. Transferência = muda de dono (soma zero, exceto taxas, que são ralos separados).
export const goldReasons = {
  MONSTER: 'source', TASK: 'source', JOURNEY: 'source', NPC_SELL: 'source', STARTER: 'source', ADMIN_GRANT: 'source',
  NPC_BUY: 'sink', UPGRADE: 'sink', PROMOTION: 'sink', MARKET_FEE: 'sink', MARKET_LISTING_FEE: 'sink', ADMIN_REMOVE: 'sink',
  FORGE_CRAFT: 'sink', FORGE_REFORGE: 'sink', STATS_RESET: 'sink',
  GROUP_HUNT: 'source',
  MARKET_SALE: 'transfer', MARKET_PURCHASE: 'transfer',
  // Duelo: aposta sai dos dois, prêmio entra no vencedor (soma zero); a taxa da arena é ralo. Resgate de espólio: perdedor paga o vencedor.
  DUEL_WAGER: 'transfer', DUEL_PRIZE: 'transfer', DUEL_REFUND: 'transfer', DUEL_FEE: 'sink', DUEL_RANSOM: 'transfer',
} as const satisfies Record<string, FlowKind>;
export type GoldReason = keyof typeof goldReasons;
export const itemReasons = {
  LOOT: 'source', JOURNEY: 'source', NPC_BUY: 'source', STARTER: 'source', ADMIN_GRANT: 'source',
  NPC_SELL: 'sink', POTION_USE: 'sink', ADMIN_REMOVE: 'sink', UPGRADE_BREAK: 'sink', PROTECTION_USE: 'sink', OPENING: 'source',
  MARKET_LIST: 'transfer', MARKET_RETURN: 'transfer', MARKET_BUY: 'transfer',
  // Ferreiro: fabricar cria o item e gasta materiais; reforjar troca o item antigo pelo novo; desmontar destrói o item e devolve materiais.
  FORGE_CRAFT: 'source', FORGE_MATERIAL_USE: 'sink', FORGE_REFORGE_OUT: 'sink', FORGE_REFORGE_IN: 'source', FORGE_SALVAGE: 'sink', FORGE_SALVAGE_MATERIAL: 'source',
  GROUP_HUNT: 'source',
  // Espólio de duelo e resgate: o item muda de dono (soma zero).
  DUEL_LOOT_OUT: 'transfer', DUEL_LOOT_IN: 'transfer', DUEL_RANSOM_OUT: 'transfer', DUEL_RANSOM_IN: 'transfer',
} as const satisfies Record<string, FlowKind>;
export type ItemReason = keyof typeof itemReasons;

export interface SettingDef { default: number; min: number; max: number; label: string; unit: string; group: string }
export const settingDefs = {
  'market.saleFeePercent': { default: 5, min: 0, max: 50, label: 'Taxa sobre vendas no mercado (mínimo 1 de ouro)', unit: '%', group: 'Mercado' },
  'market.listingFeeGold': { default: 10, min: 0, max: 1_000_000, label: 'Taxa fixa para anunciar', unit: 'ouro', group: 'Mercado' },
  'market.durationHours': { default: 48, min: 1, max: 720, label: 'Duração dos anúncios', unit: 'horas', group: 'Mercado' },
  // Contra contas descartáveis que só existem para passar ouro e itens a uma conta principal.
  'market.minLevel': { default: 5, min: 1, max: 1000, label: 'Nível mínimo para anunciar e comprar no mercado', unit: 'nível', group: 'Mercado' },
  'market.verifiedEmail': { default: 0, min: 0, max: 1, label: 'Exigir e-mail confirmado para usar o mercado (1 = sim; ligue quando o envio de e-mail estiver funcionando)', unit: '0/1', group: 'Mercado' },
  'economy.goldRewardPercent': { default: 100, min: 10, max: 500, label: 'Ouro de monstros e missões', unit: '%', group: 'Recompensas' },
  'economy.xpRewardPercent': { default: 100, min: 10, max: 500, label: 'XP de monstros e missões', unit: '%', group: 'Recompensas' },
  'economy.npcBuyPercent': { default: 100, min: 50, max: 300, label: 'Preço da loja NPC', unit: '%', group: 'Preços' },
  'economy.npcSellPercent': { default: 50, min: 0, max: 100, label: 'Pagamento do NPC por itens', unit: '%', group: 'Preços' },
  'economy.upgradePricePercent': { default: 100, min: 10, max: 500, label: 'Preço das melhorias do Ferreiro', unit: '%', group: 'Preços' },
  'upgrade.safeUntilTier': { default: 3, min: 0, max: 10, label: 'Melhorias seguras até o nível (+N nunca falha)', unit: '+N', group: 'Ferreiro' },
  'upgrade.breakFromTier': { default: 6, min: 0, max: 10, label: 'Só pode quebrar ao tentar sair de +N ou mais (6 = a partir da tentativa de chegar ao +7)', unit: '+N', group: 'Ferreiro' },
  'upgrade.breakOnFailPercent': { default: 50, min: 0, max: 100, label: 'Chance de o item quebrar quando a melhoria falha', unit: '%', group: 'Ferreiro' },
  'forge.craftPricePercent': { default: 80, min: 0, max: 500, label: 'Fabricar: ouro cobrado sobre o preço de loja do item', unit: '%', group: 'Ferreiro' },
  'forge.reforgePricePercent': { default: 40, min: 0, max: 500, label: 'Reforjar: ouro cobrado sobre o preço de loja do item novo', unit: '%', group: 'Ferreiro' },
  'forge.craftMaterials': { default: 5, min: 1, max: 100, label: 'Materiais da faixa para fabricar ou reforjar um item', unit: 'un.', group: 'Ferreiro' },
  'forge.salvageMaterials': { default: 2, min: 0, max: 100, label: 'Materiais devolvidos ao desmontar (+1 a cada 3 melhorias)', unit: 'un.', group: 'Ferreiro' },
  'shop.maxEquipmentLevel': { default: 100, min: 1, max: 1000, label: 'O Mercador vende equipamentos até este nível (acima, só Ferreiro e espólio dos monstros)', unit: 'nível', group: 'Preços' },
  'stats.resetBaseGold': { default: 500, min: 0, max: 100_000_000, label: 'Redistribuir atributos: custo fixo', unit: 'ouro', group: 'Classes' },
  'stats.resetGoldPerLevelSquared': { default: 5, min: 0, max: 100_000, label: 'Redistribuir atributos: ouro × nível² (nível 100 = 50.000 com o padrão)', unit: 'ouro', group: 'Classes' },
  'group.energyCost': { default: 10, min: 0, max: 100, label: 'Caçada em grupo: energia gasta por participante', unit: 'energia', group: 'Caçada em grupo' },
  'group.roundSeconds': { default: 60, min: 15, max: 600, label: 'Caçada em grupo: prazo de cada rodada (quem não escolher, defende)', unit: 's', group: 'Caçada em grupo' },
  'group.rewardPercent': { default: 100, min: 10, max: 500, label: 'Caçada em grupo: XP e ouro da fera para cada participante', unit: '%', group: 'Caçada em grupo' },
  'group.freedBonusPercent': { default: 25, min: 0, max: 200, label: 'Caçada em grupo: bônus ao cumprir o objetivo da caçada (libertar a fera, desfazer o encantamento)', unit: '%', group: 'Caçada em grupo' },
  'group.materials': { default: 3, min: 0, max: 100, label: 'Caçada em grupo: materiais do Ferreiro por participante', unit: 'un.', group: 'Caçada em grupo' },
  'group.weeklyRewards': { default: 3, min: 1, max: 50, label: 'Caçada em grupo: vitórias com recompensa por caçada a cada 7 dias', unit: '', group: 'Caçada em grupo' },
  'pvp.minLevel': { default: 20, min: 1, max: 1000, label: 'Duelo: nível mínimo (e vocação escolhida)', unit: 'nível', group: 'Duelo' },
  'pvp.levelBandPercent': { default: 10, min: 1, max: 100, label: 'Duelo: diferença máxima de nível entre os dois (% do maior nível)', unit: '%', group: 'Duelo' },
  'pvp.dailyLimit': { default: 10, min: 1, max: 100, label: 'Duelo: duelos por personagem a cada 24 horas', unit: '', group: 'Duelo' },
  'pvp.roundHours': { default: 24, min: 1, max: 72, label: 'Duelo: prazo de cada rodada (quem não escolher, defende; duas seguidas = derrota)', unit: 'h', group: 'Duelo' },
  'pvp.inviteHours': { default: 24, min: 1, max: 168, label: 'Duelo: validade do desafio', unit: 'h', group: 'Duelo' },
  'pvp.wagerMaxPercent': { default: 10, min: 0, max: 50, label: 'Duelo: aposta máxima (% do ouro em mãos do mais pobre dos dois; 0 = sem apostas)', unit: '%', group: 'Duelo' },
  'pvp.wagerFeePercent': { default: 5, min: 0, max: 50, label: 'Duelo: taxa da arena sobre o pote da aposta (sai do jogo)', unit: '%', group: 'Duelo' },
  'pvp.lootChancePercent': { default: 25, min: 0, max: 100, label: 'Duelo: chance de o vencedor levar um item no duelo de espólio (0 = desligado)', unit: '%', group: 'Duelo' },
  'pvp.lootProtectTier': { default: 7, min: 1, max: 11, label: 'Duelo: itens com esta melhoria ou mais nunca caem no espólio', unit: '+N', group: 'Duelo' },
  'pvp.ransomHours': { default: 48, min: 1, max: 336, label: 'Duelo: prazo para resgatar um item perdido no espólio', unit: 'h', group: 'Duelo' },
  'pvp.ransomPercent': { default: 100, min: 0, max: 500, label: 'Duelo: preço do resgate (% do preço de loja do item, pago ao vencedor)', unit: '%', group: 'Duelo' },
  'pvp.pairDailyLimit': { default: 3, min: 0, max: 50, label: 'Duelo: duelos com ouro ou espólio entre o mesmo par a cada 24 horas', unit: '', group: 'Duelo' },
  'pvp.honorK': { default: 32, min: 1, max: 200, label: 'Duelo: pontos de honra em jogo por duelo (fator K)', unit: '', group: 'Duelo' },
  'pvp.honorMarksWin': { default: 10, min: 0, max: 1000, label: 'Duelo: marcas de honra por vitória (só cosméticos)', unit: '', group: 'Duelo' },
  'pvp.honorMarksLoss': { default: 4, min: 0, max: 1000, label: 'Duelo: marcas de honra por derrota ou empate', unit: '', group: 'Duelo' },
  'pvp.damagePercent': { default: 100, min: 10, max: 300, label: 'Duelo: dano entre aventureiros (100 = mesmo do combate)', unit: '%', group: 'Duelo' },
  'class.promotionGold': { default: 5000, min: 0, max: 100_000_000, label: 'Custo da promoção de classe', unit: 'ouro', group: 'Classes' },
  'characters.free': { default: 1, min: 1, max: 10, label: 'Personagens por conta gratuita', unit: '', group: 'Personagens' },
  'characters.premium': { default: 4, min: 1, max: 20, label: 'Personagens por conta Premium', unit: '', group: 'Personagens' },
  'premium.priceCents': { default: 0, min: 0, max: 1_000_000, label: 'Preço do passe Premium (centavos de R$; 0 = desativado)', unit: 'centavos', group: 'Premium' },
  'premium.days': { default: 30, min: 1, max: 365, label: 'Duração do passe Premium', unit: 'dias', group: 'Premium' },
  'premium.presetLimit': { default: 5, min: 1, max: 20, label: 'Conjuntos de equipamento salvos', unit: '', group: 'Premium' },
  // Confrontation (app Godot): tetos por hora do progresso enviado pelo app. O que passa disso não entra no registro verificado nem no ranking.
  'confrontation.goldPerHour': { default: 30_000, min: 1, max: 1_000_000_000, label: 'App: ouro ganho por hora aceito na fase 1', unit: 'ouro/h', group: 'Confrontation (app)' },
  'confrontation.xpPerHour': { default: 30_000, min: 1, max: 1_000_000_000, label: 'App: XP ganho por hora aceito na fase 1', unit: 'XP/h', group: 'Confrontation (app)' },
  'confrontation.stageGrowthPercent': { default: 145, min: 100, max: 300, label: 'App: quanto o teto de ouro e XP cresce a cada fase alcançada (145 = ×1,45)', unit: '%', group: 'Confrontation (app)' },
  'confrontation.itemsPerHour': { default: 600, min: 1, max: 100_000, label: 'App: itens coletados por hora aceitos', unit: 'itens/h', group: 'Confrontation (app)' },
  'confrontation.stagesPerHour': { default: 6, min: 1, max: 100, label: 'App: fases novas por hora aceitas', unit: 'fases/h', group: 'Confrontation (app)' },
  'confrontation.maxStage': { default: 20, min: 1, max: 1000, label: 'App: última fase da campanha (a Vigília só conta depois dela)', unit: 'fase', group: 'Confrontation (app)' },
  'confrontation.vigilPerHour': { default: 30, min: 1, max: 10_000, label: 'App: níveis de Vigília por hora aceitos', unit: 'níveis/h', group: 'Confrontation (app)' },
  'confrontation.powerPercentPerHour': { default: 50, min: 1, max: 1000, label: 'App: crescimento do poder da companhia por hora (sobre o último verificado)', unit: '%/h', group: 'Confrontation (app)' },
  'confrontation.powerPerHour': { default: 20_000, min: 1, max: 1_000_000_000, label: 'App: poder somado por hora aceito mesmo partindo de pouco', unit: 'poder/h', group: 'Confrontation (app)' },
  'confrontation.firstSyncHours': { default: 48, min: 0, max: 720, label: 'App: horas de jogo aceitas no primeiro envio (progresso feito antes da conta)', unit: 'h', group: 'Confrontation (app)' },
  'confrontation.sessionDays': { default: 30, min: 1, max: 365, label: 'App: validade da entrada no app (renovada com o uso)', unit: 'dias', group: 'Confrontation (app)' },
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
export function settingsConflict(values: Pick<Settings, 'economy.npcBuyPercent' | 'economy.npcSellPercent'> & Partial<Pick<Settings, 'forge.craftMaterials' | 'forge.salvageMaterials'>>): string | null {
  if (values['economy.npcSellPercent'] > values['economy.npcBuyPercent'])
    return 'O NPC não pode pagar mais por um item do que cobra por ele (a venda ao NPC não pode superar o preço da loja), ou o jogador imprime ouro comprando e revendendo.';
  // Mesma ideia com materiais: desmontar não pode devolver tanto quanto fabricar gasta, senão fabricar e desmontar cria material do nada.
  const craft = values['forge.craftMaterials'], salvage = values['forge.salvageMaterials'];
  if (craft !== undefined && salvage !== undefined && salvage >= craft)
    return 'Desmontar não pode devolver tantos materiais quanto fabricar gasta, ou o jogador cria material do nada fabricando e desmontando.';
  return null;
}

// Redistribuir atributos custa cerca de um nível de caçadas: fixo + ouro × nível² (o ouro dos monstros também cresce com o quadrado do nível).
export function statsResetCost(level: number, baseGold: number, perLevelSquared: number): bigint {
  return BigInt(baseGold) + BigInt(perLevelSquared) * BigInt(level) * BigInt(level);
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
