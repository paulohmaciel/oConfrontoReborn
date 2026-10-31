# O Confronto — versão 0.5.0

Projeto local em Node.js/TypeScript, Express, Prisma, MySQL e React/Tailwind. Esta versão substitui o gerador de arquivos incompleto dos anexos e integra a interface às rotas protegidas.

O seletor **Claro / Escuro** aparece na tela de entrada e no topo do jogo. O modo claro usa a estética amarela do original: areia, pergaminho, dourado e marrom (#ddc89c, #f4e2bd, #b9892f, #633113, extraídos de static/css/css.css do repositório oconfronto/oconfronto). O modo escuro usa a estética verde inicial. A escolha é salva no navegador, aplicada antes da renderização e sincronizada entre abas. Na primeira visita, o padrão é claro. Se o armazenamento do navegador estiver desabilitado, a troca continua funcionando durante a sessão.

O tema claro está em `frontend/src/theme-classic.css`, limitado ao atributo data-theme="light". O tema escuro vem de `style.css`; o seletor e a preferência ficam em `ThemeToggle.tsx` e `theme.ts`. Alterar tema não troca personagem nem modifica o estado do jogo.

## O que funciona

- Cadastro com senha protegida por scrypt, entrada e saída com sessão revogável e cookie HttpOnly.
- Personagem inicial com cinco equipamentos e 500 moedas, sem conta administrativa ou senha padrão.
- Combate por turnos, habilidades, cura, defesa, fuga, energia, XP, evolução, críticos e loot.
- Recuperação do combate ao recarregar a página; trocar de aba mantém o encontro ativo.
- Equipamento com dez slots, verificação de dono/nível/vocação e mochila paginada em grupos de 20.
- Loja NPC, venda de pilhas, poções de vida/mana e Ferreiro com custo crescente e limite +10.
- Mercado entre jogadores com custódia do item, compra, cancelamento e preservação do tier.
- Tarefas com aceitação, contagem de abates e resgate de recompensa uma única vez.
- Templo com recuperação de recursos e intervalo de cinco minutos entre bênçãos.
- Interface responsiva e biblioteca de sprites com busca e links para os arquivos originais.
- Quatro vocações com regras próprias de dano, defesa, crítico e cura: cavaleiro, arqueiro, feiticeiro e druida.
- Jornada guiada de cinco etapas com recompensas únicas e objetivos verificados pelo servidor.
- Quatro regiões de caça com desbloqueio pela jornada e nível, 11 criaturas e três chefes.
- Chefes com preparação visível e golpe pesado que pode ser defendido ou interrompido.
- Diário persistente, cinco conquistas, bestiário e histórico dos últimos 20 combates.
- Equipamentos com poder mágico, crítico, proteção contra fogo e mobilidade convertida em esquiva.

Os números de combate e progressão são regras desta adaptação. Não são uma reprodução certificada das fórmulas de O Confronto ou Tibia. O código legado PHP não foi migrado como dados de jogadores.

## Instalação no Laragon

Use Node.js 20+ com npm e MySQL 8/InnoDB. O código foi verificado com MySQL 8.4.3. O Laragon fornece o banco; o servidor Node inicia separadamente.

1. Extraia o ZIP em uma **pasta nova**, por exemplo `C:\laragon\www\oconfronto-moderno`. Não execute o instalador antigo sobre esta versão.
2. Inicie o MySQL pelo Laragon. Crie uma base vazia chamada `oconfronto_moderno` e um usuário próprio com acesso somente a ela. Você pode fazer isso pelo HeidiSQL do Laragon. Para instalação, o usuário precisa criar tabelas, índices e chaves; em uma implantação pública, separe o usuário de migrações do usuário da aplicação.
3. No terminal, abra a pasta extraída e execute:

```powershell
node instalar.cjs
```

Na primeira execução será criado `.env`, sem sobrescrever arquivos existentes. Edite esse arquivo com a conexão do seu MySQL:

```env
DATABASE_URL="mysql://oconfronto:SUA_SENHA@127.0.0.1:3306/oconfronto_moderno"
PORT=3333
HOST=127.0.0.1
APP_ORIGIN=http://localhost:3333
NODE_ENV=development
```

Se a senha tiver caracteres reservados de URL, codifique-os no campo DATABASE_URL. O arquivo `.env` é local e fica fora do controle de versão.

4. Execute novamente:

```powershell
node instalar.cjs
npm start
```

5. Abra [http://localhost:3333](http://localhost:3333), clique em **Começar uma nova jornada** e crie sua conta. A senha exige de 10 a 128 caracteres.

O instalador instala as dependências do lockfile, gera o Prisma Client, verifica TypeScript, aplica migrações, popula o catálogo e constrói a interface. Ele não apaga nem reinicializa bases. Se a base já contiver tabelas de outra versão, interrompa a instalação e faça uma migração revisada; não aceite reset para contornar erro.

### Atualizar uma instalação 0.3.x deste projeto

1. Pare o jogo no terminal com Ctrl+C. Preserve uma cópia da pasta atual e um backup do MySQL.
2. Extraia o ZIP 0.4.0 em uma pasta nova. Copie **somente seu `.env`** da instalação anterior para a raiz da nova pasta. Não copie node_modules ou dist antigos.
3. Mantenha DATABASE_URL apontando para a mesma base de jogadores e execute `node instalar.cjs` na nova pasta. As duas migrações incluídas reconhecem a instalação anterior e aplicam somente as adições necessárias.
4. Execute `npm start` e abra http://localhost:3333.

A migração 202610280002_adventure adiciona campos e duas tabelas; não remove registros. Personagens existentes mantêm atributos, ouro, inventário e histórico, podendo escolher uma vocação uma vez na tela Jornada. Vitórias e tarefas anteriores contam para os objetivos quando aplicáveis. Detalhes de recompensa de batalhas antigas são identificados como anteriores à atualização, sem inventar ganhos históricos.

Esta atualização ainda não foi aplicada automaticamente na pasta do Laragon nesta sessão: a permissão de gravação não foi concedida. O pacote foi executado e testado em bases isoladas; o jogo instalado permanece na versão anterior até seguir os passos acima.

Para migrar um projeto PHP ou uma base que não usa as migrações 0.3.x deste pacote, faça backup e prepare uma migração específica para o schema atual. O arquivo `backend/prisma/preflight.sql` ajuda a localizar duplicações do modelo antigo, mas não converte senhas nem anúncios antigos automaticamente.

## Comandos manuais

Todos partem da raiz da pasta extraída:

```powershell
npm ci
npm run generate
npm run check
npm run db:deploy
npm run seed
npm run build
npm start
```

O seed é repetível para os registros do catálogo, tabelas de loot e tarefas. Ele não cria contas nem modifica personagens existentes. Durante atualizações, revise mudanças de balanceamento do catálogo antes de executá-lo.

Para desenvolver com atualização instantânea, configure `APP_ORIGIN=http://localhost:5173` no `.env`, inicie `npm run dev` em um terminal e `npm run web` em outro. Abra `http://localhost:5173`. Para voltar à interface construída, restaure APP_ORIGIN para `http://localhost:3333` e execute `npm run build` e `npm start`.

## Sprites do TibiaWiki

Os 30 sprites estão incluídos e são servidos localmente, sem depender da conexão com o wiki para jogar. Todos os itens e monstros do catálogo atual têm imagem. A navegação e as ações usam esses sprites, com alternativa visual caso um arquivo não esteja disponível. O Guardião da Pedreira é um personagem desta adaptação e usa o sprite verificado de Cyclops.

O manifesto em `frontend/public/assets/tibia/manifest.json` registra origem, hash SHA-256, tamanho e data. Os sprites são do TibiaWiki BR; imagens © CipSoft GmbH. Veja `README-ASSETS.md` para os créditos e métodos de verificação.

```powershell
npm run icons
npm run icons -- --refresh
npm run icons -- --all --limit 100
```

O primeiro comando valida o cache. O segundo tenta atualizar o catálogo. O terceiro percorre imagens raster do wiki em lotes limitados e retomáveis. A API do wiki respondeu 403 durante esta sessão; o modo de importação em massa foi implementado, mas não executado. Esta entrega inclui 30 sprites, **não todo o acervo do site**.

Depois de ampliar o manifesto, execute `npm run build` para atualizar a biblioteca de ícones. Importar uma imagem não cria automaticamente seu item, monstro ou regra de jogo no banco. Novos conteúdos precisam de dados de balanceamento e seed/migração próprios. Nunca invente os caminhos dos sprites.

## Regras desta versão

| Sistema | Regra |
|---|---|
| Caça | Encontro por turnos; custa 5 de energia ao iniciar. |
| Habilidades | Triplo hit: 15 mana; quinto hit: 35; cura: 20; defesa: 10. Mana insuficiente rejeita o turno. |
| Vocações | Cavaleiro: defesa +20%. Arqueiro: +8 pontos de crítico e 5% de esquiva. Feiticeiro: dano mágico +25%, defesa −15%, habilidades ofensivas por 12/28 mana. Druida: cura +45% por 14 mana. |
| Agilidade | Crítico = 10% + piso(agilidade/4) + bônus de vocação/equipamentos, limitado a 45%. |
| Equipamentos | Poder mágico contribui para dano de feiticeiro/druida; proteção contra fogo limitada a 75%; mobilidade contribui para esquiva, limitada a 20%. Esses efeitos especiais não são multiplicados pelo Ferreiro. |
| Chefes | Ciclo de ataque, preparação e golpe pesado. Defender reduz o golpe pesado; Interromper custa 12 mana e cancela o golpe anunciado. |
| Evolução | Cada nível concede 3 pontos de atributos, +5 HP máximo e +5 mana máxima. |
| Vitalidade | Cada ponto aumenta HP atual/máximo em 15. |
| Resistência | Participa da defesa; cada ponto também aumenta mana atual/máxima em 15. |
| Templo | Recuperação completa gratuita; disponível uma vez a cada cinco minutos, fora de combate. |
| Poções | Health Potion: até 100 HP; Mana Potion: até 80 mana. Usadas fora de combate; não gastam unidade se o recurso já está completo. |
| Ferreiro | Sucesso garantido, até +10; custa preço base × próximo tier. Bônus de 10% por tier sobre atributos do item. |
| NPC | Venda da pilha inteira por piso(preço base × 50%) × quantidade. O percentual é configurável no painel (padrão 50%). |
| Mercado | Preço em ouro para a pilha inteira. O anúncio mantém o item em custódia até compra, cancelamento ou expiração (48 h, configurável). Taxa de anúncio de 10 de ouro e taxa de 5% sobre a venda (ambas configuráveis). |
| Promoção | A partir do nível 20, por 5000 de ouro (configurável): +10% de ataque e defesa e +2 de crítico. Usa os itens e a progressão da classe base. |
| Tarefas | Cinco abates por tarefa do catálogo, aceitação prévia e recompensa única. |

Não há morte permanente nem penalidade de XP nesta versão. A derrota deixa o personagem sem vida e permite recuperação no Templo. O nível do monstro indica dificuldade e não é um bloqueio de acesso.

## Novidades da versão 0.5.0

**Economia** — todo ouro e todo item que entram ou saem de um personagem agora geram um registro (`GoldLedger`/`ItemLedger`), na mesma transação da operação. Loja, venda ao NPC, Ferreiro, combate, tarefas, jornada, mercado, promoção e ajustes da equipe passam pelos mesmos auxiliares (`backend/src/economy/economy.ts`), então um erro desfaz operação e registro juntos. Pilhas de loot e poções agora se somam em uma única linha da mochila. Preços da loja, pagamento do NPC, melhorias, recompensas de monstros, taxas e duração dos anúncios, custo da promoção e limites de personagens são configurados pelo painel (`GameSetting`; padrões em `shared/economy.ts` equivalem ao comportamento anterior, exceto as taxas de mercado, que são novas). Anúncios expiram e o item volta ao vendedor (varredura a cada minuto no servidor e ao abrir o mercado). Há extrato de ouro e histórico de negociações para o jogador, e indicadores de entrada/saída de ouro para a equipe.

**Classes** — as quatro classes da 0.4 (cavaleiro, arqueiro, feiticeiro, druida) continuam; agora há **personagens extras** (a conta gratuita tem 1; o Premium libera até 4 — configurável) para experimentar outras vocações, e **promoção** no nível 20. Personagens extras começam com 100 de ouro para não virarem atalho de economia. Se o Premium vencer, os personagens existentes continuam jogáveis; só não é possível criar novos além do limite gratuito.

**Premium (passe de 30 dias)** — foco em organização e personalização, sem alterar o combate: molduras, título/emblema/apresentação do perfil, conjuntos de equipamento, favoritos e busca na mochila, diário detalhado de caçadas e personagens extras. Os temas claro/escuro seguem gratuitos. O acesso vem de períodos (`PremiumPeriod`) ligados a pedidos (`PremiumOrder`) com início, vencimento e histórico; renovações empilham. O campo antigo `vipDays` não é mais usado.

**Pagamentos (Mercado Pago, Pix e cartão)** — o servidor cria a preferência de pagamento e só libera o Premium depois de validar a assinatura do webhook e **consultar o pagamento na API do Mercado Pago** (o corpo da notificação nunca é confiado). Notificações repetidas são ignoradas, valores divergentes não liberam acesso, pagamentos pendentes não fazem nada, e reembolso/estorno revoga o período correspondente. A cobrança só fica ativa quando `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` estão definidos **e** o preço (`premium.priceCents`) é maior que zero.

**Operação** — recuperação de senha e confirmação de e-mail (links de uso único, hash no banco; a redefinição encerra todas as sessões), painel da equipe com cargos (Apoio, Moderação, Administração), punições (advertência, bloqueio do mercado, banimento) com histórico, atendimento e denúncias, auditoria de toda ação administrativa com motivo obrigatório, e ajuste de ouro/dias de Premium com registro.

### Atualizar da 0.4.0 para a 0.5.0

1. Pare o jogo e faça **backup do MySQL**. A migração `202610280003_economy_admin_premium` é aditiva (somente `ADD COLUMN`, `CREATE TABLE`, índices e chaves; um `UPDATE` dá 48 h de validade aos anúncios já abertos), mas backup é sempre o primeiro passo.
2. Na pasta do projeto, com o `.env` existente (não é sobrescrito):

```powershell
npm ci
npm run generate
npm run check
npm run db:deploy
npm run build
npm start
```

3. Crie a primeira conta pelo jogo e torne-a administradora **pelo terminal do servidor** (nenhuma rota da API concede cargos):

```powershell
npm run admin:role -- seu@email.com ADMIN
```

A aba **Equipe** aparece para contas com cargo. Os cargos são `SUPPORT`, `MODERATOR`, `ADMIN`; permissões em `shared/permissions.ts`.

### Variáveis opcionais do `.env`

```env
# Endereço público do jogo (links de e-mail e retorno do pagamento). Padrão: APP_ORIGIN.
PUBLIC_URL=http://localhost:3333
# E-mail: "console" (padrão) imprime o link no terminal do servidor; "resend" envia pela API do Resend.
MAIL_DRIVER=console
# RESEND_API_KEY=...
# MAIL_FROM="O Confronto <nao-responda@seudominio.com>"
# Mercado Pago (credenciais do painel de desenvolvedores; use as de teste primeiro).
# MP_ACCESS_TOKEN=...
# MP_WEBHOOK_SECRET=...
# Atrás de proxy reverso (1 salto), para os limites de uso contarem o IP real.
# TRUST_PROXY=1
```

Sem essas variáveis o jogo funciona normalmente: e-mails são impressos no terminal e o Premium aparece como "ainda não está à venda".

### Ativar a cobrança do Premium

1. No painel do Mercado Pago (Suas integrações), crie a aplicação, copie o **Access Token** e, em Webhooks, cadastre a URL `https://SEU-DOMINIO/api/webhooks/mercadopago` com o evento **Pagamentos**; copie a **chave secreta** para `MP_WEBHOOK_SECRET`. O webhook exige URL pública com HTTPS (em testes locais, use um túnel).
2. Defina `PUBLIC_URL` com o endereço público e reinicie o servidor.
3. Na aba **Equipe → Configurações**, informe `Preço do passe Premium` em centavos (ex.: 1990 = R$ 19,90) e, se quiser, a duração.
4. Teste com credenciais e contas de teste do Mercado Pago antes de usar credenciais reais. Reembolsos são feitos no painel do Mercado Pago; o aviso automático revoga o acesso (em último caso, **Equipe → Pagamentos → Registrar reembolso**).
5. Antes de cobrar de verdade, consulte as regras do Mercado Pago, a legislação do consumidor e a política de reembolso e privacidade do jogo; este projeto não substitui essa revisão.

### Novos arquivos

- `backend/src/economy/economy.ts`, `settings.ts`: livro-razão, entrega de itens com empilhamento, configurações.
- `backend/src/economy/marketService.ts`: taxas, expiração e histórico.
- `backend/src/premium/premium.ts`, `premiumService.ts`, `mercadopago.ts`, `webhookRoutes.ts`, `premiumRoutes.ts`: Premium e pagamentos.
- `backend/src/account/accountTokens.ts`, `emailRoutes.ts`, `mailer.ts`: e-mails, confirmação e recuperação de senha.
- `backend/src/admin/adminRoutes.ts`, `supportRoutes.ts`, `economyRoutes.ts`, `characterService.ts`: painel, atendimento, extrato, personagens e promoção.
- `shared/economy.ts`, `premium.ts`, `permissions.ts`: regras compartilhadas.
- `frontend/src/features/operations/OperationsPanels.tsx`, `AdminPanel.tsx`, `operations.css`: telas novas.
- `backend/prisma/grant-role.ts`: concessão de cargos pelo terminal.

## Organização

- `backend/src/core/engine.ts`: cálculo puro do combate.
- `backend/src/game/battleService.ts`: persistência, turnos e recompensas.
- `backend/src/account/auth.ts`: cadastro, login, sessões e proteção de origem.
- `backend/src/game/inventoryService.ts` e `gameService.ts`: itens, NPC, atributos, poções e Templo.
- `backend/src/economy/marketService.ts`: anúncios e transferências atômicas entre jogadores.
- `backend/src/core/operations.ts`: recibos idempotentes de compra NPC, treino, poções e criação de anúncios.
- `backend/src/game/taskRoutes.ts`: tarefas e resgate.
- `frontend/src/`: aplicação React, comunicação HTTP e estilos.
- `scripts/import-icons.mjs`: cache/importação de sprites.
- `shared/adventure.ts`: vocações, habilidades, regiões e objetivos compartilhados entre cliente e servidor.
- `backend/src/game/adventureService.ts` e `adventureRoutes.ts`: jornada, conquistas e diário.
- `backend/src/game/combatStats.ts`: cálculo único das estatísticas, usado pela interface e pelo combate.
- `frontend/src/features/adventure/AdventurePanels.tsx` e `HuntPanel.tsx`: jornada, diário e regiões/chefes.

Todas as mutações de personagem adquirem o mesmo lock de linha no banco. A compra de mercado bloqueia os dois personagens em ordem de ID. Repetição de turno é controlada por versão. IDs enviados pelo cliente nunca substituem a identidade autenticada.

## Verificação

```powershell
npm run check
npm test
npm run test:icons
```

Para testes de integração, use uma **base de testes separada com nome terminado em `_test`**, aplique as migrações, execute o seed e defina DATABASE_URL nessa conexão antes de `npm run test:integration`. Os testes criam contas e itens com identificadores únicos; não os execute na base de jogadores.

Veja `VERIFICACAO.md` para os resultados reais. O projeto usa Prisma 5.19.0 fixado por compatibilidade com MySQL e com o código recebido; atualização de versão principal do ORM exige revisão separada.

## Limites do produto atual

Esta é uma versão local jogável, com os sistemas listados acima. Guildas, reino, PvP, quests de masmorra e caça por duração ainda aparecem apenas como estruturas herdadas do schema e não têm rotas/telas funcionais. A jornada guiada é um sistema próprio, separado das estruturas antigas de QuestBlueprint. Não há modo automático de cinquenta turnos. O arco funciona sem consumo de munição nesta etapa.

Para acesso público, configure domínio e HTTPS, APP_ORIGIN exata e NODE_ENV=production. As sessões passam então a usar cookie Secure. O rate limit incluído é local ao processo; uma implantação com várias instâncias precisa de armazenamento compartilhado. Não exponha o MySQL diretamente. O projeto permanece local nesta entrega. Itens ainda por fazer antes de um lançamento comercial: backups com restauração testada, monitoramento de erros/indisponibilidade, revisão de segurança (OWASP ASVS), termos de uso/privacidade e a questão dos sprites (veja `README-ASSETS.md`: as imagens pertencem à CipSoft e o uso comercial exige autorização ou arte própria).

## Operação
Backup com restauração verificada, monitoramento e checklist de segurança: veja `OPERACAO.md`.

## Antes de abrir ao público
- Páginas legais (rascunho): `frontend/public/legal/` — preencha os [campos] e peça revisão jurídica.
- Teste de pagamentos: `MERCADOPAGO-TESTE.md` (`npm run mp:sim`).
- Sprites e licença: `ASSETS-LICENCA.md` (`npm run assets:audit`).
- Auditoria dos 5 fundamentos (race condition, idempotência, cliente não confiável, camadas, testes): `AUDITORIA.md`.
- Economia: `npm run economy:reconcile` (ouro e itens); `npm run economy:opening` uma vez após atualizar, para o saldo de abertura dos itens.
- Forja com risco de quebra: configurável no painel (grupo Ferreiro).

## Gavetas
O código foi reorganizado em pastas por assunto, sem mudar rotas nem comportamento. Veja `GAVETAS.md` (mapa e modelo de prompt) e o `GAVETA.md` de cada pasta. `npm run check:drawers` confere as dependências.

Depois de copiar esta versão, apague os arquivos antigos que foram movidos: `node scripts/limpar-gavetas.mjs` (só apaga um arquivo antigo se o novo já existir).
