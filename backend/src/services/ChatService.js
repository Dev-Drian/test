/**
 * ChatService - Servicio principal de chat
 * 
 * Orquesta todos los componentes para procesar mensajes:
 * - Repositories para acceso a datos
 * - OpenAIProvider para IA
 * - Engine para cadena de responsabilidad
 * - EventEmitter para eventos
 */

import { Engine } from '../core/Engine.js';
import { Context } from '../core/Context.js';
import { EventEmitter, EVENTS } from '../core/EventEmitter.js';
import { ChatRepository } from '../repositories/ChatRepository.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { TableRepository } from '../repositories/TableRepository.js';
import { TableDataRepository } from '../repositories/TableDataRepository.js';
import { EntityRepository } from '../repositories/EntityRepository.js';
import { ActionFactory } from '../domain/actions/ActionFactory.js';
import { ResponseBuilder } from '../domain/responses/ResponseBuilder.js';
import { FieldCollector } from '../domain/fields/FieldCollector.js';
import { OpenAIProvider } from '../integrations/ai/OpenAIProvider.js';

export class ChatService {
  constructor() {
    // Repositories - usan workspaceId en cada llamada
    this.chatRepo = new ChatRepository();
    this.agentRepo = new AgentRepository();
    this.tableRepo = new TableRepository();
    this.tableDataRepo = new TableDataRepository();
    this.entityRepo = new EntityRepository();
    
    // AI Provider
    this.aiProvider = new OpenAIProvider();
    
    // Domain Services
    this.responseBuilder = new ResponseBuilder();
    this.fieldCollector = new FieldCollector({ aiProvider: this.aiProvider, tableRepository: this.tableRepo });
    
    // Inicializar ActionFactory con dependencias
    ActionFactory.initialize({
      tableDataRepository: this.tableDataRepo,
      tableRepository: this.tableRepo,
      entityRepository: this.entityRepo,
      aiProvider: this.aiProvider,
      fieldCollector: this.fieldCollector,
      responseBuilder: this.responseBuilder,
    });
    
    // Events
    this.emitter = new EventEmitter();
    
    // Contextos activos por chat
    this.activeContexts = new Map();
  }
  
  /**
   * Configura el API key de OpenAI
   */
  setApiKey(apiKey) {
    this.aiProvider.setApiKey(apiKey);
  }
  
