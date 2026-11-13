// Arte própria dos itens: GIFs animados de 128 px em public/assets/items, ligados pelo nome do arquivo.
// A lista do que existe (itemArt.json) é escrita por `npm run art`, que o build roda antes: salvar o GIF com o
// nome do item basta. Quem ainda não tem figura continua com o sprite do TibiaWiki (ui/GameIcon.tsx decide).
import art from './itemArt.json';

const files = new Set<string>(art.files);
/** Os itens que têm GIF próprio, pelo nome do arquivo, em ordem alfabética (para a Biblioteca de ícones). */
export const itemArtFiles: readonly string[] = art.files;

/** O nome do arquivo de um item: minúsculas, sem acento, com hífen. "Crossbow da 1ª Era" → "crossbow-da-1-era". */
export const itemFile = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ªº]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** O item-base de uma variante das Eras ou de Capriel: "Crossbow da 1ª Era" → "Crossbow". */
export const baseItem = (name: string) => name.replace(/ (?:da \dª Era|de Capriel)$/, '');

/**
 * O GIF próprio de um item, ou `null` se ainda não existe. Uma variante sem figura usa a do item-base,
 * como já fazia com o sprite antigo. `has` existe para os testes (padrão: a lista gravada pelo build).
 */
export function itemArt(name: string, has: (file: string) => boolean = f => files.has(f)): string | null {
  for (const candidate of [name, baseItem(name)]) {
    const file = itemFile(candidate);
    if (file && has(file)) return `/assets/items/${file}.gif`;
  }
  return null;
}
