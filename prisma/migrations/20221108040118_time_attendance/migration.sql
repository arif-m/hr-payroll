-- CreateTable
CREATE TABLE `timeAttendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(1) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `workDate` DATE NOT NULL,
    `checkIn` TIME(0) NOT NULL,
    `checkOut` TIME(0) NOT NULL,
    `reason` VARCHAR(300) NOT NULL,

    UNIQUE INDEX `timeAttendance_uuid_key`(`uuid`),
    INDEX `timeAttendance_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timeAttendance` ADD CONSTRAINT `timeAttendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
