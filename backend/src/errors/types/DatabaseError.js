/**
 * @fileoverview Errores relacionados con la base de datos
 */

import { BaseError } from './BaseError.js';

export class DatabaseError extends BaseError {
  /**
   * @param {string} message
   * @param {Object} options
   * @param {string} options.operation - Operación que falló (insert, update, delete, query)
   * @param {string} options.table - Tabla afectada
   * @param {boolean} options.retryable - Si se puede reintentar
   */
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'DATABASE_ERROR',
      type: 'DatabaseError',
      statusCode: 500,
      isOperational: true,
      context: {
        operation: options.operation,
        table: options.table,
        retryable: options.retryable ?? true,
        ...options.context,
      },
      cause: options.cause,
    });

    this.operation = options.operation;
    this.table = options.table;
    this.retryable = options.retryable ?? true;
  }

  getUserMessage() {
    return '⚠️ Hubo un problema al guardar los datos. Por favor, intenta de nuevo.';
  }
}

/**
 * Error de registro no encontrado
 */
export class NotFoundError extends DatabaseError {
  /**
   * @param {string} entity - Tipo de entidad (cliente, cita, producto)
   * @param {Object} criteria - Criterios de búsqueda usados
   */
  constructor(entity, criteria = {}, options = {}) {
    const criteriaStr = Object.entries(criteria)
      .map(([k, v]) => `${k}="${v}"`)
      .join(', ');

    super(`${entity} no encontrado`, {
      code: 'NOT_FOUND',
      operation: 'query',
      retryable: false,
      context: { entity, criteria },
      ...options,
    });

    this.entity = entity;
    this.criteria = criteria;
  }

  getUserMessage() {
    const friendlyNames = {
      client: 'cliente',
      appointment: 'cita',
      product: 'producto',
      sale: 'venta',
      user: 'usuario',
    };

    const name = friendlyNames[this.entity?.toLowerCase()] || this.entity;
    return `🔍 No encontré ningún ${name} con esos datos. ¿Quieres ver la lista disponible?`;
  }
}

/**
 * Error de registro duplicado
 */
export class DuplicateError extends DatabaseError {
  /**
   * @param {string} entity - Tipo de entidad
   * @param {string} field - Campo que causa el duplicado
   * @param {*} value - Valor duplicado
   */
  constructor(entity, field, value, options = {}) {
    super(`${entity} duplicado para ${field}`, {
      code: 'DUPLICATE_ENTRY',
      operation: 'insert',
      retryable: false,
      context: { entity, field, value },
      ...options,
    });

    this.entity = entity;
    this.field = field;
    this.duplicateValue = value;
  }

  getUserMessage() {
    const messages = {
      email: '📧 Ya existe un registro con ese correo electrónico.',
      phone: '📱 Ya existe un registro con ese número de teléfono.',
      date: '📅 Ya existe una cita/reserva para esa fecha y hora.',
      name: '👤 Ya existe un registro con ese nombre.',
    };

    return messages[this.field] || `⚠️ Ya existe un ${this.entity} con ese ${this.field}.`;
  }
}

/**
 * Error de conflicto de horario
 */
export class ScheduleConflictError extends DatabaseError {
  /**
   * @param {Date} requestedTime - Hora solicitada
   * @param {Object} existingAppointment - Cita existente que causa conflicto
   */
  constructor(requestedTime, existingAppointment, options = {}) {
    super('Conflicto de horario', {
      code: 'SCHEDULE_CONFLICT',
      operation: 'insert',
      retryable: false,
      context: { requestedTime, existingAppointment },
      ...options,
    });

    this.requestedTime = requestedTime;
    this.existingAppointment = existingAppointment;
  }

  getUserMessage() {
    return '📅 Ya hay una cita agendada para ese horario. ¿Te muestro los horarios disponibles?';
  }
}

/**
 * Error de conexión a la base de datos
 */
export class ConnectionError extends DatabaseError {
  constructor(options = {}) {
    super('Error de conexión a la base de datos', {
      code: 'DB_CONNECTION_ERROR',
      operation: 'connect',
      retryable: true,
      isOperational: false,
      ...options,
    });
  }

  getUserMessage() {
    return '⚠️ Estamos experimentando problemas técnicos. Por favor, intenta en unos momentos.';
  }
}

/**
 * Error de transacción
 */
export class TransactionError extends DatabaseError {
  constructor(message, options = {}) {
    super(message || 'Error en transacción', {
      code: 'TRANSACTION_ERROR',
      operation: 'transaction',
      retryable: true,
      ...options,
    });
  }

  getUserMessage() {
    return '⚠️ No se pudo completar la operación. Por favor, intenta de nuevo.';
  }
}

export default DatabaseError;
