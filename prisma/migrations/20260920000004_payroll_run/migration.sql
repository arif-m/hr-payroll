-- ===========================================================================
-- Migration: PayrollRun — siklus proses payroll per periode
-- (DRAFT → SUBMITTED → APPROVED → LOCKED) + detail per karyawan + tautan
-- payslip ke run-nya. Satu run aktif per periode (unique cutOffPeriodId).
-- Catatan: migrasi dijalankan sekali (konvensi Prisma); bila dijalankan
-- manual berulang, abaikan error 1050/1060/1061 (sudah ada).
-- ===========================================================================

CREATE TABLE `payrollRun` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(150) NOT NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `cutOffPeriodId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED') NOT NULL DEFAULT 'DRAFT',
    `submittedBy` VARCHAR(100) NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(100) NULL,
    `approvedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(100) NULL,
    `lockedAt` DATETIME(3) NULL,
    `taxConfigSnapshot` JSON NULL,
    `note` VARCHAR(300) NULL,

    UNIQUE INDEX `payrollRun_uuid_key`(`uuid`),
    UNIQUE INDEX `payrollRun_cutOffPeriodId_key`(`cutOffPeriodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payrollRunDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `payrollRunId` INTEGER NOT NULL,
    `usersId` INTEGER NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OK',
    `errorMessage` VARCHAR(300) NULL,
    `grossAmount` DECIMAL(15,2) NOT NULL DEFAULT 0,
    `deductionAmount` DECIMAL(15,2) NOT NULL DEFAULT 0,
    `thpAmount` DECIMAL(15,2) NOT NULL DEFAULT 0,
    `pph21Amount` DECIMAL(15,2) NOT NULL DEFAULT 0,

    UNIQUE INDEX `payrollRunDetail_payrollRunId_usersId_key`(`payrollRunId`, `usersId`),
    INDEX `payrollRunDetail_usersId_idx`(`usersId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payrollRun`
  ADD CONSTRAINT `payrollRun_cutOffPeriodId_fkey`
  FOREIGN KEY (`cutOffPeriodId`) REFERENCES `cutOffPeriod`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payrollRunDetail`
  ADD CONSTRAINT `payrollRunDetail_payrollRunId_fkey`
  FOREIGN KEY (`payrollRunId`) REFERENCES `payrollRun`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payslipHeader`
  ADD COLUMN `payrollRunId` INTEGER NULL,
  ADD INDEX `payslipHeader_payrollRunId_idx`(`payrollRunId`);

ALTER TABLE `payslipHeader`
  ADD CONSTRAINT `payslipHeader_payrollRunId_fkey`
  FOREIGN KEY (`payrollRunId`) REFERENCES `payrollRun`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
