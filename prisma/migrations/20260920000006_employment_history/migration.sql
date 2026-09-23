-- Migration: EmploymentHistory — riwayat gaji/jabatan efektif-tanggal.
-- Merekam setiap perubahan komponen gaji, jabatan, divisi, status kepegawaian,
-- dan PTKP dengan tanggal efektif; sumber rekonstruksi gaji historis untuk
-- prorata THR dan audit. Ditulis oleh libs/payroll/employment-history.js.

CREATE TABLE `employmentHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usersId` INTEGER NOT NULL,
    `effectiveDate` DATE NOT NULL,
    `changeType` VARCHAR(50) NOT NULL,
    `reason` VARCHAR(150) NULL,
    `jobTitleId` INTEGER NULL,
    `jobTitleName` VARCHAR(150) NULL,
    `divisionId` INTEGER NULL,
    `divisionName` VARCHAR(150) NULL,
    `employmentStatus` VARCHAR(50) NULL,
    `ptkpCode` VARCHAR(20) NULL,
    `salaryComponents` JSON NULL,
    `createdBy` VARCHAR(100) NOT NULL,
    `updatedBy` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employmentHistory_usersId_effectiveDate_idx`(`usersId`, `effectiveDate`),
    CONSTRAINT `employmentHistory_usersId_fkey` FOREIGN KEY (`usersId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
