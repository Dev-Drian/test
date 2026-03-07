/**
 * PaymentService — Capa de abstracción de pagos
 *
 * Permite cambiar de proveedor sin tocar los flujos.
 * Todos los proveedores implementan la misma interfaz:
 *   - createPaymentLink(config)     → { paymentId, paymentUrl, status }
 *   - getPaymentStatus(paymentId)   → { status, amount, paidAt, payerEmail }
 *   - validateWebhook(payload, sig) → boolean
 *
 * Proveedores disponibles:
 *   - wompi       (Colombia - Bancolombia)
 *   - mercadopago (Latinoamérica)
 *
 * Configuración (variables de entorno):
 *   WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET, WOMPI_INTEGRITY_SECRET
 *   MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET
 *   APP_PUBLIC_URL = URL base del servidor (para redirect-url tras pago)
 */

import { BasePaymentProvider } from './providers/BasePaymentProvider.js';
import { WompiProvider } from './providers/WompiProvider.js';
import { MercadoPagoProvider } from './providers/MercadoPagoProvider.js';

export { BasePaymentProvider };

// ─── Proveedores disponibles ────────────────────────────────────────────────
const PROVIDERS = {
  wompi: {
    id: 'wompi',
    name: 'Wompi',
    description: 'Tarjeta, PSE, Nequi, Daviplata, Efecty',
    icon: 'wompi',
    countries: ['CO'],
    color: 'from-emerald-500 to-teal-500',
    available: () => !!process.env.WOMPI_PUBLIC_KEY && !!process.env.WOMPI_INTEGRITY_SECRET,
  },
  mercadopago: {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Tarjeta, PSE, Efectivo, Transferencia',
    icon: 'mercadopago',
    countries: ['CO', 'AR', 'MX', 'BR', 'CL', 'PE', 'UY'],
    color: 'from-sky-500 to-blue-500',
    available: () => !!process.env.MP_ACCESS_TOKEN,
  },
};

/**
 * Obtiene los proveedores de pago disponibles (con credenciales configuradas)
 */
export function getAvailableProviders() {
  return Object.values(PROVIDERS).filter(p => p.available());
}

/**
 * Obtiene info de un proveedor específico
 */
export function getProviderInfo(providerId) {
  return PROVIDERS[providerId] || null;
}

// ─── Singleton por provider+workspace ───────────────────────────────────────
const _instances = new Map();

/**
 * Obtiene (o crea) la instancia del proveedor.
 *
 * @param {object} options
 * @param {string} [options.provider]     - 'wompi' | 'mercadopago' (default: env PAYMENT_PROVIDER o 'wompi')
 * @param {string} [options.workspaceId]  - ID del workspace (para multi-tenant)
 * @param {string} [options.accessToken]  - Override token (guarda en DB por workspace)
 * @returns {BasePaymentProvider}
 */
export function getPaymentService(options = {}) {
  const provider = options.provider || process.env.PAYMENT_PROVIDER || 'wompi';
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
    case 'mercadopago':
      return new MercadoPagoProvider(options);
    default:
      throw new Error(`Payment provider '${providerName}' not supported. Proveedores disponibles: wompi, mercadopago`);
  }
}
