/**
 * ChatController Refactorizado
 * 
 * Versión simplificada que delega al ChatService.
 * Mantiene compatibilidad con los endpoints existentes.
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../services/ChatService.js';
import { ImportService } from '../services/ImportService.js';
import { getNotificationService } from '../services/NotificationService.js';
import { TableRepository } from '../repositories/TableRepository.js';
import { connectDB, getChatDbName, getAgentsDbName, getWorkspaceDbName, getTableDataDbName, getWorkspacesDbName } from '../config/db.js';
import { EVENTS } from '../core/EventEmitter.js';
import { executeFlowsForTrigger } from '../services/FlowExecutor.js';
import { getBusinessSnapshot } from '../services/BusinessSnapshot.js';
import { getSocketService } from '../realtime/SocketService.js';
import { replyWhatsApp, replyMessenger, replyInstagram } from './metaWebhookController.js';
import { WorkspaceConfigRepository } from '../config/WorkspaceConfigRepository.js';
import logger from '../config/logger.js';

const log = logger.child('ChatController');
const importService = new ImportService();

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
    
    // Emitir en tiempo real
    const { workspaceId, tableId, record } = data;
    if (workspaceId) getSocketService().emitRecordCreated(workspaceId, tableId, record);

    // Ejecutar flujos automáticos
    try {
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
    
    // Emitir en tiempo real
    const { workspaceId, tableId, record } = data;
    if (workspaceId) getSocketService().emitRecordUpdated(workspaceId, tableId, record);

    // Ejecutar flujos de update
    try {
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
    
    // Extraer datos especiales para el frontend
    const responseData = {
      chatId: result.chatId,
      response: result.response,
      action: result.action,
    };
    
    // Debug: Log completo del result
    log.debug('Chat result data', { 
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
      hasFlowCreated: !!result.data?.flowCreated,
    });
    
    // Incluir flowCreated si existe (para que el frontend actualice la lista de flujos)
    if (result.data?.flowCreated) {
      responseData.flowCreated = result.data.flowCreated;
      log.info('Including flowCreated in response', { flowCreated: result.data.flowCreated });
    }
    
    // Incluir tableCreated si existe
    if (result.data?.tableCreated) {
      responseData.tableCreated = result.data.tableCreated;
    }
    
    res.json(responseData);

    // NOTA: No emitir por socket aquí - el frontend ya recibe la respuesta por HTTP.
    // La emisión por socket solo es útil para mensajes de otros canales (WhatsApp, etc.)
    
  } catch (err) {
    log.error('sendMessage error', { error: err.message });
    
    // Notify AI/agent error
    try {
      await getNotificationService().notifyAgentError(workspaceId, {
        chatId,
        agentId,
        error: err.message,
      });
    } catch (notifyErr) {
      log.warn('Failed to notify agent error', { error: notifyErr.message });
    }
    
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
    
    const chatList = result.docs.map(c => {
      // Calculate unread count: messages after operatorLastReadAt
      const lastReadAt = c.operatorLastReadAt ? new Date(c.operatorLastReadAt).getTime() : 0;
      const unreadCount = (c.messages || []).filter(m => {
        // Only count user messages as unread (not assistant/bot replies)
        if (m.role !== 'user') return false;
        const msgTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
        return msgTime > lastReadAt;
      }).length;
      
      return {
        _id: c._id,
        title: c.title || getFirstMessagePreview(c.messages) || 'Nueva conversación',
        agentId: c.agentId,
        messageCount: c.messages?.length || 0,
        unreadCount,
        lastMessage: c.messages?.slice(-1)[0]?.content?.slice(0, 50) || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastActivityAt: c.updatedAt || c.createdAt,
        ...(c.channel && { channel: c.channel }),
        ...(c.externalRef && { externalRef: c.externalRef }),
        ...(c.senderName && { senderName: c.senderName }),
        ...(c.senderProfilePic && { senderProfilePic: c.senderProfilePic }),
      };
    });
    
    res.json(chatList);
    
  } catch (err) {
    log.error('listChats error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /chat/:workspaceId/:chatId/mark-read
 * 
 * Marca un chat como leído por el operador
 */
