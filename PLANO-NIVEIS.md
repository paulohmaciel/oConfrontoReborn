# Plano — conteúdo dos níveis 60 a 1000

> Proposta de 2026-10-31. Nada foi implementado ainda. As decisões marcadas com **❓** são do dono e mudam números deste plano.
> Ao executar uma fase, marcar no `TODO.md` e seguir as regras de `AGENTS.md` (seed é upsert, migração aditiva, sprites só do TibiaWiki com SHA-256 no manifesto).

## 1. Onde o jogo está hoje

| | Hoje | Observação |
|---|---|---|
| Teto de nível | nenhum | `getExpForLevel` é a curva cúbica clássica; XP do personagem é `BigInt` — o nível 1000 (≈ 16,5 bilhões de XP) não estoura |
| Monstros | 11, do Rat (1) ao Demon (60) | depois do 60 não há nada novo |
| Equipamentos | 17, o mais alto pede nível 50 | |
| Regiões | 4; a última abre no nível 20 | `shared/adventure.ts` |
| Jornada | 5 etapas, termina no Guardião da Pedreira (nível ~4) | |
| Promoção | 1, no nível 20 | |
| Ganho por nível | +5 HP, +5 mana, +3 pontos de atributo, +1,5 de ataque | fixo no código |
| Energia | 100; cada luta gasta 5; só volta no Templo (espera de 5 min) | ≈ 80–120 lutas por hora no máximo |

Para chegar ao 1000 matando Demons seriam **2,76 milhões de lutas**. Na prática o jogo termina no 60.

## 2. O que precisa mudar antes de criar conteúdo

1. **Subida de nível em um lugar só.** Hoje a mesma conta (`while experience >= getExpForLevel(level+1)` + HP/mana/pontos) está copiada em `battleService.ts`, `adventureService.ts` e `taskRoutes.ts`. Criar `gainExperience(tx, character, xp)` na gaveta `game` e usar nos três. Sem isso, qualquer ajuste de crescimento vira três ajustes (e um esquecido vira bug).
2. **Curvas em `shared/progression.ts`.** Teto `MAX_LEVEL = 1000`, ganho por nível e a curva de XP de monstro, com testes. A fórmula de XP do personagem **não muda** (mudar recalcularia o nível de quem já joga — proibido pelo `AGENTS.md`).
3. **Simulador** `npm run levels:simulate`, no mesmo espírito do `forge:simulate`: para cada vocação e faixa de nível, mostra lutas por nível, turnos por luta, chance de derrota, ouro ganho e horas até o próximo marco. Toda faixa nova só entra depois de passar por ele.
4. **Teto respeitado.** No nível 1000 a XP para de somar (ou vira "maestria", ver ❓4) e a tela mostra "Nível máximo".

Nada disso exige migração.

## 3. Curva proposta

**XP de monstro ≈ 1,6 × nível².** Com a curva cúbica do personagem, isso dá um ritmo **constante de ~31 lutas por nível** contra monstros da sua faixa, do nível 10 ao 1000. Os monstros atuais já seguem essa curva a partir do Minotaur (Cyclops 250 × alvo 230; Demon 6.000 × alvo 5.760). Os primeiros níveis continuam mais generosos, o que é bom para o início.

| Nível | XP para subir | XP do monstro da faixa | Lutas acumuladas |
|---|---|---|---|
| 60 | 165 mil | 5,8 mil | 2,1 mil |
| 100 | 475 mil | 16 mil | 3,4 mil |
| 200 | 1,95 mi | 64 mil | 6,5 mil |
| 500 | 12,4 mi | 400 mil | 15,9 mil |
| 1000 | 49,8 mi | 1,6 mi | 31,6 mil |

**Tempo até o 1000: ~260 h (120 lutas/h) a ~400 h (80 lutas/h).** O ajuste fino fica em `economy.xpRewardPercent`, sem mexer em código.

Os demais números do monstro (vida, ataque, defesa, ouro) saem de fórmulas da faixa, calibradas pelo simulador para dar **4–8 turnos por luta** e chance de derrota baixa com equipamento da faixa. Pontos de atenção:
- O jogador cresce de forma **linear** (+5 HP, +3 pontos por nível); o monstro também precisa crescer linear em vida/ataque — só a XP é quadrática.
- **Ouro** cresce junto. Sem novos sumidouros (Astra 7 no `TODO.md`) a economia infla. Ouro de monstro deve crescer mais devagar que a XP (proposta: ~linear).
- Todos os campos continuam cabendo nos tipos atuais (`Monster.experience` é `Int`: 1,6 mi no nível 1000 cabe).

