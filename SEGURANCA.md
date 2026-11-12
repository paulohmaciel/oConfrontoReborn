# Segurança — pendências para corrigir antes de publicar

> Levantamento de 2026-10-31. Em 2026-10-31 (mesmo dia) foram corrigidos os itens **1, 2, 3, 4, 8, 9 e 10** e parte do 5 (ver cada seção). Continuam pendentes: 5 (apagar a conta), 6, 7, 11, 12 e 13.
> Ao corrigir um item, marque `[x]` com a data e registre também no `TODO.md`.

**Escopo:** `backend/src`, `backend/prisma` (scripts), `shared/`, `frontend/src`, `scripts/`, `iniciar.bat`, `.env.example` e histórico do git. Só leitura de código + `npm audit`.

**Dependências:** `npm audit` (produção e completo) — **0 vulnerabilidades** na data do levantamento.

## Resumo

| # | Gravidade | Achado | Onde |
|---|---|---|---|
| 1 | **Alta** (condicional) | `dev-login` vira ADMIN para qualquer um se o servidor público ficar atrás de proxy local sem `X-Forwarded-For` e o `.env` ainda tiver `NODE_ENV=development` + `DEV_QUICK_LOGIN=1` | `backend/src/account/auth.ts` (rota `dev-login`), `iniciar.bat`, `.env.example` |
| 2 | **Alta** (antes de publicar) | Conta ADMIN `mestre@localhost.dev` com senha fixa e pública `Mestre-Temp-2026!`, impressa no console a cada início | `backend/prisma/create-master.ts`, `iniciar.bat` — *já estava no TODO* |
| 3 | Média | "Modo produção" depende só de `NODE_ENV` no `.env`: sem ele, cookie sem `Secure`, sem `upgrade-insecure-requests` e travas de dev liberadas | `auth.ts` (cookie), `server.ts` (helmet), `package.json` (`start` = `dev`) |
| 4 | Média | MODERATOR revoga qualquer punição, inclusive banimento permanente que só ADMIN pode aplicar | `backend/src/admin/adminRoutes.ts` (`/admin/punishments/:id/revoke`) |
| 5 | Média | E-mail da conta master usa domínio público (`.dev`); se a conta existir em produção, o dono do domínio pode redefinir a senha de um ADMIN | `create-master.ts`, `auth.ts`, `emailRoutes.ts` |
| 6 | Média (depende da hospedagem) | Atrás de proxy sem `TRUST_PROXY`, todos dividem o mesmo limite de uso (um atacante bloqueia o login de todos). Com `TRUST_PROXY=1` sem proxy, o cliente forja o IP e escapa dos limites | `server.ts` (trust proxy + rate limit) |
| 7 | Média/Baixa | Contas descartáveis ilimitadas (500 ouro + kit, sem e-mail confirmado, sem CAPTCHA) podem alimentar uma conta principal pelo mercado | `auth.ts` (cadastro), `economy/marketService.ts` |
| 8 | Baixa | Cadastro revela se um e-mail já existe (contraria a regra "sem enumerar e-mails" da gaveta `account`) | `auth.ts` (409 "E-mail ou nome indisponível") |
| 9 | Baixa | Webhook do Mercado Pago não confere se o `ts` é recente; sem `data.id` na query, o id do corpo não entra na assinatura | `premium/mercadopago.ts`, `premium/webhookRoutes.ts` |
| 10 | Baixa | "Esqueci a senha" sem intervalo por conta: dá para inundar a caixa da vítima e invalidar o link que ela acabou de receber | `account/emailRoutes.ts`, `account/accountTokens.ts` |
| 11 | Baixa | Não há "trocar senha" logado nem "sair de todos os dispositivos"; sessão de 7 dias fixos | `auth.ts` |
| 12 | Baixa | Compra no mercado trava a linha do personagem de outra conta antes de conferir o dono | `economy/marketService.ts` (`buyListing`) |
| 13 | Info | O primeiro commit (`afaa213`) versionou o `.env` (MySQL local `root` **sem senha**, sem chaves de pagamento/e-mail). Já removido do repositório | histórico do git |

---

## Detalhes e correção sugerida

