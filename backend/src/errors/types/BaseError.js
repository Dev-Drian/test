/**
 * @fileoverview Error base para todos los errores personalizados del sistema
 * Siguiendo el patrón de errores estructurados con metadata
 */

export class BaseError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error
   * @param {Object} options - Opciones adicionales
   * @param {string} options.code - Código único del error (ej: 'VALIDATION_001')
   * @param {string} options.type - Tipo de error para clasificación
   * @param {number} options.statusCode - Código HTTP relacionado
   * @param {boolean} options.isOperational - Si es un error operacional (esperado) vs programático
   * @param {Object} options.context - Contexto adicional para debugging
   * @param {Error} options.cause - Error original que causó este error
   */
  constructor(message, options = {}) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.type = options.type || 'UnknownError';
    this.statusCode = options.statusCode || 500;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context || {};
    this.cause = options.cause || null;
    this.timestamp = new Date().toISOString();
    
    // Capturar stack trace excluyendo el constructor
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializa el error para logging estructurado
   * @returns {Object} Objeto serializable
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message || null,
    };
  }

  /**
   * Crea una versión segura para enviar al usuario
   * @returns {Object} Datos seguros sin información sensible
   */
  toUserSafe() {
    return {
      code: this.code,
      message: this.getUserMessage(),
      type: this.type,
    };
  }

  /**
   * Mensaje amigable para el usuario
   * Debe ser sobrescrito por clases hijas
   * @returns {string}
   */
  getUserMessage() {
    return 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.';
  }
}

export default BaseError;
