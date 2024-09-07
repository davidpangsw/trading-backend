import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { DailyRotateFileTransportOptions } from 'winston-daily-rotate-file';

// Set up the file transport with the required options
const fileTransport = new transports.DailyRotateFile({
    level: 'info',
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD_HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
} as DailyRotateFileTransportOptions); // Cast to the appropriate type

// Uncomment and type if you need to handle rotation events
// fileTransport.on('rotate', function (oldFilename: string, newFilename: string) {
//     // Handle the log rotation event here
// });

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console(),  // Log to console
        fileTransport,             // Log to daily rotated files
    ],
});

// Log an initial message indicating that the logger has been initialized
logger.info('Initiated logger');

export default logger;
