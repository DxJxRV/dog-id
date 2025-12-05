/*
  Warnings:

  - A unique constraint covering the columns `[appointment_id]` on the table `smart_consultations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `procedures` ADD COLUMN `smart_consultation_id` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('COMPLETED', 'DRAFT') NOT NULL DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE `smart_consultations` ADD COLUMN `appointment_id` VARCHAR(191) NULL,
    ADD COLUMN `medical_highlights` JSON NULL,
    MODIFY `summary` TEXT NULL;

-- AlterTable
ALTER TABLE `vaccines` ADD COLUMN `smart_consultation_id` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('COMPLETED', 'DRAFT') NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE `clinics` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `settings` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clinic_members` (
    `id` VARCHAR(191) NOT NULL,
    `clinic_id` VARCHAR(191) NOT NULL,
    `vet_id` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'VET', 'ASSISTANT') NOT NULL DEFAULT 'VET',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `clinic_members_clinic_id_vet_id_key`(`clinic_id`, `vet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(191) NOT NULL,
    `clinic_id` VARCHAR(191) NOT NULL,
    `vet_id` VARCHAR(191) NOT NULL,
    `pet_id` VARCHAR(191) NOT NULL,
    `start_date_time` DATETIME(3) NOT NULL,
    `end_date_time` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `smart_consultations_appointment_id_key` ON `smart_consultations`(`appointment_id`);

-- AddForeignKey
ALTER TABLE `vaccines` ADD CONSTRAINT `vaccines_smart_consultation_id_fkey` FOREIGN KEY (`smart_consultation_id`) REFERENCES `smart_consultations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procedures` ADD CONSTRAINT `procedures_smart_consultation_id_fkey` FOREIGN KEY (`smart_consultation_id`) REFERENCES `smart_consultations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinic_members` ADD CONSTRAINT `clinic_members_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinic_members` ADD CONSTRAINT `clinic_members_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_clinic_id_fkey` FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smart_consultations` ADD CONSTRAINT `smart_consultations_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
