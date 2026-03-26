/**
 * paymentController — Webhooks de pagos + endpoints de estado
 *
 * Endpoints:
 *   POST /api/webhooks/wompi                  ← UNIFICADO: recibe todos los pagos de Wompi
 *   POST /api/payments/webhook/:workspaceId   ← Wompi llama esto para pagos de flujos (legacy)
 *   GET  /api/payments/status/:paymentId      ← Consultar estado de un pago
 *   GET  /api/payments/record/:workspaceId/:tableId/:recordId ← Estado de pago de un registro
 */

import { getPaymentService, BasePaymentProvider } from '../services/payments/PaymentService.js';
import { connectDB, getTableDataDbName } from '../config/db.js';
import { getNotificationService } from '../integrations/notifications/NotificationService.js';
import { getNotificationService as getNewNotificationService } from '../services/NotificationService.js';
import { getSocketService } from '../realtime/SocketService.js';
import { getChatRepository } from '../repositories/ChatRepository.js';
import { replyWhatsApp, replyMessenger, replyInstagram, getMetaCredentials } from './metaWebhookController.js';
import logger from '../config/logger.js';
import cache from '../config/cache.js';

// ─── Función auxiliar para obtener prefijo de BD ─────────────────────────────
function getDbPrefix() {
  return process.env.DB_PREFIX || 'chatbot_';
}

// ─── Webhook UNIFICADO de Wompi ──────────────────────────────────────────────

/**
 * POST /api/webhooks/wompi
 * 
 * Webhook ÚNICO para Wompi. Detecta automáticamente si es:
 *   - Pago de plan (referencia empieza con "sub:")
 *   - Pago de flujo (referencia empieza con "ws:")
 * 
 * Esta es la ÚNICA URL que debes configurar en el dashboard de Wompi.
 */
export async function handleUnifiedWebhook(req, res) {
  // Responder 200 INMEDIATAMENTE
  res.status(200).json({ received: true });

  try {
    logger.info('[Wompi] Webhook unificado recibido:', JSON.stringify(req.body, null, 2));

    // Validar que sea un webhook de Wompi
    const isWompi = req.body?.event?.startsWith('transaction') || req.body?.data?.transaction;
    if (!isWompi) {
      logger.warn('[Wompi] Webhook no reconocido');
      return;
    }

    const transactionId = req.body?.data?.transaction?.id;
    if (!transactionId) {
      logger.warn('[Wompi] Sin transaction ID');
      return;
    }

    // ═══ IDEMPOTENCIA: Evitar procesar el mismo webhook 2 veces ═══
    const idempotencyKey = `wompi:processed:${transactionId}`;
    if (cache.get(idempotencyKey)) {
      logger.info(`[Wompi] Transacción ${transactionId} ya procesada (idempotencia)`);
      return;
    }

    // Validar firma
    const paymentService = getPaymentService({ provider: 'wompi' });
    const isValid = paymentService.validateWebhook(req.body, req.headers);
    if (!isValid) {
      logger.warn('[Wompi] Firma inválida');
      return;
    }

    // Solo procesar eventos de transacción
    const event = req.body?.event || '';
    if (event && !event.startsWith('transaction')) {
      logger.info(`[Wompi] Ignorando evento: ${event}`);
      return;
    }

    // Consultar estado del pago
    const paymentData = await paymentService.getPaymentStatus(String(transactionId));
    logger.info('[Wompi] Estado del pago:', paymentData);

    // Solo procesar pagos aprobados
    if (paymentData.status !== 'pagado' && paymentData.status !== 'approved') {
      logger.info(`[Wompi] Pago no aprobado: ${paymentData.status}`);
      return;
    }

    const ref = paymentData.externalRef;

    // ─── DETECTAR TIPO DE PAGO ───────────────────────────────────────────────
    
    if (ref?.startsWith('sub:')) {
      // Es un pago de SUSCRIPCIÓN de plan
      await processSubscriptionPayment(ref, paymentData, transactionId);
    } else if (ref?.startsWith('ws:') || BasePaymentProvider.parseExternalRef(ref)) {
      // Es un pago de FLUJO (registro de tabla)
      await processFlowPayment(ref, paymentData, transactionId);
    } else {
      logger.warn('[Wompi] Referencia no reconocida:', ref);
      return; // No marcar como procesado si no reconocemos la referencia
    }

    // ═══ MARCAR COMO PROCESADO (idempotencia) ═══
    // TTL de 24h para evitar reprocesar webhooks duplicados
    cache.set(idempotencyKey, { processedAt: new Date().toISOString() }, 86400);

  } catch (err) {
    logger.error('[Wompi] Error procesando webhook:', err.message, err.stack);
  }
}

