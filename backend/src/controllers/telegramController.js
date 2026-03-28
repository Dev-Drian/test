/**
 * telegramController - Endpoints para integración con Telegram
 * 
 * Maneja:
 * - Webhook para recibir mensajes
 * - Envío de mensajes
 * - Configuración del bot
 */

import * as TelegramService from '../services/TelegramService.js';
import { ChatService } from '../services/ChatService.js';
import { AgentRepository } from '../repositories/AgentRepository.js';
import { ChatRepository } from '../repositories/ChatRepository.js';
import { getSocketService } from '../realtime/SocketService.js';
import { EVENTS } from '../core/EventEmitter.js';
import { executeFlowsForTrigger } from '../services/FlowExecutor.js';
import logger from '../config/logger.js';

const log = logger.child('TelegramController');

// Cache de ChatService por workspaceId
const serviceCache = new Map();

/**
 * Obtiene o crea un ChatService para el workspace.
 */
async function getService(workspaceId) {
  if (serviceCache.has(workspaceId)) return serviceCache.get(workspaceId);
  const svc = new ChatService();
  svc.on(EVENTS.RECORD_CREATED, async ({ workspaceId: wid, tableId, record }) => {
    if (wid) getSocketService().emitRecordCreated(wid, tableId, record);
    if (wid && tableId && record) await executeFlowsForTrigger(wid, 'create', tableId, record).catch(() => {});
  });
  svc.on(EVENTS.RECORD_UPDATED, async ({ workspaceId: wid, tableId, record }) => {
    if (wid) getSocketService().emitRecordUpdated(wid, tableId, record);
    if (wid && tableId && record) await executeFlowsForTrigger(wid, 'update', tableId, record).catch(() => {});
  });
  serviceCache.set(workspaceId, svc);
  return svc;
}

/**
 * Busca el agente configurado para Telegram o el primer agente activo.
 */
async function getDefaultAgentId(workspaceId) {
  try {
    const repo = new AgentRepository();
    
    // 1. Buscar agente configurado en Telegram config
    const telegramConfig = await TelegramService.getTelegramConfig(workspaceId);
    if (telegramConfig?.defaultAgentId) {
      const agent = await repo.findById(telegramConfig.defaultAgentId, workspaceId);
      if (agent && agent.active !== false) {
        log.info('[Telegram] Usando agente configurado', { agentId: agent._id, name: agent.name });
        return agent._id;
      }
      log.warn('[Telegram] Agente configurado no encontrado o inactivo', { defaultAgentId: telegramConfig.defaultAgentId });
    }
    
    // 2. Fallback: primer agente activo
    const agents = await repo.findAll(workspaceId);
    const active = agents.find(a => a.active !== false) || agents[0];
    return active?._id || null;
  } catch (err) {
    log.error('[Telegram] Error buscando agente', { workspaceId, error: err.message });
    return null;
  }
}

/**
 * Busca o crea un chatId para el sender de Telegram.
 */
async function getOrCreateExternalChatId(workspaceId, senderId) {
  try {
    const repo = new ChatRepository();
    const key = `telegram:${senderId}`;
    const chats = await repo.find({ externalRef: key }, {}, workspaceId);
    if (chats.length > 0) return chats[0]._id;
    return null;
  } catch {
    return null;
  }
}

/**
 * Rutea el mensaje al agente del workspace y devuelve la respuesta.
 */
async function dispatchToAgent({ workspaceId, senderId, senderName, text }) {
  const agentId = await getDefaultAgentId(workspaceId);
  if (!agentId) {
    log.warn('[Telegram] No hay agente activo en workspace', { workspaceId });
    return null;
  }

  const chatId = await getOrCreateExternalChatId(workspaceId, senderId);
  const svc = await getService(workspaceId);

  const result = await svc.processMessage({
    workspaceId,
    chatId,
    agentId,
    message: text,
    metadata: {
      platform: 'telegram',
      senderId,
      senderName: senderName || senderId,
      externalRef: `telegram:${senderId}`,
    },
  });

  const responseText = result?.response || result?.message || null;
  const finalChatId = result?.chatId || chatId;

  // Emitir mensajes al socket para actualización en tiempo real
  const socketSvc = getSocketService();
  
  // Emitir mensaje del usuario
  socketSvc.emitNewMessage(workspaceId, finalChatId, {
    id: `user_${Date.now()}`,
    role: 'user',
    content: text,
    senderName: senderName || senderId,
    platform: 'telegram',
    ts: Date.now(),
  });

  // Emitir respuesta del asistente (si hay)
  if (responseText) {
    socketSvc.emitNewMessage(workspaceId, finalChatId, {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: responseText,
      ts: Date.now(),
    });
  }

  return {
    response: responseText,
    chatId: finalChatId,
    agentId,
  };
}

/**
 * POST /api/telegram/webhook/:workspaceId
 * Recibe updates de Telegram (webhook)
 */
