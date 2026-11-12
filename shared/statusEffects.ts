// Efeitos de status do combate contra criaturas (veneno, queimadura, lentidão). Regras compartilhadas entre servidor e tela.
// Valem só dentro de uma batalha: terminam com ela. O duelo entre jogadores não usa efeitos.
export type StatusKind = 'POISON' | 'BURN' | 'SLOW';
export interface ActiveEffect { kind: StatusKind; turns: number }
// `damagePercent` = vida máxima perdida no fim de cada turno. `turns` = duração ao ser aplicado (reaplicar renova).
export const statusEffects: Record<StatusKind, { name: string; active: string; turns: number; damagePercent: number; help: string }> = {
  POISON: { name: 'Veneno', active: 'Envenenado', turns: 3, damagePercent: 3, help: 'Perde 3% da vida máxima no fim de cada turno.' },
  BURN: { name: 'Queimadura', active: 'Em chamas', turns: 2, damagePercent: 4, help: 'Perde 4% da vida máxima no fim de cada turno. Resistência a fogo reduz.' },
  SLOW: { name: 'Lentidão', active: 'Lento', turns: 2, damagePercent: 0, help: 'Sem esquiva e com golpes 15% mais fracos.' },
};
// Chance de a criatura aplicar o efeito quando o golpe dela acerta (chefes têm mais). Defender no turno impede.
export const STATUS_CHANCE = 25, STATUS_BOSS_CHANCE = 40;
export const SLOW_ATTACK_PERCENT = 85;
// O que cada criatura causa: fogo queima; o Pântano Sombrio envenena; as terras e eras de gelo deixam lento.
export function monsterStatus(m: { element?: string | null; regionKey?: string | null }): StatusKind | null {
  if (m.element === 'FIRE') return 'BURN';
  if (m.regionKey === 'swamp') return 'POISON';
  if (m.regionKey === 'frost' || m.regionKey === 'era2') return 'SLOW';
  return null;
}
// Chefes têm duas fases: ao cair para metade da vida ou menos, entram em fúria e batem mais forte até o fim da luta.
export const bossRage = { atPercent: 50, attackPercent: 110 };
export const bossPhase = (m: { isBoss?: boolean | null; hp: number; maxHp?: number | null }): 1 | 2 => m.isBoss && m.maxHp && m.hp > 0 && m.hp * 100 <= m.maxHp * bossRage.atPercent ? 2 : 1;
// Uma batalha dura no máximo este número de turnos; no último, sem vencedor, os dois recuam (sem recompensa, como uma fuga).
export const BATTLE_MAX_TURNS = 60;
export const statusWarning: Record<StatusKind, string> = { POISON: 'Pode envenenar', BURN: 'Pode queimar', SLOW: 'Pode deixar lento' };
