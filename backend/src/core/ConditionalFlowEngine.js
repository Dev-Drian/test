/**
 * ConditionalFlowEngine - Motor de Flujos Condicionales
 * 
 * Permite definir lógica de negocio compleja:
 * - Campos requeridos según valor de otros campos
 * - Validaciones cruzadas
 * - Valores por defecto dinámicos
 * - Flujos encadenados automáticos
 * 
 * @module core/ConditionalFlowEngine  
 */

import logger from '../config/logger.js';

const log = logger.child('ConditionalFlowEngine');

/**
 * Operadores de comparación
 */
export const OPERATORS = {
  EQUALS: 'eq',
  NOT_EQUALS: 'ne',
  GREATER: 'gt',
  GREATER_OR_EQUAL: 'gte',
  LESS: 'lt',
  LESS_OR_EQUAL: 'lte',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'notContains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  IN: 'in',           // valor está en lista
  NOT_IN: 'notIn',
  IS_EMPTY: 'isEmpty',
  IS_NOT_EMPTY: 'isNotEmpty',
  MATCHES: 'matches', // regex
};

class ConditionalFlowEngine {
  constructor() {
    // Reglas por tabla
    this.rules = new Map();
    
    // Flujos automáticos post-acción
    this.postActionFlows = new Map();
  }

  /**
   * Define reglas para una tabla
   * @param {string} tableId 
   * @param {object[]} rules - Array de reglas
   * 
   * Formato de regla:
   * {
   *   name: 'require_doctor_for_medical',
   *   description: 'Si tipo es Médica, doctor es obligatorio',
   *   conditions: [
   *     { field: 'tipo', operator: 'eq', value: 'Médica' }
   *   ],
   *   actions: [
   *     { type: 'require_field', field: 'doctor' },
   *     { type: 'set_default', field: 'duracion', value: 30 }
   *   ]
   * }
   */
  setRules(tableId, rules) {
    this.rules.set(tableId, rules);
    log.info('Rules configured', { tableId, ruleCount: rules.length });
  }

  /**
   * Agrega una regla a una tabla
   * @param {string} tableId 
   * @param {object} rule 
   */
  addRule(tableId, rule) {
    const existing = this.rules.get(tableId) || [];
    existing.push(rule);
    this.rules.set(tableId, existing);
  }

  /**
   * Evalúa todas las reglas para los datos actuales
   * @param {string} tableId 
   * @param {object} data - Datos actuales del registro
   * @returns {object} Resultado de la evaluación
   */
  evaluate(tableId, data) {
    const rules = this.rules.get(tableId) || [];
    
    const result = {
      requiredFields: [],
      hiddenFields: [],
      defaults: {},
      warnings: [],
      errors: [],
      suggestions: [],
      triggeredRules: [],
    };

    for (const rule of rules) {
      const conditionsMet = this._evaluateConditions(rule.conditions, data);
      
      if (conditionsMet) {
        result.triggeredRules.push(rule.name);
        this._applyActions(rule.actions, result, data);
      }
    }

    log.debug('Rules evaluated', { 
      tableId, 
      triggeredCount: result.triggeredRules.length,
      rulesTotal: rules.length,
    });

    return result;
  }

  /**
   * Evalúa un conjunto de condiciones (AND por defecto)
   * @private
   */
  _evaluateConditions(conditions, data, logic = 'AND') {
    if (!conditions || conditions.length === 0) return true;

    const results = conditions.map(cond => {
      // Condición anidada con lógica propia
      if (cond.conditions) {
        return this._evaluateConditions(cond.conditions, data, cond.logic || 'AND');
      }
      return this._evaluateSingleCondition(cond, data);
    });

    if (logic === 'OR') {
      return results.some(r => r);
    }
    return results.every(r => r);
  }

