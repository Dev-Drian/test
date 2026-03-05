/**
 * AdminController - Panel de super administración
 *
 * Endpoints para observabilidad del sistema:
 *   GET  /api/admin/status        → salud general: DB, scheduler, cache
 *   GET  /api/admin/jobs          → lista de cron jobs activos
 *   POST /api/admin/jobs/:jobId/trigger → dispara un job manualmente
 *   GET  /api/admin/snapshots     → cache de snapshots por workspace
 *   DELETE /api/admin/snapshots/:workspaceId → invalida el snapshot de un workspace
 *   GET  /api/admin/logs          → últimas entradas del log en memoria
 *
 * Seguridad: solo accesible con JWT (requireAuth).
 * En producción añadir un check de rol superAdmin.
 */

import { getCronScheduler } from '../jobs/CronScheduler.js';
import { getBusinessSnapshot } from '../services/BusinessSnapshot.js';
import { connectDB, getWorkspaceDbName } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';

const log = logger.child('AdminController');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pingDB() {
  try {
    await connectDB(getWorkspaceDbName('_health_check'));
    return { ok: true };
  } catch (err) {
    // CouchDB devuelve 404 al pedir una DB inexistente — eso está bien, significa que la BD responde
    if (err.statusCode === 404 || err.message?.includes('not_found')) return { ok: true };
    return { ok: false, error: err.message };
  }
}

// ─── Controladores ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/status
 * Resumen de salud de todo el sistema
 */
export async function getSystemStatus(req, res) {
  try {
    const scheduler = getCronScheduler();
    const schedulerStatus = scheduler.getStatus();
    const dbStatus = await pingDB();
    const cacheStats = cache.getStats?.() || { keys: 0 };

    // Detectar cuántos snapshots hay en cache
    const snapshotCacheKeys = (cacheStats.keys || []).filter
      ? (cacheStats.keys || []).filter(k => k.startsWith('snapshot:'))
      : [];

    const status = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        environment: process.env.NODE_ENV || 'development',
      },
      database: dbStatus,
      scheduler: {
        initialized: schedulerStatus.initialized,
        activeJobs: schedulerStatus.jobCount,
      },
      cache: {
        totalKeys: typeof cacheStats === 'object' ? (cacheStats.keys || 0) : 0,
        snapshotsCached: Array.isArray(snapshotCacheKeys) ? snapshotCacheKeys.length : 0,
      },
      openai: {
        configured: !!(process.env.OPENAI_API_KEY),
      },
    };

    res.json(status);
  } catch (err) {
    log.error('getSystemStatus error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/jobs
 * Lista detallada de todos los cron jobs activos
 */
export async function getJobs(req, res) {
  try {
    const scheduler = getCronScheduler();
    const status = scheduler.getStatus();
    res.json(status);
  } catch (err) {
    log.error('getJobs error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/jobs/reload
 * Recarga todos los jobs desde la BD (útil tras actualizar configuración)
 */
export async function reloadJobs(req, res) {
  try {
    const scheduler = getCronScheduler();
    // Reinicializa el scheduler sin reiniciar el servidor
    scheduler._initialized = false;
    await scheduler.init();
    res.json({ success: true, message: 'Scheduler recargado', jobs: scheduler.getStatus().jobCount });
  } catch (err) {
    log.error('reloadJobs error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/snapshots
 * Lista workspaces con snapshot en cache y su antigüedad
 */
export async function getSnapshots(req, res) {
  try {
    const cacheStats = cache.getStats?.() || {};
    // node-cache expone keys via .keys()
    const allKeys = typeof cache.keys === 'function' ? cache.keys() : [];
    const snapshotKeys = allKeys.filter(k => k.startsWith('snapshot:'));

    const snapshots = snapshotKeys.map(key => {
      const ttl = typeof cache.getTtl === 'function' ? cache.getTtl(key) : null;
      const workspaceId = key.replace('snapshot:', '');
      const expiresAt = ttl ? new Date(ttl).toISOString() : null;
      const ageSeconds = ttl ? Math.max(0, Math.round((ttl - Date.now()) / 1000)) : null;
      return { workspaceId, key, expiresAt, ttlRemainingSeconds: ageSeconds };
    });

    res.json({ count: snapshots.length, snapshots });
  } catch (err) {
    log.error('getSnapshots error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/admin/snapshots/:workspaceId
 * Invalida el snapshot de un workspace y lo regenera
 */
export async function invalidateSnapshot(req, res) {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    getBusinessSnapshot().invalidate(workspaceId);
    log.info('Snapshot invalidated by admin', { workspaceId });

    res.json({ success: true, workspaceId, message: 'Snapshot invalidado. Se regenerará en el próximo acceso.' });
  } catch (err) {
    log.error('invalidateSnapshot error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/admin/cache/clear
 * Limpia toda la cache del sistema
 */
export async function clearAllCache(req, res) {
  try {
    cache.flush?.();
    log.info('Full cache cleared by admin', { user: req.user?.email });
    res.json({ success: true, message: 'Cache limpiada completamente' });
  } catch (err) {
    log.error('clearAllCache error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/admin/snapshot/:workspaceId
 * Devuelve el snapshot actual de un workspace (fuerza regeneración)
 */
export async function getWorkspaceSnapshot(req, res) {
  try {
    const { workspaceId } = req.params;
    const { force = false } = req.query;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

    const snapshot = await getBusinessSnapshot().get(workspaceId, { forceRefresh: force === 'true' });
    res.json({ workspaceId, snapshot: snapshot || 'Sin datos disponibles.' });
  } catch (err) {
    log.error('getWorkspaceSnapshot error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}
