/*
  Warnings:

  - You are about to drop the column `numberOfOvertimeDays` on the `setupOvertimeMultiplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `setupOvertimeMultiplier` DROP COLUMN `numberOfOvertimeDays`,
    ADD COLUMN `numberOfOvertimeHours` FLOAT NOT NULL DEFAULT 1;
