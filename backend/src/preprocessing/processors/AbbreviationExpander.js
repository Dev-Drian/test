/**
 * AbbreviationExpander - Expansor de abreviaciones
 * 
 * Convierte abreviaciones comunes del español informal
 * a su forma completa para mejor procesamiento.
 */

import ABBREVIATIONS from '../dictionaries/abbreviations.json' assert { type: 'json' };

export class AbbreviationExpander {
  constructor(config = {}) {
    this.config = {
      preserveCase: true,
      expandNumbers: true, // "x2" → "por 2"
      ...config,
    };
    
    // Cargar diccionario
    this.abbreviations = new Map(Object.entries(ABBREVIATIONS.common || {}));
    this.contextual = ABBREVIATIONS.contextual || {};
    
    // Patrones especiales (con regex)
    this.patterns = this._buildPatterns(ABBREVIATIONS.patterns || []);
  }
  
  /**
   * Construye patrones de expansión
   * @private
   */
  _buildPatterns(patterns) {
    return patterns.map(p => ({
      regex: new RegExp(p.pattern, p.flags || 'gi'),
      replacement: p.replacement,
      description: p.description,
    }));
  }
  
  /**
   * Procesa el texto y expande abreviaciones
   * @param {string} text - Texto a procesar
   * @param {object} options - Opciones adicionales
   * @returns {Promise<ProcessorResult>}
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { text: text || '', changes: [], confidence: 1.0 };
    }
    
    const changes = [];
    let processed = text;
    
    // 1. Expandir abreviaciones comunes (palabra por palabra)
    const commonResult = this._expandCommon(processed);
    processed = commonResult.text;
    changes.push(...commonResult.changes);
    
    // 2. Aplicar patrones de expansión
    const patternResult = this._applyPatterns(processed);
    processed = patternResult.text;
    changes.push(...patternResult.changes);
    
    // 3. Expandir números (x2 → por 2)
    if (this.config.expandNumbers) {
      const numberResult = this._expandNumbers(processed);
      processed = numberResult.text;
      changes.push(...numberResult.changes);
    }
    
    return {
      text: processed,
      changes,
      confidence: 1.0, // Las expansiones son determinísticas
    };
  }
  
  /**
   * Expande abreviaciones comunes
   * @private
   */
  _expandCommon(text) {
    const changes = [];
    const words = text.split(/(\s+)/);
    
    const expandedWords = words.map((word, index) => {
      if (/^\s+$/.test(word)) return word;
      
      // Limpiar puntuación para buscar
      const cleanWord = word.replace(/[.,!?¿¡:;]+$/, '');
      const punctuation = word.slice(cleanWord.length);
      const lower = cleanWord.toLowerCase();
      
      const expansion = this.abbreviations.get(lower);
      
      if (expansion) {
        const expanded = this.config.preserveCase
          ? this._preserveCase(cleanWord, expansion)
          : expansion;
        
        changes.push({
          type: 'abbreviation',
          original: cleanWord,
          replacement: expanded,
          position: words.slice(0, index).join('').length,
        });
        
        return expanded + punctuation;
      }
      
      return word;
    });
    
    return {
      text: expandedWords.join(''),
      changes,
    };
  }
  
  /**
   * Aplica patrones de expansión (regex)
   * @private
   */
  _applyPatterns(text) {
    const changes = [];
    let result = text;
    
    for (const { regex, replacement, description } of this.patterns) {
      const matches = [...result.matchAll(new RegExp(regex.source, 'gi'))];
      
      for (const match of matches) {
        changes.push({
          type: 'abbreviation_pattern',
          original: match[0],
          replacement: match[0].replace(regex, replacement),
          position: match.index,
          description,
        });
      }
      
      result = result.replace(regex, replacement);
    }
    
    return {
      text: result,
      changes,
    };
  }
  
  /**
   * Expande patrones numéricos (x2, +o-, etc.)
   * @private
   */
  _expandNumbers(text) {
    const changes = [];
    let result = text;
    
    // x2, x3 → por 2, por 3
    result = result.replace(/\bx(\d+)\b/gi, (match, num) => {
      changes.push({
        type: 'number_expansion',
        original: match,
        replacement: `por ${num}`,
      });
      return `por ${num}`;
    });
    
    // +o- → más o menos
    result = result.replace(/\+o-|\+-/gi, (match) => {
      changes.push({
        type: 'symbol_expansion',
        original: match,
        replacement: 'más o menos',
      });
      return 'más o menos';
    });
    
    // 100% → cien por ciento
    result = result.replace(/(\d+)%/g, (match, num) => {
      changes.push({
        type: 'percent_expansion',
        original: match,
        replacement: `${num} por ciento`,
      });
      return `${num} por ciento`;
    });
    
    return {
      text: result,
      changes,
    };
  }
  
  /**
   * Preserva el case original
   * @private
   */
  _preserveCase(original, expansion) {
    if (!original || !expansion) return expansion;
    
    if (original === original.toUpperCase()) {
      return expansion.toUpperCase();
    }
    
    if (original[0] === original[0].toUpperCase()) {
      return expansion.charAt(0).toUpperCase() + expansion.slice(1);
    }
    
    return expansion;
  }
  
  /**
   * Agrega una abreviación al diccionario en runtime
   * @param {string} abbr - Abreviación
   * @param {string} expansion - Expansión
   */
  addAbbreviation(abbr, expansion) {
    this.abbreviations.set(abbr.toLowerCase(), expansion);
  }
}

export default AbbreviationExpander;
