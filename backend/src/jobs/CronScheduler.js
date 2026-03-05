/**
 * CronScheduler - Ejecuta flujos automáticamente por tiempo
 *
 * Soporta 3 tipos de schedules:
 *   - fixed:    "Todos los lunes a las 9:00"
 *   - interval: "Cada 24 horas"
 *   - relative: "24 horas antes del campo [fecha] de la tabla [Citas]"
 *               (este tipo usa un sub-job que corre cada hora y evalúa registros)
 *
 * Usa node-cron. Los schedules se guardan en la BD por workspace y
 * se recargan al iniciar. Cada workspace tiene sus propios jobs.
 *
 * Para instalar: npm install node-cron
 */

import { connectDB, getFlowsDbName, getWorkspaceDbName, getTableDataDbName } from '../config/db.js';
import { executeFlowsForTrigger } from '../services/FlowExecutor.js';
import { getBusinessSnapshot } from '../services/BusinessSnapshot.js';
import logger from '../config/logger.js';

const log = logger.child('CronScheduler');

class CronScheduler {
  constructor() {
    this._jobs = new Map();       // jobId → cronJob
    this._cron = null;            // librería node-cron (cargada lazy)
    this._initialized = false;
  }

  /**
   * Inicializa el scheduler. Llama esto una sola vez al arrancar el servidor.
   * Carga todos los flows con Schedule triggers de todos los workspaces activos.
   */
  async init() {
    if (this._initialized) return;

    try {
      this._cron = await import('node-cron');
      log.info('CronScheduler initializing');

      // Job interno cada hora: evalúa triggers "relative" (X horas antes de fecha)
      this._scheduleRelativeChecker();

      this._initialized = true;
      log.info('CronScheduler ready');
    } catch (err) {
      log.warn('node-cron not available — install it with: npm install node-cron', { error: err.message });
    }
  }

  /**
   * Registra un schedule de un flujo específico.
   * Llamado cuando se crea o actualiza un flujo con un nodo Schedule.
   *
   * @param {string} workspaceId
   * @param {string} flowId
   * @param {object} scheduleConfig - { type, cronExpression, hour, minute, dayOfWeek, interval, intervalUnit }
   */
  async register(workspaceId, flowId, scheduleConfig) {
    if (!this._cron) return;

    const jobId = `${workspaceId}:${flowId}`;

    // Cancelar job anterior si existe
    this.unregister(jobId);

    const expression = this._buildCronExpression(scheduleConfig);
    if (!expression) {
      log.warn('Invalid schedule config, skipping', { workspaceId, flowId, scheduleConfig });
      return;
    }

    try {
      const job = this._cron.schedule(expression, async () => {
        log.info('Scheduled flow trigger', { workspaceId, flowId, expression });
        try {
          await this._triggerScheduledFlow(workspaceId, flowId);
        } catch (err) {
          log.error('Error executing scheduled flow', { workspaceId, flowId, error: err.message });
        }
      }, {
        timezone: 'America/Bogota',
      });

      this._jobs.set(jobId, job);
      log.info('Schedule registered', { jobId, expression });
    } catch (err) {
      log.error('Error registering schedule', { workspaceId, flowId, error: err.message });
    }
  }

  /**
   * Cancela el job de un flujo
   * @param {string} jobId - workspaceId:flowId
   */
  unregister(jobId) {
    const existing = this._jobs.get(jobId);
    if (existing) {
      existing.stop();
      this._jobs.delete(jobId);
      log.info('Schedule unregistered', { jobId });
    }
  }

  /**
   * Cancela todos los jobs de un workspace
   * @param {string} workspaceId
   */
  unregisterWorkspace(workspaceId) {
    for (const [jobId] of this._jobs) {
      if (jobId.startsWith(`${workspaceId}:`)) {
        this.unregister(jobId);
      }
    }
  }

  /**
   * Devuelve el estado actual del scheduler para el panel de administración.
   * @returns {{ initialized: boolean, jobCount: number, jobs: Array }}
   */
  getStatus() {
    const jobs = Array.from(this._jobs.entries()).map(([id, job]) => {
      const parts = id.split(':');
      return {
        id,
        workspaceId: parts[0] || id,
        flowId: parts[1] || '',
        status: typeof job.getStatus === 'function' ? job.getStatus() : 'scheduled',
        running: typeof job.running !== 'undefined' ? job.running : true,
      };
    });

    return {
      initialized: this._initialized,
      jobCount: this._jobs.size,
      jobs,
    };
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /**
   * Convierte la config de schedule a una expresión cron
   * @private
   */
  _buildCronExpression(config) {
    const { type, cronExpression, hour = 9, minute = 0, dayOfWeek, interval, intervalUnit } = config;

    // Expresión cron directa — para usuarios avanzados
    if (type === 'cron' && cronExpression) {
      return cronExpression;
    }

    // Fixed: cada día a cierta hora, o cierto día de la semana
    if (type === 'fixed') {
      const h = Math.max(0, Math.min(23, parseInt(hour) || 9));
      const m = Math.max(0, Math.min(59, parseInt(minute) || 0));

      if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== '') {
        // Día específico de la semana (0=domingo, 1=lunes ... 6=sábado)
        return `${m} ${h} * * ${dayOfWeek}`;
      }
      // Todos los días a esa hora
      return `${m} ${h} * * *`;
    }

    // Interval: cada N horas o días
    if (type === 'interval') {
      const n = Math.max(1, parseInt(interval) || 1);
      if (intervalUnit === 'hours' || intervalUnit === 'horas') {
        if (n === 1) return '0 * * * *';
        return `0 */${n} * * *`;
      }
      if (intervalUnit === 'days' || intervalUnit === 'dias') {
        return `0 9 */${n} * *`; // a las 9am cada N días
      }
      // Por defecto: horas
      return `0 */${n} * * *`;
    }

    // Relative: manejado por el checker separado (no necesita cron propio)
    if (type === 'relative') return null;

    return null;
  }

