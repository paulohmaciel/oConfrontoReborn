// Perfil de comunidade: imagem e descrição, recados, depoimentos (com aprovação), amizades, visitas e denúncias.
// Toda mudança trava o personagem do autor (lockCharacter) e confere que ele é da conta autenticada.
import { Prisma } from '@prisma/client';
import { prisma, transaction, lockCharacter } from '../core/db';
import { GameError, integer } from '../core/engine';
import { isPremium } from '../premium/premium';
import { cleanText, isAvatar, limits } from '../../../shared/community';
type Tx = Prisma.TransactionClient;
const card = { id: true, name: true, level: true, vocation: true, classTier: true, profileAvatar: true, profileEmblem: true } as const;

async function byName(db: Tx | typeof prisma, name: unknown) {
  if (typeof name !== 'string' || name.trim().length < 3) throw new GameError(400, 'Nome de personagem inválido.');
  const c = await db.character.findUnique({ where: { name: name.trim() }, select: { id: true, name: true, accountId: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  return c;
}
function message(value: unknown, max: number, what: string) {
  const text = cleanText(value);
  if (text.length < 2) throw new GameError(400, `Escreva ${what}.`);
  if (text.length > max) throw new GameError(400, `${what[0].toUpperCase()}${what.slice(1)} pode ter até ${max} caracteres.`);
  return text;
}

// Perfil público pelo nome. `viewerId` (opcional) é o personagem de quem está olhando: registra a visita e diz a relação.
export async function publicProfile(accountId: number, name: string, viewerId: number | null) {
  const p = await prisma.character.findUnique({ where: { name }, select: { ...card, profileTitle: true, profileFrame: true, profileAbout: true, profileBio: true, accountId: true } });
  if (!p) throw new GameError(404, 'Personagem não encontrado.');
  const viewer = viewerId ? await prisma.character.findFirst({ where: { id: viewerId, accountId }, select: { id: true, profileHideVisits: true } }) : null;
  const owner = !!viewer && viewer.id === p.id;
  if (viewer && !owner && !viewer.profileHideVisits)
    await prisma.profileVisit.upsert({ where: { profileId_visitorId: { profileId: p.id, visitorId: viewer.id } }, update: { visitedAt: new Date() }, create: { profileId: p.id, visitorId: viewer.id } });
  const friendWhere = { status: 'ACCEPTED', OR: [{ requesterId: p.id }, { addresseeId: p.id }] };
  // Primeira página de cada lista (10) e os totais; as demais páginas vêm de profileList.
  const [friendRows, friendCount, scraps, testimonials, relation, visitors, scrapCount, testimonialCount] = await Promise.all([
    prisma.friendship.findMany({ where: friendWhere, orderBy: { respondedAt: 'desc' }, take: 10, include: { requester: { select: card }, addressee: { select: card } } }),
    prisma.friendship.count({ where: friendWhere }),
    prisma.profileScrap.findMany({ where: { profileId: p.id, deletedAt: null }, orderBy: { id: 'desc' }, take: 10, include: { author: { select: card } } }),
    prisma.profileTestimonial.findMany({ where: { profileId: p.id, status: owner ? { in: ['APPROVED', 'PENDING'] } : 'APPROVED' }, orderBy: { id: 'desc' }, take: 10, include: { author: { select: card } } }),
    viewer && !owner ? prisma.friendship.findFirst({ where: { OR: [{ requesterId: viewer.id, addresseeId: p.id }, { requesterId: p.id, addresseeId: viewer.id }] } }) : null,
    owner ? prisma.profileVisit.findMany({ where: { profileId: p.id }, orderBy: { visitedAt: 'desc' }, take: 10, include: { visitor: { select: card } } }) : [],
    prisma.profileScrap.count({ where: { profileId: p.id, deletedAt: null } }),
    prisma.profileTestimonial.count({ where: { profileId: p.id, status: 'APPROVED' } }),
  ]);
  const { accountId: profileAccount, ...profile } = p;
  return { profile, owner, sameAccount: profileAccount === accountId,
    friends: friendRows.map(f => f.requesterId === p.id ? f.addressee : f.requester), friendCount, scrapCount, testimonialCount,
    scraps: scraps.map(s => ({ id: s.id, text: s.text, createdAt: s.createdAt, author: s.author })),
    testimonials: testimonials.map(t => ({ id: t.id, text: t.text, status: t.status, createdAt: t.createdAt, author: t.author })),
    relation: relation ? { id: relation.id, status: relation.status, incoming: relation.addresseeId === viewer?.id } : null,
    visitors: visitors.map(v => ({ visitedAt: v.visitedAt, visitor: v.visitor })) };
}

// Painel do próprio personagem: pedidos de amizade, depoimentos esperando aprovação e preferências.
export async function myCommunity(accountId: number, characterId: number) {
  const c = await prisma.character.findFirst({ where: { id: characterId, accountId }, select: { id: true, name: true, profileAvatar: true, profileAbout: true, profileHideVisits: true } });
  if (!c) throw new GameError(404, 'Personagem não encontrado.');
  const [incoming, outgoing, pendingTestimonials, premium] = await Promise.all([
    prisma.friendship.findMany({ where: { addresseeId: c.id, status: 'PENDING' }, orderBy: { id: 'desc' }, take: 50, include: { requester: { select: card } } }),
    prisma.friendship.findMany({ where: { requesterId: c.id, status: 'PENDING' }, orderBy: { id: 'desc' }, take: 50, include: { addressee: { select: card } } }),
    prisma.profileTestimonial.count({ where: { profileId: c.id, status: 'PENDING' } }),
    isPremium(prisma, accountId)]);
  return { ...c, premium, aboutLimit: premium ? limits.aboutPremium : limits.aboutFree,
    incoming: incoming.map(f => ({ id: f.id, from: f.requester })), outgoing: outgoing.map(f => ({ id: f.id, to: f.addressee })), pendingTestimonials };
}

export async function updateCommunityProfile(accountId: number, characterId: number, body: { avatar?: unknown; about?: unknown; hideVisits?: unknown }) {
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const premium = await isPremium(tx, accountId), data: Prisma.CharacterUpdateInput = {};
    if (body.avatar !== undefined) {
      if (body.avatar === null || body.avatar === '') data.profileAvatar = null;
      else if (typeof body.avatar !== 'string' || !isAvatar(body.avatar, premium)) throw new GameError(400, premium ? 'Imagem fora da galeria.' : 'Esta imagem faz parte do Premium.');
      else data.profileAvatar = body.avatar;
    }
    if (body.about !== undefined) {
      const about = cleanText(body.about), max = premium ? limits.aboutPremium : limits.aboutFree;
      if (about.length > max) throw new GameError(400, `A descrição pode ter até ${max} caracteres${premium ? '' : ' (Premium: até ' + limits.aboutPremium + ')'}.`);
      data.profileAbout = about || null;
    }
    if (body.hideVisits !== undefined) data.profileHideVisits = body.hideVisits === true;
    await tx.character.update({ where: { id: characterId }, data });
    return { message: 'Perfil atualizado.' };
  });
}

export async function writeScrap(accountId: number, authorId: number, toName: unknown, text: unknown) {
  const body = message(text, limits.scrap, 'o recado');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, authorId);
    const to = await byName(tx, toName);
    const last = await tx.profileScrap.findFirst({ where: { authorId }, orderBy: { id: 'desc' }, select: { createdAt: true } });
    if (last && Date.now() - last.createdAt.getTime() < limits.scrapCooldownSeconds * 1000) throw new GameError(429, `Espere ${limits.scrapCooldownSeconds} segundos entre um recado e outro.`);
    const scrap = await tx.profileScrap.create({ data: { profileId: to.id, authorId, text: body } });
    return { id: scrap.id, message: `Recado deixado para ${to.name}.` };
  });
}
export async function deleteScrap(accountId: number, characterId: number, scrapId: number) {
  integer(scrapId);
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const s = await tx.profileScrap.findUnique({ where: { id: scrapId } });
    if (!s || s.deletedAt || (s.profileId !== characterId && s.authorId !== characterId)) throw new GameError(404, 'Recado não encontrado.');
    await tx.profileScrap.update({ where: { id: scrapId }, data: { deletedAt: new Date(), deletedById: accountId } });
    return { message: 'Recado apagado.' };
  });
}

