/**
 * WebhookService - Webhooks entrantes personalizados
 * 
 * Cada flujo puede tener su URL única de webhook.
 * Cuando recibe una petición, dispara el flujo correspondiente.
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import { getFlowExecutionService } from './FlowExecutionService.js';

const log = logger.child('WebhookService');

/**
 * Genera una URL única para un webhook
 */
function generateWebhookPath() {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Obtiene el nombre de la BD de webhooks
 */
function getDbName(workspaceId) {
  return `workspace_${workspaceId}_webhooks`;
}

/**
 * Crea un nuevo webhook para un flujo
 */
export async function createWebhook(workspaceId, flowId, options = {}) {
  const db = await connectDB(getDbName(workspaceId));
  
  const webhookId = `webhook_${uuidv4().substring(0, 8)}`;
  const path = generateWebhookPath();
  
  const webhook = {
    _id: webhookId,
    type: 'webhook',
    flowId,
    workspaceId,
    path,
    name: options.name || 'Webhook',
    description: options.description || '',
    method: options.method || 'POST', // GET, POST, PUT
    isActive: true,
    secretKey: options.requireAuth ? crypto.randomBytes(32).toString('hex') : null,
    ipWhitelist: options.ipWhitelist || [],
    headers: options.headers || {},
    transform: options.transform || null, // Transformación del payload
    responseTemplate: options.responseTemplate || '{"success": true}',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastCalledAt: null
    }
  };
  
  await db.insert(webhook);
  
  // Generar URL completa
  const baseUrl = process.env.BASE_URL || 'http://localhost:3010';
  webhook.url = `${baseUrl}/inbound/webhook/${path}`;
  
  log.info('Webhook created', { webhookId, flowId, path });
  
  return webhook;
}

/**
 * Obtiene un webhook por su path
 */
export async function getWebhookByPath(path) {
  const cacheKey = cache.key('webhook_path', path);
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    // Buscar en todas las BDs de workspaces
    // En producción, tendrías un índice centralizado
    const mainDb = await connectDB('webhooks_index');
    
    const result = await mainDb.find({
      selector: { path, type: 'webhook_index' },
      limit: 1
    });
    
    if (result.docs && result.docs.length > 0) {
      const index = result.docs[0];
      const webhookDb = await connectDB(getDbName(index.workspaceId));
      const webhook = await webhookDb.get(index.webhookId);
      
      cache.set(cacheKey, webhook, cache.TTL.short);
      return webhook;
    }
    
    return null;
  } catch (error) {
    log.error('Error getting webhook by path', { error: error.message });
    return null;
  }
}

/**
 * Lista webhooks de un workspace
 */
export async function listWebhooks(workspaceId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    const result = await db.find({
      selector: { type: 'webhook' },
      sort: [{ createdAt: 'desc' }]
    });
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3010';
    
    return (result.docs || []).map(w => ({
      ...w,
      url: `${baseUrl}/inbound/webhook/${w.path}`
    }));
  } catch (error) {
    log.error('Error listing webhooks', { error: error.message });
    return [];
  }
}

/**
 * Actualiza un webhook
 */
export async function updateWebhook(workspaceId, webhookId, updates) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const existing = await db.get(webhookId);
    
    const updated = {
      ...existing,
      ...updates,
      _rev: existing._rev,
      updatedAt: new Date().toISOString()
    };
    
    // No permitir cambiar path
    updated.path = existing.path;
    
    await db.insert(updated);
    
    // Invalidar cache
    cache.del(cache.key('webhook_path', existing.path));
    
    return updated;
  } catch (error) {
    log.error('Error updating webhook', { error: error.message });
    throw error;
  }
}

/**
 * Elimina un webhook
 */
export async function deleteWebhook(workspaceId, webhookId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const webhook = await db.get(webhookId);
    
    await db.destroy(webhook._id, webhook._rev);
    
    // Invalidar cache
    cache.del(cache.key('webhook_path', webhook.path));
    
    // Eliminar índice
    try {
      const indexDb = await connectDB('webhooks_index');
      const indexResult = await indexDb.find({
        selector: { webhookId },
        limit: 1
      });
      if (indexResult.docs && indexResult.docs.length > 0) {
        const index = indexResult.docs[0];
        await indexDb.destroy(index._id, index._rev);
      }
    } catch {}
    
    log.info('Webhook deleted', { webhookId });
    return true;
  } catch (error) {
    log.error('Error deleting webhook', { error: error.message });
    return false;
  }
}

/**
 * Procesa una llamada a webhook
 */
