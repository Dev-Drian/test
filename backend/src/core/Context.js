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
      // Asegurar que tenga workspaceId (para validación de relaciones)
      if (!this.pendingCreate.workspaceId) {
        this.pendingCreate.workspaceId = this.workspaceId;
      }
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
   * Solo acepta valores para campos que realmente faltan Y que sean válidos
   * @param {object} newFields - Campos a fusionar
   * @param {object} options - Opciones { validate: true, normalize: true }
   * @returns {object} { accepted: array, rejected: array }
   */
  mergeFields(newFields, options = {}) {
    const { validate = true, normalize = true } = options;
    
    const requiredFields = this.pendingCreate?.requiredFields || [];
    const fieldsConfig = this.pendingCreate?.fieldsConfig || [];
    
    // Crear mapa de configuración
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    // Determinar qué campos realmente faltan
    const currentMissing = requiredFields.filter(k => {
      const v = this.collectedFields[k];
      return v === undefined || v === null || v === '';
    });
    
    const accepted = [];
    const rejected = [];
    
    for (const [key, value] of Object.entries(newFields)) {
      // Solo procesar si el campo está faltante
      if (!currentMissing.includes(key)) {
        rejected.push({ key, reason: 'Campo no está faltante' });
        continue;
      }
      
      // Verificar que tenga valor válido
      if (value === undefined || value === null || value === '') {
        rejected.push({ key, reason: 'Valor vacío' });
        continue;
      }
      
      const config = configMap[key];
      let finalValue = value;
      
      // Validar si está habilitado
      if (validate && config) {
        const validation = this._validateField(key, value, config);
        if (!validation.valid) {
          rejected.push({ key, reason: validation.error });
          continue;
        }
      }
      
      // Normalizar si está habilitado
      if (normalize && config) {
        finalValue = this._normalizeField(key, value, config);
      }
      
      // Aceptar el campo
      this.collectedFields[key] = finalValue;
      accepted.push(key);
    }
    
    // Actualizar pendingCreate
    if (this.pendingCreate) {
      this.pendingCreate.fields = this.collectedFields;
    }
    
    // Recalcular campos faltantes
    this.updateMissingFields();
    
    return { accepted, rejected };
  }
  
  /**
   * Cambia el valor de un campo ya recolectado
   * Permite al usuario corregir datos durante el flujo de creación
   * @param {string} fieldKey - Clave del campo a cambiar
   * @param {*} newValue - Nuevo valor
   * @param {object} options - Opciones { validate: true, normalize: true }
   * @returns {object} { success: boolean, error?: string, oldValue?: any }
   */
  changeField(fieldKey, newValue, options = {}) {
    const { validate = true, normalize = true } = options;
    
    const fieldsConfig = this.pendingCreate?.fieldsConfig || [];
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    const config = configMap[fieldKey];
    
    // Verificar que el campo exista en la configuración
    if (!config) {
      return { success: false, error: `Campo "${fieldKey}" no existe en la configuración` };
    }
    
    // Verificar que tenga valor válido
    if (newValue === undefined || newValue === null || newValue === '') {
      return { success: false, error: 'Valor vacío' };
    }
    
    const oldValue = this.collectedFields[fieldKey];
    let finalValue = newValue;
    
    // Validar si está habilitado
    if (validate && config) {
      const validation = this._validateField(fieldKey, newValue, config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }
    
    // Normalizar si está habilitado
    if (normalize && config) {
      finalValue = this._normalizeField(fieldKey, newValue, config);
    }
    
    // Cambiar el campo
    this.collectedFields[fieldKey] = finalValue;
    
    // Actualizar pendingCreate
    if (this.pendingCreate) {
      this.pendingCreate.fields = this.collectedFields;
    }
    
    // Recalcular campos faltantes
    this.updateMissingFields();
    
    console.log(`[Context] Field "${fieldKey}" changed from "${oldValue}" to "${finalValue}"`);
    
    return { success: true, oldValue, newValue: finalValue };
  }
  
  /**
   * Valida un campo según su configuración
   * @private
   */
  _validateField(fieldKey, value, fieldConfig) {
    if (!value) {
      return { valid: false, error: `${fieldKey} es requerido` };
    }
    
    const validation = fieldConfig?.validation;
    if (!validation) return { valid: true };
    
    // Validación por tipo
    switch (fieldConfig.type) {
      case 'phone':
      case 'telefono':
        const digits = String(value).replace(/\D/g, '');
        const requiredDigits = validation.digits || 10;
        if (digits.length !== requiredDigits) {
          return { valid: false, error: `El teléfono debe tener ${requiredDigits} dígitos` };
        }
        return { valid: true };
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Email inválido' };
        }
        return { valid: true };
        
      case 'date':
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          return { valid: false, error: 'Formato de fecha inválido (use YYYY-MM-DD)' };
        }
        return { valid: true };
        
      case 'time':
        const timeRegex = /^\d{1,2}:\d{2}$/;
        if (!timeRegex.test(value)) {
          return { valid: false, error: 'Formato de hora inválido (use HH:MM)' };
        }
        return { valid: true };
        
      default:
        // Validaciones genéricas
        if (validation.minLength && String(value).length < validation.minLength) {
          return { valid: false, error: `Mínimo ${validation.minLength} caracteres` };
        }
        if (validation.maxLength && String(value).length > validation.maxLength) {
          return { valid: false, error: `Máximo ${validation.maxLength} caracteres` };
        }
        return { valid: true };
    }
  }
  
  /**
   * Normaliza un campo según su tipo
   * @private
   */
  _normalizeField(fieldKey, value, fieldConfig) {
    switch (fieldConfig?.type) {
      case 'phone':
      case 'telefono':
        return String(value).replace(/\D/g, '');
        
      case 'text':
        return String(value).trim();
        
      case 'date':
        return value; // Ya debería estar en YYYY-MM-DD
        
      case 'time':
        return value; // Ya debería estar en HH:MM
        
      default:
        return value;
    }
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
    // Filtrar campos con hiddenFromChat = true (campos administrativos)
    const visibleRequiredFields = requiredFields.filter(key => {
      const config = fieldsConfig.find(fc => fc.key === key);
      return config?.hiddenFromChat !== true;
    });
    
    this.pendingCreate = {
      workspaceId: this.workspaceId,  // IMPORTANTE: Guardar workspaceId para validación de relaciones
      tableId,
      tableName,
      actionType: 'create',
      fields: {},
      requiredFields: visibleRequiredFields,  // Solo campos visibles
      fieldsConfig: fieldsConfig || [],
    };
    this.collectedFields = {};
    this.missingFields = visibleRequiredFields;
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
