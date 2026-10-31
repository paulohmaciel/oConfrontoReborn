import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { decideTestimonial, deleteScrap, myCommunity, publicProfile, reportContent, requestFriend, respondFriend, updateCommunityProfile, writeScrap, writeTestimonial } from '../src/community/communityService';

test('MySQL: perfil de comunidade, recados, depoimentos, amizades, visitas e denúncias', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = await hashPassword('Community-test-2026!');
  const mk = (n: string) => prisma.account.create({ data: { email: `community-${tag}-${n}@example.invalid`, password, characters: { create: { name: `Com ${n} ${tag}`, vocation: 'KNIGHT', vocationChosen: true } } }, include: { characters: true } });
  const [A, B, C] = await Promise.all([mk('a'), mk('b'), mk('c')]);
  const a = A.characters[0], b = B.characters[0], c = C.characters[0];

  await t.test('perfil grátis: imagem da galeria e descrição; lendárias e texto longo são do Premium', async () => {
    await updateCommunityProfile(A.id, a.id, { avatar: 'Hero', about: 'Caçador de ratos e amigo do Ferreiro.' });
    assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: a.id } })).profileAvatar, 'Hero');
    await assert.rejects(() => updateCommunityProfile(A.id, a.id, { avatar: 'Apocalypse' }), /Premium/);
    await assert.rejects(() => updateCommunityProfile(A.id, a.id, { about: 'x'.repeat(501) }), /até 500/);
    await assert.rejects(() => updateCommunityProfile(B.id, a.id, { about: 'invasão' }), /não encontrado|Personagem/);
  });
  await t.test('recados: intervalo entre envios, e só o dono do perfil ou o autor apagam', async () => {
    const s1 = await writeScrap(B.id, b.id, a.name, 'Bem-vindo a Capriel!');
    await assert.rejects(() => writeScrap(B.id, b.id, a.name, 'Spam'), /Espere/);
    await assert.rejects(() => deleteScrap(C.id, c.id, s1.id), /não encontrado/);
    const view = await publicProfile(C.id, a.name, c.id);
    assert.equal(view.scraps[0].text, 'Bem-vindo a Capriel!');
    await deleteScrap(A.id, a.id, s1.id);
    assert.equal((await publicProfile(C.id, a.name, null)).scraps.length, 0);
  });
  await t.test('depoimento só aparece depois de aprovado', async () => {
    await writeTestimonial(B.id, b.id, a.name, 'Melhor parceiro de caçada que já tive.');
    await assert.rejects(() => writeTestimonial(A.id, a.id, a.name, 'Sou ótimo'), /si mesmo/);
    assert.equal((await publicProfile(C.id, a.name, null)).testimonials.length, 0);
    const own = await publicProfile(A.id, a.name, a.id);
    assert.equal(own.testimonials[0].status, 'PENDING');
    await decideTestimonial(A.id, a.id, own.testimonials[0].id, 'approve');
    assert.equal((await publicProfile(C.id, a.name, null)).testimonials[0].status, 'APPROVED');
  });
  await t.test('amizade: pedido, aceite e pedido de volta que aceita na hora', async () => {
    await requestFriend(B.id, b.id, a.name);
    const mine = await myCommunity(A.id, a.id);
    assert.equal(mine.incoming.length, 1);
    await respondFriend(A.id, a.id, mine.incoming[0].id, 'accept');
    await requestFriend(C.id, c.id, a.name);
    const r = await requestFriend(A.id, a.id, c.name);
    assert.match(r.message, /amigos/);
    assert.equal((await publicProfile(B.id, a.name, null)).friendCount, 2);
  });
  await t.test('visitas aparecem para o dono, e o modo invisível não registra', async () => {
    await publicProfile(C.id, a.name, c.id);
    await updateCommunityProfile(B.id, b.id, { hideVisits: true });
    await publicProfile(B.id, a.name, b.id);
    const own = await publicProfile(A.id, a.name, a.id);
    assert.deepEqual(own.visitors.map(v => v.visitor.id), [c.id]);
  });
  await t.test('denúncia vira atendimento REPORT na fila da equipe', async () => {
    await new Promise(r => setTimeout(r, 15_100));
    const s = await writeScrap(B.id, b.id, a.name, 'texto ofensivo de teste');
    await assert.rejects(() => reportContent(B.id, b.id, 'scrap', s.id, 'meu próprio'), /próprio/);
    await reportContent(C.id, c.id, 'scrap', s.id, 'Ofensa no mural');
    const ticket = await prisma.supportTicket.findFirstOrThrow({ where: { accountId: C.id, kind: 'REPORT' }, include: { messages: true } });
    assert.equal(ticket.reportedCharacterId, b.id); assert.match(ticket.messages[0].body, /texto ofensivo de teste/);
  });
  await prisma.$disconnect();
});
