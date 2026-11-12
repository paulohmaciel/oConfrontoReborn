# Gaveta `community`

**Para que serve:** Comunidade: perfil público do personagem (imagem da galeria, descrição), recados, depoimentos com aprovação, amizades, visitas e denúncias. O fórum entra aqui também.

## Arquivos
- `communityService.ts` – regras de perfil, recados, depoimentos, amizades, visitas e denúncias
- `communityRoutes.ts` – rotas `/community/*`, `/forum*` e `/characters/:id/{community,forum}/*`
- `forumService.ts` – fórum: tópicos, comentários (um nível de resposta), votos, resolvido, apagar o próprio

## Rotas
`GET /community/profiles/:nome?as=<id>`, `GET /community/search?q=`, `GET /characters/:id/community`, `POST /characters/:id/community/{profile,scraps,testimonials,friends,report}` e ações por id.

## Dependências permitidas
`core` e `premium` (só `isPremium`). Regras e limites em `shared/community.ts`.

## Regras que não podem quebrar
Toda mudança trava o personagem do autor (`lockCharacter`) e confere a conta. Texto é puro (`cleanText`), com limite de tamanho; recados têm intervalo mínimo. Depoimento só aparece depois de aprovado. O dono do perfil apaga o que está no próprio perfil; denúncias viram atendimento `REPORT` na fila da equipe; remoção pela equipe é rota `/admin/*` com permissão `community.moderate`, motivo e auditoria. Premium só libera imagens "lendárias" e descrição maior.

## Testes
`npm run test:integration` (community-integration)
