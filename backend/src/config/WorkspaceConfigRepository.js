/**
 * WorkspaceConfigRepository - Gestión de configuración por workspace
 * 
 * Cada workspace tiene su propia configuración que sobrescribe
 * los valores del sistema.
 */

import { BaseRepository } from '../repositories/BaseRepository.js';
import { SystemConfig, getConfig } from './system.js';

export class WorkspaceConfigRepository extends BaseRepository {
  constructor(db) {
    super(db);
    this.configCache = new Map();
  }
  
  /**
   * Obtiene la configuración de un workspace
   * @param {string} workspaceId - ID del workspace
   * @returns {Promise<object>}
   */
  async getConfig(workspaceId) {
    // Primero buscar en cache
    if (this.configCache.has(workspaceId)) {
      return this.configCache.get(workspaceId);
    }
    
    // Buscar en base de datos
    const configId = `config_${workspaceId}`;
    let config = await this.findById(configId);
    
    if (!config) {
      // Crear configuración por defecto
      config = await this.createDefaultConfig(workspaceId);
    }
    
    // Merge con configuración del sistema
    const merged = this.mergeWithSystem(config);
    
    // Guardar en cache
    this.configCache.set(workspaceId, merged);
    
    return merged;
  }
  
  /**
   * Actualiza la configuración de un workspace
   */
  async updateConfig(workspaceId, updates) {
    const configId = `config_${workspaceId}`;
    let config = await this.findById(configId);
    
    if (!config) {
      config = await this.createDefaultConfig(workspaceId);
    }
    
    // Aplicar actualizaciones
    const updated = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await this.update(configId, updated);
    
    // Actualizar cache
    const merged = this.mergeWithSystem(updated);
    this.configCache.set(workspaceId, merged);
    
    return merged;
  }
  
  /**
   * Crea configuración por defecto para un workspace
   */
  async createDefaultConfig(workspaceId) {
    const config = {
      _id: `config_${workspaceId}`,
      type: 'workspace_config',
      workspaceId,
      
      // Plan del workspace
      plan: 'basic',
      
      // Información del negocio
      business: {
        name: '',
        type: '', // veterinary, restaurant, salon, clinic, etc.
        description: '',
        phone: '',
        email: '',
        address: '',
        website: '',
      },
      
      // Notificaciones
      notifications: {
        enabled: true,
        providers: ['in_app'],
        events: {
          record_created: true,
          record_updated: true,
          record_deleted: true,
          create_completed: true,
        },
      },
      
      // Horarios de operación (sobrescribe el del sistema)
      businessHours: null, // null = usar default del sistema
      
      // Configuración de IA
      ai: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1024,
        apiKey: null, // null = usar del sistema
      },
      
      // Configuración de citas/agenda
      appointments: {
        enabled: true,
        duration: 30,
        slotInterval: 30,
        maxPerDay: null, // null = sin límite
        requireConfirmation: false,
        allowCancellation: true,
        cancellationHours: 24, // Horas antes para cancelar
      },
      
      // Integraciones
      integrations: {
        whatsapp: {
          enabled: false,
          token: null,
          phoneId: null,
        },
        email: {
          enabled: false,
          smtp: null,
        },
        webhook: {
          enabled: false,
          url: null,
          secret: null,
        },
      },
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.create(config);
    return config;
  }
  
  /**
   * Mezcla la configuración del workspace con la del sistema
   */
  mergeWithSystem(workspaceConfig) {
    const plan = workspaceConfig.plan || 'basic';
    const planConfig = SystemConfig.plans[plan] || SystemConfig.plans.basic;
    
    return {
      ...workspaceConfig,
      
      // Añadir información del plan
      planInfo: {
        name: planConfig.name,
        limits: planConfig.limits,
        features: planConfig.features,
      },
      
      // Horarios (usar del workspace o del sistema)
      effectiveBusinessHours: workspaceConfig.businessHours || SystemConfig.businessHours,
      
      // Notificaciones mergeadas
      effectiveNotifications: {
        ...SystemConfig.notifications,
        ...workspaceConfig.notifications,
      },
      
      // Locale del sistema
      locale: SystemConfig.locale,
    };
  }
  
  /**
   * Verifica si una feature está disponible para el workspace
   */
  async hasFeature(workspaceId, feature) {
    const config = await this.getConfig(workspaceId);
    return config.planInfo?.features?.[feature] ?? false;
  }
  
  /**
   * Verifica si el workspace está dentro de sus límites
   */
  async checkLimits(workspaceId, resource, currentCount) {
    const config = await this.getConfig(workspaceId);
    const limit = config.planInfo?.limits?.[resource];
    
    if (limit === -1) return true; // Sin límite
    return currentCount < limit;
  }
  
  /**
   * Invalida el cache de un workspace
   */
  invalidateCache(workspaceId) {
    this.configCache.delete(workspaceId);
  }
  
  /**
   * Limpia todo el cache
   */
  clearCache() {
    this.configCache.clear();
  }
}

export default WorkspaceConfigRepository;
