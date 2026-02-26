/**
 * PlansController - API para gestión de planes
 * 
 * Solo accesible por superAdmin.
 * Permite CRUD de planes y ver estadísticas de uso.
 */

import { connectDB, getDbPrefix } from '../config/db.js';
import { getPlans, invalidatePlansCache, getUserUsage } from '../middleware/limits.js';

/**
 * GET /api/plans - Lista todos los planes
 */
export async function listPlans(req, res) {
  try {
    const plans = await getPlans();
    
    // Ordenar por sortOrder
    const sortedPlans = Object.values(plans)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    res.json({
      data: sortedPlans,
      total: sortedPlans.length
    });
  } catch (err) {
    console.error('[listPlans] Error:', err);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
}

/**
 * GET /api/plans/:planId - Obtiene un plan específico
 */
export async function getPlan(req, res) {
  try {
    const { planId } = req.params;
    const plans = await getPlans();
    
    if (!plans[planId]) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    res.json(plans[planId]);
  } catch (err) {
    console.error('[getPlan] Error:', err);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
}

/**
 * POST /api/plans - Crea un nuevo plan (superAdmin)
 */
export async function createPlan(req, res) {
  try {
    // Verificar permisos
    if (!req.user?.permissions?.managePlans && req.user?.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Sin permisos para gestionar planes' });
    }
    
    const { _id, name, description, price, limits, features, aiModels, ui } = req.body;
    
    if (!_id || !name) {
      return res.status(400).json({ error: 'ID y nombre son requeridos' });
    }
    
    const db = await connectDB(`${getDbPrefix()}_plans`);
    
    // Verificar si ya existe
    const existing = await db.get(_id).catch(() => null);
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un plan con ese ID' });
    }
    
    const planDoc = {
      _id,
      name,
      description: description || '',
      price: price || 0,
      currency: 'USD',
      billingPeriod: price > 0 ? 'monthly' : null,
      isDefault: false,
      isActive: true,
      sortOrder: 100, // Al final por defecto
      limits: limits || {
        workspaces: 1,
        tablesPerWorkspace: 3,
        recordsPerTable: 100,
        agents: 1,
        flows: 0,
        storage: 100,
        apiCalls: 0
      },
      features: features || {
        chat: true,
        exports: false,
        apiAccess: false,
        webhooks: false,
        customDomain: false,
        whiteLabel: false,
        prioritySupport: false,
        analytics: 'basic'
      },
      aiModels: aiModels || ['gpt-4o-mini'],
      ui: ui || {
        color: '#6b7280',
        badge: '📦',
        highlight: false
      },
      createdAt: new Date().toISOString(),
      createdBy: req.user._id
    };
    
    await db.insert(planDoc);
    invalidatePlansCache();
    
    res.status(201).json(planDoc);
  } catch (err) {
    console.error('[createPlan] Error:', err);
    res.status(500).json({ error: 'Error al crear plan' });
  }
}

/**
 * PUT /api/plans/:planId - Actualiza un plan (superAdmin)
 */
export async function updatePlan(req, res) {
  try {
    // Verificar permisos
    if (!req.user?.permissions?.managePlans && req.user?.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Sin permisos para gestionar planes' });
    }
    
    const { planId } = req.params;
    const updates = req.body;
    
    const db = await connectDB(`${getDbPrefix()}_plans`);
    
    // Obtener plan actual
    const existing = await db.get(planId).catch(() => null);
    if (!existing) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    // No permitir cambiar el _id
    delete updates._id;
    delete updates._rev;
    
    const updatedPlan = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user._id
    };
    
    await db.insert(updatedPlan);
    invalidatePlansCache();
    
    res.json(updatedPlan);
  } catch (err) {
    console.error('[updatePlan] Error:', err);
    res.status(500).json({ error: 'Error al actualizar plan' });
  }
}

/**
 * DELETE /api/plans/:planId - Elimina un plan (superAdmin)
 */
export async function deletePlan(req, res) {
  try {
    // Verificar permisos
    if (!req.user?.permissions?.managePlans && req.user?.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Sin permisos para gestionar planes' });
    }
    
    const { planId } = req.params;
    
    // No permitir eliminar plan 'free'
    if (planId === 'free') {
      return res.status(400).json({ error: 'No se puede eliminar el plan gratuito' });
    }
    
    const db = await connectDB(`${getDbPrefix()}_plans`);
    
    const existing = await db.get(planId).catch(() => null);
    if (!existing) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    
    // Verificar que no hay usuarios con este plan
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    const usersWithPlan = await accountsDb.find({
      selector: { plan: planId },
      limit: 1
    });
    
    if (usersWithPlan.docs?.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un plan con usuarios activos',
        usersCount: usersWithPlan.docs.length
      });
    }
    
    await db.destroy(planId, existing._rev);
    invalidatePlansCache();
    
    res.json({ message: 'Plan eliminado correctamente' });
  } catch (err) {
    console.error('[deletePlan] Error:', err);
    res.status(500).json({ error: 'Error al eliminar plan' });
  }
}

/**
 * GET /api/plans/stats - Estadísticas de uso por plan (superAdmin)
 */
export async function getPlanStats(req, res) {
  try {
    // Verificar permisos
    if (!req.user?.permissions?.managePlans && req.user?.role !== 'superAdmin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    
    const plans = await getPlans();
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    
    const stats = {};
    
    for (const planId of Object.keys(plans)) {
      const result = await accountsDb.find({
        selector: { plan: planId },
        fields: ['_id']
      });
      
      stats[planId] = {
        ...plans[planId],
        usersCount: result.docs?.length || 0
      };
    }
    
    res.json(stats);
  } catch (err) {
    console.error('[getPlanStats] Error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

/**
 * GET /api/user/usage - Obtiene el uso actual del usuario
 */
export async function getMyUsage(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const workspaceId = req.query.workspaceId || null;
    const usage = await getUserUsage(req.user._id, workspaceId);
    
    res.json(usage);
  } catch (err) {
    console.error('[getMyUsage] Error:', err);
    res.status(500).json({ error: 'Error al obtener uso' });
  }
}

/**
 * GET /api/user/plan - Obtiene el plan del usuario actual
 */
export async function getMyPlan(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    
    const plans = await getPlans();
    const userPlan = plans[req.user.plan || 'free'] || plans.free;
    
    // No enviar info sensible
    res.json({
      id: userPlan._id,
      name: userPlan.name,
      description: userPlan.description,
      limits: userPlan.limits,
      features: userPlan.features,
      aiModels: userPlan.aiModels,
      ui: userPlan.ui
    });
  } catch (err) {
    console.error('[getMyPlan] Error:', err);
    res.status(500).json({ error: 'Error al obtener plan' });
  }
}

export default {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanStats,
  getMyUsage,
  getMyPlan
};