/**
 * Procesa un pago de suscripción de plan
 */
async function processSubscriptionPayment(ref, paymentData, transactionId) {
  // Formato: sub:provider:userId:planId:timestamp
  const parts = ref.split(':');
  if (parts.length < 4) {
    logger.warn('[Wompi] Referencia de suscripción inválida:', ref);
    return;
  }

  const userId = parts[2];
  const planId = parts[3];

  logger.info(`[Wompi] Activando plan ${planId} para usuario ${userId}`);

  // Actualizar plan del usuario
  const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
  const user = await accountsDb.get(userId);
  
  const oldPlan = user.plan || 'free';
  
  await accountsDb.insert({
    ...user,
    plan: planId,
    planActivatedAt: new Date().toISOString(),
    planPaymentId: transactionId,
    planProvider: 'wompi',
    updatedAt: new Date().toISOString(),
  });

  // IMPORTANTE: Invalidar el cache del usuario para que el frontend vea el nuevo plan
  cache.del(`user:${userId}`);
  logger.info(`[Wompi] Cache de usuario ${userId} invalidado`);

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
    logger.warn('[Wompi] Suscripción no encontrada:', ref);
  }

  // Enviar email de confirmación
  try {
    const { getEmailService } = await import('../services/EmailService.js');
    const { getPlans } = await import('./plansController.js');
    const plans = await getPlans();
    const newPlan = plans[planId];
    
    await getEmailService().sendPlanUpgrade(user.email, user.name, {
      planName: newPlan?.name || planId,
      features: Object.entries(newPlan?.features || {})
        .filter(([_, v]) => v === true)
        .map(([k]) => k)
    });
  } catch (emailErr) {
    logger.error('[Wompi] Error enviando email:', emailErr.message);
  }

  // Notificar via socket
  try {
    getSocketService().toUser(userId, 'plan:upgraded', {
      oldPlan,
      newPlan: planId,
    });
  } catch (socketErr) {
    logger.error('[Wompi] Error socket:', socketErr.message);
  }

  logger.info(`[Wompi] Plan ${planId} activado exitosamente para ${userId}`);
}

/**
 * Procesa un pago de flujo (registro de tabla)
 */
async function processFlowPayment(refString, paymentData, transactionId) {
  const ref = BasePaymentProvider.parseExternalRef(refString);
  if (!ref) {
    logger.warn('[Wompi] external_reference inválido:', refString);
    return;
  }

  logger.info(`[Wompi] Procesando pago de flujo para registro ${ref.recordId}`);

  // Actualizar el registro en la tabla (retorna el registro con _paymentChatId, etc.)
  const updatedRecord = await markRecordAsPaid(ref.workspaceId, ref.tableId, ref.recordId, {
    paymentId: String(transactionId),
    paymentStatus: 'pagado',
    paymentAmount: paymentData.amount,
    paymentCurrency: paymentData.currency,
    paymentDate: paymentData.paidAt || new Date().toISOString(),
    paymentMethod: paymentData.paymentMethodId,
    payerEmail: paymentData.payerEmail,
  });

  // Notificar al workspace
  await notifyPaymentConfirmed(ref.workspaceId, {
    recordId: ref.recordId,
    tableId: ref.tableId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payerEmail: paymentData.payerEmail,
  });

  // Emitir evento en tiempo real
  getSocketService().emitPaymentConfirmed(ref.workspaceId, {
    recordId: ref.recordId,
    tableId: ref.tableId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    payerEmail: paymentData.payerEmail,
  });

  // 🔔 Persistir notificación
  try {
    await getNewNotificationService().notifyPaymentConfirmed(ref.workspaceId, {
      paymentId: String(transactionId),
      amount: paymentData.amount,
      currency: paymentData.currency,
      payerEmail: paymentData.payerEmail,
      recordId: ref.recordId,
      tableId: ref.tableId,
    });
  } catch (notifErr) {
    logger.warn('[Wompi] Notification error:', notifErr.message);
  }
  
  // 💬 Enviar mensaje de confirmación al chat (si el pago se originó desde un chat)
  try {
    await sendPaymentConfirmationToChat(ref.workspaceId, updatedRecord, {
      paymentAmount: paymentData.amount,
      paymentCurrency: paymentData.currency,
    });
  } catch (chatErr) {
    logger.warn('[Wompi] Chat notification error:', chatErr.message);
  }

  logger.info('[Wompi] Pago de flujo procesado exitosamente');
}

