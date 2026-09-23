-- CreateTable
CREATE TABLE `requestOvertimeHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `overtimeDate` DATETIME(3) NOT NULL,
    `typeOfDay` ENUM('Work', 'Holiday') NOT NULL DEFAULT 'Work',
    `description` VARCHAR(300) NOT NULL,
    `isApprovedByHead` TINYINT NOT NULL DEFAULT 0,
    `approvedDateByHead` DATETIME(0) NULL,
    `commentsByHead` VARCHAR(300) NULL,
    `isApprovedByHR` TINYINT NOT NULL DEFAULT 0,
    `approvedDateByHR` DATETIME(0) NULL,
    `commentsByHR` VARCHAR(300) NULL,
    `isClosed` TINYINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `requestOvertimeHeader_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requestOvertimeDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestOvertimeHeaderId` INTEGER NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `organization` VARCHAR(150) NOT NULL,
    `jobTitle` VARCHAR(150) NOT NULL,
    `startTime` TIME(0) NOT NULL,
    `endTime` TIME(0) NOT NULL,

    UNIQUE INDEX `requestOvertimeDetails_uuid_key`(`uuid`),
    INDEX `requestOvertimeDetails_requestOvertimeHeaderId_fkey`(`requestOvertimeHeaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `requestOvertimeDetails` ADD CONSTRAINT `requestOvertimeDetails_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requestOvertimeDetails` ADD CONSTRAINT `requestOvertimeDetails_requestOvertimeHeaderId_fkey` FOREIGN KEY (`requestOvertimeHeaderId`) REFERENCES `requestOvertimeHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
