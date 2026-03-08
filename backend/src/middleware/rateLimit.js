/**
 * RateLimitMiddleware - Protección contra ataques de fuerza bruta
 * 
 * Limita intentos en endpoints sensibles como auth.
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter para login
 * 5 intentos cada 15 minutos por IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    code: 'TOO_MANY_REQUESTS',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para registro
 * 3 registros cada hora por IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: {
    error: 'Demasiados registros desde esta IP. Intenta de nuevo en 1 hora.',
    code: 'TOO_MANY_REQUESTS',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para forgot-password
 * 3 intentos cada 15 minutos por IP
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3,
  message: {
    error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    code: 'TOO_MANY_REQUESTS',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter general para API
 * 100 requests por minuto por IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    error: 'Demasiadas solicitudes. Reduce la velocidad.',
    code: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // No limitar webhooks ni health checks
    return req.path.includes('/webhooks/') || req.path === '/health';
  },
});
