# Gaveta `frontend/src`
**Para que serve:** a tela. `App.tsx` guarda o estado e orquestra; cada assunto é uma pasta em `features/`.

| Pasta | Conteúdo |
|---|---|
| `lib/` | `api.ts` (chamadas), `types.ts`, `format.ts` (ouro, datas), `tabs.ts`, `theme.ts` |
| `ui/` | peças sem assunto: `GameIcon`, `ThemeToggle`, `Feedback` |
| `styles/` | CSS (tema claro/escuro) |
| `features/auth` | `LoginScreen`, `RecoveryForms` (esqueci/redefinir/verificar e-mail) |
| `features/adventure` | Jornada, Diário, Caçar (`HuntPanel`), escolha de vocação |
| `features/group` · `duel` | Caçada em grupo (`GroupHuntPanel`), Duelo entre amigos (`DuelPanel`: desafios, rodadas, histórico, ranking de honra) |
| `features/hero` | `Sidebar`, `StatsPanel` (atributos), `TemplePanel` |
| `features/inventory` | `BagPanel` (mochila), `EquipmentPanel` |
| `features/shop` · `market` · `forge` · `tasks` | Mercador, Mercado, Ferreiro (risco de quebra), Tarefas |
| `features/characters` · `premium` · `ledger` · `support` | Personagens/classes, Premium e pagamento, Extrato, Suporte |
| `features/admin` | Painel da equipe |
| `features/atlas` | Biblioteca de ícones |

**Regras:** `lib` não importa ninguém; `ui` só `lib`; uma feature não importa outra (exceções declaradas em `scripts/check-drawers.mjs`: admin→ledger, auth→adventure, characters→adventure). Preços, taxas e chances vêm de `/config`; nunca fixe números de economia aqui. Ações do jogador: `command()`/`perform()` do `App.tsx` (já mandam `Idempotency-Key`). Rótulos em português; sprites do TibiaWiki.

**Testes:** `npm run check` (tipos), `npm run build`, olhar a tela nos dois temas e no celular.

## Modelo de prompt de manutenção
```
Leia GAVETAS.md e frontend/src/GAVETA.md.
Tarefa: <o que mudar na tela>, somente em features/<pasta>.
Não mude rotas da API, props existentes nem textos fora do pedido. Trabalhe em uma branch e mostre o plano antes.
Depois: npm run check, npm run check:drawers, npm run build; descreva como conferir a tela nos dois temas.
Entregue: o que mudou, o que não conseguiu verificar e bugs vistos fora do escopo (sem corrigir).
```
