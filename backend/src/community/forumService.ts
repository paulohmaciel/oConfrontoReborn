// Fórum estilo Reddit: tópicos por categoria, comentários com respostas (um nível), votos ▲▼ e "resolvido" nas dúvidas.
// Toda mudança trava o personagem do autor (lockCharacter). Textos são puros e têm limite; postar tem intervalo mínimo.
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { cleanText } from '../../../shared/community';
import { forumLimits, hotScore, isForumCategory } from '../../../shared/forum';
const author = { id: true, name: true, level: true, vocation: true, classTier: true, profileAvatar: true, profileEmblem: true } as const;

function sized(value: unknown, [min, max]: readonly [number, number], what: string) {
  const text = cleanText(value);
  if (text.length < min) throw new GameError(400, `${what} precisa de pelo menos ${min} caracteres.`);
  if (text.length > max) throw new GameError(400, `${what} pode ter até ${max} caracteres.`);
  return text;
}
async function viewerOf(accountId: number, viewerId: number | null) {
  return viewerId ? prisma.character.findFirst({ where: { id: viewerId, accountId }, select: { id: true } }) : null;
}

// Lista: categoria opcional, ordem hot/new/top, 10 por página (regra do site: nunca mais de 10 de uma vez).
export async function listPosts(accountId: number, opts: { category?: unknown; sort?: unknown; page?: unknown; q?: unknown; viewerId: number | null }) {
  const page = Math.max(1, Number(opts.page) || 1), size = forumLimits.pageSize, sort = ['new', 'top'].includes(String(opts.sort)) ? String(opts.sort) : 'hot';
  const q = typeof opts.q === 'string' ? opts.q.trim().slice(0, 60) : '';
  const where = { deletedAt: null, ...(isForumCategory(opts.category) ? { category: opts.category } : {}), ...(q.length >= 2 ? { title: { contains: q } } : {}) };
  const select = { id: true, category: true, title: true, score: true, commentCount: true, solvedCommentId: true, pinned: true, locked: true, createdAt: true, lastActivityAt: true, author: { select: author } } as const;
  let posts, total = await prisma.forumPost.count({ where });
  if (sort === 'hot') {
    // Recorte das 300 conversas mais recentes, ordenadas pela fórmula "Em alta"; fixados primeiro.
    const recent = await prisma.forumPost.findMany({ where, orderBy: { lastActivityAt: 'desc' }, take: 300, select });
    const now = new Date();
    posts = recent.sort((a, b) => Number(b.pinned) - Number(a.pinned) || hotScore(b.score, b.lastActivityAt, now) - hotScore(a.score, a.lastActivityAt, now)).slice((page - 1) * size, page * size);
    total = Math.min(total, recent.length);
  } else posts = await prisma.forumPost.findMany({ where, orderBy: sort === 'new' ? [{ pinned: 'desc' }, { createdAt: 'desc' }] : [{ score: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * size, take: size, select });
  const viewer = await viewerOf(accountId, opts.viewerId);
  const votes = viewer ? await prisma.forumVote.findMany({ where: { characterId: viewer.id, postId: { in: posts.map(p => p.id) } } }) : [];
  return { page, pageSize: size, total, posts: posts.map(p => ({ ...p, myVote: votes.find(v => v.postId === p.id)?.value ?? 0 })) };
}

export async function getPost(accountId: number, id: number, viewerId: number | null) {
  integer(id);
  const post = await prisma.forumPost.findFirst({ where: { id, deletedAt: null }, include: { author: { select: author } } });
  if (!post) throw new GameError(404, 'Tópico não encontrado.');
  const comments = await prisma.forumComment.findMany({ where: { postId: id }, orderBy: { id: 'asc' }, take: 500, include: { author: { select: author } } });
  const viewer = await viewerOf(accountId, viewerId);
  const votes = viewer ? await prisma.forumVote.findMany({ where: { characterId: viewer.id, OR: [{ postId: id }, { commentId: { in: comments.map(c => c.id) } }] } }) : [];
  return { post: { ...post, myVote: votes.find(v => v.postId === id)?.value ?? 0, mine: viewer?.id === post.authorId },
    comments: comments.map(c => c.deletedAt ? { id: c.id, parentId: c.parentId, deleted: true, createdAt: c.createdAt, score: 0, myVote: 0, mine: false, body: '', author: null }
      : { id: c.id, parentId: c.parentId, deleted: false, body: c.body, score: c.score, createdAt: c.createdAt, author: c.author, myVote: votes.find(v => v.commentId === c.id)?.value ?? 0, mine: viewer?.id === c.authorId }) };
}

export async function createPost(accountId: number, characterId: number, body: { category?: unknown; title?: unknown; body?: unknown }) {
  if (!isForumCategory(body.category)) throw new GameError(400, 'Escolha uma categoria.');
  const title = sized(body.title, forumLimits.title, 'O título'), text = sized(body.body, forumLimits.body, 'O texto');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const last = await tx.forumPost.findFirst({ where: { authorId: characterId }, orderBy: { id: 'desc' }, select: { createdAt: true } });
    if (last && Date.now() - last.createdAt.getTime() < forumLimits.postCooldownSeconds * 1000) throw new GameError(429, `Espere ${forumLimits.postCooldownSeconds} segundos entre um tópico e outro.`);
    const post = await tx.forumPost.create({ data: { category: body.category as string, authorId: characterId, title, body: text } });
    return { id: post.id, message: 'Tópico publicado.' };
  });
}

