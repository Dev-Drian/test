/**
 * EntityRepository - Repositorio genérico para cualquier tabla
 * 
 * Maneja CRUD completo para cualquier entidad de forma dinámica:
 * - Validación automática basada en fieldsConfig
 * - Normalización de valores según tipo de campo
 * - Búsquedas por criterios dinámicos
 * - Soporte para relaciones y valores por defecto
 * 
 * NO requiere código específico por tabla - 100% configurable.
 */

import { TableDataRepository } from './TableDataRepository.js';
import { TableRepository } from './TableRepository.js';
import { FieldCollector } from '../domain/fields/FieldCollector.js';

export class EntityRepository {
  constructor() {
    this.tableDataRepo = new TableDataRepository();
    this.tableRepo = new TableRepository();
    this.fieldCollector = new FieldCollector();
  }
  
  /**
   * Crea un registro con validación y normalización automática
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} data - Datos a crear
   * @param {object} options - Opciones { validate: true, normalize: true, applyDefaults: true }
   * @returns {Promise<{success: boolean, record?: object, errors?: array}>}
   */
  async create(workspaceId, tableId, data, options = {}) {
    const { validate = true, normalize = true, applyDefaults = true } = options;
    
    // 1. Obtener configuración de la tabla
    const fieldsConfig = await this.tableRepo.getFieldsConfig(workspaceId, tableId);
    const requiredFields = fieldsConfig.filter(f => f.required).map(f => f.key);
    
    // 2. Aplicar valores por defecto si aplica
    let finalData = { ...data };
    if (applyDefaults) {
      const defaults = await this.tableRepo.getDefaultValues(workspaceId, tableId);
      finalData = { ...defaults, ...finalData };
    }
    
    // 3. Validar campos requeridos
    if (validate) {
      const validation = this._validateFields(finalData, fieldsConfig, requiredFields);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }
    }
    
    // 4. Normalizar valores según tipo
    if (normalize) {
      finalData = this._normalizeFields(finalData, fieldsConfig);
    }
    
