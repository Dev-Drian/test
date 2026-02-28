/**
 * NotificationsController - API de notificaciones
 * 
 * Endpoints para gestionar notificaciones in-app
 */

import { connectDB } from '../config/db.js';
import { 
  getNotificationService, 
  InAppNotificationProvider,
  ChatMessageProvider
} from '../integrations/notifications/index.js';

// Inicializar servicio de notificaciones
let notificationService = null;

async function getService(workspaceId) {
  if (!notificationService) {
    notificationService = getNotificationService();
    
    // Registrar proveedor in-app
    const db = await connectDB(`chatbot_${workspaceId}`);
    const inAppProvider = new InAppNotificationProvider({ db, enabled: true });
    notificationService.registerProvider(inAppProvider);
    
    // Registrar proveedor de chat (para inyección de mensajes en bots)
    const chatProvider = new ChatMessageProvider({ db, enabled: true });
    notificationService.registerProvider(chatProvider);
    
    // Iniciar escucha de eventos
    notificationService.startListening();
  }
  return notificationService;
}

/**
 * GET /notifications/list
 * Lista notificaciones de un workspace
 */
export async function listNotifications(req, res) {
  try {
    const { workspaceId, unreadOnly, limit = 50, skip = 0 } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId required' });
    }
    
    const service = await getService(workspaceId);
    const notifications = await service.getNotifications(workspaceId, {
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    
    res.json({
      notifications,
      count: notifications.length,
    });
    
  } catch (err) {
    console.error('[NotificationsController] listNotifications error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /notifications/unread-count
 * Cuenta notificaciones no leídas
 */
export async function getUnreadCount(req, res) {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId required' });
    }
    
    const service = await getService(workspaceId);
    const count = await service.countUnread(workspaceId);
    
    res.json({ count });
    
  } catch (err) {
    console.error('[NotificationsController] getUnreadCount error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /notifications/:notificationId/read
 * Marca una notificación como leída
 */
export async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const { workspaceId } = req.body;
    
    if (!notificationId || !workspaceId) {
      return res.status(400).json({ error: 'notificationId and workspaceId required' });
    }
    
    const service = await getService(workspaceId);
    const success = await service.markAsRead(notificationId);
    
    res.json({ success });
    
  } catch (err) {
    console.error('[NotificationsController] markAsRead error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /notifications/read-all
 * Marca todas las notificaciones como leídas
 */
export async function markAllAsRead(req, res) {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId required' });
    }
    
    const service = await getService(workspaceId);
    const count = await service.markAllAsRead(workspaceId);
    
    res.json({ success: true, marked: count });
    
  } catch (err) {
    console.error('[NotificationsController] markAllAsRead error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /notifications/send
 * Envía una notificación directa (para testing o uso manual)
 */
export async function sendNotification(req, res) {
  try {
    const { workspaceId, title, message, type = 'custom', data = {} } = req.body;
    
    if (!workspaceId || !title || !message) {
      return res.status(400).json({ error: 'workspaceId, title, and message required' });
    }
    
    const service = await getService(workspaceId);
    const results = await service.sendDirect(workspaceId, {
      type,
      title,
      message,
      data,
    });
    
    res.json({ success: true, results });
    
  } catch (err) {
    console.error('[NotificationsController] sendNotification error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /notifications/config
 * Obtiene la configuración de notificaciones del workspace
 */
export async function getConfig(req, res) {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId required' });
    }
    
    const service = await getService(workspaceId);
    const config = service.getWorkspaceConfig(workspaceId);
    
    res.json({ config });
    
  } catch (err) {
    console.error('[NotificationsController] getConfig error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /notifications/config
 * Actualiza la configuración de notificaciones
 */
export async function updateConfig(req, res) {
  try {
    const { workspaceId, config } = req.body;
    
    if (!workspaceId || !config) {
      return res.status(400).json({ error: 'workspaceId and config required' });
    }
    
    const service = await getService(workspaceId);
    service.setWorkspaceConfig(workspaceId, config);
    
    res.json({ success: true, config });
    
  } catch (err) {
    console.error('[NotificationsController] updateConfig error:', err);
    res.status(500).json({ error: err.message });
  }
}
