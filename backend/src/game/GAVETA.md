# Gaveta `game`

**Para que serve:** O jogo em si: personagens, combate, inventário, loja NPC, forja, tarefas, jornada, aventura.

## Arquivos
- `routes.ts` – ações (combate, equipar, loja, forja, templo, poções)
- `readRoutes.ts` – leituras e mercado (POST)
- `battleService.ts`, `combatStats.ts`, `gameRules.ts` – combate e fórmulas únicas
- `gameService.ts`, `inventoryService.ts` – atributos, templo, forja com risco, loja NPC, equipar
- `characterService.ts`, `characterRoutes.ts` – criar/trocar personagens e promover classe
- `adventureService.ts`, `adventureRoutes.ts`, `taskRoutes.ts` – jornada, conquistas, diário, tarefas
- `duelEngine.ts` (puro, com testes) e `duelService.ts` – Duelo entre amigos: desafio, rodadas com prazo, rendição, histórico, ranking de honra, varredura `expireDuels` (server.ts). Regras em `shared/pvp.ts`, números em `pvp.*`. Nunca altera vida, mana ou XP. Duelo valendo: aposta de ouro (DUEL_WAGER/PRIZE/REFUND/FEE), espólio com resgate (`DuelLoot`, DUEL_LOOT_*/DUEL_RANSOM*), honra tipo Elo e marcas (`CharacterCosmetic`). Teste: `backend/tests/duel-stakes-integration.ts`. Teste: `backend/tests/duel-integration.ts`; equilíbrio: `npm run duel:simulate`.
- `forgeService.ts` – Ferreiro além da melhoria: fabricar com materiais, reforjar para item de nível maior (guarda metade da melhoria), desmontar em materiais; `GET /characters/:id/forge` monta a tela

## Rotas
`/characters/*`, `/characters/:id/duel*`, `/duel/ranking`, `/monsters`, `/shop`, `/market`, `/characters/:id/{battles,equip,shop,sell,upgrade,use,temple,stats,journey,tasks}`.

## Dependências permitidas
Depende de `core`, `economy` e `premium` (só `isPremium`).

## Regras que não podem quebrar
Subida de nível só por `gainExperience` (`gameRules.ts`), que usa `shared/progression.ts` (teto `MAX_LEVEL`, ganhos por nível). Conteúdo novo de nível passa antes por `npm run levels:simulate`.
Ferreiro: regras em `shared/forge.ts` (material por faixa), preços e quantidades em `forge.*` e `shop.maxEquipmentLevel` (`loadSettings`). Raros (+10) não são reforjados nem desmontados. Teste: `backend/tests/forge-integration.ts`.
Itens e monstros ficam em `backend/prisma/catalog.ts` (o seed só grava). Monstro novo: entra no catálogo com XP/ouro da curva e `npm run levels:calibrate -- --write` define vida, ataque e defesa.
Classes: `shared/adventure.ts` (`classLevels`, `classNames`, `classBonus`, `classCost`); a 1ª é a promoção (muda a vocação), da 2ª à 8ª ficam em `Character.classTier`. `promoteCharacter` sobe uma por vez.
Fórmulas de atributos só em `combatStats.ts`. Vocações/regiões em `shared/adventure.ts`. Melhoria: sorteio no servidor, chance e quebra configuráveis, resultado repetível pela chave.

## Testes
`npm test` (adventure.test, economy.test) · `npm run test:integration`

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/game/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta game (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```

- **Ferreiro** (`gameService.upgrade`): regras em `shared/economy.ts` (`upgradeSuccessPercent`, `upgradeBreakPercent`, `resolveUpgrade`). Quebra só a partir de `upgrade.breakFromTier`. Teste/simulação: `economy.test.ts`, `npm run forge:simulate`.