export async function markChatRead(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    if (!workspaceId || !chatId) {
      return res.status(400).json({ error: 'workspaceId and chatId required' });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    let chat;
    try {
      chat = await chatDb.get(chatId);
    } catch (e) {
      if (e.status === 404) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      throw e;
    }
    
    chat.operatorLastReadAt = new Date().toISOString();
    await chatDb.insert(chat);
    
    res.json({ success: true, operatorLastReadAt: chat.operatorLastReadAt });
    
  } catch (err) {
    log.error('markChatRead error', { error: err.message });
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

/**
 * POST /chat/reply-external
 *
 * Respuesta manual del operador humano a un chat externo (Messenger/WhatsApp/Instagram).
 * Envía el mensaje directamente a la plataforma sin pasar por el bot de IA.
 *
 * Body: { workspaceId, chatId, message }
 */
export async function replyExternal(req, res) {
  try {
    const { workspaceId, chatId, message } = req.body;

    if (!workspaceId || !chatId || !message?.trim()) {
      return res.status(400).json({ error: 'workspaceId, chatId and message are required' });
    }

    // Cargar el chat para obtener channel y externalRef
    const chatDb = await connectDB(getChatDbName(workspaceId));
    let chat;
    try {
      chat = await chatDb.get(chatId);
    } catch {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.externalRef || !chat.channel) {
      return res.status(400).json({ error: 'This chat is not an external channel chat' });
    }

    // Extraer senderId del externalRef (e.g. "messenger:123456")
    const [platform, senderId] = chat.externalRef.split(':');
    if (!senderId) {
      return res.status(400).json({ error: 'Invalid externalRef format' });
    }

    // Leer config del workspace para obtener tokens
    const configRepo = new WorkspaceConfigRepository(() => getWorkspacesDbName());
    let metaConfig = {};
    try {
      const wsConfig = await configRepo.getConfig(workspaceId);
      metaConfig = wsConfig?.integrations?.meta || {};
    } catch {}

    const text = message.trim();

    // Enviar a la plataforma correspondiente
    if (platform === 'whatsapp') {
      const creds = {
        token: metaConfig.whatsapp?.token || process.env.META_WHATSAPP_TOKEN || '',
        phoneNumberId: metaConfig.whatsapp?.phoneNumberId || process.env.META_WHATSAPP_PHONE_NUMBER_ID || '',
      };
      await replyWhatsApp(senderId, text, creds);
    } else if (platform === 'messenger') {
      const creds = { pageToken: metaConfig.messenger?.pageToken || process.env.META_PAGE_TOKEN || '' };
      await replyMessenger(senderId, text, creds);
    } else if (platform === 'instagram') {
      const creds = { token: metaConfig.instagram?.token || process.env.META_INSTAGRAM_TOKEN || process.env.META_PAGE_TOKEN || '' };
      await replyInstagram(senderId, text, creds);
    } else {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    // Guardar el mensaje en el chat como 'assistant' (operador humano)
    const ts = new Date().toISOString();
    const msgId = `msg_${Date.now()}_operator`;
    chat.messages = chat.messages || [];
    chat.messages.push({
      id: msgId,
      role: 'assistant',
      content: text,
      timestamp: ts,
      isHuman: true,
    });
    chat.updatedAt = ts;
    await chatDb.insert(chat);

    log.info('replyExternal sent', { workspaceId, chatId, platform, senderId: senderId.slice(0, 10) });

    res.json({ success: true, chatId, messageId: msgId });

  } catch (err) {
    log.error('replyExternal error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /chat/import-file
 *
 * Importa un archivo CSV o XLSX directamente desde el chat.
 * El resultado aparece como mensaje del bot en la conversación.
 *
 * Body: { workspaceId, agentId, chatId?, tableId, file: { name, content, encoding } }
 */
export async function importFileInChat(req, res) {
  try {
    const { workspaceId, agentId, chatId: reqChatId, tableId, file } = req.body;

    if (!workspaceId || !tableId || !file?.name || !file?.content) {
      return res.status(400).json({ error: 'workspaceId, tableId and file (name + content) are required' });
    }

    // Validar que la tabla existe
    const tableRepo = new TableRepository();
    const table = await tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return res.status(404).json({ error: `Tabla ${tableId} no encontrada en el workspace` });
    }

    const encoding = file.encoding || 'utf8';

    // Importar el archivo
    const result = await importService.importFile(
      workspaceId, tableId,
      file.content, file.name, encoding,
      null, // auto-map
      { skipErrors: true, validate: true }
    );

    // Invalidar snapshot y refrescar con datos frescos
    let snapshotSummary = '';
    try {
      const freshSnapshot = await getBusinessSnapshot().get(workspaceId, { forceRefresh: true });
      if (freshSnapshot) {
        const lines = freshSnapshot.split('\n').slice(0, 5).join('\n');
        snapshotSummary = `\n\n📊 **Estado actual de ${table.name}:** ${lines}`;
      }
    } catch (_) {}


    // Construir respuesta amigable del bot
    const ext = file.name.split('.').pop().toUpperCase();
    let botReply = `✅ **Importación de ${file.name} completada** → _${table.name}_\n\n`;
    botReply += `- **Importados:** ${result.imported} registros\n`;
    if (result.skipped) botReply += `- **Omitidos:** ${result.skipped} filas vacías\n`;
    if (result.errors?.length) {
      botReply += `- **Errores:** ${result.errors.length} filas con problemas\n`;
      const sample = result.errors.slice(0, 3);
      sample.forEach(e => { botReply += `  • Fila ${e.row}: ${e.reason || e.error}\n`; });
      if (result.errors.length > 3) botReply += `  ... y ${result.errors.length - 3} más\n`;
    }
    botReply += `\nTotal procesado: ${result.total} filas del archivo ${ext}.`;
    botReply += snapshotSummary;

    // Obtener o crear el chat para guardar el intercambio
    const chatDb = await connectDB(getChatDbName(workspaceId));
    let chat;
    let currentChatId = reqChatId;

    if (currentChatId) {
      try { chat = await chatDb.get(currentChatId); } catch (_) {}
    }
    if (!chat) {
      currentChatId = uuidv4();
      chat = {
        _id: currentChatId,
        workspaceId,
        agentId: agentId || '',
        title: `Importar ${file.name}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const ts = new Date().toISOString();
    chat.messages = chat.messages || [];
    chat.messages.push({ id: `msg_${Date.now()}_user`, role: 'user', content: `📎 Importar archivo: **${file.name}**`, timestamp: ts });
    chat.messages.push({ id: `msg_${Date.now()}_assistant`, role: 'assistant', content: botReply, timestamp: ts });
    chat.updatedAt = ts;
    await chatDb.insert(chat);

    log.info('importFileInChat complete', { workspaceId, tableId, imported: result.imported });

    return res.json({
      chatId: currentChatId,
      response: botReply,
      importResult: result,
    });

  } catch (err) {
    log.error('importFileInChat error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
}
/**
 * POST /chat/import-file/preview
 *
 * Genera una previsualización del archivo sin importar nada.
 * El frontend muestra la vista previa como mensaje de bot con botones Confirmar / Cancelar.
 *
 * Body: { workspaceId, tableId, file: { name, content, encoding } }
 */
export async function previewImportInChat(req, res) {
  try {
    const { workspaceId, tableId, file } = req.body;

    if (!workspaceId || !tableId || !file?.name || !file?.content) {
      return res.status(400).json({ error: 'workspaceId, tableId and file (name + content) are required' });
    }

    // Validar que la tabla existe
    const tableRepo = new TableRepository();
    const table = await tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return res.status(404).json({ error: `Tabla ${tableId} no encontrada en el workspace` });
    }

    const encoding = file.encoding || 'utf8';
    const preview = await importService.previewFile(workspaceId, tableId, file.content, file.name, encoding);

    return res.json({
      tableName: table.name,
      ...preview,
    });

  } catch (err) {
    log.error('previewImportInChat error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
}