-- Versão 0.5.0 — migração ADITIVA. Sem DROP, TRUNCATE ou alteração destrutiva de dados existentes.

-- AlterTable
ALTER TABLE `Account` ADD COLUMN `role` ENUM('PLAYER', 'SUPPORT', 'MODERATOR', 'ADMIN') NOT NULL DEFAULT 'PLAYER',
    ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Character` ADD COLUMN `promotedAt` DATETIME(3) NULL,
    ADD COLUMN `profileTitle` VARCHAR(24) NULL,
    ADD COLUMN `profileEmblem` VARCHAR(40) NULL,
    ADD COLUMN `profileBio` VARCHAR(160) NULL,
    ADD COLUMN `profileFrame` VARCHAR(16) NULL;

-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `favorite` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: anúncios já abertos recebem validade a partir de agora (48 h); histórico de vendas passa a registrar data e taxas.
ALTER TABLE `MarketListing` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `soldAt` DATETIME(3) NULL,
    ADD COLUMN `fee` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `listingFee` BIGINT NOT NULL DEFAULT 0;
UPDATE `MarketListing` SET `expiresAt` = DATE_ADD(NOW(3), INTERVAL 48 HOUR) WHERE `status` = 'OPEN' AND `expiresAt` IS NULL;
CREATE INDEX `MarketListing_status_expiresAt_idx` ON `MarketListing`(`status`, `expiresAt`);

-- CreateTable
CREATE TABLE `GameSetting` (
    `key` VARCHAR(64) NOT NULL,
    `value` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` INTEGER NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoldLedger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `delta` BIGINT NOT NULL,
    `balanceAfter` BIGINT NOT NULL,
    `reason` VARCHAR(32) NOT NULL,
    `refType` VARCHAR(24) NULL,
    `refId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GoldLedger_characterId_id_idx`(`characterId`, `id`),
    INDEX `GoldLedger_reason_createdAt_idx`(`reason`, `createdAt`),
    INDEX `GoldLedger_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemLedger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `blueprintId` INTEGER NOT NULL,
    `delta` INTEGER NOT NULL,
    `upgradeTier` INTEGER NOT NULL DEFAULT 0,
    `reason` VARCHAR(32) NOT NULL,
    `refType` VARCHAR(24) NULL,
    `refId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ItemLedger_characterId_id_idx`(`characterId`, `id`),
    INDEX `ItemLedger_blueprintId_createdAt_idx`(`blueprintId`, `createdAt`),
    INDEX `ItemLedger_reason_createdAt_idx`(`reason`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountToken` (
    `tokenHash` VARCHAR(64) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AccountToken_accountId_kind_idx`(`accountId`, `kind`),
    INDEX `AccountToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Punishment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedById` INTEGER NULL,
    `revokeReason` VARCHAR(500) NULL,

    INDEX `Punishment_accountId_kind_idx`(`accountId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminAuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorAccountId` INTEGER NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `targetType` VARCHAR(24) NOT NULL,
    `targetId` INTEGER NULL,
    `reason` VARCHAR(500) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAuditLog_actorAccountId_id_idx`(`actorAccountId`, `id`),
    INDEX `AdminAuditLog_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL DEFAULT 'SUPPORT',
    `reportedCharacterId` INTEGER NULL,
    `subject` VARCHAR(120) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'OPEN',
    `assignedToId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportTicket_status_id_idx`(`status`, `id`),
    INDEX `SupportTicket_accountId_id_idx`(`accountId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `authorAccountId` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `internal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportMessage_ticketId_id_idx`(`ticketId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PremiumOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `amountCents` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'BRL',
    `days` INTEGER NOT NULL,
    `provider` VARCHAR(16) NOT NULL DEFAULT 'MERCADOPAGO',
    `providerPreferenceId` VARCHAR(80) NULL,
    `providerPaymentId` VARCHAR(40) NULL,
    `checkoutUrl` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PremiumOrder_providerPaymentId_key`(`providerPaymentId`),
    INDEX `PremiumOrder_accountId_id_idx`(`accountId`, `id`),
    INDEX `PremiumOrder_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PremiumPeriod` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `source` VARCHAR(12) NOT NULL,
    `orderId` INTEGER NULL,
    `days` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedById` INTEGER NULL,
    `revokeReason` VARCHAR(500) NULL,

    UNIQUE INDEX `PremiumPeriod_orderId_key`(`orderId`),
    INDEX `PremiumPeriod_accountId_endsAt_idx`(`accountId`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(16) NOT NULL,
    `eventKey` VARCHAR(120) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentEvent_eventKey_key`(`eventKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `characterId` INTEGER NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `itemIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CharacterPreset_characterId_name_key`(`characterId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GoldLedger` ADD CONSTRAINT `GoldLedger_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ItemLedger` ADD CONSTRAINT `ItemLedger_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AccountToken` ADD CONSTRAINT `AccountToken_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Punishment` ADD CONSTRAINT `Punishment_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PremiumOrder` ADD CONSTRAINT `PremiumOrder_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PremiumPeriod` ADD CONSTRAINT `PremiumPeriod_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PremiumPeriod` ADD CONSTRAINT `PremiumPeriod_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PremiumOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CharacterPreset` ADD CONSTRAINT `CharacterPreset_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
