/**
 * Middleware de logging HTTP para Express
 * Registra todas las peticiones con información estructurada
 */

import logger from '../config/logger.js';

/**
 * Middleware que registra peticiones HTTP
 * Incluye: método, URL, status, tiempo de respuesta, IP
 */
export const httpLogger = (options = {}) => {
  const { skip = () => false } = options;
  
  return (req, res, next) => {
    // Skip health checks y rutas estáticas
    if (skip(req)) {
      return next();
    }
    
    const startTime = Date.now();
    
    // Capturar info del request
    const requestInfo = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      workspaceId: req.query?.workspaceId || req.body?.workspaceId,
    };
    
    // Interceptar el fin del response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        ...requestInfo,
        status: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
      };
      
      // Nivel según status code
      if (res.statusCode >= 500) {
        logger.error(`HTTP ${req.method} ${requestInfo.url}`, logData);
      } else if (res.statusCode >= 400) {
        logger.warn(`HTTP ${req.method} ${requestInfo.url}`, logData);
      } else {
        logger.http(`HTTP ${req.method} ${requestInfo.url}`, logData);
      }
    });
    
    next();
  };
};

/**
 * Configuración por defecto: skip health checks
 */
export const defaultHttpLogger = httpLogger({
  skip: (req) => {
    const skipPaths = ['/health', '/api/cache/stats', '/favicon.ico'];
    return skipPaths.some(path => req.url.startsWith(path));
  },
});

export default defaultHttpLogger;
