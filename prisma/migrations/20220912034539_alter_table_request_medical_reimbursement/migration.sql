/*
  Warnings:

  - You are about to drop the column `approvedByFinance` on the `requestMedicalReimbursementHeader` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByHR` on the `requestMedicalReimbursementHeader` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `requestMedicalReimbursementHeader` DROP COLUMN `approvedByFinance`,
    DROP COLUMN `approvedByHR`,
    ADD COLUMN `isApprovedByFinance` TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN `isApprovedByHR` TINYINT NOT NULL DEFAULT 0;
