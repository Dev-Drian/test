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

/**
 * GET /api/plans/providers - Obtener proveedores de pago disponibles
 */
export async function getPaymentProviders(req, res) {
  try {
    const { getAvailableProviders } = await import('../services/payments/PaymentService.js');
    const providers = getAvailableProviders();
    
    // Devolver solo info pública (sin revelar credenciales)
    const publicProviders = providers.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      countries: p.countries,
      color: p.color,
    }));

    res.json({ providers: publicProviders });
  } catch (err) {
    console.error('[getPaymentProviders] Error:', err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
}

/**
 * POST /api/plans/subscribe - Crear link de pago para suscripción
 */
export async function subscribe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const { planId, provider, successUrl, cancelUrl } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId es requerido' });
    }

    // Verificar que el plan existe
    const plans = await getPlans();
    const targetPlan = plans[planId];
    
    if (!targetPlan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    // No permitir "suscribirse" al plan gratuito
    if (targetPlan.price === 0 || !targetPlan.price) {
      return res.status(400).json({ error: 'El plan gratuito no requiere pago' });
    }

    // Verificar que no es el mismo plan
    if (req.user.plan === planId) {
      return res.status(400).json({ error: 'Ya tienes este plan activo' });
    }

    // Importar servicio de pagos
    const { getPaymentService, getAvailableProviders, getProviderInfo } = await import('../services/payments/PaymentService.js');
    
    // Determinar proveedor a usar
    const availableProviders = getAvailableProviders();
    if (availableProviders.length === 0) {
      return res.status(503).json({ 
        error: 'No hay proveedores de pago configurados. Contacta al administrador.' 
      });
    }

    // Si se especificó un proveedor, verificar que esté disponible
    let selectedProvider = provider;
    if (selectedProvider) {
      const providerInfo = getProviderInfo(selectedProvider);
      if (!providerInfo || !providerInfo.available()) {
        return res.status(400).json({ 
          error: `El proveedor '${selectedProvider}' no está disponible`,
          availableProviders: availableProviders.map(p => p.id)
        });
      }
    } else {
      // Usar el primer proveedor disponible por defecto
      selectedProvider = availableProviders[0].id;
    }

    const paymentService = getPaymentService({ provider: selectedProvider });

    // Crear referencia única para la suscripción
    // Formato: sub:provider:userId:planId:timestamp
    const subscriptionRef = `sub:${selectedProvider}:${req.user._id}:${planId}:${Date.now()}`;

    // Determinar URL base del frontend (desde el request o default)
    const frontendUrl = successUrl 
      ? new URL(successUrl).origin 
      : process.env.FRONTEND_URL || 'http://localhost:3020';

    // Crear link de pago
    const result = await paymentService.createPaymentLink({
      title: `Suscripción ${targetPlan.name} - FlowAI`,
      amount: targetPlan.price,
      currency: targetPlan.currency || 'COP',
      externalRef: subscriptionRef,
      payerEmail: req.user.email,
      payerName: req.user.name,
      // URLs de retorno para el frontend
      successUrl: `${frontendUrl}/upgrade?success=true&plan=${planId}`,
      failureUrl: `${frontendUrl}/upgrade?cancelled=true`,
      pendingUrl: `${frontendUrl}/upgrade?pending=true`,
    });

    // Guardar pedido de suscripción pendiente
    const subscriptionsDb = await connectDB(`${getDbPrefix()}_subscriptions`);
    await subscriptionsDb.insert({
      _id: subscriptionRef,
      userId: req.user._id,
      userEmail: req.user.email,
      planId,
      planName: targetPlan.name,
      amount: targetPlan.price,
      currency: targetPlan.currency || 'COP',
      provider: selectedProvider,
      status: 'pending',
      paymentUrl: result.paymentUrl,
      createdAt: new Date().toISOString(),
    });

    res.json({
      subscriptionId: subscriptionRef,
      paymentUrl: result.paymentUrl,
      provider: selectedProvider,
      plan: {
        id: planId,
        name: targetPlan.name,
        price: targetPlan.price,
      }
    });

  } catch (err) {
    console.error('[subscribe] Error:', err);
    res.status(500).json({ error: 'Error al crear suscripción: ' + err.message });
  }
}

