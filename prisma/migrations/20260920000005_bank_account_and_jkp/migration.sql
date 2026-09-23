-- ===========================================================================
-- Migration: Prioritas 2 (kepatuhan & operasional)
--   1. Kolom rekening bank karyawan (untuk payment file transfer gaji)
--   2. JKP (Jaminan Kehilangan Perkerjaan) 0,46% — Perpres 60/2022 jo. PP 45/2023
--      (rekomposisi JKK 0,14% + JKM 0,10%, sisanya 0,22% ditanggung Pemerintah)
-- ===========================================================================

-- 1. Rekening bank karyawan
ALTER TABLE `users`
  ADD COLUMN `bankName` VARCHAR(50) NULL AFTER `npwp`,
  ADD COLUMN `bankAccountNumber` VARCHAR(50) NULL AFTER `bankName`,
  ADD COLUMN `bankAccountHolder` VARCHAR(150) NULL AFTER `bankAccountNumber`;

-- 2. Katalog komponen BPJS TK: tambah JKP (bagian perusahaan, info-only)
INSERT INTO `bpjsTenagaKerjaComponent`
  (`uuid`, `createdBy`, `updatedBy`, `componentCode`, `componentName`, `percentage`, `formula`, `sequence`, `isTakeHomePay`)
SELECT UUID(), 'Migration', 'Migration', 'JKP', 'JKP Company', 0.46, 'BS', 1150, 0
WHERE NOT EXISTS (SELECT 1 FROM `bpjsTenagaKerjaComponent` WHERE `componentCode` = 'JKP');

-- 2b. Tambah baris JKP ke setiap template BPJS TK yang sudah ada
INSERT INTO `templateBpjsTenagaKerjaDetails`
  (`uuid`, `createdBy`, `updatedBy`, `salaryTemplateId`, `bpjsTenagaKerjaTemplateId`, `componentId`,
   `componentCode`, `componentName`, `percentage`, `minimumWages`, `maximumWages`, `formula`, `sequence`, `isTakeHomePay`)
SELECT UUID(), 'Migration', 'Migration', t.salaryTemplateId, t.bpjsTenagaKerjaTemplateId,
       c.id, c.componentCode, c.componentName, c.percentage, 0, 0, c.formula, c.sequence, c.isTakeHomePay
FROM (SELECT DISTINCT `salaryTemplateId`, `bpjsTenagaKerjaTemplateId` FROM `templateBpjsTenagaKerjaDetails`) t
JOIN `bpjsTenagaKerjaComponent` c ON c.`componentCode` = 'JKP'
WHERE NOT EXISTS (
  SELECT 1 FROM `templateBpjsTenagaKerjaDetails` d
  WHERE d.`salaryTemplateId` = t.salaryTemplateId AND d.`componentCode` = 'JKP'
);
