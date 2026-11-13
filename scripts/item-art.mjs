#!/usr/bin/env node
// Arte própria dos itens: lista os GIFs que existem em frontend/public/assets/items e grava
// frontend/src/lib/itemArt.json. A tela (ui/GameIcon.tsx, pela lib/itemArt.ts) usa o GIF de quem está na lista
// e o sprite antigo de quem não está. Uso: npm run art (o build roda antes): basta salvar o GIF com o nome do item.
// O nome do arquivo é o nome do item em minúsculas, sem acento e com hífen: "Crossbow da 1ª Era" → crossbow-da-1-era.gif.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const itemsDir = path.join(root, 'frontend/public/assets/items');
export const listFile = path.join(root, 'frontend/src/lib/itemArt.json');

/** Os nomes (sem extensão) dos GIFs de uma pasta, em ordem alfabética. Só entram nomes no formato do jogo. */
export function gifNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^[a-z0-9]+(-[a-z0-9]+)*\.gif$/.test(f)).map(f => f.slice(0, -4)).sort();
}

/** Arquivos da pasta que não entram na lista: GIF com nome fora do formato (maiúscula, espaço, acento). */
export function oddNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.gif$/i.test(f) && !/^[a-z0-9]+(-[a-z0-9]+)*\.gif$/.test(f)).sort();
}

export function writeList(dir = itemsDir, file = listFile) {
  const files = gifNames(dir);
  fs.writeFileSync(file, JSON.stringify({ files }, null, 2) + '\n');
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = writeList(), odd = oddNames(itemsDir);
  console.log(`Itens com arte própria: ${files.length} (frontend/src/lib/itemArt.json).`);
  if (odd.length) console.log(`Fora do formato do nome (não entram): ${odd.join(', ')}`);
}
