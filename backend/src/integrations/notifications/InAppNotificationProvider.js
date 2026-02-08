/**
 * InAppNotificationProvider - Notificaciones dentro de la aplicación
 * 
 * Almacena notificaciones en la base de datos para mostrarlas en el frontend.
 * Soporta: tiempo real via polling/websockets, historial, marcado como leído.
 */

import { NotificationProvider } from './NotificationProvider.js';

export class InAppNotificationProvider extends NotificationProvider {
  constructor(config = {}) {
    super(config);
    this.db = config.db || null;
  }
  
  get name() {
    return 'in_app';
  }
  
  /**
   * Configura la base de datos
   */
  setDatabase(db) {
    this.db = db;
  }
  
  /**
   * Envía (almacena) una notificación
   */
  async send(notification) {
    if (!this.enabled) {
      return { success: false, error: 'Provider disabled' };
    }
    
    if (!this.db) {
      console.warn('[InAppNotification] No database configured');
      return { success: false, error: 'No database configured' };
    }
    
    try {
      const doc = {
        _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'notification',
        notificationType: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        recipient: notification.recipient || {},
        workspaceId: notification.workspaceId,
        read: false,
        createdAt: new Date().toISOString(),
      };
      
      await this.db.insert(doc);
      
      console.log(`[InAppNotification] Created: ${doc._id} - ${notification.title}`);
      
      return { success: true, id: doc._id };
      
    } catch (error) {
      console.error('[InAppNotification] Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtiene notificaciones no leídas
   */
  async getUnread(workspaceId, limit = 50) {
    if (!this.db) return [];
    
    try {
      const result = await this.db.find({
        selector: {
          type: 'notification',
          workspaceId,
          read: false,
        },
        sort: [{ createdAt: 'desc' }],
        limit,
      });
      
      return result.docs;
    } catch (error) {
      console.error('[InAppNotification] getUnread error:', error);
      return [];
    }
  }
  
  /**
   * Obtiene todas las notificaciones
   */
  async getAll(workspaceId, options = {}) {
    if (!this.db) return [];
    
    const { limit = 100, skip = 0 } = options;
    
    try {
      const result = await this.db.find({
        selector: {
          type: 'notification',
          workspaceId,
        },
        sort: [{ createdAt: 'desc' }],
        limit,
        skip,
      });
      
      return result.docs;
    } catch (error) {
      console.error('[InAppNotification] getAll error:', error);
      return [];
    }
  }
  
  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId) {
    if (!this.db) return false;
    
    try {
      const doc = await this.db.get(notificationId);
      doc.read = true;
      doc.readAt = new Date().toISOString();
      await this.db.insert(doc);
      return true;
    } catch (error) {
      console.error('[InAppNotification] markAsRead error:', error);
      return false;
    }
  }
  
  /**
   * Marca todas como leídas
   */
  async markAllAsRead(workspaceId) {
    const unread = await this.getUnread(workspaceId, 1000);
    
    const now = new Date().toISOString();
    const updates = unread.map(doc => ({
      ...doc,
      read: true,
      readAt: now,
    }));
    
    if (updates.length > 0) {
      await this.db.bulk({ docs: updates });
    }
    
    return updates.length;
  }
  
  /**
   * Elimina notificaciones antiguas
   */
  async cleanup(workspaceId, daysOld = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    
    try {
      const result = await this.db.find({
        selector: {
          type: 'notification',
          workspaceId,
          createdAt: { $lt: cutoff.toISOString() },
        },
        limit: 1000,
      });
      
      if (result.docs.length > 0) {
        const toDelete = result.docs.map(doc => ({
          ...doc,
          _deleted: true,
        }));
        await this.db.bulk({ docs: toDelete });
      }
      
      return result.docs.length;
    } catch (error) {
      console.error('[InAppNotification] cleanup error:', error);
      return 0;
    }
  }
  
  /**
   * Cuenta notificaciones no leídas
   */
  async countUnread(workspaceId) {
    const unread = await this.getUnread(workspaceId, 1000);
    return unread.length;
  }
}

export default InAppNotificationProvider;
