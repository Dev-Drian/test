/**
 * TableRepository - Repositorio para metadatos de tablas
 */

import { BaseRepository } from './BaseRepository.js';
import { getWorkspaceDbName } from '../config/db.js';

export class TableRepository extends BaseRepository {
  constructor() {
    super((workspaceId) => getWorkspaceDbName(workspaceId));
  }
  
  /**
   * Busca una tabla por ID
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object|null>}
   */
  async findById(tableId, workspaceId) {
    return super.findById(tableId, workspaceId);
  }
  
  /**
   * Busca una tabla por nombre
   * @param {string} workspaceId 
   * @param {string} tableName 
   * @returns {Promise<object|null>}
   */
  async findByName(workspaceId, tableName) {
    const tables = await this.find({ name: tableName }, { limit: 1 }, workspaceId);
    return tables.length > 0 ? tables[0] : null;
  }
  
  /**
   * Obtiene todas las tablas de un workspace
   * @param {string} workspaceId 
   * @returns {Promise<object[]>}
   */
  async findAll(workspaceId) {
    return super.findAll({}, workspaceId);
  }
  
  /**
   * Obtiene los headers/campos de una tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object[]>}
   */
  async getHeaders(workspaceId, tableId) {
    const table = await this.findById(tableId, workspaceId);
    return table?.headers || [];
  }
  
  /**
   * Obtiene los campos obligatorios de una tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<string[]>}
   */
  async getRequiredFields(workspaceId, tableId) {
    const headers = await this.getHeaders(workspaceId, tableId);
    return headers
      .filter(h => h.required === true)
      .map(h => h.key || h.label);
  }
  
  /**
   * Obtiene la configuración completa de campos (para preguntas dinámicas)
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object[]>}
   */
  async getFieldsConfig(workspaceId, tableId) {
    const headers = await this.getHeaders(workspaceId, tableId);
    return headers.map(h => ({
      key: h.key || h.label,
      label: h.label || h.key,
      type: h.type || 'text',
      required: h.required || false,
      emoji: h.emoji || null,
      askMessage: h.askMessage || null,
      confirmLabel: h.confirmLabel || h.label || h.key,
      priority: h.priority || 99,
      options: h.options || null,
      validation: h.validation || null,
      defaultValue: h.defaultValue,
      synonyms: h.synonyms || [],
      relation: h.relation || null,
    }));
  }
  
  /**
   * Obtiene los valores por defecto de una tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object>}
   */
  async getDefaultValues(workspaceId, tableId) {
    const headers = await this.getHeaders(workspaceId, tableId);
    const defaults = {};
    
    headers.forEach(h => {
      if (h.defaultValue !== undefined) {
        const key = h.key || h.label;
        defaults[key] = h.defaultValue;
      }
    });
    
    return defaults;
  }
  
  /**
   * Obtiene información resumida de múltiples tablas (para el LLM)
   * @param {string} workspaceId 
   * @param {string[]} tableIds 
   * @returns {Promise<object[]>}
   */
  async getTablesInfo(workspaceId, tableIds) {
    const tablesInfo = [];
    
    for (const tableId of tableIds) {
      const table = await this.findById(tableId, workspaceId);
      if (table) {
        const requiredFields = (table.headers || [])
          .filter(h => h.required === true)
          .map(h => h.key || h.label);
        
        tablesInfo.push({
          _id: table._id,
          name: table.name,
          type: table.type,
          fields: requiredFields,
        });
      }
    }
    
    return tablesInfo;
  }
  
  /**
   * Obtiene las opciones disponibles para un campo de tipo select o relation
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} fieldKey 
   * @returns {Promise<array>}
   */
  async getFieldOptions(workspaceId, tableId, fieldKey) {
    const headers = await this.getHeaders(workspaceId, tableId);
    const header = headers.find(h => (h.key || h.label) === fieldKey);
    
    if (!header) return [];
    
    // Si es tipo select con opciones definidas
    if (header.type === 'select' && Array.isArray(header.options)) {
      return header.options;
    }
    
    // Si es relación, obtener valores de la tabla relacionada
    if (header.type === 'relation' && header.relation?.tableName) {
      const relatedTable = await this.findByName(workspaceId, header.relation.tableName);
      if (!relatedTable) return [];
      
      const displayField = header.relation.displayField || 'nombre';
      const TableDataRepository = (await import('./TableDataRepository.js')).TableDataRepository;
      const dataRepo = new TableDataRepository();
      const records = await dataRepo.findAll(workspaceId, relatedTable._id, { limit: 50 });
      
      return records.map(r => r[displayField]).filter(Boolean);
    }
    
    return [];
  }
  
  /**
   * Valida que una tabla existe
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<boolean>}
   */
  async exists(workspaceId, tableId) {
    const table = await this.findById(tableId, workspaceId);
    return !!table;
  }
  
  /**
   * Obtiene estadísticas básicas de una tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @returns {Promise<object>}
   */
  async getStats(workspaceId, tableId) {
    const table = await this.findById(tableId, workspaceId);
    if (!table) return null;
    
    const TableDataRepository = (await import('./TableDataRepository.js')).TableDataRepository;
    const dataRepo = new TableDataRepository();
    const records = await dataRepo.findAll(workspaceId, tableId);
    
    return {
      tableId,
      tableName: table.name,
      totalRecords: records.length,
      fieldCount: (table.headers || []).length,
      requiredFields: (table.headers || []).filter(h => h.required).length,
    };
  }
}

// Singleton
let instance = null;

export function getTableRepository() {
  if (!instance) {
    instance = new TableRepository();
  }
  return instance;
}

export default TableRepository;
