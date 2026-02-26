/**
 * LimitsMiddleware - Validación de límites por plan
 * 
 * Middleware que verifica los límites del usuario antes de crear recursos.
 * Los límites se obtienen de la BD (_plans) y se cachean.
 */

import { connectDB, getDbPrefix, getWorkspaceDbName, getAgentsDbName, getFlowsDbName } from '../config/db.js';
import { DEFAULT_PLANS, LIMIT_MESSAGES } from '../config/plans.js';
import cache from '../config/cache.js';

const PLANS_CACHE_KEY = 'plans:all';
const PLANS_CACHE_TTL = 600; // 10 minutos

/**
 * Obtiene todos los planes (con cache)
 */
export async function getPlans() {
  const cached = cache.get(PLANS_CACHE_KEY);
  if (cached) return cached;
  
  try {
    const db = await connectDB(`${getDbPrefix()}_plans`);
    const result = await db.list({ include_docs: true });
    const plans = {};
    
    result.rows.forEach(row => {
      if (!row.id.startsWith('_')) {
        plans[row.id] = row.doc;
      }
    });
    
    // Si no hay planes en BD, usar defaults
    if (Object.keys(plans).length === 0) {
      cache.set(PLANS_CACHE_KEY, DEFAULT_PLANS, PLANS_CACHE_TTL);
      return DEFAULT_PLANS;
    }
    
    cache.set(PLANS_CACHE_KEY, plans, PLANS_CACHE_TTL);
    return plans;
  } catch (err) {
    console.error('[getPlans] Error:', err.message);
    return DEFAULT_PLANS;
  }
}

/**
 * Obtiene el plan de un usuario
 */
export async function getUserPlan(user) {
  const plans = await getPlans();
  const planId = user.plan || 'free';
  return plans[planId] || plans.free || DEFAULT_PLANS.free;
}

/**
 * Cuenta los recursos actuales del usuario
 */
export async function countUserResources(userId) {
  try {
    const db = await connectDB(`${getDbPrefix()}accounts`);
    const user = await db.get(userId);
    
    // Contar workspaces
    const workspacesOwned = user.workspacesOwner?.length || 0;
    
    return {
      workspaces: workspacesOwned
    };
  } catch (err) {
    console.error('[countUserResources] Error:', err.message);
    return { workspaces: 0 };
  }
}

/**
 * Cuenta tablas en un workspace
 */
export async function countWorkspaceTables(workspaceId) {
  try {
    const db = await connectDB(getWorkspaceDbName(workspaceId));
    const result = await db.list();
    // Filtrar solo tablas (no empiezan con _)
    return result.rows.filter(r => !r.id.startsWith('_')).length;
  } catch (err) {
    console.error('[countWorkspaceTables] Error:', err.message);
    return 0;
  }
}

/**
 * Cuenta registros en una tabla
 */
export async function countTableRecords(workspaceId, tableId) {
  try {
    const dbName = `${getDbPrefix()}${workspaceId}_data_${tableId}`;
    const db = await connectDB(dbName);
    const result = await db.list();
    return result.rows.filter(r => !r.id.startsWith('_')).length;
  } catch (err) {
    // Si la BD no existe, no hay registros
    return 0;
  }
}

/**
 * Cuenta agentes en un workspace
 */
export async function countWorkspaceAgents(workspaceId) {
  try {
    const db = await connectDB(getAgentsDbName(workspaceId));
    const result = await db.list();
    return result.rows.filter(r => !r.id.startsWith('_')).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Cuenta flujos en un workspace
 */
export async function countWorkspaceFlows(workspaceId) {
  try {
    const db = await connectDB(getFlowsDbName(workspaceId));
    const result = await db.list();
    return result.rows.filter(r => !r.id.startsWith('_')).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Verifica si el límite permite la operación
 * @returns {boolean} true si está dentro del límite
 */
function isWithinLimit(current, limit) {
  if (limit === -1) return true; // -1 = ilimitado
  return current < limit;
}

/**
 * Genera respuesta de error por límite alcanzado
 */
function limitError(res, limitType, current, limit, plan) {
  const msg = LIMIT_MESSAGES[limitType] || {
    title: 'Límite alcanzado',
    message: 'Has alcanzado el límite de tu plan.',
    action: 'Mejora tu plan para continuar.'
  };
  
  return res.status(403).json({
    success: false,
    data: null,
    error: msg.message,
    code: 'LIMIT_REACHED',
    limitType,
    current,
    limit,
    plan: plan._id,
    upgrade: {
      title: msg.title,
      message: msg.message,
      action: msg.action,
      url: '/upgrade'
    }
  });
}

// ========== MIDDLEWARES ==========

/**
 * Middleware: Verifica si puede crear un workspace
 */
export async function checkCanCreateWorkspace(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const plan = await getUserPlan(req.user);
    const resources = await countUserResources(req.user._id);
    
    if (!isWithinLimit(resources.workspaces, plan.limits.workspaces)) {
      return limitError(res, 'workspaces', resources.workspaces, plan.limits.workspaces, plan);
    }
    
    req.userPlan = plan;
    req.userResources = resources;
    next();
  } catch (err) {
    console.error('[checkCanCreateWorkspace] Error:', err);
    next(); // En caso de error, permitir (fail open para no bloquear)
  }
}

/**
 * Middleware: Verifica si puede crear una tabla en el workspace
 */
export async function checkCanCreateTable(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }
    
    const plan = await getUserPlan(req.user);
    const currentTables = await countWorkspaceTables(workspaceId);
    
    if (!isWithinLimit(currentTables, plan.limits.tablesPerWorkspace)) {
      return limitError(res, 'tablesPerWorkspace', currentTables, plan.limits.tablesPerWorkspace, plan);
    }
    
    req.userPlan = plan;
    req.currentTables = currentTables;
    next();
  } catch (err) {
    console.error('[checkCanCreateTable] Error:', err);
    next();
  }
}

/**
 * Middleware: Verifica si puede agregar registros a una tabla
 */
export async function checkCanCreateRecord(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const tableId = req.params.tableId || req.body.tableId;
    
    if (!workspaceId || !tableId) {
      return next(); // Sin IDs, dejar pasar (se validará después)
    }
    
    const plan = await getUserPlan(req.user);
    const currentRecords = await countTableRecords(workspaceId, tableId);
    
    if (!isWithinLimit(currentRecords, plan.limits.recordsPerTable)) {
      return limitError(res, 'recordsPerTable', currentRecords, plan.limits.recordsPerTable, plan);
    }
    
    req.userPlan = plan;
    req.currentRecords = currentRecords;
    next();
  } catch (err) {
    console.error('[checkCanCreateRecord] Error:', err);
    next();
  }
}

