# Gaveta `admin`

**Para que serve:** Equipe: painel, permissões, punições, atendimento, auditoria, ajustes de economia.

## Arquivos
- `adminRoutes.ts` – contas, punições, Premium manual, pedidos/reembolso, configurações, economia, extratos, ajuste de ouro, auditoria, saúde, conciliação
- `supportRoutes.ts` – tickets e denúncias do jogador

## Rotas
`/admin/*`, `/support/*`.

## Dependências permitidas
Depende de qualquer gaveta abaixo (é o topo).

## Regras que não podem quebrar
Toda rota admin exige permissão (`shared/permissions.ts`), motivo e linha em `AdminAuditLog` na mesma transação. Ouro e Premium manuais exigem `Idempotency-Key`. Cargos só mudam por `npm run admin:role`.

## Testes
`npm run test:integration` (operations-integration)

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e backend/src/admin/GAVETA.md.
Tarefa: <descreva em uma frase o que mudar>.
Escopo: somente a gaveta admin (e shared/ se for regra compartilhada). Não renomeie rotas, props, colunas nem funções públicas.
Antes de editar: mostre o plano em passos curtos e espere eu aprovar. Trabalhe em uma branch.
Depois: rode npm run check, npm test, npm run check:drawers e <teste de integração da gaveta> (base *_test).
Entregue: o que mudou, o que NÃO conseguiu verificar e uma lista separada de bugs vistos fora do escopo (não corrija).
```
