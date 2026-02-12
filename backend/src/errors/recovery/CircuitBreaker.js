/**
 * @fileoverview Implementación del patrón Circuit Breaker
 * Previene cascadas de fallos al detener temporalmente llamadas a servicios con problemas
 */

export class CircuitBreaker {
  /**
   * Estados del Circuit Breaker
   */
  static States = {
    CLOSED: 'CLOSED',       // Normal: permite todas las llamadas
    OPEN: 'OPEN',           // Fallando: bloquea todas las llamadas
    HALF_OPEN: 'HALF_OPEN', // Probando: permite algunas llamadas de prueba
  };

  /**
   * @param {Object} config
   * @param {number} config.failureThreshold - Fallos antes de abrir (default: 5)
   * @param {number} config.resetTimeout - Tiempo en ms antes de probar (default: 30000)
   * @param {number} config.halfOpenRequests - Requests permitidos en half-open (default: 3)
   * @param {Function} config.onStateChange - Callback cuando cambia el estado
   */
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeout = config.resetTimeout ?? 30000;
    this.halfOpenRequests = config.halfOpenRequests ?? 3;
    this.onStateChange = config.onStateChange || (() => {});

    // Estado interno
    this.state = CircuitBreaker.States.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;

    // Métricas
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: [],
    };
  }

  /**
   * Ejecuta una operación protegida por el circuit breaker
   * @param {Function} operation - Función async a ejecutar
   * @param {Function} fallback - Función de fallback opcional
   * @returns {Promise<*>}
   */
  async execute(operation, fallback = null) {
    this.metrics.totalRequests++;

    // Verificar si debemos intentar transición a half-open
    this._checkHalfOpen();

    // Si está abierto, rechazar o usar fallback
    if (this.state === CircuitBreaker.States.OPEN) {
      this.metrics.rejectedRequests++;
      
      if (fallback) {
        return await fallback();
      }
      
      throw new CircuitBreakerOpenError(this.resetTimeout - (Date.now() - this.lastFailureTime));
    }

    // Si está half-open, verificar límite de intentos
    if (this.state === CircuitBreaker.States.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.halfOpenRequests) {
        this.metrics.rejectedRequests++;
        
        if (fallback) {
          return await fallback();
        }
        
        throw new CircuitBreakerOpenError(0);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await operation();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Registra un éxito
   */
  _onSuccess() {
    this.metrics.successfulRequests++;
    this.failures = 0;

    if (this.state === CircuitBreaker.States.HALF_OPEN) {
      this.successes++;
      
      // Si tenemos suficientes éxitos, cerrar el circuito
      if (this.successes >= this.halfOpenRequests) {
        this._setState(CircuitBreaker.States.CLOSED);
      }
    }
  }

  /**
   * Registra un fallo
   * @param {Error} error
   */
  _onFailure(error) {
    this.metrics.failedRequests++;
    this.failures++;
    this.lastFailureTime = Date.now();

    // En half-open, un solo fallo abre el circuito
    if (this.state === CircuitBreaker.States.HALF_OPEN) {
      this._setState(CircuitBreaker.States.OPEN);
      return;
    }

    // En closed, verificar threshold
    if (this.state === CircuitBreaker.States.CLOSED) {
      if (this.failures >= this.failureThreshold) {
        this._setState(CircuitBreaker.States.OPEN);
      }
    }
  }

  /**
   * Verifica si debemos transicionar a half-open
   */
  _checkHalfOpen() {
    if (this.state === CircuitBreaker.States.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure >= this.resetTimeout) {
        this._setState(CircuitBreaker.States.HALF_OPEN);
      }
    }
  }

  /**
   * Cambia el estado del circuit breaker
   * @param {string} newState
   */
  _setState(newState) {
    const oldState = this.state;
    this.state = newState;

    // Reset contadores según el estado
    if (newState === CircuitBreaker.States.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.halfOpenAttempts = 0;
    } else if (newState === CircuitBreaker.States.HALF_OPEN) {
      this.successes = 0;
      this.halfOpenAttempts = 0;
    }

    // Registrar cambio y notificar
    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
    });

    this.onStateChange(oldState, newState);
  }

  /**
   * Fuerza el cierre del circuito
   */
  forceClose() {
    this._setState(CircuitBreaker.States.CLOSED);
  }

  /**
   * Fuerza la apertura del circuito
   */
  forceOpen() {
    this.lastFailureTime = Date.now();
    this._setState(CircuitBreaker.States.OPEN);
  }

  /**
   * Obtiene el estado actual
   * @returns {Object}
   */
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      metrics: { ...this.metrics },
    };
  }
}

/**
 * Error cuando el circuit breaker está abierto
 */
export class CircuitBreakerOpenError extends Error {
  constructor(retryAfter) {
    super('Circuit breaker is open');
    this.name = 'CircuitBreakerOpenError';
    this.retryAfter = retryAfter;
    this.retryable = true;
  }
}

export default CircuitBreaker;
