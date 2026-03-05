/**
 * ImportService - Importa datos desde CSV a cualquier tabla
 *
 * Principio clave: 100% dinámico — no sabe qué tabla es.
 * Lee los headers de la tabla para hacer el mapeo automático columna→campo.
 * Usa EntityRepository.create() exactamente igual que el bot, respetando
 * validaciones, defaults y relaciones ya definidas.
 */

import { TableRepository } from '../repositories/TableRepository.js';
import { EntityRepository } from '../repositories/EntityRepository.js';
import logger from '../config/logger.js';

const log = logger.child('ImportService');

export class ImportService {
  constructor() {
    this.tableRepo = new TableRepository();
    this.entityRepo = new EntityRepository();
  }

  // ─── Parse helpers ──────────────────────────────────────────────────────────

  /**
   * Detecta tipo de archivo y parsea a { columnHeaders, rows }
   * Soporta CSV (text) y XLSX (base64 o buffer)
   */
  async _parseFile(content, filename, encoding = 'utf8') {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return this._parseXLSX(content, encoding);
    }
    // Default: CSV
    const text = encoding === 'base64'
      ? Buffer.from(content, 'base64').toString('utf8')
      : (typeof content === 'string' ? content : content.toString('utf8'));
    return this._parseCSV(text);
  }

  /**
   * Parsea un archivo XLSX a { columnHeaders, rows }
   * @param {string|Buffer} content - base64 string o Buffer
   * @param {string} encoding - 'base64' | 'utf8' | 'buffer'
   */
  async _parseXLSX(content, encoding = 'base64') {
    const XLSX = (await import('xlsx')).default;
    let workbook;
    if (encoding === 'base64' || typeof content === 'string') {
      workbook = XLSX.read(content, { type: 'base64' });
    } else {
      workbook = XLSX.read(content, { type: 'buffer' });
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!jsonData.length) return { columnHeaders: [], rows: [] };

    const columnHeaders = jsonData[0].map(h => String(h ?? '').trim()).filter(Boolean);
    const rows = jsonData.slice(1)
      .filter(row => row.some(c => c !== '' && c !== null && c !== undefined))
      .map(row => columnHeaders.map((_, i) => row[i] !== undefined ? String(row[i]) : ''));
    return { columnHeaders, rows };
  }

  /**
   * Previsualización: parsea el CSV y mapea columnas a campos de la tabla
   */
  async preview(workspaceId, tableId, csvText) {
    const { columnHeaders, rows } = this._parseCSV(csvText);
    return this._previewParsed(workspaceId, tableId, columnHeaders, rows);
  }

  /**
   * Previsualización desde archivo (CSV o XLSX)
   * @param {string} content - texto CSV o base64 XLSX
   * @param {string} filename - nombre del archivo (determina el parser)
   * @param {string} encoding - 'utf8' | 'base64'
   */
  async previewFile(workspaceId, tableId, content, filename, encoding = 'utf8') {
    const { columnHeaders, rows } = await this._parseFile(content, filename, encoding);
    return this._previewParsed(workspaceId, tableId, columnHeaders, rows);
  }

  async _previewParsed(workspaceId, tableId, columnHeaders, rows) {
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) throw new Error(`Tabla ${tableId} no encontrada`);
    const tableHeaders = table.headers || [];
    const mapping = this._autoMap(columnHeaders, tableHeaders);
    const previewRows = rows.slice(0, 5).map(row =>
      this._mapRow(row, columnHeaders, mapping, tableHeaders)
    );
    return {
      mapping,
      csvColumns: columnHeaders,
      tableHeaders: tableHeaders.filter(h => !h.hiddenFromChat),
      preview: previewRows,
      totalRows: rows.length,
      tableName: table.name,
    };
  }

  /**
   * Importa todos los registros del CSV a la tabla.
   * Ejecuta EntityRepository.create() por cada fila — mismo camino que el bot.
   */
  async import(workspaceId, tableId, csvText, mapping = null, options = {}) {
    const { columnHeaders, rows } = this._parseCSV(csvText);
    return this._importParsed(workspaceId, tableId, columnHeaders, rows, mapping, options);
  }

  /**
   * Importa desde archivo (CSV o XLSX). Hace auto-mapeo — no necesita pasar mapping.
   * @param {string} content - texto CSV o base64 XLSX
   * @param {string} filename - nombre del archivo
   * @param {string} encoding - 'utf8' | 'base64'
   */
  async importFile(workspaceId, tableId, content, filename, encoding = 'utf8', mapping = null, options = {}) {
    const { columnHeaders, rows } = await this._parseFile(content, filename, encoding);
    return this._importParsed(workspaceId, tableId, columnHeaders, rows, mapping, options);
  }

  async _importParsed(workspaceId, tableId, columnHeaders, rows, mapping = null, options = {}) {
    const { skipErrors = true, validate = true } = options;
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) throw new Error(`Tabla ${tableId} no encontrada`);
    const tableHeaders = table.headers || [];
    const finalMapping = mapping || this._autoMap(columnHeaders, tableHeaders);

    log.info('Starting import', {
      workspaceId,
      tableId,
      tableName: table.name,
      totalRows: rows.length,
    });

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 porque fila 1 es el header del CSV

      try {
        // Mapear fila CSV → objeto con keys de la tabla
        const data = this._mapRow(row, columnHeaders, finalMapping, tableHeaders);

        // Saltar filas completamente vacías
        if (Object.values(data).every(v => v === '' || v === null || v === undefined)) {
          skipped++;
          continue;
        }

        // EntityRepository.create() — mismo que usa el bot
        // validate: false porque el bot ya valida por su lado durante el chat;
        // aquí el usuario confirmó el mapeo, aplicamos defaults pero no bloqueamos
        const result = await this.entityRepo.create(workspaceId, tableId, data, {
          validate,
          normalize: true,
          applyDefaults: true,
        });

        if (result.success) {
          imported++;
        } else {
          const errorMsg = result.errors?.join(', ') || 'Error desconocido';
          errors.push({ row: rowNumber, data, reason: errorMsg });
          if (!skipErrors) throw new Error(`Fila ${rowNumber}: ${errorMsg}`);
          skipped++;
        }
      } catch (err) {
        errors.push({ row: rowNumber, reason: err.message });
        if (!skipErrors) throw err;
        skipped++;
      }
    }

    log.info('Import complete', { workspaceId, tableId, imported, skipped, errors: errors.length });

    return { imported, skipped, errors, total: rows.length };
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /**
   * Parsea CSV a { columnHeaders, rows }
   * Soporta: separador coma o punto y coma, strings con comillas, BOM UTF-8
   * @private
   */
  _parseCSV(csvText) {
    // Eliminar BOM si existe
    const text = csvText.replace(/^\uFEFF/, '').trim();
    const lines = text.split(/\r?\n/).filter(l => l.trim());

    if (lines.length === 0) return { columnHeaders: [], rows: [] };

    // Detectar separador: coma o punto y coma
    const firstLine = lines[0];
    const separator = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

    const columnHeaders = this._parseLine(firstLine, separator).map(h => h.trim());
    const rows = lines.slice(1).map(line => this._parseLine(line, separator));

    return { columnHeaders, rows };
  }

  /**
   * Parsea una línea CSV respetando strings entre comillas
   * @private
   */
  _parseLine(line, separator = ',') {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  }

  /**
   * Mapeo automático: compara nombres de columnas CSV con labels/keys de la tabla
   * Prioridad: coincidencia exacta label → coincidencia key → coincidencia parcial
   * @private
   */
  _autoMap(csvColumns, tableHeaders) {
    const mapping = {}; // { csvColumn: tableFieldKey }

    csvColumns.forEach(csvCol => {
      const csvLower = csvCol.toLowerCase().trim();

      // 1. Coincidencia exacta con label
      let match = tableHeaders.find(h =>
        (h.label || '').toLowerCase().trim() === csvLower
      );

      // 2. Coincidencia exacta con key
      if (!match) {
        match = tableHeaders.find(h =>
          (h.key || '').toLowerCase().trim() === csvLower
        );
      }

      // 3. Coincidencia parcial (el label contiene la columna o viceversa)
      if (!match) {
        match = tableHeaders.find(h => {
          const labelLower = (h.label || '').toLowerCase();
          const keyLower = (h.key || '').toLowerCase();
          return labelLower.includes(csvLower) || csvLower.includes(labelLower) ||
                 keyLower.includes(csvLower) || csvLower.includes(keyLower);
        });
      }

      if (match) {
        mapping[csvCol] = match.key;
      }
    });

    return mapping;
  }

  /**
   * Convierte una fila CSV a objeto con keys de la tabla usando el mapeo
   * @private
   */
  _mapRow(rowValues, csvColumns, mapping, tableHeaders) {
    const data = {};

    csvColumns.forEach((col, idx) => {
      const tableKey = mapping[col];
      if (!tableKey) return; // Columna no mapeada → ignorar

      const rawValue = rowValues[idx] || '';
      const header = tableHeaders.find(h => h.key === tableKey);

      data[tableKey] = this._coerceValue(rawValue, header);
    });

    return data;
  }

  /**
   * Convierte un string CSV al tipo correcto según el header del campo
   * @private
   */
  _coerceValue(rawValue, header) {
    if (!header) return rawValue;
    const val = String(rawValue).trim();
    if (val === '') return null;

    switch (header.type) {
      case 'number':
        // Soportar formato colombiano/español: 1.234,56 → 1234.56
        const numStr = val.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;

      case 'boolean':
        return ['sí', 'si', 'yes', 'true', '1', 'verdadero'].includes(val.toLowerCase());

      case 'date':
        // Intentar parsear diferentes formatos de fecha
        // DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
        return this._parseDate(val);

      case 'select':
        // Capitalizar si los options están capitalizados
        return val;

      case 'relation':
        // Para relaciones importamos el valor display; el sistema lo resolverá
        return val;

      default:
        return val;
    }
  }

  /**
   * Intenta parsear una fecha en varios formatos comunes en LATAM
   * @private
   */
  _parseDate(val) {
    // Ya es ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);

    // DD/MM/YYYY o DD-MM-YYYY
    const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Dejar como string si no se reconoce
    return val;
  }
}
