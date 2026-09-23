/**
 * email-payslip.js — kirim slip gaji via email dengan audit EmailLog.
 *
 * - Render payslip memakai template mandiri views/emails/payslip.ejs
 *   (inline CSS, tanpa layout aplikasi) dari data DB yang sama dengan
 *   halaman payslip report.
 * - Transporter nodemailer dari env: EMAIL_SERVICE/EMAIL_USER/EMAIL_PASSCODE/
 *   EMAIL_SENDER (pola helper/send-email.js). Untuk testing: pass custom
 *   `transporter` (dry-run/mock).
 * - Dedup: payslip yang sudah pernah SENT dilewati kecuali force.
 */
const prisma = require('../prisma');
const ejs = require('ejs');
const path = require('path');
const nodemailer = require('nodemailer');
const moment = require('moment');
const logger = require('../logger');
const generalHelper = require('../../helper/general');

const MONTH_NAMES = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

function buildTransporter() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER || '';
  const passcode = process.env.EMAIL_PASSCODE || '';
  const emailSender = process.env.EMAIL_SENDER || emailUser;
  if (!emailUser || !passcode) {
    throw new Error('Konfigurasi email belum lengkap (EMAIL_USER/EMAIL_PASSCODE di .env)');
  }
  return nodemailer.createTransport({
    service: emailService,
    auth: { user: emailUser, pass: passcode },
  }, { from: emailSender || emailUser });
}

/** Data payslip lengkap (pola query payslipAdminReport). */
async function loadPayslipData(payslipHeaderId) {
  const header = await prisma.payslipHeader.findUnique({
    where: { id: Number(payslipHeaderId) },
    select: {
      id: true, uuid: true, monthPeriod: true, yearPeriod: true,
      startPeriod: true, endPeriod: true, workDays: true, attendance: true,
      fullName: true, employeeId: true, organization: true, jobTitle: true,
      ptkp: true, npwp: true, absent: true, sick: true, paidLeave: true, unpaidLeave: true,
      employee: {
        select: {
          email: true,
          businessUnit: { select: { businessUnitName: true, companyName: true, image: true } },
        },
      },
      payslip_header: {
        select: { code: true, name: true, category: true, isTakeHomePay: true, amount: true, sequence: true },
        orderBy: { sequence: 'asc' },
      },
    },
  });
  if (!header) throw new Error('Payslip tidak ditemukan');

  const earnings = header.payslip_header.filter((d) => d.isTakeHomePay === 1 && d.category === 'Earnings');
  const deductions = header.payslip_header.filter((d) => d.isTakeHomePay === 1 && d.category === 'Deductions');
  const benefits = header.payslip_header.filter((d) => d.isTakeHomePay === 0);

  const sum = (rows) => rows.reduce((a, d) => a + Number(d.amount), 0);
  return {
    header,
    earnings, deductions, benefits,
    totalEarnings: sum(earnings),
    totalDeductions: sum(deductions),
    thp: sum(earnings) - sum(deductions),
    monthName: MONTH_NAMES[header.monthPeriod] || header.monthPeriod,
  };
}

/** Render HTML email payslip (template mandiri, tanpa layout). */
async function renderPayslipHtml(payslipHeaderId) {
  const data = await loadPayslipData(payslipHeaderId);
  data.formatNumber = (n) => generalHelper.formatNumberWithCommas(Math.round(Number(n) || 0));
  const html = await ejs.renderFile(
    path.join(__dirname, '..', '..', 'views', 'emails', 'payslip.ejs'),
    { data, moment },
    { async: true },
  );
  return { html, data };
}

/**
 * Kirim email payslip satu karyawan.
 * @returns {Object} { status: 'SENT'|'FAILED'|'SKIPPED', toEmail, error? }
 */
async function sendPayslipEmail(payslipHeaderId, actor, { transporter = null, force = false } = {}) {
  const data = await loadPayslipData(payslipHeaderId);
  const header = data.header;
  const toEmail = header.employee && header.employee.email;

  if (!toEmail || String(toEmail).trim() === '') {
    return { status: 'SKIPPED', toEmail: null, error: 'Karyawan tidak punya email' };
  }

  // Dedup: sudah pernah sukses terkirim.
  if (!force) {
    const already = await prisma.emailLog.findFirst({
      where: { payslipHeaderId: Number(payslipHeaderId), status: 'SENT' },
      select: { id: true },
    });
    if (already) {
      return { status: 'SKIPPED', toEmail, error: 'Sudah pernah dikirim' };
    }
  }

  const { html } = await renderPayslipHtml(payslipHeaderId);
  const period = `${data.monthName} ${header.yearPeriod}`;
  const subject = `Slip Gaji ${header.fullName} — ${period}`;

  const tx = transporter || buildTransporter();
  let status = 'SENT';
  let error = null;
  try {
    await tx.sendMail({
      from: process.env.EMAIL_SENDER || process.env.EMAIL_USER || 'payroll@company.com',
      to: toEmail,
      subject,
      html,
    });
  } catch (e) {
    status = 'FAILED';
    error = String(e.message || e).slice(0, 300);
  }

  await prisma.emailLog.create({
    data: {
      payslipHeaderId: Number(payslipHeaderId),
      toEmail, status, error, sentBy: actor || 'system',
    },
  });
  logger.info(`emailPayslip: payslip #${payslipHeaderId} → ${toEmail} [${status}]${error ? ' ' + error : ''}`);
  return { status, toEmail, error };
}

/**
 * Kirim payslip untuk seluruh payslip OK dalam satu payroll run.
 * Hanya run APPROVED/LOCKED. Berurutan + jeda kecil (aman rate limit SMTP).
 * @returns {Object} { total, sent, failed, skipped, results[] }
 */
async function sendPayslipsForRun(runId, actor, opts = {}) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(runId) },
    include: { cutOffPeriod: { select: { monthPeriod: true, yearPeriod: true } } },
  });
  if (!run) throw new Error('Payroll run tidak ditemukan');
  if (!['APPROVED', 'LOCKED'].includes(run.status)) {
    throw new Error(`Kirim email hanya untuk run APPROVED/LOCKED (status sekarang: ${run.status})`);
  }

  const payslips = await prisma.payslipHeader.findMany({
    where: { cutOffPeriodId: run.cutOffPeriodId },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  const results = [];
  let sent = 0; let failed = 0; let skipped = 0;
  for (const ps of payslips) {
    try {
      const r = await sendPayslipEmail(ps.id, actor, opts);
      results.push({ payslipId: ps.id, fullName: ps.fullName, ...r });
      if (r.status === 'SENT') sent += 1;
      else if (r.status === 'FAILED') failed += 1;
      else skipped += 1;
    } catch (e) {
      failed += 1;
      results.push({ payslipId: ps.id, fullName: ps.fullName, status: 'FAILED', toEmail: null, error: String(e.message).slice(0, 300) });
    }
    if (opts.delayMs) await new Promise((res) => setTimeout(res, opts.delayMs));
  }

  return { total: payslips.length, sent, failed, skipped, results, run };
}

module.exports = { loadPayslipData, renderPayslipHtml, sendPayslipEmail, sendPayslipsForRun, buildTransporter, MONTH_NAMES };
