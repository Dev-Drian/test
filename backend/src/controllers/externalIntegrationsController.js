/**
 * externalIntegrationsController — APIs externas (Alegra, Siigo, custom)
 *
 * Endpoints:
 *   GET  /api/integrations/external/types                       → tipos disponibles (alegra, siigo, custom)
 *   POST /api/integrations/external/analyze                     → analizar tabla y sugerir mapeo
 *   GET  /api/workspace/:workspaceId/integrations/external      → listar APIs configuradas
 *   POST /api/workspace/:workspaceId/integrations/external      → crear/guardar integración
 *   PUT  /api/workspace/:workspaceId/integrations/external/:id  → actualizar
 *   DEL  /api/workspace/:workspaceId/integrations/external/:id  → eliminar
 *   POST /api/workspace/:workspaceId/integrations/external/:id/test → probar conexión
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { INTEGRATION_TYPES } from '../services/ViewMappingService.js';
import { WorkspaceConfigRepository } from '../config/WorkspaceConfigRepository.js';
import { TableRepository } from '../repositories/TableRepository.js';
import logger from '../config/logger.js';

const log = logger.child('ExternalIntegrations');
const configRepo = new WorkspaceConfigRepository();
const tableRepo  = new TableRepository();

// ── Cifrado de credenciales (AES-256-CBC) ─────────────────────────────────────
const CIPHER_SECRET = (() => {
  const raw = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  return crypto.createHash('sha256').update(raw).digest(); // 32 bytes
})();

function encryptCredentials(plainObj) {
  const iv   = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_SECRET, iv);
  const plain  = JSON.stringify(plainObj);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `aes256:${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptCredentials(stored) {
  if (!stored || !stored.startsWith('aes256:')) return null;
  const [, ivHex, dataHex] = stored.split(':');
  const iv   = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_SECRET, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Analiza los headers de una tabla y sugiere mapeo automático para un tipo de integración.
 */
