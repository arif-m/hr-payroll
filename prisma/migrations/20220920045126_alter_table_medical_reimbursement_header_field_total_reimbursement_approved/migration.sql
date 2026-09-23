/*
  Warnings:

  - Added the required column `totalReimbursementApproved` to the `requestMedicalReimbursementHeader` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `requestMedicalReimbursementHeader` ADD COLUMN `totalReimbursementApproved` FLOAT NOT NULL;
