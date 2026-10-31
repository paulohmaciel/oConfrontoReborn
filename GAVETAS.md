# Mapa de gavetas

O projeto é dividido em gavetas: cada pasta tem uma função, regras próprias e um `GAVETA.md` com um modelo de prompt de manutenção. Para pedir uma mudança, **abra só a gaveta do assunto** — isso deixa o pedido curto, o risco pequeno e a revisão fácil.

## Qual gaveta mexer?
| Quero mudar… | Gaveta (servidor) | Gaveta (tela) |
|---|---|---|
| combate, atributos, loja NPC, forja, tarefas, jornada, classes | `backend/src/game` | `features/adventure`, `hero`, `inventory`, `shop`, `forge`, `tasks`, `characters` |
| ouro, itens, taxas, mercado, extrato, conciliação | `backend/src/economy` | `features/market`, `ledger` |
| Premium e pagamentos | `backend/src/premium` | `features/premium` |
| cadastro, login, senha, e-mail, banimento | `backend/src/account` | `features/auth` |
| painel da equipe, punições, suporte | `backend/src/admin` | `features/admin`, `support` |
| banco, erros, e-mail, monitoramento | `backend/src/core` | — |
| regras usadas pelos dois lados | `shared/` | — |
| tabelas do banco | `backend/prisma/` (migração aditiva) | — |

## Ordem das dependências (verificada por `npm run check:drawers`)
Servidor, de baixo para cima: `core` → `economy` → `premium` → `game` → `account` → `admin` → `server.ts`. Uma gaveta só importa as de baixo. Tela: `lib` → `ui` → `features/*` → `App.tsx`.

## Como pedir uma manutenção (modelo geral)
```
Leia GAVETAS.md e a GAVETA.md da gaveta <nome>.
Tarefa: <uma frase>.
Escopo: só essa gaveta (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas ou funções públicas.
Use uma branch. Mostre o plano e espere eu aprovar antes de editar. Se mexer no banco, a migração é aditiva e eu a reviso antes de rodar.
Depois rode npm run check, npm test, npm run check:drawers (e npm run build se mexeu na tela).
Entregue: o que mudou, o que não conseguiu verificar, e uma lista separada de bugs fora do escopo (sem corrigir).
```

## Regras que valem para todas as gavetas
Ver `AGENTS.md`. Resumo: toda mutação com lock do personagem; ouro e itens só por `addGold`/`addItem`; preços e taxas só de `loadSettings`; Premium nunca muda o jogo; migrações aditivas; nada de dependência nova sem atualizar o `package-lock.json`.

## Antes de refatorar qualquer coisa
Rode `npm run check`, `npm test` e `npm run test:integration` (base `_test`) e guarde o resultado. Refatorar sem esse "antes" é refatorar às cegas.
