-- CreateTable
CREATE TABLE `Duel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `challengerId` INTEGER NOT NULL,
    `opponentId` INTEGER NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'INVITED',
    `round` INTEGER NOT NULL DEFAULT 1,
    `inviteExpiresAt` DATETIME(3) NOT NULL,
    `deadlineAt` DATETIME(3) NULL,
    `state` JSON NULL,
    `log` JSON NULL,
    `outcome` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `winnerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `Duel_challengerId_status_idx`(`challengerId`, `status`),
    INDEX `Duel_opponentId_status_idx`(`opponentId`, `status`),
    INDEX `Duel_status_deadlineAt_idx`(`status`, `deadlineAt`),
    INDEX `Duel_status_inviteExpiresAt_idx`(`status`, `inviteExpiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DuelFighter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `duelId` INTEGER NOT NULL,
    `characterId` INTEGER NOT NULL,
    `vocation` VARCHAR(16) NOT NULL,
    `hp` INTEGER NOT NULL,
    `maxHp` INTEGER NOT NULL,
    `mana` INTEGER NOT NULL,
    `maxMana` INTEGER NOT NULL,
    `action` VARCHAR(16) NULL,
    `missed` INTEGER NOT NULL DEFAULT 0,
    `activeCharacterId` INTEGER NULL,

    UNIQUE INDEX `DuelFighter_activeCharacterId_key`(`activeCharacterId`),
    INDEX `DuelFighter_characterId_idx`(`characterId`),
    UNIQUE INDEX `DuelFighter_duelId_characterId_key`(`duelId`, `characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Duel` ADD CONSTRAINT `Duel_challengerId_fkey` FOREIGN KEY (`challengerId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Duel` ADD CONSTRAINT `Duel_opponentId_fkey` FOREIGN KEY (`opponentId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DuelFighter` ADD CONSTRAINT `DuelFighter_duelId_fkey` FOREIGN KEY (`duelId`) REFERENCES `Duel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DuelFighter` ADD CONSTRAINT `DuelFighter_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

