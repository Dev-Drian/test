/**
 * NotificationService — Servicio central de notificaciones
 * 
 * Responsabilidades:
 * - Crear/persistir notificaciones en BD
 * - Emitir eventos via WebSocket
 * - Generar títulos/mensajes según el tipo
 * 
 * Uso:
 *   import { getNotificationService, NOTIF } from '../services/NotificationService.js';
 *   
 *   // Notificar pago
 *   await getNotificationService().notify(workspaceId, {
 *     type: NOTIF.PAYMENT_CONFIRMED,
 *     amount: 50000,
 *     payerEmail: 'cliente@email.com',
 *   });
 */

import { getNotificationRepository, NOTIFICATION_TYPES } from '../repositories/NotificationRepository.js';
import { getSocketService } from '../realtime/SocketService.js';
import logger from '../config/logger.js';

const log = logger.child('NotificationService');

// Re-exportar tipos para conveniencia
export const NOTIF = NOTIFICATION_TYPES;

class NotificationService {
  constructor() {
    this.repo = getNotificationRepository();
  }

  /**
   * Crea y emite una notificación
   * @param {string} workspaceId
   * @param {object} options
   * @returns {Promise<object>} La notificación creada
   */
  async notify(workspaceId, options) {
    const {
      type,
      title,
      message,
      data = {},
      priority = 'normal',
      // Campos específicos según tipo
      platform,
      senderId,
      senderName,
      text,
      flowId,
      flowName,
      nodesExecuted,
      error,
      paymentId,
      amount,
      currency,
      payerEmail,
      recordId,
      tableId,
      agentId,
      chatId,
    } = options;

    // Generar título y mensaje si no se proporcionan
    const { generatedTitle, generatedMessage } = this._generateContent(type, options);

    const notificationData = {
      notificationType: type,
      title: title || generatedTitle,
      message: message || generatedMessage,
      data: {
        ...data,
        text,
        nodesExecuted,
        error,
        currency,
        recordId,
        tableId,
      },
      priority,
      platform,
      senderId,
      senderName,
      flowId,
      flowName,
      paymentId,
      amount,
      agentId,
      chatId,
    };

    // Persistir en BD
    let notification;
    try {
      notification = await this.repo.create(notificationData, workspaceId);
      log.info('Notification created', { 
        workspaceId, 
        type, 
        id: notification._id,
      });
    } catch (err) {
      log.error('Failed to persist notification', { error: err.message, workspaceId, type });
      // Aún así emitir por socket
      notification = { ...notificationData, _id: `temp_${Date.now()}`, createdAt: new Date().toISOString() };
    }

    // Emitir por WebSocket
    try {
      getSocketService().toWorkspace(workspaceId, 'notification:new', {
        notification: {
          id: notification._id,
          type: notification.notificationType,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          platform: notification.platform,
          senderName: notification.senderName,
          flowName: notification.flowName,
          amount: notification.amount,
          createdAt: notification.createdAt,
        },
      });
    } catch (err) {
      log.error('Failed to emit notification', { error: err.message });
    }

    return notification;
  }

  /**
   * Genera título y mensaje según el tipo de notificación
   * @private
   */
  _generateContent(type, options) {
    switch (type) {
      case NOTIF.META_MESSAGE:
        return {
          generatedTitle: `Mensaje de ${options.senderName || 'Contacto'}`,
          generatedMessage: options.text?.slice(0, 100) || 'Nuevo mensaje recibido',
        };

      case NOTIF.FLOW_COMPLETED:
        return {
          generatedTitle: `Flujo completado`,
          generatedMessage: `"${options.flowName || 'Flujo'}" ejecutado correctamente (${options.nodesExecuted || 0} pasos)`,
        };

      case NOTIF.FLOW_FAILED:
        return {
          generatedTitle: `Error en flujo`,
          generatedMessage: `"${options.flowName || 'Flujo'}" falló: ${options.error?.slice(0, 80) || 'Error desconocido'}`,
        };

      case NOTIF.PAYMENT_CONFIRMED:
        const formattedAmount = new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: options.currency || 'COP',
          minimumFractionDigits: 0,
        }).format((options.amount || 0) / 100);
        return {
          generatedTitle: `Pago confirmado`,
          generatedMessage: `${formattedAmount} de ${options.payerEmail || 'cliente'}`,
        };

