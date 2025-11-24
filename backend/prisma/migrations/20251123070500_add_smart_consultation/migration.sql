-- CreateTable
CREATE TABLE `smart_consultations` (
    `id` VARCHAR(191) NOT NULL,
    `pet_id` VARCHAR(191) NOT NULL,
    `vet_id` VARCHAR(191) NOT NULL,
    `audio_url` VARCHAR(191) NOT NULL,
    `duration` INTEGER NOT NULL,
    `rawText` TEXT NOT NULL,
    `transcription_json` JSON NOT NULL,
    `summary` TEXT NOT NULL,
    `extracted_vitals` JSON NULL,
    `tags` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `smart_consultations` ADD CONSTRAINT `smart_consultations_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smart_consultations` ADD CONSTRAINT `smart_consultations_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
