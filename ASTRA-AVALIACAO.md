# Avaliação das propostas do GPT Astra

Legenda: ✅ aceito como está · 🔧 aceito com ajuste · ⏳ adiar · ⛔ não recomendo. "Já existe" = já está no código. Itens viram tarefas no `TODO.md`.

**Visão geral:** o texto é bom e coerente com o que já temos (classes, extrato, Premium sem poder). O ponto central — **Ferreiro com risco transparente** — é a melhor ideia e foi implementado agora. O risco do documento inteiro é *escopo*: são ~100 funcionalidades; para uma equipe pequena, só as fases "antes do beta" e "durante o beta" são realistas agora.

| # | Tema | Veredito | Comentário |
|---|---|---|---|
| 1 | Ferreiro +10 com risco | ✅ implementado | Faixas idênticas à proposta (+1–3 seguro, +4–6 falha preserva, tentativa de +7 a +10 pode destruir). **Ajuste meu:** a "chance de destruir" é parâmetro (50% da falha) e as faixas são configuráveis. Mostra chances, pede confirmação, registra no extrato, sorteio só no servidor, simulador pronto. Falta: histórico de tentativas na tela, efeitos visuais, materiais/desmontagem, anúncio de +10 (precisa de opt-out de anonimato). **Concordo com o Astra: nunca vender proteção por dinheiro real.** Proteção ganha jogando: **implementada** (Pedra de Proteção). |
| 2 | Equipamentos com escolhas | 🔧 parcial | Favoritar item (bloqueia venda/Ferreiro) é barato e protege contra clique errado → **antes do beta**. Atributos secundários, sets e gemas: só **depois** do beta, e sempre via `combatStats.ts`. O alerta do Astra sobre multiplicadores empilhados é correto: definir teto antes de adicionar raridade + nível + aprimoramento. |
| 3 | Classes com identidade | 🔧 já existe a base | 4 classes (Cavaleiro, Arqueiro, Mago, Druida) + promoção + regras de combate próprias já existem. Talentos, especializações e redistribuição → depois de validar o jogo. "Testar habilidade antes de gastar ponto" é ótimo, mas só faz sentido quando existirem talentos. |
| 4 | Combate estratégico | 🔧 parcial | Já existem defender, interromper, curar, fugir. Faltam: **motivo da derrota** e **revanche com dica** (barato, alto valor → antes do beta), efeitos de status e chefes com fases (beta). PvP ⛔ por agora, concordo. |
| 5 | Mundo e exploração | ⏳ | Regiões/bestiário/expedições são conteúdo, não risco técnico. Entra depois do beta; chefes individuais com fases entram no beta. |
| 6 | Progressão e objetivos | ✅ prioridade | Início guiado de ~30 min é o que mais retém jogador. Entra **antes do beta**. Conquistas e objetivos semanais: depois. |
| 7 | Economia | ✅ já existe a base | Extrato de ouro e itens, conciliação, taxas configuráveis, expiração de anúncios: já existem. Falta o painel de ouro criado × consumido, e **sumidouros de ouro** — o Astra tem razão: quebrar arma tira item, não ouro. Taxas, serviços e desmontagem entram no beta. Alerta de duplicação = agendar `economy:reconcile`. |
| 8 | Mercado e profissões | 🔧 | Busca/comparação/histórico pessoal → beta. Ordens de compra com ouro reservado e troca direta são cuidadosas (exigem lock e idempotência) → depois. Profissões ⏳ (cuidado: cada profissão nova é uma economia nova). |
| 9 | Grupos e guildas | ⏳ | Concordo em guerra de guilda só com população. Amigos/bloqueio e denúncia pelo perfil são baratos e úteis cedo; baú de guilda precisa do mesmo rigor do extrato. |
| 10 | Rankings | ⏳ 🔧 | Sem ranking de ouro (concordo: incentiva venda por fora). Ranking por classe é simples e já combina com o que temos. |
| 11 | Premium 30 dias | ✅ já existe | Já é 30 dias, renovação por nova compra, ativação só após confirmação do servidor, sem poder de combate. Itens cosméticos novos são acréscimo. Regra "expirar não apaga nada" está respeitada. |
| 12 | UI e acessibilidade | 🔧 | Dois temas e abas finas já existem. Faltam: reduzir movimento, raridade/perigo **também por ícone/texto** (a confirmação do Ferreiro já usa texto), sons opcionais. |
| 13 | Operação e segurança | ✅ em grande parte | Já existem: recuperação de senha, RBAC, auditoria admin, suporte/denúncias, backups com verificação, monitor, idempotência. Faltam: SMTP real, 2FA para admin, ambiente de testes separado documentado, aviso de manutenção/changelog. Distinguir "quebra legítima" de "falha do sistema": o extrato já separa com `UPGRADE_BREAK` — suporte pode filtrar por esse motivo. |
| 14 | Fases de lançamento | 🔧 | Concordo com a ordem, com uma ressalva: **Premium pago só depois de resolver a licença dos sprites** (TibiaWiki/CipSoft), por isso "Premium após validar" faz sentido. Já implementei o Premium; mantemos `priceCents=0`. |

