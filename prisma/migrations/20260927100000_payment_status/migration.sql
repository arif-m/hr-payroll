-- Status pembayaran gaji: level run + level karyawan (runDetail).
-- MySQL: enum inline (konvensi migrasi proyek ini).

-- 1) PayrollRun
ALTER TABLE `payrollRun`
  ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN `paymentMarkedAt` DATETIME(3) NULL,
  ADD COLUMN `paymentMarkedBy` VARCHAR(100) NULL,
  ADD COLUMN `paymentNote` VARCHAR(300) NULL;

-- 2) PayrollRunDetail (status per karyawan)
ALTER TABLE `payrollRunDetail`
  ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN `paidAt` DATETIME(3) NULL,
  ADD COLUMN `paymentNote` VARCHAR(300) NULL;
