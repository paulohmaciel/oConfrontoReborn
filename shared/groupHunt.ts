// A Caçada das Quatro Marcas: caçada em grupo com amigos (CAMPANHA-QUATRO-MARCAS.md).
// Regras compartilhadas entre servidor e tela; números de economia (energia, recompensa, limite semanal) vêm de loadSettings.
import { baseVocation, type BaseVocation } from './adventure';

export const GROUP_MIN_LEVEL = 100;
export const PARTY_MIN = 2;
export const PARTY_MAX = 4;
export const MAX_ROUNDS = 30;

// SLAY/SLEEP só existem na escolha final do dragão.
export type GroupAction = 'ATTACK' | 'DEFEND' | 'HOLD' | 'AIM' | 'HEAL_ALL' | 'BREAK_SEAL' | 'SLAY' | 'SLEEP';
export type GroupPhase = 'FIGHT' | 'CHOICE';
export const groupActions: Record<GroupAction, { label: string; help: string; mana: number; only?: BaseVocation; choice?: boolean }> = {
  ATTACK: { label: 'Atacar', help: 'Golpe comum.', mana: 0 },
  DEFEND: { label: 'Defender', help: 'Recebe menos dano nesta rodada. É a ação de quem não escolher a tempo.', mana: 0 },
  HOLD: { label: 'Segurar', help: 'A criatura ataca só você nesta rodada, e sua defesa quase dobra.', mana: 10, only: 'KNIGHT' },
  AIM: { label: 'Mirar o ponto fraco', help: 'Tiro à distância forte, mais forte ainda com um Cavaleiro segurando. Alcança o que só a mira acerta: correntes, o reflexo verdadeiro, o cajado.', mana: 15, only: 'PALADIN' },
  HEAL_ALL: { label: 'Curar o grupo', help: 'Recupera a vida dos companheiros de pé e corta o veneno da rodada.', mana: 20, only: 'DRUID' },
  BREAK_SEAL: { label: 'Quebrar selo', help: 'Magia que ignora a defesa, interrompe o golpe pesado e desfaz encantamentos, selos e névoa.', mana: 15, only: 'SORCERER' },
  SLAY: { label: 'Derrotar o dragão', help: 'Vitória militar: o dragão não volta a ameaçar Capriel.', mana: 0, choice: true },
  SLEEP: { label: 'Fazer o dragão dormir', help: 'O dragão volta ao sono: começo de uma aliança entre povos e criaturas.', mana: 0, choice: true },
};
export function actionsFor(vocation: string, phase: GroupPhase = 'FIGHT'): GroupAction[] {
  const v = baseVocation(vocation);
  return (Object.keys(groupActions) as GroupAction[]).filter(a => phase === 'CHOICE' ? groupActions[a].choice : !groupActions[a].choice && (!groupActions[a].only || groupActions[a].only === v));
}