// ─── Webhook legacy (por workspace) ──────────────────────────────────────────

/**
 * POST /api/payments/webhook/:workspaceId (LEGACY - usar /api/webhooks/wompi)
 * 
 * Recibe la notificación de pago de Wompi para un workspace específico.
 * Mantener por retrocompatibilidad con flujos existentes.
 */
export async function handleWebhook(req, res) {
  const { workspaceId } = req.params;

  // Responder 200 INMEDIATAMENTE — Wompi reintenta si no recibe respuesta rápida
  res.status(200).json({ received: true });

  try {
    const paymentService = getPaymentService({ workspaceId });

    // Validar autenticidad del webhook (X-Event-Checksum)
    const isValid = paymentService.validateWebhook(req.body, req.headers);
    if (!isValid) {
      logger.warn('[Payments] Webhook con firma inválida rechazado', { workspaceId });
      return;
    }

    // Extraer ID de transacción del body de Wompi
    const paymentId =
      req.body?.data?.transaction?.id ||  // Wompi: { data: { transaction: { id } } }
      req.body?.data?.id ||               // Formato genérico
      req.query?.id;                      // Fallback query param

    if (!paymentId) {
      logger.warn('[Payments] Webhook sin transaction ID', { body: req.body });
      return;
    }

    // Solo procesar eventos de transacción (ignorar otros tipos)
    const event = req.body?.event || '';
    if (event && !event.startsWith('transaction')) {
      logger.info(`[Payments] Ignorando webhook event: ${event}`);
      return;
    }

    logger.info('[Payments] Procesando pago', { paymentId, workspaceId });

    // Consultar el estado real del pago
    const paymentData = await paymentService.getPaymentStatus(String(paymentId));

    logger.info('[Payments] Estado del pago', { paymentId, status: paymentData.status });

    // Solo actuar en pagos aprobados
    if (paymentData.status !== 'pagado') {
      logger.info('[Payments] Pago no aprobado, ignorando', { status: paymentData.status });
      return;
    }

    // Parsear external_reference para encontrar el registro
    const ref = BasePaymentProvider.parseExternalRef(paymentData.externalRef);
    if (!ref) {
      logger.warn('[Payments] external_reference inválido', { externalRef: paymentData.externalRef });
      return;
    }

    // Actualizar el registro en la tabla
    await markRecordAsPaid(ref.workspaceId, ref.tableId, ref.recordId, {
      paymentId: String(paymentId),
      paymentStatus: 'pagado',
      paymentAmount: paymentData.amount,
      paymentCurrency: paymentData.currency,
      paymentDate: paymentData.paidAt || new Date().toISOString(),
      paymentMethod: paymentData.paymentMethodId,
      payerEmail: paymentData.payerEmail,
    });

    // Notificar al workspace
    await notifyPaymentConfirmed(ref.workspaceId, {
      recordId: ref.recordId,
      tableId: ref.tableId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payerEmail: paymentData.payerEmail,
    });

    // 🔌 Emitir evento en tiempo real
    getSocketService().emitPaymentConfirmed(ref.workspaceId, {
      recordId: ref.recordId,
      tableId: ref.tableId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payerEmail: paymentData.payerEmail,
    });

    logger.info('[Payments] Pago procesado exitosamente', {
      workspaceId: ref.workspaceId,
      recordId: ref.recordId,
    });

  } catch (err) {
    // Nunca debe llegar acá (ya respondimos 200), pero loguear
    logger.error('[Payments] Error procesando webhook', { error: err.message, stack: err.stack });
  }
}

