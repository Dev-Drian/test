/**
 * NotificationRepository - Persistencia de notificaciones en CouchDB
 * 
 * Tipos de notificación:
 *   - meta:message   → Mensaje de WhatsApp/Messenger/Instagram
 *   - flow:completed → Flujo ejecutado exitosamente
 *   - flow:failed    → Flujo falló
 *   - payment:confirmed → Pago confirmado
 *   - agent:error    → Error del agente IA
 *   - system:info    → Notificación del sistema
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository.js';
import { getNotificationsDbName } from '../config/db.js';

export const NOTIFICATION_TYPES = {
  META_MESSAGE: 'meta:message',
  FLOW_COMPLETED: 'flow:completed',
  FLOW_FAILED: 'flow:failed',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  AGENT_ERROR: 'agent:error',
  SYSTEM_INFO: 'system:info',
};

export class NotificationRepository extends BaseRepository {
  constructor() {
    super((workspaceId) => getNotificationsDbName(workspaceId));
  }

  /**
   * Crea una nueva notificación
   * @param {object} data - Datos de la notificación
   * @param {string} workspaceId
   * @returns {Promise<object>}
   */
  async create(data, workspaceId) {
    const notification = {
      _id: data._id || uuidv4(),
      type: 'notification',
      notificationType: data.notificationType || NOTIFICATION_TYPES.SYSTEM_INFO,
      title: data.title || 'Notificación',
      message: data.message || '',
      data: data.data || {},
      // Meta info
      platform: data.platform || null,
      senderId: data.senderId || null,
      senderName: data.senderName || null,
      // Flow/Payment info
      flowId: data.flowId || null,
      flowName: data.flowName || null,
      paymentId: data.paymentId || null,
      amount: data.amount || null,
      // Agente/Chat info
      agentId: data.agentId || null,
      chatId: data.chatId || null,
      // Estado
      read: false,
      dismissed: false,
      priority: data.priority || 'normal', // low, normal, high, urgent
      // Timestamps
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt || null,
    };

    const db = await this.getDb(workspaceId);
    await db.insert(notification);
    return notification;
  }

  /**
   * Lista notificaciones con filtros
   * @param {string} workspaceId
   * @param {object} options - { limit, skip, unreadOnly, types }
   * @returns {Promise<object[]>}
   */
  async list(workspaceId, options = {}) {
    const db = await this.getDb(workspaceId);
    const { limit = 50, skip = 0, unreadOnly = false, types = null } = options;

    const selector = {
      type: 'notification',
      dismissed: { $ne: true },
    };

    if (unreadOnly) {
      selector.read = false;
    }

    if (types && Array.isArray(types) && types.length > 0) {
      selector.notificationType = { $in: types };
    }

    try {
      const result = await db.find({
        selector,
        sort: [{ createdAt: 'desc' }],
        limit,
        skip,
      });
      return result.docs || [];
    } catch (e) {
      // Si falla el índice, usar vista simple
      const all = await db.list({ include_docs: true });
      return (all.rows || [])
        .map(r => r.doc)
        .filter(d => d.type === 'notification' && !d.dismissed)
        .filter(d => !unreadOnly || !d.read)
        .filter(d => !types || types.includes(d.notificationType))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(skip, skip + limit);
    }
  }

  /**
   * Cuenta notificaciones no leídas
   * @param {string} workspaceId
   * @returns {Promise<number>}
   */
  async countUnread(workspaceId) {
    const db = await this.getDb(workspaceId);
    try {
      const result = await db.find({
        selector: {
          type: 'notification',
          read: false,
          dismissed: { $ne: true },
        },
        fields: ['_id'],
        limit: 1000,
      });
      return result.docs?.length || 0;
    } catch (e) {
      const all = await db.list({ include_docs: true });
      return (all.rows || [])
        .map(r => r.doc)
        .filter(d => d.type === 'notification' && !d.read && !d.dismissed)
        .length;
    }
  }

  /**
   * Marca una notificación como leída
   * @param {string} notificationId
   * @param {string} workspaceId
   * @returns {Promise<object>}
   */
  async markRead(notificationId, workspaceId) {
    const db = await this.getDb(workspaceId);
    const doc = await db.get(notificationId);
    doc.read = true;
    doc.readAt = new Date().toISOString();
    await db.insert(doc);
    return doc;
  }

  /**
   * Marca todas las notificaciones como leídas
   * @param {string} workspaceId
   * @returns {Promise<number>} Cantidad marcadas
   */
  async markAllRead(workspaceId) {
    const db = await this.getDb(workspaceId);
    const unread = await this.list(workspaceId, { unreadOnly: true, limit: 500 });
    
    const now = new Date().toISOString();
    const updates = unread.map(n => ({
      ...n,
      read: true,
      readAt: now,
    }));

    if (updates.length > 0) {
      await db.bulk({ docs: updates });
    }
    return updates.length;
  }

  /**
   * Descarta (oculta) una notificación
   * @param {string} notificationId
   * @param {string} workspaceId
   * @returns {Promise<object>}
   */
  async dismiss(notificationId, workspaceId) {
    const db = await this.getDb(workspaceId);
    const doc = await db.get(notificationId);
    doc.dismissed = true;
    doc.dismissedAt = new Date().toISOString();
    await db.insert(doc);
    return doc;
  }

  /**
   * Descarta todas las notificaciones
   * @param {string} workspaceId
   * @returns {Promise<number>}
   */
  async dismissAll(workspaceId) {
    const db = await this.getDb(workspaceId);
    const all = await this.list(workspaceId, { limit: 500 });
    
    const now = new Date().toISOString();
    const updates = all.map(n => ({
      ...n,
      dismissed: true,
      dismissedAt: now,
    }));

    if (updates.length > 0) {
      await db.bulk({ docs: updates });
    }
    return updates.length;
  }

  /**
   * Elimina notificaciones antiguas (cleanup)
   * @param {string} workspaceId
   * @param {number} daysOld - Eliminar más viejas de X días
   * @returns {Promise<number>}
   */
  async cleanup(workspaceId, daysOld = 30) {
    const db = await this.getDb(workspaceId);
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    
    const all = await db.list({ include_docs: true });
    const toDelete = (all.rows || [])
      .map(r => r.doc)
      .filter(d => d.type === 'notification' && d.createdAt < cutoff)
      .map(d => ({ ...d, _deleted: true }));

    if (toDelete.length > 0) {
      await db.bulk({ docs: toDelete });
    }
    return toDelete.length;
  }
}

// Singleton
let _instance = null;
export function getNotificationRepository() {
  if (!_instance) _instance = new NotificationRepository();
  return _instance;
}
