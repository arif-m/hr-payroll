/**
 * async-handler.js — wrapper promise untuk handler async Express 4.
 *
 * Express 4 TIDAK menangkap rejection dari handler async: satu query DB
 * yang gagal di handler tanpa try/catch = unhandledRejection = proses
 * server crash. Wrapper ini meneruskan error ke `next(err)` sehingga
 * seluruh error async mendarat di error middleware terpusat (app.js),
 * konsisten dengan perilaku handler sync yang melempar error.
 *
 * Pemakaian (dipanggil otomatis oleh codemod di routes/*.js):
 *   router.get('/foo', ensureLoggedIn, ah(listFoo));
 * atau bungkus manual handler baru:
 *   const ah = require('../helper/async-handler');
 *   router.post('/bar', ensureLoggedIn, ah(doBar));
 */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
