#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const catalog = ['Rat','Rotworm','Cyclops','Dragon','Dragon Lord','Demon','Demon Helmet','Magic Plate Armor','Golden Legs','Boots of Haste','Mastermind Shield','Magic Longsword','Fire Sword','Platinum Amulet','Ring of the Sky','Backpack','Gold Coin','Health Potion','Mana Potion','Sword','Wooden Shield','Leather Armor','Leather Helmet','Bow','Wand of Vortex','Snakebite Rod','Wolf','Orc','Minotaur','Ghoul'];
const API = 'https://www.tibiawiki.com.br/api.php';
const PER_FILE = 2 * 1024 * 1024;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function safeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['www.tibiawiki.com.br','tibiawiki.com.br'].includes(url.hostname) || url.username || url.password || url.port)
    throw new Error('URL fora dos hosts HTTPS permitidos do TibiaWiki.');
  return url;
}
export function localName(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (!['.gif','.png','.webp','.jpg','.jpeg'].includes(ext)) throw new Error('Formato de sprite não suportado.');
  const label = filename.slice(0,-ext.length).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100) || 'sprite';
  return `${label}-${sha(filename).slice(0,8)}${ext}`;
}
export function validImage(buffer, mime) {
  if (mime === 'image/gif') return ['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString());
  if (mime === 'image/png') return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/webp') return buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP';
  if (mime === 'image/jpeg') return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  return false;
}
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file,'utf8')); } catch(e) { if(e.code === 'ENOENT') return fallback; throw e; } }
async function save(file, data) { await fs.writeFile(`${file}.tmp`, JSON.stringify(data,null,2)+'\n'); await fs.rename(`${file}.tmp`,file); }
async function bounded(url, limit) {
  let target = safeUrl(url);
  for (let hops=0; hops<4; hops++) {
    const response = await fetch(target, { redirect:'manual', signal:AbortSignal.timeout(20000), headers:{'User-Agent':'OConfrontoAssetImporter/1.0 (local game asset catalog; bounded cache)','Accept':'application/json,image/gif,image/png,image/webp,image/jpeg;q=0.9'} });
    if ([301,302,303,307,308].includes(response.status)) { await response.body?.cancel(); target=safeUrl(new URL(response.headers.get('location'),target)); continue; }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status} em ${target.pathname}; nenhum desafio de acesso será contornado.`); }
    if (Number(response.headers.get('content-length') || 0)>limit) { await response.body?.cancel(); throw new Error('Arquivo acima do limite.'); }
    const reader=response.body.getReader(); const chunks=[];let size=0;
    try { for (;;) { const {done,value}=await reader.read(); if(done) break;size+=value.byteLength;if(size>limit) throw new Error('Resposta acima do limite.');chunks.push(value); } }
    finally { await reader.cancel(); }
    return { bytes:Buffer.concat(chunks), mime:(response.headers.get('content-type')||'').split(';')[0], url:target.href };
  }
  throw new Error('Redirecionamentos em excesso.');
}
async function api(parameters) {
  const url = new URL(API);url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',...parameters});
  const {bytes,mime}=await bounded(url,2*1024*1024);
  if (!mime.includes('json')) throw new Error('API não retornou JSON.');
  const data=JSON.parse(bytes);if(data.error) throw new Error(data.error.info || data.error.code);return data;
}
function sourcePage(filename) { return `https://www.tibiawiki.com.br/wiki/Arquivo:${encodeURIComponent(filename)}`; }
async function namedSources() {
  const data = await api({titles:catalog.map(n=>`File:${n.replaceAll(' ','_')}.gif`).join('|'),prop:'imageinfo',iiprop:'url|mime|size|extmetadata',redirects:'1'});
  return (data.query?.pages||[]).map(page=>{
    const redirect=data.query?.redirects?.find(r=>r.to===page.title);
    const name=redirect?.from.replace(/^[^:]+:/,'').replace(/\.[^.]+$/,'').replaceAll('_',' ');
    return {filename:page.title.replace(/^[^:]+:/,'').replaceAll(' ','_'),displayName:name,...(page.imageinfo?.[0]||{}),sourceMethod:'mediawiki-api'};
  });
}
async function download(info, directory, budget) {
  if(!info.url) throw new Error('Arquivo não encontrado no MediaWiki.');
  const {bytes,mime,url}=await bounded(info.url,PER_FILE);
  if(!validImage(bytes,mime)) throw new Error('Resposta não é imagem raster válida; não será salva.');
  if(budget.bytes+bytes.length>64*1024*1024) throw new Error('Limite de 64 MiB de imagens por execução atingido.');
  budget.bytes+=bytes.length;
  const filename=localName(info.filename);await fs.writeFile(path.join(directory,filename),bytes);
  return {name:info.displayName??info.filename.replace(/\.[^.]+$/,'').replaceAll('_',' '),filename:info.filename,path:`/assets/tibia/${filename}`,sourceUrl:url,sourcePage:sourcePage(info.filename),sourceMethod:info.sourceMethod,sha256:sha(bytes),bytes:bytes.length,mime,status:'ready',fetchedAt:new Date().toISOString(),metadata:info.extmetadata||null};
}
export async function main(args = process.argv.slice(2)) {
  const value=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args[index+1];};
  const directory=path.resolve(value('--out','frontend/public/assets/tibia'));
  const all=args.includes('--all');const limit=Number(value('--limit','100'));
  if(!Number.isInteger(limit)||limit<1||limit>1000) throw new Error('--limit deve ser entre 1 e 1000 arquivos por execução.');
  await fs.mkdir(directory,{recursive:true});
  const file=path.join(directory,'manifest.json');
  const manifest=await readJson(file,{version:1,source:'https://www.tibiawiki.com.br/',credit:'Sprites do Tibia, propriedade da CipSoft GmbH; catálogo e hospedagem de origem: TibiaWiki BR.',copyrightSource:'https://www.tibiawiki.com.br/wiki/MediaWiki:Copyright',entries:[]});
  const entries=new Map(manifest.entries.map(entry=>[entry.filename,entry]));
  if(!all && !args.includes('--verified-sources') && !args.includes('--refresh')) {
    let complete=true;
    for(const name of catalog) {
      const entry=[...entries.values()].find(e=>e.name===name)||entries.get(name.replaceAll(' ','_')+'.gif');
      if(entry?.status!=='ready') {complete=false;break;}
      try {if(sha(await fs.readFile(path.join(directory,path.basename(entry.path))))!==entry.sha256) {complete=false;break;}} catch {complete=false;break;}
    }
    if(complete) {console.log(JSON.stringify({downloaded:0,failed:0,cached:catalog.length,manifest:file}));return;}
  }
  const stateFile=path.join(directory,'import-state.json');
  const state=await readJson(stateFile,{continuation:null,pending:[],finished:false});
  let sources;
  if(args.includes('--verified-sources')) {
    sources=await readJson(path.resolve(value('--verified-sources','')),[]);
  } else if(all) {
    if(state.finished && !state.pending.length) { console.log('Catálogo allimages já percorrido.');return; }
    while(state.pending.length<limit && !state.finished) {
        const data=await api({list:'allimages',ailimit:'50',aiprop:'url|mime|size',...(state.continuation||{})});
        state.pending.push(...(data.query?.allimages||[]).filter(item=>['image/gif','image/png','image/jpeg','image/webp'].includes(item.mime)&&item.size<=PER_FILE).map(item=>({...item,filename:item.name,sourceMethod:'mediawiki-api'})));
        state.continuation=data.continue||null;state.finished=!data.continue;
        await save(stateFile,state);await delay(300);
    }
    sources=state.pending.slice(0,limit);
  } else sources=await namedSources();
  let downloaded=0,failed=0;const budget={bytes:0};
  // Duas transferências simultâneas; erros não são reexecutados agressivamente.
  for(let i=0;i<Math.min(sources.length,limit);i+=2) {
    const batch=sources.slice(i,Math.min(i+2,limit));
    await Promise.all(batch.map(async info=>{
      try {
        const cached=entries.get(info.filename);
        if(cached?.status==='ready' && !args.includes('--refresh')) {
          const cachedPath=path.join(directory,path.basename(cached.path));
          try { if(sha(await fs.readFile(cachedPath))===cached.sha256) return; } catch {}
        }
        const item=await download(info,directory,budget);entries.set(info.filename,item);downloaded++;
      } catch(error) {
        failed++;entries.set(info.filename,{name:info.filename.replace(/\.[^.]+$/,'').replaceAll('_',' '),filename:info.filename,path:null,sourceUrl:info.url||null,sourcePage:sourcePage(info.filename),sourceMethod:info.sourceMethod,status:'unavailable',error:error.message});
      }
    }));
    manifest.entries=[...entries.values()];manifest.updatedAt=new Date().toISOString();await save(file,manifest);await delay(200);
  }
  if(all) {
    // Falhas retornam à fila; a próxima execução continua de onde parou.
    const attempted=new Set(sources.map(info=>info.filename));
    state.pending=state.pending.filter(info=>!attempted.has(info.filename)||entries.get(info.filename)?.status!=='ready');
    await save(stateFile,state);
  }
  console.log(JSON.stringify({downloaded,failed,cached:manifest.entries.filter(e=>e.status==='ready').length,manifest:file}));
  if(failed) process.exitCode=1;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
