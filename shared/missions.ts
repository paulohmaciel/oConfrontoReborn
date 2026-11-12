// Missões: nome, quem pede e a história de cada caçada. O banco continua usando o título "Caçada: <monstro>" como chave
// (é o que liga o progresso de cada jogador), então as histórias vivem aqui, ligadas pelo nome do monstro.
// Personagens e histórias foram criados para O Confronto.
export interface Mission { title: string; giver: string; story: string }

const m = (title: string, giver: string, story: string): Mission => ({ title, giver, story });
const missions: Record<string, Mission> = {
  // Campos do Amanhecer
  Rat: m('A praga do porão', 'Velho Tobias, fazendeiro', 'Os ratos tomaram o porão da minha fazenda e já roem até as sacas de sementes. Limpe aquilo antes que a colheita inteira vire comida de roedor.'),
  Bug: m('Zumbido nos trigais', 'Velho Tobias, fazendeiro', 'Besouros do tamanho de um punho estão devorando o trigo à noite. Se o campo morrer, Capriel passa fome no inverno.'),
  Wolf: m('Uivos perto do curral', 'Pastora Mira', 'Toda lua cheia some uma ovelha do meu rebanho, e os uivos chegam cada vez mais perto das casas. Mostre aos lobos que estes campos têm dono.'),
  Snake: m('Veneno na estrada', 'Mensageiro Pio', 'Três mensageiros foram picados na estrada do norte esta semana. Abra caminho entre as cobras para que as cartas voltem a chegar.'),
  Rotworm: m('O chão que se mexe', 'Minerador Grum', 'Os vermes estão cavando túneis sob a cidade e as paredes da adega já racharam. Desça e acabe com eles antes que alguma casa afunde.'),
  // Pedreira dos Gigantes
  'Guardião da Pedreira': m('O guardião de pedra', 'Minerador Grum', 'Um ciclope enorme se declarou dono da pedreira e esmaga quem chega perto. Ele anuncia o golpe antes de bater: defenda ou interrompa na hora certa.'),
  Orc: m('Saqueadores na trilha', 'Capitão Brennan, da guarda de Capriel', 'Bandos de orcs estão emboscando as carroças de pedra. A guarda não dá conta sozinha; precisamos de alguém disposto a ir até eles.'),
  Dwarf: m('Picaretas roubadas', 'Minerador Grum', 'Anões renegados levaram nossas melhores ferramentas e juram que a pedreira é deles por direito antigo. Recupere a paz, nem que seja à força.'),
  Minotaur: m('Chifres na passagem', 'Capitão Brennan, da guarda de Capriel', 'Minotauros desceram das colinas e bloquearam a passagem leste. Ninguém entra, ninguém sai. Abra essa porta.'),
  'Dwarf Soldier': m('A tropa da montanha', 'Capitão Brennan, da guarda de Capriel', 'Os anões agora marcham em formação, com escudos e lanças. Se não forem detidos, a pedreira vira fortaleza deles.'),
  Cyclops: m('Um olho, muita fome', 'Cozinheira Berta', 'Os ciclopes estão invadindo os depósitos de comida da pedreira. Os mineiros estão com fome e com medo. Resolva isso.'),
  'Dwarf Guard': m('A guarda de ferro', 'Ferreiro Doran', 'A guarda anã usa um aço que eu daria tudo para estudar. Derrote-os e me conte como lutam; dizem que nunca recuam.'),
  'Stone Golem': m('Pedra que anda', 'Sábio Elandor', 'Algo despertou as rochas mais fundas da pedreira. Golens de pedra caminham sem rumo e destroem tudo. Devolva-os ao sono.'),
  // Ruínas Flamejantes
  Skeleton: m('Ossos que não descansam', 'Sacerdotisa Lyra, do Templo de Capriel', 'Os mortos das ruínas se levantam toda noite. O Templo de Capriel pede que alguém os devolva ao descanso.'),
  Ghoul: m('Fome de cemitério', 'Coveiro Anselmo', 'Os carniçais estão abrindo as covas do cemitério velho. Já não sei mais quem está enterrado onde. Acabe com eles.'),
  Mummy: m('Bandagens antigas', 'Arquivista Mirela', 'As múmias das ruínas carregam pergaminhos de uma era esquecida. Derrote-as e traga notícias do que guardam.'),
  Bonelord: m('O olhar que paralisa', 'Sábio Elandor', 'Os senhores dos ossos enxergam através das paredes com seus muitos olhos. Quem os encara demais esquece o próprio nome. Vá preparado.'),
  Dragon: m('Fumaça no horizonte', 'Capitão Brennan, da guarda de Capriel', 'Um dragão queimou três vilas este mês. Leve proteção contra fogo e não volte até a fumaça sumir do horizonte.'),
  'Dragon Lord': m('O senhor das cinzas', 'Comandante Vargas', 'O Senhor dos Dragões comanda os outros como um rei. Enquanto ele viver, as ruínas não vão parar de queimar.'),
  // Acampamento Orc
  'Orc Spearman': m('Lanças na paliçada', 'Batedora Kael', 'Os lanceiros orcs defendem a entrada do acampamento. Abra uma brecha para que a guarda consiga avançar.'),
  'Orc Warrior': m('O teste dos guerreiros', 'Batedora Kael', 'Os guerreiros orcs só respeitam quem os vence em combate. Ganhe esse respeito, do único jeito que eles entendem.'),
  'Orc Shaman': m('Tambores e feitiços', 'Sábio Elandor', 'Os xamãs orcs invocam tempestades com seus tambores. Cale os tambores antes que a próxima tempestade chegue a Capriel.'),
  Amazon: m('As guerreiras do norte', 'Batedora Kael', 'As amazonas fizeram aliança com os orcs e agora vigiam as trilhas. Ninguém passa sem pagar pedágio em sangue.'),
  'Orc Berserker': m('A fúria sem freio', 'Comandante Vargas', 'Os berserkers não sentem dor e atacam até cair. Mantenha a calma, cure na hora certa e deixe a fúria deles se esgotar.'),
  Valkyrie: m('Escudos alados', 'Batedora Kael', 'As valquírias treinam as amazonas e as tornam ainda mais perigosas. Derrote as mestras e as alunas vão hesitar.'),
  'Orc Leader': m('A cabeça do acampamento', 'Comandante Vargas', 'O Líder Orc une todas as tribos. Derrube-o e o acampamento se dispersa. Ele avisa antes do golpe pesado: não ignore o aviso.'),
  // Labirinto dos Minotauros
  'Minotaur Archer': m('Flechas nas curvas', 'Cartógrafa Isolde', 'Estou tentando mapear o labirinto, mas os arqueiros minotauros atiram de cada curva. Abra caminho para o meu mapa.'),
  'Minotaur Mage': m('Magia de chifre', 'Sábio Elandor', 'Os magos minotauros aprenderam feitiços que não deviam conhecer. Descubra de onde vem esse poder, derrotando quem o usa.'),
  'Minotaur Guard': m('Os guardiões do centro', 'Cartógrafa Isolde', 'No coração do labirinto, guardas minotauros protegem algo que ninguém nunca viu. Chegue lá antes de mim.'),
  // Portões do Abismo
  'Demon Skeleton': m('Ossos com chamas', 'Sacerdotisa Lyra, do Templo de Capriel', 'Esqueletos tocados pelo abismo queimam por dentro. O Templo de Capriel pede que alguém feche essa ferida no mundo.'),
  'Fire Devil': m('Diabretes de brasa', 'Ferreiro Doran', 'Os diabretes de fogo roubam brasas da minha forja à noite. Proteção contra fogo, coragem e um bom escudo: é tudo de que você precisa.'),
  'Fire Elemental': m('O fogo que pensa', 'Sábio Elandor', 'Elementais de fogo saíram do abismo e queimam por vontade própria. Apague-os antes que aprendam a se multiplicar.'),
  Demon: m('O portão aberto', 'Comandante Vargas', 'Um demônio atravessou os portões. Se ele ficar, outros virão. Esta é a missão mais perigosa que Capriel já pediu a alguém.'),
  // Terras Geladas
  'Frost Troll': m('Trolls na nevasca', 'Lenhador Haakon', 'Trolls do gelo atacam quem tenta cortar lenha nas Terras Geladas. Sem lenha, Capriel congela no inverno.'),
  'Winter Wolf': m('Matilha branca', 'Pastora Mira', 'Os lobos do inverno são maiores, mais rápidos e caçam em silêncio. Os que vimos nos campos eram filhotes perto destes.'),
  'Polar Bear': m('O urso da geleira', 'Lenhador Haakon', 'Um urso polar fez ninho na única passagem pela geleira. Ele não ataca por fome; ataca por território.'),
  Mammoth: m('Passos que tremem a neve', 'Cartógrafa Isolde', 'Mamutes enfurecidos derrubam pontes de gelo e soterram trilhas. Acalme a manada, do jeito que der.'),
  // Pântano Sombrio
  'Swamp Troll': m('Trolls do lodo', 'Herbalista Nessa', 'Os trolls do pântano pisoteiam as ervas raras que curam febre. Sem elas, o Templo fica sem remédios.'),
  'Killer Caiman': m('Olhos na água parada', 'Herbalista Nessa', 'Crocodilos assassinos esperam sob a água, imóveis. Quando você os vir, eles já terão visto você.'),
  Witch: m('O caldeirão do pântano', 'Sacerdotisa Lyra, do Templo de Capriel', 'Bruxas estão envenenando o pântano com suas poções. O Templo de Capriel quer o caldeirão delas apagado.'),
  'Giant Spider': m('A teia no fundo', 'Herbalista Nessa', 'No fundo do pântano, a Aranha Gigante tece uma teia que prende até a luz. Quem entra não costuma voltar. Ela avisa antes do golpe: escute.'),
  // Cripta Esquecida
  Necromancer: m('Os que erguem os mortos', 'Sacerdotisa Lyra, do Templo de Capriel', 'Necromantes se esconderam na Cripta Esquecida e erguem mortos todas as noites. Quebre o ciclo pela raiz.'),
  'Wailing Widow': m('O choro na escuridão', 'Coveiro Anselmo', 'Ouve-se um choro vindo da cripta, e quem segue o som não volta. Não é uma viúva de verdade. Vá armado.'),
  'Black Knight': m('A armadura vazia', 'Comandante Vargas', 'Um cavaleiro de armadura negra guarda os salões da cripta. Dizem que ele foi o melhor de Capriel, antes de cair.'),
  Warlock: m('O bruxo do último salão', 'Sábio Elandor', 'O Bruxo comanda os necromantes e guarda o último salão da cripta. Ele concentra o golpe antes de lançar: aproveite o instante.'),
  // Cidadela dos Renegados
  Assassin: m('Lâminas na sombra', 'Capitão Brennan, da guarda de Capriel', 'Assassinos da cidadela estão marcando nomes da guarda de Capriel. Encontre-os antes que eles encontrem mais alguém.'),
  'Elf Scout': m('Olhos nas árvores', 'Batedora Kael', 'Batedores elfos exilados vigiam cada estrada que leva à cidadela. Passe por eles e mostre que a vigília falhou.'),
  'Elf Arcanist': m('Magia exilada', 'Arquivista Mirela', 'Os arcanistas elfos foram expulsos por usar magia proibida. Agora a usam contra nós. Feche esses livros para sempre.'),
  Monk: m('Punhos sem ordem', 'Sacerdotisa Lyra, do Templo de Capriel', 'Monges que abandonaram seus votos treinam na cidadela. A disciplina deles virou violência. Devolva a paz ao mosteiro.'),
  Hero: m('O herói caído', 'Comandante Vargas', 'Ele salvou Capriel uma vez. Hoje comanda a muralha dos renegados. Derrotá-lo é a única forma de honrar quem ele foi.'),
  // Santuário Elemental
  'Water Elemental': m('Água que se rebela', 'Sábio Elandor', 'As fontes do santuário ganharam vontade própria e afogam quem se aproxima. Restaure o equilíbrio dos elementos.'),
  'Young Sea Serpent': m('Escamas no lago sagrado', 'Sacerdotisa Lyra, do Templo de Capriel', 'Uma serpente marinha chegou ao lago sagrado e cresce a cada dia. Melhor enfrentá-la agora do que quando for adulta.'),
  'Elemental de Fogo Ancestral': m('A primeira chama', 'Ferreiro Doran', 'Dizem que este elemental acendeu a primeira forja do mundo. Se você o vencer, até eu vou querer ouvir a história.'),
  'Golem Ancestral': m('O guardião que esqueceu', 'Arquivista Mirela', 'Um golem mais velho que Capriel ainda protege o santuário, mas já não lembra de quem. Liberte-o desse dever.'),
  'Gosma Primordial': m('O começo de tudo', 'Sábio Elandor', 'Estudiosos acreditam que esta gosma é o que sobrou da criação do mundo. Ela também é faminta. Muito faminta.'),
  'Serpente Abissal': m('Das profundezas', 'Cartógrafa Isolde', 'Uma serpente subiu das águas mais fundas do santuário e não há mapa que mostre de onde veio. Descubra, vencendo-a.'),
  'Dragão Ancião': m('As asas mais velhas', 'Comandante Vargas', 'O Dragão Ancião já era velho quando o Senhor dos Dragões nasceu. Leve tudo o que tem contra fogo.'),
  Infernatil: m('O altar em chamas', 'Sacerdotisa Lyra, do Templo de Capriel', 'Infernatil tomou o altar do santuário. Enquanto ele estiver lá, os elementos não terão paz. Ele avisa antes do golpe: escute e se defenda.'),
  // Chefes das Eras
  'Demon da 1ª Era': m('O primeiro demônio', 'Arquivista Mirela', 'As crônicas falam de um demônio da 1ª Era, mais antigo que os portões do abismo. Ele voltou. As crônicas não dizem como vencê-lo.'),
  Verminor: m('A peste da nevasca', 'Herbalista Nessa', 'Verminor espalha a peste pelas geleiras da 2ª Era. Nenhuma erva cura o que ele traz. Só resta enfrentá-lo.'),
  'Infernatil da 3ª Era': m('Chamas de outra era', 'Ferreiro Doran', 'O Infernatil que você venceu era só um eco. Este é o original, da 3ª Era, e queima mais forte do que qualquer forja.'),
  'Senhor dos Dragões da 4ª Era': m('O rei de todas as asas', 'Comandante Vargas', 'No fundo do abismo da 4ª Era, um dragão governa todos os outros. Se ele cair, as asas param de bater sobre Capriel.'),
  Apocalypse: m('O fim do vale', 'Sacerdotisa Lyra, do Templo de Capriel', 'No fim do Vale da Perdição espera Apocalypse. Ninguém que chegou até ele voltou para contar. Seja o primeiro.'),
};

