/**
 * ChatRepository - Repositorio para operaciones de chat
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository.js';
import { getChatDbName } from '../config/db.js';

export class ChatRepository extends BaseRepository {
  constructor() {
    super((workspaceId) => getChatDbName(workspaceId));
  }
  
  /**
   * Busca un chat por ID
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @returns {Promise<object|null>}
   */
  async findById(chatId, workspaceId) {
    return super.findById(chatId, workspaceId);
  }
  
  /**
   * Busca chats por agente
   * @param {string} workspaceId 
   * @param {string} agentId 
   * @param {object} options 
   * @returns {Promise<object[]>}
   */
  async findByAgent(workspaceId, agentId, options = {}) {
    return this.find({ agentId }, options, workspaceId);
  }
  
  /**
   * Crea un nuevo chat
   * @param {string} workspaceId 
   * @param {object} data 
   * @returns {Promise<object>}
   */
  async create(data, workspaceId) {
    const chat = {
      _id: data._id || uuidv4(),
      agentId: data.agentId,
      title: data.title || 'Nueva conversación',
      messages: data.messages || [],
      data: data.data || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const db = await this.getDb(workspaceId);
    await db.insert(chat);
    return chat;
  }
  
  /**
   * Agrega un mensaje al chat
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @param {string} role 
   * @param {string} content 
   * @returns {Promise<object>}
   */
  async addMessage(workspaceId, chatId, role, content) {
    const chat = await this.findById(chatId, workspaceId);
    if (!chat) throw new Error('Chat not found');
    
    chat.messages = chat.messages || [];
    chat.messages.push({
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    chat.updatedAt = new Date().toISOString();
    
    const db = await this.getDb(workspaceId);
    await db.insert(chat);
    return chat;
  }
  
  /**
   * Actualiza el título del chat
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @param {string} title 
   * @returns {Promise<object>}
   */
  async updateTitle(workspaceId, chatId, title) {
    return this.update(chatId, { title }, workspaceId);
  }
  
  /**
   * Guarda el estado del chat (mensajes + data)
   * @param {string} workspaceId 
   * @param {object} chat - Documento del chat completo
   * @returns {Promise<object>}
   */
  async save(workspaceId, chat) {
    chat.updatedAt = new Date().toISOString();
    const db = await this.getDb(workspaceId);
    await db.insert(chat);
    return chat;
  }
  
  /**
   * Obtiene los mensajes recientes de un chat
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @param {number} limit 
   * @returns {Promise<object[]>}
   */
  async getRecentMessages(workspaceId, chatId, limit = 10) {
    const chat = await this.findById(chatId, workspaceId);
    if (!chat) return [];
    
    const messages = chat.messages || [];
    return messages.slice(-limit);
  }
  
  /**
   * Limpia el estado pendiente del chat
   * @param {string} workspaceId 
   * @param {string} chatId 
   * @param {string[]} keys - Claves a eliminar de data (ej: ['pendingCreate', 'pendingRelation'])
   * @returns {Promise<object>}
   */
  async clearPendingState(workspaceId, chatId, keys = ['pendingCreate', 'pendingRelation', 'pendingConfirmation']) {
    const chat = await this.findById(chatId, workspaceId);
    if (!chat) return null;
    
    chat.data = chat.data || {};
    keys.forEach(key => delete chat.data[key]);
    
    return this.save(workspaceId, chat);
  }
}

// Singleton
let instance = null;

export function getChatRepository() {
  if (!instance) {
    instance = new ChatRepository();
  }
  return instance;
}

export default ChatRepository;
