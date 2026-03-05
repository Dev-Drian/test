/**
 * BasePaymentProvider — Contrato que deben implementar todos los proveedores de pago
 */
export class BasePaymentProvider {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Crea un link de pago
   * @param {object} config
   * @param {string}  config.title          - Descripción del producto/servicio
   * @param {number}  config.amount         - Monto en la moneda local
   * @param {string}  config.currency       - ISO 4217: 'COP', 'MXN', 'USD', etc.
   * @param {string}  config.externalRef    - Referencia interna (ws:table:recordId)
   * @param {string}  config.workspaceId    - Workspace que genera el pago
   * @param {string}  [config.payerEmail]   - Email del pagador (opcional)
   * @param {string}  [config.payerName]    - Nombre del pagador (opcional)
   * @param {string}  [config.notifyUrl]    - URL del webhook (override)
   * @returns {Promise<{paymentId: string, paymentUrl: string, status: string}>}
   */
  async createPaymentLink(config) {
    throw new Error('createPaymentLink() must be implemented by provider');
  }

  /**
   * Consulta el estado de un pago
   * @param {string} paymentId
   * @returns {Promise<{status: string, amount: number, paidAt: string|null, payerEmail: string|null}>}
   */
  async getPaymentStatus(paymentId) {
    throw new Error('getPaymentStatus() must be implemented by provider');
  }

  /**
   * Valida que un webhook proviene realmente del proveedor
   * @param {object} payload  - Body del webhook
   * @param {object} headers  - Headers de la petición
   * @returns {boolean}
   */
  validateWebhook(payload, headers) {
    throw new Error('validateWebhook() must be implemented by provider');
  }

  /**
   * Parsea el external_reference a sus partes
   * Formato: ws:{workspaceId}:tbl:{tableId}:rec:{recordId}
   */
  static parseExternalRef(externalRef) {
    if (!externalRef) return null;
    const match = externalRef.match(/^ws:([^:]+):tbl:([^:]+):rec:(.+)$/);
    if (!match) return null;
    return {
      workspaceId: match[1],
      tableId: match[2],
      recordId: match[3],
    };
  }

  /**
   * Construye el external_reference estándar
   */
  static buildExternalRef(workspaceId, tableId, recordId) {
    return `ws:${workspaceId}:tbl:${tableId}:rec:${recordId}`;
  }
}