// Missões das Eras: a introdução e quem pede mudam por Era; o gancho vem da missão original do monstro.
const eras = [
  { giver: 'Arquivista Mirela', intro: 'A 1ª Era despertou e trouxe de volta as criaturas que você já conhecia, agora séculos mais fortes.' },
  { giver: 'Lenhador Haakon', intro: 'O gelo da 2ª Era cobriu o mundo, e o que vive nele ficou cruel e resistente.' },
  { giver: 'Comandante Vargas', intro: 'A cidadela da 3ª Era se ergueu das ruínas, defendida por guerreiros de um tempo esquecido.' },
  { giver: 'Sábio Elandor', intro: 'O abismo da 4ª Era se abriu sob os pés de Capriel, e dele sobe o que havia de pior.' },
  { giver: 'Sacerdotisa Lyra, do Templo de Capriel', intro: 'No Vale da Perdição, tudo o que já existiu luta em sua forma final. Poucos voltam.' },
];
const firstSentence = (text: string) => text.match(/^[^.!?]+[.!?]/)?.[0] ?? text;

export function missionFor(monsterName: string): Mission {
  const own = missions[monsterName];
  if (own) return own;
  const era = monsterName.match(/^(.+) da (\d)ª Era$/), capriel = monsterName.match(/^(.+) de Capriel$/);
  const baseName = era?.[1] ?? capriel?.[1], index = era ? Number(era[2]) - 1 : capriel ? 4 : -1;
  const base = baseName ? missions[baseName] : undefined;
  if (base && eras[index]) return m(`${base.title} (${index < 4 ? `${index + 1}ª Era` : 'Vale da Perdição'})`, eras[index].giver, `${eras[index].intro} ${firstSentence(base.story)}`);
  return m(`Caçada: ${monsterName}`, 'Mural de missões de Capriel', `Há relatos de ${monsterName} atacando viajantes. Capriel paga bem a quem resolver o problema.`);
}
