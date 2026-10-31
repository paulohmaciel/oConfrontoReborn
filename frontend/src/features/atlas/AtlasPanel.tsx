import {useState} from 'react';
import Icon from '../../ui/GameIcon';
import manifest from '../../../public/assets/tibia/manifest.json';
export default function AtlasPanel(){
  const [atlasSearch,setAtlasSearch]=useState('');
  return <section className="panel"><div className="section-title"><h2>Biblioteca de ícones</h2><span>{manifest.entries.length} sprites</span></div><p className="muted">Arquivos do TibiaWiki armazenados localmente. Imagens © CipSoft GmbH.</p><input placeholder="Buscar ícone…" aria-label="Buscar ícone" value={atlasSearch} onChange={e=>setAtlasSearch(e.target.value)}/><div className="atlas-grid">{manifest.entries.filter(e=>e.name.toLowerCase().includes(atlasSearch.toLowerCase())).map(e=><a key={e.name} href={e.sourcePage} target="_blank" rel="noreferrer"><Icon name={e.name} size={40}/><span>{e.name}</span></a>)}</div></section>;
}
