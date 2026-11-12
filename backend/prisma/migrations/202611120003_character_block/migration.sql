-- Bloqueio de jogador (comunidade): quem bloqueia deixa de receber recado, depoimento e pedido de amizade do bloqueado.
-- Migração aditiva: só cria a tabela nova.
-- CreateTable
CREATE TABLE `CharacterBlock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blockerId` INTEGER NOT NULL,
    `blockedId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CharacterBlock_blockedId_idx`(`blockedId`),
    UNIQUE INDEX `CharacterBlock_blockerId_blockedId_key`(`blockerId`, `blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CharacterBlock` ADD CONSTRAINT `CharacterBlock_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterBlock` ADD CONSTRAINT `CharacterBlock_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