## 4. Faixas de conteúdo

Cada faixa = 1 região nova em `shared/adventure.ts` + monstros + 1 chefe com golpe anunciado + equipamentos + 1 etapa de jornada. Sprites abaixo **já estão no manifesto**, salvo onde diz "importar".

| Faixa | Região (sugestão) | Monstros (sprite no manifesto) | Chefe | Equipamentos (sprite no manifesto) |
|---|---|---|---|---|
| 1–20 (completar) | Arredores / Pedreira | Bug, Snake, Spider, Goblin, Skeleton, Troll, Dwarf, Elf | já existe | Short Sword, Studded Armor, Brass Helmet/Legs, Steel Shield |
| 20–60 (completar) | Ruínas / Abismo | Orc Warrior, Orc Berserker, Orc Shaman, Minotaur Archer/Guard/Mage, Dwarf Soldier/Guard, Elf Scout/Arcanist, Amazon, Valkyrie, Mummy, Bonelord, Stone Golem | Orc Leader | Knight Armor/Legs, Plate Armor/Legs, Battle Shield, Spike Sword, Dragon Lance |
| 60–100 | Terras Geladas | Frost Troll, Winter Wolf, Polar Bear, Mammoth, Swamp Troll, Killer Caiman, Witch | Giant Spider | Crown Armor/Legs/Helmet, Crown Shield, Ice Rapier, Dragon Scale Mail |
| 100–150 | Cripta Esquecida | Necromancer, Wailing Widow, Black Knight, Hero | Warlock | ainda livres no manifesto: Noble Armor, Dark Armor, Winged Helmet, Ornamented Shield, Great Axe, Obsidian Lance, Naginata |
| 150–250 | Santuário Elemental | Water Elemental, Young Sea Serpent (Fire Devil e Fire Elemental já usados na Fase 1) | Infernatil | ainda livres: Fiery/Icy/Energy/Earth Barbarian Axe, Guardian Axe, Ice Rapier, Serpent Sword, Rose Shield; armas de mago e de Arqueiro precisam ser **importadas** |
| 250–1000 | ❓ ver abaixo | **importar** (verificar no TibiaWiki): Hydra, Serpent Spawn, Behemoth, Hellhound, Juggernaut, Grim Reaper, Destroyer, Frost Dragon, Undead Dragon… | Verminor (500), Apocalypse (1000) | **importar** |

Os três arquidemônios **Infernatil, Verminor e Apocalypse** já têm sprite: servem de marcos (250, 500 e 1000).

### ❓4 — como preencher 250–1000
- **A) Conteúdo único:** uma região a cada 50 níveis, ~15 regiões, ~60 monstros e ~60 itens novos para importar. Mais rico; muito trabalho e depende da licença dos sprites.
- **B) Eras (recomendado):** de 250 em diante, as regiões voltam em "Eras" (I a V) com os mesmos sprites e números da curva, mais um chefe próprio por Era e um sufixo visível ("Hydra da 2ª Era"). Os equipamentos ganham **nível de item** em vez de dezenas de blueprints. Exige uma migração aditiva pequena (`Monster.era`, `InventoryItem.itemLevel`).
- **C) Teto menor:** fechar em 300 por enquanto e deixar 300–1000 para depois do beta.

## 5. Fases de entrega

Cada fase é uma branch e um PR, rodando `check`, `test`, `check:drawers`, `build` e o simulador. Seed sempre por upsert (não apaga nada).

| Fase | Entrega | Migração |
|---|---|---|
| **0 — Base** | `gainExperience` único, `shared/progression.ts`, `MAX_LEVEL`, `levels:simulate`, testes | não |
| **1 — até 100** | completar 1–60, Terras Geladas, ~25 itens do manifesto, jornada 6–8, 2ª promoção ❓ | não |
| **2 — até 250** | Cripta + Santuário, Infernatil, itens altos do manifesto, conquistas por marco | não |
| **3 — 250+** | conforme ❓4 (A, B ou C), Verminor e Apocalypse | só se B |
| Junto de cada fase | sumidouros de ouro na mesma proporção (Astra 7), revisar `economy:reconcile` | — |

## Resultado da Fase 0 (2026-10-31)

Feito: `gainExperience` único, `shared/progression.ts` (`MAX_LEVEL = 1000`), "Nível máximo" na tela e `npm run levels:simulate`. No teto, o nível para mas a XP continua contando, o que deixa a decisão sobre "maestria" (❓4) em aberto sem perder dados.

