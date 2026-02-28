/**
 * FieldValidator - Validación de campos en frontend
 * 
 * Espejo del validador del backend para validación instantánea
 * antes de enviar al servidor.
 */

export class FieldValidator {
  /**
   * Valida un valor contra la configuración del campo
   * @param {string} fieldKey - Nombre del campo
   * @param {*} value - Valor a validar
   * @param {object} fieldConfig - Configuración del campo
   * @returns {{ valid: boolean, error?: string }}
   */
  static validate(fieldKey, value, fieldConfig = {}) {
    const label = fieldConfig.label || fieldKey;
    const validation = fieldConfig.validation || {};
    const isEmptyValue = value === undefined || value === null || value === '';
    
    // 1. Validar campo requerido
    if (fieldConfig.required && isEmptyValue) {
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
    
    return { valid: true };
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
        return { valid: true };
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
        return { valid: true };
      }
      
      case 'date': {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return { valid: false, error: `${label} debe tener formato de fecha válido (YYYY-MM-DD)` };
        }
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
        return { valid: true };
      }
      
      case 'number':
      case 'currency': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `${label} debe ser un número válido` };
        }
        return { valid: true };
      }
      
      case 'integer': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: `${label} debe ser un número válido` };
        }
        if (!Number.isInteger(numValue)) {
          return { valid: false, error: `${label} debe ser un número entero (sin decimales)` };
        }
        return { valid: true };
      }
      
      case 'url': {
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, error: `${label} debe ser una URL válida (ej: https://ejemplo.com)` };
        }
      }
      
      case 'select': {
        const options = fieldConfig.options || [];
        if (options.length > 0 && !options.includes(value)) {
          return { 
            valid: false, 
            error: `${label} debe ser una de las opciones válidas` 
          };
        }
        return { valid: true };
      }
      
      default:
        return { valid: true };
    }
  }
  
  /**
   * Valida reglas numéricas
   */
  static validateNumeric(value, validation, label) {
    const numValue = Number(value);
    
    if (validation.allowNegative === false && numValue < 0) {
      return { valid: false, error: `${label} no puede ser negativo` };
    }
    
    if (validation.min !== undefined && numValue < validation.min) {
      return { valid: false, error: `${label} debe ser al menos ${validation.min}` };
    }
    
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
    
    if (validation.min !== undefined && strValue.length < validation.min) {
      return { 
        valid: false, 
        error: `${label} debe tener al menos ${validation.min} caracteres` 
      };
    }
    
    if (validation.max !== undefined && strValue.length > validation.max) {
      return { 
        valid: false, 
        error: `${label} no puede exceder ${validation.max} caracteres` 
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
    } catch {
      return { valid: true };
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
        } catch {
          // Ignore invalid regex
        }
        break;
    }
    
    return { valid: true };
  }
  
  /**
   * Valida todos los campos de un formulario
   * @param {object} data - Datos del formulario { campo: valor }
   * @param {array} headers - Configuración de campos (headers de la tabla)
   * @returns {{ valid: boolean, errors: object }}
   */
  static validateAll(data, headers) {
    const errors = {};
    
    for (const header of headers) {
      const value = data[header.key];
      const result = this.validate(header.key, value, header);
      
      if (!result.valid) {
        errors[header.key] = result.error;
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Obtiene campos requeridos faltantes
   */
  static getMissingRequired(data, headers) {
    return headers
      .filter(h => h.required)
      .filter(h => {
        const value = data[h.key];
        return value === undefined || value === null || value === '';
      })
      .map(h => h.label || h.key);
  }
}

export default FieldValidator;
