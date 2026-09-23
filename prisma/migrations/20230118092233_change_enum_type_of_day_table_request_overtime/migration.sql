/*
  Warnings:

  - You are about to alter the column `typeOfDay` on the `requestOvertimeHeader` table. The data in that column could be lost. The data in that column will be cast from `Enum("requestOvertimeHeader_typeOfDay")` to `Enum("requestOvertimeHeader_typeOfDay")`.

*/
-- AlterTable
ALTER TABLE `requestOvertimeHeader` MODIFY `typeOfDay` ENUM('Workday', 'Holiday') NOT NULL DEFAULT 'Workday';
