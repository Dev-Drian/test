/**
 * TelegramService - Servicio para integración con Telegram Bot API
 * 
 * Permite:
 * - Enviar mensajes a usuarios
 * - Recibir mensajes via webhook
 * - Configurar comandos del bot
 * - Enviar diferentes tipos de contenido (texto, fotos, documentos)
 */

import fetch from 'node-fetch';
import { connectDB } from '../config/db.js';
import logger from '../config/logger.js';
import { ingestTelegramFileToWorkspace } from './channelMediaIngest.js';
import { v4 as uuidv4 } from 'uuid';
import { splitMessageForPlatform } from '../utils/messageUtils.js';

const log = logger.child('TelegramService');

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Obtiene la conexión de Telegram para un workspace
 */
export async function getTelegramConnection(workspaceId) {
  try {
    const db = await connectDB(`workspace_${workspaceId}_integrations`);
    
    const result = await db.find({
      selector: { 
        type: 'integration_connection',
        integrationId: 'telegram'
      },
      limit: 1
    });
    
    if (result.docs?.length > 0) {
      return result.docs[0];
    }
    
    return null;
  } catch (error) {
    log.error('Error getting Telegram connection', { error: error.message });
    return null;
  }
}

/**
 * Envía un mensaje de texto a un chat de Telegram
 * Si el mensaje es muy largo, lo divide en partes
 */
export async function sendMessage(workspaceId, chatId, text, options = {}) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    // Dividir mensaje si es muy largo (usando utilidad global)
    const messageParts = splitMessageForPlatform(text, 'telegram');
    const results = [];
    
    for (let i = 0; i < messageParts.length; i++) {
      const part = messageParts[i];
      
      const body = {
        chat_id: chatId,
        text: part,
        parse_mode: options.parseMode || 'Markdown',
      };
      
      // Solo responder al mensaje original en la primera parte
      if (i === 0 && options.replyToMessageId) {
        body.reply_to_message_id = options.replyToMessageId;
      }
      
      // Agregar botones solo en la última parte
      if (i === messageParts.length - 1 && options.buttons) {
        body.reply_markup = {
          inline_keyboard: options.buttons.map(row => 
            row.map(btn => ({
              text: btn.text,
              callback_data: btn.data || btn.text,
              url: btn.url
            }))
          )
        };
      }
      
      const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        log.error('Telegram API error', { error: result.description, part: i + 1 });
        // Si falla por Markdown, intentar sin parse_mode
        if (result.description?.includes('parse') || result.description?.includes('entities')) {
          body.parse_mode = undefined;
          const retryResponse = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const retryResult = await retryResponse.json();
          if (retryResult.ok) {
            results.push(retryResult.result);
            continue;
          }
        }
        throw new Error(result.description);
      }
      
      results.push(result.result);
      
      // Pequeña pausa entre mensajes para evitar rate limiting
      if (i < messageParts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    log.info('Message sent to Telegram', { workspaceId, chatId, parts: messageParts.length });
    return results.length === 1 ? results[0] : results;
  } catch (error) {
    log.error('Error sending Telegram message', { error: error.message });
    throw error;
  }
}

/**
 * Envía una foto a un chat de Telegram
 */
export async function sendPhoto(workspaceId, chatId, photo, caption = '') {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption,
        parse_mode: 'HTML'
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description);
    }
    
    return result.result;
  } catch (error) {
    log.error('Error sending Telegram photo', { error: error.message });
    throw error;
  }
}

/**
 * Envía un documento a un chat de Telegram
 */
export async function sendDocument(workspaceId, chatId, document, caption = '') {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document,
        caption,
        parse_mode: 'HTML'
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description);
    }
    
    return result.result;
  } catch (error) {
    log.error('Error sending Telegram document', { error: error.message });
    throw error;
  }
}

/**
 * Configura el webhook para recibir mensajes
 */
