# O Confronto: tudo o que o jogo tem (resumo e avaliação)

Levantamento feito em 2026-11-12 a partir do código, não da memória. Atualizado no mesmo dia, depois que os 32 PRs abertos foram juntados no `main`. Os números vêm do catálogo (`backend/prisma/catalog.ts`), das regras em `shared/` e do banco (`backend/prisma/schema.prisma`).

## Em uma página

O Confronto é um RPG de navegador com sprites do TibiaWiki. O jogador cria um aventureiro, escolhe uma de quatro vocações e sobe do nível 1 ao 1000. No caminho, caça criaturas em combate por turnos, melhora equipamento no Ferreiro, negocia no Mercado, caça em grupo com amigos e duela contra outros jogadores.

| | Quantidade |
|---|---|
| Abas no jogo | 21, mais o painel da Equipe |
| Regiões de caça | 16, do nível 1 ao 850 |
| Criaturas | 113, sendo 13 chefes |
| Itens | 190: 42 armas, 23 munições, 26 armaduras, 20 elmos, 17 escudos, 11 pernas, 11 botas, 11 amuletos, 7 anéis, 11 poções, 10 materiais e 1 mochila |
| Poções | 11 (vida, mana e "espírito", que cura os dois) |
| Classes | promoção no 20 e novas classes no 100, 250, 400, 550, 700, 850 e 1000 |
| Caçadas em grupo | 4 (níveis 100, 250, 400 e 550) |
| Conquistas | 9 |
| Configurações que a equipe ajusta sem programar | 46 |
| Tabelas no banco | 47 (4 sem uso; ver avaliação) |
| Migrações | 12, todas aditivas |
| Entradas em Novidades | 20 |

Tecnologia: Node.js, TypeScript, Express, Prisma e MySQL no servidor; React na tela. Roda no Laragon com um duplo clique em `iniciar.bat`.

---

## O que o jogador encontra

### Aventura

**Jornada.** Começo guiado em cinco etapas: escolher a vocação, vencer os primeiros confrontos (ratos), melhorar um item, completar uma missão e derrotar o Guardião da Pedreira. Cada etapa dá uma recompensa única, conferida pelo servidor. A Jornada também mostra as regiões liberadas.

**Caçar (combate por turnos).** O jogador escolhe uma região e uma criatura; cada caçada gasta 5 de energia.
- Cada região mostra o nível recomendado e se está fácil, ideal ou perigosa para você.
- Na batalha, as habilidades ficam em três grupos: Ataque (atacar, golpe forte, golpe máximo, interromper), Suporte (curar, defender) e Fuga. Os nomes mudam com a vocação, como "Golpe brutal" e "Fúria berserker" no Cavaleiro.
- Barras de vida e de mana dos dois lados; o herói sempre age primeiro e a criatura revida em seguida.
- Os chefes anunciam o golpe pesado com um turno de antecedência, e o jogador pode Defender ou Interromper.
- Cada turno aparece como "Seu golpe × Golpe da criatura", com dano, crítico, esquiva e "Derrotado!". Há também o histórico completo do combate.
- Na derrota, o jogo explica o que deu errado e dá conselhos para a revanche, com um botão de revanche.
- Recompensas: XP, ouro e espólio (itens, poções da faixa de nível e materiais do Ferreiro).

**Caçada em grupo (A Caçada das Quatro Marcas).** Campanha cooperativa de 2 a 4 amigos, a partir do nível 100.
- Quatro caçadas com história e mecânica própria: correntes que só o Arqueiro parte, encantamento que só o Feiticeiro quebra, névoa com ilusões e veneno, e selos que prendem o dragão.
- Cada vocação tem um papel: o Cavaleiro segura, o Arqueiro mira, o Druida cura o grupo e o Feiticeiro quebra selos.
- As rodadas têm prazo; quem não escolhe a tempo, defende.
- Na última caçada, o grupo vota o destino do dragão: derrotá-lo ou fazê-lo dormir.
- Recompensas com limite semanal e bônus por cumprir o objetivo da caçada.

