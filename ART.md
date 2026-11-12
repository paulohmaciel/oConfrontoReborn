# Arte própria de O Confronto

> Arquivo gerado por `npm run art` a partir de `scripts/art.mjs`. Para mudar um comando, edite a lista naquele arquivo e rode de novo.

A arena de batalha está trocando os sprites do TibiaWiki por arte própria. Cada personagem vem numa folha só, sempre no mesmo formato. Hoje **2 de 59** folhas estão prontas.

## Como usar
1. Copie o comando inteiro do personagem e cole no ChatGPT (gere um personagem por vez).
2. Salve o PNG em `frontend/public/assets/sprites/` com o nome indicado no título do comando.
3. Rode `npm run build` (ou o `iniciar.bat`). O jogo passa a usar a folha sozinho; quem ainda não tem folha continua com o sprite antigo.

## Formato de toda folha
- 1024 × 1536 px, fundo transparente, 4 colunas × 6 linhas, quadros de 256 × 256 px, personagem virado para a direita.
- Linhas: 1 parado, 2 avançar, 3 atacar, 4 defender, 5 curar (heróis) ou gesto especial (criaturas), 6 apanhar (2 quadros) e cair (2 quadros).

## Se o GPT errar
- Grade torta: "refaça mantendo o personagem, mas alinhe a grade em 4 × 6 com quadros de 256 px".
- Fundo branco, xadrez ou com contorno colorido: "fundo transparente de verdade, limpo, sem halo".
- Efeito de magia cortado em quadrado: "refaça só a linha N, com o brilho solto em volta do corpo, sem caixa nem fundo".
- Confira sempre a linha 6 (apanhar e cair): é a que mais sai errada.

