/**
 * Context - Estado de la conversación y contexto de ejecución
 * 
 * Mantiene toda la información necesaria durante el procesamiento
 * de un mensaje: datos del workspace, agente, chat, campos recolectados, etc.
 */

export class Context {
  constructor(options = {}) {
    // Identificadores
    this.workspaceId = options.workspaceId || null;
    this.agentId = options.agentId || null;
    this.chatId = options.chatId || null;
    
    // Mensaje actual
    this.message = options.message || '';
    this.originalMessage = options.message || '';
    
    // Documentos cargados
    this.agent = options.agent || null;
    this.chat = options.chat || null;
    this.tables = options.tables || [];
    this.tablesInfo = options.tablesInfo || [];
    this.tablesData = options.tablesData || [];
    
    // Estado de la conversación
    this.history = options.history || [];
    this.pendingCreate = options.pendingCreate || null;
    this.pendingRelation = options.pendingRelation || null;
    this.pendingConfirmation = options.pendingConfirmation || null;
    
    // Intención detectada
    this.intent = options.intent || null;
    this.analysis = options.analysis || null;
    
    // Campos recolectados
    this.collectedFields = options.collectedFields || {};
    this.missingFields = options.missingFields || [];
    
    // Resultado de la acción
    this.result = options.result || null;
    this.response = options.response || null;
    
    // Configuración
    this.token = options.token || process.env.OPENAI_API_KEY || '';
    this.dateContext = options.dateContext || {
      today: this._getTodayInColombia(),
      timezone: 'America/Bogota',
    };
    
    // Flujo activo (para configuración dinámica)
    this.activeFlow = options.activeFlow || null;
    this.flowConfig = options.flowConfig || null;
    
    // Metadatos
    this.startTime = Date.now();
    this.handled = false;
    this._metadata = {};
  }
  
  /**
   * Obtiene un valor por clave
   */
  get(key) {
    return this[key];
  }
  
  /**
   * Establece el mensaje actual
   */
  setCurrentMessage(message) {
    this.message = message;
  }
  
  /**
   * Establece metadata
   */
  setMetadata(key, value) {
    this._metadata[key] = value;
  }
  
  /**
   * Obtiene metadata
   */
  getMetadata(key) {
    return this._metadata[key];
  }
  
  /**
   * Elimina metadata
   */
  deleteMetadata(key) {
    delete this._metadata[key];
  }
  
  /**
   * Verifica si hay pendingCreate
   */
  hasPendingCreate() {
    return !!this.pendingCreate;
  }
  
  /**
   * Obtiene la fecha de hoy en zona horaria de Colombia
   */
  _getTodayInColombia() {
    const nowInColombia = new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' });
    return nowInColombia.split(',')[0]; // YYYY-MM-DD
  }
  
