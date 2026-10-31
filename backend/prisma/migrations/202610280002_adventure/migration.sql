-- AlterTable
ALTER TABLE `Character` ADD COLUMN `journeyStep` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `vocationChosen` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ItemBlueprint` ADD COLUMN `criticalChance` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `fireResistance` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `magicAttack` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `speed` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Monster` ADD COLUMN `element` VARCHAR(191) NOT NULL DEFAULT 'PHYSICAL',
    ADD COLUMN `isBoss` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `regionKey` VARCHAR(191) NOT NULL DEFAULT 'outskirts';

-- AlterTable
ALTER TABLE `Battle` ADD COLUMN `rewardExperience` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rewardGold` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `rewardRecorded` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `AdventureEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdventureEvent_characterId_id_idx`(`characterId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterAchievement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CharacterAchievement_characterId_key_key`(`characterId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdventureEvent` ADD CONSTRAINT `AdventureEvent_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterAchievement` ADD CONSTRAINT `CharacterAchievement_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

