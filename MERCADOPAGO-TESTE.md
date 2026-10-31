# Teste do Premium no sandbox do Mercado Pago

Fonte do roteiro: [compras de teste do Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).

## Preparação (uma vez)
1. Em *Suas integrações*, crie a aplicação (Checkout Pro) e, em *Contas de teste*, crie **uma conta vendedora e uma compradora**.
2. Use as **credenciais de teste** da conta vendedora: `MP_ACCESS_TOKEN` (começa com `TEST-`) no `.env`.
3. O Mercado Pago precisa alcançar seu servidor: exponha o local com um túnel HTTPS (ex.: `cloudflared tunnel --url http://localhost:3333`) e ponha essa URL em `PUBLIC_URL`.
4. Em *Webhooks*, cadastre `PUBLIC_URL/api/webhooks/mercadopago` (evento *Pagamentos*) e copie a chave secreta para `MP_WEBHOOK_SECRET`.
5. Admin: defina `premium.priceCents` (ex.: 500 = R$ 5,00). Reinicie o servidor.

## 0. Segurança do webhook (sem dinheiro)
`npm run mp:sim` — esperado: sem assinatura, segredo errado e assinatura de outro pagamento → **401**; assinatura válida → não é 401.

## Cenários (marque conforme passar)
Abra o checkout em aba anônima, logado com a **compradora de teste** (o código por e-mail são os 6 dígitos da conta de teste; para Pix, os 6 últimos do User ID). Cartões de teste (validade 11/30): Mastercard 5480 8328 0103 3311 (CVV 123), Visa 4235 6477 2802 5682 (CVV 123). CPF 12345678909. **O nome do titular define o resultado.**

| # | Cenário | Como | Esperado |
|---|---|---|---|
| 1 | Aprovado | titular `APRO` | Premium ativo após o webhook (não ao voltar do checkout); 1 pedido PAID, 1 período |
| 2 | Pendente | titular `CONT` | Pedido PENDING, **sem** Premium; nada muda até aprovar |
| 3 | Recusado | titular `FUND` ou `SECU` | Sem Premium; pedido FAILED/aberto; jogador pode tentar de novo |
| 4 | Pix | escolher Pix | Fica pendente até concluir; só então libera |
| 5 | Webhook repetido | `npm run mp:sim -- URL ID_DO_PAGAMENTO_APROVADO` (ou "reenviar" no painel do MP) | Premium **não** é concedido de novo (1 período só) |
| 6 | Renovação | comprar com Premium ainda ativo | Novo período começa quando o atual termina (encadeado) |
| 7 | Reembolso | reembolsar o pagamento no painel de teste | Pedido REFUNDED e período revogado automaticamente |
| 8 | Preço alterado no meio | criar o checkout, mudar `premium.priceCents` no Admin, e só então pagar | O pedido mantém o valor de quando foi criado e é concedido normalmente (o valor divergente do Mercado Pago é que bloqueia: `amount_mismatch` aparece só no log do servidor) |
| 9 | Fechou a aba | pagar e fechar antes de voltar ao jogo | Premium liberado mesmo assim, pelo webhook |
| 10 | Conta banida paga | pagar com conta banida | Comportamento hoje: o pagamento é processado pelo webhook; decida a regra e me avise se quiser bloqueio |

Depois de cada cenário confira em Admin → Pedidos e no Extrato. Se algum falhar, me mande o resultado e a linha de log com `requestId`.

## Antes de produção
Troque para as credenciais reais, cadastre o webhook de produção, faça **uma compra real de valor baixo** e reembolse, e confirme o prazo de repasse na sua conta.
