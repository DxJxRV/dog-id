/*
  Warnings:

  - The primary key for the `pets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `procedures` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vaccines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vet_pet_links` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `vets` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `pets` DROP FOREIGN KEY `pets_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures` DROP FOREIGN KEY `procedures_pet_id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures` DROP FOREIGN KEY `procedures_vet_id_fkey`;

-- DropForeignKey
ALTER TABLE `vaccines` DROP FOREIGN KEY `vaccines_pet_id_fkey`;

-- DropForeignKey
ALTER TABLE `vaccines` DROP FOREIGN KEY `vaccines_vet_id_fkey`;

-- DropForeignKey
ALTER TABLE `vet_pet_links` DROP FOREIGN KEY `vet_pet_links_pet_id_fkey`;

-- DropForeignKey
ALTER TABLE `vet_pet_links` DROP FOREIGN KEY `vet_pet_links_vet_id_fkey`;

-- AlterTable
ALTER TABLE `pets` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `user_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `procedures` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `pet_id` VARCHAR(191) NOT NULL,
    MODIFY `vet_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `vaccines` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `pet_id` VARCHAR(191) NOT NULL,
    MODIFY `vet_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `vet_pet_links` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `vet_id` VARCHAR(191) NOT NULL,
    MODIFY `pet_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `vets` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `pets` ADD CONSTRAINT `pets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vaccines` ADD CONSTRAINT `vaccines_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vaccines` ADD CONSTRAINT `vaccines_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures` ADD CONSTRAINT `procedures_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures` ADD CONSTRAINT `procedures_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vet_pet_links` ADD CONSTRAINT `vet_pet_links_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vet_pet_links` ADD CONSTRAINT `vet_pet_links_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
