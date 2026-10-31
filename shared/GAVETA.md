# Gaveta `shared`
**Para que serve:** regras puras usadas pelo servidor E pela tela, para nunca divergirem. Sem banco, sem Express, sem React.

- `economy.ts` – motivos de ouro/item (fonte/ralo/transferência), configurações com limites, taxas, preços NPC, regras de melhoria (`upgradeSuccessPercent`, `resolveUpgrade`), `settingsConflict`.
- `adventure.ts` – vocações, regiões, jornada, promoção de classe.
- `progression.ts` – teto de nível (`MAX_LEVEL`), ganhos por nível, curva de XP do personagem (`expForLevel`) e curva-alvo de XP dos monstros. Ver `PLANO-NIVEIS.md`.
- `premium.ts` – benefícios, molduras, títulos, `layoutPeriods`.
- `permissions.ts` – cargos e permissões.

**Regras:** não importa `backend/` nem `frontend/` (verificado por `npm run check:drawers`). Valores em ouro são inteiros/BigInt. Mudou uma regra aqui? Rode `npm test` e os testes de integração.
