/**
 * GlobalVariablesService - Variables globales del workspace
 * 
 * Variables como {{precio_consulta}}, {{horario_atencion}} que se usan
 * en todos los flujos y se pueden editar desde un dashboard central.
 */

import { connectDB, sanitizeDatabaseName } from '../config/db.js';
import { SystemConfig } from '../config/system.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';

const log = logger.child('GlobalVariables');

const DB_PREFIX = SystemConfig.database.prefix;

// Tipos de variables soportados
export const VARIABLE_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  TIME: 'time',
  JSON: 'json',
  SECRET: 'secret', // Se oculta en UI, encriptado en BD
  LIST: 'list'
};

// Categorías predefinidas
export const VARIABLE_CATEGORIES = {
  BUSINESS: 'business',    // Info del negocio
  CONTACT: 'contact',      // Datos de contacto
  SCHEDULE: 'schedule',    // Horarios
  PRICING: 'pricing',      // Precios
  TEMPLATES: 'templates',  // Plantillas de mensajes
  SYSTEM: 'system',        // Variables del sistema
  CUSTOM: 'custom'         // Personalizadas
};

/**
 * Obtiene el nombre de la BD de variables
 */
function getDbName(workspaceId) {
  return `${DB_PREFIX}variables_${sanitizeDatabaseName(workspaceId)}`;
}

/**
 * Obtiene todas las variables de un workspace
 */
export async function getVariables(workspaceId, options = {}) {
  const cacheKey = cache.key('vars', workspaceId, options.category || 'all');
  
  // Intentar cache
  const cached = cache.get(cacheKey);
  if (cached && !options.skipCache) {
    return cached;
  }
  
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    const selector = { type: 'variable' };
    if (options.category) {
      selector.category = options.category;
    }
    
    const result = await db.find({
      selector,
      sort: [{ category: 'asc' }, { name: 'asc' }]
    });
    
    const variables = result.docs || [];
    
    // Ocultar valores secretos
    const sanitized = variables.map(v => ({
      ...v,
      value: v.type === VARIABLE_TYPES.SECRET ? '••••••••' : v.value,
      isSecret: v.type === VARIABLE_TYPES.SECRET
    }));
    
    cache.set(cacheKey, sanitized, cache.TTL.short);
    return sanitized;
    
  } catch (error) {
    // BD no existe, retornar variables por defecto
    if (error.statusCode === 404) {
      return getDefaultVariables(workspaceId);
    }
    log.error('Error getting variables', { error: error.message });
    return [];
  }
}

/**
 * Obtiene una variable específica
 */
export async function getVariable(workspaceId, variableId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const doc = await db.get(variableId);
    
    // Ocultar valor si es secreto
    if (doc.type === VARIABLE_TYPES.SECRET) {
      doc.value = '••••••••';
      doc.isSecret = true;
    }
    
    return doc;
  } catch {
    return null;
  }
}

/**
 * Obtiene el valor real de una variable (incluyendo secretos)
 */
