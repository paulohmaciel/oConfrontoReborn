-- CreateTable
CREATE TABLE `HuntParty` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leaderId` INTEGER NOT NULL,
    `huntKey` VARCHAR(32) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'FORMING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HuntParty_leaderId_status_idx`(`leaderId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HuntPartyMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partyId` INTEGER NOT NULL,
    `characterId` INTEGER NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'INVITED',
    `activeCharacterId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HuntPartyMember_activeCharacterId_key`(`activeCharacterId`),
    INDEX `HuntPartyMember_characterId_status_idx`(`characterId`, `status`),
    UNIQUE INDEX `HuntPartyMember_partyId_characterId_key`(`partyId`, `characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupBattle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partyId` INTEGER NOT NULL,
    `huntKey` VARCHAR(32) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `bossHp` INTEGER NOT NULL,
    `bossMaxHp` INTEGER NOT NULL,
    `state` JSON NOT NULL,
    `deadlineAt` DATETIME(3) NOT NULL,
    `isFinished` BOOLEAN NOT NULL DEFAULT false,
    `outcome` VARCHAR(12) NOT NULL DEFAULT 'ONGOING',
    `log` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupBattle_huntKey_isFinished_idx`(`huntKey`, `isFinished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupBattleFighter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `battleId` INTEGER NOT NULL,
    `characterId` INTEGER NOT NULL,
    `vocation` VARCHAR(16) NOT NULL,
    `hp` INTEGER NOT NULL,
    `maxHp` INTEGER NOT NULL,
    `mana` INTEGER NOT NULL,
    `maxMana` INTEGER NOT NULL,
    `action` VARCHAR(16) NULL,
    `activeCharacterId` INTEGER NULL,
    `rewardGold` BIGINT NOT NULL DEFAULT 0,
    `rewardExperience` INTEGER NOT NULL DEFAULT 0,
    `rewarded` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `GroupBattleFighter_activeCharacterId_key`(`activeCharacterId`),
    INDEX `GroupBattleFighter_characterId_rewarded_idx`(`characterId`, `rewarded`),
    UNIQUE INDEX `GroupBattleFighter_battleId_characterId_key`(`battleId`, `characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HuntParty` ADD CONSTRAINT `HuntParty_leaderId_fkey` FOREIGN KEY (`leaderId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HuntPartyMember` ADD CONSTRAINT `HuntPartyMember_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `HuntParty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HuntPartyMember` ADD CONSTRAINT `HuntPartyMember_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupBattle` ADD CONSTRAINT `GroupBattle_partyId_fkey` FOREIGN KEY (`partyId`) REFERENCES `HuntParty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupBattleFighter` ADD CONSTRAINT `GroupBattleFighter_battleId_fkey` FOREIGN KEY (`battleId`) REFERENCES `GroupBattle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupBattleFighter` ADD CONSTRAINT `GroupBattleFighter_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

