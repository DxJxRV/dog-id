-- AlterTable
ALTER TABLE `pets` ADD COLUMN `transfer_code` VARCHAR(191) NULL,
    ADD COLUMN `transfer_code_expires_at` DATETIME(3) NULL,
    ADD COLUMN `created_by_vet_id` VARCHAR(191) NULL,
    ADD COLUMN `pending_transfer` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `pets_transfer_code_key` ON `pets`(`transfer_code`);

-- AddForeignKey
ALTER TABLE `pets` ADD CONSTRAINT `pets_created_by_vet_id_fkey` FOREIGN KEY (`created_by_vet_id`) REFERENCES `vets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
