/**
 * TextNormalizer - Normalizador de texto
 * 
 * Normaliza el texto para procesamiento uniforme:
 * - Espacios múltiples
 * - Mayúsculas/minúsculas
 * - Puntuación
 * - Caracteres especiales
 */

export class TextNormalizer {
  constructor(config = {}) {
    this.config = {
      trimSpaces: true,
      normalizeSpaces: true,
      normalizeCase: true, // Mantener solo primera mayúscula de oraciones
      normalizePunctuation: true,
      removeExtraChars: true,
      ...config,
    };
  }
  
  /**
   * Procesa el texto y lo normaliza
   * @param {string} text - Texto a normalizar
   * @param {object} options - Opciones adicionales
   * @returns {Promise<ProcessorResult>}
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { text: text || '', changes: [], confidence: 1.0 };
    }
    
    const changes = [];
    let processed = text;
    const original = text;
    
    // 1. Trim espacios al inicio y final
    if (this.config.trimSpaces) {
      const trimmed = processed.trim();
      if (trimmed !== processed) {
        changes.push({
          type: 'trim',
          original: processed,
          replacement: trimmed,
        });
        processed = trimmed;
      }
    }
    
    // 2. Normalizar espacios múltiples
    if (this.config.normalizeSpaces) {
      const normalized = processed.replace(/\s+/g, ' ');
      if (normalized !== processed) {
        changes.push({
          type: 'spaces',
          original: processed,
          replacement: normalized,
        });
        processed = normalized;
      }
    }
    
    // 3. Normalizar mayúsculas
    if (this.config.normalizeCase) {
      const caseNormalized = this._normalizeCase(processed);
      if (caseNormalized !== processed) {
        changes.push({
          type: 'case',
          original: processed,
          replacement: caseNormalized,
        });
        processed = caseNormalized;
      }
    }
    
    // 4. Normalizar puntuación
    if (this.config.normalizePunctuation) {
      const punctNormalized = this._normalizePunctuation(processed);
      if (punctNormalized !== processed) {
        changes.push({
          type: 'punctuation',
          original: processed,
          replacement: punctNormalized,
        });
        processed = punctNormalized;
      }
    }
    
    // 5. Remover caracteres extra/basura
    if (this.config.removeExtraChars) {
      const cleaned = this._removeExtraChars(processed);
      if (cleaned !== processed) {
        changes.push({
          type: 'extra_chars',
          original: processed,
          replacement: cleaned,
        });
        processed = cleaned;
      }
    }
    
    return {
      text: processed,
      changes: changes.length > 0 ? [{
        type: 'normalization',
        original,
        replacement: processed,
        details: changes,
      }] : [],
      confidence: 1.0,
    };
  }
  
  /**
   * Normaliza mayúsculas/minúsculas
   * - TODO MAYÚSCULAS → Primera mayúscula
   * - Mantiene nombres propios
   * @private
   */
  _normalizeCase(text) {
    // Si está todo en mayúsculas, convertir a normal
    if (text === text.toUpperCase() && text.length > 3) {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    // No modificar si tiene mezcla razonable
    return text;
  }
  
  /**
   * Normaliza puntuación
   * @private
   */
  _normalizePunctuation(text) {
    let result = text;
    
    // Múltiples signos de puntuación → uno solo
    result = result.replace(/([.!?])\1+/g, '$1');
    
    // Espacio antes de puntuación → sin espacio
    result = result.replace(/\s+([.,!?:;])/g, '$1');
    
    // Sin espacio después de puntuación → con espacio
    result = result.replace(/([.,!?:;])(?=[a-záéíóúñA-ZÁÉÍÓÚÑ])/g, '$1 ');
    
    // Múltiples signos de interrogación/exclamación
    result = result.replace(/[¿]+/g, '¿');
    result = result.replace(/[?]+/g, '?');
    result = result.replace(/[¡]+/g, '¡');
    result = result.replace(/[!]+/g, '!');
    
    return result;
  }
  
  /**
   * Remueve caracteres innecesarios
   * @private
   */
  _removeExtraChars(text) {
    let result = text;
    
    // Caracteres de control
    result = result.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Caracteres repetidos (más de 2 veces)
    result = result.replace(/(.)\1{2,}/g, '$1$1');
    
    // Espacios antes/después de paréntesis
    result = result.replace(/\(\s+/g, '(');
    result = result.replace(/\s+\)/g, ')');
    
    return result;
  }
}

export default TextNormalizer;
