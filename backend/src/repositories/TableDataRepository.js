/**
 * TableDataRepository - Repositorio para datos de tablas
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseRepository, NON_META_SELECTOR } from './BaseRepository.js';
import { getTableDataDbName, connectDB } from '../config/db.js';

export class TableDataRepository extends BaseRepository {
  constructor() {
    super((workspaceId, tableId) => getTableDataDbName(workspaceId, tableId));
  }
  
  /**
   * Busca un registro por ID
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} recordId 
   * @returns {Promise<object|null>}
   */
  async findById(recordId, workspaceId, tableId) {
    return super.findById(recordId, workspaceId, tableId);
  }
  
  /**
   * Busca registros con filtros
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} filters 
   * @param {object} options 
   * @returns {Promise<object[]>}
   */
  async query(workspaceId, tableId, filters = {}, options = {}) {
    // IMPORTANTE: Siempre filtrar por tableId para obtener solo registros de esta tabla
    const tableFilters = { tableId, ...filters };
    return this.find(tableFilters, options, workspaceId, tableId);
  }
  
  /**
   * Obtiene todos los registros de una tabla
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} options 
   * @returns {Promise<object[]>}
   */
  async findAll(workspaceId, tableId, options = {}) {
    // Filtrar por tableId para obtener solo registros de esta tabla
    return this.find({ tableId: tableId }, options, workspaceId, tableId);
  }
  
  /**
   * Crea un nuevo registro
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} data 
   * @returns {Promise<object>}
   */
  async create(workspaceId, tableId, data) {
    const db = await this.getDb(workspaceId, tableId);
    const doc = {
      _id: uuidv4(),
      tableId,  // Incluir tableId para filtrado correcto
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.insert(doc);
    return doc;
  }
  
  /**
   * Actualiza un registro
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} recordId 
   * @param {object} data 
   * @returns {Promise<object|null>}
   */
  async update(workspaceId, tableId, recordId, data) {
    return super.update(recordId, data, workspaceId, tableId);
  }
  
  /**
   * Actualiza registros por criterio de búsqueda
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} searchCriteria 
   * @param {object} fieldsToUpdate 
   * @returns {Promise<object|null>}
   */
  async updateByQuery(workspaceId, tableId, searchCriteria, fieldsToUpdate) {
    return super.updateByQuery(searchCriteria, fieldsToUpdate, workspaceId, tableId);
  }
  
  /**
   * Elimina un registro
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} recordId 
   * @returns {Promise<boolean>}
   */
  async delete(workspaceId, tableId, recordId) {
    return super.delete(recordId, workspaceId, tableId);
  }
  
  /**
   * Cuenta registros con filtros
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} filters 
   * @returns {Promise<number>}
   */
  async count(workspaceId, tableId, filters = {}) {
    return super.count(filters, workspaceId, tableId);
  }
  
  /**
   * Suma un campo numérico
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} field 
   * @param {object} filters 
   * @returns {Promise<number>}
   */
  async sum(workspaceId, tableId, field, filters = {}) {
    const docs = await this.query(workspaceId, tableId, filters, { limit: 5000 });
    return docs.reduce((acc, doc) => acc + (Number(doc[field]) || 0), 0);
  }
  
  /**
   * Promedio de un campo numérico
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} field 
   * @param {object} filters 
   * @returns {Promise<number>}
   */
  async avg(workspaceId, tableId, field, filters = {}) {
    const docs = await this.query(workspaceId, tableId, filters, { limit: 5000 });
    if (docs.length === 0) return 0;
    const sum = docs.reduce((acc, doc) => acc + (Number(doc[field]) || 0), 0);
    return sum / docs.length;
  }
  
  /**
   * Obtiene registros para contexto del LLM (sin campos internos)
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {number} limit 
   * @returns {Promise<object[]>}
   */
  async getForContext(workspaceId, tableId, limit = 20) {
    const docs = await this.findAll(workspaceId, tableId, { limit });
    
    return docs.map(doc => {
      const { _id, _rev, main, createdAt, updatedAt, ...rest } = doc;
      return rest;
    });
  }
  
  /**
   * Verifica disponibilidad (para tablas de citas)
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} params - { fecha, hora, dateField, timeField, excludeStatus, workingHours }
   * @returns {Promise<object>}
   */
  async checkAvailability(workspaceId, tableId, params = {}) {
    const { 
      fecha, 
      hora, 
      dateField = 'fecha',      // Campo de fecha configurable
      timeField = 'hora',       // Campo de hora configurable
      excludeStatus = ['Cancelada'],
      workingHours = { start: '09:00', end: '18:00', interval: 30 }
    } = params;
    
    const allRecords = await this.findAll(workspaceId, tableId, { limit: 200 });
    
    // Filtrar por fecha (usando campo dinámico) y excluir estados
    const recordsForDate = allRecords.filter(r => {
      if (r[dateField] !== fecha) return false;
      if (excludeStatus.includes(r.estado)) return false;
      return true;
    });
    
    // Horarios ocupados (usando campo dinámico)
    const ocupados = recordsForDate.map(r => r[timeField]).filter(Boolean);
    
    // Generar horarios base desde configuración
    const horariosBase = [];
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour] = workingHours.end.split(':').map(Number);
    const intervalMinutes = workingHours.interval || 30;
    
    for (let h = startHour; h < endHour; h++) {
      for (let m = (h === startHour ? startMin : 0); m < 60; m += intervalMinutes) {
        horariosBase.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    
    const libres = horariosBase.filter(h => !ocupados.includes(h));
    
    return {
      fecha,
      totalCitas: recordsForDate.length,
      ocupados,
      libres,
      horaDisponible: hora ? !ocupados.includes(hora) : null,
    };
  }
  
  /**
   * Busca registros duplicados por un campo único
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} field 
   * @param {*} value 
   * @returns {Promise<object|null>}
   */
  async findDuplicate(workspaceId, tableId, field, value) {
    const results = await this.query(workspaceId, tableId, { [field]: value }, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
}

// Singleton
let instance = null;

export function getTableDataRepository() {
  if (!instance) {
    instance = new TableDataRepository();
  }
  return instance;
}

export default TableDataRepository;