export async function setWebhook(workspaceId, webhookUrl) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'edited_message']
      })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description);
    }
    
    log.info('Telegram webhook set', { workspaceId, webhookUrl });
    return result;
  } catch (error) {
    log.error('Error setting Telegram webhook', { error: error.message });
    throw error;
  }
}

/**
 * Obtiene información del webhook actual
 */
export async function getWebhookInfo(workspaceId) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/getWebhookInfo`);
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description);
    }
    
    return result.result;
  } catch (error) {
    log.error('Error getting webhook info', { error: error.message });
    throw error;
  }
}

/**
 * Elimina el webhook
 */
export async function deleteWebhook(workspaceId) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    log.info('Telegram webhook deleted', { workspaceId });
    return result;
  } catch (error) {
    log.error('Error deleting Telegram webhook', { error: error.message });
    throw error;
  }
}

/**
 * Procesa un mensaje entrante de Telegram
 */
export async function processIncomingMessage(workspaceId, update) {
  try {
    const message = update.message || update.edited_message;
    const callbackQuery = update.callback_query;
    
    if (callbackQuery) {
      // Procesar click en botón inline
      return await processCallbackQuery(workspaceId, callbackQuery);
    }
    
    if (!message) {
      return null;
    }
    
    const chatId = message.chat.id;
    const userId = message.from.id;
    let text = message.text || message.caption || '';
    const userName = message.from.first_name || message.from.username || 'Usuario';

    const connection = await getTelegramConnection(workspaceId);
    const botToken = connection?.credentials?.token;
    let incomingFile = null;

    if (botToken && message.photo?.length) {
      const largest = message.photo[message.photo.length - 1];
      incomingFile = await ingestTelegramFileToWorkspace({
        workspaceId,
        botToken,
        fileId: largest.file_id,
        originalFilename: 'foto.jpg',
      });
    } else if (botToken && message.document) {
      const doc = message.document;
      incomingFile = await ingestTelegramFileToWorkspace({
        workspaceId,
        botToken,
        fileId: doc.file_id,
        originalFilename: doc.file_name || 'documento',
      });
    }

    if (!String(text).trim() && incomingFile) {
      text = `[Archivo recibido: ${incomingFile.filename}]`;
    }

    if (!String(text).trim() && !incomingFile) {
      return null;
    }
    
    // Guardar/actualizar contacto de Telegram
    const contact = await saveOrUpdateContact(workspaceId, {
      telegramId: userId,
      chatId,
      username: message.from.username,
      firstName: message.from.first_name,
      lastName: message.from.last_name
    });
    
    // Crear mensaje en formato interno
    const internalMessage = {
      id: uuidv4(),
      source: 'telegram',
      chatId: chatId.toString(),
      messageId: message.message_id, // ID del mensaje original para reply
      contactId: contact._id,
      content: text,
      incomingFile: incomingFile || undefined,
      from: {
        id: userId.toString(),
        name: userName,
        username: message.from.username
      },
      timestamp: new Date(message.date * 1000).toISOString(),
      raw: message
    };
    
    log.info('Telegram message received', { 
      workspaceId, 
      chatId, 
      from: userName 
    });
    
    return internalMessage;
  } catch (error) {
    log.error('Error processing Telegram message', { error: error.message });
    throw error;
  }
}

/**
 * Procesa un callback query (click en botón inline)
 */
async function processCallbackQuery(workspaceId, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  // Responder al callback para quitar el "loading"
  const connection = await getTelegramConnection(workspaceId);
  if (connection?.credentials?.token) {
    await fetch(`${TELEGRAM_API}${connection.credentials.token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id
      })
    });
  }
  
  return {
    id: uuidv4(),
    source: 'telegram',
    type: 'callback',
    chatId: chatId.toString(),
    content: data,
    from: {
      id: userId.toString(),
      name: callbackQuery.from.first_name || callbackQuery.from.username
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Guarda o actualiza un contacto de Telegram
 */
async function saveOrUpdateContact(workspaceId, telegramUser) {
  try {
    const db = await connectDB(`chatbot_contacts_${workspaceId}`);
    const contactId = `telegram_${telegramUser.telegramId}`;
    
    try {
      // Intentar obtener contacto existente
      const existing = await db.get(contactId);
      
      // Actualizar datos
      existing.username = telegramUser.username || existing.username;
      existing.firstName = telegramUser.firstName || existing.firstName;
      existing.lastName = telegramUser.lastName || existing.lastName;
      existing.lastMessageAt = new Date().toISOString();
      existing.messageCount = (existing.messageCount || 0) + 1;
      
      await db.insert(existing);
      return existing;
    } catch (e) {
      // No existe, crear nuevo
      const newContact = {
        _id: contactId,
        type: 'contact',
        source: 'telegram',
        telegramId: telegramUser.telegramId,
        chatId: telegramUser.chatId,
        username: telegramUser.username,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        name: `${telegramUser.firstName || ''} ${telegramUser.lastName || ''}`.trim() || telegramUser.username || 'Usuario Telegram',
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        messageCount: 1
      };
      
      await db.insert(newContact);
      return newContact;
    }
  } catch (error) {
    log.error('Error saving Telegram contact', { error: error.message });
    throw error;
  }
}

/**
 * Obtiene información del bot
 */
export async function getBotInfo(workspaceId) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      return null;
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/getMe`);
    const result = await response.json();
    
    if (!result.ok) {
      return null;
    }
    
    return result.result;
  } catch (error) {
    log.error('Error getting bot info', { error: error.message });
    return null;
  }
}

/**
 * Configura los comandos del bot
 */
export async function setCommands(workspaceId, commands) {
  try {
    const connection = await getTelegramConnection(workspaceId);
    if (!connection?.credentials?.token) {
      throw new Error('Bot de Telegram no configurado');
    }
    
    const token = connection.credentials.token;
    
    const response = await fetch(`${TELEGRAM_API}${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands })
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.description);
    }
    
    log.info('Telegram commands set', { workspaceId, count: commands.length });
    return result;
  } catch (error) {
    log.error('Error setting Telegram commands', { error: error.message });
    throw error;
  }
}

