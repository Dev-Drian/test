/**
 * paymentController — Webhooks de pagos + endpoints de estado
 *
 * Endpoints:
 *   POST /api/payments/webhook/:workspaceId   ← Wompi llama esto tras cada transacción
 *   GET  /api/payments/status/:paymentId      ← Consultar estado de un pago
 *   GET  /api/payments/record/:workspaceId/:tableId/:recordId ← Estado de pago de un registro
 */

import { getPaymentService, BasePaymentProvider } from '../services/payments/PaymentService.js';
import { connectDB, getTableDataDbName } from '../config/db.js';
import { getNotificationService } from '../integrations/notifications/NotificationService.js';
import { getSocketService } from '../realtime/SocketService.js';
import logger from '../config/logger.js';

// ─── Webhook de Wompi ────────────────────────────────────────────────────────

/**
 * Recibe la notificación de pago de Wompi.
 *
 * Wompi envía webhooks con estructura:
 *   { event: "transaction.updated", data: { transaction: { id, status, reference, ... } } }
 *
 * Header de validación: X-Event-Checksum = SHA256(bodyString + eventsSecret)
 * Docs: https://docs.wompi.co/docs/colombia/eventos
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