### 1. `dev-login` pode dar ADMIN a qualquer pessoa — Alta (condicional)
- [x] Corrigido em 2026-10-31: a rota exige `NODE_ENV=development` explícito, `HOST` em loopback e nenhum cabeçalho de proxy (`X-Forwarded-For`/`X-Real-IP`); **nunca mais promove conta existente** (responde 403 e manda usar `npm run admin:role`); o servidor **se recusa a iniciar** com `DEV_QUICK_LOGIN=1` e `HOST` público (`startupSafetyErrors` em `server.ts`).
- **Hoje:** a rota é liberada com `DEV_QUICK_LOGIN==='1'`, `NODE_ENV!=='production'` e pedido vindo de 127.0.0.1 sem `X-Forwarded-For`. Ela cria a conta ADMIN com 1.000.000 de ouro, ou **promove a ADMIN** uma conta já existente com esse e-mail. O `iniciar.bat` acrescenta `DEV_QUICK_LOGIN=1` ao `.env` sozinho, o `.env.example` vem com `development`, e `npm start` é igual ao `dev`.
- **Ataque:** a VPS tem nginx na mesma máquina (`proxy_pass http://127.0.0.1:3333`). O nginx não envia `X-Forwarded-For` por padrão, então o Node vê 127.0.0.1. Qualquer pessoa faz `POST /api/auth/dev-login` com `Origin` e `X-Game-Client` forjados e recebe uma sessão ADMIN. O mesmo vale para `vite --host` na rede local.
- **Correção:**
  - Exigir `NODE_ENV==='development'` explícito **e** `HOST` de loopback.
  - Recusar a inicialização se `DEV_QUICK_LOGIN=1` e `HOST` não for loopback.
  - Nunca promover conta existente a ADMIN.
  - Criar um script de produção que defina `NODE_ENV=production`.

### 2. Senha fixa da conta master — Alta (já estava no TODO)
- [x] Corrigido em 2026-10-31: `TEMP_PASSWORD` removida; `npm run master:create` gera senha aleatória e **não a exibe** (só `-- --aleatoria` mostra uma vez, só `-- --senha` define uma). Falta: apagar a conta do banco antes de publicar.
- **Hoje:** `TEMP_PASSWORD = 'Mestre-Temp-2026!'` é a senha padrão do `npm run master:create`. O `iniciar.bat` executa o script sempre e imprime a senha. A conta entra pelo login normal, sem restrição de loopback.
- **Correção:** apagar a constante, usar `--aleatoria` como padrão, não imprimir a senha e apagar a conta do banco antes de publicar.

### 3. Produção depende só de `NODE_ENV` — Média
- [x] Corrigido em 2026-10-31: `npm run start:prod` (`scripts/start-prod.mjs`) força `NODE_ENV=production`; o servidor **aborta** se `APP_ORIGIN` começar com `https://` sem `NODE_ENV=production`.
- **Correção:**
  - Criar `npm run start:prod` com `NODE_ENV=production`.
  - Na inicialização, se `APP_ORIGIN` começar com `https://` e `NODE_ENV` não for `production`, abortar ou avisar alto.
  - Ou derivar o `Secure` do cookie de `APP_ORIGIN` ser HTTPS.

### 4. MODERATOR revoga qualquer punição — Média
- [x] Corrigido em 2026-10-31: a revogação exige cargo acima do alvo; banimento sem prazo ou punição aplicada por cargo superior só ADMIN revoga (`adminRoutes.ts`, rota `/admin/punishments/:id/revoke`).
- **Hoje:** `POST /admin/punishments/:id/revoke` só exige `punish.apply`. Na aplicação existem duas checagens: só ADMIN aplica banimento permanente, e ninguém pune cargo igual ou superior. Na revogação, nenhuma das duas existe.
- **Correção:** na revogação, aplicar as mesmas regras. O cargo do alvo precisa ser menor que o de quem revoga. Banimento permanente, ou punição criada por cargo superior, só pode ser revogado por ADMIN.

### 5. Domínio público no e-mail da conta master — Média
- [x] Parcial em 2026-10-31: "Esqueci a senha" ignora `mestre@localhost.dev` (`MASTER_EMAIL` em `auth.ts`), então ninguém redefine essa senha por e-mail.
- [ ] Apagar a conta antes de publicar (continua no `TODO.md`).
- **Correção:** usar um domínio reservado (`mestre@oconfronto.test`) e bloquear redefinição de senha para domínios reservados. Na prática, resolve-se junto com o item 2 (apagar a conta).

