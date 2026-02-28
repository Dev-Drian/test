/**
 * ViewRepository - Repositorio para vistas configurables
 * 
 * Maneja CRUD de vistas que transforman datos de tablas
 * en visualizaciones especializadas (calendario, kanban, etc.)
 */

import { BaseRepository } from './BaseRepository.js';
import { getViewsDbName } from '../config/db.js';
import cache from '../config/cache.js';

export class ViewRepository extends BaseRepository {
  constructor() {
    super((workspaceId) => getViewsDbName(workspaceId), {
      cacheTTL: cache.TTL.default,
      cacheNamespace: 'views',
      name: 'ViewRepository',
    });
  }
  
  /**
   * Busca una vista por ID
   * @param {string} viewId 
   * @param {string} workspaceId 
   * @returns {Promise<object|null>}
   */
  async findById(viewId, workspaceId) {
    return super.findById(viewId, workspaceId);
  }
  
  /**
   * Obtiene todas las vistas de un workspace
   * @param {string} workspaceId 
   * @returns {Promise<object[]>}
   */
  async findAll(workspaceId) {
    const cacheKey = this._cacheKey('all', workspaceId);
    
    return cache.getOrSet(cacheKey, async () => {
      return super.findAll({}, workspaceId);
    }, cache.TTL.default);
  }
  
  /**
   * Obtiene vistas por tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object[]>}
   */
  async findByTable(workspaceId, tableId) {
    const cacheKey = this._cacheKey('byTable', workspaceId, tableId);
    
    return cache.getOrSet(cacheKey, async () => {
      return this.find({ tableId }, {}, workspaceId);
    }, cache.TTL.default);
  }
  
  /**
   * Obtiene vistas por tipo
   * @param {string} workspaceId 
   * @param {string} type - calendar | kanban | timeline | table | cards
   * @returns {Promise<object[]>}
   */
  async findByType(workspaceId, type) {
    return this.find({ type, enabled: true }, {}, workspaceId);
  }
  
  /**
   * Obtiene vistas activas (enabled: true)
   * @param {string} workspaceId 
   * @returns {Promise<object[]>}
   */
  async findEnabled(workspaceId) {
    return this.find({ enabled: true }, {}, workspaceId);
  }
  
  /**
   * Crea una nueva vista
   * @param {object} viewData 
   * @param {string} workspaceId 
   * @returns {Promise<object>}
   */
  async create(viewData, workspaceId) {
    const view = await super.create({
      ...viewData,
      enabled: viewData.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, workspaceId);
    
    // Invalidar cache
    this._invalidateCache(workspaceId, viewData.tableId);
    
    return view;
  }
  
  /**
   * Actualiza una vista
   * @param {string} viewId 
   * @param {object} updates 
   * @param {string} workspaceId 
   * @returns {Promise<object>}
   */
  async update(viewId, updates, workspaceId) {
    const existing = await this.findById(viewId, workspaceId);
    if (!existing) {
      throw new Error(`View not found: ${viewId}`);
    }
    
    const updated = await super.update(viewId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    }, workspaceId);
    
    // Invalidar cache
    this._invalidateCache(workspaceId, existing.tableId);
    
    return updated;
  }
  
  /**
   * Elimina una vista
   * @param {string} viewId 
   * @param {string} workspaceId 
   * @returns {Promise<boolean>}
   */
  async delete(viewId, workspaceId) {
    const existing = await this.findById(viewId, workspaceId);
    if (!existing) {
      return false;
    }
    
    await super.delete(viewId, workspaceId);
    
    // Invalidar cache
    this._invalidateCache(workspaceId, existing.tableId);
    
    return true;
  }
  
  /**
   * Inhabilita vistas vinculadas a una tabla cuando sus headers cambian
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<number>} Número de vistas afectadas
   */
  async invalidateByTableChange(workspaceId, tableId) {
    const views = await this.findByTable(workspaceId, tableId);
    let affected = 0;
    
    for (const view of views) {
      await this.update(view._id, {
        enabled: false,
        _invalidReason: 'table_headers_changed',
        _invalidAt: new Date().toISOString(),
      }, workspaceId);
      affected++;
    }
    
    return affected;
  }
  
  /**
   * Verifica si una vista tiene mapeo válido para los headers actuales
   * @param {object} view - Vista a verificar
   * @param {object[]} tableHeaders - Headers actuales de la tabla
   * @returns {{ valid: boolean, missingFields: string[] }}
   */
  validateMapping(view, tableHeaders) {
    if (!view.fieldMap) {
      return { valid: false, missingFields: ['fieldMap'] };
    }
    
    const headerKeys = tableHeaders.map(h => h.key || h.label);
    const missingFields = [];
    
    // Verificar que los campos mapeados existan en la tabla
    for (const [viewField, tableField] of Object.entries(view.fieldMap)) {
      if (tableField && !headerKeys.includes(tableField)) {
        missingFields.push(`${viewField} → ${tableField}`);
      }
    }
    
    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
  
  /**
   * Invalida cache relacionado
   * @private
   */
  _invalidateCache(workspaceId, tableId) {
    cache.del(this._cacheKey('all', workspaceId));
    if (tableId) {
      cache.del(this._cacheKey('byTable', workspaceId, tableId));
    }
  }
}

export default ViewRepository;
