-- AlterTable
ALTER TABLE `requestOvertimeDetails` ADD COLUMN `hourlyWages` FLOAT NULL DEFAULT 0,
    ADD COLUMN `multiplier` FLOAT NULL DEFAULT 0,
    ADD COLUMN `workHour` FLOAT NULL DEFAULT 0;
