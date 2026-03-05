/**
 * PaymentService — Capa de abstracción de pagos
 *
 * Permite cambiar de proveedor sin tocar los flujos.
 * Todos los proveedores implementan la misma interfaz:
 *   - createPaymentLink(config)     → { paymentId, paymentUrl, status }
 *   - getPaymentStatus(paymentId)   → { status, amount, paidAt, payerEmail }
 *   - validateWebhook(payload, sig) → boolean
 *
 * Configuración (variables de entorno):
 *   PAYMENT_PROVIDER     = 'wompi' (default)
 *   WOMPI_PUBLIC_KEY     = pub_test_xxx (sandbox) | pub_prod_xxx (producción)
 *   WOMPI_PRIVATE_KEY    = prv_test_xxx (sandbox) | prv_prod_xxx (producción)
 *   WOMPI_EVENTS_SECRET  = secret para validar firma de webhooks
 *   APP_PUBLIC_URL       = URL base del servidor (para redirect-url tras pago)
 */

import { BasePaymentProvider } from './providers/BasePaymentProvider.js';
import { WompiProvider } from './providers/WompiProvider.js';

export { BasePaymentProvider };

// ─── Singleton por workspace ────────────────────────────────────────────────
const _instances = new Map();

/**
 * Obtiene (o crea) la instancia del proveedor para un workspace.
 * Cada workspace puede tener su propio access token en el futuro.
 *
 * @param {object} options
 * @param {string} [options.workspaceId]  - ID del workspace (para multi-tenant)
 * @param {string} [options.accessToken]  - Override token (guarda en DB por workspace)
 * @returns {BasePaymentProvider}
 */
export function getPaymentService(options = {}) {
  const provider = process.env.PAYMENT_PROVIDER || 'wompi';
  const cacheKey = `${provider}:${options.workspaceId || 'default'}`;

  if (!_instances.has(cacheKey)) {
    const instance = createProvider(provider, options);
    _instances.set(cacheKey, instance);
  }

  return _instances.get(cacheKey);
}

function createProvider(providerName, options = {}) {
  switch (providerName) {
    case 'wompi':
      return new WompiProvider(options);
    // Fácil de agregar en el futuro:
    // case 'stripe':
    //   return new StripeProvider(options);
    default:
      throw new Error(`Payment provider '${providerName}' not supported. Proveedores disponibles: wompi`);
  }
}
