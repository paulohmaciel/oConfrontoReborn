-- Versão 0.6.0 — migração ADITIVA (itens raros: equipamentos que chegam ao +10). Sem DROP, TRUNCATE ou alteração destrutiva.

CREATE TABLE `RareItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blueprintId` INTEGER NOT NULL,
    `serial` INTEGER NOT NULL,
    `creatorId` INTEGER NULL,
    `firstOfKind` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CIRCULATING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `retiredAt` DATETIME(3) NULL,
    `retiredReason` VARCHAR(40) NULL,
    INDEX `RareItem_status_idx`(`status`),
    UNIQUE INDEX `RareItem_blueprintId_serial_key`(`blueprintId`, `serial`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RareItemEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rareItemId` INTEGER NOT NULL,
    `kind` VARCHAR(24) NOT NULL,
    `detail` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `RareItemEvent_rareItemId_idx`(`rareItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Character` ADD COLUMN `fameHidden` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `InventoryItem` ADD COLUMN `rareItemId` INTEGER NULL;
CREATE UNIQUE INDEX `InventoryItem_rareItemId_key` ON `InventoryItem`(`rareItemId`);
ALTER TABLE `MarketListing` ADD COLUMN `rareItemId` INTEGER NULL;

ALTER TABLE `RareItem` ADD CONSTRAINT `RareItem_blueprintId_fkey` FOREIGN KEY (`blueprintId`) REFERENCES `ItemBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `RareItem` ADD CONSTRAINT `RareItem_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RareItemEvent` ADD CONSTRAINT `RareItemEvent_rareItemId_fkey` FOREIGN KEY (`rareItemId`) REFERENCES `RareItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_rareItemId_fkey` FOREIGN KEY (`rareItemId`) REFERENCES `RareItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MarketListing` ADD CONSTRAINT `MarketListing_rareItemId_fkey` FOREIGN KEY (`rareItemId`) REFERENCES `RareItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
