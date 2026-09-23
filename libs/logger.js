var winston = require('winston');
var dateTime = new Date();
var logDate = dateTime.toISOString().slice(0,10)
var options = {
    file: {
        level: 'info',
        //filename: `${appRoot}/logs/your-app.log`,
        filename: `./logs/logs-${logDate}.log`,
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //ukuran file maksimal 5MB
        maxFiles: 5,
        colorize: false,
    },
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
    },
};

// Memanggil class winston dengan setting yang sudah kita buat
var logger = winston.createLogger({
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console)
    ],
    exitOnError: false, // Aplikasi tidak akan berhenti jika ada exception
});

// Membuat file stream (nulis file) yang dimana akan dipakai morgan.`
logger.stream = {
    write: function(message, encoding) {
        // memakai log level info saja, supaya outputnya dipakai sama file stream dan console.
        logger.info(message);
    },
};

module.exports = logger;