**Duelo (PvP entre amigos).** A partir do nível 20, entre amigos de contas diferentes, com até 10% de diferença de nível e no máximo 10 duelos por dia.
- Os dois escolhem o golpe em segredo; o mais ágil age primeiro. Quem não escolhe a tempo defende, e duas rodadas seguidas sem voltar é derrota. Dá para se render a qualquer momento.
- Vida e mana do duelo são uma cópia: o personagem nunca perde vida, mana ou XP.
- Três formas de duelo:
  - **Honra:** só pontos no ranking (estilo xadrez, em que vencer quem tem mais honra vale mais) e marcas.
  - **Aposta de ouro:** cada um põe até 10% do ouro do mais pobre; o vencedor leva o pote menos 5% de taxa; empate devolve.
  - **Espólio:** 25% de chance de o vencedor levar um item da mochila do perdedor. Equipados, favoritos, itens +7 ou mais, raros e empilháveis nunca caem; a Pedra de Proteção salva o item; o perdedor pode resgatá-lo em 48 h pelo preço de loja.
- Ranking de Honra por classe, histórico com páginas, denúncia pelo histórico, Loja da honra (títulos e a Moldura da Honra) e conquistas próprias.
- Seção Amigos dentro da aba: buscar jogador, pedir, aceitar e cancelar amizade.

**Missões.** Uma missão por criatura (abater 5), cada uma com quem pede e uma pequena história (por exemplo, "A praga do porão", do Velho Tobias). Recompensa única de XP e ouro.

**Diário.** Eventos da jornada (vitórias, derrotas, duelos, conquistas, melhorias), bestiário das criaturas enfrentadas, últimas batalhas com páginas e as 9 conquistas: Primeiro confronto, Caçador dedicado, Aço aperfeiçoado, Além dos portões, Quebra-gigantes, Ninguém caça sozinho, As Quatro Marcas, Primeiro Sangue e Dez Duelos.

### Personagem

- **Vocações:** Cavaleiro (mais defesa), Arqueiro (crítico e esquiva, usa munição), Feiticeiro (mais dano mágico, menos defesa) e Druida (cura mais forte e mais barata). Promoção no nível 20 e mais sete classes até o 1000, cada uma com bônus pequeno de ataque, defesa e crítico.
- **Atributos:** força, vitalidade, agilidade e resistência; 3 pontos por nível, com redistribuição paga em ouro. As fórmulas ficam num único lugar (`combatStats.ts`).
- **Inventário:** 10 lugares de equipamento (clicar num lugar abre a mochila filtrada naquele tipo), mochila com páginas e filtros por tipo, beber poções fora do combate e favoritar itens (favorito não pode ser vendido, anunciado nem arriscado).
- **Personagens:** mais de um personagem por conta (1 grátis, 4 no Premium).
- **Templo de Capriel:** cura vida, mana e energia de graça, uma vez a cada cinco minutos.

### Comércio

- **Mercador:** loja do jogo, separada por tipo de item, que destaca as melhores poções para o seu nível e compra itens pela metade do preço (configurável).
- **Mercado:** anúncios entre jogadores.
  - Busca, filtros por tipo, nível e melhoria, e comparação com o que você tem equipado.
  - O item fica guardado pelo Mercado até alguém comprar, o anúncio ser cancelado ou expirar (48 h).
  - Taxa para anunciar e taxa sobre a venda, as duas configuráveis.
- **Ferreiro:**
  - **Melhorias até +10:** até +3 nunca falha; de +4 a +6 a falha não perde nada; da tentativa de +7 em diante o item pode quebrar. A chance aparece antes de confirmar.
  - **Pedra de Proteção:** cai dos monstros e evita a quebra.
  - **Fabricar, reforjar e desmontar:** com materiais que caem das criaturas de cada faixa.
  - **Histórico e brilho:** histórico pessoal de tentativas, e os itens brilham a partir do +7 e pegam fogo no +10.
- **Itens raros:** todo equipamento que chega ao +10 ganha número de série e uma história (quem fabricou, quando chegou ao +10, se foi destruído). Quem não quer aparecer pode esconder o nome.
- **Extrato:** cada moeda e cada item que entrou ou saiu, com o motivo (caçada, venda, Ferreiro, aposta de duelo etc.), com páginas.

### Comunidade

