# hr-meme

This app illustrates how to use [Passport](https://www.passportjs.org/) with
[Express](https://expressjs.com/) to sign users in with a username and password.
Use this example as a starting point for your own web applications.

## Quick Start

To run this app, clone the repository and install dependencies:

```bash
$ git https://github.com/memberid/hr-meme
$ cd hr-meme
$ npm install
```

Then start the server.

```bash
$ npm start
```

Navigate to [`http://localhost:3000`](http://localhost:3000).

## Tutorial

Follow along with the step-by-step [Username & Password Tutorial](https://www.passportjs.org/tutorials/password/)
to learn how this app was built.

## Overview

This example illustrates how to use Passport and the [`passport-local`](https://www.passportjs.org/packages/passport-local/)
strategy within an Express application to sign users in with a username and
password.

User interaction is performed via HTML pages and forms, which are rendered via
[EJS](https://ejs.co/) templates and styled with vanilla CSS.  Data is stored in
and queried from a [MySQL](https://www.mysql.org/) database.

After users sign in, a login session is established and maintained between the
server and the browser with a cookie.  As authenticated users interact with the
app, creating and editing employee, division, etc, the login state is restored by
authenticating the session.

We are using Prisma.io to connect database and manipulate data in this application.
In a development environment, you use the migrate dev command to create and apply migrations:
    npx prisma migrate dev

Use db push to push the initial schema to the database:
    npx prisma db push

To seed the database, run the db seed CLI command:
    npx prisma db seed

## Payroll Engine (Fase 1)

Mesin payroll berada di `libs/payroll/` — pure functions tanpa DB, sehingga mudah diuji:

- `tax21.js` — PPh 21: TER bulanan kategori A/B/C (PP 58/2023 & PMK 168/2023),
  tarif progresif Pasal 17 UU HPP, biaya jabatan (5%, cap 500rb/bln), gross-up
  iteratif, surcharge +20% tanpa NPWP, pembulatan ribuan, dan koreksi masa pajak
  terakhir (Desember). **Seluruh parameter regulasi dapat di-inject via `config`** —
  konstanta di file hanya fallback default.
- `config.js` — `loadTaxConfig()`: memuat seluruh tarif dari DATABASE
  (`terRate`, `pkp`, `ptkp`, `setupSystem`).
- `bpjs.js` — iuran BPJS Kesehatan 4% (perusahaan) + 1% (karyawan), cap upah.
- `engine.js` — orkestrator satu payslip: kehadiran/cuti, komponen gaji prorata,
  lembur, BPJS TK & Kesehatan, lalu PPh 21 dihitung TERAKHIR dari bruto lengkap.
- `persist.js` — penulisan payslip idempotent dalam satu transaksi (re-run aman)
  + guard keterwritable-an berbasis status PayrollRun periode.
- `run.js`, `run-state.js` — **PayrollRun**: siklus DRAFT → SUBMITTED →
  APPROVED → LOCKED per periode. Snapshot tarif diambil saat run dibuat
  (konsisten untuk semua payslip dalam run); detail per karyawan (OK/FAILED +
  angka ringkas) tersimpan di `payrollRunDetail`; LOCKED = final, tidak bisa
  diubah dari jalur manapun. UI di menu **Payroll Run**.
- `money.js`, `period.js` — helper uang (Decimal.js) & periode.### Setup regulasi (DB-driven — perubahan aturan tanpa edit kode)

Semua parameter tarif PPh 21 dibaca dari database oleh `loadTaxConfig()`:

- **Tarif progresif Pasal 17** → tabel `pkp` (edit via UI pkp yang sudah ada).
- **PTKP per kode** → tabel `ptkp` (edit via UI ptkp; K/I/2 = 121.500.000
  dipakai exact dari DB, memperbaiki fallback formula yang menghitung 126jt).
- **Tabel TER bulanan A/B/C** → tabel `terRate`, diisi dari satu sumber kebenaran:
      node scripts/seed-ter.js
  **Verifikasi ulang angka TER terhadap Lampiran PMK 168/2023 resmi sebelum produksi.**
- **Biaya jabatan** → `setupSystem.taxPercentage` (rate %) +
  `setupSystem.biayaJabatanMaxMonthly` (cap bulanan, default 500.000).
- **Surcharge tanpa NPWP** → `setupSystem.npwpSurchargePct` (default 20).
- Regime pajak dipilih di SetupSystem (`taxRegime`: TER | Legacy; metode:
  Gross / Netto / GrossUp).

Bila tabel/kolom masih kosong (DB lama), mesin otomatis memakai default
fallback di `tax21.js` — aman untuk transisi.

Tabel TER juga bisa dikelola via **UI menu "Tarif Efektif Bulanan (TER)"**
(`/ter-rate`): tambah/ubah/hapus baris per kategori, atau tombol
"Reset dari Kode" untuk mengisi ulang dari default PMK 168/2023.

### Snapshot tarif per payslip & replay audit

Setiap payslip menyimpan **snapshot tarif pajak yang dipakai saat generate**
(`payslipHeader.taxConfigSnapshot` — TER, Pasal 17, PTKP, biaya jabatan,
surcharge NPWP). Payslip historis tetap bisa direproduksi persis setelah
regulasi/data berubah:

```js
const { replayPayslip } = require('./libs/payroll/replay');
const r = await replayPayslip({ usersId: 1, monthPeriod: '09', yearPeriod: '2026' });
// r.ok === true → PPh & THP tersimpan = hasil hitung ulang dari snapshot
```

Snapshot juga tampil di **halaman payslip** (kartu lipat "Tarif Pajak Saat
Payslip Ini Digenerate", tersembunyi saat print) lengkap dengan tombol
**"Verifikasi Ulang"** yang menjalankan replay read-only dan menampilkan
hasilnya via modal — tanpa mengubah payslip sama sekali.

### Payroll Run (alur approval)

Satu run per periode (`payrollRun`, unique per cut-off period). Generate
salary (per karyawan & semua karyawan) otomatis masuk ke run DRAFT periode
tersebut. Alur: **Submit untuk Review → Approve → Lock (Final)**; reviewer
dapat mengembalikan SUBMITTED ke DRAFT dengan catatan. Saat status bukan
DRAFT, TIDAK ADA payslip periode itu yang bisa digenerate/dikoreksi (guard di
`persist.js`, teruji). Migrasi: `20260920000004_payroll_run`.

### JKP 0,46% (Perpres 60/2022 jo. PP 45/2023)

Program BPJS TK yang sebelumnya hilang kini ada di katalog & template default:
**JKP 0,46% dari upah** (bagian perusahaan, baris info — tidak mengubah
THP/PPh). Pembiayaannya via rekomposisi: JKK −0,14%, JKM −0,10%, sisanya
0,22% ditanggung Pemerintah. Tarif efektif terkini bila tagihan BPJS Anda
sudah merefleksikan rekomposisi: **JKK kelas I 0,10%, JKM 0,20%** — sesuaikan
di UI *BPJS Tenaga Kerja Template* bila perlu.

### Rekening bank karyawan & Payment File

Edit karyawan kini punya **Bank / No. Rekening / Nama Pemilik Rekening**
(migrasi `20260920000005_bank_account_and_jkp`). Pada run berstatus
**APPROVED/LOCKED** tersedia tombol **Download Payment File** — CSV transfer
gaji dikelompokkan per bank (Bank, No Rekening, Nama Pemilik, Nama Karyawan,
Employee ID, Jumlah THP, Keterangan). Karyawan tanpa data rekening dilewati
dan dilaporkan via flash message.

### SPT Masa PPh 21 (A1 / A2)

Pada run **APPROVED/LOCKED** tersedia juga tombol **SPT Masa A1** dan
**SPT Masa A2** — CSV bahan rekap bukti potong PPh Pasal 21 bulanan
(`libs/payroll/spt-masa.js`, via `libs/payroll/payment-file.js`):

- **A1 (Pegawai Tetap)**: Masa Pajak, Tahun Pajak, NPWP (dibersihkan jadi
  digit), Nama, **Kode PTKP 0–11** (pemetaan TK/0–3→0–3, K/0–3→4–7,
  K/I/0–3→8–11), Jumlah Bruto, Jumlah PPh21.
- **A2 (Pegawai Tidak Tetap)**: sama tanpa kolom Kode PTKP.
- **Bruto** = Σ komponen `Earnings` dengan `isTaxBase = 1` dari payslip run
  ini (persis dasar hitung PPh21 di engine — termasuk baris TA/gross-up;
  baris informasi perusahaan seperti BPJS bagian perusahaan dikecualikan).
- **PPh21** = Σ baris payslip berkode `TD`; di Desember bisa negatif karena
  koreksi setahun — ditulis apa adanya.
- Karyawan dengan NPWP kosong tetap diekspor dan dilaporkan pada
  `warnings`.

> Catatan: ini CSV bahan rekap dengan pola kolom format e-SPT 1721-A1/A2,
> bukan file XML impor resmi aplikasi e-SPT DJP.

### Riwayat Kepegawaian — gaji/jabatan efektif-tanggal

Setiap perubahan **komponen gaji, jabatan, divisi, status kepegawaian, dan
PTKP** terekam otomatis ke tabel `employmentHistory` (migrasi
`20260920000006_employment_history`) sebagai snapshot lengkap ber-tanggal
efektif — oleh `libs/payroll/employment-history.js`, di-hook ke empat jalur:
Edit Employee, Setup Employee Salary (tambah/ubah komponen), dan Promosi.
Menu **Riwayat Kepegawaian** (`/employment-history`) menampilkan timeline per
karyawan plus kalkulator **"gaji berlaku pada tanggal X"** — fondasi prorata
THR dan audit kenaikan gaji. Karyawan lama di-backfill otomatis (kondisi
kini berlaku sejak `joinDate`); smoke test:
`node scripts/smoke-test-employment-history.js`.

### Email Payslip

Dari detail **Payroll Run** berstatus **APPROVED/LOCKED**, tombol **"Kirim
Payslip via Email"** mengirim slip gaji HTML (template mandiri
`views/emails/payslip.ejs`) ke email tiap karyawan via nodemailer
(konfigurasi `.env`: `EMAIL_SERVICE/EMAIL_USER/EMAIL_PASSCODE/EMAIL_SENDER`,
pola sama dengan reset password). Setiap pengiriman tercatat di tabel
`emailLog` (status SENT/FAILED/SKIPPED + error); payslip yang sudah pernah
sukses terkirim **dilewati otomatis** (dedup), kecuali dipaksa. Library:
`libs/payroll/email-payslip.js`; smoke test (transporter mock, tanpa email
nyata): `node scripts/smoke-test-thr-email.js`.

### THR — Tunjangan Hari Raya

Tandai periode di halaman **Setup Cutoff Period** (modal New/Edit, checkbox
**"Period with THR?"** — tabel menampilkan badge THR). Saat generate,
`libs/payroll/thr.js` menambahkan baris earning **THR** ke payslip:
masa kerja ≥12 bulan → 1× basis upah; <12 bulan → prorata n/12 (sisa ≥15
hari bulat ke atas, configurable `thrProrateRoundDays`); di bawah masa
minimum `thrEligibilityMonths` → tidak berhak. Basis upah dibaca dari
**riwayat kepegawaian efektif-tanggal** — default **upah terakhir** sebelum
hari raya (praktik Kep-102/MEN/VI/2004); override via config di `setupSystem`
(`thrBudgetBaseCodes` default `BS`, bisa `BS,TJ`). THR masuk brutto → PPh 21
TER bulan berjalan, THP, run summary, dan payment file otomatis.

### Testing & verifikasi

    npm test                          # 43 unit test kalkulasi (PPh, BPJS, run state, riwayat, THR)
    node scripts/smoke-test-payroll.js # end-to-end engine (reversible)
    node scripts/smoke-test-thr-email.js # THR + email payslip end-to-end (mock SMTP, reversible)

### Migrasi skema Fase 1 (uang → DECIMAL, unique payslip, closing, terRate)

    mysql -u <user> -p <db> < prisma/migrations/20260920000001_payroll_phase1/migration.sql
    mysql -u <user> -p <db> < prisma/migrations/20260920000002_tax_config_db_driven/migration.sql
    node scripts/seed-ter.js

PERIODE YANG SUDAH DI-CLOSING (`cutOffPeriod.isClosing = 1`) TIDAK BISA DIGENERATE
ULANG ATAU DIEDIT.
