#!/usr/bin/env node
// Arte própria do jogo: uma lista só (abaixo) descreve todas as folhas de sprites que a arena precisa.
// Uso: npm run art   → reescreve ART.md (um comando pronto por arte, com o que já foi feito) e
//                      frontend/src/lib/spriteSheets.json (folhas que existem em frontend/public/assets/sprites).
// O build roda este script antes: basta salvar o PNG com o nome indicado e rodar `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'frontend/public/assets/sprites');

// ----- Heróis (uma folha por vocação) -----
export const heroes = [
  { key: 'KNIGHT', file: 'cavaleiro', name: 'Cavaleiro',
    look: 'um cavaleiro original, de armadura de aço escuro com detalhes em latão, capa vinho curta, espada longa na mão direita e escudo redondo na esquerda. Rosto visível, cabelo castanho, sem elmo fechado',
    palette: 'aço, latão, vinho', attack: 'ataque com a espada (preparar, golpear, impacto, recolher)', defend: 'defesa (ergue o escudo à frente e segura)',
    special: 'cura (ergue a mão, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose)' },
  { key: 'PALADIN', file: 'arqueiro', name: 'Arqueiro',
    look: 'um arqueiro original, ágil, de couro verde-musgo e marrom, capuz baixado nas costas, braçadeira de couro, arco longo de madeira clara na mão e aljava de flechas nas costas. Rosto visível, cabelo ruivo curto',
    palette: 'verde-musgo, couro marrom, madeira clara', attack: 'tiro com o arco (puxar a flecha da aljava, retesar o arco, soltar a flecha, baixar o arco)', defend: 'defesa (recua meio passo, cruza o arco à frente do corpo e se abaixa)',
    special: 'cura (leva a mão ao peito, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose)' },
  { key: 'SORCERER', file: 'feiticeiro', name: 'Feiticeiro',
    look: 'um feiticeiro original de rosto maduro e expressão firme, com barba curta grisalha e cabelos brancos longos, penteados inteiramente para trás, sem topete nem franja. Usa manto longo azul-noite com bordas roxas e runas douradas, chapéu de aba larga caído para trás e cajado de madeira escura com uma brasa laranja flutuando na ponta',
    palette: 'azul-noite, roxo, dourado, laranja de brasa', attack: 'magia de fogo (ergue o cajado, a brasa cresce, lança uma bola de fogo para a direita, recolhe o cajado)', defend: 'defesa (finca o cajado no chão e ergue um escudo mágico azul translúcido à frente)',
    special: 'cura (ergue a mão livre, brilho verde suave e solto ao redor do corpo, sem caixa nem fundo, e volta à pose)' },
  { key: 'DRUID', file: 'druida', name: 'Druida',
    look: 'uma druida original: mulher negra, de pele marrom-escura, com dreadlocks longos até a cintura, enfeitados com contas de madeira e anéis dourados, e algumas mechas presas no alto. Veste túnica verde-floresta com manto ocre, colar de sementes e pulseiras de cobre, descalça ou de sandálias de couro. Empunha um cajado de madeira viva, com folhas e uma trepadeira enrolada. Rosto visível, expressão serena e firme',
    palette: 'verde-floresta, ocre, cobre, marrom-escuro da pele, madeira', attack: 'magia da natureza (ergue o cajado, espinhos e folhas giram na ponta, lança uma rajada de espinhos para a direita, recolhe o cajado)', defend: 'defesa (finca o cajado e raízes sobem do chão formando uma barreira baixa à frente)',
    special: 'cura (ergue as duas mãos, os dreadlocks se movem com o vento, brilho verde forte e solto ao redor do corpo com folhas subindo, sem caixa nem fundo, e volta à pose)' },
];

