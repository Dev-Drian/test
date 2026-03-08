/**
 * InboundController — Webhook de entrada para importar datos desde sistemas externos
 *
 * Casos de uso:
 *   - Un ERP envía JSON de pedidos nuevos cada hora
 *   - Una hoja de Google Sheets exporta y hace POST al webhook
 *   - Un script externo sube un CSV completo al endpoint
 *
 * Autenticación: JWT estándar (Authorization: Bearer <token>)
 * Formatos aceptados:
 *   - application/json  → array de objetos [ {campo: valor}, ... ] ó { data: [...] }
 *   - text/csv          → CSV con encabezados (mismo parser que ImportService)
 *
 * Endpoint: POST /inbound/:workspaceId/:tableId
 */

import { ImportService } from '../services/ImportService.js';
import { TableRepository } from '../repositories/TableRepository.js';
import { EntityRepository } from '../repositories/EntityRepository.js';
import { getBusinessSnapshot } from '../services/BusinessSnapshot.js';
import logger from '../config/logger.js';
import { getUserPlan } from '../middleware/limits.js';

const log = logger.child('InboundController');

// Límites de importación
const MAX_RECORDS_PER_IMPORT = 10000;
const MAX_BODY_SIZE_MB = 10;

const importService = new ImportService();
const tableRepo = new TableRepository();
const entityRepo = new EntityRepository();

/**
 * POST /inbound/:workspaceId/:tableId
 *
 * Cuerpo JSON:
 *   [ { nombre: "Ana", email: "ana@..." }, ... ]
 *   ó { data: [...] }
 *   ó { records: [...] }
 *
 * Cuerpo CSV (Content-Type: text/csv o text/plain):
 *   nombre,email\nAna,ana@...
 */
export async function inboundImport(req, res) {
  const { workspaceId, tableId } = req.params;

  if (!workspaceId || !tableId) {
    return res.status(400).json({ error: 'workspaceId and tableId are required in the URL' });
  }

  try {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    let result;

    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      // ── CSV vía webhook ───────────────────────────────────────────────────
      const csvText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      result = await importService.import(workspaceId, tableId, csvText, null, {
        skipErrors: true,
        validate: true,
      });

    } else {
      // ── JSON vía webhook ──────────────────────────────────────────────────
      const body = req.body;
      const records = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.records)
            ? body.records
            : null;

      if (!records || records.length === 0) {
        return res.status(400).json({
          error: 'Expected JSON array or { data: [...] } or { records: [...] }',
        });
      }

      // Validar límite de registros
      if (records.length > MAX_RECORDS_PER_IMPORT) {
        return res.status(400).json({
          error: `Máximo ${MAX_RECORDS_PER_IMPORT} registros por importación. Enviaste ${records.length}.`,
          code: 'IMPORT_LIMIT_EXCEEDED',
          limit: MAX_RECORDS_PER_IMPORT,
        });
      }

      // Validar que la tabla existe
      const table = await tableRepo.findById(tableId, workspaceId);
      if (!table) {
        return res.status(404).json({ error: `Table ${tableId} not found` });
      }

      // Insertar registro por registro con EntityRepository (mismo path que el bot)
      let imported = 0;
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (!record || typeof record !== 'object') {
          errors.push({ row: i + 1, error: 'Invalid record — must be an object' });
          skipped++;
          continue;
        }

        try {
          const createResult = await entityRepo.create(workspaceId, tableId, record, {
            validate: true,
            normalize: true,
            applyDefaults: true,
          });

          if (createResult.success) {
            imported++;
          } else {
            const reason = createResult.errors?.join(', ') || 'Validation failed';
            errors.push({ row: i + 1, data: record, error: reason });
            skipped++;
          }
        } catch (err) {
          errors.push({ row: i + 1, data: record, error: err.message });
          skipped++;
        }
      }

      result = { imported, skipped, errors, total: records.length };
    }

    // Invalidar cache del snapshot para que el bot refleje los nuevos datos
    if (result.imported > 0) {
      try { getBusinessSnapshot().invalidate(workspaceId); } catch (_) {}
    }

    log.info('Inbound import complete', {
      workspaceId, tableId,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors?.length || 0,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: `${result.imported} records imported${result.skipped ? `, ${result.skipped} skipped` : ''}.`,
    });

  } catch (err) {
    log.error('inboundImport error', { error: err.message, workspaceId, tableId });
    return res.status(500).json({ error: err.message });
  }
}
