import winston from "winston";
import * as Sentry from "@sentry/nextjs";

// Create a Winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Log to the console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Log to file if LOG_PATH is defined
        ...(process.env.LOG_PATH ? [
            new winston.transports.File({
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
export function log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
    logger.log(level, message);
}

/**
 * Log an error with its message and stack trace
 * @param error The error object to log
 * @param context Optional additional context information
 */
export function logError(error: Error, context?: string) {
    const message = context ? `${context}: ${error.message}` : error.message;

    console.error(`[ERROR] ${message}`);
    console.error(error.stack);

    Sentry.logger.error(error.message, { stack: error.stack });

    logger.error(message, {
        stack: error.stack,
        context: context || 'unknown'
    });
}