/**
 * Obtiene la configuración de Telegram para un workspace
 */
export async function getTelegramConfig(workspaceId) {
  try {
    const db = await connectDB(`workspace_${workspaceId}_integrations`);
    
    const result = await db.find({
      selector: { 
        type: 'telegram_config'
      },
      limit: 1
    });
    
    if (result.docs?.length > 0) {
      return result.docs[0];
    }
    
    return null;
  } catch (error) {
    log.error('Error getting Telegram config', { error: error.message });
    return null;
  }
}

/**
 * Guarda la configuración de Telegram para un workspace
 */
export async function saveTelegramConfig(workspaceId, config) {
  try {
    const db = await connectDB(`workspace_${workspaceId}_integrations`);
    
    // Buscar config existente
    const result = await db.find({
      selector: { type: 'telegram_config' },
      limit: 1
    });
    
    let doc;
    if (result.docs?.length > 0) {
      // Actualizar existente
      doc = {
        ...result.docs[0],
        ...config,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Crear nuevo
      doc = {
        _id: `telegram_config_${Date.now()}`,
        type: 'telegram_config',
        ...config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    await db.insert(doc);
    log.info('Telegram config saved', { workspaceId });
    return doc;
  } catch (error) {
    log.error('Error saving Telegram config', { error: error.message });
    throw error;
  }
}

export default {
  getTelegramConnection,
  sendMessage,
  sendPhoto,
  sendDocument,
  setWebhook,
  deleteWebhook,
  processIncomingMessage,
  getBotInfo,
  setCommands,
  getTelegramConfig,
  saveTelegramConfig
};