## Situação
| Arquivo | Personagem | Tipo | Situação | Usado por |
|---|---|---|---|---|
| `cavaleiro.png` | Cavaleiro | Herói | feito | vocação Cavaleiro |
| `arqueiro.png` | Arqueiro | Herói | falta | vocação Arqueiro |
| `feiticeiro.png` | Feiticeiro | Herói | falta | vocação Feiticeiro |
| `druida.png` | Druida | Herói | falta | vocação Druida |
| `rato-do-celeiro.png` | Rato do Celeiro | Criatura | falta | Rat (nv. 1) |
| `besouro-de-casca.png` | Besouro de Casca | Criatura | falta | Bug (nv. 2) |
| `lobo-das-cinzas.png` | Lobo das Cinzas | Criatura | feito | Wolf (nv. 3) |
| `ciclope-da-pedreira.png` | Ciclope da Pedreira | Criatura | falta | Guardião da Pedreira (nv. 4), Cyclops (nv. 12), Cyclops da 1ª Era (nv. 255) |
| `vibora-do-capim.png` | Víbora do Capim | Criatura | falta | Snake (nv. 4) |
| `verme-da-terra.png` | Verme da Terra | Criatura | falta | Rotworm (nv. 5) |
| `orc-saqueador.png` | Orc Saqueador | Criatura | falta | Orc (nv. 5) |
| `anao-minerador.png` | Anão Minerador | Criatura | falta | Dwarf (nv. 7) |
| `esqueleto-errante.png` | Esqueleto Errante | Criatura | falta | Skeleton (nv. 7) |
| `minotauro.png` | Minotauro | Criatura | falta | Minotaur (nv. 8) |
| `carnical.png` | Carniçal | Criatura | falta | Ghoul (nv. 10) |
| `anao-soldado.png` | Anão Soldado | Criatura | falta | Dwarf Soldier (nv. 11) |
| `anao-guardiao.png` | Anão Guardião | Criatura | falta | Dwarf Guard (nv. 15) |
| `orc-lanceiro.png` | Orc Lanceiro | Criatura | falta | Orc Spearman (nv. 15) |
| `mumia.png` | Múmia | Criatura | falta | Mummy (nv. 16), Mummy da 1ª Era (nv. 339) |
| `orc-guerreiro.png` | Orc Guerreiro | Criatura | falta | Orc Warrior (nv. 18) |
| `golem-de-pedra.png` | Golem de Pedra | Criatura | falta | Stone Golem (nv. 19), Golem Ancestral (nv. 198), Stone Golem da 1ª Era (nv. 311), Stone Golem da 4ª Era (nv. 747) |
| `vigia-de-ossos.png` | Vigia de Ossos | Criatura | falta | Bonelord (nv. 21), Bonelord da 1ª Era (nv. 325) |
| `orc-xama.png` | Orc Xamã | Criatura | falta | Orc Shaman (nv. 22), Orc Shaman da 4ª Era (nv. 705) |
| `dragao-das-ruinas.png` | Dragão das Ruínas | Criatura | falta | Dragon (nv. 25), Dragon da 1ª Era (nv. 381) |
| `amazona.png` | Amazona | Criatura | falta | Amazon (nv. 26), Amazon da 4ª Era (nv. 719) |
| `orc-furioso.png` | Orc Furioso | Criatura | falta | Orc Berserker (nv. 29), Orc Berserker da 1ª Era (nv. 269) |
| `minotauro-arqueiro.png` | Minotauro Arqueiro | Criatura | falta | Minotaur Archer (nv. 31), Minotaur Archer da 4ª Era (nv. 733) |
| `valquiria.png` | Valquíria | Criatura | falta | Valkyrie (nv. 33), Valkyrie da 1ª Era (nv. 283) |
| `minotauro-mago.png` | Minotauro Mago | Criatura | falta | Minotaur Mage (nv. 35), Minotaur Mage da 3ª Era (nv. 611) |
| `lider-orc.png` | Líder Orc | Chefe | falta | Orc Leader (nv. 36) |
| `senhor-dos-dragoes.png` | Senhor dos Dragões | Chefe | falta | Dragon Lord (nv. 40), Dragão Ancião (nv. 236), Dragon Lord da 4ª Era (nv. 831), Senhor dos Dragões da 4ª Era (nv. 850), Dragon Lord de Capriel (nv. 967) |
| `minotauro-guarda.png` | Minotauro Guarda | Criatura | falta | Minotaur Guard (nv. 41), Minotaur Guard da 1ª Era (nv. 297) |
| `esqueleto-demoniaco.png` | Esqueleto Demoníaco | Criatura | falta | Demon Skeleton (nv. 46), Demon Skeleton da 1ª Era (nv. 353) |
| `diabrete-de-fogo.png` | Diabrete de Fogo | Criatura | falta | Fire Devil (nv. 51), Fire Devil da 1ª Era (nv. 367), Fire Devil de Capriel (nv. 939) |
| `elemental-de-fogo.png` | Elemental de Fogo | Criatura | falta | Fire Elemental (nv. 56), Elemental de Fogo Ancestral (nv. 185), Fire Elemental da 3ª Era (nv. 681), Fire Elemental da 4ª Era (nv. 803) |
| `demonio-do-abismo.png` | Demônio do Abismo | Chefe | falta | Demon (nv. 60), Demon da 1ª Era (nv. 400), Demon da 4ª Era (nv. 817), Demon de Capriel (nv. 981) |
| `troll-do-gelo.png` | Troll do Gelo | Criatura | falta | Frost Troll (nv. 60), Frost Troll da 2ª Era (nv. 405) |
| `lobo-do-inverno.png` | Lobo do Inverno | Criatura | falta | Winter Wolf (nv. 64), Winter Wolf da 2ª Era (nv. 419) |
| `urso-polar.png` | Urso Polar | Criatura | falta | Polar Bear (nv. 69), Polar Bear da 2ª Era (nv. 433) |
| `mamute.png` | Mamute | Criatura | falta | Mammoth (nv. 75), Mammoth da 2ª Era (nv. 447) |
| `troll-do-pantano.png` | Troll do Pântano | Criatura | falta | Swamp Troll (nv. 80), Swamp Troll da 2ª Era (nv. 461) |
| `jacare-matador.png` | Jacaré Matador | Criatura | falta | Killer Caiman (nv. 85), Killer Caiman da 2ª Era (nv. 475) |
| `bruxa-do-pantano.png` | Bruxa do Pântano | Criatura | falta | Witch (nv. 90), Witch da 2ª Era (nv. 489) |
| `aranha-gigante.png` | Aranha Gigante | Chefe | falta | Giant Spider (nv. 100), Giant Spider da 4ª Era (nv. 789), Giant Spider de Capriel (nv. 953) |
| `necromante.png` | Necromante | Criatura | falta | Necromancer (nv. 100), Necromancer da 2ª Era (nv. 517), Necromancer da 4ª Era (nv. 761) |
| `viuva-lamentosa.png` | Viúva Lamentosa | Criatura | falta | Wailing Widow (nv. 108), Wailing Widow da 2ª Era (nv. 503), Wailing Widow de Capriel (nv. 883) |
| `cavaleiro-negro.png` | Cavaleiro Negro | Criatura | falta | Black Knight (nv. 116), Black Knight da 2ª Era (nv. 531), Black Knight da 4ª Era (nv. 775), Black Knight de Capriel (nv. 897) |
| `bruxo-da-cripta.png` | Bruxo da Cripta | Chefe | falta | Warlock (nv. 125), Warlock da 3ª Era (nv. 639), Warlock de Capriel (nv. 925) |
| `assassino.png` | Assassino | Criatura | falta | Assassin (nv. 126), Assassin da 3ª Era (nv. 555) |
| `elfo-batedor.png` | Elfo Batedor | Criatura | falta | Elf Scout (nv. 133), Elf Scout da 3ª Era (nv. 569) |
| `elfo-arcanista.png` | Elfo Arcanista | Criatura | falta | Elf Arcanist (nv. 141), Elf Arcanist da 3ª Era (nv. 583), Elf Arcanist de Capriel (nv. 855) |
| `monge-renegado.png` | Monge Renegado | Criatura | falta | Monk (nv. 149), Monk da 3ª Era (nv. 597) |
| `heroi-caido.png` | Herói Caído | Chefe | falta | Hero (nv. 158), Hero da 3ª Era (nv. 625), Hero de Capriel (nv. 911) |
| `elemental-de-agua.png` | Elemental de Água | Criatura | falta | Water Elemental (nv. 162), Water Elemental da 3ª Era (nv. 653) |
| `serpente-marinha.png` | Serpente Marinha | Criatura | falta | Young Sea Serpent (nv. 172), Serpente Abissal (nv. 222), Young Sea Serpent da 3ª Era (nv. 667), Young Sea Serpent de Capriel (nv. 869) |
| `gosma-primordial.png` | Gosma Primordial | Criatura | falta | Gosma Primordial (nv. 210) |
| `infernatil.png` | Infernatil | Chefe | falta | Infernatil (nv. 250), Infernatil da 3ª Era (nv. 700) |
| `verminor.png` | Verminor | Chefe | falta | Verminor (nv. 550) |
| `apocalypse.png` | Apocalypse | Chefe | falta | Apocalypse (nv. 1000) |

