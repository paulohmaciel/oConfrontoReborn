-- CreateTable
CREATE TABLE `GameNotice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(12) NOT NULL DEFAULT 'INFO',
    `message` VARCHAR(300) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GameNotice_endedAt_startsAt_idx`(`endedAt`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

