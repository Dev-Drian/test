/**
 * WompiProvider — Implementación de pagos vía Wompi (Bancolombia)
 *
 * API docs: https://docs.wompi.co/docs/colombia/
 * Dashboard: https://comercios.wompi.co
 *
 * Flujo de pago:
 *   1. Backend construye una URL de checkout firmada con integridad SHA256
 *   2. Usuario paga en Wompi (tarjeta, PSE, Nequi, Daviplata, Efecty)
 *   3. Wompi llama al webhook con el resultado de la transacción
 *   4. Backend actualiza el registro y notifica al workspace
 *
 * Env vars requeridas:
 *   WOMPI_PUBLIC_KEY     — Llave pública (pub_test_xxx en sandbox, pub_prod_xxx en prod)
 *   WOMPI_PRIVATE_KEY    — Llave privada (prv_test_xxx en sandbox, prv_prod_xxx en prod)
 *   WOMPI_EVENTS_SECRET  — Secret para validar la firma de webhooks (en dashboard > Eventos)
 *   APP_PUBLIC_URL       — URL pública del servidor (para redirect tras pago)
 *
 * Sandbox: obtener llaves en https://comercios.wompi.co (entorno de prueba)
 * Tarjetas de prueba: https://docs.wompi.co/docs/colombia/tarjetas-de-prueba
 */

import axios from 'axios';
import crypto from 'crypto';
import { BasePaymentProvider } from './BasePaymentProvider.js';

const WOMPI_API_SANDBOX  = 'https://sandbox.wompi.co/v1';
const WOMPI_API_PROD     = 'https://production.wompi.co/v1';
const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

// Mapeo de estados Wompi → estados internos del sistema
const STATUS_MAP = {
  APPROVED: 'pagado',
  DECLINED: 'rechazado',
  VOIDED:   'cancelado',
  ERROR:    'error',
  PENDING:  'pendiente',
};

export class WompiProvider extends BasePaymentProvider {
  constructor(options = {}) {
    super(options);
    this.publicKey        = options.publicKey        || process.env.WOMPI_PUBLIC_KEY        || '';
    this.privateKey       = options.privateKey       || process.env.WOMPI_PRIVATE_KEY       || '';
    this.eventsSecret     = options.eventsSecret     || process.env.WOMPI_EVENTS_SECRET     || '';
    this.integritySecret  = options.integritySecret  || process.env.WOMPI_INTEGRITY_SECRET  || this.eventsSecret;
    // URL de redirección después del pago (webhook service en Railway tiene página de éxito)
    this.webhookServiceUrl = (process.env.WEBHOOK_SERVICE_URL || 'https://webhooks-production-e437.up.railway.app').replace(/\/$/, '');

    // Detectar sandbox por el prefijo de la llave
    this.isSandbox = this.privateKey.startsWith('prv_test') || !this.privateKey.startsWith('prv_prod');
    this.apiBase   = this.isSandbox ? WOMPI_API_SANDBOX : WOMPI_API_PROD;
  }

  get _headers() {
    return {
      'Authorization': `Bearer ${this.privateKey}`,
      'Content-Type':  'application/json',
    };
  }

  /**
   * Construye la URL de checkout de Wompi firmada con integridad.
   *
   * Wompi NO requiere un API call para crear el link — solo construir la URL
   * correctamente con la firma de integridad. Esto es más rápido y nunca falla
   * por conectividad con la API de Wompi al momento de generar el link.
   *
   * Firma: SHA256(`${reference}${amountInCents}${currency}${eventsSecret}`)
   */
  async createPaymentLink(config) {
    if (!this.publicKey || !this.integritySecret) {
      throw new Error(
        'WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET deben estar en el .env del backend. ' +
        'Obtener en: https://comercios.wompi.co → Llaves y Webhooks'
      );
    }

    const {
      title,
      amount,
      currency    = 'COP',
      externalRef,
      workspaceId,
      payerEmail,
      payerName,
    } = config;

    // Wompi trabaja en centavos (entero)
    const amountInCents = Math.round(Number(amount) * 100);
    if (amountInCents <= 0) throw new Error('El monto debe ser mayor a 0');

    // ── Firma de integridad ──────────────────────────────────────────────────
    // Wompi verifica que nadie haya alterado los parámetros del checkout
    // Usa WOMPI_INTEGRITY_SECRET (distinto al WOMPI_EVENTS_SECRET del webhook)
    const integritySignature = crypto
      .createHash('sha256')
      .update(`${externalRef}${amountInCents}${currency}${this.integritySecret}`)
      .digest('hex');

    // ── Construir URL de checkout ────────────────────────────────────────────
    const params = new URLSearchParams({
      'public-key':          this.publicKey,
      'currency':            currency,
      'amount-in-cents':     String(amountInCents),
      'reference':           externalRef,
      'signature:integrity': integritySignature,
      // Redirige al webhook service en Railway (tiene página de éxito)
      'redirect-url':        `${this.webhookServiceUrl}/payment/success`,
    });

    // Datos del pagador (mejoran UX pre-llenando el form)
    if (payerEmail) params.set('customer-data:email', payerEmail);
    if (payerName)  params.set('customer-data:full-name', payerName);

    // Descripción visible en el checkout de Wompi
    if (title) params.set('description', String(title).slice(0, 255));

    const paymentUrl = `${WOMPI_CHECKOUT_URL}?${params.toString()}`;

    return {
      paymentId:   externalRef,     // Antes del pago, identificamos por referencia
      paymentUrl,                   // URL que se muestra/envía al cliente
      status:      'pending',
      provider:    'wompi',
      externalRef,
      expiresAt:   null,            // Wompi no expira los checkout links
      raw: {
        reference: externalRef,
        amountInCents,
        currency,
        integritySignature,
        isSandbox: this.isSandbox,
      },
    };
  }