// ─── Estado de un pago ───────────────────────────────────────────────────────

/**
 * GET /api/payments/status/:paymentId
 * Consulta el estado en tiempo real de un pago (útil para polling desde frontend)
 */
export async function getPaymentStatus(req, res) {
  const { paymentId } = req.params;
  const { workspaceId } = req.query;

  try {
    const paymentService = getPaymentService({ workspaceId });
    const status = await paymentService.getPaymentStatus(paymentId);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/payments/record/:workspaceId/:tableId/:recordId
 * Devuelve los campos de pago del registro directamente desde CouchDB
 */
export async function getRecordPaymentStatus(req, res) {
  const { workspaceId, tableId, recordId } = req.params;

  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    const record = await dataDb.get(recordId);

    return res.json({
      recordId,
      paymentStatus: record.paymentStatus || 'sin_pago',
      paymentAmount: record.paymentAmount || null,
      paymentDate: record.paymentDate || null,
      paymentLink: record.paymentLink || null,
      paymentId: record.paymentId || null,
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    return res.status(500).json({ error: err.message });
  }
}

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * Actualiza el registro en CouchDB con los datos del pago confirmado.
 * Busca campos estándar (paymentStatus, etc.) y también el campo configurado
 * en el nodo del flujo (saveLinkToField, saveStatusToField).
 */
async function markRecordAsPaid(workspaceId, tableId, recordId, paymentData) {
  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    const record = await dataDb.get(recordId);

    const updated = {
      ...record,
      // Campos estándar de pago (siempre se escriben)
      paymentStatus: paymentData.paymentStatus,
      paymentId: paymentData.paymentId,
      paymentAmount: paymentData.paymentAmount,
      paymentCurrency: paymentData.paymentCurrency,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      payerEmail: paymentData.payerEmail,
      updatedAt: new Date().toISOString(),
    };

    // Si el nodo configuró un campo de estado personalizado, también actualizarlo
    // (el campo viene guardado en el registro como _paymentStatusField)
    if (record._paymentStatusField && record._paymentStatusField !== 'paymentStatus') {
      updated[record._paymentStatusField] = 'Pagado';
    }

    await dataDb.insert(updated);
    logger.info('[Payments] Registro actualizado con pago', { recordId, status: paymentData.paymentStatus });
    return updated;
  } catch (err) {
    logger.error('[Payments] Error actualizando registro', { recordId, error: err.message });
    throw err;
  }
}

/**
 * Envía notificación interna al workspace cuando se confirma un pago
 */
async function notifyPaymentConfirmed(workspaceId, data) {
  try {
    const notificationService = getNotificationService();
    const inApp = notificationService.getProvider('in_app');
    if (!inApp) return;

    const amountFormatted = data.amount
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: data.currency || 'COP' }).format(data.amount)
      : '';

    await inApp.send({
      workspaceId,
      type: 'payment_confirmed',
      title: '💳 Pago confirmado',
      message: `Se confirmó un pago${amountFormatted ? ` de ${amountFormatted}` : ''}${data.payerEmail ? ` de ${data.payerEmail}` : ''}.`,
      data,
    });
  } catch (err) {
    logger.warn('[Payments] No se pudo enviar notificación de pago', { error: err.message });
  }
}

/**
 * Envía un mensaje al chat confirmando el pago procesado
 * Si el pago se originó desde un chat con canal externo (WhatsApp/Messenger/Instagram),
 * también envía el mensaje al canal externo.
 * 
 * @param {string} workspaceId
 * @param {object} record - Registro actualizado con _paymentChatId, _paymentAgentId, _paymentPlatform
 * @param {object} paymentData - Datos del pago (amount, currency, etc.)
 */
