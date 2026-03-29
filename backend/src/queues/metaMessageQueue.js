/**
 * Cola de mensajes Meta (WhatsApp, Messenger, Instagram)
 * 
 * Sistema de procesamiento con BullMQ + Redis.
 * Si Redis no está disponible, exporta funciones que procesan directamente.
 */
import { Queue, Worker } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from './connection.js';
import { processMetaMessage } from './metaMessageProcessor.js';
import logger from '../config/logger.js';

const log = logger.child('MetaQueue');

const QUEUE_NAME = 'meta-messages';

let queue = null;
let worker = null;

/**
 * Obtiene o crea la cola de mensajes
 */
export function getMetaMessageQueue() {
  if (!isRedisAvailable()) return null;
  if (queue) return queue;
  
  const connection = getRedisConnection();
  if (!connection) return null;
  
  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: parseInt(process.env.QUEUE_MAX_RETRIES) || 3,
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  
  queue.on('error', (err) => {
    log.error('Queue error', { error: err.message });
  });
  
  return queue;
}

/**
 * Inicia el worker que procesa mensajes de la cola
 */
export function startMetaMessageWorker() {
  if (!isRedisAvailable()) {
    log.info('📭 Worker no iniciado — Redis no disponible');
    return null;
  }
  
  if (worker) return worker;
  
  const connection = getRedisConnection();
  if (!connection) return null;
  
  const concurrency = parseInt(process.env.QUEUE_CONCURRENCY) || 5;
  
  worker = new Worker(QUEUE_NAME, processMetaMessage, {
    connection,
    concurrency,
    limiter: {
      max: 10,        // Máximo 10 jobs
      duration: 1000, // por segundo
    },
  });
  
  worker.on('completed', (job) => {
    log.debug('✅ Job completado', { 
      jobId: job.id, 
      platform: job.data.platform,
      senderId: job.data.senderId?.slice(-4),
    });
  });
  
  worker.on('failed', (job, err) => {
    log.error('❌ Job fallido', { 
      jobId: job?.id, 
      platform: job?.data?.platform,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });
  
  worker.on('error', (err) => {
    log.error('Worker error', { error: err.message });
  });
  
  log.info(`🚀 Worker iniciado — Concurrencia: ${concurrency}`);
  
  return worker;
}

/**
 * Encola un mensaje para procesamiento asíncrono
 * Si Redis no está disponible, procesa directamente (fallback)
 * 
 * @param {object} data - Datos del mensaje
 * @returns {Promise<{queued: boolean, result?: any}>}
 */
export async function enqueueMetaMessage(data) {
  // Si Redis no está disponible, procesar directamente
  if (!isRedisAvailable()) {
    log.debug('Procesando mensaje directamente (sin cola)', { platform: data.platform });
    try {
      const result = await processMetaMessage({ data, id: `direct-${Date.now()}` });
      return { queued: false, result };
    } catch (err) {
      log.error('Error procesando mensaje directo', { error: err.message });
      throw err;
    }
  }
  
  // Encolar en Redis
  const q = getMetaMessageQueue();
  if (!q) {
    // Fallback si la cola no está lista
    const result = await processMetaMessage({ data, id: `fallback-${Date.now()}` });
    return { queued: false, result };
  }
  
  const jobId = `${data.platform}:${data.senderId}:${Date.now()}`;
  
  const job = await q.add('process-message', data, {
    jobId,
    priority: data.priority || 0,
  });
  
  log.debug('📥 Mensaje encolado', { 
    jobId: job.id, 
    platform: data.platform,
    queueSize: await q.count(),
  });
  
  return { queued: true, jobId: job.id };
}

/**
 * Obtiene estadísticas de la cola
 */
export async function getQueueStats() {
  if (!isRedisAvailable()) {
    return { available: false, message: 'Redis no disponible' };
  }
  
  const q = getMetaMessageQueue();
  if (!q) {
    return { available: false, message: 'Cola no inicializada' };
  }
  
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ]);
  
  return {
    available: true,
    waiting,
    active,
    completed,
    failed,
    total: waiting + active,
  };
}

/**
 * Cierra la cola y el worker
 */
export async function closeMetaMessageQueue() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
  log.info('Cola de mensajes cerrada');
}
