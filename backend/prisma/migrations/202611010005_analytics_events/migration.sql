-- Telemetria de produto sem texto livre ou dados pessoais.
CREATE TABLE `AnalyticsEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `accountId` INTEGER NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `page` VARCHAR(120) NULL,
  `contentType` VARCHAR(64) NULL,
  `contentId` VARCHAR(120) NULL,
  `isTest` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `AnalyticsEvent_name_createdAt_idx`(`name`, `createdAt`),
  INDEX `AnalyticsEvent_accountId_createdAt_idx`(`accountId`, `createdAt`),
  INDEX `AnalyticsEvent_page_createdAt_idx`(`page`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
