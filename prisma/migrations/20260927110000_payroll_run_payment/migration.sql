-- ===========================================================================
-- Migration: PayrollRunPayment — pembayaran bertahap (cicilan/termin) per
-- karyawan dalam satu payroll run. Status UNPAID/PARTIAL/PAID (baris & run)
-- diturunkan dari SUM(amount) tranche vs thpAmount.
-- Jalankan: npx prisma db execute --file prisma/migrations/20260927110000_payroll_run_payment/migration.sql --schema prisma/schema.prisma
-- Aman untuk MySQL 5.7 (MAMP): cek information_schema untuk idempotensi.
-- ===========================================================================

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'payrollRunPayment') = 0,
  'CREATE TABLE `payrollRunPayment` (
     `id` INT NOT NULL AUTO_INCREMENT,
     `uuid` VARCHAR(150) NOT NULL,
     `createdBy` VARCHAR(100) NOT NULL,
     `updatedBy` VARCHAR(100) NOT NULL,
     `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     `updatedAt` DATETIME(3) NOT NULL,
     `payrollRunId` INT NOT NULL,
     `usersId` INT NOT NULL,
     `fullName` VARCHAR(150) NOT NULL,
     `amount` DECIMAL(15,2) NOT NULL,
     `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     `method` VARCHAR(50) NULL,
     `note` VARCHAR(300) NULL,
     UNIQUE INDEX `payrollRunPayment_uuid_key` (`uuid`),
     INDEX `payrollRunPayment_payrollRunId_idx` (`payrollRunId`),
     INDEX `payrollRunPayment_usersId_idx` (`usersId`),
     PRIMARY KEY (`id`)
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1');
PREPARE s1 FROM @stmt; EXECUTE s1; DEALLOCATE PREPARE s1;

-- FK ke payrollRun (idempotent via information_schema.table_constraints)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'payrollRunPayment'
      AND constraint_name = 'payrollRunPayment_payrollRunId_fkey') = 0,
  'ALTER TABLE `payrollRunPayment`
     ADD CONSTRAINT `payrollRunPayment_payrollRunId_fkey`
     FOREIGN KEY (`payrollRunId`) REFERENCES `payrollRun` (`id`)
     ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1');
PREPARE s2 FROM @stmt; EXECUTE s2; DEALLOCATE PREPARE s2;

-- FK composite ke payrollRunDetail(payrollRunId, usersId) — memaksa tranche
-- hanya untuk baris yang memang ada pada run tsb. Baris dihapus manual
-- (RESTRICT), tidak mengikuti lifecycle runDetail.
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'payrollRunPayment'
      AND constraint_name = 'payrollRunPayment_runDetail_fkey') = 0,
  'ALTER TABLE `payrollRunPayment`
     ADD CONSTRAINT `payrollRunPayment_runDetail_fkey`
     FOREIGN KEY (`payrollRunId`, `usersId`)
       REFERENCES `payrollRunDetail` (`payrollRunId`, `usersId`)
     ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1');
PREPARE s3 FROM @stmt; EXECUTE s3; DEALLOCATE PREPARE s3;