function suggestMapping(tableHeaders, integrationType) {
  const typeDef = INTEGRATION_TYPES[integrationType];
  if (!typeDef) return { suggested: {}, missing: [], coverage: 0 };

  const allFields = { ...typeDef.requiredFields, ...typeDef.optionalFields };
  const suggested = {};
  const missing   = [];
  let matched = 0;

  for (const [destKey, fieldDef] of Object.entries(allFields)) {
    const patterns = fieldDef.autoDetect || [];
    const found = tableHeaders.find(h => {
      const key = (h.key || h.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => key.includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')));
    });

    if (found) {
      suggested[destKey] = found.key || found.label;
      matched++;
    } else if (fieldDef.default !== undefined) {
      suggested[destKey] = `__fixed:${fieldDef.default}`;
    } else {
      missing.push({
        field: destKey,
        label: fieldDef.label,
        required: !!typeDef.requiredFields[destKey],
        hint: fieldDef.hint || null,
        // Sugerencia de columna a agregar
        columnSuggestion: {
          key: destKey.split('.').pop().replace(/\[.*\]/, ''),
          label: fieldDef.label,
          type: destKey.includes('email') ? 'email'
              : destKey.includes('phone') || destKey.includes('Phone') ? 'phone'
              : destKey.includes('date') || destKey.includes('Date') ? 'date'
              : destKey.includes('price') || destKey.includes('quantity') ? 'number'
              : 'text',
        },
      });
    }
  }

  const total = Object.keys(allFields).length || 1;
  const coverage = Math.round((matched / total) * 100);

  return { suggested, missing, coverage };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/integrations/external/types
 */
export function getIntegrationTypes(_req, res) {
  const types = Object.entries(INTEGRATION_TYPES).map(([id, def]) => ({
    id,
    name: def.name,
    provider: def.provider,
    icon: def.icon,
    description: def.description,
    requiredFieldCount: Object.keys(def.requiredFields || {}).length,
    optionalFieldCount: Object.keys(def.optionalFields || {}).length,
    providerConfig: def.providerConfig || {},
    apiDocsUrl: def.apiDocsUrl || null,
  }));
  res.json(types);
}

/**
 * POST /api/integrations/external/analyze
 * Body: { workspaceId, tableId, integrationType }
 */
export async function analyzeIntegrationMapping(req, res) {
  try {
    const { workspaceId, tableId, integrationType } = req.body;
    if (!workspaceId || !tableId || !integrationType) {
      return res.status(400).json({ error: 'workspaceId, tableId e integrationType son requeridos' });
    }

    const typeDef = INTEGRATION_TYPES[integrationType];
    if (!typeDef) {
      return res.status(400).json({ error: `Tipo de integración "${integrationType}" no existe` });
    }

    const table = await tableRepo.getById(workspaceId, tableId);
    if (!table) return res.status(404).json({ error: 'Tabla no encontrada' });

    const headers = table.headers || [];
    const { suggested, missing, coverage } = suggestMapping(headers, integrationType);

    return res.json({
      integrationType,
      provider: typeDef.provider,
      tableName: table.name,
      tableHeaders: headers.map(h => ({ key: h.key || h.label, label: h.label || h.key, type: h.type })),
      suggested,
      missing,
      coverage,
      providerConfig: typeDef.providerConfig || {},
      requiredFields: typeDef.requiredFields,
      optionalFields: typeDef.optionalFields,
    });
  } catch (err) {
    log.error('analyzeIntegrationMapping error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/workspace/:workspaceId/integrations/external
 */
export async function listExternalApis(req, res) {
  try {
    const { workspaceId } = req.params;
    const config = await configRepo.getConfig(workspaceId);
    const apis   = (config.integrations?.externalApis || []).map(api => ({
      ...api,
      credentials: api.credentials ? '(cifrado)' : null, // nunca devolver credenciales reales
    }));
    res.json(apis);
  } catch (err) {
    log.error('listExternalApis error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/workspace/:workspaceId/integrations/external
 * Body: { provider, name, integrationType, tableId, credentials: { ... }, fieldMapping, providerConfig }
 */
export async function createExternalApi(req, res) {
  try {
    const { workspaceId } = req.params;
    const { provider, name, integrationType, tableId, credentials, fieldMapping, providerConfig } = req.body;

    if (!provider || !name) {
      return res.status(400).json({ error: 'provider y name son requeridos' });
    }

    const config = await configRepo.getConfig(workspaceId);
    const apis   = config.integrations?.externalApis || [];

    const newApi = {
      id: uuidv4(),
      provider,
      name,
      integrationType: integrationType || null,
      tableId: tableId || null,
      enabled: true,
      credentials: credentials ? { encrypted: encryptCredentials(credentials) } : null,
      fieldMapping: fieldMapping || {},
      providerConfig: providerConfig || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    apis.push(newApi);
    await configRepo.updateConfig(workspaceId, { 'integrations.externalApis': apis });

    log.info('External API created', { workspaceId, apiId: newApi.id, provider });
    res.status(201).json({ ...newApi, credentials: credentials ? '(cifrado)' : null });
  } catch (err) {
    log.error('createExternalApi error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/workspace/:workspaceId/integrations/external/:apiId
 */
export async function updateExternalApi(req, res) {
  try {
    const { workspaceId, apiId } = req.params;
    const updates = req.body;

    const config = await configRepo.getConfig(workspaceId);
    const apis   = config.integrations?.externalApis || [];
    const idx    = apis.findIndex(a => a.id === apiId);
    if (idx === -1) return res.status(404).json({ error: 'Integración no encontrada' });

    // Si vienen credenciales nuevas, cifrarlas
    if (updates.credentials && typeof updates.credentials === 'object' && !updates.credentials.encrypted) {
      updates.credentials = { encrypted: encryptCredentials(updates.credentials) };
    }

    apis[idx] = { ...apis[idx], ...updates, id: apiId, updatedAt: new Date().toISOString() };
    await configRepo.updateConfig(workspaceId, { 'integrations.externalApis': apis });

    res.json({ ...apis[idx], credentials: apis[idx].credentials ? '(cifrado)' : null });
  } catch (err) {
    log.error('updateExternalApi error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/workspace/:workspaceId/integrations/external/:apiId
 */
export async function deleteExternalApi(req, res) {
  try {
    const { workspaceId, apiId } = req.params;
    const config = await configRepo.getConfig(workspaceId);
    const apis   = (config.integrations?.externalApis || []).filter(a => a.id !== apiId);
    await configRepo.updateConfig(workspaceId, { 'integrations.externalApis': apis });
    res.json({ success: true });
  } catch (err) {
    log.error('deleteExternalApi error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/workspace/:workspaceId/integrations/external/:apiId/test
 * Prueba la conexión haciendo una llamada real al API del proveedor.
 */
export async function testExternalApi(req, res) {
  try {
    const { workspaceId, apiId } = req.params;
    const config = await configRepo.getConfig(workspaceId);
    const api    = (config.integrations?.externalApis || []).find(a => a.id === apiId);
    if (!api) return res.status(404).json({ error: 'Integración no encontrada' });

    if (!api.credentials?.encrypted) {
      return res.status(400).json({ error: 'No hay credenciales configuradas' });
    }

    const creds = decryptCredentials(api.credentials.encrypted);

    // Endpoint de prueba según proveedor
    const TEST_ENDPOINTS = {
      alegra:  { url: 'https://api.alegra.com/api/v1/company', auth: `Basic ${Buffer.from(`${creds.username}:${creds.token}`).toString('base64')}` },
      siigo:   { url: 'https://api.siigo.com/v1/users',        auth: `Bearer ${creds.accessToken}` },
      custom:  { url: api.providerConfig?.baseUrl ? `${api.providerConfig.baseUrl}/` : null, auth: creds.token ? `Bearer ${creds.token}` : null },
    };

    const testCfg = TEST_ENDPOINTS[api.provider];
    if (!testCfg?.url) {
      return res.json({ success: true, message: 'API personalizada — no hay endpoint de prueba automático. Guarda y usa un flujo de prueba.' });
    }

    const { default: axios } = await import('axios');
    const resp = await axios.get(testCfg.url, {
      headers: { Authorization: testCfg.auth, 'Content-Type': 'application/json' },
      timeout: 8000,
      validateStatus: () => true,
    });

    if (resp.status >= 200 && resp.status < 300) {
      return res.json({ success: true, message: 'Conexión exitosa', status: resp.status });
    }
    return res.json({ success: false, message: `Error HTTP ${resp.status}`, status: resp.status });

  } catch (err) {
    log.error('testExternalApi error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
}

/**
 * Resuelve credenciales de una integración para uso interno (flujos).
 * NO exponer por HTTP — solo uso interno del servidor.
 */
export async function resolveIntegrationCredentials(workspaceId, apiId) {
  const config = await configRepo.getConfig(workspaceId);
  const api    = (config.integrations?.externalApis || []).find(a => a.id === apiId);
  if (!api?.credentials?.encrypted) return null;
  return {
    ...api,
    credentials: decryptCredentials(api.credentials.encrypted),
  };
}
