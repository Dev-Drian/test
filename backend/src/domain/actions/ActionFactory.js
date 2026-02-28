/**
 * ActionFactory - Factory para crear handlers de acciones
 * 
 * Permite registrar y crear handlers dinámicamente.
 * Facilita la extensibilidad del sistema.
 */

import { CreateHandler } from './CreateHandler.js';
import { QueryHandler } from './QueryHandler.js';
import { UpdateHandler } from './UpdateHandler.js';
import { AvailabilityHandler } from './AvailabilityHandler.js';
import { FallbackHandler } from './FallbackHandler.js';
import { SetupHandler } from './SetupHandler.js';
import { FlowHandler } from './FlowHandler.js';

export class ActionFactory {
  static handlers = new Map();
  
  /**
   * Registra los handlers por defecto
   */
  static initialize(dependencies = {}) {
    this.register('create', CreateHandler, dependencies);
    this.register('query', QueryHandler, dependencies);
    this.register('search', QueryHandler, dependencies);
    this.register('update', UpdateHandler, dependencies);
    this.register('delete', UpdateHandler, dependencies);
    this.register('availability', AvailabilityHandler, dependencies);
    this.register('setup', SetupHandler, dependencies);
    this.register('flow', FlowHandler, dependencies);
    this.register('fallback', FallbackHandler, dependencies);
  }
  
  /**
   * Registra un handler para un tipo de acción
   * @param {string} actionType - Tipo de acción
   * @param {class} HandlerClass - Clase del handler
   * @param {object} dependencies - Dependencias a inyectar
   */
  static register(actionType, HandlerClass, dependencies = {}) {
    this.handlers.set(actionType, { HandlerClass, dependencies });
  }
  
  /**
   * Crea una instancia de handler para un tipo de acción
   * @param {string} actionType - Tipo de acción
   * @returns {ActionHandler}
   */
  static create(actionType) {
    const config = this.handlers.get(actionType);
    
    if (!config) {
      // Retornar FallbackHandler si no hay handler específico
      const fallbackConfig = this.handlers.get('fallback');
      if (fallbackConfig) {
        return new fallbackConfig.HandlerClass(fallbackConfig.dependencies);
      }
      throw new Error(`No handler registered for action type: ${actionType}`);
    }
    
    return new config.HandlerClass(config.dependencies);
  }
  
  /**
   * Crea todos los handlers en orden de prioridad
   * @returns {ActionHandler[]}
   */
  static createAll() {
    const order = ['setup', 'flow', 'update', 'availability', 'create', 'query', 'fallback'];
    const handlers = [];
    
    for (const actionType of order) {
      const config = this.handlers.get(actionType);
      if (config) {
        handlers.push(new config.HandlerClass(config.dependencies));
      }
    }
    
    return handlers;
  }
  
  /**
   * Verifica si existe un handler para un tipo de acción
   * @param {string} actionType 
   * @returns {boolean}
   */
  static has(actionType) {
    return this.handlers.has(actionType);
  }
  
  /**
   * Obtiene los tipos de acción registrados
   * @returns {string[]}
   */
  static getActionTypes() {
    return Array.from(this.handlers.keys());
  }
}

export default ActionFactory;
