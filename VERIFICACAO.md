# Verificação das versões 0.3 a 0.4.0 — 28/10/2026

## Resultado

- Prisma Client gerado e schema validado.
- Migração inicial aplicada em duas bases isoladas: testes e demonstração.
- Seed aplicado; seis monstros, 17 itens e seis tarefas do catálogo.
- TypeScript em modo strict: backend e frontend aprovados.
- Build React/Vite/Tailwind concluído.
- Dez testes unitários de combate, regras e senha aprovados.
- Vinte cenários de integração no MySQL 8.4.3/InnoDB aprovados. O executor relata 21 testes incluindo o teste-pai da suíte.
- Três testes do importador aprovados.
- 23 sprites GIF com conteúdo, assinatura, MIME e SHA-256 verificados. Cache completo disponível offline.
- Instalação das dependências reportou zero vulnerabilidades conhecidas na auditoria executada nesta sessão; isso não substitui auditorias futuras.
- Smoke test do instalador: primeira execução cria .env; segunda execução com placeholder preserva o arquivo existente e interrompe a instalação. Sintaxe do instalador aprovada.

## Cenários de banco e HTTP

1. Rejeição sem autenticação.
2. Login e cookie HttpOnly.
3. Bloqueio de origem externa em mutações.
4. Isolamento entre personagens de contas diferentes.
5. Serialização de BigInt para string.
6. Início simultâneo de combate cria uma batalha e cobra energia uma vez.
7. Vitória concorrente concede uma recompensa e rejeita replay.
8. Falha no loot desfaz o turno inteiro.
9. Compras concorrentes não deixam saldo negativo.
10. Compra repetida com mesma chave não cria item adicional.
11. Treino rejeita campos arbitrários e não gasta o último ponto duas vezes.
12. Melhoria rejeita repetição de tier.
13. Custódia e compra de anúncio por somente um comprador.
14. Cancelamento repetido devolve item uma vez.
15. Poção consome uma unidade e reenvio não duplica o efeito.
16. Dois equipamentos simultâneos mantêm somente um item por slot.
17. Templo cura e bloqueia recarga imediata.
18. Resgate concorrente de tarefa concede a recompensa uma vez.
19. Cadastro cria equipamentos iniciais e armazena hash de senha.
20. Logout revoga a sessão.

## Navegador

Verificação com o jogo e MySQL locais, utilizando conta fictícia em base de demonstração:

- Cadastro, entrada, exibição do personagem e equipamentos iniciais.
- Aceitação de tarefa e combate contra Rat, vitória, XP e ouro.
- Compra de Sword, presença na mochila, anúncio e cancelamento no mercado.
- Biblioteca com 23 sprites; todos os 48 elementos de imagem presentes nessa tela estavam carregados, sem arquivo quebrado.
- Layout de celular em viewport 390 × 844: largura de conteúdo de 375 px, sem rolagem horizontal.
- Captura da tela final de caça em `oconfronto-previa.png`, entregue ao lado do ZIP.

Os fluxos não listados aqui não foram todos exercitados manualmente no navegador. Não foi feito teste de carga nem auditoria de implantação pública. A API de importação em massa do TibiaWiki respondeu 403; o modo --all não foi executado.

## Atualização visual 0.3.1

- Tema clássico amarelo/pergaminho baseado no CSS original do GitHub.
- Layout, regras e sprites preservados; sem alteração de schema ou migração.
- Build Vite concluído e tema conferido no navegador local, com imagens carregadas.
- A bateria de combate/economia acima corresponde à versão 0.3; não foi repetida para a mudança de cores.

## Alternância de temas 0.3.2

- TypeScript e build Vite aprovados.
- Seletor Claro / Escuro testado no navegador dentro do jogo e na entrada.
- Modo escuro manteve-se selecionado após recarregar a página.
- Retorno ao modo claro confirmado, com fundo areia e navegação preservada.
- Seletor acessível com estado aria-pressed; botões type="button" não submetem o formulário de entrada.
- Conferência em celular 390 × 844: seletor visível e largura de conteúdo de 375 px, sem transbordamento da página.
- Capturas de ambos os modos entregues ao lado do ZIP. Nenhuma alteração de banco nesta versão.

## Experiência do jogador 0.4.0

