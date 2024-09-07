const { createLogger, format, transports } = require("winston");
require('winston-daily-rotate-file');

var fileTransport = new transports.DailyRotateFile({
    level: 'info',
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD_HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

// fileTransport.on('rotate', function (oldFilename, newFilename) {
//     // do something fun
// });

const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [
        new transports.Console({}),
        fileTransport,
    ],
});
logger.info('Initiated logger');

export default logger;