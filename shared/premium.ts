// Benefícios Premium: organização, personalização e conveniência. Nenhum altera as regras de combate.
export const premiumBenefits = [
  { key: 'appearance', title: 'Aparência', description: 'Molduras para o retrato do personagem.' },
  { key: 'presets', title: 'Conjuntos de equipamento', description: 'Salve e troque conjuntos fora de combate.' },
  { key: 'bag', title: 'Organização da mochila', description: 'Favoritos, busca e filtros avançados.' },
  { key: 'diary', title: 'Diário detalhado', description: 'Estatísticas de caçadas, ganhos e desempenho.' },
  { key: 'profile', title: 'Perfil personalizado', description: 'Título, emblema e apresentação.' },
  { key: 'characters', title: 'Mais personagens', description: 'Experimente outras vocações em personagens extras.' },
] as const;
export const frames = [
  { key: 'none', name: 'Sem moldura' }, { key: 'gold', name: 'Dourada' }, { key: 'emerald', name: 'Esmeralda' },
  { key: 'ruby', name: 'Rubi' }, { key: 'azure', name: 'Azul real' },
] as const;
export const profileTitles = [
  { key: 'adventurer', name: 'Aventureiro' }, { key: 'hunter', name: 'Caçador' }, { key: 'blacksmith', name: 'Amigo do Ferreiro' },
  { key: 'explorer', name: 'Explorador' }, { key: 'guardian', name: 'Guardião de Capriel' }, { key: 'dragonbane', name: 'Terror dos Dragões' },
] as const;
export const emblems = ['Sword', 'Mastermind Shield', 'Dragon', 'Demon', 'Cyclops', 'Magic Longsword', 'Backpack', 'Ring of the Sky'] as const;
export const premiumPlan = { source: 'PURCHASE', currency: 'BRL', provider: 'MERCADOPAGO' } as const;

const DAY = 86_400_000;
export interface PeriodRow { id: number; createdAt: Date; days: number; revokedAt: Date | null }
export interface PeriodSlot { id: number; startsAt: Date; endsAt: Date }
// Os períodos são encadeados: uma renovação começa quando o acesso atual termina (ou na compra, se já expirou).
// Revogar um período (reembolso) reposiciona os seguintes, sem nunca antecipá-los para antes da própria criação.
export function layoutPeriods(periods: PeriodRow[]): PeriodSlot[] {
  const result: PeriodSlot[] = [];
  let cursor: Date | null = null;
  for (const p of [...periods].sort((a, b) => a.id - b.id)) {
    if (p.revokedAt) continue;
    const startsAt: Date = cursor && cursor > p.createdAt ? cursor : p.createdAt;
    const endsAt = new Date(startsAt.getTime() + p.days * DAY);
    result.push({ id: p.id, startsAt, endsAt });
    cursor = endsAt;
  }
  return result;
}
