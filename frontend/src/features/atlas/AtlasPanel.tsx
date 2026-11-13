import {useState} from 'react';
import Icon from '../../ui/GameIcon';
import {Limited} from '../../ui/ShowMore';
import manifest from '../../../public/assets/tibia/manifest.json';
import {itemArtFiles,itemFile} from '../../lib/itemArt';

// A arte própria dos itens (GIFs de public/assets/items): tudo o que já entrou no jogo, num lugar só, para conferir o lote.
// Cada quadro abre o GIF no tamanho original. A busca aceita o nome do item com ou sem acento e maiúsculas.
function OwnArt(){
  const [search,setSearch]=useState('');
  const term=itemFile(search),found=itemArtFiles.filter(file=>file.includes(term));
  return <section className="panel"><div className="section-title"><h2>Arte própria dos itens</h2><span>{itemArtFiles.length} {itemArtFiles.length===1?'item':'itens'}</span></div>
    <p className="muted">Ícones animados feitos para o jogo, um por item. Entram sozinhos quando o arquivo é salvo com o nome do item; quem ainda não tem continua com o sprite do TibiaWiki.</p>
    {itemArtFiles.length===0?<p className="muted">Nenhum ícone próprio foi encontrado neste servidor.</p>:<>
      <input placeholder="Buscar item…" aria-label="Buscar item com arte própria" value={search} onChange={e=>setSearch(e.target.value)}/>
      {found.length===0&&<p className="muted">Nenhum item com esse nome tem arte própria ainda.</p>}
      <div className="atlas-grid"><Limited items={found} label="Ver mais itens" render={file=><a key={file} href={`/assets/items/${file}.gif`} target="_blank" rel="noreferrer"><Icon name={file} size={64}/><span>{file}</span></a>}/></div></>}
  </section>;
}

export default function AtlasPanel(){
  const [atlasSearch,setAtlasSearch]=useState('');
  return <><OwnArt/><section className="panel"><div className="section-title"><h2>Biblioteca de ícones</h2><span>{manifest.entries.length} sprites</span></div><p className="muted">Arquivos do TibiaWiki armazenados localmente. Imagens © CipSoft GmbH.</p><input placeholder="Buscar ícone…" aria-label="Buscar ícone" value={atlasSearch} onChange={e=>setAtlasSearch(e.target.value)}/><div className="atlas-grid"><Limited items={manifest.entries.filter(e=>e.name.toLowerCase().includes(atlasSearch.toLowerCase()))} label="Ver mais ícones" render={e=><a key={e.name} href={e.sourcePage} target="_blank" rel="noreferrer"><Icon name={e.name} size={40}/><span>{e.name}</span></a>}/></div></section></>;
}