  /**
   * Obtiene la fecha de mañana
   */
  getTomorrow() {
    const [year, month, day] = this.dateContext.today.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  /**
   * Carga el pendingCreate desde el chat si existe
   */
  loadPendingState() {
    if (this.chat?.data?.pendingCreate) {
      this.pendingCreate = this.chat.data.pendingCreate;
      this.collectedFields = this.pendingCreate.fields || {};
    }
    if (this.chat?.data?.pendingRelation) {
      this.pendingRelation = this.chat.data.pendingRelation;
    }
    if (this.chat?.data?.pendingConfirmation) {
      this.pendingConfirmation = this.chat.data.pendingConfirmation;
    }
  }
  
  /**
   * Guarda el estado pendiente en el chat
   */
  savePendingState() {
    if (!this.chat) return;
    
    this.chat.data = this.chat.data || {};
    
    if (this.pendingCreate) {
      this.chat.data.pendingCreate = this.pendingCreate;
    } else {
      delete this.chat.data.pendingCreate;
    }
    
    if (this.pendingRelation) {
      this.chat.data.pendingRelation = this.pendingRelation;
    } else {
      delete this.chat.data.pendingRelation;
    }
    
    if (this.pendingConfirmation) {
      this.chat.data.pendingConfirmation = this.pendingConfirmation;
    } else {
      delete this.chat.data.pendingConfirmation;
    }
  }
  
  /**
   * Fusiona nuevos campos con los ya recolectados
   * Solo acepta valores para campos que realmente faltan
   */
  mergeFields(newFields) {
    const requiredFields = this.pendingCreate?.requiredFields || [];
    const currentMissing = requiredFields.filter(k => {
      const v = this.collectedFields[k];
      return v === undefined || v === null || v === '';
    });
    
    for (const [key, value] of Object.entries(newFields)) {
      // Solo aceptar si el campo está faltante y tiene valor válido
      if (currentMissing.includes(key) && value !== undefined && value !== null && value !== '') {
        this.collectedFields[key] = value;
      }
    }
    
    // Actualizar pendingCreate
    if (this.pendingCreate) {
      this.pendingCreate.fields = this.collectedFields;
    }
    
    // Recalcular campos faltantes
    this.updateMissingFields();
  }
  
  /**
   * Actualiza la lista de campos faltantes
   */
  updateMissingFields() {
    const requiredFields = this.pendingCreate?.requiredFields || [];
    this.missingFields = requiredFields.filter(k => {
      const v = this.collectedFields[k];
      return v === undefined || v === null || v === '';
    });
  }
  
  /**
   * Verifica si todos los campos requeridos están completos
   */
  isComplete() {
    this.updateMissingFields();
    return this.missingFields.length === 0;
  }
  
  /**
   * Inicializa un nuevo pendingCreate
   * @param {string} tableId
   * @param {string} tableName
   * @param {string[]} requiredFields - keys de campos requeridos
   * @param {object[]} fieldsConfig - configuración completa de campos de la tabla
   */
  initPendingCreate(tableId, tableName, requiredFields, fieldsConfig = []) {
    this.pendingCreate = {
      tableId,
      tableName,
      actionType: 'create',
      fields: {},
      requiredFields: requiredFields || [],
      fieldsConfig: fieldsConfig || [],
    };
    this.collectedFields = {};
    this.missingFields = requiredFields || [];
  }
  
  /**
   * Limpia el estado de pendingCreate
   */
  clearPendingCreate() {
    this.pendingCreate = null;
    this.collectedFields = {};
    this.missingFields = [];
  }
  
  /**
   * Agrega mensaje al historial
   */
  addToHistory(role, content) {
    this.history.push({ role, content });
    
    if (this.chat) {
      this.chat.messages = this.chat.messages || [];
      this.chat.messages.push({
        role,
        content,
        id: this._generateId(),
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  /**
   * Genera un ID único
   */
  _generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Obtiene el contexto de conversación formateado para el LLM
   */
  getConversationContext() {
    if (this.history.length === 0) return '';
    
    let context = '\n\nCONTEXTO DE LA CONVERSACIÓN:\n';
    context += this.history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // Si hay campos recolectados, agregarlos
    if (Object.keys(this.collectedFields).length > 0) {
      const collected = Object.entries(this.collectedFields)
        .filter(([k, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      context += `\n\nDATOS YA RECOLECTADOS: ${collected}`;
      context += '\n(No pedir estos datos nuevamente)';
    }
    
    return context;
  }
  
  /**
   * Obtiene el ID efectivo de la tabla a usar
   */
  getEffectiveTableId() {
    // Prioridad: pendingCreate > análisis
    if (this.pendingCreate?.tableId) {
      return this.pendingCreate.tableId;
    }
    return this.analysis?.tableId || null;
  }
  
  /**
   * Obtiene el nombre efectivo de la tabla
   */
  getEffectiveTableName() {
    if (this.pendingCreate?.tableName) {
      return this.pendingCreate.tableName;
    }
    return this.analysis?.tableName || 'registro';
  }
  
  /**
   * Serializa el contexto para logging/debugging
   */
  toJSON() {
    return {
      workspaceId: this.workspaceId,
      agentId: this.agentId,
      chatId: this.chatId,
      message: this.message,
      intent: this.intent,
      hasPendingCreate: !!this.pendingCreate,
      collectedFields: this.collectedFields,
      missingFields: this.missingFields,
      handled: this.handled,
      duration: Date.now() - this.startTime,
    };
  }
}

export default Context;
