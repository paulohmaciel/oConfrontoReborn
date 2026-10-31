import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword} from './password';
test('senha é salgada, verificada e não aceita texto puro',async()=>{
 const a=await hashPassword('Senha de teste segura'),b=await hashPassword('Senha de teste segura');
 assert.notEqual(a,b);assert(!a.includes('Senha de teste segura'));
 assert(await verifyPassword('Senha de teste segura',a));assert(!await verifyPassword('Outra senha',a));assert(!await verifyPassword('admin','admin'));
});
