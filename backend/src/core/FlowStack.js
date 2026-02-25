/**
 * FlowStack - Gestión de flujos encadenados (Multi-Step Flows)
 * 
 * Permite:
 * - Encadenar múltiples acciones (crear cliente → crear cita)
 * - Pausar un flujo para hacer otro y retomar
 * - Flujos condicionales basados en resultados
 * 
 * @module core/FlowStack
 */

import logger from '../config/logger.js';

const log = logger.child('FlowStack');

/**
 * Estados de un flujo
 */
export const FLOW_STATUS = {
  PENDING: 'pending',       // Esperando ser ejecutado
  IN_PROGRESS: 'in_progress', // Actualmente en ejecución
  PAUSED: 'paused',         // Pausado por flujo lateral
  COMPLETED: 'completed',   // Completado exitosamente
  FAILED: 'failed',         // Falló
  CANCELLED: 'cancelled',   // Cancelado por usuario
};

/**
 * Gestiona el stack de flujos pendientes
 */
class FlowStack {
  constructor() {
    // Cache en memoria por chatId
    this.stacks = new Map();
  }

  /**
   * Obtiene o crea el stack para un chat
   * @param {string} chatId 
   * @param {object} existingData - Datos existentes del chat
   * @returns {object[]} Stack de flujos
   */
  getOrCreate(chatId, existingData = null) {
    if (this.stacks.has(chatId)) {
      return this.stacks.get(chatId);
    }

    const stack = existingData?.flowStack || [];
    this.stacks.set(chatId, stack);
    return stack;
  }

