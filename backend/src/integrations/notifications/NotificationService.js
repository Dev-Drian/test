/**
 * NotificationService - Servicio central de notificaciones
 * 
 * Orquesta múltiples proveedores de notificaciones.
 * Se integra con el EventEmitter para escuchar eventos del sistema.
 */

import { EVENTS, getEventEmitter } from '../../core/EventEmitter.js';
import { InAppNotificationProvider } from './InAppNotificationProvider.js';

export class NotificationService {
  constructor() {
    this.providers = new Map();
    this.eventEmitter = getEventEmitter();
    this.templates = new Map();
    this.workspaceConfigs = new Map();
  }
  
  /**
   * Registra un proveedor de notificaciones
   */
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
    console.log(`[NotificationService] Registered provider: ${provider.name}`);
    return this;
  }
  
  /**
   * Obtiene un proveedor por nombre
   */
  getProvider(name) {
    return this.providers.get(name);
  }
  
  /**
   * Configura las notificaciones para un workspace
   */
  setWorkspaceConfig(workspaceId, config) {
    this.workspaceConfigs.set(workspaceId, config);
  }
  
  /**
   * Obtiene la configuración de un workspace
   */
  getWorkspaceConfig(workspaceId) {
    return this.workspaceConfigs.get(workspaceId) || {
      enabled: true,
      providers: ['in_app'],
      events: {
        record_created: true,
        record_updated: true,
        record_deleted: true,
        availability_checked: false,
      },
    };
  }
  
  /**
   * Registra un template de notificación
   */
  registerTemplate(type, template) {
    this.templates.set(type, template);
    return this;
  }
  
  /**
   * Inicia la escucha de eventos del sistema
   */
  startListening() {
    // Record Created
    this.eventEmitter.on(EVENTS.RECORD_CREATED, async (data) => {
      await this.handleEvent('record_created', data);
    });
    
    // Record Updated
    this.eventEmitter.on(EVENTS.RECORD_UPDATED, async (data) => {
      await this.handleEvent('record_updated', data);
    });
    
    // Record Deleted
    this.eventEmitter.on(EVENTS.RECORD_DELETED, async (data) => {
      await this.handleEvent('record_deleted', data);
    });
    
    // Create Completed (cuando termina un flujo de creación)
    this.eventEmitter.on(EVENTS.CREATE_COMPLETED, async (data) => {
      await this.handleEvent('create_completed', data);
    });
    
    console.log('[NotificationService] Started listening to events');
    return this;
  }
  
  /**
   * Maneja un evento y genera notificaciones
   */
  async handleEvent(eventType, data) {
    const { context, tableId, recordId, record } = data;
    const workspaceId = context?.get?.('workspaceId') || data.workspaceId;
    
    if (!workspaceId) {
      console.warn('[NotificationService] No workspaceId in event');
      return;
    }
    
    const config = this.getWorkspaceConfig(workspaceId);
    
    // Verificar si el evento está habilitado
    if (!config.enabled || !config.events?.[eventType]) {
      return;
    }
    
    // Construir notificación
    const notification = this.buildNotification(eventType, {
      tableId,
      recordId,
      record,
      workspaceId,
    });
    
    // Enviar a los proveedores configurados
    const enabledProviders = config.providers || ['in_app'];
    
    for (const providerName of enabledProviders) {
      const provider = this.providers.get(providerName);
      if (provider) {
        try {
          await provider.send(notification);
        } catch (error) {
          console.error(`[NotificationService] Error in ${providerName}:`, error);
        }
      }
    }
  }
  
  /**
   * Construye una notificación a partir de un evento
   */
  buildNotification(eventType, data) {
    const template = this.templates.get(eventType) || this.getDefaultTemplate(eventType);
    
    return {
      type: eventType,
      title: this.interpolate(template.title, data),
      message: this.interpolate(template.message, data),
      data: {
        tableId: data.tableId,
        recordId: data.recordId,
        record: data.record,
      },
      workspaceId: data.workspaceId,
      createdAt: new Date().toISOString(),
    };
  }
  
  /**
   * Templates por defecto
   */
  getDefaultTemplate(eventType) {
    const templates = {
      record_created: {
        title: '✅ Nuevo registro creado',
        message: 'Se ha creado un nuevo registro en {{tableName}}',
      },
      record_updated: {
        title: '📝 Registro actualizado',
        message: 'Se ha actualizado un registro en {{tableName}}',
      },
      record_deleted: {
        title: '🗑️ Registro eliminado',
        message: 'Se ha eliminado un registro de {{tableName}}',
      },
      create_completed: {
        title: '🎉 Creación completada',
        message: 'Se completó la creación en {{tableName}}',
      },
      availability_checked: {
        title: '📅 Disponibilidad consultada',
        message: 'Se consultó disponibilidad para {{date}}',
      },
    };
    
    return templates[eventType] || {
      title: 'Notificación',
      message: 'Evento: {{eventType}}',
    };
  }
  
  /**
   * Interpola variables en un string
   */
  interpolate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }
  
  /**
   * Envía una notificación directa (sin evento)
   */
  async sendDirect(workspaceId, notification) {
    const config = this.getWorkspaceConfig(workspaceId);
    const enabledProviders = config.providers || ['in_app'];
    
    const results = [];
    
    for (const providerName of enabledProviders) {
      const provider = this.providers.get(providerName);
      if (provider) {
        const result = await provider.send({
          ...notification,
          workspaceId,
        });
        results.push({ provider: providerName, ...result });
      }
    }
    
    return results;
  }
  
  /**
   * Obtiene notificaciones de un workspace
   */
  async getNotifications(workspaceId, options = {}) {
    const inApp = this.providers.get('in_app');
    if (!inApp) return [];
    
    return options.unreadOnly
      ? inApp.getUnread(workspaceId, options.limit)
      : inApp.getAll(workspaceId, options);
  }
  
  /**
   * Cuenta notificaciones no leídas
   */
  async countUnread(workspaceId) {
    const inApp = this.providers.get('in_app');
    return inApp ? inApp.countUnread(workspaceId) : 0;
  }
  
  /**
   * Marca notificación como leída
   */
  async markAsRead(notificationId) {
    const inApp = this.providers.get('in_app');
    return inApp ? inApp.markAsRead(notificationId) : false;
  }
  
  /**
   * Marca todas como leídas
   */
  async markAllAsRead(workspaceId) {
    const inApp = this.providers.get('in_app');
    return inApp ? inApp.markAllAsRead(workspaceId) : 0;
  }
}

// Singleton
let instance = null;

export function getNotificationService() {
  if (!instance) {
    instance = new NotificationService();
  }
  return instance;
}

export function createNotificationService() {
  return new NotificationService();
}

export default NotificationService;
