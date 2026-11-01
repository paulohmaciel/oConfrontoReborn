-- AlterTable
ALTER TABLE `Character` ADD COLUMN `honorMarks` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `honorPoints` INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE `Duel` ADD COLUMN `fee` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `honorDelta` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `mode` VARCHAR(8) NOT NULL DEFAULT 'HONOR',
    ADD COLUMN `stake` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `wager` BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `DuelLoot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `duelId` INTEGER NOT NULL,
    `loserId` INTEGER NOT NULL,
    `winnerId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `blueprintId` INTEGER NOT NULL,
    `upgradeTier` INTEGER NOT NULL DEFAULT 0,
    `ransomPrice` BIGINT NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `DuelLoot_loserId_status_idx`(`loserId`, `status`),
    INDEX `DuelLoot_winnerId_status_idx`(`winnerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterCosmetic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `key` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CharacterCosmetic_characterId_key_key`(`characterId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DuelLoot` ADD CONSTRAINT `DuelLoot_duelId_fkey` FOREIGN KEY (`duelId`) REFERENCES `Duel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DuelLoot` ADD CONSTRAINT `DuelLoot_loserId_fkey` FOREIGN KEY (`loserId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DuelLoot` ADD CONSTRAINT `DuelLoot_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterCosmetic` ADD CONSTRAINT `CharacterCosmetic_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