// ----- Criaturas: `key` é o sprite que a criatura usa hoje no catálogo (várias criaturas das Eras e de Capriel usam o mesmo). -----
const c = (key, file, name, look, palette, attack, special, boss = false) => ({ key, file, name, look, palette, attack, special, boss });
export const creatures = [
  c('Rat', 'rato-do-celeiro', 'Rato do Celeiro', 'um rato grande e magro, de pelo marrom sujo, dentes amarelos à mostra e rabo comprido sem pelos', 'marrom, bege, rosa do rabo', 'mordida (agachar, saltar, morder, recolher)', 'guincho ameaçador, de pé nas patas traseiras, depois volta à pose'),
  c('Bug', 'besouro-de-casca', 'Besouro de Casca', 'um besouro do tamanho de um cão, de carapaça verde-escura brilhante, mandíbulas grandes e seis patas', 'verde-escuro, preto, amarelo', 'pinçada com as mandíbulas (recuar, avançar, pinçar, recolher)', 'abre a carapaça e bate as asas zumbindo, depois fecha'),
  c('Wolf', 'lobo-das-cinzas', 'Lobo das Cinzas', 'um lobo grande de pelo cinza-carvão, com brasas alaranjadas acesas ao longo do dorso e olhos âmbar', 'cinza-carvão, laranja de brasa, âmbar', 'mordida (agachar, saltar, morder, recolher)', 'uivo com as brasas do dorso acendendo mais forte, depois volta à pose'),
  c('Cyclops', 'ciclope-da-pedreira', 'Ciclope da Pedreira', 'um gigante de um olho só, pele cinza-azulada, tanga de couro, braceletes de ferro e uma clava de pedra bruta', 'cinza-azulado, couro, ferro', 'golpe de clava de cima para baixo (erguer, descer, impacto no chão, recolher)', 'urro com o olho brilhando, batendo a clava na palma da mão'),
  c('Snake', 'vibora-do-capim', 'Víbora do Capim', 'uma cobra grossa, enrolada, de escamas verde-oliva com losangos amarelos e língua bifurcada', 'verde-oliva, amarelo, vermelho da língua', 'bote (recolher o pescoço, dar o bote, morder, recolher)', 'ergue a cabeça, abre a boca mostrando as presas e sibila'),
  c('Rotworm', 'verme-da-terra', 'Verme da Terra', 'um verme gigante saindo de um monte de terra, corpo em anéis rosa-acinzentados e boca redonda cheia de dentes', 'rosa-acinzentado, marrom-terra', 'mordida (recuar para a terra, esticar o corpo, morder, recolher)', 'afunda na terra e reaparece, espalhando torrões'),
  c('Orc', 'orc-saqueador', 'Orc Saqueador', 'um orc de pele verde-acinzentada, presas inferiores à mostra, colete de couro remendado e um machado curto', 'verde-acinzentado, couro, ferro', 'machadada (erguer, golpear, impacto, recolher)', 'grito de guerra batendo o machado no peito'),
  c('Dwarf', 'anao-minerador', 'Anão Minerador', 'um anão atarracado, de barba ruiva trançada, capacete com lanterna, avental de couro e uma picareta', 'ruivo, couro, cobre', 'golpe de picareta (erguer, descer, impacto, recolher)', 'acende a lanterna do capacete e resmunga de braços cruzados'),
  c('Skeleton', 'esqueleto-errante', 'Esqueleto Errante', 'um esqueleto humano de ossos amarelados, com restos de armadura enferrujada, uma espada lascada e brilho azul nas órbitas', 'osso, ferrugem, azul espectral', 'estocada com a espada (preparar, estocar, impacto, recolher)', 'a mandíbula bate e o brilho azul dos olhos aumenta'),
  c('Minotaur', 'minotauro', 'Minotauro', 'um minotauro musculoso, de pelo castanho, chifres curvos, saiote de couro e um machado de duas lâminas', 'castanho, marfim dos chifres, ferro', 'machadada larga (girar o corpo, golpear, impacto, recolher)', 'bufa soltando vapor pelas narinas e raspa o casco no chão'),
  c('Ghoul', 'carnical', 'Carniçal', 'um morto-vivo curvado, de pele verde-pálida esticada sobre os ossos, garras longas e trapos escuros', 'verde-pálido, cinza, roxo escuro', 'arranhão com as garras (recolher o braço, rasgar, impacto, recolher)', 'geme com a boca aberta e os braços caídos'),
  c('Dwarf Soldier', 'anao-soldado', 'Anão Soldado', 'um anão de cota de malha, elmo com protetor de nariz, barba preta e uma besta pesada nas mãos', 'aço, preto, marrom', 'tiro de besta (armar, mirar, disparar o virote, baixar)', 'recarrega a besta com o pé no estribo'),
  c('Dwarf Guard', 'anao-guardiao', 'Anão Guardião', 'um anão de armadura completa de placas, escudo torre com um martelo gravado, barba branca e martelo de guerra', 'aço escuro, branco, dourado', 'martelada (erguer, descer, impacto, recolher)', 'bate o martelo no escudo, soltando faíscas'),
  c('Orc Spearman', 'orc-lanceiro', 'Orc Lanceiro', 'um orc magro e alto, de pele verde, pintura de guerra vermelha no rosto, escudo de madeira e uma lança comprida', 'verde, vermelho, madeira', 'estocada com a lança (recuar, estocar, impacto, recolher)', 'bate a lança no escudo em ritmo de marcha'),
  c('Mummy', 'mumia', 'Múmia', 'uma múmia envolta em faixas amareladas e soltas, com um olho âmbar brilhando por uma fresta e um colar dourado antigo', 'bege, âmbar, dourado gasto', 'golpe com o braço enfaixado (erguer, descer, impacto, recolher)', 'as faixas se soltam e flutuam ao redor, levantando poeira'),
  c('Orc Warrior', 'orc-guerreiro', 'Orc Guerreiro', 'um orc forte, de armadura de placas de ferro bruto, elmo com chifres curtos e uma espada larga serrilhada', 'verde, ferro bruto, couro preto', 'golpe de espada larga (erguer, golpear, impacto, recolher)', 'ergue a espada e ruge'),
  c('Stone Golem', 'golem-de-pedra', 'Golem de Pedra', 'um golem maciço feito de blocos de pedra cinza unidos por musgo, com runas azuis brilhando no peito e punhos enormes', 'cinza-pedra, verde-musgo, azul das runas', 'soco pesado (recuar o punho, socar, impacto, recolher)', 'as runas do peito acendem e pedrinhas flutuam ao redor'),
  c('Bonelord', 'vigia-de-ossos', 'Vigia de Ossos', 'um crânio gigante flutuante, de osso amarelado, com um único olho verde brilhante no centro e pequenos ossos orbitando em volta', 'osso, verde brilhante, sombra roxa', 'raio do olho (o olho fecha, abre brilhando, dispara um raio verde para a direita, apaga)', 'os ossos giram mais rápido e o olho pulsa'),
  c('Orc Shaman', 'orc-xama', 'Orc Xamã', 'um orc velho e curvado, de pele verde-musgo, cocar de penas e ossos, colares de dentes e um cajado com um crânio no topo', 'verde-musgo, osso, vermelho das penas', 'maldição (erguer o cajado, o crânio brilha roxo, lança um espírito para a direita, recolhe)', 'dança curta com o cajado, soltando fumaça roxa'),
  c('Dragon', 'dragao-das-ruinas', 'Dragão das Ruínas', 'um dragão jovem de escamas verde-esmeralda, barriga amarelada, asas dobradas, chifres curtos e fumaça saindo das narinas', 'verde-esmeralda, amarelo, laranja do fogo', 'baforada de fogo (inspirar, abrir a boca, soltar o jato de fogo para a direita, fechar)', 'abre as asas e ruge'),
  c('Amazon', 'amazona', 'Amazona', 'uma guerreira de pele bronzeada, cabelo preto trançado, armadura leve de couro e bronze e facas de arremesso no cinto', 'bronze, couro, vermelho do tecido', 'arremesso de faca (sacar, armar o braço, arremessar a faca para a direita, recolher)', 'gira uma faca entre os dedos em desafio'),
  c('Orc Berserker', 'orc-furioso', 'Orc Furioso', 'um orc enorme, sem armadura, coberto de cicatrizes e pintura de guerra, olhos vermelhos e um machado em cada mão', 'verde, vermelho, ferro', 'golpe duplo de machados (erguer os dois, cruzar no golpe, impacto, recolher)', 'urra para o céu batendo os machados um no outro'),
  c('Minotaur Archer', 'minotauro-arqueiro', 'Minotauro Arqueiro', 'um minotauro esguio, de pelo cinzento, com um arco de chifre, aljava nas costas e protetor de couro no ombro', 'cinzento, marfim, couro', 'tiro com o arco (puxar a flecha, retesar, soltar a flecha para a direita, baixar)', 'ergue o arco e muge'),
  c('Valkyrie', 'valquiria', 'Valquíria', 'uma guerreira de armadura prateada, elmo com pequenas asas, cabelo loiro em trança, escudo redondo e uma lança de arremesso', 'prata, azul-claro, loiro', 'arremesso de lança (recuar o braço, arremessar a lança para a direita, impacto, puxar outra)', 'bate a lança no escudo e ergue o queixo'),
  c('Minotaur Mage', 'minotauro-mago', 'Minotauro Mago', 'um minotauro de manto roxo com bordados dourados, chifres enfeitados com anéis e um cajado com uma esfera elétrica', 'roxo, dourado, azul elétrico', 'raio (erguer o cajado, a esfera faísca, dispara um raio para a direita, recolhe)', 'a esfera cresce e raios correm pelos chifres'),
  c('Orc Leader', 'lider-orc', 'Líder Orc', 'um orc gigantesco, de armadura negra com espinhos, capa de pele de lobo, elmo coroado com presas e um machado de guerra de duas mãos', 'verde-escuro, ferro negro, vermelho-sangue', 'machadada devastadora de duas mãos (erguer acima da cabeça, descer, impacto com rachadura no chão, recolher)', 'bate o machado no escudo das costas e urra, comandando a tropa', true),
  c('Dragon Lord', 'senhor-dos-dragoes', 'Senhor dos Dragões', 'um dragão adulto imponente, de escamas vermelho-rubi, chifres longos curvados para trás, asas largas e espinhos dourados no dorso', 'vermelho-rubi, dourado, laranja do fogo', 'baforada de fogo larga (inspirar com o peito brilhando, abrir a boca, jato de fogo para a direita, fechar)', 'abre as asas por inteiro e ruge, com o peito incandescente', true),
  c('Minotaur Guard', 'minotauro-guarda', 'Minotauro Guarda', 'um minotauro de armadura de placas de bronze, escudo retangular grande e uma maça com cravos', 'bronze, castanho, ferro', 'golpe de maça (erguer, descer, impacto, recolher)', 'bate a maça no escudo e planta os cascos'),
  c('Demon Skeleton', 'esqueleto-demoniaco', 'Esqueleto Demoníaco', 'um esqueleto alto com chifres e cauda de osso, ossos escurecidos, chamas roxas nas órbitas e uma foice enferrujada', 'osso escuro, roxo, ferrugem', 'golpe de foice (recuar, varrer, impacto, recolher)', 'as chamas roxas sobem pelas costelas'),
  c('Fire Devil', 'diabrete-de-fogo', 'Diabrete de Fogo', 'um diabrete pequeno de pele vermelha, asas de morcego, cauda em ponta de flecha, chifres curtos e um tridente em brasa', 'vermelho, preto, laranja', 'estocada com o tridente em brasa (recuar, estocar, impacto com faíscas, recolher)', 'ri e cospe uma labareda para cima'),
  c('Fire Elemental', 'elemental-de-fogo', 'Elemental de Fogo', 'uma criatura feita de chamas vivas, de forma humanoide sem pernas, com olhos brancos incandescentes e braços de fogo', 'laranja, amarelo, vermelho', 'bola de fogo (juntar as mãos, formar a bola, lançar para a direita, recolher)', 'as chamas crescem em coluna e voltam'),
  c('Demon', 'demonio-do-abismo', 'Demônio do Abismo', 'um demônio enorme de pele vermelho-escura, chifres grossos curvados, asas de couro rasgadas, garras e um colar de correntes', 'vermelho-escuro, preto, laranja incandescente', 'golpe de garras em chamas (erguer o braço, rasgar, impacto com fogo, recolher)', 'abre as asas, as correntes balançam e chamas sobem do chão', true),
  c('Frost Troll', 'troll-do-gelo', 'Troll do Gelo', 'um troll corpulento de pele azul-clara, pelo branco nos ombros, presas, e um porrete feito de gelo', 'azul-claro, branco, cinza', 'golpe de porrete de gelo (erguer, descer, impacto com lascas de gelo, recolher)', 'sopra uma névoa gelada pela boca'),
  c('Winter Wolf', 'lobo-do-inverno', 'Lobo do Inverno', 'um lobo de pelo branco espesso, com cristais de gelo no dorso, olhos azuis e hálito congelado', 'branco, azul-gelo, cinza-claro', 'mordida (agachar, saltar, morder, recolher)', 'uivo soltando uma nuvem de gelo'),
  c('Polar Bear', 'urso-polar', 'Urso Polar', 'um urso polar enorme, de pelo branco-creme, focinho preto, garras grandes e cicatrizes no ombro', 'branco-creme, preto, cinza', 'patada (erguer-se nas patas traseiras, descer a pata, impacto, recolher)', 'ergue-se nas patas traseiras e ruge'),
  c('Mammoth', 'mamute', 'Mamute', 'um mamute de pelo marrom comprido, presas curvas enormes, tromba grossa e neve acumulada nas costas', 'marrom, marfim, branco da neve', 'investida com as presas (recuar, abaixar a cabeça, investir, recolher)', 'ergue a tromba e trombeteia'),
  c('Swamp Troll', 'troll-do-pantano', 'Troll do Pântano', 'um troll magro e comprido, de pele verde-lodo coberta de musgo e algas, nariz longo e uma vara de pesca com anzol', 'verde-lodo, marrom, amarelo doentio', 'chicotada com a vara e o anzol (recuar, chicotear, impacto, recolher)', 'cospe lodo e ri mostrando os dentes'),
  c('Killer Caiman', 'jacare-matador', 'Jacaré Matador', 'um jacaré enorme de couro verde-escuro, barriga amarelada, dentes à mostra e olhos amarelos', 'verde-escuro, amarelo, branco dos dentes', 'mordida (abrir a boca, avançar, fechar a mandíbula, recolher)', 'gira o corpo no chão batendo a cauda'),
  c('Witch', 'bruxa-do-pantano', 'Bruxa do Pântano', 'uma bruxa velha de vestido verde-escuro remendado, chapéu pontudo torto, verruga no nariz, e um caldeirão pequeno pendurado no cinto', 'verde-escuro, roxo, verde-ácido', 'feitiço venenoso (mexer no caldeirão, erguer o frasco, arremessar a poção verde para a direita, recolher)', 'gargalha e uma fumaça verde sobe do caldeirão'),
  c('Giant Spider', 'aranha-gigante', 'Aranha Gigante', 'uma aranha colossal, de corpo preto peludo com uma marca vermelha no abdômen, oito olhos vermelhos e presas pingando veneno verde', 'preto, vermelho, verde-veneno', 'bote com as presas (erguer as patas dianteiras, saltar, cravar as presas, recolher)', 'ergue as patas dianteiras e lança um jato de teia', true),
  c('Necromancer', 'necromante', 'Necromante', 'um feiticeiro magro de manto negro com capuz, rosto pálido, mãos ossudas e um cajado com uma chama verde espectral', 'preto, verde espectral, cinza-pálido', 'magia da morte (erguer o cajado, a chama verde cresce, lança um crânio espectral para a direita, recolhe)', 'mãos de osso brotam do chão ao redor'),
  c('Wailing Widow', 'viuva-lamentosa', 'Viúva Lamentosa', 'uma aranha pálida e esguia, de corpo branco-acinzentado com marcas pretas em forma de lágrima, patas longas e finas', 'branco-acinzentado, preto, roxo-claro', 'ferroada (recuar, esticar as patas, cravar as presas, recolher)', 'treme o corpo soltando um lamento agudo, com ondas no ar'),
  c('Black Knight', 'cavaleiro-negro', 'Cavaleiro Negro', 'um cavaleiro de armadura negra completa, elmo fechado com fenda vermelha brilhante, capa rasgada e uma espada de duas mãos', 'preto, vermelho brilhante, aço escuro', 'golpe de espada de duas mãos (erguer, descer, impacto, recolher)', 'finca a espada no chão e a fenda do elmo brilha'),
  c('Warlock', 'bruxo-da-cripta', 'Bruxo da Cripta', 'um bruxo poderoso de manto vermelho-escuro e dourado, gola alta, um grimório aberto flutuando ao lado e energia roxa nas mãos', 'vermelho-escuro, dourado, roxo', 'rajada arcana (folhear o grimório, juntar energia roxa nas mãos, disparar para a direita, recolher)', 'o grimório gira e páginas voam ao redor em círculo', true),
  c('Assassin', 'assassino', 'Assassino', 'um assassino encapuzado, de roupa preta justa, lenço cobrindo o rosto, e duas adagas curvas', 'preto, cinza-escuro, prata das lâminas', 'golpe duplo de adagas (agachar, avançar, cortar em cruz, recolher)', 'some numa nuvem de fumaça e reaparece no mesmo lugar'),
  c('Elf Scout', 'elfo-batedor', 'Elfo Batedor', 'um elfo esguio de orelhas pontudas, roupa de couro verde e marrom, capa curta com capuz, e um arco curto', 'verde, marrom, bege', 'tiro com o arco curto (puxar a flecha, retesar, soltar para a direita, baixar)', 'assobia um sinal com dois dedos'),
  c('Elf Arcanist', 'elfo-arcanista', 'Elfo Arcanista', 'um elfo de cabelo branco comprido, manto vermelho com detalhes dourados e uma varinha de cristal', 'vermelho, dourado, branco', 'feitiço de luz (erguer a varinha, o cristal brilha, dispara um raio para a direita, recolhe)', 'runas douradas giram em volta do corpo'),
  c('Monk', 'monge-renegado', 'Monge Renegado', 'um monge de cabeça raspada, hábito marrom com faixa laranja, pés descalços e as mãos enfaixadas', 'marrom, laranja, bege', 'sequência de socos (posição, soco direto, impacto, recolher)', 'posição de meditação em pé, com uma aura dourada'),
  c('Hero', 'heroi-caido', 'Herói Caído', 'um guerreiro lendário caído em desgraça: armadura dourada amassada e manchada, capa azul rasgada, cabelo comprido grisalho e uma espada larga com joia apagada', 'dourado gasto, azul, cinza', 'golpe de espada larga com giro (girar o corpo, golpear, impacto, recolher)', 'ergue a espada num cumprimento antigo e a joia pisca', true),
  c('Water Elemental', 'elemental-de-agua', 'Elemental de Água', 'uma criatura feita de água viva, de forma humanoide sem pernas saindo de uma onda, com olhos brancos e braços fluidos', 'azul, azul-claro, branco da espuma', 'jato de água (juntar as mãos, formar a esfera, lançar o jato para a direita, recolher)', 'o corpo vira uma onda alta e volta'),
  c('Young Sea Serpent', 'serpente-marinha', 'Serpente Marinha', 'uma serpente marinha de corpo longo azul-esverdeado, barbatanas em leque na cabeça e escamas brilhantes, saindo de uma poça de água', 'azul-esverdeado, turquesa, branco', 'bote (recuar o pescoço, dar o bote, morder, recolher)', 'abre as barbatanas da cabeça e cospe um jato de água para cima'),
  c('Slime', 'gosma-primordial', 'Gosma Primordial', 'uma gosma grande e translúcida, verde-clara, com bolhas dentro, dois olhos simples e ossinhos flutuando no interior', 'verde-claro translúcido, verde-escuro, branco', 'pancada (esticar o corpo para cima, cair para a frente, espalhar, recolher)', 'borbulha e se divide em duas por um instante, depois se junta'),
  c('Infernatil', 'infernatil', 'Infernatil', 'um senhor demoníaco elemental: corpo de rocha negra rachada com lava nas fendas, quatro chifres, um braço de fogo, um de gelo, e uma coroa de chamas', 'preto-rocha, laranja-lava, azul-gelo', 'golpe elemental (erguer os dois braços, juntar fogo e gelo, descarregar para a direita, recolher)', 'a coroa de chamas cresce e os quatro elementos giram ao redor', true),
  c('Verminor', 'verminor', 'Verminor', 'um senhor da praga das geleiras: criatura alta e curvada, de carapaça de inseto azul-acinzentada coberta de gelo, várias patas finas, mandíbulas e uma nuvem de insetos congelados em volta', 'azul-acinzentado, branco-gelo, verde doentio', 'ferroada com névoa de praga (erguer as patas, avançar, cravar o ferrão, recolher)', 'abre a carapaça e solta o enxame congelado ao redor', true),
  c('Apocalypse', 'apocalypse', 'Apocalypse', 'o fim de todas as coisas: uma besta colossal de quatro patas, de corpo negro-arroxeado com veios vermelhos pulsando, chifres enormes voltados para a frente, cauda com espinhos e olhos azul-brancos', 'negro-arroxeado, vermelho pulsante, azul-branco', 'investida devastadora (recuar com os veios acendendo, investir de chifres, impacto com onda de choque, recolher)', 'ergue-se e solta um rugido que escurece tudo em volta', true),
];

