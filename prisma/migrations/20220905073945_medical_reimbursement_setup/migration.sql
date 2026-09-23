-- AlterTable
ALTER TABLE `setupSystem` ADD COLUMN `isActivatePercentageMedicalReimbursement` TINYINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `medicalReimbursementTaken` FLOAT NOT NULL DEFAULT 0;
