/**
 * ScoringEngine - Sistema de scoring para selección de handlers
 * 
 * V2 Architecture: Elimina el no-determinismo por orden.
 * Usa fórmula matemática para calcular score de cada handler.
 * 
 * Score = (Wk * keywordScore) + (Wc * contextMatch) + (Ws * stateRelevance) 
 *       + (Wf * fieldMatch) - (Wp * conflictPenalty)
 */

// Pesos por defecto (configurables)
const DEFAULT_WEIGHTS = {
  keyword: 0.30,      // Wk - Coincidencia con palabras clave
  context: 0.25,      // Wc - Match con contexto actual
  state: 0.20,        // Ws - Relevancia del estado
  field: 0.15,        // Wf - Match con campos
  conflict: 0.10,     // Wp - Penalización por conflicto
};

// Thresholds de decisión
const THRESHOLDS = {
  execute: 0.75,      // Score >= 0.75 → ejecutar directamente
  llmAssist: 0.50,    // 0.50 <= score < 0.75 → consultar LLM
  clarify: 0.50,      // Score < 0.50 → pedir aclaración
  ambiguity: 0.10,    // Diferencia < 0.10 entre top 2 → ambiguo
};

/**
 * Palabras clave por tipo de acción
 */
const ACTION_KEYWORDS = {
  create: [
    'crear', 'nuevo', 'agregar', 'añadir', 'registrar', 'agendar',
    'reservar', 'hacer', 'programar', 'alta', 'generar',
  ],
  update: [
    'actualizar', 'cambiar', 'modificar', 'editar', 'cancelar',
    'anular', 'reprogramar', 'corregir',
  ],
  query: [
    'ver', 'mostrar', 'listar', 'buscar', 'consultar', 'cuáles',
    'qué', 'cuántos', 'cuántas', 'dame', 'dime',
  ],
  availability: [
    'disponibilidad', 'disponible', 'libre', 'horarios', 'espacio',
    'pueden', 'hay cita', 'hay espacio',
  ],
  delete: [
    'eliminar', 'borrar', 'quitar', 'remover',
  ],
};

export class ScoringEngine {
  constructor(options = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
    this.thresholds = { ...THRESHOLDS, ...options.thresholds };
  }

  /**
   * Calcula score para un handler dado el contexto
   * @param {ActionHandler} handler 
   * @param {Context} context 
   * @returns {Promise<{ score: number, breakdown: object, canHandle: boolean }>}
   */
  async calculateScore(handler, context) {
    const handlerName = handler.constructor.name.replace('Handler', '').toLowerCase();
    const breakdown = {};
    
    // 1. canHandle base (requerido)
    const canHandle = await handler.canHandle(context);
    if (!canHandle) {
      return { score: 0, breakdown: { reason: 'canHandle returned false' }, canHandle: false };
    }
    
    // 2. Si el handler tiene método confidence(), usarlo directamente
    if (typeof handler.confidence === 'function') {
      const customScore = await handler.confidence(context);
      return { 
        score: customScore, 
        breakdown: { method: 'custom_confidence', value: customScore },
        canHandle: true,
      };
    }
    
    // 3. Calcular score con fórmula estándar
    const message = (context.message || '').toLowerCase();
    const intent = context.intent || {};
    
    // Keyword Score (Wk)
    const keywordScore = this._calculateKeywordScore(message, handlerName);
    breakdown.keyword = keywordScore;
    
    // Context Match (Wc)
    const contextScore = this._calculateContextScore(context, handlerName);
    breakdown.context = contextScore;
    
    // State Relevance (Ws)
    const stateScore = this._calculateStateScore(context, handlerName);
    breakdown.state = stateScore;
    
    // Field Match (Wf)
    const fieldScore = this._calculateFieldScore(context, handlerName);
    breakdown.field = fieldScore;
    
    // Intent Confidence Bonus
    const intentBonus = this._calculateIntentBonus(intent, handlerName);
    breakdown.intentBonus = intentBonus;
    
    // Conflict Penalty (Wp)
    const conflictPenalty = this._calculateConflictPenalty(context, handlerName);
    breakdown.conflict = conflictPenalty;
    
    // Fórmula final
    const score = (
      (this.weights.keyword * keywordScore) +
      (this.weights.context * contextScore) +
      (this.weights.state * stateScore) +
      (this.weights.field * fieldScore) +
      (intentBonus * 0.20) - // Bonus por intent del LLM
      (this.weights.conflict * conflictPenalty)
    );
    
    return {
      score: Math.max(0, Math.min(1, score)), // Clamp 0-1
      breakdown,
      canHandle: true,
    };
  }