/**
 * Middleware: Verifica si puede crear un agente
 */
export async function checkCanCreateAgent(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }
    
    const plan = await getUserPlan(req.user);
    const currentAgents = await countWorkspaceAgents(workspaceId);
    
    if (!isWithinLimit(currentAgents, plan.limits.agents)) {
      return limitError(res, 'agents', currentAgents, plan.limits.agents, plan);
    }
    
    req.userPlan = plan;
    req.currentAgents = currentAgents;
    next();
  } catch (err) {
    console.error('[checkCanCreateAgent] Error:', err);
    next();
  }
}

/**
 * Middleware: Verifica si puede crear un flujo
 */
export async function checkCanCreateFlow(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId requerido' });
    }
    
    const plan = await getUserPlan(req.user);
    const currentFlows = await countWorkspaceFlows(workspaceId);
    
    if (!isWithinLimit(currentFlows, plan.limits.flows)) {
      return limitError(res, 'flows', currentFlows, plan.limits.flows, plan);
    }
    
    req.userPlan = plan;
    req.currentFlows = currentFlows;
    next();
  } catch (err) {
    console.error('[checkCanCreateFlow] Error:', err);
    next();
  }
}

/**
 * Middleware: Verifica si el modelo de IA está permitido
 */
export async function checkAiModelAllowed(req, res, next) {
  try {
    if (!req.user) return next();
    
    const model = req.body.model || req.body.aiModel;
    if (!model) return next();
    
    const plan = await getUserPlan(req.user);
    const allowedModels = plan.aiModels || ['gpt-4o-mini'];
    
    // Normalizar modelo (puede ser array o string)
    const modelsToCheck = Array.isArray(model) ? model : [model];
    
    for (const m of modelsToCheck) {
      if (!allowedModels.includes(m)) {
        return res.status(403).json({
          error: `El modelo "${m}" no está disponible en tu plan`,
          code: 'MODEL_NOT_ALLOWED',
          allowedModels,
          plan: plan._id
        });
      }
    }
    
    req.userPlan = plan;
    next();
  } catch (err) {
    console.error('[checkAiModelAllowed] Error:', err);
    next();
  }
}

/**
 * Middleware: Adjunta info del plan al request
 */
export async function attachPlanInfo(req, res, next) {
  try {
    if (req.user) {
      req.userPlan = await getUserPlan(req.user);
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Obtiene el uso actual de un usuario para mostrar en UI
 */
export async function getUserUsage(userId, workspaceId = null) {
  const db = await connectDB(`${getDbPrefix()}accounts`);
  const user = await db.get(userId);
  const plan = await getUserPlan(user);
  
  const usage = {
    plan: {
      id: plan._id,
      name: plan.name,
      color: plan.ui?.color,
      badge: plan.ui?.badge
    },
    limits: plan.limits,
    current: {
      workspaces: user.workspacesOwner?.length || 0
    },
    percentages: {}
  };
  
  // Si hay workspaceId, obtener uso específico
  if (workspaceId) {
    usage.current.tables = await countWorkspaceTables(workspaceId);
    usage.current.agents = await countWorkspaceAgents(workspaceId);
    usage.current.flows = await countWorkspaceFlows(workspaceId);
  }
  
  // Calcular porcentajes
  for (const key of Object.keys(usage.current)) {
    const limit = plan.limits[key === 'tables' ? 'tablesPerWorkspace' : key];
    if (limit > 0) {
      usage.percentages[key] = Math.round((usage.current[key] / limit) * 100);
    } else if (limit === -1) {
      usage.percentages[key] = 0; // Ilimitado
    }
  }
  
  return usage;
}

/**
 * Invalida cache de planes (llamar después de editar)
 */
export function invalidatePlansCache() {
  cache.del(PLANS_CACHE_KEY);
}

export default {
  getPlans,
  getUserPlan,
  getUserUsage,
  checkCanCreateWorkspace,
  checkCanCreateTable,
  checkCanCreateRecord,
  checkCanCreateAgent,
  checkCanCreateFlow,
  checkAiModelAllowed,
  attachPlanInfo,
  invalidatePlansCache
};
