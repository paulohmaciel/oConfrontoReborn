# Gaveta `economy`

**Para que serve:** Ouro e itens que mudam de dono: livro-razão, mercado entre jogadores, extrato, conciliação.

## Arquivos
- `economy.ts` – `addGold`, `recordGold`, `addItem`, `recordItem` (única porta para mexer em ouro/itens)
- `marketService.ts` – anunciar, comprar, cancelar, expirar (taxa mínima 1, sem comprar de si/da mesma conta)
- `economyRoutes.ts` – `/config`, extrato, histórico e vendas do mercado
- `rare.ts` – itens raros (equipamento que chega ao +10): número por tipo, história, status "destruído", dados públicos respeitando anonimato
- `reconcile.ts` – ouro e itens × livro-razão

## Rotas
`GET /config`, `GET /rare-items[?blueprintId]`, `GET /rare-items/:id`, `GET /characters/:id/ledger`, `GET /characters/:id/market/history`, `GET /market/sales`. Mercado (POST) fica em `game/readRoutes.ts`.

## Dependências permitidas
Depende só de `core`.

## Regras que não podem quebrar
Todo ouro/item passa por `addGold`/`addItem` na mesma transação, depois de `lockCharacter`. Preços e taxas vêm de `loadSettings`. Saldo negativo desfaz tudo. Compra e venda NPC nunca dão lucro (`settingsConflict`). Só loot e consumíveis empilham; munição (flechas, virotes, runas de foco) é equipamento permanente e não empilha.

## Testes
`npm test` (economy.test) · `npm run test:integration` · `npm run economy:reconcile`

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/economy/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta economy (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```

**Raros:** o registro `RareItem` nunca é apagado. `InventoryItem.rareItemId` e `MarketListing.rareItemId` carregam o item pelo mercado (anunciar/comprar/cancelar/expirar usam `addItem(..., rareItemId)`). Venda ao NPC chama `retireRare`.
