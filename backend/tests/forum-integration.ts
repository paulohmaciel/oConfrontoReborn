import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/core/db';
import { hashPassword } from '../src/core/password';
import { createComment, createPost, deleteOwn, getPost, listPosts, markSolved, vote } from '../src/community/forumService';
import { reportContent } from '../src/community/communityService';

test('MySQL: fórum com tópicos, respostas, votos, resolvido e denúncia', async t => {
  assert.match(process.env.DATABASE_URL ?? '', /\/[^/?]*_test(?:\?|$)/, 'Use uma base dedicada terminada em _test.');
  const tag = randomUUID().slice(0, 8), password = await hashPassword('Forum-test-2026!');
  const mk = (n: string) => prisma.account.create({ data: { email: `forum-${tag}-${n}@example.invalid`, password, characters: { create: { name: `Forum ${n} ${tag}` } } }, include: { characters: true } });
  const [A, B, C] = await Promise.all([mk('a'), mk('b'), mk('c')]);
  const a = A.characters[0].id, b = B.characters[0].id, c = C.characters[0].id;
  let postId = 0, answer = 0;

  await t.test('tópico: categoria e tamanho validados, intervalo entre tópicos', async () => {
    await assert.rejects(() => createPost(A.id, a, { category: 'xyz', title: 'Título válido', body: 'Texto com tamanho bom.' }), /categoria/);
    await assert.rejects(() => createPost(A.id, a, { category: 'duvidas', title: 'Oi', body: 'Texto com tamanho bom.' }), /pelo menos 6/);
    postId = (await createPost(A.id, a, { category: 'duvidas', title: `Como passar do Demon ${tag}?`, body: 'Sempre perco no golpe pesado.' })).id;
    await assert.rejects(() => createPost(A.id, a, { category: 'conversa', title: 'Outro tópico', body: 'Texto com tamanho bom.' }), /Espere/);
  });
  await t.test('respostas ficam em um nível e o contador de comentários sobe', async () => {
    answer = (await createComment(B.id, b, postId, { body: 'Use Defender no aviso de golpe pesado.' })).id;
    const reply = await createComment(C.id, c, postId, { body: 'Concordo!', parentId: answer });
    await new Promise(r => setTimeout(r, 10_100));
    const deep = await createComment(B.id, b, postId, { body: 'Valeu.', parentId: reply.id });
    const full = await getPost(A.id, postId, a);
    assert.equal(full.comments.find(x => x.id === deep.id)?.parentId, answer);
    assert.equal(full.post.commentCount, 3);
  });
  await t.test('votos: não vota no próprio texto, trocar o voto muda o placar pela diferença', async () => {
    await assert.rejects(() => vote(A.id, a, { postId, value: 1 }), /próprio/);
    await vote(B.id, b, { postId, value: 1 }); await vote(C.id, c, { postId, value: -1 }); await vote(C.id, c, { postId, value: 1 });
    assert.equal((await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } })).score, 2);
    await vote(C.id, c, { postId, value: 0 });
    assert.equal((await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } })).score, 1);
    assert.equal((await getPost(B.id, postId, b)).post.myVote, 1);
  });
  await t.test('só o autor da dúvida marca a resposta que resolveu', async () => {
    await assert.rejects(() => markSolved(B.id, b, postId, answer), /não encontrado/);
    await markSolved(A.id, a, postId, answer);
    assert.equal((await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } })).solvedCommentId, answer);
  });
  await t.test('lista em páginas de 10 e busca pelo título', async () => {
    const found = await listPosts(B.id, { q: tag, viewerId: b });
    assert.equal(found.posts[0].id, postId); assert.equal(found.pageSize, 10); assert(found.posts.length <= 10);
    assert.equal((await listPosts(B.id, { category: 'duvidas', sort: 'new', q: tag, viewerId: null })).posts.length, 1);
  });
  await t.test('denúncia de tópico vira atendimento; autor apaga o próprio tópico', async () => {
    await reportContent(C.id, c, 'post', postId, 'Teste de denúncia');
    const ticket = await prisma.supportTicket.findFirstOrThrow({ where: { accountId: C.id, kind: 'REPORT' }, include: { messages: true } });
    assert.match(ticket.messages[0].body, /Como passar do Demon/);
    await assert.rejects(() => deleteOwn(B.id, b, 'post', postId), /não encontrado/);
    await deleteOwn(A.id, a, 'post', postId);
    await assert.rejects(() => getPost(B.id, postId, b), /não encontrado/);
  });
  await prisma.$disconnect();
});
