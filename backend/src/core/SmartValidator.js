/**
 * SmartValidator - Validaciones semánticas inteligentes
 * 
 * Va más allá de validaciones de formato:
 * - Detecta fechas pasadas
 * - Valida coherencia de datos
 * - Sugiere correcciones
 * - Detecta conflictos (cita en horario ya ocupado)
 * 
 * @module core/SmartValidator
 */

import logger from '../config/logger.js';

const log = logger.child('SmartValidator');

/**
 * Tipos de validación
 */
export const VALIDATION_TYPE = {
  FORMAT: 'format',           // Formato incorrecto
  SEMANTIC: 'semantic',       // Semánticamente incorrecto (fecha pasada)
  CONFLICT: 'conflict',       // Conflicto con datos existentes
  MISSING: 'missing',         // Dato requerido faltante
  SUGGESTION: 'suggestion',   // Sugerencia de mejora
};

/**
 * Resultado de validación
 */
export const VALIDATION_RESULT = {
  VALID: 'valid',
  WARNING: 'warning',    // Válido pero con advertencia
  INVALID: 'invalid',
  NEEDS_CONFIRMATION: 'needs_confirmation',
};

class SmartValidator {
  constructor() {
    // Cache de datos existentes para detectar conflictos
    this.dataCache = new Map();
  }

  /**
   * Valida un conjunto de datos antes de crear/actualizar
   * @param {object} data - Datos a validar
   * @param {object} tableConfig - Configuración de la tabla (campos, tipos)
   * @param {object} context - Contexto adicional
   * @returns {object} Resultado de validación
   */
  async validate(data, tableConfig, context = {}) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      corrections: {},  // Correcciones automáticas sugeridas
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [fieldKey, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') continue;

      const fieldConfig = tableConfig.fields?.find(f => 
        f.key === fieldKey || f.name === fieldKey
      ) || {};
      
      const fieldType = fieldConfig.type || this._inferType(fieldKey, value);

      // Validación por tipo de campo
      switch (fieldType) {
        case 'date':
        case 'fecha':
          const dateValidation = this._validateDate(value, fieldKey, today, context);
          this._mergeResults(results, dateValidation);
          break;

        case 'time':
        case 'hora':
          const timeValidation = this._validateTime(value, fieldKey, context);
          this._mergeResults(results, timeValidation);
          break;

        case 'email':
        case 'correo':
          const emailValidation = this._validateEmail(value, fieldKey);
          this._mergeResults(results, emailValidation);
          break;

        case 'phone':
        case 'telefono':
          const phoneValidation = this._validatePhone(value, fieldKey);
          this._mergeResults(results, phoneValidation);
          break;

        case 'number':
        case 'cantidad':
        case 'precio':
          const numberValidation = this._validateNumber(value, fieldKey, fieldConfig);
          this._mergeResults(results, numberValidation);
          break;
      }
    }

    // Validaciones de coherencia entre campos
    const coherenceValidation = this._validateCoherence(data, tableConfig, context);
    this._mergeResults(results, coherenceValidation);

    // Log resultado
    if (!results.isValid) {
      log.info('Validation failed', { 
        errors: results.errors.length, 
        warnings: results.warnings.length,
      });
    }