export async function processWebhookCall(path, method, headers, body, query, ip) {
  log.info('Processing webhook call', { path, method, ip });
  
  const webhook = await getWebhookByPath(path);
  
  if (!webhook) {
    return {
      success: false,
      status: 404,
      error: 'Webhook no encontrado'
    };
  }
  
  if (!webhook.isActive) {
    return {
      success: false,
      status: 503,
      error: 'Webhook desactivado'
    };
  }
  
  // Validar método
  if (webhook.method !== 'ANY' && webhook.method !== method) {
    return {
      success: false,
      status: 405,
      error: `Método ${method} no permitido, usa ${webhook.method}`
    };
  }
  
  // Validar autenticación si es requerida
  if (webhook.secretKey) {
    const authHeader = headers['x-webhook-secret'] || headers['authorization'];
    if (authHeader !== webhook.secretKey && authHeader !== `Bearer ${webhook.secretKey}`) {
      return {
        success: false,
        status: 401,
        error: 'No autorizado'
      };
    }
  }
  
  // Validar IP si hay whitelist
  if (webhook.ipWhitelist && webhook.ipWhitelist.length > 0) {
    if (!webhook.ipWhitelist.includes(ip)) {
      return {
        success: false,
        status: 403,
        error: 'IP no permitida'
      };
    }
  }
  
  // Transformar payload si hay transform definido
  let payload = { ...body, ...query };
  if (webhook.transform) {
    try {
      // Transformación simple de mapeo de campos
      const transformed = {};
      for (const [newKey, sourcePath] of Object.entries(webhook.transform)) {
        transformed[newKey] = getNestedValue(payload, sourcePath);
      }
      payload = transformed;
    } catch (e) {
      log.warn('Transform failed', { error: e.message });
    }
  }
  
  // Actualizar estadísticas
  updateWebhookStats(webhook.workspaceId, webhook._id, true);
  
  // Ejecutar el flujo asociado
  try {
    const executionService = getFlowExecutionService();
    
    // Obtener el flujo
    const flowsDb = await connectDB(`workspace_${webhook.workspaceId}_flows`);
    const flow = await flowsDb.get(webhook.flowId);
    
    // Ejecutar
    const execution = await executionService.executeFlow(flow, payload, {
      workspaceId: webhook.workspaceId,
      triggeredBy: 'webhook',
      webhookId: webhook._id
    });
    
    // Generar respuesta
    let response = webhook.responseTemplate || '{"success": true}';
    
    // Reemplazar variables en la respuesta
    if (response.includes('{{')) {
      response = response.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return execution.variables?.[key.trim()] || match;
      });
    }
    
    return {
      success: true,
      status: 200,
      data: JSON.parse(response),
      executionId: execution._id
    };
    
  } catch (error) {
    log.error('Webhook execution failed', { error: error.message });
    updateWebhookStats(webhook.workspaceId, webhook._id, false);
    
    return {
      success: false,
      status: 500,
      error: 'Error al ejecutar el flujo'
    };
  }
}

/**
 * Actualiza estadísticas del webhook
 */
async function updateWebhookStats(workspaceId, webhookId, success) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const webhook = await db.get(webhookId);
    
    webhook.stats = webhook.stats || { totalCalls: 0, successfulCalls: 0, failedCalls: 0 };
    webhook.stats.totalCalls++;
    if (success) {
      webhook.stats.successfulCalls++;
    } else {
      webhook.stats.failedCalls++;
    }
    webhook.stats.lastCalledAt = new Date().toISOString();
    
    await db.insert(webhook);
  } catch (error) {
    log.warn('Failed to update webhook stats', { error: error.message });
  }
}

/**
 * Helper para obtener valor anidado
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Genera código de ejemplo para integración
 */
export function generateIntegrationCode(webhook, language = 'javascript') {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3010';
  const url = `${baseUrl}/inbound/webhook/${webhook.path}`;
  
  const examples = {
    javascript: `
// JavaScript/Node.js
const response = await fetch('${url}', {
  method: '${webhook.method}',
  headers: {
    'Content-Type': 'application/json',
    ${webhook.secretKey ? `'X-Webhook-Secret': 'TU_SECRET_KEY',` : ''}
  },
  body: JSON.stringify({
    // Tu datos aquí
  })
});

const data = await response.json();
console.log(data);
`,
    curl: `
# cURL
curl -X ${webhook.method} '${url}' \\
  -H 'Content-Type: application/json' \\
  ${webhook.secretKey ? `-H 'X-Webhook-Secret: TU_SECRET_KEY' \\` : ''}
  -d '{"key": "value"}'
`,
    python: `
# Python
import requests

response = requests.${webhook.method.toLowerCase()}(
    '${url}',
    headers={
        'Content-Type': 'application/json',
        ${webhook.secretKey ? `'X-Webhook-Secret': 'TU_SECRET_KEY',` : ''}
    },
    json={'key': 'value'}
)

print(response.json())
`
  };
  
  return examples[language] || examples.javascript;
}

/**
 * Prueba un webhook con datos de ejemplo
 */
export async function testWebhook(workspaceId, webhookId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    let webhook;
    try {
      webhook = await db.get(webhookId);
    } catch (err) {
      if (err.statusCode === 404) {
        return { success: false, status: 404, error: 'Webhook no encontrado' };
      }
      throw err;
    }
    
    if (!webhook) {
      return { success: false, status: 404, error: 'Webhook no encontrado' };
    }
    
    // Datos de prueba
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'test_button'
    };
    
    // Simular headers
    const testHeaders = {
      'content-type': 'application/json',
      'x-webhook-test': 'true'
    };
    
    // Si tiene secretKey, incluirla
    if (webhook.secretKey) {
      testHeaders['x-webhook-secret'] = webhook.secretKey;
    }
    
    log.info('Testing webhook', { webhookId, path: webhook.path });
    
    // Llamar al proceso real del webhook
    const result = await processWebhookCall(
      webhook.path,
      webhook.method || 'POST',
      testHeaders,
      testPayload,
      {},
      '127.0.0.1'
    );
    
    return {
      success: result.success,
      status: result.status,
      data: result.data,
      error: result.error
    };
  } catch (error) {
    log.error('Error testing webhook', { error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  createWebhook,
  getWebhookByPath,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  processWebhookCall,
  generateIntegrationCode,
  testWebhook
};
