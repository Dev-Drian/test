/**
 * telegramController - Endpoints para integración con Telegram
 * 
 * Maneja:
 * - Webhook para recibir mensajes
 * - Envío de mensajes
 * - Configuración del bot
 */

import * as TelegramService from '../services/TelegramService.js';
import logger from '../config/logger.js';

const log = logger.child('TelegramController');

/**
 * POST /api/telegram/webhook/:workspaceId
 * Recibe updates de Telegram (webhook)
 */
export async function handleWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    const update = req.body;
    
    log.debug('Telegram webhook received', { workspaceId, updateId: update.update_id });
    
    // Procesar el mensaje de forma asíncrona
    setImmediate(async () => {
      try {
        const message = await TelegramService.processIncomingMessage(workspaceId, update);
        
        if (message) {
          // Aquí puedes integrar con tu motor de flujos
          // Por ejemplo, disparar un flujo cuando llega un mensaje
          log.info('Message processed', { 
            workspaceId, 
            chatId: message.chatId,
            content: message.content?.substring(0, 50) 
          });
          
          // TODO: Integrar con Engine para procesar el mensaje con flujos
          // await Engine.processIncomingMessage(workspaceId, message);
        }
      } catch (err) {
        log.error('Error processing webhook', { error: err.message });
      }
    });
    
    // Responder inmediatamente a Telegram
    res.status(200).json({ ok: true });
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
 * Obtiene información del bot
 */
export async function getBotInfo(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const botInfo = await TelegramService.getBotInfo(workspaceId);
    
    if (!botInfo) {
      return res.status(404).json({ error: 'Bot no configurado o token inválido' });
    }
    
    res.json({ success: true, bot: botInfo });
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

export default {
  handleWebhook,
  sendMessage,
  sendPhoto,
  setupWebhook,
  deleteWebhook,
  getBotInfo,
  setCommands
};