## Heróis

### Cavaleiro · `cavaleiro.png` · feito

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: um cavaleiro original, de armadura de aço escuro com detalhes em latão, capa vinho curta, espada longa na mão direita e escudo redondo na esquerda. Rosto visível, cabelo castanho, sem elmo fechado. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- O personagem olha para a DIREITA em todos os quadros.
- Mesmo tamanho de personagem em todos os quadros, ocupando cerca de 70% da altura do quadro, com os pés na mesma linha de base e centralizado na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parado, respirando (leve balanço do corpo).
  Linha 2: correndo para a direita.
  Linha 3: ataque com a espada (preparar, golpear, impacto, recolher).
  Linha 4: defesa (ergue o escudo à frente e segura).
  Linha 5: cura (ergue a mão, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose).
  Linha 6: dois quadros levando um golpe e sendo empurrado para trás, depois dois quadros caindo e deitado no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (aço, latão, vinho), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. O mesmo personagem, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Arqueiro · `arqueiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: um arqueiro original, ágil, de couro verde-musgo e marrom, capuz baixado nas costas, braçadeira de couro, arco longo de madeira clara na mão e aljava de flechas nas costas. Rosto visível, cabelo ruivo curto. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- O personagem olha para a DIREITA em todos os quadros.
- Mesmo tamanho de personagem em todos os quadros, ocupando cerca de 70% da altura do quadro, com os pés na mesma linha de base e centralizado na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parado, respirando (leve balanço do corpo).
  Linha 2: correndo para a direita.
  Linha 3: tiro com o arco (puxar a flecha da aljava, retesar o arco, soltar a flecha, baixar o arco).
  Linha 4: defesa (recua meio passo, cruza o arco à frente do corpo e se abaixa).
  Linha 5: cura (leva a mão ao peito, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose).
  Linha 6: dois quadros levando um golpe e sendo empurrado para trás, depois dois quadros caindo e deitado no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-musgo, couro marrom, madeira clara), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. O mesmo personagem, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Feiticeiro · `feiticeiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: um feiticeiro original, de manto longo azul-noite com bordas roxas e runas douradas, chapéu de aba larga caído para trás, cajado de madeira escura com uma brasa laranja flutuando na ponta. Rosto visível, barba curta grisalha. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- O personagem olha para a DIREITA em todos os quadros.
