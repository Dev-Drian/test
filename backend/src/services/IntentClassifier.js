/**
 * IntentClassifier - Clasificador de intenciones centralizado
 * 
 * Nivel 3: Clasificación inteligente con LLM y cache
 * - Un solo punto de clasificación para todo el sistema
 * - Cache LRU para respuestas comunes (reduce costos 50-80%)
 * - Modelo barato (gpt-3.5-turbo) para clasificación rápida
 * - Respuesta estructurada con intent, table, confidence
 * 
 * @example
 * const classifier = getIntentClassifier();
 * const result = await classifier.classify(message, context);
 * // { intent: 'create', table: 'citas', confidence: 0.95, data: {...} }
 */

import { getOpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import logger from '../config/logger.js';

const log = logger.child('IntentClassifier');

/**
 * Intenciones soportadas por el clasificador
 */
export const INTENTS = {
  // Acciones sobre datos
  CREATE: 'create',
  QUERY: 'query',
  UPDATE: 'update',
  DELETE: 'delete',
  AVAILABILITY: 'availability',
  ANALYZE: 'analyze',
  
  // Control de flujo
  CONTINUE: 'continue',
  CANCEL: 'cancel',
  CONFIRM: 'confirm',
  DENY: 'deny',
  
  // Conversación
  GREETING: 'greeting',
  THANKS: 'thanks',
  HELP: 'help',
  FAREWELL: 'farewell',
  
  // Otros
  UNKNOWN: 'unknown',
};

/**
 * Simple LRU Cache implementation
 */
class LRUCache {
  constructor(options = {}) {
    this.max = options.max || 500;
    this.ttl = options.ttl || 1000 * 60 * 30; // 30 minutos default
    this.cache = new Map();
  }

  _isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Mover al final (más reciente)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // Si ya existe, eliminar para actualizar posición
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Si está lleno, eliminar el más antiguo (primero)
    if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

/**
 * IntentClassifier - Servicio centralizado de clasificación de intenciones
 */
export class IntentClassifier {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || getOpenAIProvider();
    this.cache = new LRUCache({
      max: options.cacheMax || 500,
      ttl: options.cacheTTL || 1000 * 60 * 30, // 30 min
    });
    this.model = options.model || 'gpt-3.5-turbo';
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
    };
  }

  /**
   * Genera una clave de cache basada en el mensaje y contexto relevante
   * @private
   */
  _getCacheKey(message, context) {
    const normalizedMsg = message.toLowerCase().trim();
    const hasPending = context.pendingCreate ? '1' : '0';
    const tableNames = (context.tables || []).map(t => t.name).sort().join(',');
    return `${normalizedMsg}|${hasPending}|${tableNames}`;
  }

  /**
   * Clasifica la intención del usuario
   * 
   * @param {string} message - Mensaje del usuario
   * @param {Object} context - Contexto de la conversación
   * @param {Object} context.pendingCreate - Flujo pendiente de creación
   * @param {Array} context.tables - Tablas disponibles
   * @param {Array} context.history - Historial de conversación
   * @returns {Promise<Object>} Resultado de clasificación
   */
  async classify(message, context = {}) {
    const startTime = Date.now();
    
    // 1. Normalizar mensaje
    const normalizedMsg = (message || '').trim();
    if (!normalizedMsg) {
      return this._createResult(INTENTS.UNKNOWN, null, 0);
    }

    // 2. Verificar cache
    const cacheKey = this._getCacheKey(normalizedMsg, context);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits++;
      log.debug('Cache HIT', { 
        message: normalizedMsg.substring(0, 30),
        intent: cached.intent,
        cacheSize: this.cache.size,
      });
      return { ...cached, fromCache: true };
    }
    this.stats.misses++;

    // 3. Quick patterns (ultra-rápidos, sin LLM)
    const quickResult = this._quickClassify(normalizedMsg, context);
    if (quickResult) {
      this.cache.set(cacheKey, quickResult);
      log.debug('Quick classify', { 
        message: normalizedMsg.substring(0, 30),
        intent: quickResult.intent,
      });
      return quickResult;
    }

    // 4. LLM Classification
    try {
      const result = await this._llmClassify(normalizedMsg, context);
      this.cache.set(cacheKey, result);
      
      log.info('LLM classify', {
        message: normalizedMsg.substring(0, 50),
        intent: result.intent,
        table: result.table,
        confidence: result.confidence,
        latency: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      log.error('Classification error', { error: error.message });
      
      // Fallback inteligente
      return this._fallbackClassify(normalizedMsg, context);
    }
  }

  /**
   * Clasificación rápida para casos obvios (sin LLM)
   * @private
   */
  _quickClassify(message, context) {
    const msg = message.toLowerCase();
    
    // Si hay flujo pendiente, priorizar respuestas de control
    if (context.pendingCreate) {
      // Afirmaciones claras → continue
      if (/^(ok|sí|si|dale|va|listo|claro|perfecto|adelante|vamos|seguimos|continúa|continua)$/i.test(msg)) {
        return this._createResult(INTENTS.CONTINUE, context.pendingCreate.tableName, 0.95);
      }
      // Cancelaciones claras
      if (/^(no|cancelar|cancela|olvídalo|olvidalo|dejalo|déjalo|ya no)$/i.test(msg)) {
        return this._createResult(INTENTS.CANCEL, null, 0.95);
      }
    }
    
    // Saludos simples (solo si no hay flujo pendiente)
    if (!context.pendingCreate && /^(hola|hi|hey|buenos días|buenas tardes|buenas noches|qué tal)$/i.test(msg)) {
      return this._createResult(INTENTS.GREETING, null, 0.98);
    }
    
    // Despedidas
    if (/^(adiós|adios|chao|bye|hasta luego|nos vemos)$/i.test(msg)) {
      return this._createResult(INTENTS.FAREWELL, null, 0.98);
    }
    
    // Agradecimientos puros (solo palabra)
    if (/^(gracias|thanks|thx)$/i.test(msg)) {
      return this._createResult(INTENTS.THANKS, null, 0.9);
    }
    
    // Ayuda
    if (/^(ayuda|help|\?)$/i.test(msg)) {
      return this._createResult(INTENTS.HELP, null, 0.95);
    }
    
    return null; // No match → usar LLM
  }

  /**
   * Clasificación con LLM
   * @private
   */
  async _llmClassify(message, context) {
    const tables = context.tables || [];
    const tableNames = tables.map(t => t.name).join(', ') || 'ninguna';
    const pendingInfo = context.pendingCreate 
      ? `FLUJO ACTIVO: Registrando "${context.pendingCreate.tableName}" (campos: ${Object.keys(context.pendingCreate.fields || {}).join(', ') || 'ninguno'})`
      : 'Sin flujo activo';
    
    const prompt = `Clasifica la intención del usuario. Responde SOLO JSON válido.

CONTEXTO:
- Tablas disponibles: ${tableNames}
- ${pendingInfo}

MENSAJE: "${message}"

CATEGORÍAS:
- create: Crear/registrar/agendar algo nuevo
- query: Consultar/ver/buscar/listar datos
- update: Modificar/cambiar/cancelar registro existente
- delete: Eliminar/borrar registro
- availability: Verificar disponibilidad/horarios libres
- analyze: Análisis/estadísticas/totales/promedios
- continue: Continuar con flujo activo (ej: "ok", "dale", "sí")
- cancel: Cancelar/abandonar flujo activo
- confirm: Confirmar acción pendiente
- deny: Negar/rechazar
- greeting: Saludo
- thanks: Agradecimiento
- help: Pedir ayuda
- farewell: Despedida
- unknown: No clasificable

REGLAS:
1. Si hay FLUJO ACTIVO y el mensaje indica continuar → "continue"
2. Para agendar/reservar → "create"
3. Para ver/mostrar/listar → "query"
4. Para cancelar UNA CITA → "update" (no "cancel")
5. "cancel" es SOLO para abandonar el flujo de registro

JSON (sin markdown):
{"intent":"...", "table":"..." o null, "confidence":0.0-1.0, "data":{}}`;

    const result = await this.aiProvider.complete({
      messages: [{ role: 'user', content: prompt }],
      model: this.model,
      maxTokens: 100,
      temperature: 0.1,
    });

    try {
      // Limpiar markdown si viene
      let content = (result.content || '').trim();
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const parsed = JSON.parse(content);
      return this._createResult(
        parsed.intent || INTENTS.UNKNOWN,
        parsed.table,
        parsed.confidence || 0.5,
        parsed.data
      );
    } catch (parseError) {
      log.warn('Failed to parse LLM response', { response: result.content });
      return this._createResult(INTENTS.UNKNOWN, null, 0.3);
    }
  }

  /**
   * Clasificación fallback cuando falla el LLM
   * @private
   */
  _fallbackClassify(message, context) {
    const msg = message.toLowerCase();
    
    // Heurísticas básicas
    if (context.pendingCreate) {
      // Asumir que quiere continuar si hay flujo activo
      return this._createResult(INTENTS.CONTINUE, context.pendingCreate.tableName, 0.6);
    }
    
    // Detectar palabras clave básicas
    if (/crear|nuevo|agregar|registrar|agendar|reservar/.test(msg)) {
      return this._createResult(INTENTS.CREATE, null, 0.5);
    }
    if (/ver|mostrar|listar|buscar|consultar|cuáles|cuantos/.test(msg)) {
      return this._createResult(INTENTS.QUERY, null, 0.5);
    }
    if (/disponib|horario|libre|espacio/.test(msg)) {
      return this._createResult(INTENTS.AVAILABILITY, null, 0.5);
    }
    
    return this._createResult(INTENTS.UNKNOWN, null, 0.3);
  }

  /**
   * Crea un resultado estructurado
   * @private
   */
  _createResult(intent, table, confidence, data = {}) {
    return {
      intent,
      table,
      confidence,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Clasifica específicamente para control de flujo
   * Útil cuando ya se detectó un intent pero hay flujo pendiente
   * 
   * @param {string} message - Mensaje del usuario
   * @param {Object} pendingCreate - Datos del flujo pendiente
   * @returns {Promise<string>} Intent de control: continue|cancel|thanks|query|other
   */
  async classifyFlowControl(message, pendingCreate) {
    const cacheKey = `flow:${message.toLowerCase().trim()}:${pendingCreate?.tableName || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    this.stats.misses++;

    // Quick patterns
    const msg = message.toLowerCase().trim();
    if (/^(ok|sí|si|dale|va|listo|claro|perfecto|adelante|vamos|seguimos)$/i.test(msg)) {
      this.cache.set(cacheKey, 'continue');
      return 'continue';
    }
    if (/^(no|cancelar|cancela|olvídalo|dejalo|ya no|mejor no)$/i.test(msg)) {
      this.cache.set(cacheKey, 'cancel');
      return 'cancel';
    }

    // LLM para casos ambiguos
    const tableName = pendingCreate?.tableName || 'registro';
    const collectedFields = Object.keys(pendingCreate?.fields || {});

    const prompt = `Clasificación de control de flujo.

El usuario está registrando "${tableName}" (datos: ${collectedFields.length > 0 ? collectedFields.join(', ') : 'ninguno'}).

Mensaje: "${message}"

¿Qué quiere hacer?
- continue: Continuar con el registro
- cancel: Cancelar/abandonar
- thanks: Agradecer (sin continuar)
- query: Consultar otra cosa
- other: Algo diferente

Responde UNA palabra: continue, cancel, thanks, query, o other`;

    try {
      const result = await this.aiProvider.complete({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        maxTokens: 10,
        temperature: 0.1,
      });

      const intent = (result.content || '').trim().toLowerCase();
      const validIntents = ['continue', 'cancel', 'thanks', 'query', 'other'];
      const finalIntent = validIntents.includes(intent) ? intent : 'continue';
      
      this.cache.set(cacheKey, finalIntent);
      return finalIntent;
    } catch (error) {
      log.error('Flow control classification error', { error: error.message });
      return 'continue'; // Default seguro
    }
  }

  /**
   * Obtiene estadísticas del clasificador
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      total,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) + '%' : '0%',
      cacheSize: this.cache.size,
    };
  }

  /**
   * Limpia la cache
   */
  clearCache() {
    this.cache.clear();
    log.info('Cache cleared');
  }
}

// Singleton
let instance = null;

/**
 * Obtiene la instancia singleton del clasificador
 * @param {Object} options - Opciones de configuración
 * @returns {IntentClassifier}
 */
export function getIntentClassifier(options = {}) {
  if (!instance) {
    instance = new IntentClassifier(options);
  }
  return instance;
}

export default IntentClassifier;
