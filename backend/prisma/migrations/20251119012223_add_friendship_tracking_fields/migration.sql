-- AlterTable
ALTER TABLE `friendships` ADD COLUMN `accepted_at` DATETIME(3) NULL,
    ADD COLUMN `requester_viewed_at` DATETIME(3) NULL,
    ADD COLUMN `addressee_viewed_at` DATETIME(3) NULL;
