#!/usr/bin/env node
// Versões de site da arte própria.
// Os originais (PNG grandes, como saem do gerador de imagens) ficam em art/, fora do que o site serve. Este módulo limpa cada
// folha e grava a versão leve (WebP) em frontend/public/assets. É chamado por scripts/art.mjs (`npm run art`, `npm run build`).
// De cada folha sai também o retrato (primeiro quadro, enquadrado, 128 px) que as listas do jogo mostram fora da arena.
// Só refaz o que mudou: art/web.json guarda o SHA-256 de cada original e a receita usada.
//   node scripts/art-web.mjs --conferir   mostra o que a limpeza faria em cada folha, sem gravar nada
//   node scripts/art-web.mjs --refazer    refaz todas as versões de site
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Mude ao alterar a limpeza ou a compressão: todas as saídas são refeitas no próximo build.
export const RECIPE = 1;
// Receita do retrato (enquadramento e tamanho); mudar refaz só os retratos, sem recomprimir as folhas.
const PORTRAIT = 1, PORTRAIT_SIDE = 128;
const COLS = 4, ROWS = 6, SHEET_W = 1024, SHEET_H = 1536;
// O gerador devolve o fundo com uma névoa quase invisível (alfa 1 a 15) e o corpo com alfa 240 a 254. A névoa pesa no arquivo
// e suja o contorno; a curva abaixo zera o que é névoa, deixa o corpo opaco e preserva a suavização das bordas.
const ALPHA_LOW = 16, ALPHA_HIGH = 236;
// Linha em que os pés ficam na maioria das folhas (de 0 a 255, dentro do quadro). Folha fora disso é realinhada.
const BASELINE = 218, BASELINE_SLACK = 3;
// Faixa junto à borda de cima e de baixo do quadro onde só aparece sobra do quadro vizinho (ponta de chifre, de chama, de arma).
const BAND = 22;

const lut = Uint8Array.from({ length: 256 }, (_, a) => a <= ALPHA_LOW ? 0 : a >= ALPHA_HIGH ? 255 : Math.round((a - ALPHA_LOW) * 255 / (ALPHA_HIGH - ALPHA_LOW)));

export async function loadSharp() { try { return (await import('sharp')).default; } catch { return null; } }
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const kb = n => `${Math.round(n / 1024)} KB`;

// Grava um arquivo de texto gerado só quando o conteúdo mudou, respeitando o fim de linha que o arquivo já tem
// (no Windows o git entrega CRLF): assim o build não deixa arquivos "modificados" que são iguais.
export function writeText(file, text) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (old !== null && old.replace(/\r\n/g, '\n') === text) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, old?.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text);
  return true;
}

// Ilhas de pixels visíveis de um quadro (vizinhança de 8). Devolve a área, a caixa e o alfa máximo de cada uma, e a lista de pixels.
function islands(px, w, cx, cy, fw, fh) {
  const seen = new Uint8Array(fw * fh), stack = new Int32Array(fw * fh), order = new Int32Array(fw * fh), list = [];
  let filled = 0;
  for (let start = 0; start < fw * fh; start++) {
    if (seen[start] || !px[((cy + Math.floor(start / fw)) * w + cx + start % fw) * 4 + 3]) continue;
    let top = 0, from = filled, minX = fw, minY = fh, maxX = -1, maxY = -1, maxA = 0;
    stack[top++] = start; seen[start] = 1;
    while (top) {
      const p = stack[--top], x = p % fw, y = (p - x) / fw, a = px[((cy + y) * w + cx + x) * 4 + 3];
      order[filled++] = p;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; if (a > maxA) maxA = a;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
        const q = ny * fw + nx; if (seen[q] || !px[((cy + ny) * w + cx + nx) * 4 + 3]) continue;
        seen[q] = 1; stack[top++] = q;
      }
    }
    list.push({ from, to: filled, area: filled - from, minX, minY, maxX, maxY, maxA });
  }
  return { list, order };
}

