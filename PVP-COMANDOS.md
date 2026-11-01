# Modo PvP — comandos para o Opus executar

Sequência de prompts, um por sessão, na ordem. Cada um segue o modelo de `GAVETAS.md`: o Opus lê a gaveta, mostra o plano, espera aprovação, edita, roda as verificações e entrega o relatório. Copie o bloco inteiro de cada comando. Todos trabalham na branch `jogo/duelo-pvp`.

## Decisões suas antes de começar (responda no Comando 1)
1. **Nome na interface:** "Duelo" (sugestão), "Arena" ou "Desafio". Aba `/duelo`.
2. **Quem pode desafiar quem:** só amigos (sugestão: usa `Friendship`, evita assédio) ou qualquer um da mesma faixa de nível.
3. **Faixa de nível:** ±10% do nível (sugestão) ou mesma classe (`classTier`).
4. **O que se ganha e perde:** sugestão — nada de ouro, XP ou itens trocam de mão; só `pvpWins`/`pvpLosses` (colunas que já existem no `Character`), sequência de vitórias, título e emblema cosméticos. Aposta de ouro fica fora por ora (se quiser depois, entra como `transfer` no ledger com taxa `sink`).
5. **Formato:** assíncrono em rodadas com prazo, como a caçada em grupo (sugestão: 24 h por rodada, quem não escolhe defende), ou ao vivo com os dois conectados. O assíncrono reaproveita o que já existe.
6. **Limite diário** de duelos por personagem (sugestão: 10, configurável em `loadSettings`).
7. **Nível mínimo** para duelar (sugestão: 20, depois de escolher vocação).
8. **Ranking de honra** (Astra 10): sim/não. Se sim, só por vitórias e por classe; nunca por ouro.

Observação do `TODO.md`: "PvP (só depois de equilibrar monstros)". O duelo usa `combatStats.ts`, não os monstros, então pode começar em paralelo; o que depende do equilíbrio é a sensação de que duas vocações do mesmo nível têm chance parecida. O Comando 3 inclui uma simulação para medir isso.

---

## Comando 1 — Leitura e plano (sem editar nada)
```
Leia AGENTS.md, GAVETAS.md, PVP-COMANDOS.md e as GAVETA.md de backend/src/game, backend/src/community e frontend/src/features.
Leia também: backend/src/core/engine.ts, backend/src/game/combatStats.ts, backend/src/game/battleService.ts, backend/src/game/groupEngine.ts, backend/src/game/groupHuntService.ts, shared/groupHunt.ts, shared/economy.ts (settingDefs), backend/prisma/schema.prisma (Character.pvpWins/pvpLosses, Friendship, HuntParty, GroupBattle), frontend/src/lib/tabs.ts e frontend/src/features/adventure (cartões de turno do combate).

Tarefa: propor o desenho do Modo PvP ("Duelo") sem alterar arquivos. Minhas decisões: [cole aqui as respostas 1 a 8 de PVP-COMANDOS.md].

Entregue, nesta ordem:
1. Regras do duelo em uma página: quem desafia quem, faixa de nível, convite/aceite/recusa com validade, rodadas com prazo, ações por vocação (reaproveitar as de engine.ts: ATTACK, TRIPLE_HIT, FIFTH_HIT, HEAL, DEFEND_SHIELD, INTERRUPT; FLEE vira "Render-se"), como resolver duas ações simultâneas (ordem por agilidade, empate por dado), fim de duelo (HP 0, rendição, prazo estourado duas rodadas seguidas = derrota), o que muda no personagem (só pvpWins/pvpLosses; HP/mana do duelo são cópias, não mexem no HP real).
2. Modelo de dados: tabelas novas aditivas (sugestão: Duel e DuelFighter espelhando GroupBattle/GroupBattleFighter, com activeCharacterId @unique para garantir um duelo por vez) e nome da migração 202611010003_pvp_duel. Nenhuma coluna existente muda.
3. Chaves novas em settingDefs (grupo 'Duelo'): pvp.minLevel, pvp.levelBandPercent, pvp.dailyLimit, pvp.roundHours, pvp.inviteHours. Sem número fixo em serviço ou tela.
4. Rotas em backend/src/game/routes.ts no mesmo padrão de /group: GET /characters/:id/duel, POST duel/challenge, duel/invites/:id/(accept|decline), duel/:duelId/act, duel/:duelId/advance, duel/:duelId/forfeit, GET duel/history (10 por página, Pager).
5. Ordem das travas (igual à caçada em grupo): personagem de quem age → duelo → personagens em ordem de id. Diga onde entra lockCharacter e onde basta lockCharacterAny.
6. Tela: aba 'duel' (slug 'duelo') no grupo Aventura de tabs.ts; estados vazio, convite pendente, escolhendo ação, aguardando oponente, resultado, histórico; reaproveitar o cartão "ataque × defesa" do combate. Ícones só do manifest.json existente (liste os nomes que vai usar e confirme que existem; se faltar, diga "indisponível", não invente).
7. Riscos: assédio (só amigos + recusa + bloqueio), contas múltiplas inflando vitórias (limite diário, mesma conta não duela consigo nem entre seus personagens), corrida de dois cliques (round como na caçada em grupo), prazo vencido sem ninguém abrir a tela (varredura em server.ts igual a expireListings).
8. Lista de decisões que ainda dependem de mim.
Não edite nada. Espere meu OK.
```

