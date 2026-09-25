-- AlterTable
ALTER TABLE `businessUnit` ADD COLUMN `attendanceMode` VARCHAR(10) NOT NULL DEFAULT 'EXCEPTION',
    ADD COLUMN `defaultShiftId` INTEGER NULL;

-- AlterTable
ALTER TABLE `cutOffPeriod` ADD COLUMN `attendanceClosed` TINYINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `timeAttendance` ADD COLUMN `earlyOutMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `isDerived` TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `shiftId` INTEGER NULL;

-- CreateTable
CREATE TABLE `shift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `shiftName` VARCHAR(150) NOT NULL,
    `startTime` TIME(0) NOT NULL,
    `endTime` TIME(0) NOT NULL,
    `crossesMidnight` TINYINT NOT NULL DEFAULT 0,
    `graceMinutes` INTEGER NOT NULL DEFAULT 10,

    UNIQUE INDEX `shift_uuid_key`(`uuid`),
    UNIQUE INDEX `shift_shiftName_key`(`shiftName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employeeShift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `shiftId` INTEGER NOT NULL,
    `effectiveFrom` DATE NOT NULL,

    UNIQUE INDEX `employeeShift_uuid_key`(`uuid`),
    INDEX `employeeShift_employeeId_fkey`(`employeeId`),
    INDEX `employeeShift_shiftId_fkey`(`shiftId`),
    UNIQUE INDEX `employeeShift_employee_effectiveFrom_unique`(`employeeId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `businessUnit` ADD CONSTRAINT `businessUnit_defaultShiftId_fkey` FOREIGN KEY (`defaultShiftId`) REFERENCES `shift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeeShift` ADD CONSTRAINT `employeeShift_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employeeShift` ADD CONSTRAINT `employeeShift_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shift`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeAttendance` ADD CONSTRAINT `timeAttendance_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `shift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
