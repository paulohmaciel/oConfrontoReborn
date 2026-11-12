// Apagar a conta a pedido do dono dela (LGPD e exigência da loja do Google para apps com conta).
// O que identifica a pessoa sai: e-mail, senha, sessões, perfil, recados, depoimentos, amizades, visitas,
// atendimentos, eventos de uso e tudo do app Confrontation (save na nuvem, envios e ranking).
// O que a economia e a lei pedem para guardar fica, sem nome: personagens (renomeados), extrato de ouro e
// itens, mercado, duelos e registros de pagamento. Apagar essas linhas quebraria a conciliação do ouro
// e os registros fiscais; por isso a conta é esvaziada e anonimizada, não removida.
import { randomBytes } from 'node:crypto';
import { prisma, transaction, lockAccount, lockCharacter } from '../core/db';
import { GameError } from '../core/engine';
import { hashPassword, verifyPassword } from '../core/password';
import { notifyMail } from '../core/mailer';

/** E-mail que ninguém recebe, único por conta, no lugar do endereço da pessoa. */
export const deletedEmail = (accountId: number) => `apagada-${accountId}@conta-apagada.invalid`;
/** Nome que nenhum jogador consegue criar (o cadastro não aceita "#"), único por personagem. */
export const deletedName = (characterId: number) => `Apagado #${characterId}`;

/**
 * Apaga a conta depois de conferir a senha. Contas da equipe não são apagadas por aqui (um cargo só sai
 * por `npm run admin:role`). Devolve o e-mail antigo, para o aviso de despedida.
 */
export async function deleteAccount(accountId: number, password: unknown): Promise<{ email: string; characters: number }> {
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true, email: true, password: true, role: true, deletedAt: true } });
  if (!account || account.deletedAt) throw new GameError(404, 'Conta não encontrada.');
  if (account.role !== 'PLAYER') throw new GameError(403, 'Contas da equipe não são apagadas por aqui. Fale com o administrador.');
  if (typeof password !== 'string' || password.length > 128 || !(await verifyPassword(password, account.password))) throw new GameError(403, 'A senha não confere.');
  const unusable = await hashPassword(randomBytes(32).toString('hex'));
  const characters = await transaction(async tx => {
    await lockAccount(tx, accountId);
    const ids = (await tx.character.findMany({ where: { accountId }, select: { id: true }, orderBy: { id: 'asc' } })).map(c => c.id);
    for (const id of ids) await lockCharacter(tx, accountId, id);
    const mine = { in: ids };
    // O que a pessoa escreveu ou recebeu no perfil, e os vínculos dela com outros jogadores.
    await tx.profileScrap.deleteMany({ where: { OR: [{ profileId: mine }, { authorId: mine }] } });
    await tx.profileTestimonial.deleteMany({ where: { OR: [{ profileId: mine }, { authorId: mine }] } });
    await tx.friendship.deleteMany({ where: { OR: [{ requesterId: mine }, { addresseeId: mine }] } });
    await tx.profileVisit.deleteMany({ where: { OR: [{ profileId: mine }, { visitorId: mine }] } });
    for (const id of ids)
      await tx.character.update({ where: { id }, data: { name: deletedName(id), profileAvatar: null, profileAbout: null, profileTitle: null, profileEmblem: null, profileBio: null, profileFrame: null, profileHideVisits: true, fameHidden: true } });
    // Dados ligados só à conta.
    await tx.supportTicket.deleteMany({ where: { accountId } });
    await tx.analyticsEvent.deleteMany({ where: { accountId } });
    await tx.confrontationRank.deleteMany({ where: { accountId } });
    await tx.confrontationSync.deleteMany({ where: { accountId } });
    await tx.confrontationSave.deleteMany({ where: { accountId } });
    await tx.accountToken.deleteMany({ where: { accountId } });
    await tx.session.deleteMany({ where: { accountId } });
    await tx.account.update({ where: { id: accountId }, data: { email: deletedEmail(accountId), password: unusable, emailVerifiedAt: null, deletedAt: new Date() } });
    return ids.length;
  });
  notifyMail(account.email, 'Sua conta foi apagada — O Confronto', `A conta deste e-mail em O Confronto e no app Confrontation foi apagada agora, a seu pedido.

O e-mail, a senha, o perfil, os recados, as amizades e o progresso guardado na nuvem foram removidos. Registros de transações e de pagamentos ficam guardados sem o seu nome, pelo prazo que a lei exige.

Se não foi você, fale com o Suporte o quanto antes.`);
  return { email: account.email, characters };
}