export async function createComment(accountId: number, characterId: number, postId: number, body: { body?: unknown; parentId?: unknown }) {
  integer(postId);
  const text = sized(body.body, forumLimits.comment, 'O comentário');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const post = await tx.forumPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new GameError(404, 'Tópico não encontrado.');
    if (post.locked) throw new GameError(409, 'Este tópico foi trancado pela equipe.');
    let parentId: number | null = null;
    if (body.parentId !== undefined && body.parentId !== null) {
      // Respostas ficam em um nível: responder uma resposta prende ao comentário principal.
      const parent = await tx.forumComment.findFirst({ where: { id: integer(Number(body.parentId)), postId } });
      if (!parent) throw new GameError(404, 'Comentário não encontrado.');
      parentId = parent.parentId ?? parent.id;
    }
    const last = await tx.forumComment.findFirst({ where: { authorId: characterId }, orderBy: { id: 'desc' }, select: { createdAt: true } });
    if (last && Date.now() - last.createdAt.getTime() < forumLimits.commentCooldownSeconds * 1000) throw new GameError(429, `Espere ${forumLimits.commentCooldownSeconds} segundos entre comentários.`);
    const comment = await tx.forumComment.create({ data: { postId, authorId: characterId, parentId, body: text } });
    await tx.forumPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 }, lastActivityAt: new Date() } });
    return { id: comment.id, message: 'Comentário publicado.' };
  });
}

// Voto ▲ (+1), ▼ (−1) ou 0 para tirar. Não dá para votar no próprio texto; o placar muda pela diferença.
export async function vote(accountId: number, characterId: number, body: { postId?: unknown; commentId?: unknown; value?: unknown }) {
  const value = Number(body.value);
  if (![1, -1, 0].includes(value)) throw new GameError(400, 'Voto inválido.');
  const postId = body.postId !== undefined ? integer(Number(body.postId)) : null, commentId = body.commentId !== undefined ? integer(Number(body.commentId)) : null;
  if ((postId === null) === (commentId === null)) throw new GameError(400, 'Vote em um tópico ou em um comentário.');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const target = postId ? await tx.forumPost.findFirst({ where: { id: postId, deletedAt: null }, select: { authorId: true } })
      : await tx.forumComment.findFirst({ where: { id: commentId!, deletedAt: null }, select: { authorId: true } });
    if (!target) throw new GameError(404, 'Não encontrado.');
    if (target.authorId === characterId) throw new GameError(400, 'Você não pode votar no próprio texto.');
    const key = postId ? { characterId_postId: { characterId, postId } } : { characterId_commentId: { characterId, commentId: commentId! } };
    const previous = await tx.forumVote.findUnique({ where: key });
    const delta = value - (previous?.value ?? 0);
    if (value === 0) { if (previous) await tx.forumVote.delete({ where: { id: previous.id } }); }
    else if (previous) await tx.forumVote.update({ where: { id: previous.id }, data: { value } });
    else await tx.forumVote.create({ data: { characterId, postId, commentId, value } });
    if (delta) {
      if (postId) await tx.forumPost.update({ where: { id: postId }, data: { score: { increment: delta } } });
      else await tx.forumComment.update({ where: { id: commentId! }, data: { score: { increment: delta } } });
    }
    return { ok: true };
  });
}

// Só o autor de uma dúvida marca (ou desmarca) a resposta que resolveu.
export async function markSolved(accountId: number, characterId: number, postId: number, commentId: unknown) {
  integer(postId);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const post = await tx.forumPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post || post.authorId !== characterId) throw new GameError(404, 'Tópico não encontrado.');
    if (post.category !== 'duvidas') throw new GameError(409, 'Só dúvidas podem ser marcadas como resolvidas.');
    let solved: number | null = null;
    if (commentId !== null && commentId !== undefined) {
      const c = await tx.forumComment.findFirst({ where: { id: integer(Number(commentId)), postId, deletedAt: null } });
      if (!c) throw new GameError(404, 'Comentário não encontrado.');
      solved = c.id;
    }
    await tx.forumPost.update({ where: { id: postId }, data: { solvedCommentId: solved } });
    return { message: solved ? 'Dúvida marcada como resolvida.' : 'Marcação de resolvida removida.' };
  });
}

export async function deleteOwn(accountId: number, characterId: number, kind: string, id: number) {
  integer(id);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    if (kind === 'post') {
      const p = await tx.forumPost.findFirst({ where: { id, authorId: characterId, deletedAt: null } });
      if (!p) throw new GameError(404, 'Tópico não encontrado.');
      await tx.forumPost.update({ where: { id }, data: { deletedAt: new Date() } });
      return { message: 'Tópico apagado.' };
    }
    const c = await tx.forumComment.findFirst({ where: { id, authorId: characterId, deletedAt: null } });
    if (!c) throw new GameError(404, 'Comentário não encontrado.');
    await tx.forumComment.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Comentário apagado.' };
  });
}
