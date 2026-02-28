/**
 * Plans Configuration - Definición de planes y límites
 * 
 * Este archivo define la estructura base de los planes.
 * Los planes reales se almacenan en BD (_plans) y son editables por super admin.
 * 
 * Se usa como fallback y para seedear la BD inicialmente.
 */

// Planes por defecto (se insertan en BD si no existen)
export const DEFAULT_PLANS = {
  free: {
    _id: 'free',
    name: 'Gratis',
    description: 'Perfecto para probar la plataforma',
    price: 0,
    currency: 'USD',
    billingPeriod: null, // null = sin cobro
    isDefault: true, // Plan asignado a nuevos usuarios
    isActive: true,
    sortOrder: 1,
    
    limits: {
      workspaces: 1,
      tablesPerWorkspace: 3,
      recordsPerTable: 100,
      agents: 1,
      flows: 1,
      storage: 100, // MB
      apiCalls: 0, // 0 = sin acceso API
    },
    
    features: {
      chat: true,
      exports: false,
      apiAccess: false,
      webhooks: false,
      customDomain: false,
      whiteLabel: false,
      prioritySupport: false,
      analytics: 'basic', // basic, advanced, full
    },
    
    aiModels: ['gpt-4o-mini'],
    
    ui: {
      color: '#6b7280', // gray
      badge: '🆓',
      highlight: false,
    }
  },
  
  starter: {
    _id: 'starter',
    name: 'Inicial',
    description: 'Para negocios pequeños',
    price: 9,
    currency: 'USD',
    billingPeriod: 'monthly',
    isDefault: false,
    isActive: true,
    sortOrder: 2,
    
    limits: {
      workspaces: 3,
      tablesPerWorkspace: 10,
      recordsPerTable: 1000,
      agents: 2,
      flows: 5,
      storage: 500, // MB
      apiCalls: 1000, // por mes
    },
    
    features: {
      chat: true,
      exports: true,
      apiAccess: false,
      webhooks: false,
      customDomain: false,
      whiteLabel: false,
      prioritySupport: false,
      analytics: 'basic',
    },
    
    aiModels: ['gpt-4o-mini', 'gpt-4o'],
    
    ui: {
      color: '#3b82f6', // blue
      badge: '⭐',
      highlight: false,
    }
  },
  
  premium: {
    _id: 'premium',
    name: 'Premium',
    description: 'Para negocios en crecimiento',
    price: 29,
    currency: 'USD',
    billingPeriod: 'monthly',
    isDefault: false,
    isActive: true,
    sortOrder: 3,
    
    limits: {
      workspaces: 10,
      tablesPerWorkspace: 50,
      recordsPerTable: 10000,
      agents: 5,
      flows: 20,
      storage: 5000, // MB (5GB)
      apiCalls: 10000, // por mes
    },
    
    features: {
      chat: true,
      exports: true,
      apiAccess: true,
      webhooks: true,
      customDomain: false,
      whiteLabel: false,
      prioritySupport: true,
      analytics: 'advanced',
    },
    
    aiModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    
    ui: {
      color: '#8b5cf6', // violet
      badge: '💎',
      highlight: true,
    }
  },
  
  enterprise: {
    _id: 'enterprise',
    name: 'Empresarial',
    description: 'Sin límites, soporte dedicado',
    price: 99,
    currency: 'USD',
    billingPeriod: 'monthly',
    isDefault: false,
    isActive: true,
    sortOrder: 4,
    
    limits: {
      workspaces: -1, // -1 = ilimitado
      tablesPerWorkspace: -1,
      recordsPerTable: -1,
      agents: -1,
      flows: -1,
      storage: -1,
      apiCalls: -1,
    },
    
    features: {
      chat: true,
      exports: true,
      apiAccess: true,
      webhooks: true,
      customDomain: true,
      whiteLabel: true,
      prioritySupport: true,
      analytics: 'full',
    },
    
    aiModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'claude-3-opus'],
    
    ui: {
      color: '#f59e0b', // amber
      badge: '👑',
      highlight: true,
    }
  }
};

// Mensajes de límite alcanzado (para UI)
export const LIMIT_MESSAGES = {
  workspaces: {
    title: 'Límite de proyectos alcanzado',
    message: 'Has llegado al máximo de proyectos para tu plan.',
    action: 'Mejora tu plan para crear más proyectos.'
  },
  tablesPerWorkspace: {
    title: 'Límite de tablas alcanzado',
    message: 'Has llegado al máximo de tablas en este proyecto.',
    action: 'Mejora tu plan para crear más tablas.'
  },
  recordsPerTable: {
    title: 'Límite de registros alcanzado',
    message: 'Esta tabla ha llegado a su capacidad máxima.',
    action: 'Mejora tu plan para almacenar más datos.'
  },
  agents: {
    title: 'Límite de asistentes alcanzado',
    message: 'Has llegado al máximo de asistentes IA.',
    action: 'Mejora tu plan para crear más asistentes.'
  },
  flows: {
    title: 'Límite de automatizaciones alcanzado',
    message: 'Has llegado al máximo de automatizaciones.',
    action: 'Mejora tu plan para crear más flujos.'
  }
};

export default DEFAULT_PLANS;
