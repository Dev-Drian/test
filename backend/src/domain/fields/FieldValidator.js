/**
 * FieldValidator - Validación robusta de campos
 * 
 * Maneja todas las validaciones configurables:
 * - Campos requeridos
 * - Validaciones por tipo (email, phone, date, etc.)
 * - Validaciones numéricas (min, max, positivo, negativo)
 * - Validaciones de texto (longitud, patrón)
 * - Reglas personalizadas
 */

export class FieldValidator {
  /**
   * Valida un valor contra la configuración del campo
   * @param {string} fieldKey - Nombre del campo
   * @param {*} value - Valor a validar
   * @param {object} fieldConfig - Configuración del campo
   * @returns {{ valid: boolean, error?: string, normalizedValue?: any }}
   */
  static validate(fieldKey, value, fieldConfig = {}) {
    const label = fieldConfig.label || fieldKey;
    const validation = fieldConfig.validation || {};
    const isEmptyValue = value === undefined || value === null || value === '';
    
    // 1. Validar campo requerido (saltar si _skipRequired)
    if (fieldConfig.required && isEmptyValue && !fieldConfig._skipRequired) {
      return {
        valid: false,
        error: `${label} es obligatorio`
      };
    }
    
    // Si está vacío y no es requerido, es válido
    if (isEmptyValue) {
      return { valid: true };
    }
    
    // 2. Validar según tipo de campo
    const typeValidation = this.validateByType(value, fieldConfig, label);
    if (!typeValidation.valid) {
      return typeValidation;
    }
    
    // 3. Validar reglas numéricas
    if (['number', 'integer', 'currency'].includes(fieldConfig.type)) {
      const numValidation = this.validateNumeric(value, validation, label);
      if (!numValidation.valid) {
        return numValidation;
      }
    }
    
    // 4. Validar reglas de texto
    if (['text', 'textarea', 'url'].includes(fieldConfig.type) || !fieldConfig.type) {
      const textValidation = this.validateText(value, validation, label);
      if (!textValidation.valid) {
        return textValidation;
      }
    }
    
    // 5. Validar patrón regex personalizado
    if (validation.pattern) {
      const patternValidation = this.validatePattern(value, validation, label);
      if (!patternValidation.valid) {
        return patternValidation;
      }
    }
    
    // 6. Validar reglas personalizadas
    if (validation.customRules?.length > 0) {
      const customValidation = this.validateCustomRules(value, validation.customRules, label);
      if (!customValidation.valid) {
        return customValidation;
      }
    }
    
    return { 
      valid: true, 
      normalizedValue: typeValidation.normalizedValue || value 
    };
  }
  
