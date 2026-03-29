/**
 * Procesador de mensajes Meta
 * 
 * Contiene la lógica de procesamiento que antes estaba en el webhook.
 * Usado tanto por el worker (cola) como por el procesamiento directo (fallback).
 */
import { getChatService } from '../services/ChatServiceFactory.js';
import { getSocketService } from '../realtime/SocketService.js';
import logger from '../config/logger.js';

const log = logger.child('MetaProcessor');

// Deduplicación simple: evita procesar el mismo mensaje dos veces en 60 segundos
const processedMessages = new Map();
const DEDUP_TTL = 60000; // 60 segundos

function isDuplicate(senderId, text, externalMessageId) {
  const key = externalMessageId
    ? `${senderId}:mid:${externalMessageId}`
    : `${senderId}:${text?.slice(0, 80)}`;
  if (processedMessages.has(key)) {
    log.warn('⚠️ Mensaje duplicado detectado, ignorando', { senderId: senderId?.slice(-4) });
    return true;
  }
  processedMessages.set(key, Date.now());
  return false;
}

// Limpiar mensajes viejos cada minuto
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_TTL) {
      processedMessages.delete(key);
    }
  }
}, 60000);

/**
 * Envía respuesta por el canal correspondiente.
 * Si el texto termina en una línea con URL https de imagen (.jpg, .png, .gif, .webp),
 * envía primero la imagen (Meta la descarga) y luego el resto como texto — útil para catálogo / campo imagen.
 */
async function sendReply(platform, senderId, text, credentials) {
  const { splitTextAndTrailingPublicImageUrl } = await import('../utils/messageUtils.js');
  const {
    replyWhatsApp,
    replyMessenger,
    replyInstagram,
    replyWhatsAppImageByLink,
    replyMessengerImageByLink,
    replyInstagramImageByLink,
  } = await import('../controllers/metaWebhookController.js');

  const { body, imageUrl } = splitTextAndTrailingPublicImageUrl(text);

  if (body) {
    switch (platform) {
      case 'whatsapp':
        await replyWhatsApp(senderId, body, credentials);
        break;
      case 'messenger':
        await replyMessenger(senderId, body, credentials);
        break;
      case 'instagram':
        await replyInstagram(senderId, body, credentials);
        break;
      default:
        log.warn('Plataforma desconocida para reply', { platform });
    }
  }

  if (imageUrl) {
    try {
      switch (platform) {
        case 'whatsapp':
          await replyWhatsAppImageByLink(senderId, imageUrl, credentials, '');
          break;
        case 'messenger':
          await replyMessengerImageByLink(senderId, imageUrl, credentials);
          break;
        case 'instagram':
          await replyInstagramImageByLink(senderId, imageUrl, credentials);
          break;
        default:
          break;
      }
    } catch (e) {
      log.warn('No se pudo enviar imagen adjunta', { platform, error: e.message });
    }
  }

  if (!body && !imageUrl && text) {
    switch (platform) {
      case 'whatsapp':
        await replyWhatsApp(senderId, text, credentials);
        break;
      case 'messenger':
        await replyMessenger(senderId, text, credentials);
        break;
      case 'instagram':
        await replyInstagram(senderId, text, credentials);
        break;
      default:
        log.warn('Plataforma desconocida para reply', { platform });
    }
  }
}

/**
 * Procesa un mensaje de Meta (WhatsApp/Instagram/Messenger)
 * 
 * @param {object} job - Job de BullMQ o { data, id } para procesamiento directo
 * @returns {Promise<object>}
 */
export async function processMetaMessage(job) {
  const { 
    workspaceId, 
    platform, 
    senderId, 
    senderName, 
    text, 
    agentId,
    credentials,
    incomingFile,
    externalMessageId,
  } = job.data;
  
  // Check de deduplicación
  if (isDuplicate(senderId, text, externalMessageId)) {
    return { skipped: true, reason: 'duplicate' };
  }
  
  const startTime = Date.now();
  
  log.info('📨 Procesando mensaje', { 
    jobId: job.id, 
    platform, 
    senderId: senderId?.slice(-4),
    text: text?.slice(0, 50),
  });
  
  try {
    // 1. Obtener servicio de chat (usa factory centralizado)
    const svc = getChatService(workspaceId);
    
    // 2. Procesar con IA
    const result = await svc.processMessage({
      workspaceId,
      chatId: null, // Se crea/busca automáticamente
      agentId,
      message: text,
      metadata: {
        platform,
        senderId,
        senderName: senderName || senderId,
        externalRef: `${platform}:${senderId}`,
        incomingFile: incomingFile || undefined,
      },
    });
    
    // 3. Enviar respuesta al usuario
    if (result?.response) {
      await sendReply(platform, senderId, result.response, credentials);
    }
    
    // 4. Notificar al frontend que el chat está listo
    if (result?.chatId) {
      getSocketService().toWorkspace(workspaceId, 'meta:chat-ready', {
        platform,
        chatId: result.chatId,
        agentId: result.agentId || agentId,
        senderId,
        senderName,
      });
    }
    
    const duration = Date.now() - startTime;
    log.info('✅ Mensaje procesado', { 
      jobId: job.id, 
      chatId: result?.chatId,
      duration: `${duration}ms`,
    });
    
    return { 
      success: true, 
      chatId: result?.chatId,
      duration,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('❌ Error procesando mensaje', { 
      jobId: job.id, 
      error: error.message,
      duration: `${duration}ms`,
    });
    
    // Re-throw para que BullMQ maneje el reintento
    throw error;
  }
}
