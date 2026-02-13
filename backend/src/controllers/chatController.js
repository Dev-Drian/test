/**
 * ChatController Refactorizado
 * 
 * Versión simplificada que delega al ChatService.
 * Mantiene compatibilidad con los endpoints existentes.
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../services/ChatService.js';
import { connectDB, getChatDbName, getAgentsDbName, getWorkspaceDbName, getTableDataDbName } from '../config/db.js';
import { EVENTS } from '../core/EventEmitter.js';
import { executeFlowsForTrigger } from '../services/FlowExecutor.js';
import logger from '../config/logger.js';

const log = logger.child('ChatController');

// Cache de servicios por workspace
const serviceCache = new Map();

/**
 * Obtiene o crea la instancia del ChatService para un workspace
 */
async function getService(workspaceId) {
  if (serviceCache.has(workspaceId)) {
    return serviceCache.get(workspaceId);
  }
  
  // ChatService crea sus propios repositorios que se conectan bajo demanda
  const service = new ChatService();
  
  // Registrar listeners para eventos (notificaciones, etc.)
  setupEventListeners(service);
  
  serviceCache.set(workspaceId, service);
  return service;
}

/**
 * Configura listeners de eventos
 */
function setupEventListeners(service) {
  
  service.on(EVENTS.RECORD_CREATED, async (data) => {
    log.info('Record created', { recordId: data.record?._id || data.recordId });
    
    // Ejecutar flujos automáticos
    try {
      const { workspaceId, tableId, record } = data;
      if (workspaceId && tableId && record) {
        const flowResult = await executeFlowsForTrigger(workspaceId, 'create', tableId, record);
        log.debug('Flows executed', { count: flowResult.executed });
      }
    } catch (error) {
      log.error('Error executing flows', { error: error.message });
    }
  });
  
  service.on(EVENTS.RECORD_UPDATED, async (data) => {
    log.info('Record updated', { recordId: data.record?._id || data.recordId });
    
    // Ejecutar flujos de update
    try {
      const { workspaceId, tableId, record } = data;
      if (workspaceId && tableId && record) {
        const flowResult = await executeFlowsForTrigger(workspaceId, 'update', tableId, record);
        log.debug('Update flows executed', { count: flowResult.executed });
      }
    } catch (error) {
      log.error('Error executing update flows', { error: error.message });
    }
  });
  
  service.on(EVENTS.RECORD_DELETED, async (data) => {
    log.info('Record deleted', { recordId: data.recordId });
  });
}

/**
 * POST /chat/send
 * 
 * Envía un mensaje al chat
 */
export async function sendMessage(req, res) {
  try {
    const { 
      workspaceId, 
      chatId, 
      agentId, 
      message, 
      token,
    } = req.body;
    
    // Validaciones
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    
    const service = await getService(workspaceId);
    
    const result = await service.processMessage({
      workspaceId,
      chatId: chatId || null,
      agentId,
      message: message.trim(),
      apiKey: token || process.env.OPENAI_API_KEY,
    });
    
    res.json({
      chatId: result.chatId,
      response: result.response,
      action: result.action,
    });
    
  } catch (err) {
    log.error('sendMessage error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /chat/get-or-create
 * 
 * Obtiene un chat existente o crea uno nuevo
 */
export async function getOrCreateChat(req, res) {
  try {
    const { workspaceId, agentId, chatId } = req.query;
    
    if (!workspaceId || !agentId) {
      return res.status(400).json({ error: 'workspaceId and agentId required' });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const agentsDb = await connectDB(getAgentsDbName(workspaceId));
    
    // Cargar agente
    const agent = await agentsDb.get(agentId).catch(() => null);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Buscar o crear chat
    let chat;
    if (chatId) {
      chat = await chatDb.get(chatId).catch(() => null);
    }
    
    if (!chat) {
      const now = new Date().toISOString();
      chat = {
        _id: uuidv4(),
        type: 'chat',
        workspaceId,
        agentId,
        messages: [],
        title: null,
        createdAt: now,
        updatedAt: now,
      };
      await chatDb.insert(chat);
    }
    
    res.json({ 
      chat,
      agent: {
        _id: agent._id,
        name: agent.name,
        avatar: agent.avatar,
        description: agent.description,
      },
    });
    
  } catch (err) {
    log.error('getOrCreateChat error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /chat/list
 * 
 * Lista los chats de un workspace/agente
 */
export async function listChats(req, res) {
  try {
    const { workspaceId, agentId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId required' });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    
    // Crear índice para ordenar si no existe
    try {
      await chatDb.createIndex({ index: { fields: ['updatedAt'] } });
    } catch (e) {
      // Índice ya existe o error - continuar
    }
    
    const result = await chatDb.find({
      selector: { 
        type: 'chat',
        ...(agentId ? { agentId } : {}),
      },
      sort: [{ updatedAt: 'desc' }],
      limit: 100,
    });
    
    const chatList = result.docs.map(c => ({
      _id: c._id,
      title: c.title || getFirstMessagePreview(c.messages) || 'Nueva conversación',
      agentId: c.agentId,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.slice(-1)[0]?.content?.slice(0, 50) || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    
    res.json(chatList);
    
  } catch (err) {
    log.error('listChats error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /chat/:workspaceId/:chatId
 * 
 * Elimina un chat
 */
export async function deleteChat(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    if (!workspaceId || !chatId) {
      return res.status(400).json({ error: 'workspaceId and chatId required' });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const chat = await chatDb.get(chatId).catch(() => null);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    await chatDb.destroy(chat._id, chat._rev);
    
    // Limpiar contexto si existe
    const service = await getService(workspaceId);
    service.clearContext(chatId);
    
    res.json({ success: true, message: 'Chat deleted' });
    
  } catch (err) {
    log.error('deleteChat error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /chat/:workspaceId/:chatId/rename
 * 
 * Renombra un chat
 */
export async function renameChat(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    const { title } = req.body;
    
    if (!workspaceId || !chatId) {
      return res.status(400).json({ error: 'workspaceId and chatId required' });
    }
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title required' });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const chat = await chatDb.get(chatId).catch(() => null);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    chat.title = title.trim();
    chat.updatedAt = new Date().toISOString();
    await chatDb.insert(chat);
    
    res.json({ success: true, chat });
    
  } catch (err) {
    log.error('renameChat error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function getFirstMessagePreview(messages) {
  if (!messages?.length) return null;
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return null;
  const content = firstUserMsg.content || '';
  return content.length > 40 ? content.slice(0, 40) + '...' : content;
}
