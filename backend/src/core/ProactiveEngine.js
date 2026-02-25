/**
 * ProactiveEngine - Inteligencia Proactiva
 * 
 * Genera sugerencias y notificaciones contextuales:
 * - Sugerencias basadas en hora del día
 * - Recordatorios de flujos incompletos
 * - Sugerencias basadas en patrones de uso
 * - Quick actions contextuales
 * 
 * @module core/ProactiveEngine
 */

import logger from '../config/logger.js';

const log = logger.child('ProactiveEngine');

class ProactiveEngine {
  constructor() {
    // Configuraciones por workspace
    this.config = new Map();
    
    // Contadores de acciones por usuario/chat
    this.actionCounters = new Map();
  }

  /**
   * Configura el motor proactivo para un workspace
   * @param {string} workspaceId 
   * @param {object} settings 
   */
  configure(workspaceId, settings = {}) {
    this.config.set(workspaceId, {
      enabled: settings.enabled ?? true,
      suggestOnIdle: settings.suggestOnIdle ?? true,
      suggestAfterAction: settings.suggestAfterAction ?? true,
      businessHours: settings.businessHours || { start: 8, end: 20 },
      maxSuggestionsPerSession: settings.maxSuggestionsPerSession || 3,
      ...settings,
    });
  }

  /**
   * Genera sugerencias contextuales
   * @param {object} context - Context del Engine
   * @param {object} options 
   * @returns {object} Sugerencias generadas
   */
  generateSuggestions(context, options = {}) {
    const config = this.config.get(context.workspaceId) || {};
    
    if (!config.enabled) {
      return { suggestions: [], quickActions: [] };
    }

    const suggestions = [];
    const quickActions = [];

    // 1. Sugerencias basadas en hora del día
    const timeSuggestions = this._getTimeSuggestions(context);
    suggestions.push(...timeSuggestions);

    // 2. Sugerencias basadas en flujo actual
    const flowSuggestions = this._getFlowSuggestions(context);
    suggestions.push(...flowSuggestions);

    // 3. Sugerencias basadas en historial de acciones
    const historySuggestions = this._getHistorySuggestions(context);
    suggestions.push(...historySuggestions);

    // 4. Quick actions contextuales
    const actions = this._getQuickActions(context);
    quickActions.push(...actions);

    // Limitar cantidad
    const maxSuggestions = config.maxSuggestionsPerSession || 3;
    
    return {
      suggestions: suggestions.slice(0, maxSuggestions),
      quickActions: quickActions.slice(0, 4),
    };
  }

  /**
   * Sugerencias basadas en hora del día
   * @private
   */
  _getTimeSuggestions(context) {
    const suggestions = [];
    const hour = new Date().getHours();
    const tables = context.tables || [];

    // Mañana temprano
    if (hour >= 7 && hour < 10) {
      const citasTable = tables.find(t => 
        t.name.toLowerCase().includes('cita') || 
        t.name.toLowerCase().includes('appointment')
      );
      if (citasTable) {
        suggestions.push({
          type: 'time_based',
          priority: 'medium',
          message: '🌅 Buenos días. ¿Quieres ver las citas de hoy?',
          action: {
            type: 'query',
            tableName: citasTable.name,
            filter: { fecha: 'hoy' },
          },
        });
      }
    }

    // Final del día laboral
    if (hour >= 17 && hour < 20) {
      suggestions.push({
        type: 'time_based',
        priority: 'low',
        message: '🌆 Terminando el día. ¿Hay algo pendiente que quieras revisar?',
        action: { type: 'summary' },
      });
    }

    return suggestions;
  }

  /**
   * Sugerencias basadas en flujo actual
   * @private
   */
  _getFlowSuggestions(context) {
    const suggestions = [];

    // Si hay un flujo pendiente
    if (context.pendingCreate) {
      const missingFields = context.pendingCreate.missingFields || [];
      const collectedFields = context.pendingCreate.collectedFields || {};
      const tableName = context.pendingCreate.tableName;

      if (missingFields.length > 0) {
        suggestions.push({
          type: 'flow_reminder',
          priority: 'high',
          message: `📝 Tienes un registro de ${tableName} pendiente. Faltan: ${missingFields.join(', ')}`,
          action: {
            type: 'continue_flow',
            pendingCreate: context.pendingCreate,
          },
        });
      }

      // Si lleva mucho recolectado pero no completado
      if (Object.keys(collectedFields).length >= 3 && missingFields.length > 0) {
        suggestions.push({
          type: 'almost_complete',
          priority: 'high',
          message: `✨ ¡Ya casi! Solo falta: ${missingFields.join(', ')} para completar el registro.`,
          action: { type: 'list_collected', fields: collectedFields },
        });
      }
    }

    return suggestions;
  }

