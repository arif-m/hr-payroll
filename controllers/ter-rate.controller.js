/**
 * ter-rate.controller.js — CRUD tabel Tarif Efektif Bulanan (TER) kategori
 * A/B/C (Lampiran PMK 168/2023). Data ini dibaca oleh mesin PPh 21 via
 * libs/payroll/config.js (loadTaxConfig) — mengubah baris di halaman ini
 * langsung mengubah hasil perhitungan payroll bulan berikutnya.
 */
const prisma = require('../libs/prisma');
const { listRolesPermission } = require('../helper/roles-permission');
const generalHelper = require('../helper/general');
const logger = require('../libs/logger');



const pageParams = (query) => {
  const page = parseInt(query.page) || 0;
  const limit = parseInt(query.limit) || 25;
  return { page, limit, skip: page * limit };
};

const buildMeta = (limit, currentPage, totalCount, totalRecordCurrentPage) => ({
  limit, currentPage,
  totalPage: Math.ceil(totalCount / limit),
  totalRecords: totalCount,
  totalRecordCurrentPage,
});

const currentRecordCount = (page, totalPage, totalCount, limit) => {
  let totalRecordCurrentPage = limit;
  if (page === totalPage - 1 || totalPage === 1) {
    totalRecordCurrentPage = totalCount % limit;
    if (totalRecordCurrentPage === 0) totalRecordCurrentPage = limit;
  }
  return totalRecordCurrentPage;
};

const listingAllTerRate = async (req, res) => {
  try {
    const query = req.query;
    const where = {};
    if (query.category && ['A', 'B', 'C'].includes(query.category)) {
      where.category = query.category;
    }

    const { page, limit, skip } = pageParams(query);
    const totalCount = await prisma.terRate.count({ where });
    const totalPage = Math.ceil(totalCount / limit);
    const totalRecordCurrentPage = currentRecordCount(page, totalPage, totalCount, limit);

    const getDataTerRate = await prisma.terRate.findMany({
      skip, take: limit, where,
      orderBy: [{ category: 'asc' }, { sequence: 'asc' }],
    });

    const listOfTerRate = { meta: buildMeta(limit, page || 0, totalCount, totalRecordCurrentPage), data: getDataTerRate };

    const userInfo = req.user;
    const getRoles = await listRolesPermission(userInfo.roleUuid);
    const param = {
      user: userInfo, getRoles, search: query.search, category: query.category || '',
      pageTitle: 'Tarif Efektif Bulanan (TER)', listOfTerRate, generalHelper,
    };
    res.render('pages/ter-rate/index', param);
  } catch (err) {
    logger.error(`listingAllTerRate: ${err.message}`);
    res.redirect('/dashboard');
  }
};

const createDataTerRate = async (req, res) => {
  try {
    const { category, upper_bound, rate_percent, sequence } = req.body;
    if (!['A', 'B', 'C'].includes(category)) throw new Error('Kategori harus A, B, atau C');

    const upperBound = Number(generalHelper.formatNumberWithoutDelimiter(upper_bound));
    const ratePercent = Number(rate_percent);
    if (!Number.isFinite(upperBound) || upperBound <= 0) throw new Error('Batas atas bruto tidak valid');
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) throw new Error('Rate harus 0–100 persen');

    await prisma.terRate.create({
      data: {
        category,
        upperBound,
        ratePercent,
        sequence: Number(sequence) || 0,
        createdBy: req.user.fullName,
        updatedBy: req.user.fullName,
      },
    });
    req.flash('success', 'Baris TER berhasil ditambahkan');
  } catch (err) {
    logger.error(`createDataTerRate: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

const updateDataTerRate = async (req, res) => {
  try {
    const { ter_rate_id, upper_bound, rate_percent, sequence } = req.body;

    const upperBound = Number(generalHelper.formatNumberWithoutDelimiter(upper_bound));
    const ratePercent = Number(rate_percent);
    if (!Number.isFinite(upperBound) || upperBound <= 0) throw new Error('Batas atas bruto tidak valid');
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) throw new Error('Rate harus 0–100 persen');

    await prisma.terRate.update({
      where: { id: Number(ter_rate_id) },
      data: {
        upperBound,
        ratePercent,
        sequence: Number(sequence) || 0,
        updatedBy: req.user.fullName,
      },
    });
    req.flash('success', 'Baris TER berhasil diubah');
  } catch (err) {
    logger.error(`updateDataTerRate: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

const deleteDataTerRate = async (req, res) => {
  try {
    await prisma.terRate.delete({ where: { id: Number(req.body.ter_rate_id) } });
    req.flash('success', 'Baris TER berhasil dihapus');
  } catch (err) {
    logger.error(`deleteDataTerRate: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

/**
 * Reset tabel TER dari sumber kebenaran kode (libs/payroll/tax21.js).
 * Setelah reset, jalankan verifikasi ulang terhadap Lampiran PMK 168/2023.
 */
const resetDataTerRate = async (req, res) => {
  try {
    const { TER_TABLES } = require('../libs/payroll/tax21');
    await prisma.$transaction(async (tx) => {
      await tx.terRate.deleteMany();
      const rows = [];
      for (const [category, table] of Object.entries(TER_TABLES)) {
        table.forEach((row, i) => rows.push({
          category, upperBound: row[0], ratePercent: row[1], sequence: i + 1,
          createdBy: req.user.fullName, updatedBy: req.user.fullName,
        }));
      }
      await tx.terRate.createMany({ data: rows });
    });
    req.flash('success', 'Tabel TER di-reset dari default kode (44/40/41 baris). Verifikasi ulang terhadap PMK 168/2023!');
  } catch (err) {
    logger.error(`resetDataTerRate: ${err.message}`);
    req.flash('error', err.message);
  }
  res.redirect('back');
};

module.exports = {
  listingAllTerRate,
  createDataTerRate,
  updateDataTerRate,
  deleteDataTerRate,
  resetDataTerRate,
};
