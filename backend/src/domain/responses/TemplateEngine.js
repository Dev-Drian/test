/**
 * TemplateEngine - Motor de templates para el sistema
 * 
 * Procesa templates con variables, formateo y lógica condicional básica.
 */

export class TemplateEngine {
  constructor() {
    this.helpers = new Map();
    this._registerDefaultHelpers();
  }
  
  /**
   * Registra los helpers por defecto
   */
  _registerDefaultHelpers() {
    // Formateo de hora
    this.registerHelper('time', (value) => this.formatTo12Hour(value));
    
    // Formateo de fecha
    this.registerHelper('date', (value) => this.formatDate(value));
    
    // Formateo de moneda
    this.registerHelper('currency', (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num);
    });
    
    // Mayúsculas
    this.registerHelper('upper', (value) => String(value).toUpperCase());
    
    // Minúsculas
    this.registerHelper('lower', (value) => String(value).toLowerCase());
    
    // Capitalizar
    this.registerHelper('capitalize', (value) => {
      return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
    });
  }
  
  /**
   * Registra un helper personalizado
   * @param {string} name - Nombre del helper
   * @param {Function} fn - Función del helper
   */
  registerHelper(name, fn) {
    this.helpers.set(name, fn);
  }
  
  /**
   * Procesa un template
   * @param {string} template - Template con variables {{var}} o {{var:format}}
   * @param {object} context - Contexto con valores
   * @returns {string}
   */
  process(template, context = {}) {
    if (!template || typeof template !== 'string') return template || '';
    
    // Procesar variables con formato: {{variable:format}}
    return template.replace(/\{\{([^}:]+)(?::([^}]+))?\}\}/g, (match, key, format) => {
      const trimmedKey = key.trim();
      let value = this._getValue(trimmedKey, context);
      
      if (value === null || value === undefined) return '';
      
      // Aplicar formato si se especifica
      if (format) {
        const helper = this.helpers.get(format.toLowerCase());
        if (helper) {
          value = helper(value, context);
        }
      }
      
      return String(value);
    });
  }
  
  /**
   * Obtiene un valor del contexto, soportando paths anidados
   * @param {string} key - Clave (puede ser "object.property")
   * @param {object} context - Contexto
   * @returns {*}
   */
  _getValue(key, context) {
    const keys = key.split('.');
    let value = context;
    
    for (const k of keys) {
      if (value === null || value === undefined) break;
      value = value[k];
    }
    
    return value;
  }
  
  /**
   * Procesa un template con bloques condicionales
   * Sintaxis: {{#if condition}}...{{/if}}
   * @param {string} template 
   * @param {object} context 
   * @returns {string}
   */
  processWithConditions(template, context = {}) {
    if (!template) return '';
    
    // Procesar bloques {{#if field}}...{{/if}}
    let result = template.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, field, content) => {
      const value = context[field];
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        return content;
      }
      return '';
    });
    
    // Procesar bloques {{#each items}}...{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, field, itemTemplate) => {
      const items = context[field];
      if (!Array.isArray(items)) return '';
      
      return items.map((item, index) => {
        const itemContext = typeof item === 'object' ? { ...context, ...item, _index: index } : { ...context, _item: item, _index: index };
        return this.process(itemTemplate, itemContext);
      }).join('');
    });
    
    // Procesar variables normales
    return this.process(result, context);
  }
  
  /**
   * Formatea hora a 12h
   */
  formatTo12Hour(time24) {
    if (!time24 || typeof time24 !== 'string') return time24;
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return `${hours}:${minutes} ${ampm}`;
  }
  
  /**
   * Formatea fecha legible
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  }
}

// Singleton
let instance = null;

export function getTemplateEngine() {
  if (!instance) {
    instance = new TemplateEngine();
  }
  return instance;
}

export default TemplateEngine;
