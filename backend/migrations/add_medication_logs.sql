-- Crear tabla para tracking de medicamentos
CREATE TABLE IF NOT EXISTS `medication_logs` (
  `id` VARCHAR(191) NOT NULL,
  `prescription_item_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `scheduled_time` VARCHAR(191) NOT NULL,
  `taken_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `date` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `medication_logs_prescription_item_id_date_idx`(`prescription_item_id`, `date`),
  INDEX `medication_logs_user_id_date_idx`(`user_id`, `date`),

  CONSTRAINT `medication_logs_prescription_item_id_fkey` FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `medication_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
