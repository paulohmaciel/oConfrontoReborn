# Operação — backup, monitoramento e segurança

## Backup (e prova de que restaura)
```
npm run backup          # gera backups/<base>-<data>.sql.gz + .json (SHA-256 e contagem por tabela)
npm run backup:verify   # confere o SHA-256, restaura em <base>_restore_check e compara as contagens
```
- Precisa de `mysqldump` e `mysql` no PATH (Laragon: pasta `bin\mysql\...\bin`).
- `BACKUP_DIR` (padrão `backups/`) e `BACKUP_KEEP` (padrão 14) são opcionais. **Guarde cópias fora da máquina do servidor.**
- A verificação nunca toca na base real: cria e apaga `<base>_restore_check`.
- Agende no Windows (Agendador de Tarefas): `npm run backup` diário e `npm run backup:verify` semanal. Um backup nunca restaurado não conta como backup.
- Restauração real (emergência): pare o servidor, crie a base vazia e rode `gunzip -c arquivo.sql.gz | mysql -u USUARIO -p BASE`. Depois `npm run db:deploy`.

## Monitoramento
- **Disponibilidade:** aponte um monitor externo (UptimeRobot, Better Stack) para `GET /api/health` (200 = banco respondeu; 503 = fora).
- **Painel interno:** `GET /api/admin/health` (ADMIN) devolve uptime, requisições 2xx/4xx/5xx, taxa de erro, latência p50/p95, memória, últimos 50 erros e alertas (pedidos Premium pendentes há mais de 24 h, tickets abertos, anúncios vencidos sem varredura). É em memória: zera ao reiniciar.
- **Logs:** erros e requisições lentas (>2 s) saem em JSON de uma linha com `requestId`. Toda resposta traz `X-Request-Id`; erros 500 devolvem `requestId` para o jogador informar ao suporte. Redirecione a saída para arquivo (`npm start >> logs/app.log`) e faça rotação.
- Não há dados pessoais nos logs (sem e-mail, senha, cookie ou corpo da requisição).

## Checklist de segurança (alinhado ao OWASP ASVS, nível 1)
Já implementado no código:
- Senhas com scrypt + salt; resposta uniforme no login e na recuperação (sem enumeração de e-mail); sessões revogadas ao redefinir senha.
- Cookie de sessão HttpOnly/SameSite; verificação de Origin (`protectOrigin`); limites de uso por IP em toda a API e mais estritos em `/auth`.
- Webhook de pagamento com assinatura HMAC, valor conferido e pagamento rebuscado na API do Mercado Pago.
- Toda mutação com trava por personagem/conta e validação do dono; dinheiro em BigInt; livro-razão na mesma transação.
- Ações da equipe com permissão por papel e motivo obrigatório em auditoria.
- Helmet com CSP; corpo JSON limitado a 16 kb.

A fazer antes de abrir ao público (depende de você, não do código):
- [ ] HTTPS atrás de proxy reverso, com `TRUST_PROXY=1` (somente com proxy na frente e `HOST=127.0.0.1`) e `npm run start:prod`; `.env` fora do repositório, sem `DEV_QUICK_LOGIN`.
- [ ] Usuário MySQL exclusivo, sem acesso de rede externa.
- [ ] Rodar `npm audit` e manter dependências atualizadas.
- [ ] Teste real no sandbox do Mercado Pago (pagamento, duplicidade, reembolso).
- [ ] Termos de uso, política de privacidade (LGPD) e política de reembolso publicadas; o Premium deve citar o direito de arrependimento em 7 dias (CDC art. 49).
- [ ] Revisão de licença dos sprites do TibiaWiki/CipSoft antes de qualquer cobrança real.
