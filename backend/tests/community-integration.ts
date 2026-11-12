import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { blockCharacter, unblockCharacter, decideTestimonial, deleteScrap, myCommunity, publicProfile, reportContent, requestFriend, respondFriend, updateCommunityProfile, writeScrap, writeTestimonial } from '../src/community/communityService';

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
  await t.test('duelos no perfil: registro, sequência e últimos duelos; quem escondeu o nome só vê o próprio', async () => {
    await prisma.character.update({ where: { id: a.id }, data: { pvpWins: 2, pvpLosses: 1, honorPoints: 1040 } });
    const done = { status: 'FINISHED', inviteExpiresAt: new Date(), finishedAt: new Date() };
    await prisma.duel.create({ data: { ...done, challengerId: a.id, opponentId: b.id, outcome: 'VICTORY', winnerId: b.id } });
    await prisma.duel.create({ data: { ...done, challengerId: b.id, opponentId: a.id, outcome: 'VICTORY', winnerId: a.id } });
    await prisma.duel.create({ data: { ...done, challengerId: a.id, opponentId: b.id, outcome: 'FORFEIT', winnerId: a.id, mode: 'GOLD' } });
    await prisma.duel.create({ data: { status: 'FINISHED', inviteExpiresAt: new Date(), challengerId: a.id, opponentId: b.id, outcome: 'DECLINED' } });
    const d = (await publicProfile(C.id, a.name, null)).duels;
    assert(d); assert.equal(d.wins, 2); assert.equal(d.losses, 1); assert.equal(d.honor, 1040); assert.equal(d.streak, 2);
    assert.deepEqual(d.recent.map(r => [r.result, r.foe, r.mode]), [['WIN', b.name, 'GOLD'], ['WIN', b.name, 'HONOR'], ['LOSS', b.name, 'HONOR']]);
    await prisma.character.update({ where: { id: a.id }, data: { fameHidden: true } });
    assert.equal((await publicProfile(C.id, a.name, null)).duels, null);
    assert.equal((await publicProfile(A.id, a.name, a.id)).duels?.wins, 2);
    await prisma.character.update({ where: { id: a.id }, data: { fameHidden: false } });
  });
  await t.test('bloqueio: desfaz a amizade e barra recado, depoimento e pedido de amizade nos dois sentidos; desbloquear libera', async () => {
    const D = await mk('d'), d = D.characters[0];
    await requestFriend(D.id, d.id, c.name); await requestFriend(C.id, c.id, d.name);
    assert.equal(await prisma.friendship.count({ where: { status: 'ACCEPTED', OR: [{ requesterId: d.id, addresseeId: c.id }, { requesterId: c.id, addresseeId: d.id }] } }), 1);
    await assert.rejects(() => blockCharacter(C.id, c.id, c.name), /si mesmo/);
    await blockCharacter(C.id, c.id, d.name);
    assert.match((await blockCharacter(C.id, c.id, d.name)).message, /já está bloqueado/);
    assert.equal(await prisma.friendship.count({ where: { OR: [{ requesterId: d.id, addresseeId: c.id }, { requesterId: c.id, addresseeId: d.id }] } }), 0);
    await assert.rejects(() => writeScrap(D.id, d.id, c.name, 'Oi de novo'), /bloqueou/);
    await assert.rejects(() => writeTestimonial(D.id, d.id, c.name, 'Grande aventureiro'), /bloqueou/);
    await assert.rejects(() => requestFriend(D.id, d.id, c.name), /bloqueou/);
    await assert.rejects(() => requestFriend(C.id, c.id, d.name), /bloqueou/);
    assert.deepEqual((await myCommunity(C.id, c.id)).blocked.map(b => b.name), [d.name]);
    assert.equal((await publicProfile(C.id, d.name, c.id)).blockedByMe, true);
    assert.equal((await publicProfile(D.id, c.name, d.id)).blockedByMe, false);
    // Só quem bloqueou desbloqueia.
    assert.match((await unblockCharacter(D.id, d.id, c.name)).message, /não estava bloqueado/);
    await assert.rejects(() => requestFriend(D.id, d.id, c.name), /bloqueou/);
    await unblockCharacter(C.id, c.id, d.name);
    assert.match((await requestFriend(D.id, d.id, c.name)).message, /Pedido de amizade enviado/);
    await prisma.friendship.deleteMany({ where: { requesterId: d.id } });
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
