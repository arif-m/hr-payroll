-- AlterTable
ALTER TABLE `timeAttendance` ADD COLUMN `businessUnitId` INTEGER NULL,
    ADD COLUMN `businessUnitName` VARCHAR(150) NULL,
    ADD COLUMN `divisionId` INTEGER NULL,
    ADD COLUMN `divisionName` VARCHAR(150) NULL,
    ADD COLUMN `fullName` VARCHAR(150) NULL,
    ADD COLUMN `jobTitleId` INTEGER NULL,
    ADD COLUMN `jobTitleName` VARCHAR(150) NULL;
