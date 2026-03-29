/**
 * Conexión Redis con fallback graceful
 * 
 * Si Redis no está disponible, el sistema funciona sin cola
 * (procesamiento síncrono como antes)
 */
import Redis from 'ioredis';
import logger from '../config/logger.js';

const log = logger.child('Redis');

let connection = null;
let isConnected = false;
let connectionAttempted = false;

/**
 * Intenta conectar a Redis. Si falla, marca como no disponible.
 * @returns {Redis|null}
 */
export function getRedisConnection() {
  if (connectionAttempted) {
    return isConnected ? connection : null;
  }
  
  connectionAttempted = true;
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Requerido por BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          log.warn('Redis no disponible después de 3 intentos. Sistema funcionará sin cola.');
          isConnected = false;
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
    });
    
    // Intentar conexión inmediata para verificar disponibilidad
    connection.connect().then(() => {
      isConnected = true;
      log.info('✅ Redis conectado — Sistema de colas activo');
    }).catch((err) => {
      isConnected = false;
      log.warn('⚠️ Redis no disponible — Procesamiento directo activo', { error: err.message });
    });
    
    connection.on('error', (err) => {
      if (isConnected) {  // Solo loggear si estaba conectado
        log.error('Redis error', { error: err.message });
      }
      isConnected = false;
    });
    
    connection.on('reconnecting', () => {
      log.debug('Reconectando a Redis...');
    });
    
    connection.on('ready', () => {
      isConnected = true;
      log.info('Redis ready');
    });
    
    return connection;
    
  } catch (err) {
    log.warn('⚠️ No se pudo inicializar Redis', { error: err.message });
    isConnected = false;
    return null;
  }
}

/**
 * Verifica si Redis está disponible
 */
export function isRedisAvailable() {
  return isConnected;
}

/**
 * Cierra la conexión Redis
 */
export async function closeRedis() {
  if (connection) {
    try {
      await connection.quit();
    } catch (e) {
      // Ignore
    }
    connection = null;
    isConnected = false;
    connectionAttempted = false;
  }
}

/**
 * Inicializa Redis si está configurado
 */
export async function initRedis() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    log.info('📭 REDIS_URL no configurado — Sistema funcionará sin cola');
    return false;
  }
  
  getRedisConnection();
  
  // Esperar un poco para ver si conecta
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return isConnected;
}
