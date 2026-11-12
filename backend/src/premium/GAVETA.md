# Gaveta `premium`

**Para que serve:** Passe Premium (30 dias), pagamentos Mercado Pago, benefícios só estéticos/organizacionais.

## Arquivos
- `premium.ts` – períodos encadeados, `premiumStatus`/`isPremium`
- `shared/premium.ts` – benefícios (com sprite), títulos, molduras e `premiumPhase` (ativo / terminando / agendado / encerrado), usado pela tela e testado em `premium.test.ts`
- `premiumService.ts` – checkout, processamento de pagamento, reembolso
- `mercadopago.ts` – API, assinatura HMAC
- `webhookRoutes.ts` – `POST /webhooks/mercadopago`
- `premiumRoutes.ts` – painel Premium, conjuntos de equipamento, favoritos, perfil, estatísticas

## Rotas
`/premium`, `/premium/checkout`, presets, favorito, perfil, hunt-stats, `/webhooks/mercadopago`.

## Dependências permitidas
Depende de `core` (e `economy` se precisar).

## Regras que não podem quebrar
Premium nunca altera combate, XP, ouro ou drops. Acesso só após webhook com assinatura válida e pagamento reconsultado na API. Eventos repetidos são idempotentes.

## Testes
`npm test` (premium.test) · `npm run mp:sim` · `MERCADOPAGO-TESTE.md`

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/premium/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta premium (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```
