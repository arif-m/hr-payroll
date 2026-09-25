-- AlterTable
ALTER TABLE `setupSystem` ADD COLUMN `latePenaltyEnabled` TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN `latePenaltyBaseCodes` VARCHAR(150) NOT NULL DEFAULT 'BS',
    ADD COLUMN `latePenaltyTiers` JSON NULL,
    ADD COLUMN `latePenaltyEscalation` JSON NULL;
