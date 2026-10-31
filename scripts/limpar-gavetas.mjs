// Apaga os arquivos antigos que foram movidos para as gavetas (v0.5.1). Só apaga se o arquivo novo já existir.
// Uso: node scripts/limpar-gavetas.mjs          (mostra o que faria)
//      node scripts/limpar-gavetas.mjs --apagar (apaga)
import { existsSync, rmSync } from 'node:fs';
const apagar = process.argv.includes('--apagar');
const movidos = {
 "backend/src/db.ts": "backend/src/core/db.ts",
 "backend/src/engine.ts": "backend/src/core/engine.ts",
 "backend/src/operations.ts": "backend/src/core/operations.ts",
 "backend/src/settings.ts": "backend/src/core/settings.ts",
 "backend/src/monitor.ts": "backend/src/core/monitor.ts",
 "backend/src/mailer.ts": "backend/src/core/mailer.ts",
 "backend/src/password.ts": "backend/src/core/password.ts",
 "backend/src/engine.test.ts": "backend/src/core/engine.test.ts",
 "backend/src/password.test.ts": "backend/src/core/password.test.ts",
 "backend/src/monitor.test.ts": "backend/src/core/monitor.test.ts",
 "backend/src/auth.ts": "backend/src/account/auth.ts",
 "backend/src/accountTokens.ts": "backend/src/account/accountTokens.ts",
 "backend/src/emailRoutes.ts": "backend/src/account/emailRoutes.ts",
 "backend/src/characterService.ts": "backend/src/game/characterService.ts",
 "backend/src/routes.ts": "backend/src/game/routes.ts",
 "backend/src/readRoutes.ts": "backend/src/game/readRoutes.ts",
 "backend/src/battleService.ts": "backend/src/game/battleService.ts",
 "backend/src/combatStats.ts": "backend/src/game/combatStats.ts",
 "backend/src/gameRules.ts": "backend/src/game/gameRules.ts",
 "backend/src/adventureService.ts": "backend/src/game/adventureService.ts",
 "backend/src/adventureRoutes.ts": "backend/src/game/adventureRoutes.ts",
 "backend/src/taskRoutes.ts": "backend/src/game/taskRoutes.ts",
 "backend/src/gameService.ts": "backend/src/game/gameService.ts",
 "backend/src/inventoryService.ts": "backend/src/game/inventoryService.ts",
 "backend/src/adventure.test.ts": "backend/src/game/adventure.test.ts",
 "backend/src/economy.ts": "backend/src/economy/economy.ts",
 "backend/src/economyRoutes.ts": "backend/src/economy/economyRoutes.ts",
 "backend/src/marketService.ts": "backend/src/economy/marketService.ts",
 "backend/src/reconcile.ts": "backend/src/economy/reconcile.ts",
 "backend/src/economy.test.ts": "backend/src/economy/economy.test.ts",
 "backend/src/premium.ts": "backend/src/premium/premium.ts",
 "backend/src/premiumService.ts": "backend/src/premium/premiumService.ts",
 "backend/src/premiumRoutes.ts": "backend/src/premium/premiumRoutes.ts",
 "backend/src/mercadopago.ts": "backend/src/premium/mercadopago.ts",
 "backend/src/webhookRoutes.ts": "backend/src/premium/webhookRoutes.ts",
 "backend/src/premium.test.ts": "backend/src/premium/premium.test.ts",
 "backend/src/adminRoutes.ts": "backend/src/admin/adminRoutes.ts",
 "backend/src/supportRoutes.ts": "backend/src/admin/supportRoutes.ts",
 "frontend/src/api.ts": "frontend/src/lib/api.ts",
 "frontend/src/types.ts": "frontend/src/lib/types.ts",
 "frontend/src/theme.ts": "frontend/src/lib/theme.ts",
 "frontend/src/GameIcon.tsx": "frontend/src/ui/GameIcon.tsx",
 "frontend/src/ThemeToggle.tsx": "frontend/src/ui/ThemeToggle.tsx",
 "frontend/src/AdventurePanels.tsx": "frontend/src/features/adventure/AdventurePanels.tsx",
 "frontend/src/HuntPanel.tsx": "frontend/src/features/adventure/HuntPanel.tsx",
 "frontend/src/AdminPanel.tsx": "frontend/src/features/admin/AdminPanel.tsx",
 "frontend/src/style.css": "frontend/src/styles/style.css",
 "frontend/src/theme-classic.css": "frontend/src/styles/theme-classic.css",
 "frontend/src/theme-toggle.css": "frontend/src/styles/theme-toggle.css",
 "frontend/src/adventure.css": "frontend/src/styles/adventure.css",
 "frontend/src/operations.css": "frontend/src/styles/operations.css"
};
const divididos = {
 "frontend/src/OperationsPanels.tsx": [
  "frontend/src/features/characters/CharactersPanel.tsx",
  "frontend/src/features/premium/PremiumPanel.tsx",
  "frontend/src/features/ledger/LedgerPanel.tsx",
  "frontend/src/features/support/SupportPanel.tsx",
  "frontend/src/features/auth/RecoveryForms.tsx",
  "frontend/src/lib/format.ts",
  "frontend/src/ui/Feedback.tsx"
 ]
};
let n = 0;
for (const [antigo, novo] of Object.entries(movidos)) {
  if (antigo === novo || !existsSync(antigo)) continue;
  if (!existsSync(novo)) { console.warn(`PULADO ${antigo}: falta o novo ${novo}`); continue; }
  console.log(`${apagar ? 'apagando' : 'apagaria'} ${antigo}`); if (apagar) rmSync(antigo); n++;
}
for (const [antigo, novos] of Object.entries(divididos)) {
  if (!existsSync(antigo)) continue;
  if (!novos.every(existsSync)) { console.warn(`PULADO ${antigo}: faltam arquivos novos`); continue; }
  console.log(`${apagar ? 'apagando' : 'apagaria'} ${antigo}`); if (apagar) rmSync(antigo); n++;
}
console.log(`${n} arquivo(s) ${apagar ? 'apagado(s)' : 'a apagar. Rode com --apagar para confirmar'}.`);