- Mesmo tamanho de personagem em todos os quadros, ocupando cerca de 70% da altura do quadro, com os pés na mesma linha de base e centralizado na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parado, respirando (leve balanço do corpo).
  Linha 2: correndo para a direita.
  Linha 3: magia de fogo (ergue o cajado, a brasa cresce, lança uma bola de fogo para a direita, recolhe o cajado).
  Linha 4: defesa (finca o cajado no chão e ergue um escudo mágico azul translúcido à frente).
  Linha 5: cura (ergue a mão livre, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose).
  Linha 6: dois quadros levando um golpe e sendo empurrado para trás, depois dois quadros caindo e deitado no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (azul-noite, roxo, dourado, laranja de brasa), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. O mesmo personagem, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Druida · `druida.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma druida original: mulher negra, de pele marrom-escura, com dreadlocks longos até a cintura, enfeitados com contas de madeira e anéis dourados, e algumas mechas presas no alto. Veste túnica verde-floresta com manto ocre, colar de sementes e pulseiras de cobre, descalça ou de sandálias de couro. Empunha um cajado de madeira viva, com folhas e uma trepadeira enrolada. Rosto visível, expressão serena e firme. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- O personagem olha para a DIREITA em todos os quadros.
- Mesmo tamanho de personagem em todos os quadros, ocupando cerca de 70% da altura do quadro, com os pés na mesma linha de base e centralizado na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parado, respirando (leve balanço do corpo).
  Linha 2: correndo para a direita.
  Linha 3: magia da natureza (ergue o cajado, espinhos e folhas giram na ponta, lança uma rajada de espinhos para a direita, recolhe o cajado).
  Linha 4: defesa (finca o cajado e raízes sobem do chão formando uma barreira baixa à frente).
  Linha 5: cura (ergue as duas mãos, os dreadlocks se movem com o vento, brilho verde forte e solto ao redor do corpo com folhas subindo, sem caixa nem fundo, e volta à pose).
  Linha 6: dois quadros levando um golpe e sendo empurrado para trás, depois dois quadros caindo e deitado no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-floresta, ocre, cobre, marrom-escuro da pele, madeira), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. O mesmo personagem, com as mesmas cores e proporções, em todos os 24 quadros.
```

## Criaturas

Os nomes novos são da arte. As criaturas das Eras e de Capriel usam a mesma folha da criatura original.

