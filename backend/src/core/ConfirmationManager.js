/**
 * ConfirmationManager - Estado de confirmación pre-guardado
 * 
 * Maneja:
 * - Preview de datos antes de guardar
 * - Edición de campos individuales sin perder el resto
 * - Confirmación explícita del usuario
 * - Timeout de confirmación
 * 
 * @module core/ConfirmationManager
 */

import logger from '../config/logger.js';

const log = logger.child('ConfirmationManager');

/**
 * Estados de confirmación
 */
export const CONFIRM_STATUS = {
  PENDING: 'pending_confirmation',     // Esperando confirmación
  EDITING: 'editing',                  // Usuario editando un campo
  CONFIRMED: 'confirmed',              // Usuario confirmó
  CANCELLED: 'cancelled',              // Usuario canceló
  EXPIRED: 'expired',                  // Timeout expirado
};

class ConfirmationManager {
  constructor() {
    // Cache por chatId
    this.states = new Map();
    
    // Timeout de confirmación (5 minutos)
    this.CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000;
  }

  /**
   * Crea un estado de confirmación pendiente
   * @param {string} chatId 
   * @param {object} options - Opciones de confirmación
   * @returns {object} Estado de confirmación
   */
  createPending(chatId, options) {
    const state = {
      id: `confirm_${Date.now()}`,
      status: CONFIRM_STATUS.PENDING,
      
      // Datos a confirmar
      action: options.action,         // 'create', 'update', 'cancel'
      tableName: options.tableName,
      tableId: options.tableId,
      data: { ...options.data },      // Copia de los datos
      
      // Para edición
      editingField: null,
      originalData: { ...options.data }, // Datos originales (para rollback de ediciones)
      
      // Metadata
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.CONFIRMATION_TIMEOUT_MS).toISOString(),
      
      // Configuración
      requireExplicitConfirm: options.requireExplicitConfirm !== false,
      allowEdits: options.allowEdits !== false,
    };

    this.states.set(chatId, state);
    log.info('Confirmation state created', { chatId, action: options.action, tableName: options.tableName });

