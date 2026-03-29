/**
 * Módulo de colas - Exporta todo lo necesario
 */
export { 
  getRedisConnection, 
  isRedisAvailable, 
  closeRedis,
  initRedis,
} from './connection.js';

export { 
  getMetaMessageQueue,
  startMetaMessageWorker,
  enqueueMetaMessage,
  getQueueStats,
  closeMetaMessageQueue,
} from './metaMessageQueue.js';

export { processMetaMessage } from './metaMessageProcessor.js';
