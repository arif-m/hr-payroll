-- ===========================================================================
-- Migration: tax config DB-driven (SetupSystem: biaya jabatan & surcharge NPWP)
-- Kolom taxPercentage (default 5) yang sudah ada dipakai sebagai rate biaya
-- jabatan. Dua kolom baru melengkapi parameter regulasi agar semuanya
-- dibaca dari DB (lihat libs/payroll/config.js).
-- Catatan: migrasi dijalankan sekali (konvensi Prisma); bila dijalankan
-- manual berulang, abaikan error 1060 (duplicate column).
-- ===========================================================================

ALTER TABLE setupSystem
  ADD COLUMN `biayaJabatanMaxMonthly` DECIMAL(15,2) NOT NULL DEFAULT 500000,
  ADD COLUMN `npwpSurchargePct` DECIMAL(5,2) NOT NULL DEFAULT 20;