## Comando 2 — Regras compartilhadas, configurações e migração
```
Leia GAVETAS.md, AGENTS.md e a GAVETA.md de backend/src/game. Use o plano aprovado do Comando 1 (PVP-COMANDOS.md).
Tarefa: criar a base do Duelo, ainda sem lógica de combate.
Escopo:
- shared/pvp.ts: tipos, lista de ações do duelo (reaproveitando Action de engine.ts; FLEE exibido como "Render-se"), estados (INVITED | FIGHTING | FINISHED), resultados (VICTORY | DEFEAT | FORFEIT | EXPIRED | DRAW), textos de intenção na voz de RPG do jogo ("ergue o escudo", "prepara o golpe triplo"), função canChallenge(a, b, settings) com faixa de nível e nível mínimo.
- shared/economy.ts: chaves pvp.* em settingDefs (grupo 'Duelo', com min/max e label), sem tocar nas chaves existentes. Não crie goldReasons/itemReasons: o duelo não movimenta ouro nem itens.
- backend/prisma/schema.prisma + migração aditiva 202611010003_pvp_duel: Duel (challengerId, opponentId, status, round, deadlineAt, inviteExpiresAt, state Json, log Json?, outcome, winnerId?, createdAt, finishedAt?) e DuelFighter (duelId, characterId, hp, maxHp, mana, maxMana, action?, activeCharacterId @unique, @@unique([duelId, characterId])). Relações em Character com nomes próprios (duelsAsChallenger, duelsAsOpponent, duelFights). Nada existente muda.
Use a branch jogo/duelo-pvp. Mostre o plano e o SQL da migração e espere eu aprovar. Não rode a migração no banco principal sem meu OK; rode primeiro num banco _test.
Depois: npm run generate, npm run check, npm test, npm run check:drawers.
Entregue: o que mudou, o que não conseguiu verificar e bugs fora do escopo (sem corrigir).
```

## Comando 3 — Motor do duelo (puro, testável) + simulação de equilíbrio
```
Leia GAVETAS.md e a GAVETA.md de backend/src/game. Leia backend/src/core/engine.ts (resolveTurn, Fighter, Dice) e backend/src/game/groupEngine.ts (resolveGroupRound) como referência de estilo.
Tarefa: criar backend/src/game/duelEngine.ts com a função pura resolveDuelRound(round, a, b, actionA, actionB, dice): sem banco, sem Date.now, sem Math.random (dado injetado).
Regras:
- Quem não escolheu recebe DEFEND_SHIELD.
- Ordem de resolução: maior agilidade age primeiro; empate decidido pelo dado. Quem cai antes de agir não age.
- Reaproveite as fórmulas de dano, crítico e esquiva de engine.ts e os atributos de combatStats.ts; não duplique fórmula. Se precisar extrair uma função de engine.ts, extraia sem mudar o comportamento do combate contra monstros (engine.test.ts tem que continuar passando igual).
- HEAL gasta mana como no combate; INTERRUPT cancela TRIPLE_HIT/FIFTH_HIT do outro se acontecer antes; FLEE = rendição imediata.
- Queda dos dois na mesma rodada: vence quem ficou com mais HP percentual antes do golpe final; igual = DRAW.
- Devolva o log da rodada no mesmo formato de cartão "ataque × defesa" que a tela de combate já exibe (veja lastLog em Battle).
Testes: backend/src/game/duelEngine.test.ts (node --test, dado determinístico): ordem por agilidade, empate, interrupção, cura sem mana, rendição, queda simultânea. Adicione o arquivo à lista de npm test em package.json.
Simulação: scripts/simulate-duel.ts (npm run duel:simulate -- 1000) com as 4 vocações no mesmo nível (20, 100, 300, 600, 1000), equipamento padrão da loja NPC para o nível, política simples de ações; imprime a taxa de vitória de cada par. Meta: nenhuma vocação acima de 60% contra outra no mesmo nível. Só meça e relate; não ajuste fórmula sem meu OK.
Branch jogo/duelo-pvp. Depois: npm run check, npm test, npm run check:drawers. Entregue o relatório com a tabela da simulação.
```