  /**
   * Evalúa todos los handlers y devuelve candidatos ordenados
   * @param {ActionHandler[]} handlers 
   * @param {Context} context 
   * @returns {Promise<{ candidates: array, decision: string, needsClarification: boolean }>}
   */
  async evaluateAll(handlers, context) {
    const results = await Promise.all(
      handlers.map(async handler => {
        const { score, breakdown, canHandle } = await this.calculateScore(handler, context);
        return {
          handler,
          name: handler.constructor.name,
          score,
          breakdown,
          canHandle,
        };
      })
    );
    
    // Filtrar los que pueden manejar y ordenar por score
    const candidates = results
      .filter(r => r.canHandle && r.score > 0)
      .sort((a, b) => b.score - a.score);
    
    // Determinar decisión
    let decision = 'fallback';
    let needsClarification = false;
    
    if (candidates.length === 0) {
      decision = 'fallback';
    } else if (candidates[0].score >= this.thresholds.execute) {
      decision = 'execute';
    } else if (candidates[0].score >= this.thresholds.llmAssist) {
      decision = 'llm_assist';
    } else {
      decision = 'clarify';
      needsClarification = true;
    }
    
    // Detectar ambigüedad entre top 2
    if (candidates.length >= 2) {
      const scoreDiff = candidates[0].score - candidates[1].score;
      if (scoreDiff < this.thresholds.ambiguity) {
        decision = 'ambiguous';
        needsClarification = true;
      }
    }
    
    return {
      candidates,
      decision,
      needsClarification,
      topScore: candidates[0]?.score || 0,
      topHandler: candidates[0]?.name || null,
    };
  }

  /**
   * Calcula score de keywords
   * @private
   */
  _calculateKeywordScore(message, handlerType) {
    const keywords = ACTION_KEYWORDS[handlerType] || [];
    if (keywords.length === 0) return 0.5; // Fallback tiene score neutral
    
    let matches = 0;
    for (const kw of keywords) {
      if (message.includes(kw)) matches++;
    }
    
    return Math.min(matches / 2, 1); // Max 1.0 con 2+ matches
  }

  /**
   * Calcula score de contexto
   * @private
   */
  _calculateContextScore(context, handlerType) {
    const hasPendingCreate = !!context.pendingCreate;
    const hasPendingConfirmation = !!context.pendingConfirmation;
    const intentType = context.intent?.actionType;
    
    switch (handlerType) {
      case 'create':
        if (hasPendingCreate) return 0.9; // Muy relevante
        if (intentType === 'create') return 0.7;
        return 0.3;
        
      case 'update':
        if (hasPendingConfirmation) return 0.9;
        if (intentType === 'update' || intentType === 'delete') return 0.7;
        return 0.2;
        
      case 'query':
        if (intentType === 'query' || intentType === 'search') return 0.8;
        if (hasPendingCreate) return 0.2; // Menos relevante si hay create pendiente
        return 0.5;
        
      case 'availability':
        if (intentType === 'availability') return 0.9;
        return 0.3;
        
      case 'fallback':
        return 0.3; // Score base bajo
        
      default:
        return 0.5;
    }
  }

  /**
   * Calcula relevancia del estado
   * @private
   */
  _calculateStateScore(context, handlerType) {
    const collectedFieldsCount = Object.keys(context.collectedFields || {}).length;
    const missingFieldsCount = (context.missingFields || []).length;
    
    switch (handlerType) {
      case 'create':
        // Si hay campos recolectados, create es más relevante
        if (collectedFieldsCount > 0 && missingFieldsCount > 0) return 0.8;
        if (context.pendingCreate) return 0.7;
        return 0.4;
        
      case 'update':
        if (context.pendingConfirmation) return 0.9;
        return 0.4;
        
      case 'query':
        // Query es más relevante si no hay estado pendiente
        if (!context.pendingCreate && !context.pendingConfirmation) return 0.7;
        return 0.3;
        
      default:
        return 0.5;
    }
  }

  /**
   * Calcula match con campos mencionados
   * @private
   */
  _calculateFieldScore(context, handlerType) {
    const message = (context.message || '').toLowerCase();
    const tables = context.tables || [];
    
    // Buscar menciones de campos o entidades
    let fieldMentions = 0;
    for (const table of tables) {
      if (message.includes(table.name?.toLowerCase())) {
        fieldMentions++;
      }
    }
    
    if (handlerType === 'create' || handlerType === 'update') {
      return Math.min(fieldMentions * 0.3, 0.6);
    }
    
    return Math.min(fieldMentions * 0.2, 0.4);
  }

  /**
   * Bonus basado en intent del LLM
   * @private
   */
  _calculateIntentBonus(intent, handlerType) {
    if (!intent?.actionType) return 0;
    
    const intentConfidence = (intent.confidence || 0) / 100;
    
    // Mapeo de intent a handler
    const intentToHandler = {
      'create': 'create',
      'update': 'update',
      'delete': 'update',
      'query': 'query',
      'search': 'query',
      'availability': 'availability',
    };
    
    const expectedHandler = intentToHandler[intent.actionType];
    if (expectedHandler === handlerType) {
      return intentConfidence; // Bonus completo si coincide
    }
    
    return 0;
  }

  /**
   * Calcula penalización por conflicto
   * @private
   */
  _calculateConflictPenalty(context, handlerType) {
    // Si hay pendingCreate pero el intent es query con alta confianza
    if (context.pendingCreate && 
        context.intent?.actionType === 'query' && 
        context.intent?.confidence >= 70) {
      if (handlerType === 'create') return 0.3; // Penalizar create
    }
    
    // Si hay pendingCreate pero el mensaje parece pregunta
    const message = (context.message || '').toLowerCase();
    const isQuestion = message.startsWith('¿') || 
                       message.includes('?') ||
                       message.startsWith('qué') ||
                       message.startsWith('cuál') ||
                       message.startsWith('cuánto');
    
    if (context.pendingCreate && isQuestion && handlerType === 'create') {
      return 0.2;
    }
    
    return 0;
  }
}

export default ScoringEngine;
