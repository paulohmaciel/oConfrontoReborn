import test from 'node:test';
import assert from 'node:assert/strict';
import {safeUrl,localName,validImage} from './import-icons.mjs';
test('downloads limitados ao HTTPS do wiki',()=>{
 assert.equal(safeUrl('https://www.tibiawiki.com.br/images/a/af/Rat.gif').hostname,'www.tibiawiki.com.br');
 for(const url of ['http://www.tibiawiki.com.br/a','https://evil.test/a','https://www.tibiawiki.com.br.evil.test/a','https://u:p@www.tibiawiki.com.br/a']) assert.throws(()=>safeUrl(url));
});
test('nomes locais não escapam da pasta e diferenciam arquivos',()=>{
 assert(!localName('../../Rat.gif').includes('/'));
 assert.notEqual(localName('A B.gif'),localName('A_B.gif'));
 assert.throws(()=>localName('image.svg'));
});
test('não salva HTML servido como imagem',()=>{
 assert.equal(validImage(Buffer.from('<html>error</html>'),'image/gif'),false);
 assert.equal(validImage(Buffer.from('GIF89a'),'image/gif'),true);
 assert.equal(validImage(Buffer.from('GIF89a'),'text/html'),false);
});