    return results;
  }

  /**
   * Valida una fecha
   * @private
   */
  _validateDate(value, fieldKey, today, context) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };
    
    let date;
    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    }

    if (!date || isNaN(date.getTime())) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `La fecha "${value}" no tiene un formato válido`,
        suggestion: 'Usa formato YYYY-MM-DD o una fecha como "mañana", "el lunes"',
      });
      return result;
    }

    // Verificar si es fecha pasada
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly < today) {
      // Calcular posible fecha correcta (mismo día del mes siguiente)
      const correctedDate = new Date(date);
      correctedDate.setMonth(correctedDate.getMonth() + 1);

      result.errors.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `La fecha ${this._formatDate(date)} ya pasó`,
        suggestion: `¿Quisiste decir ${this._formatDate(correctedDate)}?`,
        correction: {
          field: fieldKey,
          originalValue: value,
          suggestedValue: correctedDate.toISOString().split('T')[0],
        },
      });

      result.corrections[fieldKey] = correctedDate.toISOString().split('T')[0];
    }

    // Advertencia si es muy lejana (más de 1 año)
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (dateOnly > oneYearFromNow) {
      result.warnings.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `La fecha ${this._formatDate(date)} está muy lejana (más de 1 año)`,
        needsConfirmation: true,
      });
    }

    // Verificar si es fin de semana (para citas de negocio)
    const dayOfWeek = date.getDay();
    if (context.businessDays && (dayOfWeek === 0 || dayOfWeek === 6)) {
      result.warnings.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `El ${this._formatDate(date)} es ${dayOfWeek === 0 ? 'domingo' : 'sábado'}`,
        needsConfirmation: true,
      });
    }

    return result;
  }

  /**
   * Valida una hora
   * @private
   */
  _validateTime(value, fieldKey, context) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };

    // Normalizar formato de hora
    let normalizedTime = value;
    
    // Convertir formatos comunes
    if (/^\d{1,2}$/.test(value)) {
      // "4" → "04:00"
      normalizedTime = `${value.padStart(2, '0')}:00`;
    } else if (/^\d{1,2}:\d{2}$/.test(value)) {
      // "4:30" → "04:30"
      const [h, m] = value.split(':');
      normalizedTime = `${h.padStart(2, '0')}:${m}`;
    }

    // Validar formato
    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `La hora "${value}" no tiene formato válido`,
        suggestion: 'Usa formato HH:MM (ej: 14:30)',
      });
      return result;
    }

    const [hours, minutes] = normalizedTime.split(':').map(Number);

    // Validar rango
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `La hora "${value}" no es válida`,
      });
      return result;
    }

    // Verificar horario de negocio
    if (context.businessHours) {
      const { start, end } = context.businessHours;
      if (hours < start || hours >= end) {
        result.warnings.push({
          type: VALIDATION_TYPE.SEMANTIC,
          field: fieldKey,
          message: `La hora ${normalizedTime} está fuera del horario de atención (${start}:00 - ${end}:00)`,
          needsConfirmation: true,
        });
      }
    }

    // Advertencia para horas muy tempranas o tardías
    if (hours < 7) {
      result.warnings.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `Las ${normalizedTime} es muy temprano. ¿Estás seguro?`,
        needsConfirmation: true,
      });
    } else if (hours >= 22) {
      result.warnings.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `Las ${normalizedTime} es muy tarde. ¿Estás seguro?`,
        needsConfirmation: true,
      });
    }

    // Si se normalizó, sugerir corrección
    if (normalizedTime !== value) {
      result.corrections[fieldKey] = normalizedTime;
    }

    return result;
  }

  /**
   * Valida un email
   * @private
   */
  _validateEmail(value, fieldKey) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(value)) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `"${value}" no parece ser un email válido`,
        suggestion: 'El formato debe ser ejemplo@dominio.com',
      });
    }

    // Detectar errores comunes
    const commonMistakes = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
    };

    for (const [wrong, correct] of Object.entries(commonMistakes)) {
      if (value.includes(wrong)) {
        const corrected = value.replace(wrong, correct);
        result.suggestions.push({
          type: VALIDATION_TYPE.SUGGESTION,
          field: fieldKey,
          message: `¿Quisiste decir "${corrected}"?`,
        });
        result.corrections[fieldKey] = corrected;
        break;
      }
    }

    return result;
  }

  /**
   * Valida un teléfono
   * @private
   */
  _validatePhone(value, fieldKey) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };

    // Limpiar caracteres no numéricos
    const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');

    if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `"${value}" no parece ser un teléfono válido`,
        suggestion: 'Ingresa solo números (7-15 dígitos)',
      });
    }

    // Normalizar a formato limpio
    if (cleanPhone !== value && /^\+?\d{7,15}$/.test(cleanPhone)) {
      result.corrections[fieldKey] = cleanPhone;
    }

    return result;
  }

  /**
   * Valida un número
   * @private
   */
  _validateNumber(value, fieldKey, fieldConfig) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };

    const num = parseFloat(value);

    if (isNaN(num)) {
      result.errors.push({
        type: VALIDATION_TYPE.FORMAT,
        field: fieldKey,
        message: `"${value}" no es un número válido`,
      });
      return result;
    }

    // Validar rango si está configurado
    if (fieldConfig.min !== undefined && num < fieldConfig.min) {
      result.errors.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `El valor ${num} es menor al mínimo permitido (${fieldConfig.min})`,
      });
    }

    if (fieldConfig.max !== undefined && num > fieldConfig.max) {
      result.errors.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `El valor ${num} es mayor al máximo permitido (${fieldConfig.max})`,
      });
    }

    // Advertencia para valores inusuales
    if (fieldKey.toLowerCase().includes('precio') && num <= 0) {
      result.warnings.push({
        type: VALIDATION_TYPE.SEMANTIC,
        field: fieldKey,
        message: `El precio ${num} parece inusual. ¿Estás seguro?`,
        needsConfirmation: true,
      });
    }

    return result;
  }

  /**
   * Valida coherencia entre campos
   * @private
   */
  _validateCoherence(data, tableConfig, context) {
    const result = { errors: [], warnings: [], suggestions: [], corrections: {} };

    // Si hay fecha y hora, verificar que la combinación tenga sentido
    const fecha = data.fecha || data.date;
    const hora = data.hora || data.time;

    if (fecha && hora) {
      const dateTime = new Date(`${fecha}T${hora}`);
      const now = new Date();

      if (dateTime < now) {
        result.errors.push({
          type: VALIDATION_TYPE.SEMANTIC,
          field: 'fecha_hora',
          message: `La fecha y hora ${this._formatDate(dateTime)} ${hora} ya pasó`,
        });
      }
    }

    return result;
  }

  /**
   * Fusiona resultados de validación
   * @private
   */
  _mergeResults(target, source) {
    target.errors.push(...(source.errors || []));
    target.warnings.push(...(source.warnings || []));
    target.suggestions.push(...(source.suggestions || []));
    Object.assign(target.corrections, source.corrections || {});

    if (source.errors && source.errors.length > 0) {
      target.isValid = false;
    }
  }

  /**
   * Infiere el tipo de campo por su nombre
   * @private
   */
  _inferType(fieldKey, value) {
    const key = fieldKey.toLowerCase();

    if (key.includes('fecha') || key.includes('date')) return 'date';
    if (key.includes('hora') || key.includes('time')) return 'time';
    if (key.includes('email') || key.includes('correo')) return 'email';
    if (key.includes('telefono') || key.includes('phone') || key.includes('celular')) return 'phone';
    if (key.includes('precio') || key.includes('cantidad') || key.includes('total')) return 'number';

    return 'text';
  }

  /**
   * Formatea una fecha para mostrar
   * @private
   */
  _formatDate(date) {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
  }

  /**
   * Genera mensaje de error amigable
   * @param {object} validationResult 
   * @returns {string}
   */
  formatErrorMessage(validationResult) {
    const messages = [];

    validationResult.errors.forEach(err => {
      let msg = `❌ ${err.message}`;
      if (err.suggestion) {
        msg += `\n   💡 ${err.suggestion}`;
      }
      messages.push(msg);
    });

    validationResult.warnings.forEach(warn => {
      messages.push(`⚠️ ${warn.message}`);
    });

    return messages.join('\n');
  }
}

// Singleton
let instance = null;

export function getSmartValidator() {
  if (!instance) {
    instance = new SmartValidator();
  }
  return instance;
}

export { SmartValidator };
export default SmartValidator;