    // 5. Crear el registro
    try {
      const created = await this.tableDataRepo.create(workspaceId, tableId, finalData);
      return {
        success: true,
        record: created,
      };
    } catch (error) {
      return {
        success: false,
        errors: [{ field: 'general', message: error.message }],
      };
    }
  }
  
  /**
   * Actualiza un registro con validación
   */
  async update(workspaceId, tableId, recordId, updates, options = {}) {
    const { validate = true, normalize = true } = options;
    
    const fieldsConfig = await this.tableRepo.getFieldsConfig(workspaceId, tableId);
    
    let finalUpdates = { ...updates };
    
    // Validar solo los campos que se están actualizando
    if (validate) {
      const validation = this._validateFields(finalUpdates, fieldsConfig, [], true);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }
    }
    
    // Normalizar
    if (normalize) {
      finalUpdates = this._normalizeFields(finalUpdates, fieldsConfig);
    }
    
    try {
      const updated = await this.tableDataRepo.update(workspaceId, tableId, recordId, finalUpdates);
      return {
        success: true,
        record: updated,
      };
    } catch (error) {
      return {
        success: false,
        errors: [{ field: 'general', message: error.message }],
      };
    }
  }
  
  /**
   * Busca registros por criterios dinámicos
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {object} criteria - Criterios de búsqueda { campo: valor }
   * @param {object} options - Opciones { limit, sort, fuzzy }
   * @returns {Promise<object[]>}
   */
  async findBy(workspaceId, tableId, criteria = {}, options = {}) {
    const { fuzzy = false } = options;
    
    let filters = { ...criteria };
    
    // Si fuzzy, convertir a regex case-insensitive para búsquedas flexibles
    if (fuzzy) {
      filters = {};
      for (const [key, value] of Object.entries(criteria)) {
        if (typeof value === 'string') {
          filters[key] = { $regex: value, $options: 'i' };
        } else {
          filters[key] = value;
        }
      }
    }
    
    return this.tableDataRepo.query(workspaceId, tableId, filters, options);
  }
  
  /**
   * Busca UN registro por criterios
   */
  async findOneBy(workspaceId, tableId, criteria = {}, options = {}) {
    const results = await this.findBy(workspaceId, tableId, criteria, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * Verifica si existen campos faltantes en los datos
   * @param {object} data - Datos actuales
   * @param {string[]} requiredFields - Lista de campos requeridos
   * @returns {string[]} - Lista de campos faltantes
   */
  getMissingFields(data, requiredFields) {
    return requiredFields.filter(key => {
      const value = data[key];
      return value === undefined || value === null || value === '';
    });
  }
  
  /**
   * Verifica si los datos están completos
   */
  isComplete(data, requiredFields) {
    return this.getMissingFields(data, requiredFields).length === 0;
  }
  
  /**
   * Valida campos según configuración
   * @private
   */
  _validateFields(data, fieldsConfig, requiredFields = [], isPartial = false) {
    const errors = [];
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    // Validar campos requeridos (solo si no es actualización parcial)
    if (!isPartial) {
      for (const fieldKey of requiredFields) {
        const value = data[fieldKey];
        if (value === undefined || value === null || value === '') {
          const config = configMap[fieldKey] || {};
          const label = config.label || fieldKey;
          errors.push({
            field: fieldKey,
            message: `${label} es requerido`,
          });
        }
      }
    }
    
    // Validar cada campo presente
    for (const [fieldKey, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === '') continue;
      
      const config = configMap[fieldKey];
      if (!config) continue;
      
      const validation = this.fieldCollector.validateField(fieldKey, value, config);
      if (!validation.valid) {
        errors.push({
          field: fieldKey,
          message: validation.error,
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Normaliza campos según tipo
   * @private
   */
  _normalizeFields(data, fieldsConfig) {
    const normalized = { ...data };
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === '') continue;
      
      const config = configMap[key];
      if (!config) continue;
      
      normalized[key] = this.fieldCollector.normalizeFieldValue(key, value, config);
    }
    
    return normalized;
  }
  
  /**
   * Obtiene el campo principal de visualización de una tabla
   * (usualmente 'nombre', 'title', etc.)
   */
  async getDisplayField(workspaceId, tableId) {
    const table = await this.tableRepo.findById(tableId, workspaceId);
    return table?.displayField || 'nombre';
  }
  
  /**
   * Formatea un registro para mostrar al usuario
   */
  async formatRecord(workspaceId, tableId, record) {
    const fieldsConfig = await this.tableRepo.getFieldsConfig(workspaceId, tableId);
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    let formatted = '';
    
    for (const [key, value] of Object.entries(record)) {
      if (key.startsWith('_') || !value) continue;
      if (['createdAt', 'updatedAt', 'tableId'].includes(key)) continue;
      
      const config = configMap[key] || {};
      const emoji = config.emoji || '•';
      const label = config.label || key;
      
      let displayValue = value;
      if (config.type === 'time' || key === 'hora') {
        displayValue = this._formatTime(value);
      } else if (config.type === 'date' || key === 'fecha') {
        displayValue = this._formatDate(value);
      } else if (config.type === 'currency' || key === 'precio') {
        displayValue = `$${value}`;
      }
      
      formatted += `${emoji} **${label}:** ${displayValue}\n`;
    }
    
    return formatted;
  }
  
  /**
   * Formatea hora a 12h
   * @private
   */
  _formatTime(time24) {
    if (!time24 || typeof time24 !== 'string') return time24;
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return `${hours}:${minutes} ${ampm}`;
  }
  
  /**
   * Formatea fecha legible
   * @private
   */
  _formatDate(dateStr) {
    if (!dateStr) return dateStr;
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  }
}

// Singleton
let instance = null;

export function getEntityRepository() {
  if (!instance) {
    instance = new EntityRepository();
  }
  return instance;
}

export default EntityRepository;
