/**
 * Logger - Sistema de logging centralizado con Winston
 * 
 * Niveles: error, warn, info, http, verbose, debug, silly
 * 
 * Uso:
 *   import logger from './config/logger.js';
 *   logger.info('Mensaje informativo');
 *   logger.error('Error:', { error: err.message });
 *   logger.debug('Debug data:', { data });
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determinar entorno
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Colores personalizados
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

winston.addColors(colors);

// Formato personalizado para consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Formato para archivos (JSON estructurado)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports
const transports = [
  // Consola - siempre activa
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel,
  }),
];

// En producción, agregar archivos de log
if (isProduction) {
  const logsDir = path.join(__dirname, '../../logs');
  
  transports.push(
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Archivo combinado
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  transports,
  // No salir en errores no capturados
  exitOnError: false,
});

// Métodos helper para contexto
logger.withContext = (context) => {
  return {
    error: (msg, meta = {}) => logger.error(msg, { ...context, ...meta }),
    warn: (msg, meta = {}) => logger.warn(msg, { ...context, ...meta }),
    info: (msg, meta = {}) => logger.info(msg, { ...context, ...meta }),
    debug: (msg, meta = {}) => logger.debug(msg, { ...context, ...meta }),
    http: (msg, meta = {}) => logger.http(msg, { ...context, ...meta }),
  };
};

// Child logger para módulos específicos
logger.child = (module) => {
  return logger.withContext({ module });
};

export default logger;

// Named exports para conveniencia
export const log = logger;
export const createLogger = (module) => logger.child(module);
