# Sprites próprios de O Confronto

Arte original do jogo, criada pelo dono com geração de imagens do ChatGPT em 2026-11-12. Não vem do TibiaWiki nem de nenhum outro jogo.

| Arquivo | O que é | Onde aparece |
|---|---|---|
| `cavaleiro.png` | Cavaleiro, herói da vocação Cavaleiro | Arena de batalha (caçada, Duelo e Caçada em grupo) |
| `lobo-das-cinzas.png` | Lobo das Cinzas, criatura | Arena de batalha, no lugar do sprite do Wolf |

## Formato das folhas
- 1024 × 1536 px, fundo transparente, 4 colunas × 6 linhas, quadros de 256 × 256 px, personagem virado para a direita.
- Linhas: 1 parado, 2 avançar, 3 atacar, 4 defender, 5 curar, 6 apanhar (2 quadros) e cair (2 quadros).
- Para ligar uma folha nova: registre o caminho em `heroSheets` ou `monsterSheets`, em `frontend/src/ui/BattleStage.tsx`.
