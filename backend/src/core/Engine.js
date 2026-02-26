/**
 * ChatEngine - Motor principal del chat (LLM-First)
 * 
 * El LLM decide qué acción tomar usando Function Calling.
 * Arquitectura sin keywords/regex hardcodeados.
 */

import { getEventEmitter, EVENTS } from './EventEmitter.js';
import { getToolRegistry } from './ToolRegistry.js';
import { getAgentPromptBuilder } from './AgentPromptBuilder.js';
import { getOpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { getIntentClassifier } from '../services/IntentClassifier.js';
import logger from '../config/logger.js';

const log = logger.child('Engine');

// Modelo por defecto configurable via environment
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'gpt-4o';

export class ChatEngine {
  constructor(options = {}) {
    this.handlers = [];
    this.eventEmitter = getEventEmitter();
    this.toolRegistry = getToolRegistry();
    this.promptBuilder = getAgentPromptBuilder();
    this.aiProvider = getOpenAIProvider();
    this.intentClassifier = getIntentClassifier();
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
   * Procesa un mensaje usando LLM-First con Function Calling
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
      return await this._processWithLLM(context);
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
   * Procesamiento LLM-First con Function Calling
   * El LLM decide qué acción tomar basándose en semántica
   * @private
   */
  async _processWithLLM(context) {
    const startTime = Date.now();
    
    // 1. Clasificar mensaje (reemplaza _isGarbageText hardcodeado)
    const classification = await this.aiProvider.classifyMessage(context.message);
    
    if (!classification.isValid) {
      log.info('Message classified as invalid', { 
        category: classification.category,
        message: context.message.substring(0, 50),
      });
      
      // Para GARBAGE/SPAM/ABUSE, responder apropiadamente
      const invalidResponses = {
        GARBAGE: 'No entendí tu mensaje. ¿Podrías reformularlo?',
        SPAM: 'Por favor, envía mensajes relacionados con nuestros servicios.',
        ABUSE: 'Por favor, mantén un tono respetuoso en la conversación.',
      };
      
      return {
        handled: true,
        response: invalidResponses[classification.category] || 'No entendí tu mensaje.',
        handler: 'MessageClassifier',
        classification,
      };
    }
    
    // 2. Construir system prompt dinámico
    const agentConfig = this.promptBuilder.extractConfigFromAgent(context.agent);
    agentConfig.tablesInfo = context.tables || [];
    agentConfig.dateContext = {
      today: this._getTodayDate(),
      tomorrow: this._getTomorrowDate(),
      dayOfWeek: this._getDayOfWeek(),
    };
    
    const systemPrompt = this.promptBuilder.build(agentConfig);
    
    // 3. Obtener tools habilitadas para este tenant (con nombres de tablas inyectados)
    const tools = this.toolRegistry.getTools({
      enabled: context.agent?.enabledTools || [],
      disabled: context.agent?.disabledTools || [],
      tables: context.tables || [], // Inyecta nombres reales en record_type
    });
    
    // 4. Construir mensajes para el LLM
    const messages = this._buildMessages(context);
    
    // 5. Function Calling - El LLM decide
    log.debug('Calling LLM with Function Calling', {
      toolCount: tools.length,
      messageCount: messages.length,
    });
    
    const llmResult = await this.aiProvider.functionCall({
      systemPrompt,
      messages,
      tools,
      model: this._getModelFromAgent(context.agent),
    });
    
    // 6. Emitir evento para auditoría
    this.eventEmitter.emit(EVENTS.HANDLER_SCORED, {
      workspaceId: context.workspaceId,
      mode: 'llm-first',
      evaluation: {
        tool: llmResult.tool,
        arguments: llmResult.arguments,
        hasDirectResponse: !!llmResult.response,
        latency: Date.now() - startTime,
      },
    });
    
    // 7. Si el LLM respondió directamente (sin tool)
    if (!llmResult.tool && llmResult.response) {
      return {
        handled: true,
        response: llmResult.response,
        handler: 'LLMDirect',
        mode: 'llm-first',
      };
    }
    
    // 8. Ejecutar el handler correspondiente a la tool
    if (llmResult.tool) {
      return await this._executeToolHandler(llmResult, context);
    }
    
    // 9. Fallback
    return this._handleNoMatch(context);
  }
  
  /**
   * Ejecuta el handler correspondiente a una tool seleccionada por el LLM
   * @private
   */
  async _executeToolHandler(llmResult, context) {
    const { tool, arguments: args } = llmResult;
    
    // Mapear tool a handler
    const handlerName = this.toolRegistry.mapToLegacyHandler(tool);
    const handler = this.handlers.find(h => h.constructor.name === handlerName);
    
    if (!handler) {
      log.warn('No handler found for tool', { tool, handlerName });
      return this._handleNoMatch(context);
    }
    
    log.debug('Executing handler for tool', { tool, handlerName });
    
    // Enriquecer contexto con los argumentos extraídos por el LLM
    context.llmExtracted = args;
    context.selectedTool = tool;
    
    // Mapear argumentos de tool a formato de context
    this._mapToolArgsToContext(tool, args, context);
    
    const result = await handler.execute(context);
    
    // Si el handler indica cambio de flujo, re-procesar con el nuevo intent
    if (result.flowChange && result.newIntent) {
      log.info('Handler requested flow change', { 
        fromHandler: handlerName, 
        newIntent: result.newIntent,
        message: context.message?.substring(0, 50),
      });
      
      // Marcar como consulta lateral para agregar reminder después
      context.sideQuery = true;
      
      // Re-procesar con el nuevo intent
      return await this._reprocessWithNewIntent(result.newIntent, context);
    }
    
    if (result.handled) {
      context.handled = true;
      context.response = result.response;
      
      if (!result.formatted && handler.formatResponse) {
        context.response = await handler.formatResponse(context, result);
      }
      
      // Si hay pendingCreate activo y fue una consulta lateral, recordar al usuario
      if (context.pendingCreate && context.sideQuery && tool !== 'create_record') {
        const tableName = context.pendingCreate.tableName || 'registro';
        const collectedCount = Object.keys(context.collectedFields || {}).length;
        
        let reminder = '\n\n---\n💡 ';
        if (collectedCount > 0) {
          reminder += `Recuerda que estábamos registrando tu ${tableName}. Ya tengo ${collectedCount} dato(s). ¿Continuamos?`;
        } else {
          reminder += `¿Continuamos con tu ${tableName}?`;
        }
        
        context.response += reminder;
        log.debug('Added pendingCreate reminder after side query', { tableName, collectedCount });
      }
      
      this.eventEmitter.emit(EVENTS.MESSAGE_PROCESSED, {
        workspaceId: context.workspaceId,
        handler: handlerName,
        tool,
        duration: Date.now() - context.startTime,
        mode: 'llm-first',
      });
      
      return {
        handled: true,
        response: context.response,
        handler: handlerName,
        tool,
        mode: 'llm-first',
      };
    }
    
    return { handled: false, response: null };
  }
  
  /**
   * Mapea argumentos de tool a formato esperado por handlers
   * @private
   */
  _mapToolArgsToContext(tool, args, context) {
    // DEBUG: Ver exactamente qué devuelve el LLM
    log.debug('LLM tool arguments', {
      tool,
      args: JSON.stringify(args),
      record_type: args?.record_type,
      data: args?.data ? JSON.stringify(args.data) : 'empty',
    });
    
    // Resolver tableId desde record_type
    const tableId = this._resolveTableId(args?.record_type, context.tables);
    
    switch (tool) {
      case 'check_availability':
        context.intent = { hasTableAction: true, actionType: 'availability' };
        context.analysis = {
          actionType: 'availability',
          tableId: tableId || this._findAppointmentTable(context.tables)?.id,
          fecha: args.date || context.dateContext?.tomorrow,
          servicio: args.service,
          horaPreferida: args.time_preference,
        };
        break;
        
      case 'create_record':
        context.intent = { hasTableAction: true, actionType: 'create' };
        // V3: El LLM DEBE devolver record_type correcto (tiene enum con nombres de tablas)
        // Soportar tanto 'id' (de ChatService) como '_id' (de DB directa)
        const foundCreateTable = this._findTableByType(args?.record_type, context.tables);
        let createTableId = tableId || (foundCreateTable?.id || foundCreateTable?._id);
        
        // Fallback inteligente: si es una acción de "agendar/reservar" y hay una tabla de citas, usarla
        if (!createTableId) {
          const appointmentTable = this._findAppointmentTable(context.tables);
          if (appointmentTable) {
            log.debug('Using appointment table as fallback', { tableId: appointmentTable.id, tableName: appointmentTable.name });
            createTableId = appointmentTable.id;
          }
        }
        
        // Si TODAVÍA no hay tabla, log para debugging
        if (!createTableId) {
          log.warn('Could not resolve table for create', {
            record_type: args?.record_type,
            availableTables: context.tables?.map(t => t.name),
          });
        }
        
        context.analysis = {
          actionType: 'create',
          tableId: createTableId,
          tableName: context.tables?.find(t => t.id === createTableId)?.name,
          create: {
            isComplete: Object.keys(args.data || {}).length >= 2,
            fields: args.data || {},
          },
        };
        break;
        
      case 'query_records':
        context.intent = { hasTableAction: true, actionType: 'query' };
        const queryTableId = tableId || this._findTableByType(args?.record_type, context.tables)?.id;
        context.analysis = {
          actionType: 'query',
          tableId: queryTableId,
          requestedType: args?.record_type, // Guardar lo que pidió para respuesta amigable
          query: {
            filters: args.filters || {},
            limit: args.limit || 10,
          },
        };
        break;
        
      case 'update_record':
        context.intent = { hasTableAction: true, actionType: 'update' };
        context.analysis = {
          actionType: args.action === 'cancel' ? 'update' : 'update',
          tableId: tableId || this._findTableByType(args?.record_type, context.tables)?.id,
          update: {
            searchCriteria: args.search_criteria || {},
            fieldsToUpdate: args.updates || {},
            isCancellation: args.action === 'cancel',
          },
        };
        break;
        
      case 'analyze_data':
        context.intent = { hasTableAction: true, actionType: 'query' };
        context.analysis = {
          actionType: 'query',
          tableId: tableId || this._findTableByType(args?.record_type, context.tables)?.id,
          isAnalysis: true,
          analysisType: args.analysis_type,
        };
        break;
        
      case 'general_conversation':
      default:
        context.intent = { hasTableAction: false };
        break;
    }
    
    log.debug('Mapped tool args to context', {
      tool,
      tableId: context.analysis?.tableId,
      hasAnalysis: !!context.analysis,
    });
  }
  
  /**
   * Resuelve tableId desde record_type - DINÁMICO sin keywords hardcodeados
   * 
   * El LLM recibe los nombres reales de las tablas en el system prompt,
   * así que debería devolver algo que coincida. Buscamos por:
   * 1. Coincidencia exacta del nombre
   * 2. Coincidencia parcial (contiene)
   * 3. Similitud básica (sin acentos, plural/singular)
   * 
   * @private
   */
  _resolveTableId(recordType, tables) {
    if (!recordType || !tables?.length) return null;
    
    const normalized = this._normalizeString(recordType);
    
    // DEBUG: Ver exactamente qué se está comparando
    log.debug('_resolveTableId comparing', {
      recordType,
      normalized,
      tables: tables.map(t => ({
        id: t.id || t._id,
        name: t.name,
        nameNormalized: this._normalizeString(t.name),
      })),
    });
    
    // 1. Coincidencia exacta
    for (const table of tables) {
      const tableName = this._normalizeString(table.name);
      if (tableName === normalized) {
        log.debug('_resolveTableId MATCH', { tableName, normalized, tableId: table.id || table._id });
        return table.id || table._id;
      }
    }
    
    // 2. Coincidencia parcial (el nombre de tabla contiene el record_type o viceversa)
    for (const table of tables) {
      const tableName = this._normalizeString(table.name);
      if (tableName.includes(normalized) || normalized.includes(tableName)) {
        return table.id || table._id;
      }
    }
    
    // 3. Similitud básica (quitar 's' final para singular/plural)
    const singularized = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    for (const table of tables) {
      const tableName = this._normalizeString(table.name);
      const tableNameSingular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
      if (tableNameSingular === singularized || tableName.includes(singularized) || singularized.includes(tableNameSingular)) {
        return table.id || table._id;
      }
    }
    
    log.debug('Could not resolve tableId', { recordType, availableTables: tables.map(t => t.name) });
    return null;
  }
  
  /**
   * Normaliza string para comparación: minúsculas, sin acentos
   * @private
   */
  _normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Quita acentos
  }
  
  /**
   * Encuentra tabla de citas basándose en tipo o campos (sin keywords hardcodeados)
   * @private
   */
  _findAppointmentTable(tables) {
    if (!tables?.length) return null;
    
    // 1. Por tipo explícito de tabla
    let found = tables.find(t => t.type === 'calendar' || t.type === 'appointments');
    if (found) return found;
    
    // 2. Por estructura de campos: tiene fecha Y hora → probablemente citas
    found = tables.find(t => {
      const headers = t.fields || t.headers || [];
      const hasDate = headers.some(h => h.type === 'date' || h.type === 'datetime');
      const hasTime = headers.some(h => h.type === 'time');
      return hasDate && hasTime;
    });
    
    return found;
  }
  
  /**
   * Encuentra tabla por tipo - usa _resolveTableId
   * @private
   */
  _findTableByType(recordType, tables) {
    if (!recordType || !tables?.length) return null;
    
    const tableId = this._resolveTableId(recordType, tables);
    return tables.find(t => (t.id || t._id) === tableId);
  }
  
  /**
   * Clasifica la intención del usuario cuando hay un flujo pendiente
   * Usa el IntentClassifier centralizado (con cache)
   * @private
   */
  async _classifyFlowIntent(message, pendingCreate) {
    // Delegar al clasificador centralizado (tiene cache y es más eficiente)
    return await this.intentClassifier.classifyFlowControl(message, pendingCreate);
  }
  
  /**
   * Re-procesa el mensaje con un nuevo intent (cambio de flujo)
   * Usado cuando un handler detecta que el usuario quiere hacer otra cosa
   * @private
   */
  async _reprocessWithNewIntent(newIntent, context) {
    log.debug('Re-processing with new intent', { newIntent, message: context.message?.substring(0, 50) });
    
    // Si hay pendingCreate activo, analizar con IA si realmente quiere cambiar de flujo
    // o si es una forma coloquial de continuar
    if (context.pendingCreate && (newIntent === 'thanks' || newIntent === 'greeting')) {
      // Usar el LLM para determinar la intención REAL
      const realIntent = await this._classifyFlowIntent(context.message, context.pendingCreate);
      
      log.info('LLM classified flow intent', { 
        originalIntent: newIntent, 
        realIntent,
        hasPendingCreate: true,
        tableName: context.pendingCreate.tableName,
      });
      
      // Si el LLM determina que quiere continuar, hacerlo
      if (realIntent === 'continue') {
        const createHandler = this.handlers.find(h => h.constructor.name === 'CreateHandler');
        if (createHandler) {
          context.intent = { hasTableAction: true, actionType: 'create' };
          context.analysis = {
            actionType: 'create',
            tableId: context.pendingCreate.tableId,
            tableName: context.pendingCreate.tableName,
            create: {
              isComplete: false,
              fields: context.collectedFields || context.pendingCreate.fields || {},
            },
          };
          
          const result = await createHandler._askForNextField(context);
          
          if (result.handled) {
            return {
              handled: true,
              response: result.response,
              handler: 'CreateHandler',
              tool: 'create_record',
              mode: 'llm-first',
              continuedFlow: true,
            };
          }
        }
        
        // Fallback
        const tableName = context.pendingCreate.tableName || 'registro';
        const collectedCount = Object.keys(context.collectedFields || context.pendingCreate.fields || {}).length;
        
        return {
          handled: true,
          response: `Continuemos con el registro de tu ${tableName}. Ya tengo ${collectedCount} dato(s). ¿Me podrías dar los datos faltantes?`,
          handler: 'FlowContinueHandler',
          mode: 'llm-first',
        };
      }
      
      // Si el LLM dice que es "cancel", limpiar el flujo
      if (realIntent === 'cancel') {
        context.clearPendingCreate();
        context.savePendingState();
        return {
          handled: true,
          response: 'Operación cancelada. ¿En qué más puedo ayudarte?',
          handler: 'FlowCancelHandler',
          mode: 'llm-first',
        };
      }
      
      // Si es realmente "thanks" (agradecimiento final), responder y recordar el flujo
      if (realIntent === 'thanks') {
        const tableName = context.pendingCreate.tableName || 'registro';
        const collectedCount = Object.keys(context.collectedFields || context.pendingCreate.fields || {}).length;
        
        return {
          handled: true,
          response: `¡De nada! 😊\n\n---\n💡 Recuerda que estábamos registrando tu ${tableName} (tengo ${collectedCount} dato(s)). ¿Continuamos o prefieres dejarlo para después?`,
          handler: 'ThanksWithReminder',
          mode: 'llm-first',
        };
      }
      
      // Otro intent → continuar con el flujo normal de cambio
    }
    
    // Mapear intent a tool
    const intentToTool = {
      'query': 'query_records',
      'search': 'query_records',
      'availability': 'check_availability',
      'thanks': 'general_conversation',
      'greeting': 'general_conversation',
      'help': 'general_conversation',
    };
    
    const tool = intentToTool[newIntent] || 'general_conversation';
    
    // Buscar el handler correspondiente
    const handlerName = this.toolRegistry.mapToLegacyHandler(tool);
    const handler = this.handlers.find(h => h.constructor.name === handlerName);
    
    if (!handler) {
      log.warn('No handler found for new intent', { newIntent, tool, handlerName });
      
      // Fallback: responder de forma inteligente según el intent
      const fallbackResponses = {
        'query': `Entiendo que quieres consultar información. ¿Qué datos te gustaría ver? Tengo estas tablas disponibles: ${context.tables?.map(t => t.name).join(', ') || 'ninguna configurada'}.`,
        'thanks': '¡De nada! ¿Hay algo más en lo que pueda ayudarte?',
        'help': `Puedo ayudarte con: ${context.tables?.map(t => `consultar ${t.name}`).join(', ') || 'responder preguntas'}.`,
      };
      
      let response = fallbackResponses[newIntent] || 'Entendido. ¿En qué puedo ayudarte?';
      
      // Si hay pendingCreate, agregar reminder
      if (context.pendingCreate) {
        const tableName = context.pendingCreate.tableName || 'registro';
        const collectedCount = Object.keys(context.collectedFields || context.pendingCreate.fields || {}).length;
        
        response += `\n\n---\n💡 Recuerda que estábamos registrando tu ${tableName}`;
        if (collectedCount > 0) {
          response += ` (ya tengo ${collectedCount} dato(s))`;
        }
        response += '. ¿Continuamos?';
      }
      
      return {
        handled: true,
        response,
        handler: 'FlowChangeHandler',
        mode: 'llm-first',
        flowChange: true,
        newIntent,
      };
    }
    
    // Configurar contexto para el nuevo intent
    context.intent = { hasTableAction: newIntent !== 'thanks' && newIntent !== 'greeting', actionType: newIntent };
    context.selectedTool = tool;
    
    // Si es query, intentar detectar qué tabla quiere consultar
    if (newIntent === 'query' || newIntent === 'search') {
      context.analysis = {
        actionType: 'query',
        query: { filters: {}, limit: 10 },
      };
      
      // Intentar detectar la tabla del mensaje
      const messageNorm = this._normalizeString(context.message);
      for (const table of (context.tables || [])) {
        const tableNameNorm = this._normalizeString(table.name);
        if (messageNorm.includes(tableNameNorm) || tableNameNorm.includes(messageNorm.split(' ')[0])) {
          context.analysis.tableId = table.id || table._id;
          context.analysis.tableName = table.name;
          break;
        }
      }
    }
    
    log.debug('Executing handler for flow change', { handler: handlerName, tool });
    const result = await handler.execute(context);
    
    if (result.handled) {
      let response = result.response;
      
      // Agregar reminder de pendingCreate si aplica
      if (context.pendingCreate && tool !== 'create_record') {
        const tableName = context.pendingCreate.tableName || 'registro';
        const collectedCount = Object.keys(context.collectedFields || context.pendingCreate.fields || {}).length;
        
        response += `\n\n---\n💡 Recuerda que estábamos registrando tu ${tableName}`;
        if (collectedCount > 0) {
          response += ` (ya tengo ${collectedCount} dato(s))`;
        }
        response += '. ¿Continuamos?';
      }
      
      this.eventEmitter.emit(EVENTS.MESSAGE_PROCESSED, {
        workspaceId: context.workspaceId,
        handler: handlerName,
        tool,
        mode: 'llm-first',
        flowChange: true,
        originalIntent: 'create',
        newIntent,
      });
      
      return {
        handled: true,
        response,
        handler: handlerName,
        tool,
        mode: 'llm-first',
        flowChange: true,
      };
    }
    
    // Si el handler tampoco pudo manejar, dar respuesta genérica inteligente
    log.warn('Handler could not process flow change', { handlerName, newIntent });
    
    let fallbackResponse = 'Entendido. ';
    if (newIntent === 'query') {
      fallbackResponse += `Para consultar datos, dime qué información necesitas. Tengo disponible: ${context.tables?.map(t => t.name).join(', ') || 'información general'}.`;
    } else {
      fallbackResponse += '¿En qué más puedo ayudarte?';
    }
    
    if (context.pendingCreate) {
      const tableName = context.pendingCreate.tableName || 'registro';
      fallbackResponse += `\n\n---\n💡 Recuerda que estábamos registrando tu ${tableName}. ¿Continuamos?`;
    }
    
    return {
      handled: true,
      response: fallbackResponse,
      handler: 'FlowChangeFallback',
      mode: 'llm-first',
    };
  }
  
  /**
   * Construye el array de mensajes para el LLM
   * @private
   */
  _buildMessages(context) {
    const messages = [];
    
    // Agregar historial si existe (ChatService usa "history", no "conversationHistory")
    const history = context.conversationHistory || context.history || [];
    if (history.length > 0) {
      // Limitar a últimos 10 mensajes para no exceder tokens
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      });
    }
    
    // Si hay pendingCreate activo, agregar contexto explícito para el LLM
    if (context.pendingCreate) {
      const tableName = context.pendingCreate.tableName || 'registro';
      const collectedFields = context.collectedFields || context.pendingCreate.fields || {};
      const missingFields = context.pendingCreate.requiredFields?.filter(f => !collectedFields[f]) || [];
      
      const pendingContext = `[SISTEMA] HAY UN FLUJO DE CREACIÓN ACTIVO:
- Tabla: ${tableName}
- Campos ya recolectados: ${JSON.stringify(collectedFields)}
- Campos que FALTAN: ${missingFields.join(', ')}

El siguiente mensaje del usuario probablemente contiene datos para los campos faltantes (${missingFields.join(', ')}).
Si el usuario menciona un producto/servicio con cantidad, esos son DATOS para el registro en proceso, NO una consulta.
USA LA TOOL create_record PARA CONTINUAR LA RECOLECCIÓN DE DATOS.`;

      messages.push({
        role: 'system',
        content: pendingContext,
      });
    }
    
    // Mensaje actual
    messages.push({
      role: 'user',
      content: context.message,
    });
    
    return messages;
  }
  
  /**
   * Obtiene modelo del agente
   * @private
   */
  _getModelFromAgent(agent) {
    const aiModel = agent?.aiModel;
    if (Array.isArray(aiModel) && aiModel.length > 0) {
      const first = aiModel[0];
      return typeof first === 'string' ? first : first?.id || DEFAULT_MODEL;
    }
    return typeof aiModel === 'string' ? aiModel : DEFAULT_MODEL;
  }
  
  /**
   * Utilidades de fecha
   * @private
   */
  _getTodayDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
  
  _getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }
  
  _getDayOfWeek() {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return days[new Date().getDay()];
  }
  
  /**
   * Maneja el caso donde ningún handler puede procesar
   * @private
   */
  _handleNoMatch(context) {
    this.eventEmitter.emit(EVENTS.INTENT_UNKNOWN, {
      workspaceId: context.workspaceId,
      message: context.message,
    });
    
    return {
      handled: false,
      response: null,
    };
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
  return engine;
}

export default ChatEngine;
