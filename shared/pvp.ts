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