  /**
   * Job que corre cada hora y evalúa los triggers de tipo "relative"
   * Ej: "24 horas antes del campo fecha en tabla Citas"
   * @private
   */
  _scheduleRelativeChecker() {
    if (!this._cron) return;

    this._cron.schedule('0 * * * *', async () => {
      log.debug('Running relative trigger checker');
      try {
        await this._checkRelativeTriggers();
      } catch (err) {
        log.error('Error in relative trigger checker', { error: err.message });
      }
    }, { timezone: 'America/Bogota' });
  }

  /**
   * Evalúa todos los flujos con trigger "relative" en todos los workspaces
   * @private
   */
  async _checkRelativeTriggers() {
    // Por ahora: busca en todos los workspaces conocidos
    // En el futuro: llevar un registro de workspaces activos
    // implementación básica: no hace nada si no hay workspaces registrados
    for (const [jobId, config] of (this._relativeConfigs || new Map())) {
      try {
        const [workspaceId, flowId] = jobId.split(':');
        await this._checkRelativeFlow(workspaceId, flowId, config);
      } catch (err) {
        log.warn('Error checking relative flow', { jobId, error: err.message });
      }
    }
  }

  /**
   * Evalúa si un flujo "relative" debe dispararse ahora
   *
   * Config esperada:
   * {
   *   type: 'relative',
   *   offsetHours: 24,         // cuántas horas antes (negativo = después)
   *   targetTableId: 'xxx',    // tabla donde buscar
   *   targetDateField: 'fecha', // campo de fecha a comparar
   *   alreadySentField: '_reminderSent' // campo para evitar duplicados
   * }
   * @private
   */
  async _checkRelativeFlow(workspaceId, flowId, config) {
    const { offsetHours = 24, targetTableId, targetDateField } = config;
    if (!targetTableId || !targetDateField) return;

    const now = new Date();
    const targetTime = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
    const targetDateStr = targetTime.toISOString().split('T')[0];

    // Buscar registros cuya fecha coincide con el target y no tienen recordatorio enviado
    const { TableDataRepository } = await import('../repositories/TableDataRepository.js');
    const repo = new TableDataRepository();

    const records = await repo.query(workspaceId, targetTableId, {
      [targetDateField]: targetDateStr,
    }, { limit: 100 });

    for (const record of records) {
      // Evitar enviar dos veces
      if (record._reminderSent) continue;

      log.info('Relative trigger firing', { workspaceId, flowId, recordId: record._id });
      await executeFlowsForTrigger(workspaceId, 'schedule', targetTableId, record);

      // Marcar como enviado
      try {
        const db = await connectDB(getTableDataDbName(workspaceId, targetTableId));
        const doc = await db.get(record._id);
        await db.insert({ ...doc, _reminderSent: true });
      } catch (e) {
        log.warn('Could not mark reminder as sent', { recordId: record._id });
      }
    }
  }

  /**
   * Dispara un flujo scheduled
   * @private
   */
  async _triggerScheduledFlow(workspaceId, flowId) {
    try {
      const flowsDb = await connectDB(getFlowsDbName(workspaceId));
      const flow = await flowsDb.get(flowId).catch(() => null);
      if (!flow || flow.active === false) return;

      // Invalidar snapshot para que el bot tenga datos frescos
      getBusinessSnapshot().invalidate(workspaceId);

      // Ejecutar flujo sin un registro específico (trigger scheduled)
      await executeFlowsForTrigger(workspaceId, 'scheduled', flow.triggerTable, {
        _scheduledAt: new Date().toISOString(),
        _flowId: flowId,
      });
    } catch (err) {
      log.error('Error triggering scheduled flow', { workspaceId, flowId, error: err.message });
    }
  }
}

// Singleton
let _scheduler = null;
export function getCronScheduler() {
  if (!_scheduler) _scheduler = new CronScheduler();
  return _scheduler;
}

export default getCronScheduler;