- **Perfil:** avatar, emblema, título, moldura, apresentação, recados, depoimentos (o dono aprova), amigos e últimos visitantes (que podem ser escondidos).
- **Fórum:** tópicos por categoria, comentários com respostas, votos, tópico resolvido, fixado e trancado, e denúncia.

### Conta

- **Novidades e avisos:** histórico das atualizações e faixa de aviso da equipe (por exemplo, manutenção), que aparece também na tela de entrada.
- **Premium (30 dias):** a aba mostra a fase do passe (nunca assinou, ativo, terminando, agendado, encerrado), os dias que faltam, os passos da compra, a comparação Grátis × Premium e uma prévia do perfil antes de salvar. A barra lateral avisa quando faltam poucos dias. O Premium é só aparência, organização e conveniência. Inclui molduras, conjuntos de equipamento salvos, filtros da mochila, diário detalhado com estatísticas, perfil personalizado e mais personagens. Nunca muda combate, XP, ouro ou espólio. O pagamento é pelo Mercado Pago, mas o preço está em 0 (desligado) até resolver a licença dos sprites.
- **Suporte:** pedido de ajuda e denúncia de jogador, com conversa com a equipe.
- **Ícones:** biblioteca de todos os sprites do TibiaWiki usados, com os créditos.
- **Configurações:** tema claro (pergaminho) ou escuro (verde, o padrão), e a opção "Menos movimento".
- **Conta:** cadastro, entrada, recuperação de senha e verificação de e-mail. Os e-mails ainda só aparecem no terminal; não há envio real.

### Equipe (painel administrativo)

Cargos de Suporte, Moderador e Administrador, cada um com suas permissões. Toda ação pede um motivo e fica na auditoria.
- **Atendimento:** fila de pedidos e denúncias.
- **Contas:** ver contas e personagens, e aplicar ou revogar punições: advertência, bloqueio de mercado, proibição de duelar e banimento.
- **Moderação:** remover recados, depoimentos, tópicos e comentários.
- **Economia:** ouro criado, removido e líquido por dia, com o acumulado.
- **Configurações:** as 46 regras ajustáveis: preços, taxas, recompensas, Ferreiro, classes, caçada em grupo, duelo, personagens e Premium.
- **Pagamentos, Avisos e Duelos:** pedidos do Premium, avisos ao jogador e a lista de duelos (para pegar contas múltiplas).
- **Eventos:** validação dos eventos de uso do jogo (páginas vistas, escolhas em listas).

---

## O que sustenta o jogo por baixo

- **Economia auditável:** todo ouro e todo item que entra, sai ou muda de dono passa por um único caminho e fica registrado num livro-razão. O comando `economy:reconcile` confere se a mochila e o ouro batem com o registro.
- **Proteção contra trapaça e clique duplo:** as ações travam o personagem no banco antes de mexer; os sorteios (dano, quebra, espólio) acontecem só no servidor; operações repetidas não pagam duas vezes.
- **Números fora do código:** preços, taxas, chances e recompensas estão no painel da Equipe, com limites mínimo e máximo.
- **Organização em "gavetas":** cada assunto tem sua pasta, com um `GAVETA.md` explicando regras e testes; `check:drawers` impede uma pasta de depender de outra que não deveria.
- **Testes:**
  - **Unitários:** cerca de 70 casos, cobrindo combate, economia, duelo, caçada em grupo, Premium e senhas.
  - **Integração:** 13 arquivos, cerca de 110 cenários, rodando numa base separada (`_test`): corrida de cliques, mesma conta, apostas, espólio, livros-razão.
- **Simuladores de equilíbrio:** progressão de níveis (`levels:simulate` e `levels:calibrate`), Ferreiro (`forge:simulate`), caçada em grupo (`group:simulate`), duelo entre vocações (`duel:simulate`) e apostas numa vila de 200 jogadores (`duel:stakes`).
- **Operação:**
  - **Segurança e dados:** backup com verificação, monitor de erros e varreduras automáticas a cada minuto (anúncios e duelos vencidos).
  - **Desenvolvimento local:** entrada rápida só no seu computador (Mestre, Rival de Treino e Mestre 1, a cópia do Mestre, para testar o duelo jogando pelos dois lados), e `npm run generate`, que contorna o arquivo do Prisma travado no Windows.

---

## Avaliação

### Pontos fortes

