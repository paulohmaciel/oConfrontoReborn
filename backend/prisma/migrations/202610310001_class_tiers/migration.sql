-- Classes até o nível 1000 (aditiva). 0 = classe guardada pela vocação (base ou promovida); 2..8 = classes seguintes.
ALTER TABLE `Character` ADD COLUMN `classTier` INTEGER NOT NULL DEFAULT 0;
