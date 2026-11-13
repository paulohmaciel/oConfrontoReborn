# Sprites TibiaWiki

O diretório `frontend/public/assets/tibia` contém 30 sprites GIF reais do catálogo atual, baixados do TibiaWiki BR e verificados por HTTP 200, MIME e assinatura do formato. O manifesto associa `name` ao `path` local e registra origem, hash SHA-256, data e tamanho. O jogo pode servir esses arquivos sem depender de hotlink ou da API em cada tela.

Itens e monstros incluídos: Rat, Rotworm, Cyclops, Dragon, Dragon Lord, Demon, Demon Helmet, Magic Plate Armor, Golden Legs, Boots of Haste, Mastermind Shield, Magic Longsword, Fire Sword, Platinum Amulet, Ring of the Sky, Backpack, Gold Coin, Health Potion, Mana Potion, Sword, Wooden Shield, Leather Armor e Leather Helmet.

## Importador

Node 20+; nenhuma dependência adicional. O diretório de saída padrão é `frontend/public/assets/tibia`.

```text
node scripts/import-icons.mjs
node scripts/import-icons.mjs --refresh
node scripts/import-icons.mjs --all --limit 100
```

`--out CAMINHO` altera a pasta de saída. O primeiro comando verifica e reutiliza o cache completo; `--refresh` solicita metadados e imagens novas. O modo `--all` enumera o catálogo raster do wiki por `allimages`, em lotes de até 100 arquivos por execução por padrão (máximo configurável: 1000), com retomada em `import-state.json`. Executá-lo novamente continua de onde parou. Não baixa todos os arquivos sem limite em uma única execução e não altera os dados do jogo automaticamente. Fotografias ou mapas grandes acima de 2 MiB são ignorados; SVG não é baixado. Concorrência máxima de 2, timeout de 20 segundos, cache validado por SHA-256 e limite de 64 MiB de imagens salvas por execução.

O manifesto grava `status: unavailable` e motivo quando um arquivo falha. A interface deve usar fallback local para esse estado. O importador não transforma arquivos ausentes em URLs inventadas nem executa conteúdo baixado.

## Ícones dos locais de caça (arte própria)

Os 16 ícones em `frontend/public/assets/regions/*.svg` foram desenhados para o projeto (não vêm do TibiaWiki), a pedido do dono. São gerados por `node scripts/region-icons.mjs`; para ajustar um desenho, edite o script e rode de novo. Se um ícone não carregar, a tela usa o sprite do TibiaWiki da região como reserva.

## Ícones dos itens (arte própria animada, 2026-11-12)

Os itens estão trocando o sprite do TibiaWiki por arte própria: um GIF animado de 128 × 128 px por item (24 quadros, 80 ms cada) em `frontend/public/assets/items/`, feito a partir da folha-mestre PNG de 1024 × 1536 px descrita em `art-items.md`.

- **Nome do arquivo** = nome do item no catálogo, em minúsculas, sem acento e com hífen: `Sword` → `sword.gif`, `Crossbow da 1ª Era` → `crossbow-da-1-era.gif`, `Pedra de Proteção` → `pedra-de-protecao.gif`. É a mesma regra dos nomes de `art-items.md` (conferida nos 190 itens).
- **Ligação**: `npm run art` (o `npm run build` roda antes) executa `scripts/item-art.mjs`, que lista os GIFs da pasta em `frontend/src/lib/itemArt.json`. Basta salvar o GIF com o nome certo e rodar o build; nada mais é registrado à mão. GIF com nome fora do formato (maiúscula, espaço, acento) fica de fora e o script avisa.
- **Na tela**: `ui/GameIcon.tsx` (com `lib/itemArt.ts`) usa o GIF de quem está na lista. Uma variante de Era ou de Capriel sem figura usa a do item-base. Quem não tem nenhuma continua com o sprite do TibiaWiki, e o ícone também volta para ele se o GIF não carregar.
- **Tamanho na tela**: o desenho ocupa o meio do quadro, com margem vazia; o ícone é aproximado 1,28× e a margem é cortada (`styles/operations.css`, `.own-art`), para o desenho ficar do tamanho dos sprites antigos sem mudar o tamanho do ícone. Se uma folha nova desenhar fora da área medida (x 17–108, y 24–118 de 128), a ponta é cortada: mantenha a peça centrada como em `art-items.md`.
- **Animações desligadas** (Configurações): o GIF fica parado no primeiro quadro, que é o ícone estático do item.
- **Peso**: medido em 110 GIFs, cada um tem de 41 a 156 KB (metade deles acima de 123 KB); o sprite antigo tem de 0,1 a 31 KB (metade abaixo de 1,3 KB). Os ícones de uma lista só são baixados quando chegam perto da tela. As folhas-mestre PNG (cerca de 0,7 MB cada) não são usadas pelo jogo; hoje ficam na mesma pasta e vão junto para o `dist`.

