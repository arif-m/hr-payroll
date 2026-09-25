/**
 * import-csv.js — Parser CSV hasil ekspor mesin absensi (auto-detect).
 *
 * Pure function tanpa DB agar mudah dites; controller yang menyentuh database.
 *
 * Didukung:
 * - Separator koma ATAU titik-koma (ZKTeco umumnya `;`) — dideteksi dari header.
 * - Alias kolom (header dinormalisasi: lowercase, spasi/underscore dibuang):
 *     employee : userid, pin, employeeid, nik, id, employee
 *     date     : date, tanggal
 *     time     : time, jam, clock
 *   Kolom gabungan `datetime` / `waktu` (contoh "2026-09-01 08:05") juga didukung.
 * - Format tanggal: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY.
 * - Jam: HH:mm atau HH:mm:ss.
 * - Pairing punch: per (employeeId, tanggal), punch TERPAGI = check-in,
 *   punch TERAKHIR = check-out (tahan terhadap punch bolak-balik).
 */

const MAX_ROWS = 50000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ALIAS_EMPLOYEE = ['userid', 'pin', 'employeeid', 'nik', 'id', 'employee'];
const ALIAS_DATE = ['date', 'tanggal'];
const ALIAS_TIME = ['time', 'jam', 'clock'];
const ALIAS_DATETIME = ['datetime', 'waktu'];

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[\s_-]/g, '');
}

/** Deteksi separator dari baris header: hitung ; vs , */
function detectSeparator(headerLine) {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

/** Parse baris CSV sederhana dengan separator tunggal (tanpa quoted-comma). */
function splitLine(line, sep) {
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
}

/** Cari index kolom dari daftar alias (returns -1 jika tidak ada). */
function findColumn(headers, aliases) {
  for (const a of aliases) {
    const idx = headers.indexOf(a);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Parse tanggal fleksibel → {key:'YYYY-MM-DD'} atau null. */
function parseDateKey(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    // Asumsi mesin Indonesia: DD/MM/YYYY (bulanan > 12 berarti terbalik)
    let d = Number(m[1]);
    let mo = Number(m[2]);
    if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
    return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/** Parse jam → {minutes} sejak tengah malam, atau null. */
function parseTimeMinutes(value) {
  const m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** minutes sejak tengah malam → Date basis 1970-01-01 UTC (kolom @db.Time). */
function minutesToTimeDate(minutes) {
  return new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60, 0));
}

/**
 * Parse isi CSV mentah menjadi punch terpasangkan per hari.
 *
 * @param {string} csvContent isi file (string, sudah UTF-8/Latin-1 apa adanya)
 * @returns {{ format: string, punches: Array<{employeeIdRaw:string, dateKey:string, time:string, minutes:number}>,
 *            paired: Array<{employeeIdRaw:string, dateKey:string, checkIn:string|null, checkOut:string|null, punchCount:number}>,
 *            skipped: Array<{line:number, reason:string}>, warnings: string[], separator: string }}
 */
function parseAttendanceCsv(csvContent) {
  const warnings = [];
  const skipped = [];
  if (Buffer.byteLength(String(csvContent), 'utf8') > MAX_FILE_BYTES) {
    throw new Error('File terlalu besar (maksimal 5 MB)');
  }

  const text = String(csvContent || '').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) throw new Error('File CSV kosong atau tanpa baris data');

  const separator = detectSeparator(lines[0]);
  const headers = splitLine(lines[0], separator).map(normalizeHeader);

  const empIdx = findColumn(headers, ALIAS_EMPLOYEE);
  const dateIdx = findColumn(headers, ALIAS_DATE);
  const timeIdx = findColumn(headers, ALIAS_TIME);
  const dtIdx = findColumn(headers, ALIAS_DATETIME);

  let format = 'unknown';
  if (empIdx !== -1 && dateIdx !== -1 && timeIdx !== -1) format = 'separated';
  else if (empIdx !== -1 && dtIdx !== -1) format = 'datetime';
  if (format === 'unknown') {
    throw new Error('Header CSV tidak dikenali. Butuh kolom (User ID/PIN/NIK) + (Date/Tanggal) + (Time/Jam), atau (User ID) + (DateTime/Waktu). Header ditemukan: ' + headers.join(', '));
  }

  const punches = [];
  for (let i = 1; i < lines.length; i++) {
    if (punches.length >= MAX_ROWS) {
      warnings.push(`Baris melebihi ${MAX_ROWS} — sisa diabaikan`);
      break;
    }
    const cols = splitLine(lines[i], separator);
    const empRaw = empIdx !== -1 ? cols[empIdx] : '';
    if (!empRaw) { skipped.push({ line: i + 1, reason: 'kolom User ID kosong' }); continue; }

    let dateKey = null;
    let minutes = null;
    if (format === 'separated') {
      dateKey = parseDateKey(cols[dateIdx]);
      minutes = parseTimeMinutes(cols[timeIdx]);
    } else {
      const dt = String(cols[dtIdx] || '').trim();
      // "YYYY-MM-DD HH:mm[:ss]" atau "DD/MM/YYYY HH:mm[:ss]"
      const parts = dt.split(/\s+|T/);
      dateKey = parseDateKey(parts[0]);
      minutes = parseTimeMinutes(parts[1] || '');
    }
    if (!dateKey) { skipped.push({ line: i + 1, reason: 'tanggal tidak terbaca: "' + (format === 'separated' ? cols[dateIdx] : cols[dtIdx]) + '"' }); continue; }
    if (minutes === null) { skipped.push({ line: i + 1, reason: 'jam tidak terbaca' }); continue; }

    punches.push({
      employeeIdRaw: empRaw,
      dateKey,
      time: String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'),
      minutes,
    });
  }

  // Pairing min/max per (employeeId, tanggal)
  const byKey = new Map();
  for (const p of punches) {
    const k = p.employeeIdRaw + '|' + p.dateKey;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(p);
  }
  const paired = [];
  for (const [k, arr] of byKey) {
    arr.sort((a, b) => a.minutes - b.minutes);
    const [empRaw, dateKey] = k.split('|');
    paired.push({
      employeeIdRaw: empRaw,
      dateKey,
      checkIn: arr[0].time,
      checkOut: arr.length > 1 ? arr[arr.length - 1].time : null,
      punchCount: arr.length,
    });
  }
  paired.sort((a, b) => (a.employeeIdRaw + a.dateKey < b.employeeIdRaw + b.dateKey ? -1 : 1));

  return { format, separator, punches, paired, skipped, warnings };
}

module.exports = {
  parseAttendanceCsv,
  detectSeparator,
  parseDateKey,
  parseTimeMinutes,
  minutesToTimeDate,
  MAX_ROWS,
  MAX_FILE_BYTES,
};
