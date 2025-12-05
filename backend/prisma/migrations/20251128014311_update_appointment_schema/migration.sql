-- DropForeignKey
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_vet_id_fkey`;

-- AlterTable
ALTER TABLE `appointments` MODIFY `vet_id` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING_APPROVAL') NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
