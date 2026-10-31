// Fórum (estilo Reddit): categorias, limites de texto e a ordem "Em alta". Ícones são sprites do TibiaWiki.
export const forumCategories = [
  { key: 'duvidas', name: 'Dúvidas', icon: 'Strange Talisman', description: 'Pergunte e marque a resposta que resolveu.' },
  { key: 'guias', name: 'Guias', icon: 'Backpack', description: 'Rotas de caçada, equipamentos e estratégias.' },
  { key: 'sugestoes', name: 'Sugestões', icon: 'Crown', description: 'Ideias para o jogo.' },
  { key: 'bugs', name: 'Bugs', icon: 'Bug', description: 'Algo não funcionou como deveria.' },
  { key: 'comercio', name: 'Comércio', icon: 'Gold Coin', description: 'Procuro e ofereço itens (as trocas são no Mercado).' },
  { key: 'conversa', name: 'Conversa', icon: 'Torch', description: 'Papo livre da comunidade de Capriel.' },
] as const;
export type ForumCategory = typeof forumCategories[number]['key'];
export const isForumCategory = (value: unknown): value is ForumCategory => forumCategories.some(c => c.key === value);
export const forumLimits = { title: [6, 120], body: [10, 10000], comment: [2, 4000], postCooldownSeconds: 60, commentCooldownSeconds: 10, pageSize: 10 } as const;
// "Em alta": votos pesam, mas o tempo desde a última atividade derruba o tópico aos poucos (estilo Reddit).
export function hotScore(score: number, lastActivityAt: Date, now = new Date()) {
  const hours = Math.max(0, (now.getTime() - lastActivityAt.getTime()) / 3_600_000);
  return (score + 1) / Math.pow(hours + 2, 1.5);
}
