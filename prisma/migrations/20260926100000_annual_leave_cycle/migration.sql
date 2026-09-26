-- Annual Leave Reset (manual, terkontrol):
-- resetMode   : kebijakan penghangusan (JOIN_DATE = hangus setelah 1 tahun sejak join,
--               CALENDAR_YEAR = hangus saat siklus dijalankan di tahun yang lebih baru dari tahun join).
--               NULL = kebijakan belum ditetapkan -> siklus reset menolak jalan (fail-safe).
-- lastCycleRunAt/By : audit kapan & siapa yang terakhir menjalankan penghangusan manual.
-- Catatan: accrual bulanan tetap otomatis via scheduler existing (app.js) dan tidak terpengaruh.
ALTER TABLE `setupAnnualLeave` ADD COLUMN `resetMode` ENUM('JOIN_DATE', 'CALENDAR_YEAR') NULL,
    ADD COLUMN `lastCycleRunAt` DATETIME(3) NULL,
    ADD COLUMN `lastCycleRunBy` VARCHAR(100) NULL;