const have = name => fs.existsSync(path.join(dir, `${name}.png`));
const format = (who, sizeRule) => `Formato obrigatório:
- Imagem de 1024 x 1536 pixels, fundo totalmente transparente (PNG), limpo, sem halo colorido nas bordas.
- Grade exata de 4 colunas por 6 linhas. Cada quadro tem 256 x 256 pixels. Sem linhas de grade, sem bordas, sem texto, sem números, sem sombra no chão.
- ${who} olha para a DIREITA em todos os quadros.
- ${sizeRule} Nada pode encostar ou passar da borda do quadro, nem os efeitos de magia.`;
const style = (palette, who) => `Estilo: pixel art nítido de 32 bits, contorno escuro de 1 pixel, paleta limitada (${palette}), luz vindo de cima à esquerda, sem anti-aliasing borrado e sem degradê suave. Mesmo estilo de um cavaleiro de armadura de aço escuro e capa vinho já usado no jogo. ${who}, com as mesmas cores e proporções, em todos os 24 quadros.`;
export const heroPrompt = h => `Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: ${h.look}. Design próprio, sem copiar nenhum jogo existente.

${format('O personagem', 'Mesmo tamanho de personagem em todos os quadros, ocupando cerca de 70% da altura do quadro, com os pés na mesma linha de base e centralizado na horizontal.')}
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parado, respirando (leve balanço do corpo).
  Linha 2: correndo para a direita.
  Linha 3: ${h.attack}.
  Linha 4: ${h.defend}.
  Linha 5: ${h.special}.
  Linha 6: dois quadros levando um golpe e sendo empurrado para trás, depois dois quadros caindo e deitado no chão.

${style(h.palette, 'O mesmo personagem')}`;
export const creaturePrompt = m => `Crie uma sprite sheet de pixel art para um jogo de RPG por turnos visto de lado.

Personagem: uma criatura original chamada ${m.name}: ${m.look}. Design próprio, sem copiar nenhum jogo existente.

${format('A criatura', m.boss ? 'É um chefe: mesmo tamanho em todos os quadros, ocupando cerca de 85% do quadro, com a base na mesma linha e centralizada na horizontal.' : 'Mesmo tamanho em todos os quadros, ocupando cerca de 70% do quadro, com a base na mesma linha e centralizada na horizontal.')}
- Cada linha é uma animação de 4 quadros em sequência, da esquerda para a direita:
  Linha 1: parada, respirando (leve balanço do corpo).
  Linha 2: avançando para a direita.
  Linha 3: ${m.attack}.
  Linha 4: defesa (recua, encolhe o corpo e segura a posição).
  Linha 5: ${m.special}.
  Linha 6: dois quadros levando um golpe e sendo empurrada para trás, depois dois quadros caindo e deitada no chão.

${style(m.palette, 'A mesma criatura')}`;

