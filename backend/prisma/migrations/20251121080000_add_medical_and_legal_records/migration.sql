-- CreateEnum para PetStatus
ALTER TABLE `pets` ADD COLUMN `status` ENUM('ACTIVE', 'DECEASED', 'LOST', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable MedicalData
CREATE TABLE `medical_data` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_id` VARCHAR(191) NOT NULL,
    `peso` DOUBLE NULL,
    `temperatura` DOUBLE NULL,
    `frecuencia_cardiaca` INTEGER NULL,
    `frecuencia_respiratoria` INTEGER NULL,
    `pulso` VARCHAR(191) NULL,
    `mucosas` VARCHAR(191) NULL,
    `tllc` VARCHAR(191) NULL,
    `hidratacion` VARCHAR(191) NULL,
    `condicion_corporal` INTEGER NULL,
    `ayuno` BOOLEAN NOT NULL DEFAULT false,
    `notas` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `medical_data_procedure_id_key`(`procedure_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable ConsentRecord
CREATE TABLE `consent_records` (
    `id` VARCHAR(191) NOT NULL,
    `procedure_id` VARCHAR(191) NULL,
    `vaccine_id` VARCHAR(191) NULL,
    `consent_type` ENUM('ANESTESIA', 'CIRUGIA', 'HOSPITALIZACION', 'ESTETICA', 'VACUNACION', 'EUTANASIA', 'OTRO') NOT NULL,
    `pdf_url` VARCHAR(191) NOT NULL,
    `signature_url` VARCHAR(191) NULL,
    `signer_name` VARCHAR(191) NOT NULL,
    `signer_relation` VARCHAR(191) NULL,
    `legal_text_version` VARCHAR(191) NOT NULL,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_phone` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `signed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `consent_records_procedure_id_key`(`procedure_id`),
    UNIQUE INDEX `consent_records_vaccine_id_key`(`vaccine_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable DeathCertificate
CREATE TABLE `death_certificates` (
    `id` VARCHAR(191) NOT NULL,
    `pet_id` VARCHAR(191) NOT NULL,
    `vet_id` VARCHAR(191) NOT NULL,
    `death_date` DATETIME(3) NOT NULL,
    `death_type` ENUM('NATURAL', 'EUTANASIA', 'ACCIDENTE', 'ENFERMEDAD', 'DESCONOCIDO') NOT NULL,
    `cause_of_death` TEXT NOT NULL,
    `body_disposal` ENUM('CREMACION', 'ENTIERRO', 'DONACION_CIENCIA', 'RECOGIDA_MUNICIPAL', 'OTRO') NOT NULL,
    `disposal_location` VARCHAR(191) NULL,
    `witness_name` VARCHAR(191) NULL,
    `witness_relation` VARCHAR(191) NULL,
    `pdf_url` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `death_certificates_pet_id_key`(`pet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey MedicalData -> Procedure
ALTER TABLE `medical_data` ADD CONSTRAINT `medical_data_procedure_id_fkey` FOREIGN KEY (`procedure_id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ConsentRecord -> Procedure
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_procedure_id_fkey` FOREIGN KEY (`procedure_id`) REFERENCES `procedures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ConsentRecord -> Vaccine
ALTER TABLE `consent_records` ADD CONSTRAINT `consent_records_vaccine_id_fkey` FOREIGN KEY (`vaccine_id`) REFERENCES `vaccines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey DeathCertificate -> Pet
ALTER TABLE `death_certificates` ADD CONSTRAINT `death_certificates_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey DeathCertificate -> Vet
ALTER TABLE `death_certificates` ADD CONSTRAINT `death_certificates_vet_id_fkey` FOREIGN KEY (`vet_id`) REFERENCES `vets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