// Limpa uma folha no lugar (px = RGBA) e conta o que fez.
export function cleanSheet(px, w, h) {
  const fw = w / COLS, fh = h / ROWS, stats = { haze: 0, bleed: 0, specks: 0, shift: 0 };
  for (let i = 3; i < px.length; i += 4) { const a = px[i], b = lut[a]; if (a && !b) stats.haze++; px[i] = b; }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cx = c * fw, cy = r * fh, { list, order } = islands(px, w, cx, cy, fw, fh);
    if (list.length < 2) continue;
    const biggest = Math.max(...list.map(i => i.area));
    for (const i of list) {
      if (i.area === biggest) continue;
      // Sobra do quadro de cima ou de baixo: ilha inteira dentro da faixa da borda. Poeira: ilha miúda e fraca, longe de tudo.
      const bleed = i.minY >= fh - BAND || i.maxY < BAND, speck = i.area <= 40 && i.maxA < 110;
      if (!bleed && !speck) continue;
      for (let k = i.from; k < i.to; k++) { const p = order[k]; px[((cy + Math.floor(p / fw)) * w + cx + p % fw) * 4 + 3] = 0; }
      bleed ? stats.bleed++ : stats.specks++;
    }
  }
  // Linha dos pés: a base (pixel opaco mais baixo) dos quadros das linhas 1 a 5; a 6 é a queda.
  const bases = [], tops = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    let top = -1, base = -1;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (px[((r * fh + y) * w + c * fw + x) * 4 + 3] >= 128) { if (top < 0) top = y; base = y; }
    if (base < 0) continue; tops.push(top); if (r < ROWS - 1) bases.push(base);
  }
  bases.sort((a, b) => a - b);
  const base = bases.length ? bases[bases.length >> 1] : BASELINE, room = tops.length ? Math.min(...tops) : 0;
  // Só sobe (folha com os pés baixos demais afunda no chão da arena); nunca corta o topo de nenhum quadro.
  const up = Math.min(base - BASELINE, room);
  if (base - BASELINE > BASELINE_SLACK && up > 0) {
    const row = fw * 4;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (let y = 0; y < fh; y++) {
      const dst = ((r * fh + y) * w + c * fw) * 4;
      if (y + up < fh) px.copy(px, dst, dst + up * w * 4, dst + up * w * 4 + row); else px.fill(0, dst, dst + row);
    }
    stats.shift = up;
  }
  // Pixel invisível não precisa de cor: zerar ajuda a compressão e evita contorno colorido ao reduzir a imagem.
  for (let i = 0; i < px.length; i += 4) if (!px[i + 3]) px[i] = px[i + 1] = px[i + 2] = 0;
  return stats;
}

const webp = { quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true };