export async function handleWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    const update = req.body;
    
    log.debug('Telegram webhook received', { workspaceId, updateId: update.update_id });
    
    // Responder inmediatamente a Telegram
    res.status(200).json({ ok: true });
    
    // Procesar el mensaje de forma asíncrona
    setImmediate(async () => {
      try {
        const message = await TelegramService.processIncomingMessage(workspaceId, update);
        
        if (message && message.content) {
          const senderName = message.from?.name || 'Usuario de Telegram';
          
          log.info('[Telegram] Procesando mensaje', { 
            workspaceId, 
            chatId: message.chatId,
            from: senderName,
            content: message.content?.substring(0, 50) 
          });
          
          // Emitir notificación de nuevo mensaje
          const socketSvc = getSocketService();
          socketSvc.emitNotification(workspaceId, {
            id: `telegram_msg_${Date.now()}`,
            type: 'telegram_message',
            title: 'Nuevo mensaje de Telegram',
            message: `${senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
            channel: 'telegram',
            senderName,
            chatId: message.chatId,
            timestamp: Date.now(),
            read: false
          });
          
          // Enviar al agente de IA
          const result = await dispatchToAgent({
            workspaceId,
            senderId: message.chatId,
            senderName,
            text: message.content,
          });
          
          // Si hay respuesta, enviarla por Telegram (usando reply al mensaje original)
          if (result?.response) {
            await TelegramService.sendMessage(workspaceId, message.chatId, result.response, {
              replyToMessageId: message.messageId // Responde al mensaje original
            });
            log.info('[Telegram] Respuesta enviada', { 
              workspaceId, 
              chatId: message.chatId,
              responseLength: result.response.length 
            });
          }
        }
      } catch (err) {
        log.error('[Telegram] Error procesando mensaje', { error: err.message, stack: err.stack });
      }
    });
  } catch (error) {
    log.error('Webhook error', { error: error.message });
    res.status(200).json({ ok: true }); // Siempre responder 200 a Telegram
  }
}

/**
 * POST /api/telegram/:workspaceId/send
 * Envía un mensaje a un chat de Telegram
 */
export async function sendMessage(req, res) {
  try {
    const { workspaceId } = req.params;
    const { chatId, text, buttons, parseMode } = req.body;
    
    if (!chatId || !text) {
      return res.status(400).json({ error: 'Se requiere chatId y text' });
    }
    
    const result = await TelegramService.sendMessage(workspaceId, chatId, text, {
      buttons,
      parseMode
    });
    
    res.json({ success: true, message: result });
  } catch (error) {
    log.error('Error sending message', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/telegram/:workspaceId/send-photo
 * Envía una foto a un chat de Telegram
 */
export async function sendPhoto(req, res) {
  try {
    const { workspaceId } = req.params;
    const { chatId, photo, caption } = req.body;
    
    if (!chatId || !photo) {
      return res.status(400).json({ error: 'Se requiere chatId y photo (URL)' });
    }
    
    const result = await TelegramService.sendPhoto(workspaceId, chatId, photo, caption);
    
    res.json({ success: true, message: result });
  } catch (error) {
    log.error('Error sending photo', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/telegram/:workspaceId/setup-webhook
 * Configura el webhook de Telegram
 */
export async function setupWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    const { webhookUrl } = req.body;
    
    // Si no se proporciona URL, usar la URL del servidor
    const baseUrl = webhookUrl || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3010}`;
    const fullWebhookUrl = `${baseUrl}/api/telegram/webhook/${workspaceId}`;
    
    const result = await TelegramService.setWebhook(workspaceId, fullWebhookUrl);
    
    res.json({ 
      success: true, 
      webhookUrl: fullWebhookUrl,
      result 
    });
  } catch (error) {
    log.error('Error setting webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/telegram/:workspaceId/webhook
 * Elimina el webhook de Telegram
 */
export async function deleteWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const result = await TelegramService.deleteWebhook(workspaceId);
    
    res.json({ success: true, result });
  } catch (error) {
    log.error('Error deleting webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/telegram/:workspaceId/bot-info
 * Obtiene información del bot y del webhook
 */
export async function getBotInfo(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const botInfo = await TelegramService.getBotInfo(workspaceId);
    
    if (!botInfo) {
      return res.status(404).json({ error: 'Bot no configurado o token inválido' });
    }
    
    // Obtener también info del webhook
    let webhookInfo = null;
    try {
      webhookInfo = await TelegramService.getWebhookInfo(workspaceId);
    } catch (e) {
      log.warn('Could not get webhook info', { error: e.message });
    }
    
    res.json({ 
      success: true, 
      bot: botInfo,
      webhook: webhookInfo
    });
  } catch (error) {
    log.error('Error getting bot info', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/telegram/:workspaceId/set-commands
 * Configura los comandos del bot
 */
export async function setCommands(req, res) {
  try {
    const { workspaceId } = req.params;
    const { commands } = req.body;
    
    if (!commands || !Array.isArray(commands)) {
      return res.status(400).json({ error: 'Se requiere array de commands' });
    }
    
    // Formato: [{ command: 'start', description: 'Iniciar conversación' }]
    const result = await TelegramService.setCommands(workspaceId, commands);
    
    res.json({ success: true, result });
  } catch (error) {
    log.error('Error setting commands', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/telegram/:workspaceId/config
 * Obtiene la configuración de Telegram (agente por defecto, etc)
 */
export async function getConfig(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const config = await TelegramService.getTelegramConfig(workspaceId);
    
    res.json(config || {});
  } catch (error) {
    log.error('Error getting telegram config', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/telegram/:workspaceId/config
 * Guarda la configuración de Telegram (agente por defecto, etc)
 */
export async function saveConfig(req, res) {
  try {
    const { workspaceId } = req.params;
    const { defaultAgentId } = req.body;
    
    await TelegramService.saveTelegramConfig(workspaceId, { defaultAgentId });
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error saving telegram config', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

export default {
  handleWebhook,
  sendMessage,
  sendPhoto,
  setupWebhook,
  deleteWebhook,
  getBotInfo,
  setCommands,
  getConfig,
  saveConfig
};