## Adendo 15 — Identidade dos itens raros (número, história, "destruído")
**Veredito: ✅ aceito e IMPLEMENTADO (núcleo) com a decisão do dono: raro = equipamento que chegou ao +10 (não há lista de raros por tipo).** Por isso o número nasce no +10, não na obtenção. Combina com a Pedra de Proteção e dá sentido à perda: a quebra vira um evento da história do item. A separação raridade × aprimoramento está certa e simplifica a regra.

Como eu construiria (tudo aditivo, sem tocar nos dados existentes):
- `ItemBlueprint.rarity` (COMMON / RARE). Só raros recebem número; comuns continuam como estão.
- Tabela de registro `RareItem` (blueprintId, serial, origem, descobridor, criador, status CIRCULANTE/DESTRUÍDO, datas) com `@@unique([blueprintId, serial])`, e `InventoryItem.rareItemId` opcional. A linha do registro **sobrevive** quando o item é apagado na quebra — por isso "destruído" é só mudar o status.
- Tabela `RareItemEvent` (encontrado, fabricado, aprimorado, 1º +10, anunciado, destruído) para a "história".
- O número é gerado no momento da obtenção, dentro da mesma transação do loot/fabricação, com trava de contador por blueprint (sem corrida, sem repetir). Raros são sempre não empilháveis.
- Todo o controle interno (extrato de itens, conciliação) continua valendo para todos, como o texto pede.

Cuidados que o texto não cobre:
- **Privacidade:** mostrar "encontrada por Paulo" é público. Precisa de opção de anonimato por personagem (já sugerida para o +10) e de nome exibido só do personagem, nunca da conta.
- **Itens dados pela equipe** (ADMIN_GRANT) devem ter origem "Equipe" e nunca contar como descoberta nem como "primeiro +10".
- **Teto de oferta:** decidir se cada raro tem tiragem máxima (ex.: 100 exemplares) ou só chance de loot; a "contagem de exemplares" só é interessante se o número é conhecido.
- **Raros existentes:** não numerar retroativamente; só itens obtidos depois do lançamento do recurso. Dono atual/histórico de donos: sugiro **não** expor trocas, só descobridor, criador e marcos.
- **Pedra de Proteção** em raro: manter permitida (é a forma de "recuperação" do jogo), mas a quebra de um raro vira anúncio opcional.
- Inspeção pública e coleção de pistas dependem de o jogo ter chefes/regiões suficientes para dar pistas — ficam depois do núcleo (registro + número + status).

## Pontos onde discordo ou tenho cautela
- **Risco do +10 sozinho define o jogo.** Com os números padrão, só ~9% dos itens sobem sem quebrar e o custo médio do +10 é ~590× o preço NPC do item (rode `npm run forge:simulate`). Pode estar certo para um item "troféu", mas precisa ser decisão consciente.
- **Retroatividade:** quem já tem +4/+5 não corre risco (só da tentativa de +7 em diante), então o impacto imediato é pequeno — bom motivo para o limiar escolhido.
- **Anunciar +10 no mundo** exige opt-out de anonimato desde o início (LGPD / assédio).
- **Efeitos visuais** devem respeitar "reduzir movimento".
- **Quantidade:** não implementar sistemas de profissão, guilda e talento ao mesmo tempo; cada um precisa de extrato, testes de concorrência e telas.

## Ordem que eu recomendo
1. Fechar a validação na sua máquina (check/test/integration/build).
2. Início guiado + motivo da derrota + favoritar item.
3. Histórico de tentativas do Ferreiro + painel de ouro criado/consumido.
4. Beta fechado com Ferreiro arriscado; medir abandono após quebra.
5. Chefes, mercado melhorado, sumidouros; só então o resto.
