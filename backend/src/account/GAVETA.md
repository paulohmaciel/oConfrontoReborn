# Gaveta `account`

**Para que serve:** Quem é o jogador: cadastro, login, sessão, banimento, recuperação de senha, confirmação de e-mail.

## Arquivos
- `auth.ts` – cadastro, login, logout, `authenticate`, `protectOrigin`, `activeBan`
- `accountTokens.ts` – tokens de e-mail (hash, uso único)
- `emailRoutes.ts` – esqueci/redefinir/verificar/reenviar, trocar senha logado, sair dos outros aparelhos, acessos abertos
- `analyticsRoutes.ts` – registro de eventos de produto autenticados, sem dados pessoais

## Rotas
`/auth/{register,login,logout,forgot-password,reset-password,verify-email,resend-verification,change-password,logout-all,sessions}`, `/me`, `/analytics/events`.

## Dependências permitidas
Depende de `core`, `economy`, `premium`, `game` (cria o primeiro personagem).

## Regras que não podem quebrar
Resposta uniforme em login/recuperação (sem enumerar e-mails). Redefinir senha revoga todas as sessões; trocar senha logado revoga as outras e mantém a atual. Banido não entra. Contas de desenvolvimento (`DEV_EMAILS`) não entram em produção.

## Testes
`npm run test:integration` (operations-integration, account-integration); `npm test` (backend/tests/startup.test.ts)

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/account/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta account (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```
