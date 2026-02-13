/**
 * BaseRepository - Clase base para todos los repositorios
 * 
 * Proporciona operaciones CRUD genéricas sobre CouchDB
 * Con soporte para cache y logging centralizado
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';

// Selector para excluir documentos de metadatos
export const NON_META_SELECTOR = {
  $or: [
    { main: { $exists: false } },
    { main: { $eq: false } },
    { main: { $type: 'null' } }
  ]
};

export class BaseRepository {
  constructor(dbNameFn, options = {}) {
    this.getDbName = dbNameFn;
    this.cacheTTL = options.cacheTTL || cache.TTL.default;
    this.cacheNamespace = options.cacheNamespace || 'repo';
    this.log = logger.child(options.name || 'BaseRepository');
  }
  
  /**
   * Genera una clave de cache
   */
  _cacheKey(...parts) {
    return cache.key(this.cacheNamespace, ...parts);
  }
  
  /**
   * Obtiene conexión a la base de datos
   * @param {...any} args - Argumentos para construir el nombre de la BD
   * @returns {Promise<PouchDB>}
   */
  async getDb(...args) {
    const dbName = this.getDbName(...args);
    return connectDB(dbName);
  }
  
  /**
   * Busca un documento por ID (con cache)
   * @param {string} id - ID del documento
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object|null>}
   */
  async findById(id, ...dbArgs) {
    const cacheKey = this._cacheKey('id', ...dbArgs, id);
    
    // Intentar obtener del cache
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    try {
      const db = await this.getDb(...dbArgs);
      const doc = await db.get(id);
      cache.set(cacheKey, doc, this.cacheTTL);
      return doc;
    } catch (error) {
      if (error.status === 404) {
        cache.set(cacheKey, null, 30); // Cache negativo corto
        return null;
      }
      this.log.error('findById error:', { id, error: error.message });
      throw error;
    }
  }
  
  /**
   * Busca documentos por selector
   * @param {object} selector - Selector de CouchDB
   * @param {object} options - Opciones (limit, skip, sort)
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object[]>}
   */
  async find(selector, options = {}, ...dbArgs) {
    try {
      const db = await this.getDb(...dbArgs);
      const { limit = 100, skip = 0, sort } = options;
      
      const query = {
        selector: { $and: [NON_META_SELECTOR, selector] },
        limit,
        skip,
      };
      
      if (sort) {
        query.sort = sort;
      }
      
      const result = await db.find(query);
      return result.docs || [];
    } catch (error) {
      // Si el error es por índice faltante, intentar sin sort
      if (error.message?.includes('index') || error.reason?.includes('index')) {
        try {
          const db = await this.getDb(...dbArgs);
          const result = await db.find({
            selector: { $and: [NON_META_SELECTOR, selector] },
            limit: options.limit || 100,
            skip: options.skip || 0,
          });
          return result.docs || [];
        } catch (e) {
          this.log.error('find error (retry):', { error: e.message });
          return [];
        }
      }
      this.log.error('find error:', { error: error.message });
      return [];
    }
  }
  
  /**
   * Busca todos los documentos (excluyendo metadatos)
   * @param {object} options - Opciones (limit, skip, sort)
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object[]>}
   */
  async findAll(options = {}, ...dbArgs) {
    const db = await this.getDb(...dbArgs);
    const { limit = 100, skip = 0, sort } = options;
    
    const query = {
      selector: NON_META_SELECTOR,
      limit,
      skip,
    };
    
    if (sort) {
      query.sort = sort;
    }
    
    const result = await db.find(query);
    return result.docs || [];
  }
  
  /**
   * Crea un nuevo documento
   * @param {object} data - Datos del documento
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object>}
   */
  async create(data, ...dbArgs) {
    const db = await this.getDb(...dbArgs);
    const doc = {
      _id: data._id || uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Eliminar _id del data si existe para evitar duplicación
    delete doc._id;
    doc._id = data._id || uuidv4();
    
    await db.insert(doc);
    this.log.info('Document created', { id: doc._id });
    
    // Invalidar cache relacionado
    cache.invalidatePattern(`${this.cacheNamespace}:*`);
    
    return doc;
  }
  
  /**
   * Actualiza un documento existente
   * @param {string} id - ID del documento
   * @param {object} data - Datos a actualizar
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object|null>}
   */
  async update(id, data, ...dbArgs) {
    const db = await this.getDb(...dbArgs);
    
    try {
      const existing = await db.get(id);
      const updated = {
        ...existing,
        ...data,
        _id: id,
        _rev: existing._rev,
        updatedAt: new Date().toISOString(),
      };
      
      await db.insert(updated);
      this.log.info('Document updated', { id });
      
      // Invalidar cache del documento
      const cacheKey = this._cacheKey('id', ...dbArgs, id);
      cache.del(cacheKey);
      
      return updated;
    } catch (error) {
      if (error.status === 404) return null;
      this.log.error('update error:', { id, error: error.message });
      throw error;
    }
  }
  
  /**
   * Actualiza documentos que coincidan con un criterio
   * @param {object} searchCriteria - Criterio de búsqueda
   * @param {object} data - Datos a actualizar
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<object|null>}
   */
  async updateByQuery(searchCriteria, data, ...dbArgs) {
    const docs = await this.find(searchCriteria, { limit: 1 }, ...dbArgs);
    if (docs.length === 0) return null;
    
    return this.update(docs[0]._id, data, ...dbArgs);
  }
  
  /**
   * Elimina un documento por ID
   * @param {string} id - ID del documento
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<boolean>}
   */
  async delete(id, ...dbArgs) {
    const db = await this.getDb(...dbArgs);
    
    try {
      const doc = await db.get(id);
      await db.destroy(doc._id, doc._rev);
      this.log.info('Document deleted', { id });
      
      // Invalidar cache del documento
      const cacheKey = this._cacheKey('id', ...dbArgs, id);
      cache.del(cacheKey);
      
      return true;
    } catch (error) {
      if (error.status === 404) return false;
      this.log.error('delete error:', { id, error: error.message });
      throw error;
    }
  }
  
  /**
   * Cuenta documentos que coincidan con un selector
   * @param {object} selector - Selector de CouchDB
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<number>}
   */
  async count(selector = {}, ...dbArgs) {
    const docs = await this.find(selector, { limit: 10000 }, ...dbArgs);
    return docs.length;
  }
  
  /**
   * Verifica si existe un documento con el ID dado
   * @param {string} id - ID del documento
   * @param {...any} dbArgs - Argumentos para la BD
   * @returns {Promise<boolean>}
   */
  async exists(id, ...dbArgs) {
    const doc = await this.findById(id, ...dbArgs);
    return doc !== null;
  }
}

export default BaseRepository;
