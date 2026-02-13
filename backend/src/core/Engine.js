/**
 * ChatEngine - Motor principal del chat
 * 
 * Orquesta el flujo de procesamiento de mensajes usando Chain of Responsibility.
 * Cada handler tiene la oportunidad de procesar el mensaje.
 */

import { getEventEmitter, EVENTS } from './EventEmitter.js';
import logger from '../config/logger.js';

const log = logger.child('Engine');

export class ChatEngine {
  constructor() {
    this.handlers = [];
    this.eventEmitter = getEventEmitter();
  }
  
  /**
   * Agrega un handler al pipeline
   * @param {ActionHandler} handler - Handler a agregar
   * @returns {ChatEngine} - Para encadenar
   */
  use(handler) {
    this.handlers.push(handler);
    return this;
  }
  
  /**
   * Procesa un mensaje a través del pipeline de handlers
   * @param {Context} context - Contexto de la conversación
   * @returns {Promise<{handled: boolean, response: string}>}
   */
  async process(context) {
    this.eventEmitter.emit(EVENTS.MESSAGE_RECEIVED, {
      workspaceId: context.workspaceId,
      agentId: context.agentId,
      message: context.message,
    });
    
    try {
      // Recorrer handlers en orden
      for (const handler of this.handlers) {
        // Verificar si el handler puede manejar este contexto
        const canHandle = await handler.canHandle(context);
        
        if (canHandle) {
          log.debug(`Handler "${handler.constructor.name}" can handle`);
          
          // Ejecutar el handler
          const result = await handler.execute(context);
          
          // Si el handler marcó como manejado, terminar
          if (result.handled) {
            context.handled = true;
            context.response = result.response;
            
            // Formatear respuesta si el handler no lo hizo
            if (!result.formatted && handler.formatResponse) {
              context.response = await handler.formatResponse(context, result);
            }
            
            this.eventEmitter.emit(EVENTS.MESSAGE_PROCESSED, {
              workspaceId: context.workspaceId,
              handler: handler.constructor.name,
              duration: Date.now() - context.startTime,
            });
            
            return {
              handled: true,
              response: context.response,
              handler: handler.constructor.name,
            };
          }
        }
      }
      
      // Ningún handler pudo procesar el mensaje
      this.eventEmitter.emit(EVENTS.INTENT_UNKNOWN, {
        workspaceId: context.workspaceId,
        message: context.message,
      });
      
      return {
        handled: false,
        response: null,
      };
      
    } catch (error) {
      log.error('Error processing message', { error: error.message, stack: error.stack });
      
      this.eventEmitter.emit(EVENTS.MESSAGE_ERROR, {
        workspaceId: context.workspaceId,
        error: error.message,
      });
      
      throw error;
    }
  }
  
  /**
   * Obtiene estadísticas del engine
   */
  getStats() {
    return {
      handlersCount: this.handlers.length,
      handlers: this.handlers.map(h => h.constructor.name),
    };
  }
  
  /**
   * Alias para addHandler (compatibilidad con ChatService)
   */
  addHandler(handler) {
    return this.use(handler);
  }
}

// Alias para compatibilidad
export const Engine = ChatEngine;

/**
 * Crea y configura el engine con los handlers por defecto
 * @param {object} dependencies - Dependencias inyectadas
 * @returns {ChatEngine}
 */
export function createEngine(dependencies = {}) {
  const engine = new ChatEngine();
  
  // Los handlers se agregarán después de importarlos
  // Esto permite lazy loading y evita dependencias circulares
  
  return engine;
}

export default ChatEngine;
