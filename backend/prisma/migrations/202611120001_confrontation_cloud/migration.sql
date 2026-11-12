-- Confrontation (app Godot): save na nuvem, registro verificado, auditoria dos envios e rankings. Aditiva.
CREATE TABLE `ConfrontationSave` (
  `accountId` INTEGER NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 0,
  `data` LONGTEXT NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `clientSavedAt` DATETIME(3) NULL,
  `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `verifiedAt` DATETIME(3) NOT NULL,
  `goldTotal` BIGINT NOT NULL DEFAULT 0,
  `xpTotal` BIGINT NOT NULL DEFAULT 0,
  `items` INTEGER NOT NULL DEFAULT 0,
  `furthest` INTEGER NOT NULL DEFAULT 1,
  `vigilBest` INTEGER NOT NULL DEFAULT 0,
  `power` BIGINT NOT NULL DEFAULT 0,
  `syncs` INTEGER NOT NULL DEFAULT 0,
  `adjustments` INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (`accountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ConfrontationSync` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `accountId` INTEGER NOT NULL,
  `version` INTEGER NOT NULL,
  `hours` DOUBLE NOT NULL,
  `claimed` JSON NOT NULL,
  `accepted` JSON NOT NULL,
  `adjusted` VARCHAR(120) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ConfrontationSync_accountId_createdAt_idx`(`accountId`, `createdAt`),
  INDEX `ConfrontationSync_adjusted_createdAt_idx`(`adjusted`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ConfrontationRank` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `accountId` INTEGER NOT NULL,
  `period` VARCHAR(8) NOT NULL,
  `metric` VARCHAR(8) NOT NULL,
  `value` BIGINT NOT NULL,
  `reachedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ConfrontationRank_accountId_period_metric_key`(`accountId`, `period`, `metric`),
  INDEX `ConfrontationRank_period_metric_value_idx`(`period`, `metric`, `value`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ConfrontationSave` ADD CONSTRAINT `ConfrontationSave_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ConfrontationSync` ADD CONSTRAINT `ConfrontationSync_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ConfrontationRank` ADD CONSTRAINT `ConfrontationRank_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
