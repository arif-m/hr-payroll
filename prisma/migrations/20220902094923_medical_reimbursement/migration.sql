-- AlterTable
ALTER TABLE `users` ADD COLUMN `medicalReimbursementBudget` FLOAT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `medicalReimbursementCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(250) NOT NULL,
    `percentage` DOUBLE NOT NULL,
    `isActive` TINYINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `medicalReimbursementCategory_uuid_key`(`uuid`),
    UNIQUE INDEX `medicalReimbursementCategory_description_key`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requestMedicalReimbursementHeader` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reimbursementCategoryId` INTEGER NOT NULL,
    `reimbursementCategory` VARCHAR(150) NOT NULL,
    `reimbursementDescription` VARCHAR(300) NOT NULL,
    `totalReimbursement` FLOAT NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `businessUnitId` INTEGER NULL,
    `businessUnitName` VARCHAR(150) NULL,
    `divisionId` INTEGER NULL,
    `divisionName` VARCHAR(150) NULL,
    `jobTitleId` INTEGER NULL,
    `jobTitleName` VARCHAR(150) NULL,
    `isApproved` TINYINT NOT NULL DEFAULT 0,
    `approvedBySupervisor` VARCHAR(150) NULL,
    `approvedBySupervisorDate` DATETIME(0) NULL,
    `commentsBySupervisor` VARCHAR(300) NULL,
    `approvedByHR` VARCHAR(150) NULL,
    `approvedByHRDate` DATETIME(0) NULL,
    `commentsByHR` VARCHAR(300) NULL,
    `approvedByFinance` VARCHAR(150) NULL,
    `approvedByFinanceDate` DATETIME(0) NULL,
    `commentsByFinance` VARCHAR(300) NULL,

    UNIQUE INDEX `requestMedicalReimbursementHeader_uuid_key`(`uuid`),
    UNIQUE INDEX `requestMedicalReimbursementHeader_reimbursementDescription_key`(`reimbursementDescription`),
    INDEX `requestMedicalReimbursementHeader_employeeId_fkey`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requestMedicalReimbursementDetails` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `requestMedicalReimbursementHeaderId` INTEGER NOT NULL,
    `detailsDescription` VARCHAR(300) NULL,
    `amount` FLOAT NOT NULL,

    UNIQUE INDEX `requestMedicalReimbursementDetails_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `requestMedicalReimbursementHeader` ADD CONSTRAINT `requestMedicalReimbursementHeader_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requestMedicalReimbursementDetails` ADD CONSTRAINT `requestMedicalReimbursementDetails_requestMedicalReimbursem_fkey` FOREIGN KEY (`requestMedicalReimbursementHeaderId`) REFERENCES `requestMedicalReimbursementHeader`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
