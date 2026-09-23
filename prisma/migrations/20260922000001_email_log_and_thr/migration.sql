-- ===========================================================================
-- Migration: EmailLog (audit kirim payslip) + THR (setupSystem & cutOffPeriod)
-- Jalankan: npx prisma db execute --file prisma/migrations/20260922000001_email_log_and_thr/migration.sql --schema prisma/schema.prisma
-- Aman untuk MySQL 5.7 (MAMP): tanpa ADD COLUMN IF NOT EXISTS / IF NOT EXISTS
-- pada CREATE TABLE kompatibel; cek information_schema untuk idempotensi.
-- ===========================================================================

-- 1) Tabel emailLog (audit pengiriman payslip)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'emailLog') = 0,
  'CREATE TABLE `emailLog` (
     `id` INT NOT NULL AUTO_INCREMENT,
     `payslipHeaderId` INT NOT NULL,
     `toEmail` VARCHAR(150) NOT NULL,
     `status` VARCHAR(20) NOT NULL,
     `error` VARCHAR(300) NULL,
     `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
     `sentBy` VARCHAR(100) NOT NULL,
     PRIMARY KEY (`id`),
     KEY `emailLog_payslipHeaderId_fkey` (`payslipHeaderId`),
     CONSTRAINT `emailLog_payslipHeaderId_fkey` FOREIGN KEY (`payslipHeaderId`)
       REFERENCES `payslipHeader` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1');
PREPARE s1 FROM @stmt; EXECUTE s1; DEALLOCATE PREPARE s1;

-- 2) Kolom THR di setupSystem
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'setupSystem'
      AND column_name = 'thrBudgetBaseCodes') = 0,
  'ALTER TABLE `setupSystem`
     ADD COLUMN `thrBudgetBaseCodes` VARCHAR(150) NOT NULL DEFAULT ''BS''',
  'SELECT 1');
PREPARE s2 FROM @stmt; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'setupSystem'
      AND column_name = 'thrEligibilityMonths') = 0,
  'ALTER TABLE `setupSystem` ADD COLUMN `thrEligibilityMonths` INT NOT NULL DEFAULT 1',
  'SELECT 1');
PREPARE s3 FROM @stmt; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'setupSystem'
      AND column_name = 'thrProrateRoundDays') = 0,
  'ALTER TABLE `setupSystem` ADD COLUMN `thrProrateRoundDays` TINYINT NOT NULL DEFAULT 1',
  'SELECT 1');
PREPARE s4 FROM @stmt; EXECUTE s4; DEALLOCATE PREPARE s4;

-- 3) Flag periode THR di cutOffPeriod
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'cutOffPeriod'
      AND column_name = 'isThr') = 0,
  'ALTER TABLE `cutOffPeriod` ADD COLUMN `isThr` TINYINT NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE s5 FROM @stmt; EXECUTE s5; DEALLOCATE PREPARE s5;
