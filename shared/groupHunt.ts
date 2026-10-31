// A Caçada das Quatro Marcas: caçada em grupo com amigos (CAMPANHA-QUATRO-MARCAS.md).
// Regras compartilhadas entre servidor e tela; números de economia (energia, recompensa, limite semanal) vêm de loadSettings.
import { baseVocation, type BaseVocation } from './adventure';

export const GROUP_MIN_LEVEL = 100;
export const PARTY_MIN = 2;
export const PARTY_MAX = 4;
export const MAX_ROUNDS = 30;

export type GroupAction = 'ATTACK' | 'DEFEND' | 'HOLD' | 'AIM' | 'HEAL_ALL' | 'BREAK_SEAL';
export const groupActions: Record<GroupAction, { label: string; help: string; mana: number; only?: BaseVocation }> = {
  ATTACK: { label: 'Atacar', help: 'Golpe comum.', mana: 0 },
  DEFEND: { label: 'Defender', help: 'Recebe menos dano nesta rodada. É a ação de quem não escolher a tempo.', mana: 0 },
  HOLD: { label: 'Segurar', help: 'A fera ataca só você nesta rodada, e sua defesa quase dobra.', mana: 10, only: 'KNIGHT' },
  AIM: { label: 'Mirar o ponto fraco', help: 'Tiro à distância forte; mais forte ainda se um Cavaleiro estiver segurando. Acerta as correntes do laço.', mana: 15, only: 'PALADIN' },
  HEAL_ALL: { label: 'Curar o grupo', help: 'Recupera a vida de todos os companheiros de pé.', mana: 20, only: 'DRUID' },
  BREAK_SEAL: { label: 'Quebrar selo', help: 'Magia que ignora a defesa e interrompe o golpe pesado da fera.', mana: 15, only: 'SORCERER' },
};
export function actionsFor(vocation: string): GroupAction[] {
  const v = baseVocation(vocation);
  return (Object.keys(groupActions) as GroupAction[]).filter(a => !groupActions[a].only || groupActions[a].only === v);
}

export interface GroupHunt {
  key: string; order: number; name: string; title: string; level: number; sprite: string; available: boolean;
  story: string; roles: Partial<Record<BaseVocation, string>>;
  // Força por herói: a vida da fera cresce com o tamanho do grupo; ataque e defesa não.
  hpPerHero: number; attack: number; defense: number; experience: number; goldMin: number; goldMax: number;
  chains?: number; // Serra Vermelha: correntes do laço (o Paladino liberta a fera)
}
export const groupHunts: GroupHunt[] = [
  { key: 'serra', order: 1, name: 'A Fera da Serra Vermelha', title: 'Fera da Serra Vermelha', level: 100, sprite: 'Mammoth', available: true,
    story: 'Uma criatura enorme ataca caravanas nas montanhas. As pegadas levam a uma armadilha: caçadores prenderam a fera num laço e querem que vocês a empurrem para uma emboscada.',
    roles: { KNIGHT: 'Segura a fera para que ela não esmague a caravana.', PALADIN: 'Do alto das rochas, acerta as correntes do laço e liberta a fera.',
      DRUID: 'Percebe que ela está ferida por uma flecha envenenada, e não furiosa, e mantém o grupo de pé.', SORCERER: 'Quebra o selo do laço e interrompe o pisoteio.' },
    hpPerHero: 7500, attack: 500, defense: 200, experience: 45000, goldMin: 2200, goldMax: 4400, chains: 3 },
  { key: 'floresta', order: 2, name: 'O Espírito da Floresta Oca', title: 'Espírito da Floresta Oca', level: 250, sprite: 'Stone Golem', available: false,
    story: 'Árvores caminham à noite. O espírito defende a floresta de uma mineração ilegal; a caçada vira investigação.', roles: {},
    hpPerHero: 0, attack: 0, defense: 0, experience: 0, goldMin: 0, goldMax: 0 },
  { key: 'lago', order: 3, name: 'O Monstro do Lago Cinzento', title: 'Monstro do Lago Cinzento', level: 400, sprite: 'Young Sea Serpent', available: false,
    story: 'Pescadores desaparecem e uma névoa cobre o lago. As ilusões multiplicam o monstro.', roles: {},
    hpPerHero: 0, attack: 0, defense: 0, experience: 0, goldMin: 0, goldMax: 0 },
  { key: 'dragao', order: 4, name: 'A Última Caçada: o Dragão Adormecido', title: 'Dragão Adormecido', level: 550, sprite: 'Dragon Lord', available: false,
    story: 'O líder dos caçadores quer despertar o dragão sob a Fortaleza Partida. No fim, o grupo escolhe: derrotar o dragão ou fazê-lo dormir.', roles: {},
    hpPerHero: 0, attack: 0, defense: 0, experience: 0, goldMin: 0, goldMax: 0 },
];
export const huntByKey = (key: string) => groupHunts.find(h => h.key === key);

// Ciclo da fera, igual ao dos chefes solo: ataque, concentra, golpe pesado (pisoteio em todos).
export type GroupIntent = 'ATTACK' | 'CHARGE' | 'STOMP';
export function groupIntent(round: number): { kind: GroupIntent; label: string } {
  const r = round % 3;
  if (r === 2) return { kind: 'CHARGE', label: 'A fera concentra forças. Bom momento para atacar ou curar.' };
  if (r === 0) return { kind: 'STOMP', label: 'Pisoteio em todos nesta rodada! Defendam, ou o Feiticeiro quebra o golpe.' };
  return { kind: 'ATTACK', label: 'Ataque comum contra um aventureiro (o Cavaleiro pode segurar).' };
}
