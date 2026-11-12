// Poções por faixa de nível (nomes e sprites do TibiaWiki). Cada uma recupera um valor fixo + uma porcentagem do máximo,
// para continuar útil quando a vida/mana cresce; as mais fortes pedem nível mínimo (o mesmo minLevel do item no catálogo).
export interface Restore { flat: number; pct: number }
export interface PotionEffect { minLevel: number; hp?: Restore; mana?: Restore }
export const potions: Record<string, PotionEffect> = {
  'Health Potion': { minLevel: 1, hp: { flat: 100, pct: 10 } },
  'Strong Health Potion': { minLevel: 50, hp: { flat: 300, pct: 15 } },
  'Great Health Potion': { minLevel: 100, hp: { flat: 700, pct: 20 } },
  'Ultimate Health Potion': { minLevel: 250, hp: { flat: 1500, pct: 25 } },
  'Supreme Health Potion': { minLevel: 450, hp: { flat: 3000, pct: 30 } },
  'Mana Potion': { minLevel: 1, mana: { flat: 80, pct: 10 } },
  'Strong Mana Potion': { minLevel: 50, mana: { flat: 250, pct: 15 } },
  'Great Mana Potion': { minLevel: 100, mana: { flat: 600, pct: 20 } },
  'Ultimate Mana Potion': { minLevel: 250, mana: { flat: 1500, pct: 25 } },
  'Great Spirit Potion': { minLevel: 100, hp: { flat: 400, pct: 12 }, mana: { flat: 300, pct: 12 } },
  'Ultimate Spirit Potion': { minLevel: 250, hp: { flat: 1000, pct: 18 }, mana: { flat: 800, pct: 18 } },
};
export const potionNames = Object.keys(potions);
export const healthPotionNames = potionNames.filter(n => potions[n].hp);
export const restoreAmount = (r: Restore, max: number) => r.flat + Math.floor(max * r.pct / 100);
// Texto curto para a tela: "Cura 300 + 15% da vida máxima".
export function describePotion(name: string): string | null {
  const p = potions[name]; if (!p) return null;
  const part = (r: Restore, what: string) => `${r.flat.toLocaleString('pt-BR')} + ${r.pct}% da ${what} máxima`;
  return [p.hp && `Cura ${part(p.hp, 'vida')}`, p.mana && `${p.hp ? 'e ' : 'Recupera '}${part(p.mana, 'mana')}`].filter(Boolean).join(' ');
}
// A melhor poção de cada tipo para o nível (sugestão no Mercador e no aviso de derrota).
export function bestPotionFor(level: number, kind: 'hp' | 'mana'): string {
  return potionNames.filter(n => potions[n][kind] && !potions[n][kind === 'hp' ? 'mana' : 'hp'] && potions[n].minLevel <= level).at(-1) ?? (kind === 'hp' ? 'Health Potion' : 'Mana Potion');
}
