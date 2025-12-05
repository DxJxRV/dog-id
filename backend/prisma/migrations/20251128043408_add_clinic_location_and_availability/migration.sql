-- AlterTable
ALTER TABLE `clinic_members` ADD COLUMN `is_available` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `clinics` ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;
