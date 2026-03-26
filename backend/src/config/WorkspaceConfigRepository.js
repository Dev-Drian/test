/**
 * WorkspaceConfigRepository - Gestión de configuración por workspace
 * 
 * Cada workspace tiene su propia configuración que sobrescribe
 * los valores del sistema.
 */

import { BaseRepository } from '../repositories/BaseRepository.js';
import { SystemConfig, getConfig } from './system.js';

// Cache compartido a nivel de módulo para el lookup Meta → workspaceId
let _sharedMetaLookup = null;

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
        meta: {
          enabled: false,
          whatsapp: {
            enabled: false,
            token: null,
            phoneNumberId: null,
            businessId: null,
            verifyToken: null,
          },
          instagram: {
            enabled: false,
            token: null,
          },
          messenger: {
            enabled: false,
            pageToken: null,
            pageId: null,
          },
          appSecret: null,
          webhookUrl: null,
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
        widget: {
          enabled: false,
          token: null,
          agentId: null,
          theme: {
            primaryColor: '#4F46E5',
            position: 'bottom-right',
            title: 'Chat con nosotros',
            subtitle: '',
            avatarUrl: null,
          },
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
    // Limpiar el lookup de Meta compartido para forzar reconstrucción
    _sharedMetaLookup = null;
  }
  
  /**
   * Limpia todo el cache
   */
  clearCache() {
    this.configCache.clear();
    _sharedMetaLookup = null;
  }

  /**
   * Busca el workspaceId asociado a un identificador de Meta (pageId, phoneNumberId, igAccountId).
   * Escanea todos los config_* docs y construye un mapa en memoria (singleton compartido).
   * @param {string} metaId - pageId, phoneNumberId o igAccountId
   * @returns {Promise<string|null>} workspaceId o null si no se encuentra
   */
  async findWorkspaceByMetaId(metaId) {
    if (!metaId) return null;

    // Usar lookup cacheado si existe
    if (_sharedMetaLookup && _sharedMetaLookup.has(metaId)) {
      return _sharedMetaLookup.get(metaId);
    }

    // Construir lookup escaneando todos los workspace configs
    const db = await this.getDb();
    const result = await db.list({ include_docs: true, startkey: 'config_', endkey: 'config_\ufff0' });

    const lookup = new Map();
    for (const row of result.rows || []) {
      const doc = row.doc;
      if (!doc || doc.type !== 'workspace_config') continue;
      const wsId = doc.workspaceId;
      const meta = doc.integrations?.meta;
      if (!meta) continue;

      // Indexar todos los identificadores posibles
      if (meta.messenger?.pageId) lookup.set(meta.messenger.pageId, wsId);
      if (meta.instagram?.pageId) lookup.set(meta.instagram.pageId, wsId);
      if (meta.instagram?.igAccountId) lookup.set(meta.instagram.igAccountId, wsId);
      if (meta.whatsapp?.phoneNumberId) lookup.set(meta.whatsapp.phoneNumberId, wsId);
    }

    _sharedMetaLookup = lookup;
    return lookup.get(metaId) || null;
  }
}

export default WorkspaceConfigRepository;
