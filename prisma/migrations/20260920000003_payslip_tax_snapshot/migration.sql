-- ===========================================================================
-- Migration: snapshot konfigurasi tarif pajak per payslip.
-- Setiap generate menyimpan salinan tarif TER/Pasal 17/PTKP/biaya jabatan/
-- surcharge NPWP yang dipakai saat itu (JSON), sehingga payslip historis
-- tetap bisa direproduksi persis setelah regulasi/data berubah.
-- Catatan: migrasi dijalankan sekali (konvensi Prisma); bila dijalankan
-- manual berulang, abaikan error 1060 (duplicate column).
-- ===========================================================================

ALTER TABLE payslipHeader
  ADD COLUMN `taxConfigSnapshot` JSON NULL;
