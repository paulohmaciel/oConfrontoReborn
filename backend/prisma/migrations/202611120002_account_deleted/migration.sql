-- Marca de conta apagada a pedido do dono (os dados pessoais saem; extrato e pagamentos ficam sem nome). Aditiva.
ALTER TABLE `Account` ADD COLUMN `deletedAt` DATETIME(3) NULL;
