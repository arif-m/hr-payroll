/**
 * csrf.js — pengganti csurf (deprecated sejak 2022) dengan pola yang sama:
 * token tersimpan di session dan diverifikasi pada method tidak-aman.
 * API tetap identik untuk views: `req.csrfToken()` dan input `_csrf`.
 */
const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const HEADER_KEYS = ['csrf-token', 'xsrf-token', 'x-csrf-token', 'x-xsrf-token'];

function getTokenFromRequest(req) {
  if (req.body && typeof req.body._csrf === 'string') return req.body._csrf;
  for (const key of HEADER_KEYS) {
    const value = req.headers[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  if (typeof req.query._csrf === 'string') return req.query._csrf;
  return null;
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Middleware gaya csurf({ session: true }). */
function csrfMiddleware(req, res, next) {
  if (!req.session) {
    return next(new Error('csrf middleware membutuhkan express-session'));
  }

  // Pastikan token ada di session.
  if (typeof req.session.csrfToken !== 'string' || req.session.csrfToken.length < 32) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Expose token untuk template (kompatibel cara lama).
  req.csrfToken = function csrfToken() {
    return req.session.csrfToken;
  };
  res.locals.csrfToken = req.session.csrfToken;

  if (SAFE_METHODS.has(req.method)) return next();

  const token = getTokenFromRequest(req);
  if (!token || !timingSafeEqual(token, req.session.csrfToken)) {
    const err = new Error('invalid csrf token');
    err.code = 'EBADCSRFTOKEN';
    err.status = 403;
    return next(err);
  }
  return next();
}

/** Factory gaya csurf: csrf({ ... }) → middleware (opsi diabaikan demi kompatibilitas). */
module.exports = function csrf(options) {
  return csrfMiddleware;
};
module.exports.csrfMiddleware = csrfMiddleware;
