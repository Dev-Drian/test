/**
 * AIProvider - Interfaz base para proveedores de IA
 * 
 * Define el contrato que deben implementar todos los proveedores.
 * Facilita cambiar entre diferentes LLMs (OpenAI, Anthropic, etc.)
 */

export class AIProvider {
  /**
   * Genera una respuesta de chat
   * @param {object} options - Opciones de la solicitud
   * @param {array} options.messages - Mensajes de la conversación
   * @param {string} options.model - Modelo a usar
   * @param {number} options.maxTokens - Tokens máximos de respuesta
   * @param {number} options.temperature - Creatividad (0-1)
   * @returns {Promise<{content: string, usage: object}>}
   */
  async complete(options) {
    throw new Error('complete() must be implemented by subclass');
  }
  
  /**
   * Detecta la intención de un mensaje
   * @param {string} message - Mensaje del usuario
   * @param {object} agent - Configuración del agente
   * @returns {Promise<object>}
   */
  async detectIntent(message, agent) {
    throw new Error('detectIntent() must be implemented by subclass');
  }
  
  /**
   * Analiza un mensaje para extraer datos estructurados
   * @param {string} message - Mensaje del usuario
   * @param {array} tablesInfo - Información de las tablas
   * @param {string} actionType - Tipo de acción detectada
   * @param {object} dateContext - Contexto de fechas
   * @returns {Promise<object>}
   */
  async analyzeMessage(message, tablesInfo, actionType, dateContext) {
    throw new Error('analyzeMessage() must be implemented by subclass');
  }
  
  /**
   * Genera un título para un chat
   * @param {string} userMessage - Mensaje del usuario
   * @param {string} assistantResponse - Respuesta del asistente
   * @returns {Promise<string|null>}
   */
  async generateChatTitle(userMessage, assistantResponse) {
    throw new Error('generateChatTitle() must be implemented by subclass');
  }
  
  /**
   * Verifica la conexión con el proveedor
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }
}

export default AIProvider;