- Migração aditiva revisada: somente ADD COLUMN, CREATE TABLE e novas FKs, sem DROP/TRUNCATE. Aplicada em bases isoladas de testes e demonstração sobre a estrutura 0.3.x.
- 16 testes unitários de combate/regras/senha aprovados, incluindo seis novos para vocações, chefe, interrupção e efeitos.
- 28 cenários MySQL aprovados: 20 de regressão e oito da jornada. O executor relata 46 testes contando os dois testes-pai das suítes, sem falhas.
- Os oito cenários novos cobrem bloqueio de regiões, escolha permanente com preservação de itens, recompensa concorrente única, impedimento de pular objetivos, ciclo vitória/melhoria/tarefa, interrupção do chefe persistida, desbloqueio final e diário autenticado.
- Três testes do importador aprovados; cache offline validado para 30 sprites. Sete arquivos adicionais foram verificados no TibiaWiki.
- TypeScript strict e build Vite aprovados.
- Navegador em base separada: cadastro de druida, arma inicial correspondente, recompensa da primeira etapa, regiões, combate com habilidades próprias, conquista, bestiário e histórico. Teste feito em 127.0.0.1:3334 para não interferir no cookie da conta real em localhost:3333.
- Jornada em tela de celular 390 × 844: largura de conteúdo 375 px, sem imagens quebradas. Tema escuro também conferido.
- Backup do código e banco da instalação existente criado localmente em work. A permissão de gravação para aplicar a atualização no Laragon não foi concedida; nenhuma migração foi executada na base real e nenhum personagem real foi modificado.
- Não foi realizado teste de carga, balanceamento com jogadores reais ou medição de retenção. A jornada foi projetada como introdução guiada; não há afirmação de duração exata de 30 minutos.

## Versão 0.5.0 — economia, classes, Premium, pagamentos e operação

**O que foi verificado nesta sessão (ambiente sem acesso ao npm registry, ao MySQL e ao Prisma):**

- 28 testes unitários aprovados (`tsx --test` em engine, password, adventure, economy, premium): 16 anteriores sem alteração e 12 novos — aritmética de taxas, padrões que preservam o comportamento anterior, limites das configurações, classificação de fonte/ralo/transferência de todo motivo de ouro e item, permissões por cargo, promoção de classe e acesso a itens, encadeamento/reembolso de períodos Premium, e assinatura do webhook do Mercado Pago (válida, minúsculas em `data.id`, segredo/ID/request-id/ts incorretos, formatos malformados).
- TypeScript strict aprovado para backend, testes, `shared/` e frontend usando **declarações mínimas no lugar de `@prisma/client`, Express e React** (o pacote real não pôde ser instalado). Isso valida sintaxe, nomes, aridade e tipos de tudo que não depende dos tipos gerados pelo Prisma; **não** valida os campos do Prisma.
- Todos os `.tsx` do frontend foram analisados sem erros pelo esbuild.

**O que NÃO foi executado e precisa ser rodado por você antes de usar (`LEIA-ME.md`, "Atualizar da 0.4.0"):**

- `npm run generate` e `npm run check` (tipos reais do Prisma/Express/React).
- `npm run db:deploy` — a migração `202610280003` foi escrita à mão no formato das anteriores e **não foi aplicada nem validada** contra um MySQL. Faça backup antes e revise a saída.
- `npm run build` (Vite) e `npm start`.
- `npm run test:integration` em base `_test`: a suíte nova `operations-integration.ts` (12 cenários: livro-razão, empilhamento, taxas e saldos do mercado, expiração concorrente, personagens extras, conjuntos de equipamento, promoção, pagamentos com concessão única/duplicada/valor divergente/reembolso, webhook com assinatura, recuperação de senha, confirmação de e-mail, banimento, permissões e auditoria do painel, atendimento) **foi escrita mas nunca executada**; o teste de mercado de `integration.ts` foi ajustado para a taxa de 5%. Se algum cenário falhar, trate como defeito a corrigir, não como falso positivo.
- Nenhuma chamada real ao Mercado Pago foi feita (nem sandbox). O fluxo de pagamento foi testado apenas com respostas simuladas. A assinatura segue o manifesto documentado pelo Mercado Pago (`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, HMAC-SHA256); confirme no sandbox antes de cobrar.
- Nenhuma tela foi aberta em navegador nesta versão; layout, tema escuro/claro e celular das telas novas não foram conferidos visualmente. O diretório `dist/` está desatualizado até `npm run build`.

## Adicionado depois (backup e monitoramento)
- **Verificado aqui:** `monitor.test.ts` (percentil e limite de erros) passa; sintaxe dos scripts `backup.mjs`/`backup-verify.mjs` conferida; tipos dos arquivos alterados sem erro.
- **Não verificado (precisa de MySQL e `mysqldump` na sua máquina):** `npm run backup` e `npm run backup:verify` de ponta a ponta, e `GET /api/admin/health`. Rode ambos uma vez e me diga o resultado.
