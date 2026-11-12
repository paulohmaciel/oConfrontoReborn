# Gaveta `confrontation`

**Para que serve:** O servidor do app **Confrontation** (Godot, idle de celular, repositório `C:\Users\phsil\Aplicativos\confrontation`): entrada por token, save na nuvem, validação do progresso idle e rankings. O combate idle roda no aparelho; aqui o servidor **guarda e confere**, nunca confia no número cru.

## Arquivos
- `syncRules.ts` – regras puras (com testes em `syncRules.test.ts`): ler o progresso de um save, tetos por hora (`capProgress`), corte do ouro (`withGoldCut`), semana ISO, métricas de ranking
- `appAuth.ts` – entrar, criar conta e sair pelo app; `appAuthenticate` (Bearer) e `appOptionalAuth`
- `cloudService.ts` – `putSave` (envio com tetos, conta travada por `lockAccount`), `loadSave`, `saveInfo`, `rankings`
- `appRoutes.ts` – rotas em `/api/app` (montadas em `server.ts` **antes** de `protectOrigin` e do limite de 16 KB)

## Rotas (`/api/app`)
| Rota | O quê |
|---|---|
| `POST /auth/login` `{email,password}` | Token (64 hex), validade e nome. Mesmas contas e senhas do site. |
| `POST /auth/register` `{email,password,name}` | Cria conta e primeiro personagem como o site (201 + token). E-mail já usado: 202 sem token (não revela a conta). |
| `POST /auth/logout` | Apaga o token. |
| `GET /me` | Nome e resumo do save na nuvem (versão, data, números verificados). |
| `GET /save` / `PUT /save` `{baseVersion,data,summary:{power},force?}` | Baixa / envia o save. Versão diferente da nuvem = 409 (outro aparelho), a menos que `force`. |
| `GET /rankings?metric=vigil\|power\|stage&period=all\|week&page=N` | 10 por página, com a posição de quem pediu (token opcional). |

Todas sem cookie, sem `Origin` e sem `X-Game-Client`: o token vai em `Authorization: Bearer …`, e um site estranho não consegue mandá-lo sozinho (sem CSRF). Corpo até 512 KB; save até 450.000 caracteres.

## Como a validação funciona
- O token é uma linha da tabela `Session` (a mesma do cookie): redefinir a senha e o banimento derrubam o app também. Validade `confrontation.sessionDays`, renovada com o uso.
- Cada conta tem um **registro verificado** (`ConfrontationSave`: ouro total, XP total, itens, fase mais longe, Vigília, poder). Um envio só pode crescer cada número até `teto por hora × horas desde o último envio aceito`, pelo **relógio do servidor**. O primeiro envio vale `confrontation.firstSyncHours` (progresso feito antes da conta).
- Ouro e XP têm teto que cresce com a fase (`confrontation.stageGrowthPercent`), porque as fases novas pagam mais. A Vigília só conta depois de `confrontation.maxStage`.
- Passou do teto: entra o teto, o envio fica registrado em `ConfrontationSync` (o que o app disse, o que entrou, o que foi cortado). **O ouro cortado sai do save** (ouro em mãos e `counters.gold`) e a resposta devolve o save corrigido para o app usar; O ouro em mãos também nunca passa do total ganho na vida que o servidor aceitou (no jogo todo ouro entra pelo total; mais que isso só num save editado). XP, itens, fase, Vigília e poder ficam no save como estavam, mas o registro e o ranking só têm o valor verificado (o resto entra aos poucos, no ritmo do teto).
- Rankings (`ConfrontationRank`): o melhor valor verificado de cada conta, geral (`all`) e por semana ISO em UTC. Empate: quem chegou antes fica na frente.
- Dois envios ao mesmo tempo: a conta é travada; o segundo vê a versão nova e recebe conflito.

## Fora desta gaveta (decisões que ficam para depois)
- **O ouro do app não entra no ouro dos personagens do site.** Nada muda de dono entre os dois jogos nesta fase, por isso não há lançamento em `addGold`/`recordGold`. Juntar as moedas (plano de união, "Moeda: uma só") precisa de uma taxa de conversão decidida pelo dono, e aí entra uma razão nova no extrato.
- Os tetos padrão são generosos (cerca de 5× o que o jogo paga) e **não foram medidos** com simulação do app. Ajuste no painel da Equipe, grupo "Confrontation (app)".
- Lutas de ranking calculadas no servidor (arena, Vigília) ficam para a próxima etapa (`design/ideias-melhorias.md` do app, item 0c).

## Dependências permitidas
Depende de `core`, `economy` (só regras de `shared/economy.ts`), `game` (criar o primeiro personagem) e `account` (`digest`, `activeBan`, `validPassword`, `sendVerification`). Fica entre `account` e `admin`.

## Regras que não podem quebrar
Resposta uniforme no login e no cadastro (sem enumerar e-mails). Tetos só de `loadSettings`. Todo envio dentro de uma transação com `lockAccount`. Migração aditiva (`202611120001_confrontation_cloud`).

## Testes
`npm test` (`syncRules.test.ts`) e `npm run test:integration` (`backend/tests/confrontation-integration.ts`, base `_test`).

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/confrontation/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta confrontation (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e backend/tests/confrontation-integration.ts (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```
