/**
 * @fileoverview Exportación centralizada del módulo de errores
 */

// Handler principal
export { ErrorHandler } from './ErrorHandler.js';

// Tipos de error
export * from './types/index.js';

// Recuperación
export { RetryStrategy, RetryStrategies } from './recovery/RetryStrategy.js';
export { CircuitBreaker, CircuitBreakerOpenError } from './recovery/CircuitBreaker.js';

// Mensajes
export { UserFriendlyMessages } from './messages/UserFriendlyMessages.js';