  /**
   * Suscribe un listener a eventos
   */
  on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  }
  
  /**
   * Procesa un mensaje de chat
   * 
   * @param {object} options
   * @param {string} options.workspaceId - ID del workspace
   * @param {string} options.chatId - ID del chat (null para nuevo)
   * @param {string} options.agentId - ID del agente
   * @param {string} options.message - Mensaje del usuario
   * @param {string} options.apiKey - API key de OpenAI
   * @returns {Promise<{chatId, response, action}>}
   */
  async processMessage({ workspaceId, chatId, agentId, message, apiKey }) {
    console.log('[ChatService] processMessage:', { workspaceId, chatId, agentId, message: message?.slice(0, 50) });
    
    // Configurar API key
    if (apiKey) {
      this.setApiKey(apiKey);
    }
    
    // Obtener o crear chat
    let chat = chatId 
      ? await this.chatRepo.findById(chatId, workspaceId)
      : null;
    
    if (!chat) {
      console.log('[ChatService] Creating new chat');
      chat = await this.chatRepo.create({
        agentId,
        messages: [],
      }, workspaceId);
      chatId = chat._id;
    }
    
    // Cargar agente
    const agent = await this.agentRepo.findById(agentId, workspaceId);
    if (!agent) {
      console.error('[ChatService] Agent not found:', agentId);
      throw new Error(`Agent not found: ${agentId}`);
    }
    console.log('[ChatService] Agent loaded:', agent.name);
    
    // Obtener o crear contexto
    let context = this.activeContexts.get(chatId);
    if (!context) {
      context = new Context({
        chatId,
        workspaceId,
        agentId,
        agent,
      });
      this.activeContexts.set(chatId, context);
    }
    
    // Asignar chat y cargar estado pendiente
    context.chat = chat;
    context.loadPendingState();
    
    // Actualizar mensaje actual
    context.setCurrentMessage(message);
    
    // Cargar tablas del agente y asignar a propiedades del contexto
    const tables = await this._getAgentTables(agent, workspaceId);
    context.tables = tables;
    context.tablesInfo = tables;
    
    // Cargar datos de cada tabla para que el LLM pueda responder preguntas
    const tablesDataWithContent = await Promise.all(tables.map(async (t) => {
      try {
        const data = await this.tableDataRepo.findAll(workspaceId, t._id, { limit: 50 });
        return { 
          tableName: t.name, 
          tableId: t._id,
          headers: (t.headers || []).map(h => h.key || h.label),
          data: data || [],
        };
      } catch (e) {
        console.error(`[ChatService] Error loading data for table ${t.name}:`, e.message);
        return { 
          tableName: t.name, 
          tableId: t._id,
          headers: (t.headers || []).map(h => h.key || h.label),
          data: [],
        };
      }
    }));
    context.tablesData = tablesDataWithContent;
    context.setMetadata('tables', tables);
    
    // Actualizar token y agente en cada llamada
    context.token = apiKey || process.env.OPENAI_API_KEY || '';
    context.agent = agent;
    context.history = chat.messages || [];
    
    // ─── DETECTAR INTENCIÓN ───────────────────────────────────
    console.log('[ChatService] Detecting intent...');
    const tablesInfo = tables.map(t => ({
      id: t._id,
      name: t.name,
      type: t.type,
      fields: (t.headers || []).map(h => h.key || h.label),
    }));
    
    const intent = await this.aiProvider.detectIntent(message, agent);
    console.log('[ChatService] Intent detected:', intent);
    context.intent = intent;
    
    // Limpiar analysis anterior para evitar datos stale
    context.analysis = null;
    
    // Si hay acción sobre tablas, analizar el mensaje para extraer datos
    if (intent.hasTableAction && intent.actionType) {
      console.log('[ChatService] Analyzing message for', intent.actionType);
      const analysis = await this.aiProvider.analyzeMessage(
        message, 
        tablesInfo, 
        intent.actionType,
        context.dateContext,
        agent
      );
      console.log('[ChatService] Analysis:', JSON.stringify(analysis, null, 2));
      context.analysis = analysis;
    }
    
    // Crear engine con handlers
    const engine = new Engine();
    const handlers = ActionFactory.createAll();
    console.log('[ChatService] Handlers:', handlers.map(h => h.constructor.name));
    handlers.forEach(h => engine.addHandler(h));
    
    // Procesar
    console.log('[ChatService] Processing message with engine...');
    const result = await engine.process(context);
    console.log('[ChatService] Engine result:', { handled: result.handled, handler: result.handler });
    
    // Guardar estado pendiente (pendingCreate, etc.) en el chat
    if (context.chat) {
      await this.chatRepo.save(workspaceId, context.chat);
    }
    
    // Guardar mensaje del usuario
    await this.chatRepo.addMessage(workspaceId, chatId, 'user', message);
    
    // Guardar respuesta
    const responseContent = result.response || 'No se pudo procesar tu mensaje.';
    await this.chatRepo.addMessage(workspaceId, chatId, 'assistant', responseContent);
    console.log('[ChatService] Messages saved');
    
    // Generar título si es nuevo chat
    if (!chat.title) {
      const title = await this.aiProvider.generateChatTitle(message, responseContent);
      if (title) {
        await this.chatRepo.updateTitle(workspaceId, chatId, title);
      }
    }
    
    // Emitir eventos según la acción
    this._emitActionEvents(result, context);
    
    return {
      chatId,
      response: responseContent,
      action: result.actionType,
      data: result.data,
    };
  }
  
  /**
   * Continúa un flujo de creación con datos adicionales
   */
  async continueCreation({ chatId, message, apiKey }) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
    
    const context = this.activeContexts.get(chatId);
    if (!context || !context.hasPendingCreate()) {
      return { error: 'No hay creación pendiente' };
    }
    
    context.setCurrentMessage(message);
    
    // Recargar tablas
    const agent = context.get('agent');
    const workspaceId = context.get('workspaceId');
    const tables = await this._getAgentTables(agent, workspaceId);
    context.setMetadata('tables', tables);
    
    // Procesar con el CreateHandler
    const engine = new Engine();
    const handlers = ActionFactory.createAll();
    handlers.forEach(h => engine.addHandler(h));
    
    const result = await engine.process(context);
    
    // Guardar mensajes
    await this.chatRepo.addMessage(workspaceId, chatId, 'user', message);
    await this.chatRepo.addMessage(workspaceId, chatId, 'assistant', result.response);
    
    // Emitir eventos
    this._emitActionEvents(result, context);
    
    return {
      chatId,
      response: result.response,
      action: result.actionType,
      data: result.data,
    };
  }
  
  /**
   * Confirma una actualización pendiente
   */
  async confirmUpdate({ chatId, confirm, apiKey }) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
    
    const context = this.activeContexts.get(chatId);
    if (!context) {
      return { error: 'No hay contexto activo' };
    }
    
    const pending = context.getMetadata('pendingUpdate');
    if (!pending) {
      return { error: 'No hay actualización pendiente' };
    }
    
    if (!confirm) {
      context.deleteMetadata('pendingUpdate');
      return { response: 'Operación cancelada.' };
    }
    
    // Ejecutar la actualización
    const { tableId, recordId, actionType, data } = pending;
    
    if (actionType === 'delete') {
      await this.tableDataRepo.delete(tableId, recordId);
      this.emitter.emit(EVENTS.RECORD_DELETED, { tableId, recordId, context });
    } else {
      await this.tableDataRepo.update(tableId, recordId, data);
      this.emitter.emit(EVENTS.RECORD_UPDATED, { tableId, recordId, data, context });
    }
    
    context.deleteMetadata('pendingUpdate');
    
    const response = actionType === 'delete' 
      ? 'Registro eliminado correctamente.'
      : 'Registro actualizado correctamente.';
    
    const workspaceId = context.get('workspaceId');
    await this.chatRepo.addMessage(workspaceId, chatId, 'assistant', response);
    
    return { response, action: actionType };
  }
  
  /**
   * Obtiene el historial de un chat
   */
  async getChatHistory(workspaceId, chatId) {
    const chat = await this.chatRepo.findById(chatId, workspaceId);
    return chat?.messages || [];
  }
  
  /**
   * Lista chats de un workspace/agente
   */
  async listChats(workspaceId, agentId = null) {
    return this.chatRepo.findByWorkspace(workspaceId, agentId);
  }
  
  /**
   * Limpia el contexto de un chat
   */
  clearContext(chatId) {
    this.activeContexts.delete(chatId);
  }
  
  /**
   * Obtiene estadísticas
   */
  async getStats(workspaceId) {
    const [chats, agents, tables] = await Promise.all([
      this.chatRepo.findByWorkspace(workspaceId),
      this.agentRepo.findByWorkspace(workspaceId),
      this.tableRepo.findByWorkspace(workspaceId),
    ]);
    
    return {
      totalChats: chats.length,
      totalAgents: agents.length,
      totalTables: tables.length,
    };
  }
  
  // ─── Private Methods ────────────────────────────────────────
  
  async _getAgentTables(agent, workspaceId) {
    const tableIds = agent.tables || [];
    if (!tableIds.length) {
      return this.tableRepo.findAll(workspaceId);
    }
    
    // Normalizar IDs - pueden ser strings o objetos {id, tableId, title}
    const normalizedIds = tableIds.map(t => {
      if (typeof t === 'string') return t;
      return t?.id || t?.tableId;
    }).filter(Boolean);
    
    if (!normalizedIds.length) {
      return this.tableRepo.findAll(workspaceId);
    }
    
    const tables = await Promise.all(
      normalizedIds.map(id => this.tableRepo.findById(id, workspaceId))
    );
    
    return tables.filter(Boolean);
  }
  
  _emitActionEvents(result, context) {
    const { actionType, data } = result;
    
    switch (actionType) {
      case 'create':
        if (data?.recordId) {
          this.emitter.emit(EVENTS.RECORD_CREATED, { 
            tableId: data.tableId,
            recordId: data.recordId,
            record: data.record,
            context,
          });
        }
        break;
        
      case 'update':
        if (data?.recordId) {
          this.emitter.emit(EVENTS.RECORD_UPDATED, {
            tableId: data.tableId,
            recordId: data.recordId,
            changes: data.changes,
            context,
          });
        }
        break;
        
      case 'delete':
        if (data?.recordId) {
          this.emitter.emit(EVENTS.RECORD_DELETED, {
            tableId: data.tableId,
            recordId: data.recordId,
            context,
          });
        }
        break;
        
      case 'query':
        this.emitter.emit(EVENTS.QUERY_EXECUTED, {
          tableId: data?.tableId,
          results: data?.results,
          context,
        });
        break;
    }
    
    // Siempre emitir mensaje procesado
    this.emitter.emit(EVENTS.MESSAGE_PROCESSED, { result, context });
  }
}

// Factory function
export function createChatService(db) {
  return new ChatService(db);
}

export default ChatService;
