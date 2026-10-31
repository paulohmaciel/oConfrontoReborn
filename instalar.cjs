#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
process.chdir(__dirname);
if (Number(process.versions.node.split('.')[0]) < 20) { console.error('Use Node.js 20 ou superior.'); process.exit(1); }
const envPath=path.join(__dirname,'.env');
if(!fs.existsSync(envPath)){
  fs.copyFileSync(path.join(__dirname,'.env.example'),envPath,fs.constants.COPYFILE_EXCL);
  console.log('Arquivo .env criado. Configure o usuário, a senha e uma BASE NOVA do MySQL antes de continuar.');
  console.log('Depois execute novamente: node instalar.cjs');
  process.exit(0);
}
const env=fs.readFileSync(envPath,'utf8');
if(env.includes('SUA_SENHA')) { console.error('Configure a conexão em .env. Veja o passo a passo em LEIA-ME.md.'); process.exit(1); }
// Usa o executável do Node e scripts conhecidos; nenhum texto do usuário vira comando de shell.
function node(args) {
  const result=spawnSync(process.execPath,args,{cwd:__dirname,stdio:'inherit',env:process.env});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status??1);
}
const npmPath=path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
if(!fs.existsSync(npmPath)) { console.error('npm não encontrado junto do Node.js. Execute npm ci e os comandos de LEIA-ME.md manualmente.'); process.exit(1); }
node([npmPath,'ci']);
node([npmPath,'run','generate']);
node([npmPath,'run','check']);
node([npmPath,'run','db:deploy']);
node([npmPath,'run','seed']);
node([npmPath,'run','build']);
console.log('\nInstalação concluída. Execute npm start e abra http://localhost:3333.');
