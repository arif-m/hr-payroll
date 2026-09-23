-- CreateTable
CREATE TABLE `otherLeaveType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(250) NOT NULL,
    `limit` INTEGER NOT NULL,
    `isActive` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `otherLeaveType_description_key`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requestOtherLeave` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `otherLeaveType` INTEGER NOT NULL,
    `otherleaveTypeDescription` VARCHAR(250) NOT NULL,
    `startDuration` DATETIME(0) NOT NULL,
    `endDuration` DATETIME(0) NOT NULL,
    `days` FLOAT NOT NULL,
    `leaveDescription` VARCHAR(300) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `businessUnitId` INTEGER NULL,
    `businessUnitName` VARCHAR(150) NULL,
    `divisionId` INTEGER NULL,
    `divisionName` VARCHAR(150) NULL,
    `jobTitleId` INTEGER NULL,
    `jobTitleName` VARCHAR(150) NULL,
    `isApproved` TINYINT NOT NULL DEFAULT 0,
    `approvedBy` VARCHAR(150) NULL,
    `approvedDate` DATETIME(0) NULL,
    `commentsBySupervisor` VARCHAR(300) NULL,

    UNIQUE INDEX `requestOtherLeave_uuid_key`(`uuid`),
    INDEX `requestOtherLeave_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `requestOtherLeave` ADD CONSTRAINT `requestOtherLeave_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
