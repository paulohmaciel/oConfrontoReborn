// Arte própria das criaturas e dos heróis. `npm run art` grava a folha da arena (assets/sprites/<arquivo>.webp), o retrato
// de 128 px usado fora dela (assets/sprites/retratos/<arquivo>.webp) e a lista do que existe (spriteSheets.json).
import sheets from './spriteSheets.json';
import manifest from '../../public/assets/tibia/manifest.json';

const heroes: Record<string, string> = sheets.heroes, monsters: Record<string, string> = sheets.monsters, shots: Record<string, string> = sheets.shots;
const nameOfPath = new Map(manifest.entries.map(e => [e.path, e.name]));

/**
 * O arquivo (sem extensão) da arte própria de uma criatura, ou `undefined` se ela ainda usa o sprite do TibiaWiki.
 * As criaturas das Eras e de Capriel usam o sprite da original; por isso a busca é pelo sprite e só depois pelo nome.
 */
export const creatureFile = (name: string, spritePath?: string): string | undefined => monsters[nameOfPath.get(spritePath ?? '') ?? ''] ?? monsters[name];
/** O arquivo da arte própria do herói de uma vocação-base (KNIGHT, PALADIN, SORCERER, DRUID). */
export const heroFile = (baseVocation: string): string | undefined => heroes[baseVocation];
/** O que voa quando a criatura ataca de longe (nome de ícone do GameIcon), ou `undefined` se ela bate de perto. */
export const creatureShot = (name: string, spritePath?: string): string | undefined => shots[creatureFile(name, spritePath) ?? ''];
export const sheetUrl = (file?: string) => file ? `/assets/sprites/${file}.webp` : undefined;
export const portraitUrl = (file?: string) => file ? `/assets/sprites/retratos/${file}.webp` : undefined;
