// Falas dos chefes, pela chave do nome no catálogo. `intro` aparece na batalha durante a fase 1; `rage` entra no registro
// do turno em que o chefe cai para metade da vida e fica em fúria (regra em shared/statusEffects.ts, `bossRage`).
// Chefe sem fala aqui usa o texto genérico. Só texto: nenhuma regra de combate mora neste arquivo.
export const bossLines: Record<string, { intro: string; rage: string }> = {
  'Guardião da Pedreira': { intro: 'O gigante de um olho só ergue a clava. Ninguém passa pela pedreira sem pagar em sangue.', rage: 'O Guardião urra e as paredes da pedreira tremem. Cada golpe agora vem com o peso da montanha!' },
  'Dragon Lord': { intro: 'As ruínas ardem sob as asas do Senhor dos Dragões. Ele ainda não se dignou a olhar para você.', rage: 'Ferido, o Dragon Lord abre as asas e o ar vira brasa. Agora ele está olhando para você!' },
  'Orc Leader': { intro: 'O Líder Orc bate o machado no escudo e o acampamento inteiro responde com tambores.', rage: 'O Líder Orc arranca o elmo amassado e avança espumando. Os tambores aceleram!' },
  'Demon': { intro: 'Os portões do abismo se abrem e o Demônio sorri. Ele esperava visita.', rage: 'O sorriso do Demônio some. As chamas em volta dele dobram de altura!' },
  'Giant Spider': { intro: 'No fundo da teia, oito olhos acompanham cada passo seu. O pântano inteiro está em silêncio.', rage: 'A Aranha Gigante rompe a própria teia e desce sobre você, com as presas pingando veneno!' },
  'Warlock': { intro: 'O Bruxo fecha o grimório devagar. Os mortos da cripta se viram na sua direção.', rage: 'O Bruxo rasga uma página do grimório e a devora. A cripta se enche de vozes!' },
  'Hero': { intro: 'O Herói caído ergue a espada num cumprimento antigo. Um dia ele jurou proteger esta cidadela.', rage: 'O Herói caído esquece o juramento e a técnica: só sobrou a fúria de quem perdeu tudo!' },
  'Infernatil': { intro: 'O santuário respira com Infernatil. O chão está quente o bastante para queimar as botas.', rage: 'Infernatil ruge e os quatro elementos respondem de uma vez. O santuário inteiro se volta contra você!' },
  'Demon da 1ª Era': { intro: 'Séculos sob as ruínas não enfraqueceram este demônio. Ele se lembra de quem o prendeu.', rage: 'O Demônio da 1ª Era quebra a última corrente. A raiva guardada por séculos enfim tem um alvo!' },
  'Verminor': { intro: 'O gelo eterno estala. Verminor acorda devagar, como quem tem todo o tempo do mundo.', rage: 'Verminor perde a paciência. A geleira racha de uma ponta a outra!' },
  'Infernatil da 3ª Era': { intro: 'Nesta cidadela que não existe mais, Infernatil reina sobre heróis esquecidos.', rage: 'As muralhas da cidadela desabam em chamas. Infernatil não vai deixar nada de pé, nem você!' },
  'Senhor dos Dragões da 4ª Era': { intro: 'No fundo do abismo, o mais velho dos dragões abre um olho do tamanho de um escudo.', rage: 'O Senhor dos Dragões se ergue por inteiro pela primeira vez em eras. O abismo fica pequeno!' },
  'Apocalypse': { intro: 'No fim do Vale da Perdição, Apocalypse espera. Tudo o que já existiu lutou até aqui; poucos voltaram.', rage: 'Apocalypse sangra, e isso nunca tinha acontecido. O vale inteiro escurece!' },
};
// Frase genérica que o motor escreve na virada de fase (backend/src/core/engine.ts); o serviço troca pela fala do chefe.
export const GENERIC_RAGE_LINE = 'Ferido, o chefe entra em fúria! Os golpes dele ficam mais fortes.';
