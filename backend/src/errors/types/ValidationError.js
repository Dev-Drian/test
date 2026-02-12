/**
 * @fileoverview Errores de validación de datos de entrada
 */

import { BaseError } from './BaseError.js';

export class ValidationError extends BaseError {
  /**
   * @param {string} message - Mensaje descriptivo
   * @param {Object} options
   * @param {string} options.field - Campo que falló la validación
   * @param {*} options.value - Valor inválido recibido
   * @param {string} options.expected - Descripción de lo esperado
   * @param {string[]} options.suggestions - Sugerencias para corregir
   */
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'VALIDATION_ERROR',
      type: 'ValidationError',
      statusCode: 400,
      isOperational: true,
      context: {
        field: options.field,
        value: options.value,
        expected: options.expected,
        suggestions: options.suggestions || [],
        ...options.context,
      },
      cause: options.cause,
    });

    this.field = options.field;
    this.value = options.value;
    this.expected = options.expected;
    this.suggestions = options.suggestions || [];
  }

  getUserMessage() {
    if (this.field && this.expected) {
      return `El campo "${this.field}" no es válido. ${this.expected}`;
    }
    return this.message;
  }
}

/**
 * Error cuando falta un campo requerido
 */
export class RequiredFieldError extends ValidationError {
  constructor(field, options = {}) {
    super(`El campo "${field}" es requerido`, {
      code: 'REQUIRED_FIELD',
      field,
      expected: 'Este campo no puede estar vacío',
      ...options,
    });
  }
}

/**
 * Error de formato inválido
 */
export class InvalidFormatError extends ValidationError {
  /**
   * @param {string} field - Campo con formato inválido
   * @param {string} format - Formato esperado
   * @param {string} example - Ejemplo de formato correcto
   */
  constructor(field, format, example, options = {}) {
    super(`El formato de "${field}" no es válido`, {
      code: 'INVALID_FORMAT',
      field,
      expected: `Formato esperado: ${format}. Ejemplo: ${example}`,
      suggestions: [`Usa el formato: ${example}`],
      ...options,
    });

    this.format = format;
    this.example = example;
  }

  getUserMessage() {
    return `El formato de ${this.field} no es válido. ${this.expected}`;
  }
}

/**
 * Error de rango/límite
 */
export class RangeError extends ValidationError {
  constructor(field, { min, max, actual }, options = {}) {
    const range = min !== undefined && max !== undefined
      ? `entre ${min} y ${max}`
      : min !== undefined
        ? `mayor o igual a ${min}`
        : `menor o igual a ${max}`;

    super(`El valor de "${field}" está fuera de rango`, {
      code: 'OUT_OF_RANGE',
      field,
      value: actual,
      expected: `Debe ser ${range}`,
      ...options,
    });

    this.min = min;
    this.max = max;
    this.actual = actual;
  }
}

/**
 * Error de tipo de dato
 */
export class TypeMismatchError extends ValidationError {
  constructor(field, expectedType, actualType, options = {}) {
    super(`Tipo de dato incorrecto para "${field}"`, {
      code: 'TYPE_MISMATCH',
      field,
      expected: `Se esperaba ${expectedType}, se recibió ${actualType}`,
      ...options,
    });

    this.expectedType = expectedType;
    this.actualType = actualType;
  }
}

export default ValidationError;
