-- Somente leitura. Execute ANTES de criar os novos índices únicos.
SELECT characterId, COUNT(*) AS total FROM Battle WHERE isFinished = 0 GROUP BY characterId HAVING COUNT(*) > 1;
SELECT characterId, equippedSlot, COUNT(*) AS total FROM InventoryItem
WHERE equippedSlot IS NOT NULL GROUP BY characterId, equippedSlot HAVING COUNT(*) > 1;
SELECT id FROM InventoryItem WHERE quantity <= 0 OR upgradeTier < 0
OR (isEquipped = 1 AND equippedSlot IS NULL) OR (isEquipped = 0 AND equippedSlot IS NOT NULL);
SELECT characterId, taskId, COUNT(*) AS total FROM CharacterTask GROUP BY characterId, taskId HAVING COUNT(*) > 1;
SELECT id FROM MonsterLoot WHERE dropChance < 0 OR dropChance > 1 OR maxAmount < 1;
