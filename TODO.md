# TODO / DONE — O Confronto

> Arquivo vivo. Cada item concluído vira `[x]` na hora, com a data. Itens que dependem da SUA máquina (eu não consigo rodar MySQL/npm real aqui) ficam em "Só você pode fazer".
> **Segurança:** pendências levantadas em 2026-10-31 estão em `SEGURANCA.md` (13 itens; 1, 2, 3, 4, 8, 9 e 10 corrigidos em 2026-10-31). Ler antes de publicar.
> Avaliação das propostas do GPT Astra: ver `ASTRA-AVALIACAO.md` (cada seção aceita/adaptada/adiada tem itens aqui, marcados com **[Astra N]**).
> Regra: ao terminar algo, marque aqui, ajuste o `GAVETA.md` da gaveta tocada e rode `npm run check:drawers`.

Última atualização: 2026-10-28 (itens raros)

## ✅ Feito
**Base e roadmap**
- [x] Avaliação do código do Codex + `AUDITORIA.md`
- [x] Extrato de ouro e de itens (`GoldLedger` / `ItemLedger`), idempotência (`Idempotency-Key`), travas de linha
- [x] Painel admin com permissões por cargo, motivo obrigatório e `AdminAuditLog`
- [x] Premium de 30 dias (Mercado Pago Pix/cartão), webhook com HMAC + reconsulta, períodos encadeados, reembolso
- [x] Ferramentas de suporte (tickets, denúncias, consulta de conta)
- [x] Classes: Cavaleiro, Arqueiro (Paladino), Mago (Feiticeiro), Druida + promoção
- [x] Recuperação de senha / confirmação de e-mail com token de uso único
- [x] Backup + verificação (`npm run backup`, `backup:verify`), monitor de erros, `OPERACAO.md`
- [x] Termos, Privacidade e Reembolso publicados (`frontend/public/legal`) — falta preencher [campos] (ver abaixo)
- [x] Roteiro de teste do Mercado Pago sandbox + simulador de webhook (`mp:sim`)
- [x] Revisão de licença dos sprites (`ASSETS-LICENCA.md`, `assets:audit`)
- [x] Conceitos do post do Mano Deyvin: corridas, idempotência, nunca confiar no cliente, separação de camadas, testes de integração
- [x] Economia: taxa mínima 1; tarefas seguem multiplicadores; aviso ao vender item melhorado ao NPC; conciliação de ouro e de itens (saldo de abertura)
- [x] Organização em gavetas (`GAVETAS.md`, `check:drawers`)

