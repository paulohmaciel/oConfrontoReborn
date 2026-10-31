// Histórico de atualizações mostrado na página "Novidades". A mais recente primeiro; `id` nunca muda (a tela usa para marcar o que já foi lido).
export interface ChangelogEntry { id: string; date: string; title: string; items: string[] }
export const changelog: ChangelogEntry[] = [
  { id: '2026-10-31-mercado-filtros', date: '2026-10-31', title: 'Mercado com filtros e comparação', items: [
    'Filtre os anúncios por tipo de item, por melhoria mínima (+1 a +10) e por "só o que posso usar".',
    'Cada equipamento anunciado mostra a diferença (▲/▼) para o que você tem equipado no mesmo lugar.',
  ] },
  { id: '2026-10-31-ferreiro-historico', date: '2026-10-31', title: 'Ferreiro: seu histórico e itens que brilham', items: [
    'Nova aba Meu histórico no Ferreiro: todas as suas tentativas de melhoria, com sucessos, falhas, itens quebrados, salvamentos da Pedra de Proteção e o ouro gasto.',
    'Itens +7 e +8 ganham um brilho discreto, +9 brilha forte e +10 continua em chamas. Com Menos movimento, o brilho fica parado.',
  ] },
  { id: '2026-10-31-movimento', date: '2026-10-31', title: 'Opção "Menos movimento"', items: [
    'Novo botão Menos movimento ao lado do tema (no celular, no menu): desliga animações, transições e o fogo animado dos itens +10.',
    'Sem escolha, o jogo segue a preferência de acessibilidade do seu sistema.',
  ] },
  { id: '2026-10-31-favoritos', date: '2026-10-31', title: 'Novidades, avisos e itens favoritos protegidos', items: [
    'Nova página Novidades com o histórico de atualizações; a equipe agora pode publicar avisos de manutenção que aparecem no topo do jogo.',
    'Item favorito (a estrela da mochila) fica protegido: não pode ser vendido, anunciado nem levado ao Ferreiro, e só arrisca melhoria que pode quebrar com Pedra de Proteção.',
    'Tirar a estrela não exige mais Premium.',
  ] },
  { id: '2026-10-31-quatro-marcas', date: '2026-10-31', title: 'A Caçada das Quatro Marcas: caçada em grupo com amigos', items: [
    'A partir do nível 100, monte um grupo de 2 a 4 amigos em Caçada em grupo. Cada rodada tem prazo; quem não escolher a tempo defende.',
    'Cada vocação tem seu papel: o Cavaleiro segura, o Paladino mira, o Druida cura e o Feiticeiro quebra selos.',
    'Quatro caçadas: a Fera da Serra Vermelha (nível 100), o Espírito da Floresta Oca (250), o Monstro do Lago Cinzento (400) e o Dragão Adormecido (550), em que o grupo vota o destino do dragão.',
    'Novas conquistas: Ninguém caça sozinho e As Quatro Marcas.',
  ] },
  { id: '2026-10-31-paginas', date: '2026-10-31', title: 'Listas mais leves: páginas e "Ver mais"', items: [
    'Nenhuma lista mostra mais de 10 itens de uma vez: use "Ver mais", a busca ou as páginas numeradas.',
    'Mercado com busca por nome e anúncios mais recentes primeiro; extrato, diário, recados, fórum e mochila em páginas.',
    'Missões agrupadas por faixa de nível, com busca e filtros.',
  ] },
  { id: '2026-10-31-comunidade', date: '2026-10-31', title: 'Perfil de comunidade e fórum', items: [
    'Perfil com imagem do TibiaWiki, descrição, recados, depoimentos, amigos e visitas.',
    'Fórum com categorias, votos, comentários e dúvidas marcadas como resolvidas.',
  ] },
  { id: '2026-10-31-classes', date: '2026-10-31', title: 'Classes até o nível 1000 e missões com história', items: [
    'Cada vocação tem 8 classes (níveis 20, 100, 250, 400, 550, 700, 850 e 1000), com bônus de ataque, defesa e crítico.',
    'Tarefas viraram Missões, cada uma com quem pede e a sua história. A cidade agora se chama Capriel, e a primeira região, Campos do Amanhecer.',
  ] },
  { id: '2026-10-30-ferreiro', date: '2026-10-30', title: 'Ferreiro: fabricar, reforjar e desmontar', items: [
    'O Mercador vende equipamentos só até o nível 100. Acima disso, os itens vêm do Ferreiro e do loot dos monstros.',
    'Fabricar cria um item com materiais e ouro; reforjar troca um item pelo de outro nível mantendo parte da melhoria; desmontar devolve materiais.',
    'Os materiais (do Minério de Ferro à Essência Demoníaca) caem dos monstros de cada faixa de nível; chefes sempre deixam algum.',
    'Atributos podem ser distribuídos de 10 em 10, de 100 em 100 ou de uma vez, e redistribuídos pagando ouro.',
  ] },
  { id: '2026-10-29-niveis', date: '2026-10-29', title: 'Conteúdo até o nível 1000', items: [
    'Regiões, monstros e equipamentos para todos os níveis, das Campos do Amanhecer ao Vale da Perdição, passando pelas quatro Eras.',
    'Barra de experiência do nível atual e endereço próprio para cada página (/atributos, /inventario…).',
  ] },
];