export async function getVariableValue(workspaceId, variableName) {
  const cacheKey = cache.key('var_value', workspaceId, variableName);
  
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    const db = await connectDB(getDbName(workspaceId));
    const result = await db.find({
      selector: { type: 'variable', name: variableName },
      limit: 1
    });
    
    if (result.docs && result.docs.length > 0) {
      const value = result.docs[0].value;
      cache.set(cacheKey, value, cache.TTL.short);
      return value;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Crea o actualiza una variable
 */
export async function upsertVariable(workspaceId, variableData) {
  const db = await connectDB(getDbName(workspaceId));
  
  // Validar datos
  if (!variableData.name) {
    throw new Error('El nombre es requerido');
  }
  
  // Normalizar nombre (sin espacios, lowercase para la key)
  const key = variableData.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  // Buscar si existe
  let existing = null;
  if (variableData._id) {
    try {
      existing = await db.get(variableData._id);
    } catch {}
  } else {
    const result = await db.find({
      selector: { type: 'variable', key },
      limit: 1
    });
    existing = result.docs?.[0];
  }
  
  const doc = {
    _id: existing?._id || `var_${key}`,
    _rev: existing?._rev,
    type: 'variable',
    key,
    name: variableData.name,
    description: variableData.description || '',
    value: variableData.value,
    valueType: variableData.valueType || VARIABLE_TYPES.TEXT,
    category: variableData.category || VARIABLE_CATEGORIES.CUSTOM,
    isRequired: variableData.isRequired || false,
    defaultValue: variableData.defaultValue,
    validation: variableData.validation,
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  
  await db.insert(doc);
  
  // Invalidar cache
  cache.invalidatePattern(`vars:${workspaceId}:*`);
  cache.invalidatePattern(`var_value:${workspaceId}:*`);
  
  log.info('Variable upserted', { workspaceId, key });
  
  return doc;
}

/**
 * Elimina una variable
 */
export async function deleteVariable(workspaceId, variableId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const doc = await db.get(variableId);
    await db.destroy(doc._id, doc._rev);
    
    cache.invalidatePattern(`vars:${workspaceId}:*`);
    cache.invalidatePattern(`var_value:${workspaceId}:*`);
    
    log.info('Variable deleted', { workspaceId, variableId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Actualiza múltiples variables a la vez
 */
export async function bulkUpdateVariables(workspaceId, variables) {
  const db = await connectDB(getDbName(workspaceId));
  const results = [];
  
  for (const varData of variables) {
    try {
      const result = await upsertVariable(workspaceId, varData);
      results.push({ success: true, variable: result });
    } catch (error) {
      results.push({ success: false, error: error.message, name: varData.name });
    }
  }
  
  return results;
}

/**
 * Obtiene un objeto con todas las variables resueltas (para usar en templates)
 */
export async function getVariablesAsObject(workspaceId) {
  const cacheKey = cache.key('vars_obj', workspaceId);
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    const db = await connectDB(getDbName(workspaceId));
    const result = await db.find({
      selector: { type: 'variable' }
    });
    
    const obj = {};
    for (const doc of result.docs || []) {
      obj[doc.key] = doc.value;
    }
    
    cache.set(cacheKey, obj, cache.TTL.short);
    return obj;
    
  } catch {
    return {};
  }
}

/**
 * Variables por defecto para nuevos workspaces
 */
export function getDefaultVariables(workspaceId) {
  return [
    {
      _id: 'var_nombre_negocio',
      key: 'nombre_negocio',
      name: 'Nombre del Negocio',
      value: 'Mi Negocio',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.BUSINESS,
      description: 'Nombre que aparece en mensajes'
    },
    {
      _id: 'var_telefono_contacto',
      key: 'telefono_contacto',
      name: 'Teléfono de Contacto',
      value: '',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.CONTACT,
      description: 'Número de WhatsApp o teléfono'
    },
    {
      _id: 'var_email_contacto',
      key: 'email_contacto',
      name: 'Email de Contacto',
      value: '',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.CONTACT,
      description: 'Email para notificaciones'
    },
    {
      _id: 'var_horario_atencion',
      key: 'horario_atencion',
      name: 'Horario de Atención',
      value: 'Lunes a Viernes de 8:00 AM a 6:00 PM',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.SCHEDULE,
      description: 'Horario para mostrar a clientes'
    },
    {
      _id: 'var_mensaje_bienvenida',
      key: 'mensaje_bienvenida',
      name: 'Mensaje de Bienvenida',
      value: '¡Hola! 👋 Bienvenido a {{nombre_negocio}}. ¿En qué puedo ayudarte?',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.TEMPLATES,
      description: 'Mensaje inicial del bot'
    },
    {
      _id: 'var_mensaje_despedida',
      key: 'mensaje_despedida',
      name: 'Mensaje de Despedida',
      value: '¡Gracias por contactarnos! Si necesitas algo más, aquí estaré. 😊',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.TEMPLATES,
      description: 'Mensaje de cierre'
    },
    {
      _id: 'var_moneda',
      key: 'moneda',
      name: 'Moneda',
      value: 'COP',
      valueType: VARIABLE_TYPES.TEXT,
      category: VARIABLE_CATEGORIES.PRICING,
      description: 'Código de moneda (COP, USD, etc.)'
    }
  ];
}

/**
 * Inicializa variables por defecto si el workspace es nuevo
 */
export async function initializeDefaultVariables(workspaceId) {
  const existing = await getVariables(workspaceId);
  
  if (existing.length === 0) {
    const defaults = getDefaultVariables(workspaceId);
    await bulkUpdateVariables(workspaceId, defaults);
    log.info('Default variables initialized', { workspaceId });
  }
}

export default {
  getVariables,
  getVariable,
  getVariableValue,
  upsertVariable,
  deleteVariable,
  bulkUpdateVariables,
  getVariablesAsObject,
  initializeDefaultVariables,
  VARIABLE_TYPES,
  VARIABLE_CATEGORIES
};
