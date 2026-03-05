/**
 * BusinessSnapshot - Genera un resumen del estado del negocio en tiempo real
 *
 * Principio clave: 100% dinámico — no sabe qué tablas ni campos existen.
 * Lee los `headers` de cada tabla para detectar:
 *   - type:"date" + valor < hoy → vencido
 *   - type:"number" + validation.min + valor <= min → stock bajo
 *   - type:"select" → distribución de estados (conteo por opción)
 *   - Totales y conteos por tabla
 *
 * El resultado es texto plano que entra al system prompt del bot.
 * Se cachea 5 minutos por workspaceId para no impactar performance.
 *
 * Compatible con CUALQUIER vertical: clínica, tienda, CRM, restaurante.
 */

import { TableRepository } from '../repositories/TableRepository.js';
import { TableDataRepository } from '../repositories/TableDataRepository.js';
import { connectDB, getWorkspaceDbName } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';

const log = logger.child('BusinessSnapshot');

// TTL del cache del snapshot: 5 minutos
const SNAPSHOT_TTL = 300;

// Máximo de registros a escanear por tabla para no sobrecargar
const MAX_SCAN = 500;

export class BusinessSnapshot {
  constructor() {
    this.tableRepo = new TableRepository();
    this.tableDataRepo = new TableDataRepository();
  }

