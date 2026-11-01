// Duelo (PvP) entre amigos: regras compartilhadas entre servidor e tela.
// Nada muda de dono: o duelo não mexe na vida, mana, XP, ouro ou itens do personagem; só conta vitórias e derrotas.
// Números configuráveis (nível mínimo, faixa, limite, prazos, dano) vêm de loadSettings (chaves pvp.* em shared/economy.ts).
import { skillCosts, skillLabels } from './adventure';

// As ações são as do combate (backend/src/core/engine.ts); FLEE aparece como "Render-se".
export const duelActions = ['ATTACK', 'TRIPLE_HIT', 'FIFTH_HIT', 'HEAL', 'DEFEND_SHIELD', 'INTERRUPT', 'FLEE'] as const;
export type DuelAction = typeof duelActions[number];
export type DuelStatus = 'INVITED' | 'FIGHTING' | 'FINISHED';
// VICTORY: alguém caiu. FORFEIT: rendição. EXPIRED: duas rodadas seguidas sem escolher. DRAW: rodadas esgotadas.
// DECLINED/CANCELLED/LAPSED: o convite não virou duelo (recusado, cancelado, venceu o prazo).
export type DuelOutcome = 'PENDING' | 'ONGOING' | 'VICTORY' | 'FORFEIT' | 'EXPIRED' | 'DRAW' | 'DECLINED' | 'CANCELLED' | 'LAPSED';
export const DUEL_MAX_ROUNDS = 30;
export const DUEL_MISSED_LIMIT = 2;
export const outcomeLabels: Record<DuelOutcome, string> = {
  PENDING: 'Convite pendente', ONGOING: 'Em andamento', VICTORY: 'Vitória em combate', FORFEIT: 'Rendição', EXPIRED: 'Abandono (prazo)',
  DRAW: 'Empate', DECLINED: 'Convite recusado', CANCELLED: 'Convite cancelado', LAPSED: 'Convite expirado',
};

export function duelActionLabels(vocation: string): Record<DuelAction, string> {
  return { ...skillLabels(vocation), FLEE: 'Render-se' };
}
export function duelActionCosts(vocation: string): Record<DuelAction, number> {
  return skillCosts(vocation);
}
export const duelActionHelp: Record<DuelAction, string> = {
  ATTACK: 'Golpe comum, sem custo.',
  TRIPLE_HIT: 'Golpe forte. Pode ser interrompido.',
  FIFTH_HIT: 'O golpe mais forte da vocação. Pode ser interrompido.',
  HEAL: 'Recupera parte da sua vida.',
  DEFEND_SHIELD: 'Ergue a guarda: recebe bem menos dano nesta rodada. Quem não escolhe a tempo, defende.',
  INTERRUPT: 'Golpe rápido que corta o golpe forte do oponente, se você agir antes dele.',
  FLEE: 'Abandona o duelo e entrega a vitória ao oponente.',
};
// Frase da intenção, na voz do jogo, para o registro da rodada.
export const duelIntent: Record<DuelAction, string> = {
  ATTACK: 'avança com um golpe', TRIPLE_HIT: 'prepara um golpe brutal', FIFTH_HIT: 'concentra toda a fúria num golpe',
  HEAL: 'recua para cuidar das feridas', DEFEND_SHIELD: 'ergue o escudo', INTERRUPT: 'espreita para cortar o golpe do oponente', FLEE: 'baixa a arma e se rende',
};

export interface DuelRules { minLevel: number; levelBandPercent: number }
// Faixa de nível: a diferença não passa de N% do nível maior (no mínimo 1 nível de folga).
export function levelGap(a: number, b: number, bandPercent: number) {
  return Math.max(1, Math.floor(Math.max(a, b) * bandPercent / 100));
}
export function canChallenge(a: { level: number; vocationChosen: boolean }, b: { level: number; vocationChosen: boolean }, rules: DuelRules): string | null {
  if (!a.vocationChosen || a.level < rules.minLevel) return `O duelo abre no nível ${rules.minLevel}, depois de escolher a vocação.`;
  if (!b.vocationChosen || b.level < rules.minLevel) return `Seu oponente precisa do nível ${rules.minLevel} e de uma vocação.`;
  const gap = levelGap(a.level, b.level, rules.levelBandPercent);
  if (Math.abs(a.level - b.level) > gap) return `A diferença de nível passa de ${gap} (${rules.levelBandPercent}% do maior nível).`;
  return null;
}

