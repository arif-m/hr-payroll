const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const { DEFAULT_TIERS } = require('../libs/payroll/late-penalty');

const PENALTY_TYPES = ['NONE', 'MINUTES', 'HALF_DAY', 'FULL_DAY'];
const ESCALATION_TYPES = ['HALF_DAY', 'FULL_DAY'];

/** Halaman Setup Attendance — konfigurasi absensi & sanksi telat. */
const showAttendanceSetup = async (req, res) => {
    const setup = await prisma.setupSystem.findFirst();
    if (!setup) throw new Error('SetupSystem belum ada (baris konfigurasi kosong)');

    // Tiers dari DB; kosong -> tampilkan default sebagai contoh terisi.
    let tiers = setup.latePenaltyTiers;
    if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers); } catch (e) { tiers = null; } }
    if (!Array.isArray(tiers) || tiers.length === 0) tiers = DEFAULT_TIERS;

    let escalation = setup.latePenaltyEscalation;
    if (typeof escalation === 'string') { try { escalation = JSON.parse(escalation); } catch (e) { escalation = null; } }
    const escalationEvery = escalation && Number(escalation.every) > 0 ? Number(escalation.every) : 0;
    const escalationType = escalation && ESCALATION_TYPES.includes(escalation.type) ? escalation.type : 'FULL_DAY';

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);

    res.render('pages/attendance-setup/index', {
        user: userInfo,
        getRoles,
        pageTitle: 'Setup Attendance',
        setup,
        tiers,
        escalationEvery,
        escalationType,
        PENALTY_TYPES,
        ESCALATION_TYPES,
    });
}

/** Simpan konfigurasi sanksi telat. */
const updateAttendanceSetup = async (req, res) => {
    try {
        const updatedBy = req.user.fullName;
        const enabled = req.body.late_penalty_enabled === 'on' || req.body.late_penalty_enabled === '1' ? 1 : 0;
        const baseCodes = String(req.body.late_penalty_base_codes || 'BS')
            .split(',').map((c) => c.trim().toUpperCase()).filter(Boolean).join(',');

        // Tiers: 3 baris (maxMinutes + type). Baris dengan maxMinutes kosong = null (tak terbatas).
        const maxMinutesRaw = [].concat(req.body.tier_max_minutes || []);
        const typeRaw = [].concat(req.body.tier_type || []);
        const tiers = [];
        for (let i = 0; i < typeRaw.length; i++) {
            const type = String(typeRaw[i]);
            if (!PENALTY_TYPES.includes(type)) continue;
            const raw = String(maxMinutesRaw[i] || '').trim();
            const maxMinutes = raw === '' ? null : Number(raw);
            tiers.push({ maxMinutes: maxMinutes !== null && isFinite(maxMinutes) && maxMinutes > 0 ? Math.round(maxMinutes) : null, type });
        }
        if (tiers.length === 0) throw new Error('Minimal satu tingkatan sanksi harus diisi');
        if (tiers[tiers.length - 1].maxMinutes !== null) {
            throw new Error('Tingkatan terakhir harus tak terbatas (Max Minutes kosong) agar semua kasus tertutup');
        }

        // Escalation: every=0 -> off (null)
        const every = Number(req.body.escalation_every) || 0;
        const escType = String(req.body.escalation_type || 'FULL_DAY');
        let escalation = null;
        if (every > 0) {
            if (!ESCALATION_TYPES.includes(escType)) throw new Error('Tipe escalation tidak valid');
            escalation = { every: Math.round(every), type: escType };
        }

        await prisma.setupSystem.update({
            where: { id: Number(req.body.setup_id) },
            data: {
                latePenaltyEnabled: enabled,
                latePenaltyBaseCodes: baseCodes || 'BS',
                latePenaltyTiers: tiers,
                latePenaltyEscalation: escalation,
                updatedBy,
            },
        });

        req.flash('success', 'Setup attendance berhasil disimpan');
    } catch (err) {
        req.flash('error', err.message);
    }
    return res.redirect('back');
}

module.exports = {
    showAttendanceSetup,
    updateAttendanceSetup,
}
