/**
 * ActionHandler - Clase base para todos los handlers de acciones
 * 
 * Implementa el patrón Strategy para el procesamiento de diferentes
 * tipos de acciones (create, query, update, etc.)
 */

export class ActionHandler {
  constructor(dependencies = {}) {
    this.tableRepository = dependencies.tableRepository;
    this.tableDataRepository = dependencies.tableDataRepository;
    this.chatRepository = dependencies.chatRepository;
    this.agentRepository = dependencies.agentRepository;
    this.aiProvider = dependencies.aiProvider;
    this.responseBuilder = dependencies.responseBuilder;
    this.fieldCollector = dependencies.fieldCollector;
    this.eventEmitter = dependencies.eventEmitter;
  }
  
  /**
   * Verifica si este handler puede manejar el contexto actual
   * @param {Context} context - Contexto de la conversación
   * @returns {Promise<boolean>}
   */
  async canHandle(context) {
    throw new Error('canHandle() must be implemented by subclass');
  }
  
  /**
   * Ejecuta la acción del handler
   * @param {Context} context - Contexto de la conversación
   * @returns {Promise<{handled: boolean, response?: string, data?: any}>}
   */
  async execute(context) {
    throw new Error('execute() must be implemented by subclass');
  }
  
  /**
   * Formatea la respuesta para el usuario
   * @param {Context} context - Contexto de la conversación
   * @param {object} result - Resultado de la ejecución
   * @returns {Promise<string>}
   */
  async formatResponse(context, result) {
    // Implementación por defecto - puede ser sobrescrita
    if (this.responseBuilder) {
      return this.responseBuilder.build(context, result);
    }
    return result.response || 'Operación completada.';
  }
  
  /**
   * Obtiene el nombre del handler para logging
   * @returns {string}
   */
  getName() {
    return this.constructor.name;
  }
}

export default ActionHandler;