**Ferreiro com risco [Astra 1]** — 2026-10-28
- [x] Melhorar com chance: +1→+3 garantido, +4→+6 pode falhar **sem perder o item**, a partir da tentativa de chegar ao +7 a falha pode **destruir** o item
- [x] Configurável pelo admin: `upgrade.safeUntilTier`, `upgrade.breakFromTier`, `upgrade.breakOnFailPercent`
- [x] Sorteio só no servidor; ouro sempre gasto; quebra registrada no extrato (`UPGRADE_BREAK`)
- [x] Tela mostra sucesso / falha (item preservado) / % de destruição por item e pede confirmação nas tentativas que podem destruir
- [x] Simulador de probabilidade e custo até o +10 (`npm run forge:simulate`) com teste (fórmula exata × sorteio)
  - Resultado com os padrões: só ~9% dos itens chegam ao +10 sem quebrar; em média ~11 itens queimados e ~590× o preço NPC do item em ouro. **Veja se isso é o que você quer** (decisão #1 abaixo).

## 🔧 Em andamento
- [x] Atualizar `AUDITORIA.md` e `game/GAVETA.md` com a regra `breakFromTier`
- [x] Sincronizar e gravar tudo na sua pasta

- [x] Capa oficial como abertura da página inicial no estilo do site antigo (faixa de boas-vindas, menu Entrar/Cadastro, notícias), nos dois temas; contido na moldura de 1200 px do site e responsivo (celular: login vem primeiro) (2026-10-28)
- [ ] Usar a capa também em compartilhamento (og:image) e conferir direitos/licença das duas artes geradas por IA antes do lançamento comercial

- [x] Entrada "Mestre" para desenvolvimento (botão na home só no seu computador; `DEV_QUICK_LOGIN=1`) (2026-10-28)
- [x] `npm run master:create` cria/redefine o login master (e-mail `mestre@localhost.dev`, senha temporária `Mestre-Temp-2026!`; `-- --aleatoria` gera outra; `-- --senha "..."` escolhe)
- [x] Senha fixa da conta master removida; `master:create` gera senha aleatória sem exibir; `dev-login` não promove mais conta existente e exige `HOST` loopback + `NODE_ENV=development`; servidor aborta com `DEV_QUICK_LOGIN=1` em host público; `npm run start:prod` (2026-10-31, `SEGURANCA.md` 1–4, 8–10)
- [ ] **Antes de publicar:** remover `DEV_QUICK_LOGIN` do `.env`, apagar a conta `mestre@localhost.dev` e conferir que nenhuma conta de teste ficou no banco de produção
- [x] Segurança (2026-11-12): 11 trocar senha logado e sair dos outros aparelhos; 12 posse antes da trava no Mercado; 7 nível mínimo no Mercado (`market.minLevel`) e opção de e-mail confirmado (`market.verifiedEmail`); 6 avisos de proxy; contas de desenvolvimento não entram em produção; produção recusa subir com e-mail só no terminal
- [ ] Segurança ainda pendente (`SEGURANCA.md`): `TRUST_PROXY` e `HOST` no deploy, ligar `market.verifiedEmail` depois do Resend, 13 senha do MySQL
- [x] Duelos no perfil (/perfil/Nome): vitórias, derrotas, sequência, honra e os cinco últimos; respeita `fameHidden` (2026-11-12)
- [x] Duelo: ajustes de equilíbrio no painel, padrão neutro (`pvp.healPercent`, `pvp.defensePercent`, `pvp.taken*`); `npm run duel:simulate` aceita os mesmos valores. Medição de 2026-11-12 (400 duelos por par): hoje pior par 69% e 1,8 rodada; com dano 60, cura 40, Cavaleiro 115 e Arqueiro 85 fica 68% e 2,9 rodadas, mas o Cavaleiro de nível 20 cai para 32% contra o Feiticeiro. Decisão do dono.
- [x] Pendências do jogo registradas no Trello, quadro The Final Confrontation, cartões com prefixo [Site] (2026-11-12)
- [x] Tela: capa e descrição ao compartilhar o link (og:image), "ouro" no lugar de "gp", denúncias sem window.prompt (`ui/AskReason.tsx`), Ferreiro enxerga a mochila inteira, Caçar abre na região liberada mais alta (2026-11-12)
- [ ] **Antes de publicar:** apagar a conta de teste `vendedor-teste@example.invalid` (Mercador de Testes) e os anúncios dela, criados por `npm run dev:market-demo`

- [x] Tema ESCURO como padrão; home em uma única moldura (capa + menu colado + boas-vindas + conteúdo) (2026-10-28)
- [ ] Conferir se o que eu gravo na pasta chega mesmo (houve arquivos desatualizados no disco: `package.json`, `main.tsx`, `fire.css`); sempre comparar tamanhos após gravar

## 📋 A fazer — por fase (ordem do Astra, ajustada)

### Antes do beta
- [ ] **[Astra 6]** Início guiado (~30 min): primeira arma melhorada, primeiro chefe, primeira venda
- [x] **[Astra 4]** Registro de derrota explicando o motivo + revanche com dica (2026-10-31: `game/defeatAdvice.ts`, motivos também vão para o Diário; botões Ir ao Templo → Revanche)
- [x] **[Astra 13]** Aviso de manutenção + histórico de atualizações: página Novidades (shared/changelog.ts) e avisos da equipe no topo, inclusive na entrada (notices.manage, motivo e auditoria; migração 202611010002_game_notices) (2026-10-31)
- [x] **[Astra 12]** Opção "Menos movimento" (botão ao lado do tema; segue o sistema sem escolha salva; desliga animações, transições e o fogo do +10). Perigo/raridade já têm texto além da cor (PERIGOSO/CHEFE, +N, sinais +/−, "caiu") (2026-10-31)
- [x] **[Astra 2]** Bloqueio de item favorito (contra venda, anúncio, Ferreiro e melhoria que pode quebrar sem Pedra); desfavoritar não exige Premium (2026-10-31)
- [x] **[Astra 7]** Indicadores de ouro criado × consumido × acumulado (painel admin): por dia com criado, removido, líquido e acumulado; estoque total e média por personagem; motivos vêm de goldReasons (antes Ferreiro/redistribuição/caçada em grupo caíam em "entre jogadores") (2026-10-31)
- [x] Aviso de mudança do Ferreiro aos jogadores (entrada em Novidades)
- [ ] Mensagem/limite contra cliques repetidos conferidos em todas as telas novas
- [ ] SMTP real para e-mails (hoje só log)
- [x] Métricas de onboarding/retenção: page_view e select_content registrados, com tela de validação e disparo em lote (2026-11-01)

### Durante o beta
- [x] **[Astra 1]** Histórico pessoal de tentativas do Ferreiro (aba Meu histórico: sucessos, falhas, quebras, Pedra, ouro gasto, em páginas) (2026-10-31)
- [x] **[Astra 1]** Efeito visual por faixa (+7 brilho discreto, +9 forte, +10 fogo) — parado com "Menos movimento" (2026-10-31)
- [x] **[Astra 1]** Pedra de Proteção **só obtida jogando** (2026-10-28): cai de monstros nível 5+ (0,3%; chefes 1%), item de loot; marcada na Forja, só é gasta quando evita uma quebra, registrada no extrato (`PROTECTION_USE`). Nunca vendida por dinheiro real. Teste de integração incluso.
- [ ] Sprite próprio da Pedra de Proteção (hoje sem imagem; só usar TibiaWiki após decidir a licença) e, se quiser, ajustar a chance de queda
- [ ] Rodar `npm run seed` (cria a pedra e as quedas; é upsert, não apaga nada)
- [x] **[Astra 1]** Materiais por faixa + Ferreiro fabrica, reforja e desmonta (2026-10-31): 8 materiais com sprite do TibiaWiki, Mercador só vende equipamento até o nível 100 (`shop.maxEquipmentLevel`), custos em `forge.*`, extrato com motivos `FORGE_*`, teste de integração
- [ ] **Você:** `npm run seed` no seu banco para os materiais caírem dos monstros (sem isso o Ferreiro avisa que faltam materiais)
- [ ] **[Astra 7]** Sumidouros de ouro além da quebra (taxas, serviços, anúncios) e alerta de duplicação por conciliação agendada
- [x] **[Astra 8]** Mercado: busca por nome, filtros por tipo, "só o que posso usar" e melhoria mínima; comparação ▲/▼ com o equipado; histórico pessoal já está em Extrato (2026-10-31)
- [x] Poções por faixa de nível (11, sprites TibiaWiki verificados em scripts/sprites-pocoes.json), Mercador/Mercado/mochila por tipo, equipamento leva ao Inventário, nível recomendado nas regiões (2026-10-31). **Você:** rodar `npm run seed` (o iniciar.bat já faz) para as poções novas aparecerem
- [ ] **[Astra 5]** Chefes individuais com fases
- [ ] **[Astra 4]** Efeitos de status (veneno, queimadura, lentidão) com duração visível; limite de duração do combate
- [ ] **[Astra 2]** Atributos secundários nos itens (crítico, mana, resistência) — respeitando `combatStats.ts` como única origem

### Itens raros com identidade **[Astra 15]** — decisão: raro = item que chegou ao +10
- [x] Migração aditiva `202610280004_rare_items` (`RareItem`, `RareItemEvent`, `rareItemId`, `Character.fameHidden`) (2026-10-28)
- [x] Número gerado ao chegar ao +10, em sequência por tipo, com trava (sem repetir sob concorrência); "primeiro do tipo" marcado
- [x] Raro sobrevive ao mercado (anunciar/comprar/cancelar/expirar mantêm o mesmo número)
- [x] Venda ao NPC marca "destruído" e mantém a história (+ aviso na confirmação de venda)
- [x] Anonimato (`fameHidden`, caixa na Forja) vale também para raros já criados; texto da história não vaza o nome
- [x] Inspeção: `GET /rare-items` (contagem em circulação × destruídos) e `/rare-items/:id`; Nº aparece na mochila e na Forja
- [x] Testes: unitário (anonimato) + integração (sequência, mercado, NPC, privacidade)
- [ ] **Você:** `npx prisma migrate deploy` e `npx prisma generate` (schema mudou) antes de rodar os testes
- [ ] Tela pública de inspeção / coleção de raros (hoje só API + Nº na mochila)
- [ ] Anúncio no mundo de +10 / primeiro do tipo (respeitando anonimato)
- [ ] Itens raros obtidos por outras rotas (chefes/fabricação) — Astra sugeriu; hoje raro = +10
- [x] Efeito visual do +10: moldura de fogo animada criada pelo dono (GIF `fx/fire-frame.gif`, 16 quadros) em volta do ícone da mochila, equipamento e Forja; parada (1º quadro) com "reduzir movimento" (2026-10-28)
- [x] Brilho discreto no +7 e mais forte no +9 (proposta Astra 1)
- [ ] Revisar com a LGPD/Privacidade: texto legal deve citar a exibição pública do nome do personagem e o opt-out

### Níveis 60 a 1000 — ver `PLANO-NIVEIS.md` (proposta de 2026-10-31, aguardando decisões ❓1–❓5)
- [x] Fase 0: subida de nível num só lugar (`gainExperience`), `shared/progression.ts`, `MAX_LEVEL`, `npm run levels:simulate` (2026-10-31)
  - Achado do simulador: até o nível 40 as lutas acabam em 1–2 turnos (monstros fracos demais para o personagem da faixa); só o Demon (60) é desafiador. Rebalancear vida/ataque na Fase 1.
- [x] Fase 1: conteúdo até o nível 100 (sprites do manifesto) — 41 monstros, 4 regiões novas, 49 equipamentos, `levels:calibrate` (2026-10-31)
- [ ] **Você:** `npm run seed` no seu banco depois de juntar a Fase 1 (o `iniciar.bat` já faz)
- [ ] Rever equilíbrio do Arqueiro (perde ~2× mais vida no simulador; é defesa/vida, não ataque). Armas de mago e Arqueiro resolvidas na Fase 2 com munição/foco
- [x] Fase 2: conteúdo até o nível 250 (Infernatil) — 17 monstros, 3 regiões (a última é o Vale da Perdição), 38 equipamentos, munição/foco para Arqueiro e magos (2026-10-31)
- [x] Fase 3: 250–1000 com Eras (decisão ❓4 = B) — 5 Eras, 55 monstros, 65 equipamentos, Apocalypse no 1000; Vale da Perdição é a região final (2026-10-31)

### Comunidade e grupo (pedidos de 2026-10-31)
- [x] Missões com nome, quem pede e história para os 113 monstros (`shared/missions.ts`); Thais virou Capriel e a primeira região, Campos do Amanhecer
- [x] 8 classes por vocação (20, 100, 250, 400, 550, 700, 850, 1000): +3% ataque/defesa e +1 crítico por classe após a promoção, custo = promoção × (nível ÷ 20)², migração aditiva `202610310001_class_tiers`, monstros recalibrados (2026-10-31)
- [x] Perfil de comunidade grátis (/perfil, /perfil/Nome): galeria do TibiaWiki (10 lendárias no Premium), descrição (500; Premium 2.000), recados com intervalo, depoimentos com aprovação, amigos, visitas com modo invisível, denúncia → atendimento REPORT, remoção pela equipe com auditoria; migração `202610310002_community_profile`; menu lateral em seções (2026-10-31)
- [x] Fórum estilo Reddit (/forum, /forum/id): 6 categorias, votos ▲▼, Em alta/Novos/Mais votados, busca, 10 por página, comentários com respostas, "resolvido" nas dúvidas, intervalo contra spam, denúncia e remoção pela equipe com auditoria; migração `202610310003_forum` (2026-10-31)
- [x] Regra do site: nenhuma lista com mais de 10 itens de uma vez ("Ver mais" e/ou busca) — `ui/ShowMore.tsx` (Limited, LimitedRows) em todas as telas; Missões em 10 faixas de nível com drill-down e busca; Mercador com busca; regiões ordenadas (liberadas mais altas primeiro); mochila com 10 por página (2026-10-31)
- [x] Páginas numeradas (Anterior 1 … 4 5 6 … N Próxima) no servidor para o que cresce com os jogadores: mercado (com busca), extrato, histórico do mercado, atendimentos, combates e memórias do diário, recados, depoimentos, amigos, visitas, fórum e mochila (2026-10-31)
- [x] Caçada em grupo, fase 1 (/cacada-em-grupo): nível 100+, grupo de 2 a 4 amigos, convites, rodadas com prazo (quem não escolhe defende), ações por vocação (Segurar, Mirar, Curar o grupo, Quebrar selo), 1ª caçada "Fera da Serra Vermelha" com o laço, recompensas por loadSettings (group.*) com limite semanal; migração `202611010001_group_hunt`; `npm run group:simulate` (2026-10-31)
- [x] Caçada em grupo, fase 2: Floresta Oca (encantamento: metade do dano até o Feiticeiro desfazer; bônus), Lago Cinzento (névoa com ilusões que a mira e a luz vencem + veneno que o Druida corta) e o Dragão (selos que o deixam furioso; com 25% de vida o grupo vota derrotar ou fazer dormir, gravado no Diário); conquistas "Ninguém caça sozinho" e "As Quatro Marcas" (2026-10-31)
- [x] Caçada em grupo com amigos a partir de um nível (fases 1 e 2 prontas) — campanha em `CAMPANHA-QUATRO-MARCAS.md` (Paladino = ataque à distância, decidido em 2026-10-31)

### Depois de validar o jogo
- [ ] **[Astra 3]** Talentos / especializações / redistribuição com custo
- [ ] **[Astra 8]** Profissões e receitas; ordens de compra com ouro reservado; troca direta confirmada pelos dois
- [ ] **[Astra 9]** Amigos/bloqueio, grupos, guildas com baú auditado, moderação
- [ ] **[Astra 10]** Rankings por classe/categoria, temporadas cosméticas (sem ranking de ouro)
- [ ] **[Astra 11]** Mais benefícios cosméticos/organização no Premium
- [ ] **[Astra 5]** Regiões novas, bestiário, expedições, eventos de mundo
- [x] PvP: Duelo entre amigos (2026-10-31) — desafio, rodadas com prazo, rendição, histórico, ranking de honra, PVP_BLOCK, lista da equipe e denúncia. Apostas (Comando 9): Honra com marcas e loja de aparência, Aposta de ouro com taxa, Espólio a 25% com resgate. Fora por ora: bloco "Duelos" no perfil, duelo ao vivo. Equilíbrio: `npm run duel:simulate` (Cavaleiro × Druida chega a ~67%; Paladino abaixo das outras).

## 🧑‍💻 Só você pode fazer (eu não consigo rodar aqui)
- [ ] Dê dois cliques em `iniciar.bat`: atualiza tudo (install, generate, migrações, seed, login master, build) e já inicia o jogo em http://localhost:3333.
- [ ] `npm install` → `npm run check` → `npm test` → `npm run build`
- [ ] `npm run test:integration` num banco que termina em `_test` (inclui os cenários novos de corrida, mesma conta, configurações perigosas, conciliação e forja arriscada)
- [ ] `npm run forge:simulate -- 1000` e olhar se o custo do +10 serve para o jogo
- [ ] Rodar `backup`/`backup:verify` contra o MySQL e agendar (+ `economy:reconcile` periódico)
- [ ] `npm run economy:opening -- --apply` (uma vez) e `node scripts/limpar-gavetas.mjs --apagar`
- [ ] Testar Mercado Pago no sandbox (`MERCADOPAGO-TESTE.md`)
- [ ] Preencher os [campos] dos textos legais + revisão de advogado
- [ ] Licença dos sprites: manter `premium.priceCents=0` até decidir; conferir Rat / Magic Plate Armor / Bow
- [ ] Olhar as telas nos dois temas e no celular

## ❓ Decisões
**Respondidas (2026-10-28)**
- [x] Proteção contra quebra ganha jogando: **sim, chance bem baixa**
- [x] Itens que já estão em +4 ou mais: **ficam como estão** (sem compensação; o risco só vale da tentativa de +7 em diante). Aviso de mudança entra no changelog do jogo.
- [x] Ferreiro arriscado **já no beta fechado**

**Em aberto**
1. **Dificuldade do +10**: ~9% sobrevivem e ~590× o preço do item em ouro está bom? (ajustável em Configurações, sem código; rode `npm run forge:simulate`)