    return state;
  }

  /**
   * Obtiene el estado de confirmación actual
   * @param {string} chatId 
   * @returns {object|null}
   */
  get(chatId) {
    const state = this.states.get(chatId);
    
    if (!state) return null;

    // Verificar si expiró
    if (new Date() > new Date(state.expiresAt)) {
      state.status = CONFIRM_STATUS.EXPIRED;
      log.info('Confirmation expired', { chatId });
    }

    return state;
  }

  /**
   * Verifica si hay confirmación pendiente
   * @param {string} chatId 
   * @returns {boolean}
   */
  hasPending(chatId) {
    const state = this.get(chatId);
    return state && state.status === CONFIRM_STATUS.PENDING;
  }

  /**
   * Procesa respuesta del usuario a la confirmación
   * @param {string} chatId 
   * @param {string} message - Mensaje del usuario
   * @returns {object} Resultado del procesamiento
   */
  processResponse(chatId, message) {
    const state = this.get(chatId);
    
    if (!state || state.status === CONFIRM_STATUS.EXPIRED) {
      return { action: 'expired', message: 'La confirmación ha expirado. ¿Deseas comenzar de nuevo?' };
    }

    const normalized = message.toLowerCase().trim();

    // Detectar confirmación
    if (this._isConfirmation(normalized)) {
      state.status = CONFIRM_STATUS.CONFIRMED;
      log.info('User confirmed', { chatId });
      return { action: 'confirmed', data: state.data };
    }

    // Detectar cancelación
    if (this._isCancellation(normalized)) {
      state.status = CONFIRM_STATUS.CANCELLED;
      this.states.delete(chatId);
      log.info('User cancelled confirmation', { chatId });
      return { action: 'cancelled' };
    }

    // Detectar solicitud de edición
    const editRequest = this._parseEditRequest(normalized, state);
    if (editRequest) {
      return this._handleEditRequest(chatId, state, editRequest);
    }

    // Si está en modo edición, procesar el nuevo valor
    if (state.status === CONFIRM_STATUS.EDITING && state.editingField) {
      return this._processEdit(chatId, state, message);
    }

    // No entendió la respuesta
    return { 
      action: 'unknown', 
      message: '¿Confirmas los datos? Responde "sí" para confirmar, "no" para cancelar, o indica qué campo quieres cambiar.',
    };
  }

  /**
   * Detecta si es una confirmación
   * @private
   */
  _isConfirmation(message) {
    const patterns = [
      /^(s[ií]|yes|ok|okay|dale|va|confirmo?|correcto|est[aá]\s*bien|perfecto)$/,
      /^(s[ií]|yes),?\s*(por\s*favor|pls)?$/,
      /^confirm(ar|o)?$/,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Detecta si es una cancelación
   * @private
   */
  _isCancellation(message) {
    const patterns = [
      /^(no|cancel(ar)?|anular|salir|exit|dejalo|olvidalo)$/,
      /^no,?\s*(gracias)?$/,
      /^ya\s*no(\s*quiero)?$/,
    ];
    return patterns.some(p => p.test(message));
  }

  /**
   * Parsea solicitud de edición
   * @private
   */
  _parseEditRequest(message, state) {
    // "cambiar la hora", "modificar el nombre", "la fecha está mal"
    const changePatterns = [
      /^cambiar?\s*(el|la)?\s*(.+)$/i,
      /^modificar?\s*(el|la)?\s*(.+)$/i,
      /^(el|la)\s*(.+)\s*(est[aá]\s*mal|no\s*es)$/i,
      /^corregir?\s*(el|la)?\s*(.+)$/i,
    ];

    for (const pattern of changePatterns) {
      const match = message.match(pattern);
      if (match) {
        const fieldMention = (match[2] || match[1]).trim().toLowerCase();
        const field = this._findFieldByMention(fieldMention, state.data);
        if (field) {
          return { field, originalMention: fieldMention };
        }
      }
    }

    // Detectar número de campo (ej: "1", "el 2")
    const numberMatch = message.match(/^(el\s*)?(\d)$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[2]) - 1;
      const fields = Object.keys(state.data);
      if (index >= 0 && index < fields.length) {
        return { field: fields[index], originalMention: numberMatch[2] };
      }
    }

    return null;
  }

  /**
   * Encuentra el campo por mención aproximada
   * @private
   */
  _findFieldByMention(mention, data) {
    const fields = Object.keys(data);
    
    // Búsqueda exacta
    if (data[mention] !== undefined) return mention;
    
    // Búsqueda por inclusión
    const found = fields.find(f => 
      f.toLowerCase().includes(mention) || 
      mention.includes(f.toLowerCase())
    );
    
    return found || null;
  }

  /**
   * Inicia edición de un campo
   * @private
   */
  _handleEditRequest(chatId, state, editRequest) {
    state.status = CONFIRM_STATUS.EDITING;
    state.editingField = editRequest.field;
    
    log.debug('Edit mode entered', { chatId, field: editRequest.field });
    
    return {
      action: 'editing',
      field: editRequest.field,
      currentValue: state.data[editRequest.field],
      message: `¿Cuál es el nuevo valor para ${editRequest.field}? (actual: ${state.data[editRequest.field]})`,
    };
  }

  /**
   * Procesa el nuevo valor en modo edición
   * @private
   */
  _processEdit(chatId, state, newValue) {
    const field = state.editingField;
    const oldValue = state.data[field];
    
    state.data[field] = newValue;
    state.status = CONFIRM_STATUS.PENDING;
    state.editingField = null;
    
    log.info('Field edited', { chatId, field, oldValue, newValue });
    
    return {
      action: 'edited',
      field,
      oldValue,
      newValue,
      data: state.data,
      message: `✅ ${field} cambiado de "${oldValue}" a "${newValue}"\n\n¿Confirmas ahora?`,
    };
  }

  /**
   * Genera preview de los datos para mostrar al usuario
   * @param {object} state 
   * @returns {string}
   */
  generatePreview(state) {
    const lines = [`📋 **Resumen de ${state.tableName}:**\n`];
    
    let index = 1;
    for (const [key, value] of Object.entries(state.data)) {
      const displayValue = this._formatValue(value);
      lines.push(`${index}. **${this._formatFieldName(key)}:** ${displayValue}`);
      index++;
    }
    
    lines.push('\n---');
    lines.push('✅ **Sí** para confirmar | ❌ **No** para cancelar');
    lines.push('📝 O indica el número/nombre del campo que quieres cambiar');
    
    return lines.join('\n');
  }

  /**
   * Formatea nombre de campo para mostrar
   * @private
   */
  _formatFieldName(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Formatea valor para mostrar
   * @private
   */
  _formatValue(value) {
    if (value === null || value === undefined) return '(vacío)';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return value.toLocaleDateString('es');
    return String(value);
  }

  /**
   * Fuerza confirmación sin respuesta del usuario
   * @param {string} chatId 
   * @returns {object|null} Datos confirmados o null
   */
  forceConfirm(chatId) {
    const state = this.get(chatId);
    if (state && state.status === CONFIRM_STATUS.PENDING) {
      state.status = CONFIRM_STATUS.CONFIRMED;
      return state.data;
    }
    return null;
  }

  /**
   * Limpia el estado de confirmación
   * @param {string} chatId 
   */
  clear(chatId) {
    this.states.delete(chatId);
  }

  /**
   * Serializa para persistir
   * @param {string} chatId 
   * @returns {object|null}
   */
  serialize(chatId) {
    return this.states.get(chatId) || null;
  }

  /**
   * Restaura desde datos persistidos
   * @param {string} chatId 
   * @param {object} data 
   */
  restore(chatId, data) {
    if (data) {
      this.states.set(chatId, data);
    }
  }
}

// Singleton
let instance = null;

export function getConfirmationManager() {
  if (!instance) {
    instance = new ConfirmationManager();
  }
  return instance;
}

export { ConfirmationManager };
export default ConfirmationManager;
