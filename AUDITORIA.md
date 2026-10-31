# Auditoria — 5 fundamentos de engenharia

Base: [Fundamentos de Engenharia de Software para Vibe Coders](https://manodeyvin.com.br/p/fundamentos-de-engenharia-de-software) (Mano Deyvin, 26/10/2026). Auditoria **somente por leitura do código**; nada foi executado contra MySQL.

## 1. Race condition
**Já estava certo:** todo ler→decidir→gravar de jogo roda em transação com `SELECT … FOR UPDATE` no personagem/conta (`lockCharacter`, `lockCharacterAny`, `lockAccount`); mercado trava comprador e vendedor; saldo usa `increment` com guarda de saldo negativo; e-mail único e nome único via constraint do banco (P2002 → 409); limite de tickets abertos e de personagens sob lock. Nenhum Redis ou cache de estoque.
**Corrigido agora:** o limite de 200 mensagens por ticket contava e gravava sem travar → duas mensagens simultâneas podiam passar do limite. Agora o ticket é travado (`FOR UPDATE`).
**Teste novo:** duas compras simultâneas do mesmo anúncio → só uma vence.

## 2. Idempotência
**Já estava certo:** webhook do Mercado Pago valida assinatura HMAC, busca o pagamento na API (não confia no corpo), registra o evento com chave única (`PaymentEvent`) e responde 200 para repetições; criação de checkout reaproveita pedido pendente; ações do jogador (comprar, usar, anunciar, distribuir ponto) aceitam `Idempotency-Key`.
**Corrigido agora:** ajuste de ouro e concessão de Premium pela equipe **não** eram idempotentes — duplo clique aplicaria duas vezes. Agora exigem `Idempotency-Key` (o painel gera uma chave por tentativa; mudar os dados gera outra; chave reutilizada com dados diferentes → 409).
**Teste novo:** 6 requisições simultâneas com a mesma chave → ouro aplicado 1 vez, 1 linha no livro-razão; 4 concessões de Premium → 1 período.
**Observação:** a chave nunca usa e-mail/CPF, só UUID.

## 3. Nunca confiar no cliente
**Já estava certo:** preço, taxa, recompensa, dano, nível, papel de admin e Premium são calculados/validados no servidor; o cliente só envia IDs e quantidades, validados como inteiros; dono do personagem verificado em toda rota; permissões por cargo no servidor com motivo obrigatório; chaves (`MP_ACCESS_TOKEN`, `RESEND_API_KEY`) só no backend; sem RLS/Supabase.
**Limites conhecidos:** o preço de venda no mercado é do próprio jogador (esperado), com mínimo/máximo validados no servidor. Ocultar abas no front é só conforto — a barreira real é `need(permission)`.

## 4. Separação de responsabilidades
**Backend: bom.** Rotas finas → serviços (`marketService`, `premiumService`, `characterService`…) → `db`/`economy`. Regras puras e testáveis em `shared/`.
**Frontend: ponto fraco.** `App.tsx` concentra autenticação, abas, estado e chamadas em poucas linhas muito longas — difícil de revisar e de alterar sem efeito colateral. **Não refatorei agora**: sem poder rodar o build nem testes de tela aqui, uma quebra seria silenciosa. Plano seguro: (a) conferir que `npm run build` e as telas passam hoje; (b) extrair uma aba por vez para arquivo próprio (já feito para Personagens/Premium/Extrato/Suporte/Equipe), sem mudar rotas/props; (c) manter bugs achados em lista à parte.

## 5. Teste de integração
Existem 3 suítes que chamam rotas reais com MySQL `_test` (só mockam o Mercado Pago e o e-mail): jogo, aventura e operações (agora 14 cenários). Cobrem caminho feliz, erros, repetição, simultaneidade, limites e acesso entre contas.
**Lacuna honesta:** nunca foram executadas por mim (sem MySQL aqui). Rode `npm run test:integration` e me envie falhas — é o passo de maior valor agora.

## Ordem sugerida (do post) para o que resta
1. Rodar as suítes na sua máquina (fixa o comportamento). 2. Corrigir o que falhar. 3. Só então quebrar o `App.tsx`.

---

# Parte 2 — Os mesmos conceitos aplicados à economia do jogo

Fluxos lidos um a um: loja NPC (compra/venda), melhoria, poções, templo, mercado (anunciar/comprar/cancelar/expirar), recompensas de combate e de tarefas, ajustes da equipe.

| Fluxo | Race condition | Repetição / duplo clique | Veredito |
|---|---|---|---|
| Comprar no NPC | trava do personagem; saldo com guarda de negativo | `Idempotency-Key` | ok |
| Vender ao NPC | trava; item é apagado na mesma transação | 2º clique → 404, nada paga duas vezes | ok |
| Melhorar item | trava; `expectedTier` (concorrência otimista) | 2º clique → 409 | ok |
| Poção / pontos de atributo | trava | `Idempotency-Key` | ok |
| Templo | trava + tempo de espera de 5 min | repetir não cura de novo | ok |
| Anunciar | trava; taxa + retirada do item juntos | `Idempotency-Key` | ok |
| Comprar no mercado | trava de comprador, vendedor e anúncio, em ordem fixa (sem deadlock) | mesmo comprador repetindo → devolve "vendido" | ok |
| Cancelar / expirar | trava do anúncio; devolve o item uma vez | repetir é no-op | ok |
| Recompensa de combate | `turnVersion` + `isFinished` sob trava | turno velho → 409 | ok |
| Recompensa de tarefa | `isCompleted` verificado sob trava | resgate repetido → mensagem, sem pagar | ok |

## O que encontrei e corrigi
1. **Dinheiro infinito por configuração (grave).** A loja NPC aceita comprar a partir de 50% e vender até 100% — cada valor era válido sozinho, mas **compra a 50% + venda a 100% = lucro a cada ciclo**. Agora o servidor recusa salvar configuração em que o NPC pague mais do que cobra (`settingsConflict`). Testes novos varrem preços de 1 a 500 e provam que comprar e revender nunca dá lucro com a regra.
2. **Mercado como caixa de transferência.** Um personagem anunciava um item por 1.000.000 e o outro personagem da mesma conta comprava: o ouro passava de um para o outro por só 5% de taxa (lavagem de ouro entre alts, agravada pelo Premium dar até 4 personagens). Agora comprar de outro personagem da mesma conta é recusado.
3. **Sem forma de detectar divergência.** Se um bug futuro alterasse ouro sem passar pelo livro-razão, ninguém saberia. Criei a **conciliação**: `npm run economy:reconcile` (e `GET /api/admin/economy/reconcile`, para ADMIN) compara o ouro de cada personagem com o saldo da última linha do livro-razão e lista diferenças. Sugestão: rode diariamente junto com o backup.

## Decisões tomadas depois (a pedido)
- **Taxa mínima de 1 de ouro** no mercado (nunca acima do preço). Vendas baratas não escapam mais do ralo.
- **Recompensa de tarefa** agora segue os multiplicadores de XP e ouro (os mesmos dos monstros), para eventos de "XP em dobro" valerem em tudo. A tela mostra o valor já multiplicado.
- **Item melhorado vendido ao NPC:** o servidor recusa sem confirmação (409) e a tela pergunta, explicando que a melhoria se perde e que o Mercado paga mais. Quem confirma vende pelo preço-base.
- **Forja com risco** (nova): até +3 a melhoria é garantida; de +3→+4 a +9→+10 a chance de sucesso é 85, 75, 65, 55, 45, 35 e 25%. Se falha, o ouro já foi gasto e o item quebra com 50% de chance (some da mochila, registrado como "quebrou na forja"); senão resiste no mesmo nível. Os dois números (nível seguro e chance de quebrar) são configuráveis no painel (grupo Ferreiro). O sorteio é do servidor, com a mesma `Idempotency-Key` o mesmo resultado volta sem novo sorteio, e a tela mostra a chance antes de clicar. Itens que quebram saem de circulação (ralo de itens, bom contra inflação).
- **Conciliação de itens:** `npm run economy:reconcile` agora confere também a mochila × livro-razão de itens. Para os kits antigos, `npm run economy:opening` (simulação) e `npm run economy:opening -- --apply` (grava uma vez, com o servidor parado) lançam o saldo de abertura. Diferenças negativas nunca são "consertadas" — só listadas.

## Ainda decisão sua
- Itens já em +4 ou mais continuam como estão; só as próximas tentativas têm risco. Se quiser compensar jogadores atuais, vale avisar antes de publicar.
- Itens quebrados somem para sempre. Uma "Pedra de proteção" (comprada com ouro ou ganha em evento, nunca vendida por dinheiro real, para o Premium continuar só estético) seria o passo natural se a quebra frustrar demais.

**Não verificado:** os testes de integração novos (mesma conta, configuração perigosa, conciliação, forja com risco) e as rotas dependem de MySQL e não foram executados. Os testes unitários (taxa mínima, melhoria, sorteios, preços) passam: 11 de 11 em `economy.test.ts`.


## Decisão: Ferreiro com risco (2026-10-28)
- Tentativas até +3 são garantidas; de +3 a +6 podem falhar sem perder o item; a partir da tentativa de sair de `upgrade.breakFromTier` (padrão 6, ou seja, chegar ao +7) uma falha pode destruir o item (`upgrade.breakOnFailPercent`, padrão 50% das falhas).
- O sorteio é sempre no servidor (`randomInt`), o ouro é sempre gasto, a quebra grava `UPGRADE_BREAK` no extrato de itens e a conciliação a aceita.
- `npm run forge:simulate` mostra a probabilidade e o custo esperado até o +10.
- Pedra de Proteção (decisão do dono): item de loot raro, nunca vendido por dinheiro real; só é consumida quando evita uma quebra (`PROTECTION_USE`). Itens já em +4 ou mais seguem como estão.
- Itens raros (decisão do dono): rara é todo equipamento que chega ao +10. Recebe Nº por tipo (trava no tipo para não repetir), criador e história. O registro nunca é apagado; vendido ao NPC = "destruído". Nome do criador só aparece se `Character.fameHidden` for falso (vale retroativamente). Migração aditiva `202610280004_rare_items`.
