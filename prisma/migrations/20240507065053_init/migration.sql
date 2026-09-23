/*
  Warnings:

  - Added the required column `remarks` to the `employeeAnnualLeave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `employeeAnnualLeave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remarks` to the `employeeSickLeave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `employeeSickLeave` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `employeeAnnualLeave` ADD COLUMN `remarks` VARCHAR(200) NOT NULL,
    ADD COLUMN `year` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `employeeSickLeave` ADD COLUMN `remarks` VARCHAR(200) NOT NULL,
    ADD COLUMN `year` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `payslipHeader` MODIFY `employeeId` BIGINT NOT NULL;
