/**
 * ChatServiceFactory - Instancias centralizadas de ChatService
 * 
 * Evita crear múltiples instancias con event listeners duplicados.
 * Cada workspace tiene una única instancia compartida entre todos los controllers.
 */

import { ChatService } from './ChatService.js';
import { EVENTS } from '../core/EventEmitter.js';
import { getSocketService } from '../realtime/SocketService.js';
import { executeFlowsForTrigger } from './FlowExecutor.js';
import logger from '../config/logger.js';

const log = logger.child('ChatServiceFactory');

// Cache global de servicios por workspace
const serviceCache = new Map();

/**
 * Configura los event listeners estándar para un ChatService
 * @param {ChatService} service 
 */
function setupEventListeners(service) {
  service.on(EVENTS.RECORD_CREATED, async ({ workspaceId, tableId, record }) => {
    if (workspaceId) {
      getSocketService().emitRecordCreated(workspaceId, tableId, record);
    }
    if (workspaceId && tableId && record) {
      await executeFlowsForTrigger(workspaceId, 'create', tableId, record).catch(err => {
        log.warn('Error executing create flows', { error: err.message });
      });
    }
  });
  
  service.on(EVENTS.RECORD_UPDATED, async ({ workspaceId, tableId, record }) => {
    if (workspaceId) {
      getSocketService().emitRecordUpdated(workspaceId, tableId, record);
    }
    if (workspaceId && tableId && record) {
      await executeFlowsForTrigger(workspaceId, 'update', tableId, record).catch(err => {
        log.warn('Error executing update flows', { error: err.message });
      });
    }
  });
}

/**
 * Obtiene o crea la instancia única del ChatService para un workspace
 * @param {string} workspaceId 
 * @returns {ChatService}
 */
export function getChatService(workspaceId) {
  if (serviceCache.has(workspaceId)) {
    return serviceCache.get(workspaceId);
  }
  
  const service = new ChatService();
  setupEventListeners(service);
  serviceCache.set(workspaceId, service);
  
  log.debug('ChatService created', { workspaceId });
  return service;
}

/**
 * Limpia el service cache (útil para tests)
 */
export function clearChatServiceCache() {
  serviceCache.clear();
}

/**
 * Retorna el número de instancias en cache
 * @returns {number}
 */
export function getChatServiceCacheSize() {
  return serviceCache.size;
}
