# Gaveta `core`

**Para que serve:** Base técnica sem regra de jogo: banco, erros, motor de combate puro, receitas idempotentes, configurações, senha, e-mail, monitoramento.

## Arquivos
- `db.ts` – Prisma, transação e travas (`lockCharacter`, `lockCharacterAny`, `lockAccount`)
- `engine.ts` – `GameError`, `integer`, resolução de turno do combate (função pura)
- `operations.ts` – `once()`: recibo idempotente por `Idempotency-Key`
- `settings.ts` – `loadSettings`/`saveSettings` (valores vêm de `shared/economy.ts`)
- `http.ts` – `asyncRoute`
- `password.ts` – scrypt
- `mailer.ts` – e-mail (console ou Resend)
- `monitor.ts` – request id, métricas, log JSON

## Rotas
Nenhuma (é a base).

## Dependências permitidas
Não depende de nenhuma outra gaveta. Nada aqui conhece conta, personagem ou premium.

## Regras que não podem quebrar
Qualquer mutação nova usa `lockCharacter` na mesma transação. `once()` roda depois da trava e dentro da transação.

## Testes
`npm test` (engine, password, monitor)

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/core/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta core (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```
