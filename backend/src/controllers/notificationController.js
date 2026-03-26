/**
 * notificationController — API de notificaciones
 * 
 * Endpoints:
 *   GET  /api/notifications?workspaceId=X             → Lista notificaciones
 *   GET  /api/notifications/count?workspaceId=X      → Cuenta no leídas
 *   POST /api/notifications/:id/read                 → Marcar como leída
 *   POST /api/notifications/read-all                 → Marcar todas como leídas
 *   POST /api/notifications/:id/dismiss              → Descartar una
 *   POST /api/notifications/dismiss-all              → Descartar todas
 *   GET  /api/notifications/preferences              → Obtener preferencias
 *   PUT  /api/notifications/preferences              → Guardar preferencias
 */

import { getNotificationService } from '../services/NotificationService.js';
import { connectDB, getWorkspacesDbName } from '../config/db.js';
import logger from '../config/logger.js';

const log = logger.child('NotificationController');

/**
 * GET /api/notifications
 * Query: workspaceId, limit, skip, unreadOnly, types (comma-separated)
 */
export async function listNotifications(req, res) {
  try {
    const { workspaceId, limit = 50, skip = 0, unreadOnly, types } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    const options = {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      unreadOnly: unreadOnly === 'true',
      types: types ? types.split(',') : null,
    };

    const notifications = await getNotificationService().list(workspaceId, options);
    res.json(notifications);
  } catch (err) {
    log.error('Error listing notifications', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/notifications/count
 * Query: workspaceId
 */
export async function countUnread(req, res) {
  try {
    const { workspaceId } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    const count = await getNotificationService().countUnread(workspaceId);
    res.json({ count });
  } catch (err) {
    log.error('Error counting notifications', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/:id/read
 * Body: { workspaceId }
 */
export async function markRead(req, res) {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    const notification = await getNotificationService().markRead(id, workspaceId);
    res.json({ success: true, notification });
  } catch (err) {
    log.error('Error marking notification read', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/read-all
 * Body: { workspaceId }
 */
export async function markAllRead(req, res) {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    const count = await getNotificationService().markAllRead(workspaceId);
    res.json({ success: true, count });
  } catch (err) {
    log.error('Error marking all read', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/:id/dismiss
 * Body: { workspaceId }
 */
export async function dismissNotification(req, res) {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    await getNotificationService().dismiss(id, workspaceId);
    res.json({ success: true });
  } catch (err) {
    log.error('Error dismissing notification', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/dismiss-all
 * Body: { workspaceId }
 */
export async function dismissAll(req, res) {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    const count = await getNotificationService().dismissAll(workspaceId);
    res.json({ success: true, count });
  } catch (err) {
    log.error('Error dismissing all', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/notifications/preferences
 * Query: workspaceId
 */
export async function getPreferences(req, res) {
  try {
    const { workspaceId } = req.query;
    const userId = req.user?._id;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }

    // Las preferencias se guardan en el documento del workspace
    const db = await connectDB(getWorkspacesDbName());
    const workspace = await db.get(workspaceId);
    
    // Preferencias por defecto
    const defaultPrefs = {
      'meta:message': true,
      'flow:completed': true,
      'flow:failed': true,
      'payment:confirmed': true,
      'agent:error': true,
      'system:info': true,
      // Canales
      inApp: true,
      email: false,
      sound: true,
    };

    const userPrefs = workspace.notificationPrefs?.[userId] || defaultPrefs;
    res.json(userPrefs);
  } catch (err) {
    log.error('Error getting preferences', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/notifications/preferences
 * Body: { workspaceId, preferences }
 */
export async function setPreferences(req, res) {
  try {
    const { workspaceId, preferences } = req.body;
    const userId = req.user?._id;
    
    if (!workspaceId || !preferences) {
      return res.status(400).json({ error: 'workspaceId y preferences requeridos' });
    }

    const db = await connectDB(getWorkspacesDbName());
    const workspace = await db.get(workspaceId);
    
    // Guardar preferencias por usuario
    workspace.notificationPrefs = workspace.notificationPrefs || {};
    workspace.notificationPrefs[userId] = preferences;
    workspace.updatedAt = new Date().toISOString();
    
    await db.insert(workspace);
    res.json({ success: true, preferences });
  } catch (err) {
    log.error('Error setting preferences', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}
