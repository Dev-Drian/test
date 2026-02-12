/**
 * TextPreprocessor - Orquestador de preprocesamiento de texto
 * 
 * Pipeline de procesadores que limpian, corrigen y normalizan
 * el texto del usuario antes de detectar la intención.
 * 
 * Patrón: Pipeline + Chain of Responsibility
 */

import { SpellingCorrector } from './processors/SpellingCorrector.js';
import { TextNormalizer } from './processors/TextNormalizer.js';
import { AbbreviationExpander } from './processors/AbbreviationExpander.js';
import { EmojiCleaner } from './processors/EmojiCleaner.js';

export class TextPreprocessor {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      spellCheck: true,
      expandAbbreviations: true,
      cleanEmojis: true,
      normalizeText: true,
      ...config,
    };
    
    this.processors = this._buildPipeline();
  }
  
  /**
   * Construye el pipeline de procesadores según configuración
   * @private
   */
  _buildPipeline() {
    const pipeline = [];
    
    // Orden importa: primero limpiar, luego expandir, luego corregir
    if (this.config.cleanEmojis) {
      pipeline.push(new EmojiCleaner());
    }
    
    if (this.config.expandAbbreviations) {
      pipeline.push(new AbbreviationExpander());
    }
    
    if (this.config.spellCheck) {
      pipeline.push(new SpellingCorrector());
    }
    
    if (this.config.normalizeText) {
      pipeline.push(new TextNormalizer());
    }
    
    return pipeline;
  }
  
  /**
   * Procesa el texto a través del pipeline completo
   * @param {string} text - Texto original del usuario
   * @param {object} options - Opciones adicionales (contexto, etc.)
   * @returns {Promise<PreprocessorResult>}
   */
  async process(text, options = {}) {
    if (!this.config.enabled || !text) {
      return {
        original: text,
        processed: text,
        changes: [],
        confidence: 1.0,
        skipped: !this.config.enabled,
      };
    }
    
    const result = {
      original: text,
      processed: text,
      changes: [],
      confidence: 1.0,
      processingTime: 0,
    };
    
    const startTime = Date.now();
    
    try {
      for (const processor of this.processors) {
        const output = await processor.process(result.processed, options);
        
        // Actualizar texto procesado
        if (output.text !== result.processed) {
          result.processed = output.text;
        }
        
        // Acumular cambios
        if (output.changes?.length > 0) {
          result.changes.push(...output.changes);
        }
        
        // Multiplicar confianza
        if (typeof output.confidence === 'number') {
          result.confidence *= output.confidence;
        }
      }
      
      result.processingTime = Date.now() - startTime;
      
      // Log si hubo cambios significativos
      if (result.changes.length > 0 && options.debug) {
        console.log('[TextPreprocessor] Cambios aplicados:', {
          original: result.original,
          processed: result.processed,
          changes: result.changes,
        });
      }
      
    } catch (error) {
      console.error('[TextPreprocessor] Error:', error.message);
      // En caso de error, devolver texto original
      result.processed = text;
      result.error = error.message;
    }
    
    return result;
  }
  
  /**
   * Agrega un procesador personalizado al pipeline
   * @param {IProcessor} processor - Procesador que implementa process()
   * @param {number} position - Posición en el pipeline (opcional)
   */
  addProcessor(processor, position = null) {
    if (typeof processor.process !== 'function') {
      throw new Error('Processor must implement process() method');
    }
    
    if (position !== null && position >= 0) {
      this.processors.splice(position, 0, processor);
    } else {
      this.processors.push(processor);
    }
  }
  
  /**
   * Remueve un procesador del pipeline
   * @param {string} name - Nombre del procesador
   */
  removeProcessor(name) {
    this.processors = this.processors.filter(
      p => p.constructor.name !== name
    );
  }
  
  /**
   * Obtiene estadísticas del preprocesamiento
   */
  getStats() {
    return {
      processorsCount: this.processors.length,
      processors: this.processors.map(p => p.constructor.name),
      config: this.config,
    };
  }
}

/**
 * @typedef {Object} PreprocessorResult
 * @property {string} original - Texto original
 * @property {string} processed - Texto procesado
 * @property {Array<Change>} changes - Lista de cambios aplicados
 * @property {number} confidence - Confianza del procesamiento (0-1)
 * @property {number} processingTime - Tiempo en ms
 * @property {string} [error] - Error si hubo
 */

/**
 * @typedef {Object} Change
 * @property {string} type - Tipo de cambio (spelling, abbreviation, etc.)
 * @property {string} original - Texto original
 * @property {string} replacement - Texto reemplazado
 * @property {number} position - Posición en el texto
 */

export default TextPreprocessor;