## Comando 4 — Serviço, rotas e testes de integração
```
Leia GAVETAS.md, AGENTS.md e a GAVETA.md de backend/src/game. Use backend/src/game/groupHuntService.ts como modelo de travas, prazos e rodadas.
Tarefa: criar backend/src/game/duelService.ts e ligar as rotas em backend/src/game/routes.ts.
Funções: duelState, challenge(name), answerInvite(id, accept), act(duelId, round, action), advance(duelId, round), forfeit(duelId), history(page), expireDuels().
Regras obrigatórias:
- Toda mutação dentro de transaction: lockCharacter do personagem autenticado primeiro; depois trava do Duel (SELECT ... FOR UPDATE); depois os personagens em ordem de id com lockCharacterAny. Mesma ordem em todas as funções.
- Validar: conta autenticada é dona do personagem; oponente existe, não é da mesma conta, é amigo (se eu decidi assim), está na faixa de nível (canChallenge de shared/pvp.ts); nenhum dos dois está em Battle aberta, grupo aberto ou outro duelo (activeCharacterId @unique); nível mínimo e limite diário vêm de loadSettings; convite expira em pvp.inviteHours.
- act recebe round e recusa se o round do banco for outro (409 "Essa rodada já passou."). advance só resolve quando os dois escolheram ou o prazo venceu; quem não escolheu defende; duas rodadas seguidas sem escolher = derrota por prazo (EXPIRED).
- HP e mana do duelo vivem em DuelFighter; o Character real não muda HP, mana, XP, ouro ou itens. Ao terminar: pvpWins/pvpLosses dos dois, AdventureEvent para o Diário ("Venceu X em duelo", "Caiu diante de X") e conquistas via awardAchievements ("Primeiro Sangue" na 1ª vitória, "Dez Duelos"), definidas onde as conquistas já moram (shared/adventure.ts).
- Varredura: em server.ts, ao lado de expireListings, chamar expireDuels() a cada minuto para fechar convites vencidos e resolver rodadas com prazo estourado.
- Erros com GameError e mensagens no tom do jogo; nunca detalhes internos para o cliente.
Testes: backend/tests/duel-integration.ts (banco _test; adicione a npm run test:integration): desafio e aceite; recusa; mesma conta não duela consigo; fora da faixa de nível; dois act concorrentes na mesma rodada (só um vale); prazo vencido vira defesa; rendição; limite diário; HP, ouro e XP reais iguais antes e depois.
Branch jogo/duelo-pvp. Mostre o plano antes de editar. Depois: npm run check, npm test, npm run check:drawers, npm run test:integration na base _test. Entregue relatório e bugs fora do escopo (sem corrigir).
```

