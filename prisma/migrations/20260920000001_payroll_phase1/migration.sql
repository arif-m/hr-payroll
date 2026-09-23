-- ===========================================================================
-- Migration: Fase 1 perbaikan payroll
-- PENTING: BACKUP database sebelum menjalankan. Urutan:
--   1. mysql < prisma/migrations/20260920000001_payroll_phase1/migration.sql
--   2. node scripts/seed-ter.js   (isi tabel terRate dari libs/payroll/tax21.js)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Dedup data sebelum menambah unique constraint
-- ---------------------------------------------------------------------------

-- PayslipHeader duplikat (user + bulan + tahun): simpan id terkecil.
DELETE pd FROM payslipDetails pd
JOIN payslipHeader dup ON dup.id = pd.payslipHeaderId
JOIN (
  SELECT MIN(id) AS keepId, usersId, monthPeriod, yearPeriod
  FROM payslipHeader
  GROUP BY usersId, monthPeriod, yearPeriod
  HAVING COUNT(*) > 1
) keep ON keep.usersId = dup.usersId
     AND keep.monthPeriod = dup.monthPeriod
     AND keep.yearPeriod = dup.yearPeriod
     AND dup.id <> keep.keepId;

DELETE ph FROM payslipHeader ph
JOIN (
  SELECT MIN(id) AS keepId, usersId, monthPeriod, yearPeriod
  FROM payslipHeader
  GROUP BY usersId, monthPeriod, yearPeriod
  HAVING COUNT(*) > 1
) keep ON keep.usersId = ph.usersId
     AND keep.monthPeriod = ph.monthPeriod
     AND keep.yearPeriod = ph.yearPeriod
     AND ph.id <> keep.keepId;

-- TimeAttendance duplikat (employee + tanggal): simpan id terkecil.
DELETE ta1 FROM timeAttendance ta1
JOIN timeAttendance ta2
  ON ta1.employeeId = ta2.employeeId
 AND ta1.workDate = ta2.workDate
 AND ta1.id > ta2.id;

-- ---------------------------------------------------------------------------
-- 2. Konversi kolom uang FLOAT/DOUBLE -> DECIMAL
-- ---------------------------------------------------------------------------
ALTER TABLE ptkp MODIFY `amount` DECIMAL(15,2) NULL;
ALTER TABLE pkp MODIFY `startSalary` DECIMAL(18,2) NOT NULL,
               MODIFY `endSalary` DECIMAL(18,2) NOT NULL,
               MODIFY `ratesPercentage` DECIMAL(5,2) NOT NULL;
ALTER TABLE users MODIFY `basicSalary` DECIMAL(15,2) NULL;
ALTER TABLE setupSystem MODIFY `taxPercentage` DECIMAL(5,2) NULL DEFAULT 5;
ALTER TABLE setupOvertimeMultiplier
  MODIFY `numberOfOvertimeHours` DECIMAL(6,2) NOT NULL DEFAULT 1,
  MODIFY `workDaysMultiplier` DECIMAL(5,2) NOT NULL,
  MODIFY `workDays6MultiplierHoliday` DECIMAL(5,2) NOT NULL,
  MODIFY `workDays6MultiplierHolidaySortDay` DECIMAL(5,2) NOT NULL,
  MODIFY `workDays5MultiplierHoliday` DECIMAL(5,2) NOT NULL;
ALTER TABLE salaryTemplateDetails MODIFY `amount` DECIMAL(15,2) NULL;
ALTER TABLE usersSalary MODIFY `amount` DECIMAL(15,2) NULL DEFAULT 0;
ALTER TABLE bpjsTenagaKerjaComponent
  MODIFY `percentage` DECIMAL(5,2) NULL DEFAULT 0,
  MODIFY `minimumWages` DECIMAL(15,2) NULL DEFAULT 0,
  MODIFY `maximumWages` DECIMAL(15,2) NULL DEFAULT 0;
