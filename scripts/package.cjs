const fs=require('node:fs'),path=require('node:path');
// Lista somente arquivos de entrega; dependências, senhas e dados do MySQL ficam de fora.
const root=path.resolve(__dirname,'..');
const paths=['backend','frontend','shared','scripts','dist','package.json','package-lock.json','tsconfig.json','.env.example','.gitignore','instalar.cjs','AGENTS.md','LEIA-ME.md','README-ASSETS.md','VERIFICACAO.md'];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=paths.flatMap(p=>{const f=path.join(root,p);return fs.statSync(f).isDirectory()?walk(f):[f];});
process.stdout.write(files.map(p=>path.relative(root,p).replaceAll('\\','/')).join('\n')+'\n');