## Comando 5 — Tela do Duelo
```
Leia GAVETAS.md, AGENTS.md e a GAVETA.md de frontend/src/features. Leia frontend/src/lib/tabs.ts, frontend/src/ui (Limited, ShowMore, Pager, GameIcon), a tela da caçada em grupo e os cartões de turno do combate em features/adventure.
Tarefa: criar frontend/src/features/duel/DuelPanel.tsx (com GAVETA.md da pasta) e ligar em App.tsx.
Requisitos:
- tabs.ts: aba ['duel','Duelo',<ícone do manifest>] com slug 'duelo', no grupo Aventura de sidebarGroups e drawerGroups. Não entra em mobileMain. Confirme o ícone em frontend/public/assets/tibia/manifest.json; se não houver sprite adequado, use um já registrado e anote "a trocar". Não invente caminho de imagem.
- Estados: (a) sem duelo: buscar amigo por nome (10 resultados), botão "Desafiar" com a faixa de nível explicada; (b) convites recebidos e enviados (até 10, ShowMore); (c) duelo em andamento: cartão do oponente, barras de HP/mana dos dois, ações da vocação com custo de mana e descrição curta, prazo da rodada em texto relativo ("resolve em 3 h"), estado "aguardando o oponente" com botão Atualizar; (d) rodadas no cartão "ataque × defesa" já usado no combate; (e) resultado com vitórias e derrotas atualizadas; (f) histórico de duelos com Pager do servidor.
- Confirmação antes de "Render-se". Erros do servidor exibidos no painel; nada de alert/prompt.
- Acessibilidade: botões com rótulo, foco visível, alvo mínimo 24px, nenhuma fonte abaixo de 12px, prefers-reduced-motion respeitado.
- Celular: uma coluna, sem rolagem horizontal, conferido em 375px.
- Textos na voz de RPG do jogo (ver commits "Textos com voz de RPG"); "ouro", nunca "gp".
- Nenhuma regra de combate na tela: ela só mostra o que o servidor devolve.
Branch jogo/duelo-pvp. Mostre o plano antes de editar. Depois: npm run check, npm run check:drawers, npm run build. Abra o jogo com duas contas e percorra desafio → aceite → 2 rodadas → rendição, com capturas de tela em computador e celular. Entregue relatório e bugs fora do escopo.
```

## Comando 6 — Ranking de honra (só se eu disse sim na decisão 8)
```
Leia GAVETAS.md e as GAVETA.md de backend/src/community e frontend/src/features/profile.
Tarefa: ranking de duelos sem ouro.
- GET /api/duel/ranking?tier=N: 10 primeiros por pvpWins dentro de cada classe (classTier), desempate por menos derrotas e depois por nome; respeita fameHidden. Cache em memória de 60 s.
- Perfil (/perfil/:nome): bloco "Duelos" com vitórias, derrotas, sequência atual e os 10 últimos duelos.
- Título cosmético por marcos (10, 50, 200 vitórias) gravado em profileTitle só se o jogador aceitar (botão no perfil), nunca sobrescrevendo um título escolhido.
- Tela: aba Duelo ganha a seção "Honra" com seletor de classe e lista de 10.
Sem ranking por ouro, sem recompensa em ouro. Branch jogo/duelo-pvp. Plano antes de editar; depois npm run check, npm test, npm run check:drawers, npm run build.
```

## Comando 7 — Moderação e configurações da equipe
```
Leia GAVETAS.md e a GAVETA.md de backend/src/admin.
Tarefa: ferramentas mínimas da equipe para o Duelo.
- As chaves pvp.* já aparecem no painel de configurações por settingDefs; confirme que o grupo 'Duelo' renderiza e que mudar pvp.dailyLimit vale no próximo desafio sem reiniciar.
- Punição nova: kind 'PVP_BLOCK' (temporário ou permanente) em Punishment, impede desafiar e aceitar; aplicar e revogar seguem as regras existentes de cargo, motivo e AdminAuditLog na mesma transação.
- Rota GET /api/admin/duels?page=N: últimos duelos (10 por página) com participantes e resultado, para investigar contas múltiplas; só leitura, com permissão em shared/permissions.ts.
- Denúncia pelo jogador: botão "Denunciar" no histórico de duelos abre o fluxo de suporte já existente com o id do duelo preenchido (sem window.prompt).
Branch jogo/duelo-pvp. Plano antes de editar; depois npm run check, npm test, npm run check:drawers, npm run build e npm run test:integration na base _test.
```

