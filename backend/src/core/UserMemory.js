/**
 * UserMemory - Memoria persistente del usuario
 * 
 * Almacena:
 * - Perfil del usuario (nombre, preferencias detectadas)
 * - Historial de acciones recientes
 * - Contexto de conversación enriquecido
 * - Referencias para anáforas ("otra igual", "el mismo")
 * 
 * @module core/UserMemory
 */

import logger from '../config/logger.js';

const log = logger.child('UserMemory');

/**
 * Estructura de memoria del usuario
 */
class UserMemory {
  constructor() {
    // Cache en memoria por chatId (se persiste en chat.data.userMemory)
    this.cache = new Map();
  }

  /**
   * Obtiene o crea la memoria del usuario para un chat
   * @param {string} chatId 
   * @param {object} existingData - Datos existentes del chat
   * @returns {object} Memoria del usuario
   */
  getOrCreate(chatId, existingData = null) {
    if (this.cache.has(chatId)) {
      return this.cache.get(chatId);
    }

    const memory = existingData?.userMemory || this._createEmpty();
    this.cache.set(chatId, memory);
    return memory;
  }

  /**
   * Crea estructura de memoria vacía
   * @private
   */
  _createEmpty() {
    return {
      // Perfil del usuario
      profile: {
        name: null,           // Nombre detectado
        phone: null,          // Teléfono detectado
        email: null,          // Email detectado
        preferences: {},      // Preferencias detectadas (ej: horario preferido)
        lastSeen: null,       // Última interacción
      },
      
      // Historial de acciones (últimas 10)
      actionHistory: [],
      
      // Última acción exitosa (para "otra igual")
      lastSuccessfulAction: null,
      
      // Datos extraídos de la conversación
      extractedData: {},
      
      // Contexto para referencias anafóricas
      recentEntities: {
        // ej: { cliente: "Juan Pérez", servicio: "Corte de pelo" }
      },
      
      // Contador de interacciones
      interactionCount: 0,
      
      // Timestamp de creación
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Actualiza el perfil del usuario con datos extraídos
   * @param {string} chatId 
   * @param {object} profileData - Datos del perfil a actualizar
   */
  updateProfile(chatId, profileData) {
    const memory = this.cache.get(chatId);
    if (!memory) return;

    // Solo actualizar si hay valores no nulos
    Object.entries(profileData).forEach(([key, value]) => {
      if (value && !memory.profile[key]) {
        memory.profile[key] = value;
        log.debug('Profile updated', { chatId, field: key, value });
      }
    });

    memory.profile.lastSeen = new Date().toISOString();
  }

  /**
   * Registra una acción completada
   * @param {string} chatId 
   * @param {object} action - Acción realizada
   */
  recordAction(chatId, action) {
    const memory = this.cache.get(chatId);
    if (!memory) return;

    const actionRecord = {
      type: action.type,          // 'create', 'query', 'update', 'cancel'
      tableName: action.tableName,
      data: action.data,          // Datos de la acción
      result: action.result,      // Resultado (éxito/error)
      timestamp: new Date().toISOString(),
      recordId: action.recordId,  // ID del registro afectado (si aplica)
    };

    // Mantener solo las últimas 10 acciones
    memory.actionHistory.unshift(actionRecord);
    if (memory.actionHistory.length > 10) {
      memory.actionHistory.pop();
    }

    // Si fue exitosa, guardarla como última acción exitosa
    if (action.result === 'success') {
      memory.lastSuccessfulAction = actionRecord;
    }

    memory.interactionCount++;
    log.debug('Action recorded', { chatId, type: action.type });
  }

  /**
   * Guarda entidades mencionadas para referencias futuras
   * @param {string} chatId 
   * @param {object} entities - Entidades extraídas
   */
  saveRecentEntities(chatId, entities) {
    const memory = this.cache.get(chatId);
    if (!memory) return;

    // Fusionar con entidades existentes
    memory.recentEntities = {
      ...memory.recentEntities,
      ...entities,
    };

    // Limpiar valores nulos
    Object.keys(memory.recentEntities).forEach(key => {
      if (!memory.recentEntities[key]) {
        delete memory.recentEntities[key];
      }
    });

    log.debug('Entities saved', { chatId, entities: Object.keys(entities) });
  }

  /**
   * Obtiene datos para pre-llenar un formulario (desde perfil + entidades recientes)
   * @param {string} chatId 
   * @param {string[]} fieldNames - Nombres de campos a buscar
   * @returns {object} Datos encontrados
   */
  getPrefilledData(chatId, fieldNames) {
    const memory = this.cache.get(chatId);
    if (!memory) return {};

    const prefilled = {};
    
    fieldNames.forEach(field => {
      const normalizedField = field.toLowerCase();
      
      // Buscar en perfil
      if (normalizedField.includes('nombre') || normalizedField.includes('cliente')) {
        if (memory.profile.name) prefilled[field] = memory.profile.name;
      }
      if (normalizedField.includes('telefono') || normalizedField.includes('phone')) {
        if (memory.profile.phone) prefilled[field] = memory.profile.phone;
      }
      if (normalizedField.includes('email') || normalizedField.includes('correo')) {
        if (memory.profile.email) prefilled[field] = memory.profile.email;
      }
      
      // Buscar en entidades recientes
      if (memory.recentEntities[field]) {
        prefilled[field] = memory.recentEntities[field];
      }
      if (memory.recentEntities[normalizedField]) {
        prefilled[field] = memory.recentEntities[normalizedField];
      }
    });

    if (Object.keys(prefilled).length > 0) {
      log.debug('Prefilled data found', { chatId, fields: Object.keys(prefilled) });
    }

    return prefilled;
  }

  /**
   * Detecta si el mensaje es una referencia anafórica
   * @param {string} message 
   * @returns {object|null} Datos de la referencia o null
   */
  detectAnaphora(chatId, message) {
    const memory = this.cache.get(chatId);
    if (!memory) return null;

    const normalized = message.toLowerCase().trim();

    // "otra igual", "lo mismo", "repite"
    if (/^(otra?\s*(igual|vez)|lo\s*mismo|repite|rep[eé]telo|igual)$/i.test(normalized)) {
      if (memory.lastSuccessfulAction) {
        log.info('Anaphora detected: repeat last action', { chatId });
        return {
          type: 'repeat_action',
          action: memory.lastSuccessfulAction,
        };
      }
    }

    // "el mismo cliente", "la misma hora"
    const samePattern = /^(el|la)\s*mism[oa]\s*(\w+)$/i;
    const match = normalized.match(samePattern);
    if (match && match[2]) {
      const entityType = match[2];
      const value = memory.recentEntities[entityType];
      if (value) {
        log.info('Anaphora detected: same entity', { chatId, entityType, value });
        return {
          type: 'same_entity',
          entityType,
          value,
        };
      }
    }

    return null;
  }

  /**
   * Obtiene la última acción para posible rollback
   * @param {string} chatId 
   * @returns {object|null}
   */
  getLastAction(chatId) {
    const memory = this.cache.get(chatId);
    return memory?.actionHistory?.[0] || null;
  }

  /**
   * Serializa la memoria para persistir en el chat
   * @param {string} chatId 
   * @returns {object}
   */
  serialize(chatId) {
    return this.cache.get(chatId) || null;
  }

  /**
   * Limpia la memoria de un chat
   * @param {string} chatId 
   */
  clear(chatId) {
    this.cache.delete(chatId);
  }
}

// Singleton
let instance = null;

export function getUserMemory() {
  if (!instance) {
    instance = new UserMemory();
  }
  return instance;
}

export { UserMemory };
export default UserMemory;
