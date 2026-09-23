-- AlterTable
ALTER TABLE `users` ADD COLUMN `payrollPeriod` VARCHAR(7) NOT NULL DEFAULT 'Monthly';

-- CreateTable
CREATE TABLE `setupOvertimeMultiplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `numberOfOvertimeDays` FLOAT NOT NULL,
    `workDaysMultiplier` FLOAT NOT NULL,
    `workDays6MultiplierHoliday` FLOAT NOT NULL,
    `workDays6MultiplierHolidaySortDay` FLOAT NOT NULL,
    `workDays5MultiplierHoliday` FLOAT NOT NULL,

    UNIQUE INDEX `setupOvertimeMultiplier_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
