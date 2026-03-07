/**
 * MercadoPagoProvider — Implementación de pagos vía MercadoPago
 *
 * API usada: https://www.mercadopago.com.ar/developers/es/reference
 * Autenticación: Bearer access_token en cada request
 *
 * Env vars requeridas:
 *   MP_ACCESS_TOKEN   — Tu Access Token (productivo o sandbox de MP)
 *   APP_PUBLIC_URL    — URL del servidor (ej: https://miapp.com) para webhooks
 *
 * Sandbox: usa un Access Token de prueba de MP (empieza con TEST-)
 */

import axios from 'axios';
import crypto from 'crypto';
import { BasePaymentProvider } from './BasePaymentProvider.js';

const MP_API_BASE = 'https://api.mercadopago.com';

export class MercadoPagoProvider extends BasePaymentProvider {
  constructor(options = {}) {
    super(options);
    // Permite override por workspace (multi-tenant futuro)
    this.accessToken = options.accessToken || process.env.MP_ACCESS_TOKEN || '';
    this.webhookSecret = options.webhookSecret || process.env.MP_WEBHOOK_SECRET || '';
    this.appPublicUrl = (process.env.APP_PUBLIC_URL || 'http://localhost:3010').replace(/\/$/, '');
  }

  get _headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(),
    };
  }

  /**
   * Crea una preferencia de pago → devuelve el init_point (link de pago)
   */
  async createPaymentLink(config) {
    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN no configurado. Agregalo al .env del backend.');
    }

    const {
      title,
      amount,
      currency = 'COP',
      externalRef,
      workspaceId,
      payerEmail,
      payerName,
      notifyUrl,
      successUrl,
      failureUrl,
      pendingUrl,
    } = config;

    const webhookUrl = notifyUrl || `${this.appPublicUrl}/api/plans/webhook`;
    
    // URLs de retorno - preferir las pasadas, sino usar defaults
    const backUrls = {
      success: successUrl || `${this.appPublicUrl}/payment/success`,
      failure: failureUrl || `${this.appPublicUrl}/payment/failure`,
      pending: pendingUrl || `${this.appPublicUrl}/payment/pending`,
    };

    // auto_return solo funciona con URLs públicas (no localhost)
    const isPublicUrl = backUrls.success && !backUrls.success.includes('localhost');

    const preferenceBody = {
      items: [
        {
          id: externalRef,
          title: String(title).slice(0, 256),
          quantity: 1,
          unit_price: Number(amount),
          currency_id: currency,
        },
      ],
      external_reference: externalRef,
      notification_url: webhookUrl,
      back_urls: backUrls,
      ...(isPublicUrl && { auto_return: 'approved' }),
      // Si tienes el email del pagador mejora la conversión
      ...(payerEmail && {
        payer: {
          email: payerEmail,
          ...(payerName && { name: payerName }),
        },
      }),
      // Expiración: 72 horas por defecto
      expires: true,
      expiration_date_to: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    };

    try {
      const response = await axios.post(
        `${MP_API_BASE}/checkout/preferences`,
        preferenceBody,
        { headers: this._headers }
      );

      const pref = response.data;

      // sandbox_init_point en TEST, init_point en producción
      const isSandbox = this.accessToken.startsWith('TEST-');
      const paymentUrl = isSandbox ? pref.sandbox_init_point : pref.init_point;

      return {
        paymentId: pref.id,          // ID de la preferencia de MercadoPago
        paymentUrl,                   // URL que se envía al cliente
        status: 'pending',
        provider: 'mercadopago',
        externalRef,
        expiresAt: pref.expiration_date_to,
        raw: pref,                    // Guardar por si se necesita debug
      };
    } catch (err) {
      const mpError = err.response?.data;
      const message = mpError?.message || err.message;
      throw new Error(`MercadoPago createPaymentLink error: ${message}`);
    }
  }

  /**
   * Consulta una merchant_order por ID
   * Se usa para obtener los pagos asociados a una orden
   */
  async getMerchantOrder(orderId) {
    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN no configurado.');
    }

    try {
      const response = await axios.get(
        `${MP_API_BASE}/merchant_orders/${orderId}`,
        { headers: this._headers }
      );

      return response.data;
    } catch (err) {
      const mpError = err.response?.data;
      throw new Error(`MercadoPago getMerchantOrder error: ${mpError?.message || err.message}`);
    }
  }

  /**
   * Consulta el estado de un pago por payment ID (no preference ID)
   * El payment ID llega en el webhook
   */
  async getPaymentStatus(paymentId) {
    if (!this.accessToken) {
      throw new Error('MP_ACCESS_TOKEN no configurado.');
    }

    try {
      const response = await axios.get(
        `${MP_API_BASE}/v1/payments/${paymentId}`,
        { headers: this._headers }
      );

      const payment = response.data;

      // Mapeo de estados MP → estados internos
      const statusMap = {
        approved: 'pagado',
        rejected: 'rechazado',
        pending: 'pendiente',
        in_process: 'en_proceso',
        cancelled: 'cancelado',
        refunded: 'reembolsado',
        charged_back: 'contracargo',
      };

      return {
        status: statusMap[payment.status] || payment.status,
        mpStatus: payment.status,
        mpStatusDetail: payment.status_detail,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        paidAt: payment.date_approved || null,
        payerEmail: payment.payer?.email || null,
        payerName: payment.payer?.first_name
          ? `${payment.payer.first_name} ${payment.payer.last_name || ''}`.trim()
          : null,
        externalRef: payment.external_reference,
        paymentMethodId: payment.payment_method_id,
        raw: payment,
      };
    } catch (err) {
      const mpError = err.response?.data;
      throw new Error(`MercadoPago getPaymentStatus error: ${mpError?.message || err.message}`);
    }
  }

  /**
   * Valida la firma del webhook de MercadoPago (IPN signature v2)
   * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
   *
   * Si no hay webhook secret configurado, acepta todo (modo desarrollo).
   * En producción SIEMPRE configurar MP_WEBHOOK_SECRET.
   */
  validateWebhook(payload, headers = {}) {
    if (!this.webhookSecret) {
      // Sin secret → modo dev, acepta todo con advertencia
      console.warn('[PaymentService] MP_WEBHOOK_SECRET no configurado. Aceptando webhook sin validar firma.');
      return true;
    }

    // MP envía la firma en x-signature con formato: ts=<timestamp>,v1=<hash>
    const xSignature = headers['x-signature'] || '';
    const xRequestId = headers['x-request-id'] || '';

    const tsMatch = xSignature.match(/ts=([^,]+)/);
    const v1Match = xSignature.match(/v1=([^,]+)/);

    if (!tsMatch || !v1Match) {
      console.warn('[PaymentService] Webhook sin firma válida');
      return false;
    }

    const ts = tsMatch[1];
    const v1 = v1Match[1];

    // Construir el manifest a verificar
    const dataId = payload?.data?.id || '';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const expectedHash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(v1, 'hex')
    );
  }
}