## Comando 8 — Fechamento: documentação, verificação completa e commits
```
Leia GAVETAS.md e AGENTS.md.
Tarefa: fechar a entrega do Duelo na branch jogo/duelo-pvp.
- Atualizar LEIA-ME.md (aba Duelo, comando duel:simulate, migração nova), TODO.md (marcar PvP com data e o que ficou de fora), GAVETAS.md (linha "duelo" na tabela "Qual gaveta mexer"), as GAVETA.md tocadas e AGENTS.md (uma linha: migração 202611010003_pvp_duel; o duelo nunca altera HP real, ouro, XP ou itens).
- Rodar e colar os resultados: npm run check, npm test, npm run check:drawers, npm run build, npm run test:integration (base _test), npm run duel:simulate -- 1000.
- Revisão final: cada rota valida a conta; nenhuma mutação sem lockCharacter; nenhum número fixo fora de loadSettings; nenhuma dependência npm nova; mensagens de erro sem detalhes internos; nenhuma lista com mais de 10 itens.
- Um commit por tema (regras e migração, motor, serviço, tela, ranking, moderação, docs) com mensagens em português no estilo do histórico. Não faça push.
Entregue: o que o jogador vê, o que a equipe vê, o que ficou fora e os riscos que ainda dependem de mim.
```

---

# O que se pode ganhar num duelo (proposta + simulação)

Hoje o Duelo não move nada: só vitórias, derrotas, sequência e ranking. A simulação `npm run duel:stakes` testa quatro formas de recompensa em cima do motor real (os dois lados agem em cada rodada), com uma vila de 200 jogadores por 30 dias. Nada disso existe no jogo ainda.

```
npm run duel:stakes -- [dias] [jogadores] [nível] [chance de espólio %] [taxa da aposta %]
```

## As quatro formas (o desafiante propõe, o oponente aceita ou recusa)
| Forma | O que o vencedor ganha | O que o perdedor perde | Efeito no mundo |
|---|---|---|---|
| **Honra** (sempre) | pontos de honra (tipo Elo, 1000 de partida), marcas de honra (moeda só cosmética: títulos, moldura, emblema), sequência | pontos de honra; ganha poucas marcas mesmo perdendo | nenhum ouro criado ou destruído |
| **Aposta de ouro** | o pote (2× a aposta) menos a taxa da arena | a aposta | a aposta é soma zero (`transfer`); a taxa é ralo (`sink`). Teto: N% do ouro em mãos do mais pobre dos dois, travado ao aceitar, como no mercado |
| **Espólio** | com chance X%, **um** item da mochila do perdedor, sorteado | esse item | item muda de dono (`transfer`). Nunca o equipado, nunca favorito, nunca +7 ou mais, nunca item raro; a Pedra de Proteção pode bloquear a perda (ralo) |
| **Resgate** | o preço de loja do item, pago pelo perdedor | ouro em vez do item | o perdedor tem 48 h para comprar o item de volta do vencedor pelo preço de loja. O vencedor fica com o ouro ou com o item, nunca os dois |

Outras ideias, mais arriscadas, que deixei fora da simulação: perder XP (castiga quem está subindo), perder o item equipado (acaba com o jogo para quem perde), apostar item contra item declarado (vira mercado de troca sem taxa).

## Resultado da simulação (nível 100, 200 jogadores, 30 dias, ~9 mil duelos)
Metade dos duelos por honra, 30% com ouro, 20% com espólio. 60% dos jogadores jogam com atenção e vencem 67% das vezes contra quem escolhe golpes ao acaso.

| Chance de espólio | Itens que trocaram de dono | Resgatados | Gini da riqueza (0,18 no início) | Perderam mais da metade do que tinham |
|---|---|---|---|---|
| 0% (só aposta de ouro) | 0 | 0 | 0,26 | 8% |
| 10% | 111 | 79 | 0,27 | 11% |
| **25%** | 276 | 188 | 0,30 | 14% |
| 50% | 601 | 374 | 0,35 | 25% |
| 100% (sempre leva) | 1.158 | 647 | 0,42 | 33% |

Taxa da arena sobre a aposta: 0% não muda a desigualdade (0,31) mas não tira ouro do mundo; 5% retira 6,6 milhões em 30 dias; 10% retira 12,7 milhões e a desigualdade cai para 0,29. Níveis 20 e 600 dão a mesma forma, só muda a escala do ouro.

