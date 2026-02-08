/**
 * NotificationProvider - Interfaz base para proveedores de notificaciones
 * 
 * Define el contrato que deben implementar todos los proveedores.
 * Facilita agregar: Email, WhatsApp, SMS, Push, Webhooks, etc.
 */

export class NotificationProvider {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled !== false;
  }
  
  /**
   * Nombre del proveedor
   */
  get name() {
    return 'base';
  }
  
  /**
   * Envía una notificación
   * @param {object} notification - Datos de la notificación
   * @param {string} notification.type - Tipo: 'record_created', 'record_updated', etc.
   * @param {string} notification.title - Título
   * @param {string} notification.message - Mensaje
   * @param {object} notification.data - Datos adicionales
   * @param {object} notification.recipient - Destinatario
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  async send(notification) {
    throw new Error('send() must be implemented by subclass');
  }
  
  /**
   * Envía múltiples notificaciones
   * @param {array} notifications - Lista de notificaciones
   * @returns {Promise<array>}
   */
  async sendBatch(notifications) {
    const results = await Promise.allSettled(
      notifications.map(n => this.send(n))
    );
    
    return results.map((r, i) => ({
      notification: notifications[i],
      success: r.status === 'fulfilled' && r.value?.success,
      result: r.status === 'fulfilled' ? r.value : { error: r.reason?.message },
    }));
  }
  
  /**
   * Verifica si el proveedor está configurado correctamente
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    return this.enabled;
  }
}

export default NotificationProvider;