async function sendPaymentConfirmationToChat(workspaceId, record, paymentData) {
  const chatId = record._paymentChatId;
  const agentId = record._paymentAgentId;
  
  if (!chatId) {
    logger.debug('[Payments] No chatId - skipping chat notification');
    return;
  }
  
  try {
    const chatRepo = getChatRepository();
    const chat = await chatRepo.findById(workspaceId, chatId);
    
    if (!chat) {
      logger.warn('[Payments] Chat not found for payment notification', { chatId });
      return;
    }
    
    // Extraer platform y senderId del externalRef del chat (formato: "whatsapp:123456789")
    let platform = null;
    let senderId = chat.senderId;
    if (chat.externalRef) {
      const parts = chat.externalRef.split(':');
      if (parts.length >= 2) {
        platform = parts[0];
        senderId = senderId || parts[1];
      }
    }
    
    // Formatear monto
    const amountFormatted = paymentData.paymentAmount
      ? new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: paymentData.paymentCurrency || 'COP' 
        }).format(paymentData.paymentAmount)
      : '';
    
    // Mensaje de confirmación
    const confirmMessage = `✅ ¡Tu pago${amountFormatted ? ` de ${amountFormatted}` : ''} ha sido confirmado! Gracias por tu compra.`;
    
    // Guardar mensaje en el chat
    await chatRepo.addMessage(workspaceId, chatId, 'assistant', confirmMessage);
    
    // Emitir por WebSocket para actualizar el frontend
    getSocketService().toWorkspace(workspaceId, 'chat:message', {
      chatId,
      agentId,
      message: {
        id: `payment_confirm_${Date.now()}`,
        role: 'assistant',
        content: confirmMessage,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Si hay canal externo (WhatsApp/Messenger/Instagram), enviar también ahí
    if (platform && chat.senderId) {
      try {
        const creds = await getMetaCredentials(workspaceId, agentId);
        
        if (platform === 'whatsapp' && creds.whatsappToken && creds.phoneNumberId) {
          await replyWhatsApp(chat.senderId, confirmMessage, {
            token: creds.whatsappToken,
            phoneNumberId: creds.phoneNumberId,
          });
        } else if (platform === 'messenger' && creds.pageAccessToken) {
          await replyMessenger(chat.senderId, confirmMessage, creds.pageAccessToken);
        } else if (platform === 'instagram' && creds.pageAccessToken) {
          await replyInstagram(chat.senderId, confirmMessage, creds.pageAccessToken);
        }
        
        logger.info('[Payments] Payment confirmation sent to external channel', { 
          platform, 
          chatId, 
          senderId: chat.senderId,
        });
      } catch (extErr) {
        logger.warn('[Payments] Failed to send to external channel', { 
          platform, 
          error: extErr.message,
        });
      }
    }
    
    logger.info('[Payments] Payment confirmation sent to chat', { chatId, agentId });
    
  } catch (err) {
    logger.error('[Payments] Error sending payment confirmation to chat', { 
      error: err.message, 
      chatId,
    });
  }
}

// ─── Redirect de éxito de pago ───────────────────────────────────────────────

/**
 * GET /payment/success
 * Wompi redirige aquí después del pago - redireccionamos al frontend
 */
export async function handlePaymentSuccess(req, res) {
  // Obtener parámetros de la URL que Wompi envía
  const { id, env } = req.query;
  
  // URL del frontend (en desarrollo localhost, en producción la URL real)
  const frontendUrl = process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://tuapp.com'
    : 'http://localhost:3020';
  
  // Redirigir al frontend con los parámetros de la transacción
  const redirectUrl = `${frontendUrl}/upgrade?payment=success&transactionId=${id || ''}&env=${env || ''}`;
  
  logger.info('[Payments] Redirigiendo a página de éxito', { transactionId: id, redirectUrl });
  
  return res.redirect(302, redirectUrl);
}