O que se aprende:
- **Quem perde repetidamente é quem joga ao acaso**, e ele perde por ouro, não por item: os cinco mais pobres caíram 67–82% com 25% de espólio, e dois terços disso é aposta. O teto de 10% do ouro em mãos não impede a sangria em 30 dias.
- **Espólio até 25% é aceitável**: 14% da vila perde metade do patrimônio, contra 8% sem espólio. A partir de 50% o duelo vira máquina de transferir itens dos distraídos para os atentos, e um terço da vila empobrece.
- **O resgate funciona**: dois terços dos itens voltam ao dono original e viram ouro para o vencedor, o que reduz a raiva de perder algo com história (melhoria +5, item da jornada).
- **Ninguém zera** porque a aposta é proporcional ao mais pobre, mas isso só vale se o teto for calculado no servidor sobre o ouro em mãos, nunca informado pela tela.

## Minha recomendação (decisão sua)
1. Lançar **Honra** com marcas cosméticas primeiro: zero risco econômico, dá motivo para duelar.
2. **Aposta de ouro** com teto de 10% do ouro em mãos do mais pobre, taxa de 5% (ralo) e limite diário já existente.
3. **Espólio a 25%**, só se os dois marcarem "com espólio" ao desafiar, com as proteções da tabela e resgate de 48 h. Jamais o item equipado.
4. Limite extra contra contas múltiplas: o mesmo par de personagens só pode duelar com ouro ou espólio 3 vezes por dia; mesma conta nunca.

## Comando 9 — Recompensas do duelo (depois dos comandos 1 a 8)
```
Leia GAVETAS.md, AGENTS.md, PVP-COMANDOS.md (seção "O que se pode ganhar") e as GAVETA.md de backend/src/game e backend/src/economy. Leia scripts/simulate-duel-stakes.ts: é a proposta em forma de código.
Tarefa: apostas no Duelo, nas formas que eu marcar: [Honra com marcas] [Aposta de ouro] [Espólio com resgate].
Regras obrigatórias:
- Forma escolhida pelo desafiante no desafio e aceita explicitamente pelo oponente; gravada em Duel (coluna nova, migração aditiva 202611010004_duel_stakes). Convite mostra o que está em jogo antes de aceitar.
- Ouro: ao aceitar, a aposta dos dois é travada (coluna reservada, como o mercado), por addGold/recordGold com razões novas em shared/economy.ts: DUEL_WAGER (transfer, sai), DUEL_PRIZE (transfer, entra), DUEL_FEE (sink). Teto = pvp.wagerMaxPercent do ouro em mãos do mais pobre, calculado no servidor dentro da transação. Empate e convite vencido devolvem tudo.
- Espólio: no fim do duelo, dentro da mesma transação de finish(), sorteio com pvp.lootChancePercent entre os itens elegíveis do perdedor (não equipado, não favorito, upgradeTier < pvp.lootProtectTier, sem rareItemId); addItem/recordItem com razão DUEL_LOOT_OUT/DUEL_LOOT_IN (transfer). Pedra de Proteção na mochila do perdedor é consumida (PROTECTION_USE) e bloqueia a perda. Resgate: rota POST duel/:id/ransom, válida por pvp.ransomHours, paga npcPrice ao vencedor (transfer) e devolve o item; se o vencedor já vendeu ou equipou o item, o resgate não existe mais.
- Honra: coluna honorPoints em Character (padrão 1000) e honorMarks; marcas só compram cosméticos (título, moldura) por rota própria, nunca itens, ouro ou atributos.
- Chaves novas em settingDefs: pvp.wagerMaxPercent, pvp.wagerFeePercent, pvp.lootChancePercent, pvp.lootProtectTier, pvp.ransomHours, pvp.pairDailyLimit.
- Admin: economia diária (adminRoutes) e reasonLabel.ts ganham as razões novas; o extrato do jogador mostra "Aposta de duelo", "Prêmio de duelo", "Taxa da arena", "Espólio de duelo", "Resgate".
- Tela: o convite diz em letras grandes o que pode perder; confirmação dupla para espólio; histórico mostra o que mudou de mão; botão Resgatar com prazo.
Testes: unitários do sorteio e das proteções; integração em base _test para aposta travada, empate devolve, espólio com Pedra de Proteção, resgate dentro e fora do prazo, saldo nunca negativo, mesma conta recusada.
Branch jogo/duelo-apostas. Plano antes de editar. Depois: npm run check, npm test, npm run check:drawers, npm run build, npm run test:integration (base _test) e npm run economy:reconcile na base _test.
```
