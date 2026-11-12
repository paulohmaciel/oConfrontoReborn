-- Comunidade (aditiva): imagem de perfil, descrição longa, visitas invisíveis; recados, depoimentos, amizades e visitas.
-- AlterTable
ALTER TABLE `Character` ADD COLUMN `profileAbout` TEXT NULL,
    ADD COLUMN `profileAvatar` VARCHAR(60) NULL,
    ADD COLUMN `profileHideVisits` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ProfileScrap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profileId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    `deletedById` INTEGER NULL,

    INDEX `ProfileScrap_profileId_id_idx`(`profileId`, `id`),
    INDEX `ProfileScrap_authorId_createdAt_idx`(`authorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileTestimonial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profileId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `text` VARCHAR(1000) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `ProfileTestimonial_profileId_status_idx`(`profileId`, `status`),
    UNIQUE INDEX `ProfileTestimonial_profileId_authorId_key`(`profileId`, `authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Friendship` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requesterId` INTEGER NOT NULL,
    `addresseeId` INTEGER NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,

    INDEX `Friendship_addresseeId_status_idx`(`addresseeId`, `status`),
    UNIQUE INDEX `Friendship_requesterId_addresseeId_key`(`requesterId`, `addresseeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileVisit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profileId` INTEGER NOT NULL,
    `visitorId` INTEGER NOT NULL,
    `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfileVisit_profileId_visitedAt_idx`(`profileId`, `visitedAt`),
    UNIQUE INDEX `ProfileVisit_profileId_visitorId_key`(`profileId`, `visitorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProfileScrap` ADD CONSTRAINT `ProfileScrap_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileScrap` ADD CONSTRAINT `ProfileScrap_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileTestimonial` ADD CONSTRAINT `ProfileTestimonial_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileTestimonial` ADD CONSTRAINT `ProfileTestimonial_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_addresseeId_fkey` FOREIGN KEY (`addresseeId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileVisit` ADD CONSTRAINT `ProfileVisit_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileVisit` ADD CONSTRAINT `ProfileVisit_visitorId_fkey` FOREIGN KEY (`visitorId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

