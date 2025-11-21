-- AlterTable
ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(191) NULL,
    ADD COLUMN `foto_url` VARCHAR(191) NULL,
    ADD COLUMN `cover_photo_url` VARCHAR(191) NULL,
    ADD COLUMN `telefono` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vets` ADD COLUMN `foto_url` VARCHAR(191) NULL,
    ADD COLUMN `cover_photo_url` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_google_id_key` ON `users`(`google_id`);