### Rato do Celeiro · `rato-do-celeiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Rato do Celeiro: um rato grande e magro, de pelo marrom sujo, dentes amarelos à mostra e rabo comprido sem pelos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: mordida (agachar, saltar, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: guincho ameaçador, de pé nas patas traseiras, depois volta à pose.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (marrom, bege, rosa do rabo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Besouro de Casca · `besouro-de-casca.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Besouro de Casca: um besouro do tamanho de um cão, de carapaça verde-escura brilhante, mandíbulas grandes e seis patas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: pinçada com as mandíbulas (recuar, avançar, pinçar, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre a carapaça e bate as asas zumbindo, depois fecha.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-escuro, preto, amarelo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Lobo das Cinzas · `lobo-das-cinzas.png` · feito

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Lobo das Cinzas: um lobo grande de pelo cinza-carvão, com brasas alaranjadas acesas ao longo do dorso e olhos âmbar. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: mordida (agachar, saltar, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: uivo com as brasas do dorso acendendo mais forte, depois volta à pose.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (cinza-carvão, laranja de brasa, âmbar), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Ciclope da Pedreira · `ciclope-da-pedreira.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Ciclope da Pedreira: um gigante de um olho só, pele cinza-azulada, tanga de couro, braceletes de ferro e uma clava de pedra bruta. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de clava de cima para baixo (erguer, descer, impacto no chão, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: urro com o olho brilhando, batendo a clava na palma da mão.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (cinza-azulado, couro, ferro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Víbora do Capim · `vibora-do-capim.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Víbora do Capim: uma cobra grossa, enrolada, de escamas verde-oliva com losangos amarelos e língua bifurcada. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: bote (recolher o pescoço, dar o bote, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue a cabeça, abre a boca mostrando as presas e sibila.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-oliva, amarelo, vermelho da língua), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Verme da Terra · `verme-da-terra.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Verme da Terra: um verme gigante saindo de um monte de terra, corpo em anéis rosa-acinzentados e boca redonda cheia de dentes. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: mordida (recuar para a terra, esticar o corpo, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: afunda na terra e reaparece, espalhando torrões.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (rosa-acinzentado, marrom-terra), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Orc Saqueador · `orc-saqueador.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Orc Saqueador: um orc de pele verde-acinzentada, presas inferiores à mostra, colete de couro remendado e um machado curto. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: machadada (erguer, golpear, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: grito de guerra batendo o machado no peito.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-acinzentado, couro, ferro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Anão Minerador · `anao-minerador.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Anão Minerador: um anão atarracado, de barba ruiva trançada, capacete com lanterna, avental de couro e uma picareta. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de picareta (erguer, descer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: acende a lanterna do capacete e resmunga de braços cruzados.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (ruivo, couro, cobre), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Esqueleto Errante · `esqueleto-errante.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Esqueleto Errante: um esqueleto humano de ossos amarelados, com restos de armadura enferrujada, uma espada lascada e brilho azul nas órbitas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: estocada com a espada (preparar, estocar, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: a mandíbula bate e o brilho azul dos olhos aumenta.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (osso, ferrugem, azul espectral), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Minotauro · `minotauro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Minotauro: um minotauro musculoso, de pelo castanho, chifres curvos, saiote de couro e um machado de duas lâminas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: machadada larga (girar o corpo, golpear, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bufa soltando vapor pelas narinas e raspa o casco no chão.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (castanho, marfim dos chifres, ferro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Carniçal · `carnical.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Carniçal: um morto-vivo curvado, de pele verde-pálida esticada sobre os ossos, garras longas e trapos escuros. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: arranhão com as garras (recolher o braço, rasgar, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: geme com a boca aberta e os braços caídos.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-pálido, cinza, roxo escuro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Anão Soldado · `anao-soldado.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Anão Soldado: um anão de cota de malha, elmo com protetor de nariz, barba preta e uma besta pesada nas mãos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: tiro de besta (armar, mirar, disparar o virote, baixar).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: recarrega a besta com o pé no estribo.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (aço, preto, marrom), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Anão Guardião · `anao-guardiao.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Anão Guardião: um anão de armadura completa de placas, escudo torre com um martelo gravado, barba branca e martelo de guerra. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: martelada (erguer, descer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bate o martelo no escudo, soltando faíscas.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (aço escuro, branco, dourado), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Orc Lanceiro · `orc-lanceiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Orc Lanceiro: um orc magro e alto, de pele verde, pintura de guerra vermelha no rosto, escudo de madeira e uma lança comprida. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: estocada com a lança (recuar, estocar, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bate a lança no escudo em ritmo de marcha.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde, vermelho, madeira), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Múmia · `mumia.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Múmia: uma múmia envolta em faixas amareladas e soltas, com um olho âmbar brilhando por uma fresta e um colar dourado antigo. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe com o braço enfaixado (erguer, descer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: as faixas se soltam e flutuam ao redor, levantando poeira.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (bege, âmbar, dourado gasto), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Orc Guerreiro · `orc-guerreiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Orc Guerreiro: um orc forte, de armadura de placas de ferro bruto, elmo com chifres curtos e uma espada larga serrilhada. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de espada larga (erguer, golpear, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue a espada e ruge.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde, ferro bruto, couro preto), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Golem de Pedra · `golem-de-pedra.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Golem de Pedra: um golem maciço feito de blocos de pedra cinza unidos por musgo, com runas azuis brilhando no peito e punhos enormes. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: soco pesado (recuar o punho, socar, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: as runas do peito acendem e pedrinhas flutuam ao redor.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (cinza-pedra, verde-musgo, azul das runas), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Vigia de Ossos · `vigia-de-ossos.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Vigia de Ossos: um crânio gigante flutuante, de osso amarelado, com um único olho verde brilhante no centro e pequenos ossos orbitando em volta. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: raio do olho (o olho fecha, abre brilhando, dispara um raio verde para a direita, apaga).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: os ossos giram mais rápido e o olho pulsa.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (osso, verde brilhante, sombra roxa), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Orc Xamã · `orc-xama.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Orc Xamã: um orc velho e curvado, de pele verde-musgo, cocar de penas e ossos, colares de dentes e um cajado com um crânio no topo. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: maldição (erguer o cajado, o crânio brilha roxo, lança um espírito para a direita, recolhe).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: dança curta com o cajado, soltando fumaça roxa.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-musgo, osso, vermelho das penas), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Dragão das Ruínas · `dragao-das-ruinas.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Dragão das Ruínas: um dragão jovem de escamas verde-esmeralda, barriga amarelada, asas dobradas, chifres curtos e fumaça saindo das narinas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: baforada de fogo (inspirar, abrir a boca, soltar o jato de fogo para a direita, fechar).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre as asas e ruge.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-esmeralda, amarelo, laranja do fogo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Amazona · `amazona.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Amazona: uma guerreira de pele bronzeada, cabelo preto trançado, armadura leve de couro e bronze e facas de arremesso no cinto. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: arremesso de faca (sacar, armar o braço, arremessar a faca para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: gira uma faca entre os dedos em desafio.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (bronze, couro, vermelho do tecido), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Orc Furioso · `orc-furioso.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Orc Furioso: um orc enorme, sem armadura, coberto de cicatrizes e pintura de guerra, olhos vermelhos e um machado em cada mão. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe duplo de machados (erguer os dois, cruzar no golpe, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: urra para o céu batendo os machados um no outro.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde, vermelho, ferro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Minotauro Arqueiro · `minotauro-arqueiro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Minotauro Arqueiro: um minotauro esguio, de pelo cinzento, com um arco de chifre, aljava nas costas e protetor de couro no ombro. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: tiro com o arco (puxar a flecha, retesar, soltar a flecha para a direita, baixar).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue o arco e muge.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (cinzento, marfim, couro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Valquíria · `valquiria.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Valquíria: uma guerreira de armadura prateada, elmo com pequenas asas, cabelo loiro em trança, escudo redondo e uma lança de arremesso. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: arremesso de lança (recuar o braço, arremessar a lança para a direita, impacto, puxar outra).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bate a lança no escudo e ergue o queixo.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (prata, azul-claro, loiro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Minotauro Mago · `minotauro-mago.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Minotauro Mago: um minotauro de manto roxo com bordados dourados, chifres enfeitados com anéis e um cajado com uma esfera elétrica. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: raio (erguer o cajado, a esfera faísca, dispara um raio para a direita, recolhe).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: a esfera cresce e raios correm pelos chifres.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (roxo, dourado, azul elétrico), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Líder Orc · `lider-orc.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Líder Orc: um orc gigantesco, de armadura negra com espinhos, capa de pele de lobo, elmo coroado com presas e um machado de guerra de duas mãos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: machadada devastadora de duas mãos (erguer acima da cabeça, descer, impacto com rachadura no chão, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bate o machado no escudo das costas e urra, comandando a tropa.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-escuro, ferro negro, vermelho-sangue), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Senhor dos Dragões · `senhor-dos-dragoes.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Senhor dos Dragões: um dragão adulto imponente, de escamas vermelho-rubi, chifres longos curvados para trás, asas largas e espinhos dourados no dorso. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: baforada de fogo larga (inspirar com o peito brilhando, abrir a boca, jato de fogo para a direita, fechar).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre as asas por inteiro e ruge, com o peito incandescente.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (vermelho-rubi, dourado, laranja do fogo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Minotauro Guarda · `minotauro-guarda.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Minotauro Guarda: um minotauro de armadura de placas de bronze, escudo retangular grande e uma maça com cravos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de maça (erguer, descer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: bate a maça no escudo e planta os cascos.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (bronze, castanho, ferro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Esqueleto Demoníaco · `esqueleto-demoniaco.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Esqueleto Demoníaco: um esqueleto alto com chifres e cauda de osso, ossos escurecidos, chamas roxas nas órbitas e uma foice enferrujada. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de foice (recuar, varrer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: as chamas roxas sobem pelas costelas.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (osso escuro, roxo, ferrugem), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Diabrete de Fogo · `diabrete-de-fogo.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Diabrete de Fogo: um diabrete pequeno de pele vermelha, asas de morcego, cauda em ponta de flecha, chifres curtos e um tridente em brasa. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: estocada com o tridente em brasa (recuar, estocar, impacto com faíscas, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ri e cospe uma labareda para cima.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (vermelho, preto, laranja), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Elemental de Fogo · `elemental-de-fogo.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Elemental de Fogo: uma criatura feita de chamas vivas, de forma humanoide sem pernas, com olhos brancos incandescentes e braços de fogo. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: bola de fogo (juntar as mãos, formar a bola, lançar para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: as chamas crescem em coluna e voltam.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (laranja, amarelo, vermelho), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Demônio do Abismo · `demonio-do-abismo.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Demônio do Abismo: um demônio enorme de pele vermelho-escura, chifres grossos curvados, asas de couro rasgadas, garras e um colar de correntes. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de garras em chamas (erguer o braço, rasgar, impacto com fogo, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre as asas, as correntes balançam e chamas sobem do chão.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (vermelho-escuro, preto, laranja incandescente), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Troll do Gelo · `troll-do-gelo.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Troll do Gelo: um troll corpulento de pele azul-clara, pelo branco nos ombros, presas, e um porrete feito de gelo. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de porrete de gelo (erguer, descer, impacto com lascas de gelo, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: sopra uma névoa gelada pela boca.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (azul-claro, branco, cinza), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Lobo do Inverno · `lobo-do-inverno.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Lobo do Inverno: um lobo de pelo branco espesso, com cristais de gelo no dorso, olhos azuis e hálito congelado. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: mordida (agachar, saltar, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: uivo soltando uma nuvem de gelo.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (branco, azul-gelo, cinza-claro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Urso Polar · `urso-polar.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Urso Polar: um urso polar enorme, de pelo branco-creme, focinho preto, garras grandes e cicatrizes no ombro. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: patada (erguer-se nas patas traseiras, descer a pata, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue-se nas patas traseiras e ruge.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (branco-creme, preto, cinza), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Mamute · `mamute.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Mamute: um mamute de pelo marrom comprido, presas curvas enormes, tromba grossa e neve acumulada nas costas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: investida com as presas (recuar, abaixar a cabeça, investir, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue a tromba e trombeteia.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (marrom, marfim, branco da neve), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Troll do Pântano · `troll-do-pantano.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Troll do Pântano: um troll magro e comprido, de pele verde-lodo coberta de musgo e algas, nariz longo e uma vara de pesca com anzol. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: chicotada com a vara e o anzol (recuar, chicotear, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: cospe lodo e ri mostrando os dentes.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-lodo, marrom, amarelo doentio), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Jacaré Matador · `jacare-matador.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Jacaré Matador: um jacaré enorme de couro verde-escuro, barriga amarelada, dentes à mostra e olhos amarelos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: mordida (abrir a boca, avançar, fechar a mandíbula, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: gira o corpo no chão batendo a cauda.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-escuro, amarelo, branco dos dentes), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Bruxa do Pântano · `bruxa-do-pantano.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Bruxa do Pântano: uma bruxa velha de vestido verde-escuro remendado, chapéu pontudo torto, verruga no nariz, e um caldeirão pequeno pendurado no cinto. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: feitiço venenoso (mexer no caldeirão, erguer o frasco, arremessar a poção verde para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: gargalha e uma fumaça verde sobe do caldeirão.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-escuro, roxo, verde-ácido), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Aranha Gigante · `aranha-gigante.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Aranha Gigante: uma aranha colossal, de corpo preto peludo com uma marca vermelha no abdômen, oito olhos vermelhos e presas pingando veneno verde. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: bote com as presas (erguer as patas dianteiras, saltar, cravar as presas, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue as patas dianteiras e lança um jato de teia.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (preto, vermelho, verde-veneno), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Necromante · `necromante.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Necromante: um feiticeiro magro de manto negro com capuz, rosto pálido, mãos ossudas e um cajado com uma chama verde espectral. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: magia da morte (erguer o cajado, a chama verde cresce, lança um crânio espectral para a direita, recolhe).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: mãos de osso brotam do chão ao redor.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (preto, verde espectral, cinza-pálido), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Viúva Lamentosa · `viuva-lamentosa.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Viúva Lamentosa: uma aranha pálida e esguia, de corpo branco-acinzentado com marcas pretas em forma de lágrima, patas longas e finas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: ferroada (recuar, esticar as patas, cravar as presas, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: treme o corpo soltando um lamento agudo, com ondas no ar.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (branco-acinzentado, preto, roxo-claro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Cavaleiro Negro · `cavaleiro-negro.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Cavaleiro Negro: um cavaleiro de armadura negra completa, elmo fechado com fenda vermelha brilhante, capa rasgada e uma espada de duas mãos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de espada de duas mãos (erguer, descer, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: finca a espada no chão e a fenda do elmo brilha.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (preto, vermelho brilhante, aço escuro), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Bruxo da Cripta · `bruxo-da-cripta.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Bruxo da Cripta: um bruxo poderoso de manto vermelho-escuro e dourado, gola alta, um grimório aberto flutuando ao lado e energia roxa nas mãos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: rajada arcana (folhear o grimório, juntar energia roxa nas mãos, disparar para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: o grimório gira e páginas voam ao redor em círculo.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (vermelho-escuro, dourado, roxo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Assassino · `assassino.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Assassino: um assassino encapuzado, de roupa preta justa, lenço cobrindo o rosto, e duas adagas curvas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe duplo de adagas (agachar, avançar, cortar em cruz, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: some numa nuvem de fumaça e reaparece no mesmo lugar.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (preto, cinza-escuro, prata das lâminas), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Elfo Batedor · `elfo-batedor.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Elfo Batedor: um elfo esguio de orelhas pontudas, roupa de couro verde e marrom, capa curta com capuz, e um arco curto. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: tiro com o arco curto (puxar a flecha, retesar, soltar para a direita, baixar).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: assobia um sinal com dois dedos.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde, marrom, bege), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Elfo Arcanista · `elfo-arcanista.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Elfo Arcanista: um elfo de cabelo branco comprido, manto vermelho com detalhes dourados e uma varinha de cristal. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: feitiço de luz (erguer a varinha, o cristal brilha, dispara um raio para a direita, recolhe).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: runas douradas giram em volta do corpo.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (vermelho, dourado, branco), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Monge Renegado · `monge-renegado.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Monge Renegado: um monge de cabeça raspada, hábito marrom com faixa laranja, pés descalços e as mãos enfaixadas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: sequência de socos (posição, soco direto, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: posição de meditação em pé, com uma aura dourada.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (marrom, laranja, bege), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Herói Caído · `heroi-caido.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Herói Caído: um guerreiro lendário caído em desgraça: armadura dourada amassada e manchada, capa azul rasgada, cabelo comprido grisalho e uma espada larga com joia apagada. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe de espada larga com giro (girar o corpo, golpear, impacto, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue a espada num cumprimento antigo e a joia pisca.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (dourado gasto, azul, cinza), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Elemental de Água · `elemental-de-agua.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Elemental de Água: uma criatura feita de água viva, de forma humanoide sem pernas saindo de uma onda, com olhos brancos e braços fluidos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: jato de água (juntar as mãos, formar a esfera, lançar o jato para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: o corpo vira uma onda alta e volta.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (azul, azul-claro, branco da espuma), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Serpente Marinha · `serpente-marinha.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Serpente Marinha: uma serpente marinha de corpo longo azul-esverdeado, barbatanas em leque na cabeça e escamas brilhantes, saindo de uma poça de água. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: bote (recuar o pescoço, dar o bote, morder, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre as barbatanas da cabeça e cospe um jato de água para cima.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (azul-esverdeado, turquesa, branco), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Gosma Primordial · `gosma-primordial.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Gosma Primordial: uma gosma grande e translúcida, verde-clara, com bolhas dentro, dois olhos simples e ossinhos flutuando no interior. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: pancada (esticar o corpo para cima, cair para a frente, espalhar, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: borbulha e se divide em duas por um instante, depois se junta.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (verde-claro translúcido, verde-escuro, branco), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Infernatil · `infernatil.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Infernatil: um senhor demoníaco elemental: corpo de rocha negra rachada com lava nas fendas, quatro chifres, um braço de fogo, um de gelo, e uma coroa de chamas. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: golpe elemental (erguer os dois braços, juntar fogo e gelo, descarregar para a direita, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: a coroa de chamas cresce e os quatro elementos giram ao redor.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (preto-rocha, laranja-lava, azul-gelo), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Verminor · `verminor.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Verminor: um senhor da praga das geleiras: criatura alta e curvada, de carapaça de inseto azul-acinzentada coberta de gelo, várias patas finas, mandíbulas e uma nuvem de insetos congelados em volta. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: ferroada com névoa de praga (erguer as patas, avançar, cravar o ferrão, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: abre a carapaça e solta o enxame congelado ao redor.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (azul-acinzentado, branco-gelo, verde doentio), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```

### Apocalypse · `apocalypse.png` · falta

```
Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada Apocalypse: o fim de todas as coisas: uma besta colossal de quatro patas, de corpo negro-arroxeado com veios vermelhos pulsando, chifres enormes voltados para a frente, cauda com espinhos e olhos azul-brancos. Design próprio, sem copiar nenhum jogo existente.

Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- A criatura olha para a DIREITA em todos os quadros.
- É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal. Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: investida devastadora (recuar com os veios acendendo, investir de chifres, impacto com onda de choque, recolher).
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ergue-se e solta um rugido que escurece tudo em volta.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (negro-arroxeado, vermelho pulsante, azul-branco), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. A mesma criatura, com as mesmas cores e proporções, em todos os 24 quadros.
```