// Retrato: o desenho do primeiro quadro (parado), centralizado num quadrado com um pouco de folga.
async function portrait(sharp, px, w, fw, fh) {
  let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (px[(y * w + x) * 4 + 3] >= 32) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const side = Math.round(Math.max(x1 - x0 + 1, y1 - y0 + 1) * 1.08), ox = Math.round((x0 + x1 + 1 - side) / 2), oy = Math.round((y0 + y1 + 1 - side) / 2), sq = Buffer.alloc(side * side * 4);
  for (let y = Math.max(0, -oy); y < side && oy + y < fh; y++) {
    const from = Math.max(0, -ox), to = Math.min(side, fw - ox);
    px.copy(sq, (y * side + from) * 4, ((oy + y) * w + ox + from) * 4, ((oy + y) * w + ox + to) * 4);
  }
  return sharp(sq, { raw: { width: side, height: side, channels: 4 } }).resize(PORTRAIT_SIDE, PORTRAIT_SIDE, { kernel: 'lanczos3' }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
}

// Folhas da arena: art/sprites/<nome>.png → frontend/public/assets/sprites/<nome>.webp e retratos/<nome>.webp.
// PNG novo salvo na pasta do site (como o ART.md pedia antes) é levado para art/sprites e tratado igual.
export async function buildSheets(root, { log = console.log, force = false, dryRun = false } = {}) {
  const sharp = await loadSharp(), src = path.join(root, 'art/sprites'), out = path.join(root, 'frontend/public/assets/sprites');
  const manifestFile = path.join(root, 'art/web.json');
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { recipe: RECIPE, sheets: {} };
  manifest.sheets ??= {};
  if (!sharp) { log('Arte: a biblioteca sharp não está instalada (npm ci); as versões de site já gravadas continuam valendo.'); return { sharp: false, made: 0 }; }
  const faces = path.join(out, 'retratos');
  fs.mkdirSync(src, { recursive: true }); fs.mkdirSync(faces, { recursive: true });
  for (const n of fs.readdirSync(out).filter(n => n.endsWith('.png'))) {
    const meta = await sharp(path.join(out, n)).metadata().catch(() => null);
    if (meta?.width !== SHEET_W || meta?.height !== SHEET_H) { log(`Arte: ${n} não tem ${SHEET_W}×${SHEET_H} (${meta ? `${meta.width}×${meta.height}` : 'ilegível'}); ficou onde estava e não entra no jogo.`); continue; }
    if (dryRun) continue;
    fs.renameSync(path.join(out, n), path.join(src, n)); log(`Arte: ${n} guardado em art/sprites.`);
  }
  const from = dryRun ? [src, out] : [src], names = [...new Set(from.flatMap(d => fs.existsSync(d) ? fs.readdirSync(d).filter(n => n.endsWith('.png')).map(n => n.slice(0, -4)) : []))].sort();
  let made = 0, drawn = 0, before = 0, after = 0;
  for (const name of names) {
    const file = [src, out].map(d => path.join(d, `${name}.png`)).find(f => fs.existsSync(f)), target = path.join(out, `${name}.webp`), face = path.join(faces, `${name}.webp`), hash = sha(file), known = manifest.sheets[name];
    const fresh = !force && manifest.recipe === RECIPE && known?.sha256 === hash;
    const needSheet = !fresh || !fs.existsSync(target), needFace = needSheet || known?.portrait !== PORTRAIT || !fs.existsSync(face);
    if (!dryRun && !needSheet && !needFace) continue;
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== SHEET_W || info.height !== SHEET_H) { log(`Arte: ${name}.png não tem ${SHEET_W}×${SHEET_H}; ignorado.`); continue; }
    const stats = cleanSheet(data, info.width, info.height), size = fs.statSync(file).size;
    const notes = [stats.bleed && `${stats.bleed} sobra(s) do quadro vizinho`, stats.specks && `${stats.specks} poeira(s)`, stats.shift && `subiu ${stats.shift}px`].filter(Boolean).join(', ');
    if (dryRun) { log(`${name.padEnd(24)} névoa ${(stats.haze / (info.width * info.height) * 100).toFixed(1).padStart(4)}%${notes ? ' · ' + notes : ''}`); continue; }
    if (needSheet) {
      const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp(webp).toBuffer();
      fs.writeFileSync(target, buf); manifest.sheets[name] = { sha256: hash, bytes: buf.length };
      made++; before += size; after += buf.length;
      log(`Arte: ${name}.webp ${kb(size)} → ${kb(buf.length)}${notes ? ' (' + notes + ')' : ''}`);
    }
    const pic = await portrait(sharp, data, info.width, info.width / COLS, info.height / ROWS);
    if (pic) { fs.writeFileSync(face, pic); manifest.sheets[name].portrait = PORTRAIT; drawn++; }
  }
  if (dryRun) return { sharp: true, made: 0 };
  // Versão de site cujo original sumiu: sai junto (só as que este script criou).
  for (const name of Object.keys(manifest.sheets)) if (!names.includes(name)) { fs.rmSync(path.join(out, `${name}.webp`), { force: true }); fs.rmSync(path.join(faces, `${name}.webp`), { force: true }); delete manifest.sheets[name]; log(`Arte: ${name}.webp removido (o original não existe mais).`); }
  manifest.recipe = RECIPE; manifest.sheets = Object.fromEntries(Object.entries(manifest.sheets).sort(([a], [b]) => a.localeCompare(b)));
  writeText(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  if (made) log(`Arte: ${made} folha(s) preparada(s) para o site, ${kb(before)} → ${kb(after)}.`);
  if (drawn) log(`Arte: ${drawn} retrato(s) gravado(s) em frontend/public/assets/sprites/retratos.`);
  return { sharp: true, made, drawn };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  await buildSheets(root, { dryRun: process.argv.includes('--conferir'), force: process.argv.includes('--refazer') });
}