### 6. `TRUST_PROXY` e limites de uso — Média (depende da hospedagem)
- [ ] Decidir no deploy
- **Correção:** documentar no `OPERACAO.md` a regra: `TRUST_PROXY=1` **somente** com proxy na frente e `HOST=127.0.0.1`. Registrar um aviso no log quando chegar `X-Forwarded-For` sem `trust proxy` ligado.

### 7. Contas descartáveis alimentando uma principal — Média/Baixa
- [ ] Decidir
- **Correção (escolher):**
  - Exigir e-mail confirmado e/ou nível ou tempo mínimo para vender no mercado.
  - Reduzir o ouro inicial.
  - Criar um alerta de fluxo concentrado na conciliação (`economy:reconcile`).

### 8. Cadastro revela e-mail existente — Baixa
- [x] Corrigido em 2026-10-31: e-mail repetido responde 202 "pendente" igual a um cadastro normal e o dono do endereço recebe um aviso por e-mail; nome de personagem repetido continua 409 (é público). A tela mostra o aviso sem entrar (`App.tsx`, `authenticate`).
- **Correção:** separar as mensagens de nome e de e-mail. Para e-mail repetido, responder como sucesso genérico e enviar um aviso ao dono da conta.

### 9. Webhook do Mercado Pago — Baixa
- [x] Corrigido em 2026-10-31: `verifySignature` aceita `maxAgeSeconds` (o webhook usa 300 s; `ts` em segundos ou milissegundos) e o `data.id` do corpo é ignorado, só o da query conta. Teste unitário novo em `premium.test.ts`.
- **Impacto limitado:** o servidor sempre reconsulta o pagamento na API, confere valor e moeda, e registra o evento com chave única. Não dá para obter Premium sem pagar.
- **Correção:** recusar se `|agora − ts|` passar de alguns minutos, exigir `data.id` na query e ignorar o id do corpo.

### 10. "Esqueci a senha" sem intervalo por conta — Baixa
- [x] Corrigido em 2026-10-31: um pedido por minuto por conta; dentro do intervalo a resposta é a mesma, mas nenhum e-mail novo é enviado (o link anterior continua valendo).
- **Correção:** intervalo por conta (ex.: 1 pedido por minuto e N por dia), igual ao que já existe em `/resend-verification`.

### 11. Sessões — Baixa
- [ ] Corrigir
- **Correção:** criar `POST /auth/change-password` (pede a senha atual e revoga as outras sessões) e um botão "Sair de todos os dispositivos".

### 12. Mercado trava personagem alheio antes de conferir o dono — Baixa
- [ ] Corrigir
- **Correção:** conferir a posse (`SELECT … WHERE id=? AND accountId=?`) antes do laço de travas, mantendo a ordem por id.

### 13. `.env` no histórico do git — Informativo
- [ ] Pôr senha no usuário `root` do MySQL local (o histórico mostra que ele está sem senha) e usar um usuário próprio do jogo, como o `LEIA-ME.md` já recomenda.

---

## Verificado e sem problema (para não refazer)
- **IDOR:** toda rota `/characters/:id/*` filtra pela conta da sessão (`lockCharacter` ou `findFirst({ id, accountId })`). Tickets de suporte também filtram pela conta, e as notas internas da equipe não aparecem para o jogador.
- **`/api/admin/*`:** middleware de cargo mais permissão por rota. O cargo é relido do banco a cada pedido.
- **CSRF:** cookie `HttpOnly` + `SameSite=Strict`. Toda mutação exige `Origin` exato e o cabeçalho `X-Game-Client`.
- **Senhas e tokens:** scrypt com salt e `timingSafeEqual`. Tokens aleatórios de 32 bytes, guardados só como SHA-256 e consumidos de forma atômica. A redefinição de senha revoga as sessões.
- **Ouro e itens:** transação com `FOR UPDATE`, `addGold` desfaz saldo negativo, `Idempotency-Key` nas ações sensíveis.
- **SQL:** só `$queryRaw` parametrizado.
- **Erros:** o 500 devolve uma mensagem genérica com `requestId`; a pilha de erro vai só para o log.
- **Cabeçalhos:** helmet com CSP (`script-src 'self'`). O frontend não usa `dangerouslySetInnerHTML`.
- **Superfície:** não há upload. Segredos (`MP_ACCESS_TOKEN`, `RESEND_API_KEY`) só no backend.
