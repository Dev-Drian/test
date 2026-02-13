/**
 * SystemConfig - Configuración global del sistema
 * 
 * Define valores por defecto que aplican a todo el sistema.
 * Se puede sobrescribir a nivel de workspace.
 */

export const SystemConfig = {
  // Información del sistema
  system: {
    name: 'Chat Bot Platform',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Base de datos
  database: {
    url: process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984',
    prefix: process.env.DB_PREFIX || 'chatbot_',
  },
  
  // API de OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: 'gpt-4o-mini',
    maxTokens: 1024,
    temperature: 0.7,
  },
  
  // Servidor
  server: {
    port: parseInt(process.env.PORT) || 3010,
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    },
  },
  
  // Notificaciones - Configuración por defecto
  notifications: {
    enabled: true,
    providers: ['in_app'], // Proveedores habilitados por defecto
    retentionDays: 30,     // Días que se guardan las notificaciones
    events: {
      record_created: true,
      record_updated: true,
      record_deleted: true,
      create_completed: true,
      availability_checked: false,
    },
  },
  
  // Límites según plan (Bot Básico vs Premium)
  plans: {
    basic: {
      name: 'Bot Básico',
      limits: {
        agents: 1,
        tables: 3,
        chatsPerDay: 100,
        rowsPerTable: 500,
      },
      features: {
        create: true,
        read: true,
        update: false,
        delete: false,
        availability: false,
        notifications: false,
        flows: false,
        integrations: false,
        analytics: false,
      },
    },
    premium: {
      name: 'Bot Premium',
      limits: {
        agents: -1, // ilimitado
        tables: -1,
        chatsPerDay: -1,
        rowsPerTable: -1,
      },
      features: {
        create: true,
        read: true,
        update: true,
        delete: true,
        availability: true,
        notifications: true,
        flows: true,
        integrations: true,
        analytics: true,
      },
    },
  },
  
  // Configuración de fechas/tiempo
  locale: {
    timezone: 'America/Bogota',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    language: 'es',
  },
  
  // Horarios de trabajo por defecto
  businessHours: {
    monday: { start: '08:00', end: '18:00', enabled: true },
    tuesday: { start: '08:00', end: '18:00', enabled: true },
    wednesday: { start: '08:00', end: '18:00', enabled: true },
    thursday: { start: '08:00', end: '18:00', enabled: true },
    friday: { start: '08:00', end: '18:00', enabled: true },
    saturday: { start: '09:00', end: '14:00', enabled: true },
    sunday: { start: '00:00', end: '00:00', enabled: false },
  },
  
  // Duración de citas por defecto (minutos)
  appointmentDuration: 30,
  
  // Slots de tiempo (minutos entre cada slot disponible)
  slotInterval: 30,
};

/**
 * Obtiene un valor de configuración con notación de punto
 * @param {string} path - Ruta al valor (ej: 'notifications.enabled')
 * @param {any} defaultValue - Valor por defecto si no existe
 */
export function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = SystemConfig;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Verifica si una feature está habilitada para un plan
 */
export function isFeatureEnabled(plan, feature) {
  return SystemConfig.plans[plan]?.features?.[feature] ?? false;
}

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(plan) {
  return SystemConfig.plans[plan]?.limits || SystemConfig.plans.basic.limits;
}

export default SystemConfig;
