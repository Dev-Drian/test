/**
 * @fileoverview Errores de reglas de negocio
 */

import { BaseError } from './BaseError.js';

export class BusinessRuleError extends BaseError {
  /**
   * @param {string} message
   * @param {Object} options
   * @param {string} options.rule - Regla de negocio violada
   * @param {string[]} options.suggestions - Sugerencias para resolver
   */
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'BUSINESS_RULE_ERROR',
      type: 'BusinessRuleError',
      statusCode: 422, // Unprocessable Entity
      isOperational: true,
      context: {
        rule: options.rule,
        suggestions: options.suggestions || [],
        ...options.context,
      },
      cause: options.cause,
    });

    this.rule = options.rule;
    this.suggestions = options.suggestions || [];
  }

  getUserMessage() {
    if (this.suggestions.length > 0) {
      return `${this.message}\n\n💡 Sugerencias:\n${this.suggestions.map(s => `• ${s}`).join('\n')}`;
    }
    return this.message;
  }
}

/**
 * Error de disponibilidad
 */
export class AvailabilityError extends BusinessRuleError {
  /**
   * @param {string} resource - Recurso no disponible (doctor, sala, etc.)
   * @param {Date} requestedTime - Hora solicitada
   * @param {Date[]} availableSlots - Horarios disponibles alternativos
   */
  constructor(resource, requestedTime, availableSlots = [], options = {}) {
    const suggestions = availableSlots.slice(0, 3).map(slot => {
      const date = new Date(slot);
      return date.toLocaleString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    super(`${resource} no está disponible en ese horario`, {
      code: 'UNAVAILABLE',
      rule: 'availability_check',
      suggestions: suggestions.length > 0
        ? [`Horarios disponibles: ${suggestions.join(', ')}`]
        : ['Consulta otros horarios disponibles'],
      context: { resource, requestedTime, availableSlots },
      ...options,
    });

    this.resource = resource;
    this.requestedTime = requestedTime;
    this.availableSlots = availableSlots;
  }

  getUserMessage() {
    if (this.availableSlots.length > 0) {
      return `📅 ${this.resource} no está disponible a esa hora.\n\n¿Te gustaría alguno de estos horarios?\n${this.suggestions[0]}`;
    }
    return `📅 ${this.resource} no está disponible a esa hora. ¿Quieres que busque otros horarios?`;
  }
}

/**
 * Error de horario fuera de rango
 */
export class OutOfHoursError extends BusinessRuleError {
  /**
   * @param {Object} workingHours - Horario de trabajo
   */
  constructor(workingHours, options = {}) {
    super('La hora solicitada está fuera del horario de atención', {
      code: 'OUT_OF_HOURS',
      rule: 'working_hours',
      suggestions: [
        `Nuestro horario es: ${workingHours.start} - ${workingHours.end}`,
      ],
      context: { workingHours },
      ...options,
    });

    this.workingHours = workingHours;
  }

  getUserMessage() {
    return `⏰ Esa hora está fuera de nuestro horario de atención.\n\n📋 Horario: ${this.workingHours.start} - ${this.workingHours.end}\n\n¿Te gustaría agendar dentro de este horario?`;
  }
}

/**
 * Error de límite excedido
 */
export class LimitExceededError extends BusinessRuleError {
  /**
   * @param {string} limitType - Tipo de límite (citas por día, productos por pedido, etc.)
   * @param {number} limit - Límite máximo
   * @param {number} current - Valor actual
   */
  constructor(limitType, limit, current, options = {}) {
    super(`Se ha alcanzado el límite de ${limitType}`, {
      code: 'LIMIT_EXCEEDED',
      rule: 'max_limit',
      suggestions: [`El máximo permitido es ${limit}`],
      context: { limitType, limit, current },
      ...options,
    });

    this.limitType = limitType;
    this.limit = limit;
    this.current = current;
  }

  getUserMessage() {
    return `⚠️ Se ha alcanzado el límite máximo de ${this.limitType} (${this.limit}).`;
  }
}

/**
 * Error de acción no permitida
 */
export class ActionNotAllowedError extends BusinessRuleError {
  /**
   * @param {string} action - Acción intentada
   * @param {string} reason - Razón por la que no está permitida
   */
  constructor(action, reason, options = {}) {
    super(`No es posible ${action}: ${reason}`, {
      code: 'ACTION_NOT_ALLOWED',
      rule: 'permission_check',
      context: { action, reason },
      ...options,
    });

    this.action = action;
    this.reason = reason;
  }

  getUserMessage() {
    return `🚫 ${this.message}`;
  }
}

/**
 * Error de cancelación tardía
 */
export class LateCancellationError extends BusinessRuleError {
  /**
   * @param {number} minHours - Horas mínimas de anticipación requeridas
   */
  constructor(minHours, options = {}) {
    super(`Las cancelaciones requieren ${minHours} horas de anticipación`, {
      code: 'LATE_CANCELLATION',
      rule: 'cancellation_policy',
      suggestions: [
        'Puedes reprogramar tu cita en lugar de cancelarla',
        'Contacta directamente para casos especiales',
      ],
      context: { minHours },
      ...options,
    });

    this.minHours = minHours;
  }

  getUserMessage() {
    return `⚠️ La cita ya no puede ser cancelada (mínimo ${this.minHours}h de anticipación).\n\n¿Te gustaría reprogramarla en su lugar?`;
  }
}

export default BusinessRuleError;