  /**
   * Sugerencias basadas en historial de acciones
   * @private
   */
  _getHistorySuggestions(context) {
    const suggestions = [];
    const history = context.userMemory?.actionHistory || [];

    if (history.length === 0) return suggestions;

    // Detectar patrones de repetición
    const lastActions = history.slice(0, 5);
    const actionTypes = lastActions.map(a => `${a.type}:${a.tableName}`);
    
    // Si hay muchas creaciones en la misma tabla
    const createCounts = {};
    lastActions.filter(a => a.type === 'create').forEach(a => {
      createCounts[a.tableName] = (createCounts[a.tableName] || 0) + 1;
    });

    for (const [tableName, count] of Object.entries(createCounts)) {
      if (count >= 2) {
        suggestions.push({
          type: 'pattern_detected',
          priority: 'medium',
          message: `📊 Has registrado ${count} ${tableName} recientemente. ¿Quieres agregar otro?`,
          action: {
            type: 'quick_create',
            tableName,
          },
        });
      }
    }

    // Si la última acción fue crear, sugerir crear relacionado
    const lastAction = history[0];
    if (lastAction?.type === 'create') {
      const relations = this._getRelatedTables(lastAction.tableName, context.tables);
      if (relations.length > 0) {
        suggestions.push({
          type: 'related_action',
          priority: 'low',
          message: `🔗 ¿Quieres agregar algo relacionado? (${relations.join(', ')})`,
          action: {
            type: 'suggest_relation',
            tables: relations,
          },
        });
      }
    }

    return suggestions;
  }

  /**
   * Quick actions contextuales (botones rápidos)
   * @private
   */
  _getQuickActions(context) {
    const actions = [];
    const tables = context.tables || [];

    // Si hay flujo pendiente
    if (context.pendingCreate) {
      actions.push({
        label: '▶️ Continuar',
        action: 'continue',
        data: { flow: context.pendingCreate },
      });
      actions.push({
        label: '❌ Cancelar',
        action: 'cancel',
        data: { flow: context.pendingCreate },
      });
    } else {
      // Acciones por defecto basadas en tablas disponibles
      tables.slice(0, 3).forEach(table => {
        actions.push({
          label: `➕ ${table.name}`,
          action: 'create',
          data: { tableId: table.id, tableName: table.name },
        });
      });
    }

    return actions;
  }

  /**
   * Encuentra tablas relacionadas
   * @private
   */
  _getRelatedTables(tableName, tables) {
    // Relaciones comunes conocidas
    const relationMap = {
      'citas': ['clientes', 'servicios'],
      'clientes': ['citas', 'pedidos', 'facturas'],
      'pedidos': ['clientes', 'productos'],
      'productos': ['categorias', 'inventario'],
      'facturas': ['clientes', 'servicios'],
    };

    const normalized = tableName.toLowerCase();
    const related = relationMap[normalized] || [];
    
    // Filtrar solo las tablas que existen
    const tableNames = tables.map(t => t.name.toLowerCase());
    
    return related.filter(r => tableNames.includes(r));
  }

  /**
   * Genera mensaje de bienvenida contextual
   * @param {object} context 
   * @returns {string}
   */
  getWelcomeMessage(context) {
    const hour = new Date().getHours();
    const userName = context.userMemory?.profile?.nombre;
    const greeting = userName ? `, ${userName}` : '';

    let timeGreeting;
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Buenos días';
    } else if (hour >= 12 && hour < 19) {
      timeGreeting = 'Buenas tardes';
    } else {
      timeGreeting = 'Buenas noches';
    }

    // Verificar si hay algo pendiente
    if (context.pendingCreate) {
      return `${timeGreeting}${greeting}. Tienes un registro de ${context.pendingCreate.tableName} pendiente. ¿Continuamos?`;
    }

    // Mensaje simple
    return `${timeGreeting}${greeting}. ¿En qué puedo ayudarte?`;
  }

  /**
   * Detecta intención proactiva en el mensaje
   * @param {string} message 
   * @returns {object|null}
   */
  detectProactiveIntent(message) {
    const normalized = message.toLowerCase().trim();

    // "qué puedo hacer" / "ayuda"
    if (/^(qu[ée]\s+puedo\s+hacer|ayuda|help|opciones)$/.test(normalized)) {
      return { type: 'help', showSuggestions: true };
    }

    // "citas de hoy" / "agenda de hoy"
    if (/^(citas?|agenda|appointments?)\s+(de\s+)?hoy$/i.test(normalized)) {
      return { type: 'today_appointments' };
    }

    // "pendientes" / "que tengo pendiente"
    if (/^(pendientes?|que\s+tengo\s+pendiente)$/i.test(normalized)) {
      return { type: 'show_pending' };
    }

    // "historial" / "que he hecho"
    if (/^(historial|que\s+he\s+hecho|mis\s+acciones?)$/i.test(normalized)) {
      return { type: 'show_history' };
    }

    return null;
  }

  /**
   * Registra una acción para análisis de patrones
   * @param {string} chatId 
   * @param {object} action 
   */
  trackAction(chatId, action) {
    const key = `${chatId}:${action.type}:${action.tableName || 'general'}`;
    const current = this.actionCounters.get(key) || 0;
    this.actionCounters.set(key, current + 1);
    
    // Limpiar contadores viejos periódicamente
    if (this.actionCounters.size > 10000) {
      this._cleanOldCounters();
    }
  }

  /**
   * @private
   */
  _cleanOldCounters() {
    // Mantener solo los últimos 5000
    const entries = Array.from(this.actionCounters.entries());
    const toKeep = entries.slice(-5000);
    this.actionCounters = new Map(toKeep);
  }
}

// Singleton
let instance = null;

export function getProactiveEngine() {
  if (!instance) {
    instance = new ProactiveEngine();
  }
  return instance;
}

export { ProactiveEngine };
export default ProactiveEngine;
