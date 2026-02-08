/**
 * EventEmitter - Sistema de eventos para el chat
 * 
 * Permite desacoplar acciones de sus efectos secundarios (notificaciones, logs, etc.)
 * Implementa el patrón Observer/Pub-Sub
 */

class ChatEventEmitter {
  constructor() {
    this.listeners = new Map();
    this.asyncListeners = new Map();
  }
  
  /**
   * Registra un listener sincrónico para un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} - Función para desuscribirse
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Retornar función para desuscribirse
    return () => this.off(event, callback);
  }
  
  /**
   * Registra un listener asincrónico para un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función async a ejecutar
   * @returns {Function} - Función para desuscribirse
   */
  onAsync(event, callback) {
    if (!this.asyncListeners.has(event)) {
      this.asyncListeners.set(event, []);
    }
    this.asyncListeners.get(event).push(callback);
    
    return () => this.offAsync(event, callback);
  }
  
  /**
   * Registra un listener que se ejecuta solo una vez
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }
  
  /**
   * Elimina un listener sincrónico
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a eliminar
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Elimina un listener asincrónico
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a eliminar
   */
  offAsync(event, callback) {
    const listeners = this.asyncListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Emite un evento de forma sincrónica
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a pasar a los listeners
   */
  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
    
    // También ejecutar listeners async sin esperar
    this.emitAsync(event, data).catch(err => {
      console.error(`Error in async listeners for "${event}":`, err);
    });
  }
  
  /**
   * Emite un evento y espera a todos los listeners asincrónicos
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a pasar a los listeners
   * @returns {Promise<void>}
   */
  async emitAsync(event, data) {
    const listeners = this.asyncListeners.get(event) || [];
    const promises = listeners.map(async callback => {
      try {
        await callback(data);
      } catch (error) {
        console.error(`Error in async event listener for "${event}":`, error);
      }
    });
    await Promise.all(promises);
  }
  
  /**
   * Elimina todos los listeners de un evento
   * @param {string} event - Nombre del evento
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
      this.asyncListeners.delete(event);
    } else {
      this.listeners.clear();
      this.asyncListeners.clear();
    }
  }
  
  /**
   * Obtiene la cantidad de listeners para un evento
   * @param {string} event - Nombre del evento
   * @returns {number}
   */
  listenerCount(event) {
    const sync = this.listeners.get(event)?.length || 0;
    const async = this.asyncListeners.get(event)?.length || 0;
    return sync + async;
  }
}

// Eventos disponibles en el sistema
export const EVENTS = {
  // Ciclo de vida del mensaje
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_PROCESSED: 'message:processed',
  MESSAGE_ERROR: 'message:error',
  
  // Detección de intención
  INTENT_DETECTED: 'intent:detected',
  INTENT_UNKNOWN: 'intent:unknown',
  
  // Acciones CRUD
  RECORD_CREATED: 'record:created',
  RECORD_UPDATED: 'record:updated',
  RECORD_DELETED: 'record:deleted',
  RECORD_QUERIED: 'record:queried',
  
  // Flujo de creación
  CREATE_STARTED: 'create:started',
  CREATE_FIELD_COLLECTED: 'create:field_collected',
  CREATE_COMPLETED: 'create:completed',
  CREATE_CANCELLED: 'create:cancelled',
  
  // Disponibilidad
  AVAILABILITY_CHECKED: 'availability:checked',
  
  // Relaciones
  RELATION_CREATED: 'relation:created',
  RELATION_PENDING: 'relation:pending',
  
  // Notificaciones
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_SENT: 'notification:sent',
  NOTIFICATION_FAILED: 'notification:failed',
  
  // Chat
  CHAT_CREATED: 'chat:created',
  CHAT_TITLE_GENERATED: 'chat:title_generated',
};

// Instancia singleton del EventEmitter
let instance = null;

export function getEventEmitter() {
  if (!instance) {
    instance = new ChatEventEmitter();
  }
  return instance;
}

// Alias para compatibilidad
export const EventEmitter = ChatEventEmitter;

export default ChatEventEmitter;
