/**
 * ActionHistory - Historial de acciones para Rollback/Undo
 * 
 * Permite:
 * - Deshacer la última acción ("me equivoqué", "deshace eso")
 * - Ver historial de acciones recientes
 * - Restaurar estado anterior
 * 
 * @module core/ActionHistory
 */

import logger from '../config/logger.js';

const log = logger.child('ActionHistory');

/**
 * Tipos de acciones reversibles
 */
export const ACTION_TYPE = {
  CREATE: 'create',    // Crear registro → puede eliminarse
  UPDATE: 'update',    // Actualizar → puede restaurarse valor anterior
  DELETE: 'delete',    // Eliminar → puede restaurarse
  CANCEL: 'cancel',    // Cancelar → puede reactivarse
};

class ActionHistory {
  constructor() {
    // Historial por workspace (no por chat, para que persista)
    this.history = new Map();
    
    // Máximo de acciones a mantener por workspace
    this.MAX_ACTIONS = 50;
  }

  /**
   * Registra una acción reversible
   * @param {string} workspaceId 
   * @param {object} action - Detalles de la acción
   * @returns {string} ID de la acción
   */
  record(workspaceId, action) {
    const history = this.history.get(workspaceId) || [];
    
    const actionRecord = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: action.type,
      tableName: action.tableName,
      tableId: action.tableId,
      recordId: action.recordId,
      
      // Datos para rollback
      previousData: action.previousData || null,  // Estado anterior (para update)
      newData: action.newData || null,            // Nuevo estado (para create/update)
      
      // Metadata
      chatId: action.chatId,
      userId: action.userId,
      timestamp: new Date().toISOString(),
      
      // Estado de rollback
      canUndo: true,
      undoneAt: null,
    };

    history.unshift(actionRecord);
    
    // Limitar historial
    if (history.length > this.MAX_ACTIONS) {
      history.pop();
    }
    
    this.history.set(workspaceId, history);
    
    log.info('Action recorded', { 
      workspaceId, 
      actionId: actionRecord.id, 
      type: action.type,
      tableName: action.tableName,
    });

    return actionRecord.id;
  }

  /**
   * Obtiene la última acción que puede deshacerse
   * @param {string} workspaceId 
   * @param {string} chatId - Opcional, filtrar por chat
   * @returns {object|null}
   */
  getLastUndoable(workspaceId, chatId = null) {
    const history = this.history.get(workspaceId) || [];
    
    return history.find(action => {
      if (!action.canUndo) return false;
      if (chatId && action.chatId !== chatId) return false;
      return true;
    }) || null;
  }

  /**
   * Marca una acción como deshecha
   * @param {string} workspaceId 
   * @param {string} actionId 
   * @returns {object|null} La acción deshecha o null
   */
  markUndone(workspaceId, actionId) {
    const history = this.history.get(workspaceId) || [];
    const action = history.find(a => a.id === actionId);
    
    if (action) {
      action.canUndo = false;
      action.undoneAt = new Date().toISOString();
      log.info('Action marked as undone', { workspaceId, actionId });
      return action;
    }
    
    return null;
  }

  /**
   * Genera datos de rollback para una acción
   * @param {object} action 
   * @returns {object} Instrucciones de rollback
   */
  getRollbackInstructions(action) {
    switch (action.type) {
      case ACTION_TYPE.CREATE:
        return {
          operation: 'delete',
          recordId: action.recordId,
          tableId: action.tableId,
          message: `Eliminar el registro creado en ${action.tableName}`,
        };
        
      case ACTION_TYPE.UPDATE:
        return {
          operation: 'update',
          recordId: action.recordId,
          tableId: action.tableId,
          data: action.previousData,
          message: `Restaurar valores anteriores en ${action.tableName}`,
        };
        
      case ACTION_TYPE.DELETE:
        return {
          operation: 'create',
          tableId: action.tableId,
          data: action.previousData,
          message: `Restaurar el registro eliminado de ${action.tableName}`,
        };
        
      case ACTION_TYPE.CANCEL:
        return {
          operation: 'update',
          recordId: action.recordId,
          tableId: action.tableId,
          data: { estado: action.previousData?.estado || 'Pendiente' },
          message: `Reactivar el registro cancelado en ${action.tableName}`,
        };
        
      default:
        return null;
    }
  }

  /**
   * Detecta si el mensaje es una solicitud de undo
   * @param {string} message 
   * @returns {boolean}
   */
  isUndoRequest(message) {
    const normalized = message.toLowerCase().trim();
    const patterns = [
      /^(deshace|deshacer|undo|revertir?|rollback)(\s*(eso|lo\s*[uú]ltimo))?$/,
      /^me\s*equivoqu[eé]$/,
      /^(eso\s*)?(no\s*era|estuvo\s*mal|est[aá]\s*mal)$/,
      /^cancel(ar?|a)\s*(eso|lo\s*[uú]ltimo)$/,
      /^(quita|elimina|borra)\s*(eso|lo\s*[uú]ltimo)$/,
    ];
    
    return patterns.some(p => p.test(normalized));
  }

  /**
   * Obtiene historial de acciones para un chat
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @param {number} limit 
   * @returns {object[]}
   */
  getHistory(workspaceId, chatId, limit = 5) {
    const history = this.history.get(workspaceId) || [];
    
    return history
      .filter(a => a.chatId === chatId)
      .slice(0, limit);
  }

  /**
   * Genera resumen de última acción para el usuario
   * @param {object} action 
   * @returns {string}
   */
  formatActionSummary(action) {
    const typeLabels = {
      [ACTION_TYPE.CREATE]: 'Creado',
      [ACTION_TYPE.UPDATE]: 'Actualizado',
      [ACTION_TYPE.DELETE]: 'Eliminado',
      [ACTION_TYPE.CANCEL]: 'Cancelado',
    };
    
    const label = typeLabels[action.type] || action.type;
    const time = new Date(action.timestamp).toLocaleTimeString('es');
    
    return `${label} en ${action.tableName} (${time})`;
  }

  /**
   * Limpia historial antiguo (más de 24 horas)
   * @param {string} workspaceId 
   */
  cleanOld(workspaceId) {
    const history = this.history.get(workspaceId) || [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const filtered = history.filter(a => new Date(a.timestamp) > cutoff);
    
    if (filtered.length < history.length) {
      this.history.set(workspaceId, filtered);
      log.debug('Cleaned old actions', { 
        workspaceId, 
        removed: history.length - filtered.length,
      });
    }
  }
}

// Singleton
let instance = null;

export function getActionHistory() {
  if (!instance) {
    instance = new ActionHistory();
  }
  return instance;
}

export { ActionHistory };
export default ActionHistory;