ALTER TABLE templateBpjsTenagaKerjaDetails
  MODIFY `percentage` DECIMAL(5,2) NULL DEFAULT 0,
  MODIFY `minimumWages` DECIMAL(15,2) NULL DEFAULT 0,
  MODIFY `maximumWages` DECIMAL(15,2) NULL DEFAULT 0;
ALTER TABLE bpjsKesehatanComponent
  MODIFY `percentage` DECIMAL(5,2) NULL DEFAULT 0,
  MODIFY `minimumWages` DECIMAL(15,2) NULL DEFAULT 0,
  MODIFY `maximumWages` DECIMAL(15,2) NULL DEFAULT 0;
ALTER TABLE templateBpjsKesehatanDetails
  MODIFY `percentage` DECIMAL(5,2) NULL DEFAULT 0,
  MODIFY `minimumWages` DECIMAL(15,2) NULL DEFAULT 0,
  MODIFY `maximumWages` DECIMAL(15,2) NULL DEFAULT 0;
ALTER TABLE requestLeave MODIFY `days` DECIMAL(5,2) NOT NULL;
ALTER TABLE medicalReimbursementCategory MODIFY `percentage` DECIMAL(5,2) NOT NULL;
ALTER TABLE requestMedicalReimbursementHeader
  MODIFY `totalReimbursement` DECIMAL(15,2) NOT NULL,
  MODIFY `totalReimbursementApproved` DECIMAL(15,2) NOT NULL;
ALTER TABLE requestMedicalReimbursementDetails MODIFY `amount` DECIMAL(15,2) NOT NULL;
ALTER TABLE requestOvertimeDetails
  MODIFY `hourlyWages` DECIMAL(15,2) NULL DEFAULT 0,
  MODIFY `workHour` DECIMAL(6,2) NULL DEFAULT 0,
  MODIFY `multiplier` DECIMAL(5,2) NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. Kolom baru payslipDetails & setupSystem
-- ---------------------------------------------------------------------------
ALTER TABLE payslipDetails
  ADD COLUMN `isTaxBase` TINYINT NOT NULL DEFAULT 1 AFTER `isTakeHomePay`,
  MODIFY `amount` DECIMAL(15,2) NOT NULL;

ALTER TABLE setupSystem
  ADD COLUMN `taxRegime` ENUM('TER','Legacy') NULL DEFAULT 'TER' AFTER `defaultTaxMethod`;

-- ---------------------------------------------------------------------------
-- 4. Unique constraints
-- ---------------------------------------------------------------------------
ALTER TABLE payslipHeader
  ADD CONSTRAINT `payslipHeader_users_month_year_unique`
  UNIQUE (usersId, monthPeriod, yearPeriod);

ALTER TABLE timeAttendance
  ADD CONSTRAINT `timeAttendance_employee_workDate_unique`
  UNIQUE (employeeId, workDate);

-- ---------------------------------------------------------------------------
-- 5. FK leaveType untuk requestLeave (tanpa FK -> hapus baris yatim dulu)
-- ---------------------------------------------------------------------------
DELETE rl FROM requestLeave rl
LEFT JOIN leaveType lt ON lt.id = rl.leaveType
WHERE lt.id IS NULL;

ALTER TABLE requestLeave
  ADD CONSTRAINT `requestLeave_leaveType_fkey`
  FOREIGN KEY (leaveType) REFERENCES `leaveType`(id);

-- ---------------------------------------------------------------------------
-- 6. Tabel terRate (Lampiran PMK 168/2023 — diisi via scripts/seed-ter.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `terRate` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(1) NOT NULL,
  `upperBound` DECIMAL(18,2) NOT NULL,
  `ratePercent` DECIMAL(5,2) NOT NULL,
  `sequence` INTEGER NOT NULL,

  INDEX `terRate_category_sequence_idx` (`category`, `sequence`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
