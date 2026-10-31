-- CreateTable
CREATE TABLE `Account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `vipDays` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Account_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operation` (
    `key` VARCHAR(160) NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Character` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vocation` ENUM('NONE', 'KNIGHT', 'ELITE_KNIGHT', 'PALADIN', 'ROYAL_PALADIN', 'SORCERER', 'MASTER_SORCERER', 'DRUID', 'ELDER_DRUID') NOT NULL DEFAULT 'NONE',
    `level` INTEGER NOT NULL DEFAULT 1,
    `experience` BIGINT NOT NULL DEFAULT 0,
    `hp` INTEGER NOT NULL DEFAULT 150,
    `maxHp` INTEGER NOT NULL DEFAULT 150,
    `mana` INTEGER NOT NULL DEFAULT 55,
    `maxMana` INTEGER NOT NULL DEFAULT 55,
    `energy` INTEGER NOT NULL DEFAULT 100,
    `maxEnergy` INTEGER NOT NULL DEFAULT 100,
    `templeReadyAt` DATETIME(3) NULL,
    `strength` INTEGER NOT NULL DEFAULT 10,
    `vitality` INTEGER NOT NULL DEFAULT 10,
    `agility` INTEGER NOT NULL DEFAULT 10,
    `resistance` INTEGER NOT NULL DEFAULT 10,
    `statPoints` INTEGER NOT NULL DEFAULT 0,
    `goldInHand` BIGINT NOT NULL DEFAULT 100,
    `goldInBank` BIGINT NOT NULL DEFAULT 0,
    `huntMonsterId` INTEGER NULL,
    `huntEndsAt` DATETIME(3) NULL,
    `guildId` INTEGER NULL,
    `guildRank` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    `pvpWins` INTEGER NOT NULL DEFAULT 0,
    `pvpLosses` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Character_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemBlueprint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `tibiaWikiId` VARCHAR(191) NULL,
    `slot` ENUM('AMULET', 'HELMET', 'BACKPACK', 'WEAPON', 'ARMOR', 'SHIELD', 'RING', 'LEGS', 'AMMO', 'BOOTS', 'CONSUMABLE', 'LOOT') NOT NULL,
    `spriteUrl` VARCHAR(191) NOT NULL,
    `attack` INTEGER NOT NULL DEFAULT 0,
    `defense` INTEGER NOT NULL DEFAULT 0,
    `armor` INTEGER NOT NULL DEFAULT 0,
    `minLevel` INTEGER NOT NULL DEFAULT 1,
    `vocations` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `npcPrice` INTEGER NOT NULL DEFAULT 50,

    UNIQUE INDEX `ItemBlueprint_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `blueprintId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `isEquipped` BOOLEAN NOT NULL DEFAULT false,
    `equippedSlot` ENUM('AMULET', 'HELMET', 'BACKPACK', 'WEAPON', 'ARMOR', 'SHIELD', 'RING', 'LEGS', 'AMMO', 'BOOTS', 'CONSUMABLE', 'LOOT') NULL,
    `upgradeTier` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `InventoryItem_characterId_equippedSlot_key`(`characterId`, `equippedSlot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Monster` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `hp` INTEGER NOT NULL,
    `experience` INTEGER NOT NULL,
    `attack` INTEGER NOT NULL,
    `defense` INTEGER NOT NULL,
    `spriteUrl` VARCHAR(191) NOT NULL,
    `goldMin` INTEGER NOT NULL DEFAULT 0,
    `goldMax` INTEGER NOT NULL DEFAULT 10,

    UNIQUE INDEX `Monster_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonsterLoot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `monsterId` INTEGER NOT NULL,
    `blueprintId` INTEGER NOT NULL,
    `dropChance` DOUBLE NOT NULL,
    `maxAmount` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `MonsterLoot_monsterId_blueprintId_key`(`monsterId`, `blueprintId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Battle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `monsterId` INTEGER NOT NULL,
    `activeCharacterId` INTEGER NULL,
    `turnVersion` INTEGER NOT NULL DEFAULT 0,
    `monsterHp` INTEGER NOT NULL,
    `isFinished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `outcome` VARCHAR(191) NOT NULL DEFAULT 'ONGOING',
    `lastLog` JSON NULL,

    UNIQUE INDEX `Battle_activeCharacterId_key`(`activeCharacterId`),
    INDEX `Battle_characterId_isFinished_idx`(`characterId`, `isFinished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MarketListing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sellerId` INTEGER NOT NULL,
    `blueprintId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `upgradeTier` INTEGER NOT NULL DEFAULT 0,
    `price` BIGINT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `buyerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MarketListing_status_id_idx`(`status`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskBlueprint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `monsterId` INTEGER NOT NULL,
    `requiredKills` INTEGER NOT NULL,
    `minLevel` INTEGER NOT NULL DEFAULT 1,
    `rewardExp` INTEGER NOT NULL,
    `rewardGold` INTEGER NOT NULL,
    `rewardItemId` INTEGER NULL,
    `bossMonsterId` INTEGER NULL,

    UNIQUE INDEX `TaskBlueprint_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `taskId` INTEGER NOT NULL,
    `currentKills` INTEGER NOT NULL DEFAULT 0,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `CharacterTask_characterId_taskId_key`(`characterId`, `taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuestBlueprint` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `minLevel` INTEGER NOT NULL,
    `isDungeon` BOOLEAN NOT NULL DEFAULT false,
    `bossMonsterId` INTEGER NOT NULL,
    `rewardExp` INTEGER NOT NULL,
    `rewardGold` INTEGER NOT NULL,
    `rewardItemId` INTEGER NOT NULL,

    UNIQUE INDEX `QuestBlueprint_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterQuest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `questId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CharacterQuest_characterId_questId_key`(`characterId`, `questId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guild` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT 'Uma guilda tibiana.',
    `leaderId` INTEGER NOT NULL,
    `treasury` BIGINT NOT NULL DEFAULT 0,
    `level` INTEGER NOT NULL DEFAULT 1,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `losses` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Guild_name_key`(`name`),
    UNIQUE INDEX `Guild_tag_key`(`tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KingdomState` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `kingId` INTEGER NULL,
    `taxRate` DOUBLE NOT NULL DEFAULT 0.05,
    `coffers` BIGINT NOT NULL DEFAULT 10000,
    `gatesOpen` BOOLEAN NOT NULL DEFAULT false,
    `gatesOpenedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_blueprintId_fkey` FOREIGN KEY (`blueprintId`) REFERENCES `ItemBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonsterLoot` ADD CONSTRAINT `MonsterLoot_monsterId_fkey` FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonsterLoot` ADD CONSTRAINT `MonsterLoot_blueprintId_fkey` FOREIGN KEY (`blueprintId`) REFERENCES `ItemBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Battle` ADD CONSTRAINT `Battle_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Battle` ADD CONSTRAINT `Battle_monsterId_fkey` FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketListing` ADD CONSTRAINT `MarketListing_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MarketListing` ADD CONSTRAINT `MarketListing_blueprintId_fkey` FOREIGN KEY (`blueprintId`) REFERENCES `ItemBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskBlueprint` ADD CONSTRAINT `TaskBlueprint_monsterId_fkey` FOREIGN KEY (`monsterId`) REFERENCES `Monster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterTask` ADD CONSTRAINT `CharacterTask_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterTask` ADD CONSTRAINT `CharacterTask_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `TaskBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestBlueprint` ADD CONSTRAINT `QuestBlueprint_bossMonsterId_fkey` FOREIGN KEY (`bossMonsterId`) REFERENCES `Monster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestBlueprint` ADD CONSTRAINT `QuestBlueprint_rewardItemId_fkey` FOREIGN KEY (`rewardItemId`) REFERENCES `ItemBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterQuest` ADD CONSTRAINT `CharacterQuest_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterQuest` ADD CONSTRAINT `CharacterQuest_questId_fkey` FOREIGN KEY (`questId`) REFERENCES `QuestBlueprint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

