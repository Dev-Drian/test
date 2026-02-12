/**
 * @fileoverview Errores relacionados con proveedores de IA (OpenAI, etc.)
 */

import { BaseError } from './BaseError.js';

export class AIProviderError extends BaseError {
  /**
   * @param {string} message
   * @param {Object} options
   * @param {string} options.provider - Proveedor de IA (openai, anthropic, etc.)
   * @param {string} options.operation - Operación que falló
   * @param {boolean} options.retryable - Si se puede reintentar
   */
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'AI_PROVIDER_ERROR',
      type: 'AIProviderError',
      statusCode: 503,
      isOperational: true,
      context: {
        provider: options.provider || 'unknown',
        operation: options.operation,
        retryable: options.retryable ?? true,
        ...options.context,
      },
      cause: options.cause,
    });

    this.provider = options.provider || 'unknown';
    this.operation = options.operation;
    this.retryable = options.retryable ?? true;
  }

  getUserMessage() {
    return 'Estoy tardando más de lo normal en procesar tu solicitud. ¿Puedes intentar de nuevo en unos segundos?';
  }
}

/**
 * Error de timeout de IA
 */
export class AITimeoutError extends AIProviderError {
  constructor(provider, timeout, options = {}) {
    super(`Timeout de ${timeout}ms excedido para ${provider}`, {
      code: 'AI_TIMEOUT',
      provider,
      operation: 'request',
      retryable: true,
      context: { timeout },
      ...options,
    });

    this.timeout = timeout;
  }

  getUserMessage() {
    return '⏳ Estoy tardando más de lo normal. ¿Puedes repetir tu mensaje?';
  }
}

/**
 * Error de límite de rate
 */
export class AIRateLimitError extends AIProviderError {
  constructor(provider, retryAfter, options = {}) {
    super(`Rate limit excedido para ${provider}`, {
      code: 'AI_RATE_LIMIT',
      provider,
      operation: 'request',
      retryable: true,
      context: { retryAfter },
      ...options,
    });

    this.retryAfter = retryAfter;
  }

  getUserMessage() {
    return '🔄 Tengo muchas solicitudes en este momento. Por favor, espera unos segundos e intenta de nuevo.';
  }
}

/**
 * Error de API key inválida
 */
export class AIAuthenticationError extends AIProviderError {
  constructor(provider, options = {}) {
    super(`Error de autenticación con ${provider}`, {
      code: 'AI_AUTH_ERROR',
      provider,
      operation: 'authentication',
      retryable: false,
      isOperational: false, // Error de configuración
      ...options,
    });
  }

  getUserMessage() {
    return '⚠️ Hay un problema con la configuración del sistema. Por favor, contacta al administrador.';
  }
}

/**
 * Error de contenido bloqueado
 */
export class AIContentFilterError extends AIProviderError {
  constructor(provider, reason, options = {}) {
    super(`Contenido bloqueado por filtro de ${provider}`, {
      code: 'AI_CONTENT_FILTERED',
      provider,
      operation: 'content_moderation',
      retryable: false,
      context: { reason },
      ...options,
    });

    this.reason = reason;
  }

  getUserMessage() {
    return 'No puedo procesar esa solicitud. ¿Podrías reformular tu mensaje?';
  }
}

/**
 * Error de cuota excedida
 */
export class AIQuotaExceededError extends AIProviderError {
  constructor(provider, options = {}) {
    super(`Cuota excedida para ${provider}`, {
      code: 'AI_QUOTA_EXCEEDED',
      provider,
      operation: 'usage',
      retryable: false,
      isOperational: false,
      ...options,
    });
  }

  getUserMessage() {
    return '⚠️ Se ha alcanzado el límite de uso del sistema. Por favor, contacta al administrador.';
  }
}

export default AIProviderError;
