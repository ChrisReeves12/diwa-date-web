"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logError = logError;
const winston_1 = __importDefault(require("winston"));
// Create a Winston logger instance
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        // Log to the console
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        // Log to file if LOG_PATH is defined
        ...(process.env.LOG_PATH ? [
            new winston_1.default.transports.File({
                filename: process.env.LOG_PATH,
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            })
        ] : [])
    ]
});
/**
 * Log a message with the specified level
 * Uses environment variables:
 * - LOG_LEVEL: The minimum level to log (default: 'info')
 * - LOG_PATH: The file path to log to (optional)
 */
function log(message, level = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
    logger.log(level, message);
}
/**
 * Log an error with its message and stack trace
 * @param error The error object to log
 * @param context Optional additional context information
 */
function logError(error, context) {
    const message = context ? `${context}: ${error.message}` : error.message;
    console.error(`[ERROR] ${message}`);
    console.error(error.stack);
    logger.error(message, {
        stack: error.stack,
        context: context || 'unknown'
    });
}
//# sourceMappingURL=logging.helpers.js.map