O que o simulador mostrou com os monstros atuais (personagem no nível do monstro, melhor equipamento +0, pontos distribuídos):

| Monstro | XP × alvo | Lutas por nível | Turnos por luta | Vida perdida |
|---|---|---|---|---|
| Rat a Orc (1–5) | acima do alvo | 4–9 | 1,0 | 0% |
| Minotaur a Cyclops (8–12) | no alvo | 16–22 | 1,0–1,8 | 0–7% |
| Dragon (25) | 70% do alvo | 40 | 2,0–2,4 | 8–16% |
| Dragon Lord, chefe (40) | 82% do alvo | 35 | 3,1–4,0 | 7–12% |
| Demon, chefe (60) | no alvo | 29 | 9,6–14,2 | 45–57% |

- **A XP já segue a curva** a partir do nível 8; Dragon e Dragon Lord dão um pouco menos que o alvo.
- **As lutas são curtas demais** até o 40: o monstro morre em 1–2 golpes, então o combate por turnos quase não acontece. A Fase 1 precisa subir vida e ataque dos monstros da faixa (meta de 4–8 turnos) antes de criar monstros novos.
- Pela curva-alvo, a 100 lutas por hora: nível 100 em ~38 h, 250 em ~86 h, 1000 em ~322 h.

## Resultado da Fase 1 (2026-10-31)

Feito, só com sprites que já estavam no manifesto:
- **Catálogo em um arquivo** (`backend/prisma/catalog.ts`): o seed, o simulador e o calibrador leem a mesma lista. Seed continua por upsert e agora se recusa a rodar se faltar sprite.
- **41 monstros** (11 originais rebalanceados + 30 novos), do Rat (1) à Aranha Gigante (chefe, 100). Comum mais alto: Witch (90).
- **4 regiões novas:** Acampamento Orc (15, chefe Orc Leader), Labirinto dos Minotauros (30), Terras Geladas (60) e Vale da Perdição de Capriel (80, chefe Giant Spider — a região mais perigosa). Demon Skeleton, Fire Devil e Fire Elemental foram para os Portões do Abismo (44–56), então saem da lista da Fase 2.
- **49 equipamentos novos** até o nível 100. As armas novas têm vocação: espadas para Cavaleiro, lanças/besta/estrela para Arqueiro, cajados para magos; robes e chapéus dão magia. Preço = 12 × nível² + 200.
- **`npm run levels:calibrate`** acha vida, ataque e defesa de cada monstro pelo motor do jogo (meta: 5 turnos e ~12% da vida; chefes ~10 turnos e ~40%; começo mais leve). `-- --write` regrava o catálogo.
- XP: curva-alvo com piso de 18 × nível no começo; chefes novos dão o dobro. Ouro: nível × (3 + nível/8) até o dobro.
- Loot dos originais não mudou. Os novos derrubam poções e, raramente, um equipamento da própria faixa (2%; chefes 8%). Cada monstro novo ganhou tarefa automática.

Achados para depois:
- **Arqueiro perde ~2× mais vida** que as outras vocações (chefes: até 73%, 94% de vitórias no Orc Leader). Pode ser a distribuição de pontos que o simulador supõe (20% em vitalidade) ou a classe. Rever o equilíbrio entre classes.
- **Armas de mago param no nível 35** (Skull Staff) **e de Arqueiro no 65** (Throwing Star): não há outros sprites no manifesto. Robes/chapéus compensam os magos; para 100+ é preciso importar varinhas, cajados e arcos.
- **Antes de jogar no seu banco:** `npm run seed` (o `iniciar.bat` já roda). Personagens existentes não perdem nada; os monstros antigos ficam mais resistentes.

## 6. Decisões do dono

1. **❓1 Ritmo:** ~31 lutas por nível (≈ 260–400 h até o 1000) está bom? Mais lento = monstros dão menos XP.
2. **❓2 Energia:** manter "só no Templo" ou criar recuperação passiva com o tempo? Isso muda o tempo total mais do que qualquer outro número.
3. **❓3 Promoções:** uma 2ª promoção (ex.: nível 200) e uma 3ª (ex.: 500)?
4. **❓4 Conteúdo de 250 a 1000:** A, B ou C (acima).
5. **❓5 Licença:** importar sprites novos só depois da decisão sobre TibiaWiki/CipSoft já registrada no `TODO.md`.