  /**
   * Valida según el tipo de campo
   */
  static validateByType(value, fieldConfig, label) {
    const type = fieldConfig.type || 'text';
    const validation = fieldConfig.validation || {};
    
    switch (type) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return { valid: false, error: `${label} debe ser un email válido (ej: usuario@dominio.com)` };
        }
        return { valid: true, normalizedValue: String(value).toLowerCase().trim() };
      }
      
      case 'phone':
      case 'telefono': {
        const digits = String(value).replace(/\D/g, '');
        const requiredDigits = validation.digits || 10;
        if (digits.length !== requiredDigits) {
          return { 
            valid: false, 
            error: `${label} debe tener exactamente ${requiredDigits} dígitos (tiene ${digits.length})` 
          };
        }
        return { valid: true, normalizedValue: digits };
      }
      
      case 'date': {
        // Acepta YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return { valid: false, error: `${label} debe tener formato de fecha válido (YYYY-MM-DD)` };
        }
        // Verificar que sea una fecha real
        const [y, m, d] = value.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
          return { valid: false, error: `${label} no es una fecha válida` };
        }
        return { valid: true };
      }
      
      case 'time': {
        const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(value)) {
          return { valid: false, error: `${label} debe tener formato de hora válido (HH:MM)` };
        }
        // Normalizar a formato 24h con 2 dígitos
        const [h, m] = value.split(':');
        return { valid: true, normalizedValue: `${h.padStart(2, '0')}:${m}` };
      }
      
      case 'number':
      case 'currency': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `${label} debe ser un número válido` };
        }
        return { valid: true, normalizedValue: numValue };
      }
      
      case 'integer': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `${label} debe ser un número válido` };
        }
        if (!Number.isInteger(numValue)) {
          return { valid: false, error: `${label} debe ser un número entero (sin decimales)` };
        }
        return { valid: true, normalizedValue: numValue };
      }
      
      case 'url': {
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, error: `${label} debe ser una URL válida (ej: https://ejemplo.com)` };
        }
      }
      
      case 'boolean': {
        const boolValue = value === true || value === 'true' || value === '1' || value === 1;
        return { valid: true, normalizedValue: boolValue };
      }
      
      case 'select': {
        const options = fieldConfig.options || [];
        if (options.length > 0 && !options.includes(value)) {
          return { 
            valid: false, 
            error: `${label} debe ser una de las opciones válidas: ${options.join(', ')}` 
          };
        }
        return { valid: true };
      }
      
      default:
        return { valid: true, normalizedValue: String(value).trim() };
    }
  }
  
  /**
   * Valida reglas numéricas
   */
  static validateNumeric(value, validation, label) {
    const numValue = Number(value);
    
    // Validar allowNegative
    if (validation.allowNegative === false && numValue < 0) {
      return { valid: false, error: `${label} no puede ser negativo` };
    }
    
    // Validar mínimo
    if (validation.min !== undefined && numValue < validation.min) {
      return { valid: false, error: `${label} debe ser al menos ${validation.min}` };
    }
    
    // Validar máximo
    if (validation.max !== undefined && numValue > validation.max) {
      return { valid: false, error: `${label} no puede ser mayor a ${validation.max}` };
    }
    
    return { valid: true };
  }
  
  /**
   * Valida reglas de texto
   */
  static validateText(value, validation, label) {
    const strValue = String(value);
    
    // Validar longitud mínima
    if (validation.min !== undefined && strValue.length < validation.min) {
      return { 
        valid: false, 
        error: `${label} debe tener al menos ${validation.min} caracteres (tiene ${strValue.length})` 
      };
    }
    
    // Validar longitud máxima
    if (validation.max !== undefined && strValue.length > validation.max) {
      return { 
        valid: false, 
        error: `${label} no puede exceder ${validation.max} caracteres (tiene ${strValue.length})` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Valida patrón regex
   */
  static validatePattern(value, validation, label) {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(value))) {
        return { 
          valid: false, 
          error: validation.patternMessage || `${label} tiene un formato inválido` 
        };
      }
      return { valid: true };
    } catch (e) {
      console.error('[FieldValidator] Invalid regex pattern:', validation.pattern, e);
      return { valid: true }; // No fallar por regex mal configurado
    }
  }
  
  /**
   * Valida reglas personalizadas
   */
  static validateCustomRules(value, customRules, label) {
    for (const rule of customRules) {
      const result = this.applyCustomRule(value, rule, label);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }
  
  /**
   * Aplica una regla personalizada
   */
  static applyCustomRule(value, rule, label) {
    const strValue = String(value);
    const numValue = Number(value);
    const defaultMessage = (msg) => rule.message || msg;
    
    switch (rule.rule) {
      case 'notEmpty':
        if (!strValue.trim()) {
          return { valid: false, error: defaultMessage(`${label} no puede estar vacío`) };
        }
        break;
        
      case 'isPositive':
        if (numValue <= 0) {
          return { valid: false, error: defaultMessage(`${label} debe ser un número positivo`) };
        }
        break;
        
      case 'isNegative':
        if (numValue >= 0) {
          return { valid: false, error: defaultMessage(`${label} debe ser un número negativo`) };
        }
        break;
        
      case 'isInteger':
        if (!Number.isInteger(numValue)) {
          return { valid: false, error: defaultMessage(`${label} debe ser un número entero`) };
        }
        break;
        
      case 'isDecimal':
        if (Number.isInteger(numValue)) {
          return { valid: false, error: defaultMessage(`${label} debe tener decimales`) };
        }
        break;
        
      case 'minLength':
        if (strValue.length < rule.value) {
          return { valid: false, error: defaultMessage(`${label} debe tener al menos ${rule.value} caracteres`) };
        }
        break;
        
      case 'maxLength':
        if (strValue.length > rule.value) {
          return { valid: false, error: defaultMessage(`${label} no puede exceder ${rule.value} caracteres`) };
        }
        break;
        
      case 'exactLength':
        if (strValue.length !== rule.value) {
          return { valid: false, error: defaultMessage(`${label} debe tener exactamente ${rule.value} caracteres`) };
        }
        break;
        
      case 'contains':
        if (!strValue.toLowerCase().includes(String(rule.value).toLowerCase())) {
          return { valid: false, error: defaultMessage(`${label} debe contener "${rule.value}"`) };
        }
        break;
        
      case 'notContains':
        if (strValue.toLowerCase().includes(String(rule.value).toLowerCase())) {
          return { valid: false, error: defaultMessage(`${label} no puede contener "${rule.value}"`) };
        }
        break;
        
      case 'startsWith':
        if (!strValue.startsWith(String(rule.value))) {
          return { valid: false, error: defaultMessage(`${label} debe comenzar con "${rule.value}"`) };
        }
        break;
        
      case 'endsWith':
        if (!strValue.endsWith(String(rule.value))) {
          return { valid: false, error: defaultMessage(`${label} debe terminar con "${rule.value}"`) };
        }
        break;
        
      case 'matches':
        try {
          const regex = new RegExp(rule.value);
          if (!regex.test(strValue)) {
            return { valid: false, error: defaultMessage(`${label} no cumple con el formato requerido`) };
          }
        } catch (e) {
          console.error('[FieldValidator] Invalid custom regex:', rule.value);
        }
        break;
    }
    
    return { valid: true };
  }
  
  /**
   * Valida múltiples campos a la vez
   * @param {object} data - Datos a validar { campo: valor }
   * @param {array} fieldsConfig - Configuración de campos
   * @param {object} options - { isPartial: false }
   * @returns {{ valid: boolean, errors: array }}
   */
  static validateAll(data, fieldsConfig, options = {}) {
    const { isPartial = false } = options;
    const errors = [];
    const configMap = new Map(fieldsConfig.map(fc => [fc.key, fc]));
    const checkedRequired = new Set(); // Evitar duplicados de required
    
    // Validar campos requeridos (solo si no es actualización parcial)
    if (!isPartial) {
      for (const fc of fieldsConfig) {
        if (fc.required && !fc.hiddenFromChat) {
          const value = data[fc.key];
          if (value === undefined || value === null || value === '') {
            errors.push({
              field: fc.key,
              type: 'required',
              message: `${fc.label || fc.key} es obligatorio`
            });
            checkedRequired.add(fc.key); // Marcar como ya validado
          }
        }
      }
    }
    
    // Validar cada campo presente
    for (const [fieldKey, value] of Object.entries(data)) {
      // Saltar campos vacíos que ya se validaron como requeridos
      if (checkedRequired.has(fieldKey)) {
        continue;
      }
      
      // Saltar campos vacíos en actualizaciones parciales
      if (isPartial && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      const config = configMap.get(fieldKey);
      if (!config) continue;
      
      // Pasar skipRequired para evitar doble validación
      const result = this.validate(fieldKey, value, { ...config, _skipRequired: true });
      if (!result.valid) {
        errors.push({
          field: fieldKey,
          type: 'validation',
          message: result.error
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Obtiene campos faltantes de los requeridos
   */
  static getMissingRequired(data, fieldsConfig) {
    return fieldsConfig
      .filter(fc => fc.required && !fc.hiddenFromChat)
      .filter(fc => {
        const value = data[fc.key];
        return value === undefined || value === null || value === '';
      })
      .map(fc => ({
        key: fc.key,
        label: fc.label || fc.key
      }));
  }
}

export default FieldValidator;
