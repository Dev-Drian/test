/**
 * CacheService - Sistema de cache en memoria
 * 
 * Características:
 * - TTL configurable por tipo de dato
 * - Invalidación selectiva por patrones
 * - Estadísticas de hit/miss
 * - Namespaces para diferentes tipos de datos
 * 
 * Uso:
 *   import cache from './config/cache.js';
 *   
 *   // Set con TTL por defecto
 *   cache.set('key', data);
 *   
 *   // Set con TTL específico (segundos)
 *   cache.set('key', data, 300);
 *   
 *   // Get (retorna undefined si no existe)
 *   const data = cache.get('key');
 *   
 *   // Get or Set (ejecuta función si no está en cache)
 *   const data = await cache.getOrSet('key', async () => fetchData(), 300);
 */

import NodeCache from 'node-cache';
import logger from './logger.js';

const log = logger.child('Cache');

// TTLs por defecto (en segundos)
const DEFAULT_TTLS = {
  tables: 300,        // 5 minutos - estructura de tablas
  tableData: 60,      // 1 minuto - datos de tablas
  agents: 300,        // 5 minutos - configuración de agentes
  workspaces: 600,    // 10 minutos - workspaces
  queries: 30,        // 30 segundos - resultados de queries
  fieldsConfig: 300,  // 5 minutos - configuración de campos
  default: 60,        // 1 minuto por defecto
};

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: DEFAULT_TTLS.default,
      checkperiod: 120, // Verificar expiración cada 2 minutos
      useClones: true,  // Clonar objetos para evitar mutaciones
      deleteOnExpire: true,
    });
    
    // Estadísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
    
    // Eventos
    this.cache.on('expired', (key) => {
      log.debug(`Key expired: ${key}`);
    });
    
    this.cache.on('del', (key) => {
      log.debug(`Key deleted: ${key}`);
    });
  }
  
  /**
   * Genera una clave de cache con namespace
   * @param {string} namespace - Tipo de dato (tables, agents, etc.)
   * @param {...string} parts - Partes de la clave
   * @returns {string}
   */
  key(namespace, ...parts) {
    return `${namespace}:${parts.join(':')}`;
  }
  
  /**
   * Obtiene un valor del cache
   * @param {string} key - Clave del cache
   * @returns {any|undefined}
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      log.debug(`Cache HIT: ${key}`);
      return value;
    }
    this.stats.misses++;
    log.debug(`Cache MISS: ${key}`);
    return undefined;
  }
  
  /**
   * Guarda un valor en el cache
   * @param {string} key - Clave del cache
   * @param {any} value - Valor a guardar
   * @param {number} ttl - Tiempo de vida en segundos (opcional)
   * @returns {boolean}
   */
  set(key, value, ttl = DEFAULT_TTLS.default) {
    const success = this.cache.set(key, value, ttl);
    if (success) {
      this.stats.sets++;
      log.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    }
    return success;
  }
  
  /**
   * Obtiene un valor o lo genera si no existe
   * @param {string} key - Clave del cache
   * @param {Function} fetchFn - Función async para obtener el valor
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttl = DEFAULT_TTLS.default) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await fetchFn();
    if (value !== undefined && value !== null) {
      this.set(key, value, ttl);
    }
    return value;
  }
  
  /**
   * Elimina un valor del cache
   * @param {string} key - Clave a eliminar
   * @returns {number} - Número de claves eliminadas
   */
  del(key) {
    const count = this.cache.del(key);
    this.stats.deletes += count;
    return count;
  }
  
  /**
   * Elimina todas las claves que coincidan con un patrón
   * @param {string} pattern - Patrón (ej: "tables:*" o "workspace123:*")
   * @returns {number} - Número de claves eliminadas
   */
  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const toDelete = keys.filter(k => regex.test(k));
    
    if (toDelete.length > 0) {
      this.cache.del(toDelete);
      this.stats.deletes += toDelete.length;
      log.info(`Invalidated ${toDelete.length} keys matching: ${pattern}`);
    }
    
    return toDelete.length;
  }
  
  /**
   * Invalida todo el cache de un workspace
   * @param {string} workspaceId 
   */
  invalidateWorkspace(workspaceId) {
    return this.invalidatePattern(`*:${workspaceId}:*`);
  }
  
  /**
   * Invalida cache de una tabla específica
   * @param {string} workspaceId 
   * @param {string} tableId 
   */
  invalidateTable(workspaceId, tableId) {
    this.invalidatePattern(`tables:${workspaceId}:${tableId}`);
    this.invalidatePattern(`tableData:${workspaceId}:${tableId}:*`);
    this.invalidatePattern(`queries:${workspaceId}:${tableId}:*`);
  }
  
  /**
   * Limpia todo el cache
   */
  flush() {
    this.cache.flushAll();
    log.info('Cache flushed');
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
        : '0%',
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
    };
  }
  
  /**
   * TTLs predefinidos para diferentes tipos de datos
   */
  get TTL() {
    return DEFAULT_TTLS;
  }
}

// Singleton
const cache = new CacheService();
export default cache;

// Named exports
export { CacheService, DEFAULT_TTLS };
