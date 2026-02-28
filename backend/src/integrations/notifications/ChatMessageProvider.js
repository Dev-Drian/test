/**
 * ChatMessageProvider - Inyecta mensajes en chats existentes
 * 
 * Permite que los flujos envíen mensajes a:
 * - El chat que disparó el evento (origin_chat)
 * - Un chat específico por ID
 * - Crear notificación si no hay chat activo
 * 
 * Útil para comunicación entre agentes/bots en el mismo workspace.
 */

import { NotificationProvider } from './NotificationProvider.js';
import { ChatRepository } from '../../repositories/ChatRepository.js';

export class ChatMessageProvider extends NotificationProvider {
  constructor(config = {}) {
    super(config);
    this.chatRepo = new ChatRepository();
    this.db = config.db || null;
  }
  
  get name() {
    return 'chat';
  }
  
  /**
   * Configura la base de datos (para fallback a in_app)
   */
  setDatabase(db) {
    this.db = db;
  }
  
  /**
   * Envía un mensaje a un chat o crea notificación in_app
   * 
   * @param {object} notification
   * @param {string} notification.chatId - ID del chat destino (opcional)
   * @param {string} notification.agentId - ID del agente para crear nuevo chat (opcional)
   * @param {string} notification.message - Contenido del mensaje
   * @param {string} notification.workspaceId - Workspace
   * @param {object} notification.metadata - Datos adicionales
   */
  async send(notification) {
    if (!this.enabled) {
      return { success: false, error: 'Provider disabled' };
    }
    
    const { 
      chatId, 
      agentId, 
      message, 
      workspaceId,
      title,
      metadata = {} 
    } = notification;
    
    if (!workspaceId) {
      return { success: false, error: 'workspaceId required' };
    }
    
    if (!message) {
      return { success: false, error: 'message required' };
    }
    
    try {
      // Caso 1: Inyectar en chat existente
      if (chatId) {
        const chat = await this.chatRepo.addMessage(
          workspaceId, 
          chatId, 
          'assistant', 
          this.formatMessage(message, metadata)
        );
        
        console.log(`[ChatMessageProvider] Injected message to chat ${chatId}`);
        return { 
          success: true, 
          id: chat._id, 
          type: 'chat_injection',
          chatId: chat._id 
        };
      }
      
      // Caso 2: Crear nuevo chat con un agente
      if (agentId) {
        const newChat = await this.chatRepo.create({
          agentId,
          title: title || 'Mensaje automático',
          messages: [{
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: this.formatMessage(message, metadata),
            timestamp: new Date().toISOString(),
          }],
          data: { 
            isAutomated: true,
            source: 'flow',
            ...metadata 
          },
        }, workspaceId);
        
        console.log(`[ChatMessageProvider] Created new chat ${newChat._id} for agent ${agentId}`);
        return { 
          success: true, 
          id: newChat._id, 
          type: 'new_chat',
          chatId: newChat._id 
        };
      }
      
      // Caso 3: Fallback a notificación in_app si no hay chat
      if (this.db) {
        const doc = {
          _id: `notif_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'notification',
          notificationType: 'chat_message',
          title: title || '💬 Nuevo mensaje',
          message: message,
          data: metadata,
          workspaceId,
          read: false,
          createdAt: new Date().toISOString(),
        };
        
        await this.db.insert(doc);
        console.log(`[ChatMessageProvider] Created in_app fallback ${doc._id}`);
        return { 
          success: true, 
          id: doc._id, 
          type: 'in_app_fallback' 
        };
      }
      
      return { 
        success: false, 
        error: 'No chatId, agentId, or db configured' 
      };
      
    } catch (error) {
      console.error('[ChatMessageProvider] Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Formatea el mensaje con metadatos si es necesario
   */
  formatMessage(message, metadata = {}) {
    // Si hay datos del pedido, formatear bonito
    if (metadata.orderId || metadata.tableId) {
      const parts = [message];
      
      if (metadata.tableName) {
        parts.push(`\n📍 Mesa: ${metadata.tableName}`);
      }
      if (metadata.total) {
        parts.push(`💰 Total: $${metadata.total}`);
      }
      if (metadata.items && Array.isArray(metadata.items)) {
        parts.push(`\n📋 Productos:`);
        metadata.items.forEach(item => {
          parts.push(`  • ${item.nombre || item.name} x${item.cantidad || item.quantity || 1}`);
        });
      }
      
      return parts.join('\n');
    }
    
    return message;
  }
  
  /**
   * Envía mensaje directo a un chat específico (helper)
   */
  async sendToChat(workspaceId, chatId, message, metadata = {}) {
    return this.send({
      workspaceId,
      chatId,
      message,
      metadata,
    });
  }
  
  /**
   * Crea un nuevo chat con mensaje para un agente (helper)
   */
  async createChatWithMessage(workspaceId, agentId, message, title, metadata = {}) {
    return this.send({
      workspaceId,
      agentId,
      message,
      title,
      metadata,
    });
  }
}

export default ChatMessageProvider;