  /**
   * Agrega un nuevo flujo al stack
   * @param {string} chatId 
   * @param {object} flow - Definición del flujo
   * @returns {string} ID del flujo
   */
  push(chatId, flow) {
    const stack = this.stacks.get(chatId) || [];
    
    const flowEntry = {
      id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: flow.type,           // 'create', 'update', 'query', 'custom'
      tableName: flow.tableName, // Tabla objetivo
      tableId: flow.tableId,
      status: FLOW_STATUS.PENDING,
      priority: flow.priority || 0, // Mayor = más urgente
      data: flow.data || {},     // Datos parciales
      requiredFields: flow.requiredFields || [],
      collectedFields: flow.collectedFields || {},
      
      // Para flujos encadenados
      dependsOn: flow.dependsOn || null,  // ID del flujo del que depende
      onComplete: flow.onComplete || null, // Acción al completar
      onFail: flow.onFail || null,         // Acción si falla
      
      // Contexto
      reason: flow.reason || null,  // Por qué se creó este flujo
      parentFlowId: flow.parentFlowId || null, // Si es hijo de otro flujo
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    stack.push(flowEntry);
    this.stacks.set(chatId, stack);

    log.info('Flow pushed to stack', { 
      chatId, 
      flowId: flowEntry.id, 
      type: flow.type, 
      tableName: flow.tableName,
      stackSize: stack.length,
    });

    return flowEntry.id;
  }

  /**
   * Obtiene el flujo activo actual (el de mayor prioridad o más reciente)
   * @param {string} chatId 
   * @returns {object|null}
   */
  getActive(chatId) {
    const stack = this.stacks.get(chatId) || [];
    
    // Buscar flujo in_progress primero
    const inProgress = stack.find(f => f.status === FLOW_STATUS.IN_PROGRESS);
    if (inProgress) return inProgress;
    
    // Luego buscar flujos pendientes (por prioridad, luego por fecha)
    const pending = stack
      .filter(f => f.status === FLOW_STATUS.PENDING)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

    return pending[0] || null;
  }

  /**
   * Marca un flujo como en progreso
   * @param {string} chatId 
   * @param {string} flowId 
   */
  markInProgress(chatId, flowId) {
    const stack = this.stacks.get(chatId) || [];
    const flow = stack.find(f => f.id === flowId);
    
    if (flow) {
      // Pausar cualquier otro flujo in_progress
      stack.forEach(f => {
        if (f.status === FLOW_STATUS.IN_PROGRESS && f.id !== flowId) {
          f.status = FLOW_STATUS.PAUSED;
          f.updatedAt = new Date().toISOString();
          log.debug('Flow paused', { chatId, flowId: f.id });
        }
      });
      
      flow.status = FLOW_STATUS.IN_PROGRESS;
      flow.updatedAt = new Date().toISOString();
      log.debug('Flow marked in progress', { chatId, flowId });
    }
  }

  /**
   * Actualiza los datos de un flujo
   * @param {string} chatId 
   * @param {string} flowId 
   * @param {object} updates 
   */
  updateFlow(chatId, flowId, updates) {
    const stack = this.stacks.get(chatId) || [];
    const flow = stack.find(f => f.id === flowId);
    
    if (flow) {
      Object.assign(flow, updates, { updatedAt: new Date().toISOString() });
      log.debug('Flow updated', { chatId, flowId, updates: Object.keys(updates) });
    }
  }

  /**
   * Completa un flujo y procesa acciones encadenadas
   * @param {string} chatId 
   * @param {string} flowId 
   * @param {object} result - Resultado del flujo
   * @returns {object|null} Siguiente flujo a ejecutar (si hay)
   */
  complete(chatId, flowId, result = {}) {
    const stack = this.stacks.get(chatId) || [];
    const flowIndex = stack.findIndex(f => f.id === flowId);
    
    if (flowIndex === -1) return null;

    const flow = stack[flowIndex];
    flow.status = FLOW_STATUS.COMPLETED;
    flow.result = result;
    flow.updatedAt = new Date().toISOString();

    log.info('Flow completed', { chatId, flowId, type: flow.type });

    // Procesar onComplete si existe (flujo encadenado)
    let nextFlow = null;
    if (flow.onComplete) {
      const chainedFlow = {
        ...flow.onComplete,
        parentFlowId: flowId,
        // Pasar datos del flujo completado al siguiente
        data: {
          ...flow.onComplete.data,
          _parentResult: result,
        },
      };
      
      const nextId = this.push(chatId, chainedFlow);
      nextFlow = stack.find(f => f.id === nextId);
      log.info('Chained flow created', { chatId, parentFlowId: flowId, nextFlowId: nextId });
    }

    // Reanudar flujos pausados que dependían de este
    stack.forEach(f => {
      if (f.status === FLOW_STATUS.PAUSED && f.dependsOn === flowId) {
        f.status = FLOW_STATUS.PENDING;
        f.data._dependencyResult = result;
        f.updatedAt = new Date().toISOString();
        log.debug('Dependent flow resumed', { chatId, flowId: f.id });
      }
    });

    // Limpiar flujos completados antiguos (mantener últimos 5)
    const completed = stack.filter(f => f.status === FLOW_STATUS.COMPLETED);
    if (completed.length > 5) {
      const toRemove = completed.slice(0, completed.length - 5);
      toRemove.forEach(f => {
        const idx = stack.indexOf(f);
        if (idx > -1) stack.splice(idx, 1);
      });
    }

    return nextFlow;
  }

  /**
   * Falla un flujo y procesa acciones de error
   * @param {string} chatId 
   * @param {string} flowId 
   * @param {object} error 
   * @returns {object|null} Flujo de recuperación (si existe)
   */
  fail(chatId, flowId, error = {}) {
    const stack = this.stacks.get(chatId) || [];
    const flow = stack.find(f => f.id === flowId);
    
    if (!flow) return null;

    flow.status = FLOW_STATUS.FAILED;
    flow.error = error;
    flow.updatedAt = new Date().toISOString();

    log.warn('Flow failed', { chatId, flowId, error: error.message });

    // Procesar onFail si existe
    if (flow.onFail) {
      const recoveryFlow = {
        ...flow.onFail,
        parentFlowId: flowId,
        reason: `Recovery from failed flow: ${error.message}`,
      };
      
      const recoveryId = this.push(chatId, recoveryFlow);
      return stack.find(f => f.id === recoveryId);
    }

    return null;
  }

  /**
   * Cancela un flujo
   * @param {string} chatId 
   * @param {string} flowId 
   */
  cancel(chatId, flowId = null) {
    const stack = this.stacks.get(chatId) || [];
    
    if (flowId) {
      // Cancelar flujo específico
      const flow = stack.find(f => f.id === flowId);
      if (flow) {
        flow.status = FLOW_STATUS.CANCELLED;
        flow.updatedAt = new Date().toISOString();
        log.info('Flow cancelled', { chatId, flowId });
      }
    } else {
      // Cancelar flujo activo
      const active = this.getActive(chatId);
      if (active) {
        active.status = FLOW_STATUS.CANCELLED;
        active.updatedAt = new Date().toISOString();
        log.info('Active flow cancelled', { chatId, flowId: active.id });
      }
    }
  }

  /**
   * Verifica si hay flujo activo pendiente
   * @param {string} chatId 
   * @returns {boolean}
   */
  hasActiveFlow(chatId) {
    const active = this.getActive(chatId);
    return active !== null;
  }

  /**
   * Obtiene resumen del stack para el prompt del LLM
   * @param {string} chatId 
   * @returns {string} Descripción del estado actual
   */
  getContextSummary(chatId) {
    const stack = this.stacks.get(chatId) || [];
    const active = stack.filter(f => 
      [FLOW_STATUS.IN_PROGRESS, FLOW_STATUS.PENDING, FLOW_STATUS.PAUSED].includes(f.status)
    );

    if (active.length === 0) return '';

    const lines = ['FLUJOS PENDIENTES:'];
    active.forEach((flow, idx) => {
      const collected = Object.keys(flow.collectedFields || {}).length;
      const required = (flow.requiredFields || []).length;
      lines.push(`${idx + 1}. ${flow.type} en ${flow.tableName} (${flow.status}) - ${collected}/${required} campos`);
    });

    return lines.join('\n');
  }

  /**
   * Serializa el stack para persistir
   * @param {string} chatId 
   * @returns {object[]}
   */
  serialize(chatId) {
    return this.stacks.get(chatId) || [];
  }

  /**
   * Limpia el stack de un chat
   * @param {string} chatId 
   */
  clear(chatId) {
    this.stacks.delete(chatId);
  }
}

// Singleton
let instance = null;

export function getFlowStack() {
  if (!instance) {
    instance = new FlowStack();
  }
  return instance;
}

export { FlowStack };
export default FlowStack;