// Depoimento: um por par (autor → perfil). Só aparece depois que o dono do perfil aprova; editar volta para a fila.
export async function writeTestimonial(accountId: number, authorId: number, toName: unknown, text: unknown) {
  const body = message(text, limits.testimonial, 'o depoimento');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, authorId);
    const to = await byName(tx, toName);
    if (to.id === authorId) throw new GameError(400, 'Você não pode escrever um depoimento para si mesmo.');
    await tx.profileTestimonial.upsert({ where: { profileId_authorId: { profileId: to.id, authorId } },
      update: { text: body, status: 'PENDING', decidedAt: null, createdAt: new Date() }, create: { profileId: to.id, authorId, text: body } });
    return { message: `Depoimento enviado. Ele aparece no perfil de ${to.name} quando for aprovado.` };
  });
}
export async function decideTestimonial(accountId: number, characterId: number, id: number, action: string) {
  integer(id);
  if (!['approve', 'reject', 'delete'].includes(action)) throw new GameError(400, 'Ação inválida.');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const t = await tx.profileTestimonial.findUnique({ where: { id } });
    if (!t || (t.profileId !== characterId && !(action === 'delete' && t.authorId === characterId))) throw new GameError(404, 'Depoimento não encontrado.');
    if (action === 'delete') { await tx.profileTestimonial.delete({ where: { id } }); return { message: 'Depoimento apagado.' }; }
    await tx.profileTestimonial.update({ where: { id }, data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', decidedAt: new Date() } });
    return { message: action === 'approve' ? 'Depoimento aprovado: agora aparece no seu perfil.' : 'Depoimento recusado.' };
  });
}

