# Sprites e licença — situação e decisão

## O que foi verificado
- `npm run assets:audit` lista os **30 sprites** usados, todos baixados do TibiaWiki BR (arte do Tibia, propriedade da CipSoft GmbH).
- 27 têm o arquivo público verificado; 3 não: **Rat, Magic Plate Armor, Bow**. Além disso, o *Bow* aponta para a página `Guardcatcher.gif`, o que parece ser o arquivo errado — confira se é mesmo um arco.

## O que NÃO consegui confirmar
Não encontrei um texto oficial da CipSoft (nem a página de copyright do TibiaWiki BR, que não abriu) dizendo que terceiros podem usar essas imagens. Só achei opiniões em fóruns de servidores privados, que **não são licença**. Portanto não há base para afirmar que o uso é permitido, nem que é proibido. Fansites costumam ter tolerância informal da CipSoft, mas isso é revogável e **não cobre jogo com cobrança**. Quem decide é a CipSoft (ou um advogado de PI).

## Recomendação
| Fase | Uso dos sprites |
|---|---|
| Beta fechado, grátis, sem Premium ativo | Risco baixo, mantendo o crédito já exibido ("Imagens © CipSoft GmbH") e sem usar o nome Tibia como marca do jogo |
| Qualquer cobrança (Premium) | Só com **permissão escrita da CipSoft**, ou depois de trocar os sprites por arte própria/licenciada |

Caminhos, do mais seguro ao menos: (1) arte original ou pack licenciado (OpenGameArt CC0, Kenney, ou encomenda); (2) pedir licença à CipSoft; (3) manter tudo gratuito. A troca é simples: o jogo lê tudo de `frontend/public/assets/tibia/manifest.json`, então basta substituir os arquivos e o manifesto.

Itens e criaturas com nomes do Tibia (Rotworm, Demon…) também são marca/obra da CipSoft; para venda, considere renomear.

**Sugestão prática:** deixe `premium.priceCents = 0` (Premium indisponível) até resolver isso.

## Sprites novos (Antigos Sprites do TibiaWiki BR)
- `scripts/sprites-novos.json` lista ~260 sprites da página "Antigos Sprites". O `iniciar.bat` roda `scripts/import-icons.mjs --verified-sources scripts/sprites-novos.json` e baixa os arquivos para `frontend/public/assets/tibia/` (registrados no `manifest.json`). Mesma regra: arte da CipSoft, `premium.priceCents=0` até haver licença.
- Ícones aceitam fallback `"Novo|Antigo"` (ex.: `Dragon Lord|Dragon`): usam o novo se já foi importado.