// Registro de uma rodada, do ponto de vista de cada lado (a tela mostra "Seu golpe × Golpe do oponente").
export interface DuelMove {
  characterId: number; action: DuelAction; auto: boolean; acted: boolean; first: boolean;
  dealt: number; crit: boolean; dodged: boolean; healed: number; interrupted: boolean; hp: number; maxHp: number; mana: number; maxMana: number;
}
export interface DuelRoundRecord { round: number; moves: DuelMove[]; lines: string[] }

// ----- O que está em jogo (Comando 9 de PVP-COMANDOS.md) -----
// HONOR: só honra (pontos tipo Elo e marcas cosméticas). GOLD: os dois apostam o mesmo ouro; o vencedor leva o pote menos a taxa da arena.
// LOOT: o vencedor tem uma chance de levar UM item da mochila do perdedor, que pode resgatá-lo pagando o preço de loja.
// Todas as formas também dão honra. Números em loadSettings (pvp.*).
export const duelModes = ['HONOR', 'GOLD', 'LOOT'] as const;
export type DuelMode = typeof duelModes[number];
export const modeLabels: Record<DuelMode, string> = { HONOR: 'Honra', GOLD: 'Aposta de ouro', LOOT: 'Espólio' };
export const modeHelp: Record<DuelMode, string> = {
  HONOR: 'Só honra: pontos no ranking e marcas de honra. Ninguém perde ouro nem itens.',
  GOLD: 'Os dois apostam o mesmo ouro. Quem vencer leva o pote, menos a taxa da arena. Empate devolve.',
  LOOT: 'Quem vencer pode levar UM item da mochila do outro. Nunca o equipado, favorito, melhorado demais ou raro. Quem perder pode resgatar o item pagando o preço de loja.',
};
// Pontos de honra no estilo Elo: vencer quem tem mais honra vale mais.
export function honorDelta(winner: number, loser: number, k: number) {
  const expected = 1 / (1 + 10 ** ((loser - winner) / 400));
  return Math.max(1, Math.round(k * (1 - expected)));
}
// Teto da aposta: N% do ouro em mãos do mais pobre dos dois (calculado no servidor, no aceite).
export function wagerCap(goldA: bigint, goldB: bigint, percent: number) {
  const poorer = goldA < goldB ? goldA : goldB;
  return poorer <= 0n ? 0n : poorer * BigInt(percent) / 100n;
}
export function arenaFee(pot: bigint, percent: number) {
  if (pot <= 0n || percent <= 0) return 0n;
  const fee = pot * BigInt(percent) / 100n;
  return fee > 0n ? fee : 1n;
}
// Item que pode cair no espólio: da mochila (não equipado), não favorito, sem item raro, abaixo da melhoria protegida, e não empilhável.
export interface LootCandidate { isEquipped: boolean; favorite: boolean; rareItemId: number | null; upgradeTier: number; quantity: number; slot: string }
export const lootEligible = (i: LootCandidate, protectTier: number) =>
  !i.isEquipped && !i.favorite && i.rareItemId === null && i.upgradeTier < protectTier && i.quantity === 1 && !['LOOT', 'CONSUMABLE'].includes(i.slot);

// Loja da honra: marcas compram só aparência (títulos e moldura). Nunca itens, ouro ou atributos.
export const honorCosmetics = [
  { key: 'duelist', kind: 'TITLE', name: 'Duelista', marks: 50 },
  { key: 'arena-master', kind: 'TITLE', name: 'Mestre da Arena', marks: 200 },
  { key: 'honor', kind: 'FRAME', name: 'Moldura da Honra', marks: 300 },
  { key: 'capriel-legend', kind: 'TITLE', name: 'Lenda de Capriel', marks: 600 },
] as const;
export type HonorCosmetic = typeof honorCosmetics[number];
export const honorCosmetic = (key: string | null | undefined) => honorCosmetics.find(c => c.key === key);