/**
 * POST /api/plans/webhook - Webhook para procesar pagos de suscripciones
 * Soporta Wompi y MercadoPago
 */
export async function handleSubscriptionWebhook(req, res) {
  // Responder inmediatamente (los proveedores reintentan si no reciben 200 rápido)
  res.status(200).json({ received: true });

  try {
    console.info('[PlanWebhook] Webhook recibido:', JSON.stringify(req.body, null, 2));
    
    const { getPaymentService } = await import('../services/payments/PaymentService.js');
    
    // Detectar proveedor por la estructura del webhook
    const isMercadoPagoPayment = req.body?.type === 'payment' || req.body?.action?.startsWith('payment.');
    const isMercadoPagoOrder = req.body?.topic === 'merchant_order' || req.body?.topic === 'payment';
    const isMercadoPago = isMercadoPagoPayment || isMercadoPagoOrder;
    const isWompi = req.body?.event?.startsWith('transaction') || req.body?.data?.transaction;
    
    let provider = 'wompi';
    let transactionId = null;
    let paymentData = null;
    
    if (isMercadoPago) {
      provider = 'mercadopago';
      const paymentService = getPaymentService({ provider: 'mercadopago' });
      
      // MercadoPago puede enviar diferentes formatos de webhook
      if (isMercadoPagoOrder) {
        // Formato IPN: { resource: "url", topic: "merchant_order" o "payment" }
        const resourceUrl = req.body?.resource;
        const topic = req.body?.topic;
        
        console.info(`[PlanWebhook] MercadoPago IPN - Topic: ${topic}, Resource: ${resourceUrl}`);
        
        if (topic === 'merchant_order') {
          // Para merchant_order, consultamos la orden y buscamos pagos aprobados
          const orderId = resourceUrl?.split('/').pop();
          console.info(`[PlanWebhook] Consultando merchant_order: ${orderId}`);
          
          try {
            const orderData = await paymentService.getMerchantOrder(orderId);
            console.info(`[PlanWebhook] Merchant order status: ${orderData.status}, payments:`, orderData.payments?.length);
            
            // Buscar un pago aprobado en la orden
            const approvedPayment = orderData.payments?.find(p => p.status === 'approved');
            if (!approvedPayment) {
              console.info('[PlanWebhook] Merchant order sin pagos aprobados');
              return;
            }
            
            transactionId = approvedPayment.id;
            console.info(`[PlanWebhook] Pago aprobado encontrado: ${transactionId}`);
            
          } catch (orderErr) {
            console.error('[PlanWebhook] Error consultando merchant_order:', orderErr.message);
            return;
          }
        } else if (topic === 'payment') {
          // Para payment IPN, el ID viene en la URL
          transactionId = resourceUrl?.split('/').pop();
        }
        
      } else {
        // Formato webhook v2: { type: "payment", data: { id: "xxx" } }
        transactionId = req.body?.data?.id;
      }
      
      console.info(`[PlanWebhook] MercadoPago webhook - Payment ID: ${transactionId}`);
      
      if (!transactionId) {
        console.warn('[PlanWebhook] MercadoPago: Sin payment ID');
        return;
      }
      
      // Consultar estado del pago en MercadoPago
      paymentData = await paymentService.getPaymentStatus(String(transactionId));
      
    } else if (isWompi) {
      provider = 'wompi';
      transactionId = req.body?.data?.transaction?.id;
      
      console.info(`[PlanWebhook] Wompi webhook - Transaction ID: ${transactionId}`);
      
      if (!transactionId) {
        console.warn('[PlanWebhook] Wompi: Sin transaction ID');
        return;
      }
      
      // Validar firma del webhook de Wompi
      const paymentService = getPaymentService({ provider: 'wompi' });
      const isValid = paymentService.validateWebhook(req.body, req.headers);
      if (!isValid) {
        console.warn('[PlanWebhook] Wompi: Firma inválida');
        return;
      }
      
      // Solo procesar eventos de transacción
      const event = req.body?.event || '';
      if (event && !event.startsWith('transaction')) {
        console.info(`[PlanWebhook] Ignorando evento: ${event}`);
        return;
      }
      
      paymentData = await paymentService.getPaymentStatus(String(transactionId));
      
    } else {
      console.warn('[PlanWebhook] Proveedor no reconocido:', JSON.stringify(req.body).slice(0, 200));
      return;
    }
    
    console.info(`[PlanWebhook] Estado del pago:`, paymentData);
    
    // Verificar que el pago esté aprobado
    if (paymentData.status !== 'pagado' && paymentData.status !== 'approved') {
      console.info(`[PlanWebhook] Pago no aprobado: ${paymentData.status}`);
      return;
    }

    // Parsear referencia: sub:provider:userId:planId:timestamp
    const ref = paymentData.externalRef;
    if (!ref || !ref.startsWith('sub:')) {
      console.info('[PlanWebhook] No es una suscripción, ignorando. Ref:', ref);
      return;
    }

    const parts = ref.split(':');
    // Formato: sub:provider:userId:planId:timestamp
    if (parts.length < 4) {
      console.warn('[PlanWebhook] Referencia inválida:', ref);
      return;
    }

    const refProvider = parts[1];
    const userId = parts[2];
    const planId = parts[3];

    console.info(`[PlanWebhook] Activando plan ${planId} para usuario ${userId} (provider: ${refProvider})`);

    // Actualizar plan del usuario
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    const user = await accountsDb.get(userId);
    
    const oldPlan = user.plan || 'free';
    
    await accountsDb.insert({
      ...user,
      plan: planId,
      planActivatedAt: new Date().toISOString(),
      planPaymentId: transactionId,
      planProvider: provider,
      updatedAt: new Date().toISOString(),
    });

    // Actualizar estado de la suscripción
    const subscriptionsDb = await connectDB(`${getDbPrefix()}_subscriptions`);
    try {
      const subscription = await subscriptionsDb.get(ref);
      await subscriptionsDb.insert({
        ...subscription,
        status: 'active',
        activatedAt: new Date().toISOString(),
        transactionId,
      });
    } catch (e) {
      // La suscripción podría no existir si es una prueba
      console.warn('[PlanWebhook] Suscripción no encontrada:', ref);
    }

    // Enviar email de confirmación
    try {
      const { getEmailService } = await import('../services/EmailService.js');
      const plans = await getPlans();
      const newPlan = plans[planId];
      
      await getEmailService().sendPlanUpgrade(user.email, user.name, {
        planName: newPlan?.name || planId,
        features: Object.entries(newPlan?.features || {})
          .filter(([_, v]) => v === true)
          .map(([k]) => k)
      });
    } catch (emailErr) {
      console.error('[PlanWebhook] Error enviando email:', emailErr.message);
    }

    // Notificar via socket si está conectado
    try {
      const { getSocketService } = await import('../realtime/SocketService.js');
      getSocketService().toUser(userId, 'plan:upgraded', {
        oldPlan,
        newPlan: planId,
      });
    } catch (socketErr) {
      console.error('[PlanWebhook] Error socket:', socketErr.message);
    }

    console.info(`[PlanWebhook] Plan ${planId} activado exitosamente para ${userId}`);

  } catch (err) {
    console.error('[PlanWebhook] Error:', err.message, err.stack);
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
  getMyPlan,
  getPaymentProviders,
  subscribe,
  handleSubscriptionWebhook
};