// Mecânica de cada caçada (o motor de groupEngine.ts trata cada uma):
// chains: laço que deixa a fera furiosa; só a mira parte as correntes; libertar dá bônus.
// enchant: encantamento que reduz o dano à metade; só Quebrar selo desfaz; desfazer tudo poupa o espírito (bônus).
// mist: névoa com ilusões que desviam golpes (a mira sempre acha o verdadeiro; a luz do Feiticeiro tira uma) e veneno que o Druida corta.
// dragon: selos que deixam o dragão furioso (Feiticeiro e Paladino quebram); com 25% de vida, o grupo vota o destino dele.
export type Mechanic = 'chains' | 'enchant' | 'mist' | 'dragon';
export interface GroupHunt {
  key: string; order: number; name: string; title: string; level: number; sprite: string; available: boolean; mechanic: Mechanic;
  creature: string; heavy: string; story: string; roles: Partial<Record<BaseVocation, string>>; victory: string; bonusText?: string;
  // Força por herói: a vida cresce com o tamanho do grupo; ataque e defesa não.
  hpPerHero: number; attack: number; defense: number; experience: number; goldMin: number; goldMax: number;
  counters: number; // correntes, camadas do encantamento, ilusões ou selos no começo
}
export const groupHunts: GroupHunt[] = [
  { key: 'serra', order: 1, name: 'A Fera da Serra Vermelha', title: 'Fera da Serra Vermelha', level: 100, sprite: 'Mammoth', available: true, mechanic: 'chains',
    creature: 'a fera', heavy: 'Pisoteio em todos',
    story: 'Uma criatura enorme ataca caravanas nas montanhas. As pegadas levam a uma armadilha: caçadores prenderam a fera num laço e querem que vocês a empurrem para uma emboscada.',
    roles: { KNIGHT: 'Segura a fera para que ela não esmague a caravana.', PALADIN: 'Do alto das rochas, acerta as correntes do laço e liberta a fera.',
      DRUID: 'Percebe que ela está ferida por uma flecha envenenada, e não furiosa, e mantém o grupo de pé.', SORCERER: 'Quebra o selo do laço e interrompe o pisoteio.' },
    victory: 'A fera cai. Vitória!', bonusText: 'libertar a fera do laço',
    hpPerHero: 7500, attack: 500, defense: 200, experience: 45000, goldMin: 2200, goldMax: 4400, counters: 3 },
  { key: 'floresta', order: 2, name: 'O Espírito da Floresta Oca', title: 'Espírito da Floresta Oca', level: 250, sprite: 'Stone Golem', available: true, mechanic: 'enchant',
    creature: 'o espírito', heavy: 'Raízes esmagam todos',
    story: 'Árvores caminham à noite. O espírito não é o inimigo: ele defende a floresta de uma mineração ilegal, e os mineiros o enlouqueceram com um encantamento.',
    roles: { KNIGHT: 'Protege a aldeia enquanto o espírito ainda está furioso.', PALADIN: 'Segue os rastros das carroças de minério e derruba de longe os vigias da mina.',
      DRUID: 'Entende que o espírito defende as raízes antigas e mantém todos de pé.', SORCERER: 'Quebra o encantamento dos mineiros; enquanto ele existe, o espírito recebe só metade do dano.' },
    victory: 'O espírito se aquieta e volta para as raízes. Vitória!', bonusText: 'desfazer todo o encantamento',
    hpPerHero: 17000, attack: 1150, defense: 500, experience: 280000, goldMin: 12000, goldMax: 24000, counters: 3 },
  { key: 'lago', order: 3, name: 'O Monstro do Lago Cinzento', title: 'Monstro do Lago Cinzento', level: 400, sprite: 'Young Sea Serpent', available: true, mechanic: 'mist',
    creature: 'o monstro', heavy: 'Onda do lago em todos',
    story: 'Pescadores desaparecem e uma névoa cobre o lago. O grupo atravessa a água quase sem ver, e as ilusões multiplicam o monstro.',
    roles: { KNIGHT: 'Protege os companheiros nas margens e nas pontes podres.', PALADIN: 'Espera o momento certo e acerta o único reflexo que sangra: o verdadeiro.',
      DRUID: 'Prepara remédios contra o veneno da criatura (a cura do grupo corta o veneno da rodada).', SORCERER: 'Ilumina o caminho e abre a névoa, desfazendo uma ilusão por vez.' },
    victory: 'A névoa se desfaz e o monstro afunda. Vitória!',
    hpPerHero: 21000, attack: 1700, defense: 830, experience: 720000, goldMin: 30000, goldMax: 60000, counters: 2 },
  { key: 'dragao', order: 4, name: 'A Última Caçada: o Dragão Adormecido', title: 'Dragão Adormecido', level: 550, sprite: 'Dragon Lord', available: true, mechanic: 'dragon',
    creature: 'o dragão', heavy: 'Sopro de fogo em todos',
    story: 'As pistas revelam o plano: o líder dos caçadores quer despertar o dragão sob a Fortaleza Partida e usar as quatro marcas para controlar todas as criaturas. Quando o dragão cair de joelhos, o grupo decide o destino dele.',
    roles: { KNIGHT: 'Abre passagem pelos portões e pelos guardas.', PALADIN: 'Das ameias, duela com o líder dos caçadores e derruba o cajado que comanda as marcas.',
      DRUID: 'Impede que a magia roubada corrompa a floresta e mantém o grupo vivo.', SORCERER: 'Destrói os selos que prendem o dragão ao controle dos caçadores.' },
    victory: 'O dragão está livre do controle dos caçadores.',
    hpPerHero: 50000, attack: 2900, defense: 1160, experience: 1350000, goldMin: 55000, goldMax: 110000, counters: 4 },
];
export const huntByKey = (key: string) => groupHunts.find(h => h.key === key);
export const CHOICE_AT = .25; // vida do dragão (fração) em que o grupo vota

// Ciclo das criaturas, igual ao dos chefes solo: ataque, concentra, golpe pesado em todos.
export type GroupIntent = 'ATTACK' | 'CHARGE' | 'STOMP';
export function groupIntent(round: number, hunt: Pick<GroupHunt, 'creature' | 'heavy'> = groupHunts[0]): { kind: GroupIntent; label: string } {
  const r = round % 3, who = hunt.creature[0].toUpperCase() + hunt.creature.slice(1);
  if (r === 2) return { kind: 'CHARGE', label: `${who} concentra forças. Bom momento para atacar ou curar.` };
  if (r === 0) return { kind: 'STOMP', label: `${hunt.heavy} nesta rodada! Defendam, ou o Feiticeiro quebra o golpe.` };
  return { kind: 'ATTACK', label: `Ataque comum contra um aventureiro (o Cavaleiro pode segurar).` };
}
