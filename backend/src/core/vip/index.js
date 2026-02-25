/**
 * VIP Features - Módulos Premium para Chatbots Empresariales
 * 
 * Este módulo exporta todas las funcionalidades premium para
 * clientes VIP con flujos complejos.
 * 
 * @module core/vip
 */

// Importaciones locales para uso en initializeVIPFeatures
import { UserMemory, getUserMemory } from '../UserMemory.js';
import { FlowStack, getFlowStack, FLOW_STATUS } from '../FlowStack.js';
import { SmartValidator, getSmartValidator } from '../SmartValidator.js';
import { ConfirmationManager, getConfirmationManager, CONFIRMATION_STATE } from '../ConfirmationManager.js';
import { ActionHistory, getActionHistory, ACTION_TYPE } from '../ActionHistory.js';
import { ProactiveEngine, getProactiveEngine } from '../ProactiveEngine.js';
import { ConditionalFlowEngine, getConditionalFlowEngine, OPERATORS } from '../ConditionalFlowEngine.js';

// Re-exportar todos los módulos
export {
  // Memoria de usuario
  UserMemory,
  getUserMemory,
  
  // Flujos multi-paso
  FlowStack,
  getFlowStack,
  FLOW_STATUS,
  
  // Validaciones inteligentes
  SmartValidator,
  getSmartValidator,
  
  // Confirmación pre-guardado
  ConfirmationManager,
  getConfirmationManager,
  CONFIRMATION_STATE,
  
  // Historial de acciones / rollback
  ActionHistory,
  getActionHistory,
  ACTION_TYPE,
  
  // Inteligencia proactiva
  ProactiveEngine,
  getProactiveEngine,
  
  // Motor de reglas de negocio
  ConditionalFlowEngine,
  getConditionalFlowEngine,
  OPERATORS,
};


/**
 * Inicializa todos los módulos VIP para un workspace
 * @param {string} workspaceId 
 * @param {object} options - Configuración opcional
 */
export function initializeVIPFeatures(workspaceId, options = {}) {
  // Importar singletons (ya cargados arriba)
  const userMemory = getUserMemory();
  const flowStack = getFlowStack();
  const validator = getSmartValidator();
  const confirmation = getConfirmationManager();
  const actionHistory = getActionHistory();
  const proactive = getProactiveEngine();
  const conditionalFlows = getConditionalFlowEngine();

  // Configurar motor proactivo
  if (options.proactive) {
    proactive.configure(workspaceId, options.proactive);
  }

  // Configurar validador
  if (options.validation) {
    validator.configure(workspaceId, options.validation);
  }

  // Retornar instancias para uso directo
  return {
    userMemory,
    flowStack,
    validator,
    confirmation,
    actionHistory,
    proactive,
    conditionalFlows,
  };
}


/**
 * Ejemplo de uso integrado
 * 
 * ```javascript
 * import { 
 *   getUserMemory,
 *   getFlowStack, 
 *   getSmartValidator,
 *   getConfirmationManager,
 *   getActionHistory,
 *   getProactiveEngine 
 * } from './core/vip/index.js';
 * 
 * // En el Engine, al procesar un mensaje:
 * async processMessage(context, message) {
 *   const memory = getUserMemory();
 *   const flowStack = getFlowStack();
 *   const validator = getSmartValidator();
 *   const confirmation = getConfirmationManager();
 *   const actionHistory = getActionHistory();
 *   const proactive = getProactiveEngine();
 * 
 *   // 1. Detectar anáforas ("otra igual", "el mismo cliente")
 *   const anaphora = memory.detectAnaphora(message);
 *   if (anaphora.detected) {
 *     // Usar datos de la última acción
 *     context.prefillData = anaphora.referenceData;
 *   }
 * 
 *   // 2. Detectar solicitud de undo
 *   if (actionHistory.isUndoRequest(message)) {
 *     const lastAction = actionHistory.getLastUndoable(context.workspaceId, context.chatId);
 *     if (lastAction) {
 *       const rollback = actionHistory.getRollbackInstructions(lastAction);
 *       // Ejecutar rollback...
 *     }
 *   }
 * 
 *   // 3. Verificar confirmación pendiente
 *   const pendingConfirmation = confirmation.get(context.chatId);
 *   if (pendingConfirmation) {
 *     // Manejar respuesta de confirmación
 *     if (confirmation.isAffirmative(message)) {
 *       // Guardar el registro
 *     } else if (confirmation.isFieldEdit(message)) {
 *       // Editar campo específico
 *     } else {
 *       // Cancelar
 *     }
 *   }
 * 
 *   // 4. Validar datos antes de guardar
 *   const validationResult = validator.validateAll(data, {
 *     tableName: 'Citas',
 *     context,
 *   });
 *   if (!validationResult.isValid) {
 *     return { error: validationResult.issues[0].suggestion };
 *   }
 * 
 *   // 5. Iniciar confirmación si todo está listo
 *   if (allFieldsCollected) {
 *     confirmation.startConfirmation(context.chatId, {
 *       tableName: 'Citas',
 *       data: collectedData,
 *     });
 *     return { 
 *       message: confirmation.generatePreview(context.chatId),
 *       awaitingConfirmation: true 
 *     };
 *   }
 * 
 *   // 6. Registrar acción después de guardar
 *   if (recordCreated) {
 *     actionHistory.record(context.workspaceId, {
 *       type: ACTION_TYPE.CREATE,
 *       tableName: 'Citas',
 *       recordId: newRecord.id,
 *       newData: recordData,
 *       chatId: context.chatId,
 *     });
 *     
 *     // Actualizar memoria de usuario
 *     memory.recordAction(context.chatId, {
 *       type: 'create',
 *       tableName: 'Citas',
 *       data: recordData,
 *     });
 *   }
 * 
 *   // 7. Obtener sugerencias proactivas
 *   const suggestions = proactive.generateSuggestions(context);
 *   if (suggestions.suggestions.length > 0) {
 *     // Agregar sugerencias a la respuesta
 *   }
 * }
 * ```
 */