async function usedBy() {
  // Quais criaturas do catálogo usam cada sprite (só para a tabela do ART.md; se o catálogo não puder ser lido, a coluna fica vazia).
  try {
    const text = fs.readFileSync(path.join(root, 'backend/prisma/catalog.ts'), 'utf8'), map = new Map();
    for (const row of text.matchAll(/\{ name: '([^']+)', level: (\d+),[^}]*\}/g)) {
      const key = row[0].match(/sprite: '([^']+)'/)?.[1] ?? row[1];
      map.set(key, [...(map.get(key) ?? []), `${row[1]} (nv. ${row[2]})`]);
    }
    return map;
  } catch { return new Map(); }
}

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  const sheets = { heroes: Object.fromEntries(heroes.filter(h => have(h.file)).map(h => [h.key, h.file])), monsters: Object.fromEntries(creatures.filter(m => have(m.file)).map(m => [m.key, m.file])) };
  fs.writeFileSync(path.join(root, 'frontend/src/lib/spriteSheets.json'), JSON.stringify(sheets, null, 2) + '\n');
  const uses = await usedBy(), all = [...heroes, ...creatures], done = all.filter(a => have(a.file)).length;
  const mark = a => have(a.file) ? 'feito' : 'falta';
  const block = (a, prompt) => `### ${a.name} · \`${a.file}.png\` · ${mark(a)}\n\n\`\`\`\n${prompt}\n\`\`\`\n`;
  const md = `# Arte própria de O Confronto

> Arquivo gerado por \`npm run art\` a partir de \`scripts/art.mjs\`. Para mudar um comando, edite a lista naquele arquivo e rode de novo.

A arena de batalha está trocando os sprites do TibiaWiki por arte própria. Cada personagem vem numa folha só, sempre no mesmo formato. Hoje **${done} de ${all.length}** folhas estão prontas.

## Como usar
1. Copie o comando inteiro do personagem e cole no ChatGPT (gere um personagem por vez).
2. Salve o PNG em \`frontend/public/assets/sprites/\` com o nome indicado no título do comando.
3. Rode \`npm run build\` (ou o \`iniciar.bat\`). O jogo passa a usar a folha sozinho; quem ainda não tem folha continua com o sprite antigo.

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
${heroes.map(h => `| \`${h.file}.png\` | ${h.name} | Herói | ${mark(h)} | vocação ${h.name} |`).join('\n')}
${creatures.map(m => `| \`${m.file}.png\` | ${m.name} | ${m.boss ? 'Chefe' : 'Criatura'} | ${mark(m)} | ${(uses.get(m.key) ?? [m.key]).join(', ')} |`).join('\n')}

## Heróis

${heroes.map(h => block(h, heroPrompt(h))).join('\n')}
## Criaturas

Os nomes novos são da arte. As criaturas das Eras e de Capriel usam a mesma folha da criatura original.

${creatures.map(m => block(m, creaturePrompt(m))).join('\n')}`;
  fs.writeFileSync(path.join(root, 'ART.md'), md);
  console.log(`ART.md: ${all.length} artes, ${done} prontas. Folhas ligadas: ${[...Object.values(sheets.heroes), ...Object.values(sheets.monsters)].join(', ') || 'nenhuma'}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
