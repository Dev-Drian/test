/**
 * ExportService - Exporta datos de cualquier tabla a CSV o JSON
 *
 * Principio clave: 100% dinámico — no sabe qué tabla es.
 * Lee los headers de la tabla y genera el export usando esa estructura.
 * Usa TableDataRepository y TableRepository existentes, sin tocar nada más.
 */

import { TableRepository } from '../repositories/TableRepository.js';
import { TableDataRepository } from '../repositories/TableDataRepository.js';
import logger from '../config/logger.js';

const log = logger.child('ExportService');

export class ExportService {
  constructor() {
    this.tableRepo = new TableRepository();
    this.tableDataRepo = new TableDataRepository();
  }

  /**
   * Exporta todos los registros de una tabla
   * @param {string} workspaceId
   * @param {string} tableId
   * @param {object} options - { format: 'csv'|'json', filters: {}, limit: number }
   * @returns {Promise<{ data: string|object[], filename: string, mimeType: string }>}
   */
  async export(workspaceId, tableId, options = {}) {
    const { format = 'csv', filters = {}, limit = 10000 } = options;

    // 1. Obtener definición de la tabla (headers = estructura dinámica)
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) throw new Error(`Tabla ${tableId} no encontrada`);

    const headers = (table.headers || []).filter(h => !h.hiddenFromExport);

    // 2. Obtener registros
    const records = await this.tableDataRepo.findAll(workspaceId, tableId, { limit });

    log.info('Exporting table', {
      workspaceId,
      tableId,
      tableName: table.name,
      records: records.length,
      format,
    });

    // 3. Filtrar el doc de metadata (main: true) que crea el sistema
    const data = records.filter(r => !r.main);

    const safeTableName = (table.name || 'export')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${safeTableName}_${timestamp}`;

    if (format === 'json') {
      // JSON: devuelve los registros con solo los campos definidos en headers
      const cleaned = data.map(record => this._pickFields(record, headers));
      return {
        data: JSON.stringify(cleaned, null, 2),
        filename: `${filename}.json`,
        mimeType: 'application/json',
      };
    }

    // CSV por defecto
    const csv = this._toCSV(data, headers);
    return {
      data: csv,
      filename: `${filename}.csv`,
      mimeType: 'text/csv; charset=utf-8',
    };
  }

  /**
   * Convierte registros a CSV usando los headers de la tabla
   * @private
   */
  _toCSV(records, headers) {
    if (records.length === 0) {
      // CSV vacío con solo encabezados
      const headerRow = headers.map(h => this._csvEscape(h.label || h.key)).join(',');
      return '\uFEFF' + headerRow + '\n'; // BOM para Excel
    }

    // Fila de encabezados usando los labels de la tabla (no los keys internos)
    const headerRow = headers.map(h => this._csvEscape(h.label || h.key)).join(',');

    // Filas de datos
    const rows = records.map(record => {
      return headers.map(h => {
        const value = record[h.key];
        return this._csvEscape(this._formatValue(value, h));
      }).join(',');
    });

    // BOM UTF-8 para que Excel abra correctamente con tildes
    return '\uFEFF' + [headerRow, ...rows].join('\n');
  }

  /**
   * Formatea un valor según el tipo de campo del header
   * @private
   */
  _formatValue(value, header) {
    if (value === null || value === undefined) return '';

    switch (header.type) {
      case 'relation':
        // Las relaciones guardan { id, label } o solo el string del valor display
        if (typeof value === 'object' && value !== null) {
          return value.label || value.nombre || value.name || value._id || JSON.stringify(value);
        }
        return String(value);

      case 'select':
        return String(value);

      case 'number':
        return value === '' ? '' : Number(value).toString();

      case 'date':
      case 'datetime':
        if (!value) return '';
        // Ya viene como string ISO, lo dejamos como está
        return String(value);

      case 'boolean':
        return value ? 'Sí' : 'No';

      case 'file':
        if (value && typeof value === 'object' && value.url) {
          return [value.filename || '', value.url, value.mimeType || ''].filter(Boolean).join(' | ');
        }
        return value == null ? '' : String(value);

      default:
        return String(value);
    }
  }

  /**
   * Escapa un valor para CSV (comillas, comas, saltos de línea)
   * @private
   */
  _csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Si contiene coma, comilla o salto de línea, envolver en comillas
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Devuelve solo los campos definidos en headers (para export JSON limpio)
   * @private
   */
  _pickFields(record, headers) {
    const result = {};
    headers.forEach(h => {
      if (record[h.key] !== undefined) {
        result[h.label || h.key] = this._formatValue(record[h.key], h);
      }
    });
    return result;
  }
}