// Amizade: pedido → aceitar/recusar. Se o outro já tinha pedido, pedir de volta aceita na hora.
export async function requestFriend(accountId: number, characterId: number, toName: unknown) {
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const to = await byName(tx, toName);
    if (to.id === characterId) throw new GameError(400, 'Você não pode adicionar a si mesmo.');
    const existing = await tx.friendship.findFirst({ where: { OR: [{ requesterId: characterId, addresseeId: to.id }, { requesterId: to.id, addresseeId: characterId }] } });
    if (existing?.status === 'ACCEPTED') return { message: `Você e ${to.name} já são amigos.` };
    if (existing && existing.requesterId === to.id) {
      await tx.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
      return { message: `Agora você e ${to.name} são amigos.` };
    }
    if (existing) return { message: 'Pedido de amizade já enviado.' };
    if (await tx.friendship.count({ where: { requesterId: characterId, status: 'PENDING' } }) >= limits.pendingFriendRequests) throw new GameError(429, 'Você tem pedidos demais esperando resposta.');
    await tx.friendship.create({ data: { requesterId: characterId, addresseeId: to.id } });
    return { message: `Pedido de amizade enviado para ${to.name}.` };
  });
}
export async function respondFriend(accountId: number, characterId: number, id: number, action: string) {
  integer(id);
  if (!['accept', 'decline', 'remove'].includes(action)) throw new GameError(400, 'Ação inválida.');
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const f = await tx.friendship.findUnique({ where: { id } });
    if (!f || (f.requesterId !== characterId && f.addresseeId !== characterId)) throw new GameError(404, 'Amizade não encontrada.');
    if (action === 'accept') {
      if (f.addresseeId !== characterId || f.status !== 'PENDING') throw new GameError(409, 'Não há pedido para aceitar.');
      await tx.friendship.update({ where: { id }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
      return { message: 'Pedido aceito.' };
    }
    await tx.friendship.delete({ where: { id } });
    return { message: action === 'decline' ? 'Pedido recusado.' : f.status === 'PENDING' ? 'Pedido cancelado.' : 'Amizade desfeita.' };
  });
}

export async function searchCharacters(q: unknown) {
  const text = typeof q === 'string' ? q.trim() : '';
  if (text.length < 2) return [];
  return prisma.character.findMany({ where: { name: { startsWith: text } }, orderBy: { level: 'desc' }, take: 10, select: card });
}

