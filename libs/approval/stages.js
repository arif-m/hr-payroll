/**
 * approval/stages.js — pemetaan nama role -> jenjang approval.
 * Murni (tanpa DB/dependency) supaya bisa dipakai runtime, seeder, dan test.
 *
 * Aturan: first-match-wins pada urutan di bawah. Semua pencocokan
 * case-insensitive pada substring/word. Fail-closed: nama yang tidak cocok
 * -> [] (tanpa wewenang approval).
 */
const ROLE_STAGE_KEYWORDS = [
  // Admin (termasuk Super Admin) meng-override semua: punya semua jenjang.
  { test: /admin/i, stages: ['SPV', 'HR', 'FA'] },
  { test: /supervisor|\bspv\b|kepala|\bhead\b/i, stages: ['SPV'] },
  { test: /\bhr\b|\bhrd\b|human[\s-]?resource|humanresource|sdm/i, stages: ['HR'] },
  { test: /\bfa\b|finance|keuangan/i, stages: ['FA'] },
];

const ALL_STAGES = ['SPV', 'HR', 'FA'];

/** Nama role -> daftar jenjang (salinan baru; role tanpa wewenang -> []). */
function stagesForRoleName(roleName) {
  const name = String(roleName || '');
  if (!name) return [];
  for (const { test, stages } of ROLE_STAGE_KEYWORDS) {
    if (test.test(name)) return stages.slice();
  }
  return [];
}

/** Dari definisi KINDS, ambil key jenis yang punya minimal satu jenjang
 *  dari `stages`. Murni: terima array KINDS agar modul ini bebas dari
 *  definisi jenis approval. */
function kindsForStages(kinds, stages) {
  const set = new Set(stages || []);
  return kinds.filter((k) => Array.isArray(k.stages) && k.stages.some((s) => set.has(s))).map((k) => k.key);
}

module.exports = { ROLE_STAGE_KEYWORDS, ALL_STAGES, stagesForRoleName, kindsForStages };