## Materiais do Ferreiro (2026-10-31)

Importados com `node scripts/import-icons.mjs --verified-sources scripts/sprites-materiais.json`: Iron Ore, Small Ruby, Small Sapphire, Small Emerald, Small Diamond, Gold Ingot, Soul Orb, Demonic Essence (usados), além de Small Amethyst e Small Topaz (reserva). Draconian Steel e Hell Steel não responderam com imagem nesse nome de arquivo e ficaram como `unavailable` no manifesto; nada foi contornado.

## Origem e verificação

A API pública `https://www.tibiawiki.com.br/api.php` respondeu HTTP 403 com desafio Cloudflare em 28/10/2026. Não foi contornado. O catálogo inicial pôde ser obtido dos arquivos de imagem públicos do próprio domínio. Rat e Magic Plate Armor tiveram URLs confirmadas pelos links das páginas de arquivo; os demais nomes foram resolvidos pelo esquema de arquivos MediaWiki e aceitos apenas após validar a resposta de imagem. Isso está distinguido em `sourceMethod`: `wiki-file-page` ou `public-file-verified`. Futuras consultas à API registram `mediawiki-api` e seus metadados quando acessíveis.

Uma correção importante em relação ao seed original: Magic Plate Armor usa `https://www.tibiawiki.com.br/images/3/31/Magic_Plate_Armor.gif`, não o caminho `/6/63/` fornecido antes.

Fontes consultadas:

- Rat: https://tibiawiki.com.br/index.php?stable=1&title=Arquivo:Rat.gif
- Magic Plate Armor: https://www.tibiawiki.com.br/wiki/Arquivo:Magic_Plate_Armor.gif
- Créditos: https://www.tibiawiki.com.br/wiki/MediaWiki:Copyright

O aviso de copyright do wiki atribui as imagens à CipSoft GmbH; não foi encontrada uma licença livre para redistribuição geral. Preserve o crédito “Sprites do Tibia © CipSoft GmbH. Fonte: TibiaWiki BR” e os links de origem. O download não transfere os direitos sobre os sprites.

Verificação executada: 23 downloads válidos, 0 falhas; três testes do importador aprovados (host/HTTPS, nomes de arquivo e rejeição de HTML disfarçado de imagem). O modo `--all` foi implementado, mas não executado, pois a API estava bloqueada.

## Catálogo 0.4

Adicionados Bow, Wand of Vortex, Snakebite Rod, Wolf, Orc, Minotaur e Ghoul. Todos os sete arquivos foram verificados por assinatura GIF, tamanho e SHA-256. A página Arquivo:Bow.gif redireciona para Guardcatcher.gif no wiki; o manifesto preserva Bow como nome usado pelo jogo e registra o arquivo canônico e seu alias. O Guardião da Pedreira é conteúdo desta adaptação e reutiliza o sprite Cyclops já verificado. Os créditos e limites de uso permanecem os mesmos.
