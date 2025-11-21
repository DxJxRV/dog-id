-- AlterTable - Agregar foto_url a users (faltante de migración anterior)
ALTER TABLE `users` ADD COLUMN `foto_url` VARCHAR(191) NULL;

-- AlterTable - Agregar foto_url a vets (faltante de migración anterior)
ALTER TABLE `vets` ADD COLUMN `foto_url` VARCHAR(191) NULL;
