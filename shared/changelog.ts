// Histórico de atualizações mostrado na página "Novidades". A mais recente primeiro; `id` nunca muda (a tela usa para marcar o que já foi lido).
export interface ChangelogEntry { id: string; date: string; title: string; items: string[] }
export const changelog: ChangelogEntry[] = [
  { id: '2026-11-12-sprites-proprios', date: '2026-11-12', title: 'Primeiros personagens com arte própria', items: [
    'O Cavaleiro ganhou um boneco próprio na arena, animado quadro a quadro: respira parado, corre, golpeia, ergue o escudo, se cura e cai.',
    'O Wolf virou o Lobo das Cinzas na arena, com as brasas no dorso, mordida, uivo e queda desenhados.',
    'É um teste: as outras vocações e criaturas continuam com os sprites de antes até a arte nova ficar pronta.',
  ] },
  { id: '2026-11-12-arena-animada', date: '2026-11-12', title: 'A batalha ganhou vida', items: [
    'Seu herói e a criatura agora aparecem frente a frente numa arena e encenam cada turno: quem ataca avança, quem apanha leva o tranco e pisca, e o número do dano sobe na tela.',
    'Cada vocação tem o seu boneco. Arqueiro, Feiticeiro e Druida atacam de longe, com flecha ou magia voando; cura brilha, a guarda ergue o escudo, a esquiva desvia e quem perde cai.',
    'Golpes críticos e golpes pesados dos chefes fazem a arena tremer. Veneno, queimadura e lentidão mudam a cor do herói.',
    'A arena fica presa no topo enquanto você escolhe as habilidades, e vale também no Duelo e na Caçada em grupo. Prefere tudo parado? Use o botão logo abaixo da arena ou Configurações.',
  ] },
  { id: '2026-11-12-bloquear-jogador', date: '2026-11-12', title: 'Bloquear um aventureiro', items: [
    'No perfil de qualquer jogador há agora o botão Bloquear. Quem você bloqueia não deixa mais recado, depoimento nem pedido de amizade para você.',
    'Bloquear desfaz a amizade entre os dois, e com isso acabam também os desafios de duelo e os convites de caçada em grupo.',
    'A lista de bloqueados fica no seu perfil, em Visitas e pedidos, com o botão Desbloquear.',
  ] },
  { id: '2026-11-12-pedra-de-protecao', date: '2026-11-12', title: 'A Pedra de Proteção ganhou rosto', items: [
    'A Pedra de Proteção agora tem imagem na mochila, no Ferreiro e no Mercado: a runa de muralha mágica do TibiaWiki.',
  ] },
  { id: '2026-11-12-leitura-mais-facil', date: '2026-11-12', title: 'Leitura mais fácil', items: [
    'Nenhum texto do jogo fica abaixo de 12 px: rótulos, legendas e números pequenos cresceram.',
    'No celular, o resumo do herói ficou mais baixo e o conteúdo da aba aparece antes.',
    'Quem joga pelo teclado ganhou o atalho "Pular para o conteúdo" (primeiro Tab da página), e os botões de texto ficaram maiores para o toque.',
  ] },
  { id: '2026-11-12-vozes-dos-chefes', date: '2026-11-12', title: 'Os chefes ganharam voz', items: [
    'Cada um dos 13 chefes tem agora uma fala ao começar a luta e outra ao entrar em fúria.',
    'Quando alguém leva um equipamento ao +10, o mundo fica sabendo: um anúncio aparece no topo da tela por 48 horas, com atalho para os Itens raros.',
    'Uma batalha dura no máximo 60 turnos. Sem vencedor até lá, os dois lados recuam e ninguém leva nada; a tela avisa quando faltam 10.',
  ] },
  { id: '2026-11-12-chefes-em-furia', date: '2026-11-12', title: 'Chefes em fúria', items: [
    'Todo chefe agora tem duas fases. Ao cair para metade da vida, ele entra em fúria e os golpes ficam 10% mais fortes até o fim da luta.',
    'A batalha mostra a fase do chefe o tempo todo. Guarde mana para defender ou interromper o golpe pesado na segunda metade.',
    'O Orc Leader teve o ataque reduzido de leve para a luta continuar justa com a fúria.',
  ] },
  { id: '2026-11-12-efeitos-de-status', date: '2026-11-12', title: 'Veneno, fogo e gelo', items: [
    'Criaturas de fogo podem queimar, as do Pântano Sombrio podem envenenar e as das terras geladas podem deixar você lento. A batalha mostra o que a criatura pode causar e quantos turnos o efeito ainda dura.',
    'Veneno e queimadura tiram um pouco de vida no fim do turno (resistência a fogo reduz a queimadura). Lento, você não esquiva e bate 15% mais fraco.',
    'Erguer a guarda no turno impede o efeito, e a cura do Druida limpa todos. Os efeitos terminam com a batalha.',
  ] },
  { id: '2026-11-12-colecao-de-raros', date: '2026-11-12', title: 'Itens raros de Capriel', items: [
    'Nova aba Itens raros, em Comunidade: todos os equipamentos que chegaram ao +10, com número de série, quem forjou e a história de cada um.',
    'Busque pelo nome do item e filtre por em circulação, destruídos ou primeiros do tipo. Quem escondeu o nome no Ferreiro aparece como aventureiro anônimo.',
  ] },
  { id: '2026-11-12-inicio-guiado', date: '2026-11-12', title: 'A Jornada ficou maior', items: [
    'Cinco etapas novas depois do Guardião da Pedreira: distribuir atributos, visitar o Templo, fazer a primeira venda, anunciar no Mercado e fazer um amigo. Cada uma leva você à aba certa e paga uma vez.',
    'Quem já tinha terminado a Jornada não perde nada: as regiões continuam abertas, e as etapas novas que você já cumpriu podem ser recebidas na hora.',
  ] },
  { id: '2026-11-12-conta-e-seguranca', date: '2026-11-12', title: 'Sua conta mais segura', items: [
    'Configurações ganhou Conta e segurança: troque a senha sem sair do jogo e encerre o acesso dos outros aparelhos com um clique.',
    'O Mercado agora abre no nível 5, para dificultar contas criadas só para repassar ouro e itens.',
    'O Ferreiro passou a mostrar todos os equipamentos da mochila, e não só a página aberta no Inventário.',
    'O perfil agora mostra os duelos: vitórias, derrotas, sequência, honra e os cinco últimos. Quem escondeu o nome dos registros públicos só vê o próprio.',
    'Caçar abre direto na região mais alta que você já liberou. Denúncias no Fórum e no Perfil agora são escritas na própria tela.',
  ] },
  { id: '2026-11-01-validacao-eventos', date: '2026-11-01', title: 'Validação de eventos do jogo', items: [
    'Navegações e escolhas em listas agora registram page_view e select_content, sem texto pessoal do jogador.',
    'A Equipe ganhou a tela Validação: dispare lotes reais de até 100 eventos, com atalhos para 20 pageviews ou 30 seleções, e confira o registro logo abaixo.',
  ] },
  { id: '2026-11-01-amigos-no-duelo', date: '2026-11-01', title: 'Amigos dentro do Duelo', items: [
    'A aba Duelo ganhou a seção Amigos: procure um aventureiro pelo nome, peça amizade, aceite ou recuse pedidos e cancele os enviados, sem sair da arena.',
    'Aposta de ouro mais clara: mostra quanto ouro você tem, botões de 1%, 5% e 10%, aviso quando o valor passa do seu ouro e o motivo quando o Desafiar está desligado.',
  ] },
  { id: '2026-10-31-duelo-valendo', date: '2026-10-31', title: 'Duelo valendo: ouro, espólio e honra', items: [
    'Ao desafiar, escolha o que está em jogo: Honra, Aposta de ouro ou Espólio. O convite mostra o risco antes de aceitar, e o Espólio pede confirmação.',
    'Aposta de ouro: os dois depositam o mesmo valor (até 10% do ouro do mais pobre). Quem vence leva o pote, menos a taxa da arena; empate devolve.',
    'Espólio: quem vence tem 25% de chance de levar um item da mochila do outro. Nunca o equipado, favorito, +7 ou mais ou raro; uma Pedra de Proteção salva o item. Dá para resgatar em 48 h pelo preço de loja.',
    'Honra virou pontuação (vencer quem tem mais honra vale mais) e cada duelo dá marcas, que compram títulos e a Moldura da Honra na Loja da honra.',
  ] },
  { id: '2026-10-31-configuracoes', date: '2026-10-31', title: 'Menu Configurações', items: [
    'Nova aba Configurações (no grupo Conta): tema claro ou escuro e animações ligadas ou desligadas, com a explicação do que cada escolha muda.',
    'O botão "Menos movimento" saiu do cabeçalho; agora é a opção Animações em Configurações.',
  ] },
  { id: '2026-10-31-duelo', date: '2026-10-31', title: 'Duelo entre amigos', items: [
    'Nova aba Duelo: desafie um amigo do seu nível (até 10% de diferença) para um duelo de honra. Os dois escolhem em segredo o golpe de cada rodada; quem tem mais agilidade age primeiro.',
    'Nada se perde: vida, mana, ouro, XP e itens ficam iguais. Só vitórias e derrotas entram no registro, com sequência, histórico e o ranking de Honra por classe.',
    'Cada rodada tem prazo: quem não escolhe só defende, e duas rodadas seguidas sem voltar é derrota. Dá para se render a qualquer momento.',
    'Novas conquistas: Primeiro Sangue e Dez Duelos. Algo errado num duelo? Use Denunciar no histórico.',
  ] },
  { id: '2026-10-31-tela-batalha', date: '2026-10-31', title: 'Nova tela de batalha', items: [
    'Habilidades separadas em Ataque, Suporte e Fuga, com ícones do TibiaWiki.',
    'Sua mana agora aparece em barra, ao lado da vida, durante a batalha.',
    'A última rodada fica em um só quadro: seu golpe × golpe da criatura, com o dano em destaque.',
  ] },
  { id: '2026-10-31-voz-rpg', date: '2026-10-31', title: 'Textos com voz de aventura', items: [
    'Combate, caçada, jornada, diário, mochila, templo e mercado foram reescritos com linguagem de RPG: Batalha em curso, Partir para nova caçada, Beber poção, Seu golpe causa X de dano…',
  ] },
  { id: '2026-10-31-nomes', date: '2026-10-31', title: 'Nomes de habilidades do Cavaleiro', items: [
    'Triplo hit agora se chama Golpe brutal, e Quinto hit virou Fúria berserker. O espólio dos monstros também ganhou nome em português nas telas.',
  ] },
  { id: '2026-10-31-turnos', date: '2026-10-31', title: 'Combate: turno a turno, ataque × defesa', items: [
    'Cada turno aparece em dois cartões lado a lado: o seu golpe e o do monstro, com o dano em destaque, críticos, esquivas, golpes pesados e interrupções.',
    'Ver histórico completo mostra todos os turnos do combate e o total de dano causado, recebido, cura, críticos e esquivas.',
  ] },
  { id: '2026-10-31-pocoes', date: '2026-10-31', title: 'Poções para todos os níveis e lojas separadas por tipo', items: [
    'Novas poções do TibiaWiki: Strong, Great, Ultimate e Supreme Health Potion; Strong, Great e Ultimate Mana Potion; Great e Ultimate Spirit Potion (vida e mana).',
    'Cada poção cura um valor fixo mais uma parte da sua vida/mana máxima, e as mais fortes pedem nível mínimo. Monstros de cada faixa deixam as poções do seu nível.',
    'Mercador e Mercado separados por tipo: Poções, Armas, Munição, Armaduras, Escudos, Joias e Outros. O Mercador destaca as melhores poções para você.',
    'Clicar num lugar do equipamento (ex.: Mochila) abre o Inventário com os itens daquele tipo; os ícones de Ataque, Defesa e Armadura mostram o que você usa.',
    'Cada região de caça mostra o nível recomendado e se está fácil, ideal ou perigosa para você.',
  ] },
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
    'O Mercador vende equipamentos só até o nível 100. Acima disso, os itens vêm do Ferreiro e do espólio dos monstros.',
    'Fabricar cria um item com materiais e ouro; reforjar troca um item pelo de outro nível mantendo parte da melhoria; desmontar devolve materiais.',
    'Os materiais (do Minério de Ferro à Essência Demoníaca) caem dos monstros de cada faixa de nível; chefes sempre deixam algum.',
    'Atributos podem ser distribuídos de 10 em 10, de 100 em 100 ou de uma vez, e redistribuídos pagando ouro.',
  ] },
  { id: '2026-10-29-niveis', date: '2026-10-29', title: 'Conteúdo até o nível 1000', items: [
    'Regiões, monstros e equipamentos para todos os níveis, das Campos do Amanhecer ao Vale da Perdição, passando pelas quatro Eras.',
    'Barra de experiência do nível atual e endereço próprio para cada página (/atributos, /inventario…).',
  ] },
];
