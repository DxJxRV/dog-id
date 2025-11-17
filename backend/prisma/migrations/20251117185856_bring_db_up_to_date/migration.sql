/*
  Warnings:

  - A unique constraint covering the columns `[link_code]` on the table `pets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `procedures` DROP FOREIGN KEY `procedures_vet_id_fkey`;

-- AlterTable
ALTER TABLE `pets` ADD COLUMN `archived_by_owner` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `link_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `procedures` MODIFY `vet_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `vaccines` ADD COLUMN `fecha_aplicacion` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `vet_pet_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vet_id` INTEGER NOT NULL,
    `pet_id` INTEGER NOT NULL,
    `archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vet_pet_links_vet_id_pet_id_key`(`vet_id`, `pet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `pets_link_code_key` ON `pets`(`link_code`);

-- AddForeignKey
ALTER TABLE `procedures` ADD CONSTRAINT `procedures_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vet_pet_links` ADD CONSTRAINT `vet_pet_links_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vet_pet_links` ADD CONSTRAINT `vet_pet_links_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