  /**
   * Genera (o devuelve del cache) el snapshot del workspace
   * @param {string} workspaceId
   * @param {object} options - { forceRefresh: false, maxTables: 10 }
   * @returns {Promise<string>} Texto listo para inyectar al system prompt
   */
  async get(workspaceId, options = {}) {
    const { forceRefresh = false, maxTables = 10 } = options;
    const cacheKey = `snapshot:${workspaceId}`;

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        log.debug('Snapshot from cache', { workspaceId });
        return cached;
      }
    }

    const snapshot = await this._build(workspaceId, maxTables);
    cache.set(cacheKey, snapshot, SNAPSHOT_TTL);
    return snapshot;
  }

  /**
   * Invalida el cache del snapshot (llamar después de crear/actualizar registros)
   * @param {string} workspaceId
   */
  invalidate(workspaceId) {
    cache.del(`snapshot:${workspaceId}`);
  }

  // ─── Construcción del snapshot ─────────────────────────────────────────────

  /**
   * Construye el snapshot consultando todas las tablas del workspace
   * @private
   */
  async _build(workspaceId, maxTables) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 1. Obtener todas las tablas del workspace
    const tables = await this.tableRepo.findAll(workspaceId);
    const dataTables = (tables || [])
      .filter(t => t.headers?.length > 0 && !t.isSystemTable)
      .slice(0, maxTables);

    if (dataTables.length === 0) return '';

    const sections = [];
    const alertLines = [];
    const agendaLines = [];

    // 2. Por cada tabla, analizar registros usando sus headers como guía
    for (const table of dataTables) {
      try {
        const analysis = await this._analyzeTable(table, workspaceId, todayStr);
        if (!analysis) continue;

        // Sección de estado por tabla
        const tableSection = this._buildTableSection(table, analysis);
        if (tableSection) sections.push(tableSection);

        // Acumular alertas globales
        alertLines.push(...analysis.alerts);

        // Acumular agenda del día
        agendaLines.push(...analysis.todayItems);

      } catch (err) {
        log.warn('Error analyzing table', { workspaceId, tableId: table._id, error: err.message });
      }
    }

    // 3. Armar el texto final
    return this._compose(sections, alertLines, agendaLines, todayStr);
  }

  /**
   * Analiza una tabla y devuelve métricas basadas en sus headers
   * @private
   */
  async _analyzeTable(table, workspaceId, todayStr) {
    const headers = table.headers || [];
    const records = await this.tableDataRepo.findAll(workspaceId, table._id, { limit: MAX_SCAN });
    const dataRecords = records.filter(r => !r.main && r.tableId === table._id);

    if (dataRecords.length === 0) return null;

    const result = {
      total: dataRecords.length,
      selectStats: {},   // { fieldKey: { fieldLabel, counts: { optionValue: N } } }
      overdue: [],       // registros con fecha vencida
      todayItems: [],    // registros de hoy
      stockAlerts: [],   // campos numéricos bajo mínimo
      sumFields: {},     // { fieldKey: total } para campos numéricos con label de importe
      alerts: [],        // líneas de alerta para el resumen global
    };

    // ── Identificar campos especiales según tipo ──────────────────────────
    const dateFields    = headers.filter(h => h.type === 'date' || h.type === 'datetime');
    const selectFields  = headers.filter(h => h.type === 'select' && h.options?.length > 0);
    const numberFields  = headers.filter(h => h.type === 'number');
    const displayField  = table.displayField || headers[0]?.key;

    // ── Estadísticas de campos select (distribución por estado) ──────────
    for (const field of selectFields) {
      const counts = {};
      field.options.forEach(opt => { counts[opt] = 0; });
      dataRecords.forEach(r => {
        const val = r[field.key];
        if (val && counts[val] !== undefined) counts[val]++;
        else if (val) counts[val] = (counts[val] || 0) + 1;
      });
      result.selectStats[field.key] = {
        label: field.label || field.key,
        counts,
      };
    }

    // ── Análisis de fechas: vencidos y agenda de hoy ──────────────────────
    for (const field of dateFields) {
      for (const record of dataRecords) {
        const dateVal = record[field.key];
        if (!dateVal) continue;

        const dateStr = String(dateVal).substring(0, 10);

        if (dateStr < todayStr) {
          // Vencido: solo si no tiene un estado "completado" o "cancelado"
          const isClosed = this._isClosedRecord(record, headers);
          if (!isClosed) {
            const label = record[displayField] || record._id?.substring(0, 8);
            result.overdue.push({ label, field: field.label || field.key, date: dateStr });
          }
        } else if (dateStr === todayStr) {
          const label = record[displayField] || record._id?.substring(0, 8);
          result.todayItems.push(`  - ${table.name}: ${label} (${field.label || field.key}: hoy)`);
        }
      }
    }

    // ── Stock bajo: campos numéricos con validation.min ───────────────────
    for (const field of numberFields) {
      const min = field.validation?.min;
      if (min === undefined || min === null) continue;

      // Solo si el label sugiere inventario/stock/cantidad
      const isStockField = /stock|cantidad|inventario|unidades|disponible/i.test(field.label || field.key);
      if (!isStockField) continue;

      for (const record of dataRecords) {
        const val = Number(record[field.key]);
        if (!isNaN(val) && val <= min + 2) { // Alerta cuando está a 2 unidades del mínimo
          const label = record[displayField] || record._id?.substring(0, 8);
          result.stockAlerts.push({ label, field: field.label || field.key, value: val, min });
        }
      }
    }

    // ── Suma de campos de importe/total/precio ────────────────────────────
    for (const field of numberFields) {
      const isAmountField = /total|importe|precio|monto|valor|deuda|factura/i.test(field.label || field.key);
      if (!isAmountField) continue;
      const sum = dataRecords.reduce((acc, r) => {
        const val = Number(r[field.key]);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      if (sum > 0) {
        result.sumFields[field.key] = { label: field.label || field.key, total: sum };
      }
    }

    // ── Generar líneas de alerta ─────────────────────────────────────────
    if (result.overdue.length > 0) {
      result.alerts.push(
        `⚠️ ${table.name}: ${result.overdue.length} registro(s) con fecha vencida sin cerrar`
      );
    }
    if (result.stockAlerts.length > 0) {
      result.stockAlerts.forEach(a => {
        result.alerts.push(
          `⚠️ Stock bajo — ${table.name} / ${a.label}: ${a.value} unidades (mínimo: ${a.min})`
        );
      });
    }

    return result;
  }

  /**
   * Determina si un registro está "cerrado" mirando campos select con valores finales
   * Ej: "Completada", "Cancelado", "Pagado", "Cerrado"
   * @private
   */
  _isClosedRecord(record, headers) {
    const closedValues = /completad|cancelad|pagad|cerrad|finaliz|archivad|inactiv/i;
    const selectFields = headers.filter(h => h.type === 'select');
    return selectFields.some(f => closedValues.test(String(record[f.key] || '')));
  }

  /**
   * Construye la sección de texto para una tabla
   * @private
   */
  _buildTableSection(table, analysis) {
    if (!analysis || analysis.total === 0) return null;

    const lines = [`📋 ${table.name.toUpperCase()} (${analysis.total} registros)`];

    // Distribución de estados del campo select más relevante
    const selectEntries = Object.entries(analysis.selectStats);
    if (selectEntries.length > 0) {
      // Usar el primer campo select que tenga variedad de valores
      const [, stats] = selectEntries[0];
      const countStr = Object.entries(stats.counts)
        .filter(([, n]) => n > 0)
        .map(([opt, n]) => `${opt}: ${n}`)
        .join(' | ');
      if (countStr) lines.push(`  ${stats.label}: ${countStr}`);
    }

    // Totales de importes
    Object.values(analysis.sumFields).forEach(sf => {
      lines.push(`  ${sf.label} total: $${sf.total.toLocaleString('es-CO')}`);
    });

    // Vencidos
    if (analysis.overdue.length > 0) {
      lines.push(`  ⚠️ Vencidos: ${analysis.overdue.length}`);
    }

    return lines.join('\n');
  }

  /**
   * Compone el texto final del snapshot
   * @private
   */
  _compose(sections, alertLines, agendaLines, todayStr) {
    const parts = [];

    // Fecha y hora
    const dateObj = new Date(todayStr + 'T12:00:00');
    const dayName = dateObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    parts.push(`\n━━━ ESTADO ACTUAL DEL NEGOCIO ━━━`);
    parts.push(`📅 Hoy: ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`);

    // Estado por tablas
    if (sections.length > 0) {
      parts.push('');
      parts.push(sections.join('\n\n'));
    }

    // Agenda del día
    if (agendaLines.length > 0) {
      parts.push('');
      parts.push('📆 AGENDA DE HOY:');
      parts.push(agendaLines.slice(0, 10).join('\n'));
    }

    // Alertas críticas
    if (alertLines.length > 0) {
      parts.push('');
      parts.push('🚨 ALERTAS ACTIVAS:');
      parts.push(alertLines.slice(0, 10).map(a => `  ${a}`).join('\n'));
    }

    parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return parts.join('\n');
  }
}

// Singleton para usar en todo el backend
let _instance = null;
export function getBusinessSnapshot() {
  if (!_instance) _instance = new BusinessSnapshot();
  return _instance;
}
