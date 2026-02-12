/**
 * @fileoverview Estrategia de reintentos con exponential backoff
 * Implementa patrones de retry robustos para operaciones que pueden fallar temporalmente
 */

export class RetryStrategy {
  /**
   * @param {Object} config
   * @param {number} config.maxRetries - Número máximo de reintentos (default: 3)
   * @param {number} config.baseDelay - Delay base en ms (default: 1000)
   * @param {number} config.maxDelay - Delay máximo en ms (default: 10000)
   * @param {number} config.multiplier - Multiplicador para backoff (default: 2)
   * @param {boolean} config.jitter - Añadir variación aleatoria (default: true)
   */
  constructor(config = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 1000;
    this.maxDelay = config.maxDelay ?? 10000;
    this.multiplier = config.multiplier ?? 2;
    this.jitter = config.jitter ?? true;
  }

  /**
   * Ejecuta una operación con reintentos automáticos
   * @param {Function} operation - Función async a ejecutar
   * @param {Object} options
   * @param {Function} options.shouldRetry - Función que determina si reintentar
   * @param {Function} options.onRetry - Callback en cada reintento
   * @returns {Promise<*>} Resultado de la operación
   */
  async execute(operation, options = {}) {
    const {
      shouldRetry = this._defaultShouldRetry.bind(this),
      onRetry = () => {},
    } = options;

    let lastError;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt > this.maxRetries || !shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this._calculateDelay(attempt);
        
        onRetry({
          error,
          attempt,
          delay,
          maxRetries: this.maxRetries,
        });

        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calcula el delay con exponential backoff
   * @param {number} attempt - Número de intento actual
   * @returns {number} Delay en milisegundos
   */
  _calculateDelay(attempt) {
    // Exponential backoff: delay = baseDelay * (multiplier ^ attempt)
    let delay = this.baseDelay * Math.pow(this.multiplier, attempt - 1);
    
    // Aplicar límite máximo
    delay = Math.min(delay, this.maxDelay);
    
    // Añadir jitter para evitar thundering herd
    if (this.jitter) {
      const jitterFactor = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
      delay = Math.floor(delay * jitterFactor);
    }

    return delay;
  }

  /**
   * Determina si se debe reintentar basado en el tipo de error
   * @param {Error} error
   * @param {number} attempt
   * @returns {boolean}
   */
  _defaultShouldRetry(error, attempt) {
    // Errores que NO deben reintentarse
    const nonRetryableErrors = [
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'DUPLICATE_ENTRY',
      'ACTION_NOT_ALLOWED',
      'AI_AUTH_ERROR',
      'AI_QUOTA_EXCEEDED',
    ];

    if (error.code && nonRetryableErrors.includes(error.code)) {
      return false;
    }

    // Verificar propiedad retryable si existe
    if (typeof error.retryable === 'boolean') {
      return error.retryable;
    }

    // Por defecto, reintentar errores de red/timeout
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      'EAI_AGAIN',
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Sleep helper
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry strategies preconfiguradas
 */
export const RetryStrategies = {
  /** Para operaciones rápidas (API calls) */
  fast: new RetryStrategy({
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
  }),

  /** Para operaciones de base de datos */
  database: new RetryStrategy({
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
  }),

  /** Para llamadas a IA (pueden tardar más) */
  ai: new RetryStrategy({
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 10000,
  }),

  /** Sin reintentos */
  none: new RetryStrategy({
    maxRetries: 0,
  }),
};

export default RetryStrategy;
