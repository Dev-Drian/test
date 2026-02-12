/**
 * @fileoverview Handler centralizado de errores
 * Orquesta la clasificación, recuperación y respuesta de errores
 */

import { RetryStrategy, RetryStrategies } from './recovery/RetryStrategy.js';
import { CircuitBreaker, CircuitBreakerOpenError } from './recovery/CircuitBreaker.js';
import { UserFriendlyMessages } from './messages/UserFriendlyMessages.js';
import { BaseError } from './types/BaseError.js';

export class ErrorHandler {
  /**
   * @param {Object} config
   * @param {Object} config.retry - Configuración de reintentos
   * @param {Object} config.circuit - Configuración del circuit breaker
   * @param {Function} config.logger - Función de logging
   */
  constructor(config = {}) {
    this.retryStrategy = config.retryStrategy || RetryStrategies.fast;
    this.circuitBreakers = new Map();
    this.circuitConfig = config.circuit || {};
    this.messageBuilder = new UserFriendlyMessages();
    this.logger = config.logger || console;
    
    // Métricas
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
    };
  }

  /**
   * Maneja un error y devuelve una respuesta apropiada
   * @param {Error} error - Error a manejar
   * @param {Object} context - Contexto de la operación
   * @returns {Promise<Object>} Respuesta para el usuario
   */
  async handle(error, context = {}) {
    this.metrics.totalErrors++;

    // 1. Clasificar el error
    const classification = this.classify(error);
    this._trackError(classification);

    // 2. Loggear el error
    this._log(error, classification, context);

    // 3. Verificar si es un error operacional
    if (!classification.isOperational) {
      // Error crítico - notificar a administradores
      this._notifyCritical(error, context);
    }

    // 4. Generar respuesta amigable
    const userMessage = this._buildUserMessage(error, classification, context);

    // 5. Generar sugerencias
    const suggestions = this._getSuggestions(classification, context);

    return {
      success: false,
      error: {
        code: classification.code,
        type: classification.type,
        message: userMessage,
        suggestions,
      },
      canRetry: classification.retryable,
    };
  }

  /**
   * Ejecuta una operación con manejo de errores, reintentos y circuit breaker
   * @param {Function} operation - Operación a ejecutar
   * @param {Object} options
   * @param {string} options.serviceName - Nombre del servicio (para circuit breaker)
   * @param {Object} options.context - Contexto para el error handler
   * @param {Function} options.fallback - Función de fallback
   * @param {RetryStrategy} options.retryStrategy - Estrategia de reintentos
   */
  async executeWithProtection(operation, options = {}) {
    const {
      serviceName,
      context = {},
      fallback = null,
      retryStrategy = this.retryStrategy,
    } = options;

    // Obtener o crear circuit breaker para el servicio
    const circuitBreaker = this._getCircuitBreaker(serviceName);

    try {
      // Ejecutar con circuit breaker
      return await circuitBreaker.execute(async () => {
        // Ejecutar con reintentos
        return await retryStrategy.execute(operation, {
          onRetry: ({ error, attempt, delay }) => {
            this.metrics.recoveryAttempts++;
            this.logger.warn(`Retry ${attempt} for ${serviceName}`, {
              error: error.message,
              delay,
            });
          },
        });
      }, fallback);

    } catch (error) {
      // Si el circuit breaker está abierto, dar un mensaje específico
      if (error instanceof CircuitBreakerOpenError) {
        return this.handle(
          error,
          { ...context, serviceName, retryAfter: error.retryAfter }
        );
      }

      return this.handle(error, { ...context, serviceName });
    }
  }

  /**
   * Clasifica un error en categorías manejables
   * @param {Error} error
   * @returns {Object}
   */
  classify(error) {
    // Si es un error personalizado, usar su clasificación
    if (error instanceof BaseError) {
      return {
        code: error.code,
        type: error.type,
        isOperational: error.isOperational,
        retryable: error.retryable ?? false,
        statusCode: error.statusCode,
      };
    }

    // Clasificar errores nativos y de terceros
    const errorClassifications = {
      // Errores de red
      ECONNRESET: { code: 'NETWORK_ERROR', type: 'NetworkError', retryable: true },
      ECONNREFUSED: { code: 'NETWORK_ERROR', type: 'NetworkError', retryable: true },
      ETIMEDOUT: { code: 'NETWORK_ERROR', type: 'NetworkError', retryable: true },
      ENOTFOUND: { code: 'NETWORK_ERROR', type: 'NetworkError', retryable: false },
      
      // Errores de JSON
      SyntaxError: { code: 'PARSE_ERROR', type: 'ParseError', retryable: false },
      
      // Errores de tipo
      TypeError: { code: 'TYPE_ERROR', type: 'TypeError', retryable: false },
      ReferenceError: { code: 'REFERENCE_ERROR', type: 'ReferenceError', retryable: false },
    };

    // Buscar por código de error o nombre
    const classification = errorClassifications[error.code] 
      || errorClassifications[error.name]
      || {
        code: 'UNKNOWN_ERROR',
        type: 'UnknownError',
        retryable: false,
      };

    return {
      ...classification,
      isOperational: classification.code !== 'UNKNOWN_ERROR',
      statusCode: this._getStatusCode(classification.code),
    };
  }

  /**
   * Obtiene o crea un circuit breaker para un servicio
   * @param {string} serviceName
   * @returns {CircuitBreaker}
   */
  _getCircuitBreaker(serviceName) {
    if (!serviceName) {
      // Circuit breaker deshabilitado
      return {
        execute: async (op, fallback) => op(),
      };
    }

    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker({
        ...this.circuitConfig,
        onStateChange: (oldState, newState) => {
          this.logger.info(`Circuit breaker [${serviceName}]: ${oldState} → ${newState}`);
        },
      }));
    }

    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Construye el mensaje de usuario
   * @param {Error} error
   * @param {Object} classification
   * @param {Object} context
   * @returns {string}
   */
  _buildUserMessage(error, classification, context) {
    // Si el error tiene un método getUserMessage, usarlo
    if (typeof error.getUserMessage === 'function') {
      return error.getUserMessage();
    }

    // Usar el message builder
    return this.messageBuilder.build(classification.code, {
      ...context,
      ...error.context,
      field: error.field,
      entity: error.entity,
    });
  }

  /**
   * Genera sugerencias basadas en el tipo de error
   * @param {Object} classification
   * @param {Object} context
   * @returns {string[]}
   */
  _getSuggestions(classification, context) {
    const suggestions = {
      VALIDATION_ERROR: [
        'Verifica que los datos estén completos',
        'Revisa el formato de los campos',
      ],
      NOT_FOUND: [
        'Intenta con otros criterios de búsqueda',
        '¿Quieres ver la lista disponible?',
      ],
      SCHEDULE_CONFLICT: [
        '¿Te muestro los horarios disponibles?',
      ],
      AI_TIMEOUT: [
        'Intenta con un mensaje más corto',
        'Espera unos segundos e intenta de nuevo',
      ],
      NETWORK_ERROR: [
        'Verifica tu conexión a internet',
        'Intenta de nuevo en unos momentos',
      ],
    };

    return suggestions[classification.code] || [
      'Intenta de nuevo',
      'Si el problema persiste, contacta soporte',
    ];
  }

  /**
   * Loggea el error de forma estructurada
   * @param {Error} error
   * @param {Object} classification
   * @param {Object} context
   */
  _log(error, classification, context) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: classification.code,
        type: classification.type,
        stack: error.stack,
      },
      context,
      isOperational: classification.isOperational,
    };

    if (classification.isOperational) {
      this.logger.warn('Operational error', logData);
    } else {
      this.logger.error('Critical error', logData);
    }
  }

  /**
   * Notifica errores críticos
   * @param {Error} error
   * @param {Object} context
   */
  _notifyCritical(error, context) {
    // TODO: Implementar notificación a administradores
    // - Email
    // - Slack
    // - PagerDuty
    this.logger.error('🚨 CRITICAL ERROR - Requires attention', {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Registra métricas del error
   * @param {Object} classification
   */
  _trackError(classification) {
    const { type } = classification;
    this.metrics.errorsByType[type] = (this.metrics.errorsByType[type] || 0) + 1;
  }

  /**
   * Obtiene el código HTTP para un tipo de error
   * @param {string} code
   * @returns {number}
   */
  _getStatusCode(code) {
    const statusCodes = {
      VALIDATION_ERROR: 400,
      REQUIRED_FIELD: 400,
      INVALID_FORMAT: 400,
      NOT_FOUND: 404,
      DUPLICATE_ENTRY: 409,
      SCHEDULE_CONFLICT: 409,
      ACTION_NOT_ALLOWED: 403,
      LIMIT_EXCEEDED: 429,
      AI_RATE_LIMIT: 429,
      AI_TIMEOUT: 504,
      NETWORK_ERROR: 503,
      UNKNOWN_ERROR: 500,
    };

    return statusCodes[code] || 500;
  }

  /**
   * Obtiene las métricas actuales
   * @returns {Object}
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([name, cb]) => [
          name,
          cb.getStatus(),
        ])
      ),
    };
  }

  /**
   * Resetea las métricas
   */
  resetMetrics() {
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
    };
  }
}

export default ErrorHandler;