  /**
   * Evalúa una condición individual
   * @private
   */
  _evaluateSingleCondition(condition, data) {
    const { field, operator, value } = condition;
    const fieldValue = data[field];

    switch (operator) {
      case OPERATORS.EQUALS:
        return fieldValue === value;
        
      case OPERATORS.NOT_EQUALS:
        return fieldValue !== value;
        
      case OPERATORS.GREATER:
        return Number(fieldValue) > Number(value);
        
      case OPERATORS.GREATER_OR_EQUAL:
        return Number(fieldValue) >= Number(value);
        
      case OPERATORS.LESS:
        return Number(fieldValue) < Number(value);
        
      case OPERATORS.LESS_OR_EQUAL:
        return Number(fieldValue) <= Number(value);
        
      case OPERATORS.CONTAINS:
        return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
        
      case OPERATORS.NOT_CONTAINS:
        return !String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
        
      case OPERATORS.STARTS_WITH:
        return String(fieldValue || '').toLowerCase().startsWith(String(value).toLowerCase());
        
      case OPERATORS.ENDS_WITH:
        return String(fieldValue || '').toLowerCase().endsWith(String(value).toLowerCase());
        
      case OPERATORS.IN:
        return Array.isArray(value) && value.includes(fieldValue);
        
      case OPERATORS.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);
        
      case OPERATORS.IS_EMPTY:
        return !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
        
      case OPERATORS.IS_NOT_EMPTY:
        return fieldValue && (typeof fieldValue !== 'string' || fieldValue.trim() !== '');
        
      case OPERATORS.MATCHES:
        try {
          return new RegExp(value, 'i').test(String(fieldValue));
        } catch {
          return false;
        }
        
      default:
        log.warn('Unknown operator', { operator });
        return false;
    }
  }

  /**
   * Aplica las acciones de una regla
   * @private
   */
  _applyActions(actions, result, data) {
    for (const action of actions) {
      switch (action.type) {
        case 'require_field':
          if (!result.requiredFields.includes(action.field)) {
            result.requiredFields.push(action.field);
          }
          break;
          
        case 'hide_field':
          if (!result.hiddenFields.includes(action.field)) {
            result.hiddenFields.push(action.field);
          }
          break;
          
        case 'set_default':
          if (data[action.field] === undefined || data[action.field] === null) {
            result.defaults[action.field] = action.value;
          }
          break;
          
        case 'set_value':
          result.defaults[action.field] = action.value;
          break;
          
        case 'add_warning':
          result.warnings.push(action.message);
          break;
          
        case 'add_error':
          result.errors.push(action.message);
          break;
          
        case 'suggest':
          result.suggestions.push(action.message);
          break;
          
        case 'validate':
          const validationResult = this._runValidation(action, data);
          if (validationResult.error) {
            result.errors.push(validationResult.error);
          }
          break;
          
        default:
          log.warn('Unknown action type', { type: action.type });
      }
    }
  }

  /**
   * Ejecuta una validación custom
   * @private
   */
  _runValidation(action, data) {
    const { field, validation, message } = action;
    const value = data[field];

    switch (validation) {
      case 'email':
        if (value && !/\S+@\S+\.\S+/.test(value)) {
          return { error: message || `${field} no es un email válido` };
        }
        break;
        
      case 'phone':
        if (value && !/^[\d\s\-+()]{8,}$/.test(value)) {
          return { error: message || `${field} no es un teléfono válido` };
        }
        break;
        
      case 'min_length':
        if (value && String(value).length < action.min) {
          return { error: message || `${field} debe tener al menos ${action.min} caracteres` };
        }
        break;
        
      case 'max_length':
        if (value && String(value).length > action.max) {
          return { error: message || `${field} no debe exceder ${action.max} caracteres` };
        }
        break;
        
      case 'range':
        const num = Number(value);
        if (value && (num < action.min || num > action.max)) {
          return { error: message || `${field} debe estar entre ${action.min} y ${action.max}` };
        }
        break;
    }

    return {};
  }

  /**
   * Define un flujo post-acción
   * @param {string} tableId 
   * @param {string} actionType - 'create', 'update', 'delete'
   * @param {object} flowConfig 
   */
  setPostActionFlow(tableId, actionType, flowConfig) {
    const key = `${tableId}:${actionType}`;
    this.postActionFlows.set(key, flowConfig);
  }

  /**
   * Obtiene flujo post-acción si aplica
   * @param {string} tableId 
   * @param {string} actionType 
   * @param {object} data - Datos del registro
   * @returns {object|null}
   */
  getPostActionFlow(tableId, actionType, data) {
    const key = `${tableId}:${actionType}`;
    const flowConfig = this.postActionFlows.get(key);
    
    if (!flowConfig) return null;

    // Evaluar condiciones si las hay
    if (flowConfig.conditions) {
      const conditionsMet = this._evaluateConditions(flowConfig.conditions, data);
      if (!conditionsMet) return null;
    }

    return flowConfig.flow;
  }

  /**
   * Crea reglas de ejemplo para una tabla de citas
   * @returns {object[]}
   */
  static getCitasRulesExample() {
    return [
      {
        name: 'require_service_for_appointment',
        description: 'Servicio es obligatorio para citas',
        conditions: [],  // Siempre aplica
        actions: [
          { type: 'require_field', field: 'servicio' },
        ],
      },
      {
        name: 'require_doctor_for_medical',
        description: 'Si el servicio es médico, doctor es obligatorio',
        conditions: [
          { field: 'servicio', operator: OPERATORS.CONTAINS, value: 'médic' },
        ],
        actions: [
          { type: 'require_field', field: 'doctor' },
          { type: 'set_default', field: 'duracion', value: 30 },
        ],
      },
      {
        name: 'weekend_warning',
        description: 'Advertencia para citas en fin de semana',
        conditions: [
          { field: '_dayOfWeek', operator: OPERATORS.IN, value: [0, 6] },
        ],
        actions: [
          { type: 'add_warning', message: '⚠️ Esta cita es en fin de semana' },
        ],
      },
      {
        name: 'premium_client_priority',
        description: 'Clientes premium tienen prioridad',
        conditions: [
          { field: 'cliente_tipo', operator: OPERATORS.EQUALS, value: 'Premium' },
        ],
        actions: [
          { type: 'set_default', field: 'prioridad', value: 'Alta' },
          { type: 'suggest', message: '💎 Cliente Premium - prioridad asignada automáticamente' },
        ],
      },
    ];
  }
}

// Singleton
let instance = null;

export function getConditionalFlowEngine() {
  if (!instance) {
    instance = new ConditionalFlowEngine();
  }
  return instance;
}

export { ConditionalFlowEngine, OPERATORS };
export default ConditionalFlowEngine;
