/*
  Warnings:

  - Added the required column `divisionId` to the `requestOvertimeHeader` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `requestOvertimeHeader` ADD COLUMN `divisionId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `requestOvertimeHeader` ADD CONSTRAINT `requestOvertimeHeader_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `division`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