// Denúncia de recado ou depoimento: vira um atendimento do tipo REPORT na fila da equipe, com uma cópia do texto.
export async function reportContent(accountId: number, characterId: number, kind: unknown, id: unknown, reason: unknown) {
  const why = message(reason, 500, 'o motivo da denúncia'), contentId = integer(Number(id));
  return transaction(async tx => {
    await lockCharacter(tx, accountId, characterId);
    const who = { include: { author: { select: { id: true, name: true, accountId: true } } } } as const;
    const found = kind === 'scrap' ? await tx.profileScrap.findUnique({ where: { id: contentId }, ...who })
      : kind === 'testimonial' ? await tx.profileTestimonial.findUnique({ where: { id: contentId }, ...who })
      : kind === 'post' ? await tx.forumPost.findUnique({ where: { id: contentId }, ...who }).then(p => p && { ...p, text: `${p.title}

${p.body}` })
      : kind === 'comment' ? await tx.forumComment.findUnique({ where: { id: contentId }, ...who }).then(c => c && { ...c, text: c.body }) : null;
    const item = found;
    if (!item) throw new GameError(404, 'Conteúdo não encontrado.');
    if (item.author.accountId === accountId) throw new GameError(400, 'Você não pode denunciar o próprio texto.');
    const label = ({ scrap: 'recado', testimonial: 'depoimento', post: 'tópico do fórum', comment: 'comentário do fórum' } as Record<string, string>)[String(kind)];
    const ticket = await tx.supportTicket.create({ data: { accountId, kind: 'REPORT', subject: `Denúncia de ${label} #${contentId} (${item.author.name})`.slice(0, 120), reportedCharacterId: item.author.id } });
    await tx.supportMessage.create({ data: { ticketId: ticket.id, authorAccountId: accountId, body: `Motivo: ${why}\n\nTexto denunciado (${label} #${contentId}, de ${item.author.name}):\n${item.text}` } });
    return { message: 'Denúncia enviada para a equipe. Obrigado.' };
  });
}

// Listas do perfil que crescem sem limite, em páginas de 10. Mesmas regras de visibilidade de publicProfile.
export const profileLists = ['scraps', 'testimonials', 'friends', 'visitors'] as const;
export async function profileList(accountId: number, name: string, list: unknown, viewerId: number | null, page: number, skip: number, take: number) {
  if (!profileLists.includes(list as typeof profileLists[number])) throw new GameError(404, 'Lista desconhecida.');
  const p = await byName(prisma, name);
  const viewer = viewerId ? await prisma.character.findFirst({ where: { id: viewerId, accountId }, select: { id: true } }) : null;
  const owner = !!viewer && viewer.id === p.id;
  const out = <T>(items: T[], total: number) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / take)) });
  if (list === 'scraps') {
    const where = { profileId: p.id, deletedAt: null };
    const [rows, total] = await Promise.all([prisma.profileScrap.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { author: { select: card } } }), prisma.profileScrap.count({ where })]);
    return out(rows.map(s => ({ id: s.id, text: s.text, createdAt: s.createdAt, author: s.author })), total);
  }
  if (list === 'testimonials') {
    const where = { profileId: p.id, status: owner ? { in: ['APPROVED', 'PENDING'] } : 'APPROVED' };
    const [rows, total] = await Promise.all([prisma.profileTestimonial.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { author: { select: card } } }), prisma.profileTestimonial.count({ where })]);
    return out(rows.map(t => ({ id: t.id, text: t.text, status: t.status, createdAt: t.createdAt, author: t.author })), total);
  }
  if (list === 'friends') {
    const where = { status: 'ACCEPTED', OR: [{ requesterId: p.id }, { addresseeId: p.id }] };
    const [rows, total] = await Promise.all([prisma.friendship.findMany({ where, orderBy: { respondedAt: 'desc' }, skip, take, include: { requester: { select: card }, addressee: { select: card } } }), prisma.friendship.count({ where })]);
    return out(rows.map(f => f.requesterId === p.id ? f.addressee : f.requester), total);
  }
  // Visitas: só o dono vê.
  if (!owner) throw new GameError(403, 'Só o dono do perfil vê as visitas.');
  const [rows, total] = await Promise.all([prisma.profileVisit.findMany({ where: { profileId: p.id }, orderBy: { visitedAt: 'desc' }, skip, take, include: { visitor: { select: card } } }), prisma.profileVisit.count({ where: { profileId: p.id } })]);
  return out(rows.map(v => ({ visitedAt: v.visitedAt, visitor: v.visitor })), total);
}
