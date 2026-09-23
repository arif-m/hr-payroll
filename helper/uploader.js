const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// fungsi untuk megenerate random string
async function randomFilename(length) {
  return crypto
    .randomBytes(length)
    .toString("hex");
}

async function getValidExtension(filename) {
    const formatAllowed = ["jpg", "jpeg", "png"];

    // ambil ekstensi file yang di upload
    const ext = filename
      .substr(filename.lastIndexOf(".") + 1)
      .toLowerCase();
  
    // jika ekstensi file cocok dengan salah satu list
    if (formatAllowed.indexOf(ext) > -1) {
      // kembalikan string ekstensi file nya
      return ext;
    }
    else {
      return false;
    }
}

// fungsi untuk validasi ekstensi file yang di upload
/*
exports.getValidExtension = (filename) => {
  // list ekstensi file
  const formatAllowed = ["jpg", "jpeg", "png"];

  // ambil ekstensi file yang di upload
  const ext = filename
    .substr(filename.lastIndexOf(".") + 1)
    .toLowerCase();

  // jika ekstensi file cocok dengan salah satu list
  if (formatAllowed.indexOf(ext) > -1) {
    // kembalikan string ekstensi file nya
    return ext;
  }
  else {
    return false;
  }
} */

// fungsi untuk memindahkan file hasil upload
exports.saveImage = (pathFrom, pathTo) => {
  try {
    // cek apakah direktori yang dituju ada?
    if ( ! fs.existsSync(pathTo)) {
      // jika tidak ada buat dulu foldernya
      const destination = path.dirname(pathTo);
      fs.mkdirSync(destination, { recursive: true });
    }

    // rename file hasil upload dengan nama baru dan simpan di direktori yang dituju
    fs.renameSync(pathFrom, pathTo);
  }
  catch (error) {
    throw (message = error);
  }
};

module.exports = { 
    getValidExtension,
    randomFilename,
}