1. **Escopo grande e coerente para a fase:** tem progressão longa (até o 1000), combate com decisões reais, cooperação (grupo), competição (duelo), economia entre jogadores e comunidade. Poucos jogos de navegador independentes têm tudo isso funcionando junto.
2. **Economia cuidadosa:** livro-razão, conciliação, taxas que tiram ouro do jogo e travas contra clique duplo, coisas que normalmente só aparecem depois do primeiro problema. O jogo está pronto para itens e ouro valerem algo.
3. **Premium honesto:** não vende poder e só é concedido depois que o servidor confirma o pagamento. Isso protege a reputação do jogo.
4. **Equipe com ferramentas de verdade:** permissões, motivo obrigatório, auditoria, punições com prazo e indicadores de economia.
5. **Decisões de equilíbrio medidas, não chutadas:** existe simulador para progressão, Ferreiro, grupo, duelo e apostas.
6. **Identidade:** textos com voz de RPG, missões com história, campanha cooperativa com papéis e dois temas visuais.

### Lacunas (o que falta ou está pela metade)

Resolvido em 2026-11-12: os 32 PRs que estavam abertos, um apoiado no outro, foram juntados no `main` (do #2 ao #32 em ordem, e o #1, da Jornada do Premium, por último, com os conflitos resolvidos). Testes completos passaram no resultado.

1. **Equilíbrio do duelo** (em 2026-11-12 os ajustes passaram a ser configuráveis no painel, `pvp.healPercent`, `pvp.defensePercent` e `pvp.taken*`, ainda com padrão neutro)**:** no simulador, o Cavaleiro vence o Druida em cerca de 65% dos duelos do mesmo nível (meta: até 60%), e os duelos acabam em 1,5 a 3 rodadas. O Arqueiro também perde vida demais no simulador de caçada.
2. **E-mail real:** recuperação de senha e verificação ainda só aparecem no terminal; não há envio de verdade.
3. **Início guiado (~30 min):** a Jornada existe, mas o roteiro de primeira arma melhorada, primeiro chefe e primeira venda (Astra 6) ainda não.
4. **Combate solo sem efeitos de status** (veneno, queimadura, lentidão) e sem chefes com fases (Astra 4 e 5).
5. **Guildas e reino:** as tabelas `Guild`, `KingdomState`, `QuestBlueprint` e `CharacterQuest` existem no banco, mas nenhum código usa. Ou viram recurso, ou ficam documentadas como herança da versão antiga.
6. ~~Perfil sem os duelos~~: resolvido em 2026-11-12, o perfil mostra o registro e os cinco últimos duelos.
7. **Pedra de Proteção sem sprite** e **anúncio público de +10** ainda por fazer.

### Riscos antes de abrir ao público

1. **Licença dos sprites (TibiaWiki/CipSoft):** é o bloqueio principal para cobrar o Premium e para lançar comercialmente.
2. **Contas e atalhos de teste:** é preciso remover `DEV_QUICK_LOGIN` e apagar as contas `mestre@`, `rival@`, `mestre1@localhost.dev` e `vendedor-teste@example.invalid` do banco de produção.
3. **Itens pendentes do `SEGURANCA.md`:** proxy no deploy, contas descartáveis, "sair de todos os aparelhos", trava do mercado e senha do MySQL.
4. **Textos legais:** Termos, Privacidade e Reembolso ainda têm campos a preencher e precisam de revisão de advogado (inclusive sobre mostrar o nome do personagem em público).
5. **Pagamento:** o Mercado Pago ainda não foi testado no ambiente de testes deles (`MERCADOPAGO-TESTE.md`).
6. **Rotina:** backup e conciliação da economia ainda não estão agendados.

### Recomendação de ordem

1. **Fechar o pacote "antes de publicar":** e-mail real, segurança pendente, contas de teste, textos legais e backup agendado.
2. **Ajustar o equilíbrio** do Cavaleiro × Druida no duelo e da vida do Arqueiro, usando os simuladores que já existem.
3. **Início guiado de 30 minutos:** é o que mais segura o jogador novo.
4. **Depois do beta:** efeitos de status e chefes com fases, guildas (usando ou apagando as tabelas paradas), duelos no perfil, temporadas de ranking e a decisão da licença para ligar o Premium.