      case NOTIF.AGENT_ERROR:
        return {
          generatedTitle: `Error del asistente`,
          generatedMessage: options.error?.slice(0, 100) || 'El asistente no pudo procesar la solicitud',
        };

      case NOTIF.SYSTEM_INFO:
      default:
        return {
          generatedTitle: options.title || 'Notificación',
          generatedMessage: options.message || '',
        };
    }
  }

  // ── Helpers para tipos comunes ────────────────────────────────────────────

  /**
   * Notifica mensaje de canal externo (Meta)
   */
  async notifyMetaMessage(workspaceId, { platform, senderId, senderName, text }) {
    return this.notify(workspaceId, {
      type: NOTIF.META_MESSAGE,
      platform,
      senderId,
      senderName,
      text,
      priority: 'high',
    });
  }

  /**
   * Notifica flujo completado
   */
  async notifyFlowCompleted(workspaceId, { flowId, flowName, nodesExecuted }) {
    return this.notify(workspaceId, {
      type: NOTIF.FLOW_COMPLETED,
      flowId,
      flowName,
      nodesExecuted,
      priority: 'normal',
    });
  }

  /**
   * Notifica flujo fallido
   */
  async notifyFlowFailed(workspaceId, { flowId, flowName, error }) {
    return this.notify(workspaceId, {
      type: NOTIF.FLOW_FAILED,
      flowId,
      flowName,
      error,
      priority: 'high',
    });
  }

  /**
   * Notifica pago confirmado
   */
  async notifyPaymentConfirmed(workspaceId, { paymentId, amount, currency, payerEmail, recordId, tableId }) {
    return this.notify(workspaceId, {
      type: NOTIF.PAYMENT_CONFIRMED,
      paymentId,
      amount,
      currency,
      payerEmail,
      recordId,
      tableId,
      priority: 'high',
    });
  }

  /**
   * Notifica error del agente
   */
  async notifyAgentError(workspaceId, { agentId, chatId, error }) {
    return this.notify(workspaceId, {
      type: NOTIF.AGENT_ERROR,
      agentId,
      chatId,
      error,
      priority: 'high',
    });
  }

  // ── API Methods ───────────────────────────────────────────────────────────

  /**
   * Lista notificaciones
   */
  async list(workspaceId, options = {}) {
    return this.repo.list(workspaceId, options);
  }

  /**
   * Cuenta no leídas
   */
  async countUnread(workspaceId) {
    return this.repo.countUnread(workspaceId);
  }

  /**
   * Marca como leída
   */
  async markRead(notificationId, workspaceId) {
    const result = await this.repo.markRead(notificationId, workspaceId);
    // Emitir actualización
    getSocketService().toWorkspace(workspaceId, 'notification:read', { id: notificationId });
    return result;
  }

  /**
   * Marca todas como leídas
   */
  async markAllRead(workspaceId) {
    const count = await this.repo.markAllRead(workspaceId);
    getSocketService().toWorkspace(workspaceId, 'notification:all-read', { count });
    return count;
  }

  /**
   * Descarta una notificación
   */
  async dismiss(notificationId, workspaceId) {
    const result = await this.repo.dismiss(notificationId, workspaceId);
    getSocketService().toWorkspace(workspaceId, 'notification:dismissed', { id: notificationId });
    return result;
  }

  /**
   * Descarta todas
   */
  async dismissAll(workspaceId) {
    const count = await this.repo.dismissAll(workspaceId);
    getSocketService().toWorkspace(workspaceId, 'notification:all-dismissed', { count });
    return count;
  }
}

// Singleton
let _instance = null;
export function getNotificationService() {
  if (!_instance) _instance = new NotificationService();
  return _instance;
}