  /**
   * Consulta un pago en la API de Wompi.
   *
   * Acepta dos formatos de ID:
   *   - ID de transacción Wompi (numérico string): "123456" — llega en el webhook
   *   - externalRef del sistema: "ws:xxx:tbl:yyy:rec:zzz" — busca por referencia
   */
  async getPaymentStatus(transactionOrRef) {
    if (!this.privateKey) {
      throw new Error('WOMPI_PRIVATE_KEY no configurado.');
    }

    try {
      let tx;
      const idStr = String(transactionOrRef);

      // Si parece un ID de transacción Wompi (numérico o con guiones), buscar directo por ID
      if (/^[\d-]+$/.test(idStr) && !idStr.startsWith('sub:') && !idStr.startsWith('ws:')) {
        console.log('[WompiProvider] Buscando transacción por ID:', idStr);
        const resp = await axios.get(
          `${this.apiBase}/transactions/${idStr}`,
          { headers: this._headers }
        );
        tx = resp.data?.data;
        console.log('[WompiProvider] Respuesta de Wompi:', JSON.stringify(resp.data, null, 2));
      } else {
        // Es un externalRef → buscar por referencia
        console.log('[WompiProvider] Buscando transacción por referencia:', idStr);
        const resp = await axios.get(
          `${this.apiBase}/transactions?reference=${encodeURIComponent(idStr)}`,
          { headers: this._headers }
        );
        // Devuelve array, tomar el más reciente
        const txList = resp.data?.data || [];
        tx = txList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        console.log('[WompiProvider] Transacciones encontradas:', txList.length);
      }

      return this._mapTransaction(tx);
    } catch (err) {
      console.error('[WompiProvider] Error consultando transacción:', err.response?.data || err.message);
      const detail = err.response?.data?.error?.reason || err.message;
      throw new Error(`Wompi getPaymentStatus error: ${detail}`);
    }
  }

  /**
   * Valida que el webhook proviene realmente de Wompi.
   *
   * Wompi envía el header X-Event-Checksum con valor = SHA256(bodyString + eventsSecret)
   * Docs: https://docs.wompi.co/docs/colombia/eventos
   */
  validateWebhook(payload, headers = {}) {
    if (!this.eventsSecret) {
      console.warn('[WompiProvider] WOMPI_EVENTS_SECRET no configurado. Aceptando webhook sin validar firma.');
      return true;
    }

    const receivedChecksum = headers['x-event-checksum'] || '';
    if (!receivedChecksum) {
      console.warn('[WompiProvider] Webhook sin header X-Event-Checksum');
      // En desarrollo, aceptar sin checksum
      return process.env.NODE_ENV !== 'production';
    }

    // El checksum se calcula sobre el JSON string del body + el eventsSecret
    // NOTA: Express parsea el JSON, así que intentamos regenerarlo idéntico
    const rawBody = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    const expectedChecksum = crypto
      .createHash('sha256')
      .update(rawBody + this.eventsSecret)
      .digest('hex');

    const valid = expectedChecksum === receivedChecksum;
    if (!valid) {
      console.warn('[WompiProvider] Checksum de webhook inválido', {
        expected: expectedChecksum,
        received: receivedChecksum,
      });
      // En desarrollo, aceptar aunque el checksum no coincida (Express puede modificar el JSON)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[WompiProvider] Aceptando webhook en modo desarrollo a pesar de checksum inválido');
        return true;
      }
    }
    return valid;
  }

  /**
   * Extrae el ID de transacción del body de un webhook de Wompi.
   * El webhook tiene estructura: { event: "transaction.updated", data: { transaction: {...} } }
   */
  extractWebhookTransactionId(body) {
    return body?.data?.transaction?.id || null;
  }

  // ── Helper interno ─────────────────────────────────────────────────────────

  _mapTransaction(tx) {
    if (!tx) return { status: 'pendiente', raw: null };

    return {
      status:          STATUS_MAP[tx.status] || tx.status?.toLowerCase() || 'desconocido',
      wompiStatus:     tx.status,
      amount:          (tx.amount_in_cents || 0) / 100,
      currency:        tx.currency,
      paidAt:          tx.finalized_at || null,
      payerEmail:      tx.customer_email || null,
      payerName:       null,
      externalRef:     tx.reference,
      paymentMethodId: tx.payment_method_type || null,
      transactionId:   tx.id,
      raw:             tx,
    };
  }
}
