/**
 * SpellingCorrector - Corrector ortográfico para español
 * 
 * Usa nspell (Hunspell para Node.js) con diccionario español
 * + diccionario personalizado para jerga/abreviaciones específicas del dominio.
 * 
 * Dependencias:
 *   npm install nspell dictionary-es
 */

import nspell from 'nspell';
import dictionaryEs from 'dictionary-es';
import { promisify } from 'util';
import CORRECTIONS from '../dictionaries/corrections.json' assert { type: 'json' };

// Cargar diccionario de forma async
const loadDictionary = promisify(dictionaryEs);

export class SpellingCorrector {
  constructor(config = {}) {
    this.config = {
      maxSuggestions: 3,      // Máximo de sugerencias por palabra
      minWordLength: 2,       // Palabras más cortas no se corrigen
      preserveCase: true,
      useHunspell: true,      // Usar nspell (Hunspell)
      useFallback: true,      // Usar diccionario manual como fallback
      ...config,
    };
    
    // Spell checker (se inicializa async)
    this.spell = null;
    this.initialized = false;
    this.initPromise = this._initialize();
    
    // Diccionario de correcciones directas (fallback + dominio específico)
    this.corrections = new Map(Object.entries(CORRECTIONS.direct || {}));
    
    // Palabras conocidas (para no corregir)
    this.knownWords = new Set(CORRECTIONS.knownWords || []);
    
    // Patrones de corrección (regex)
    this.patterns = this._buildPatterns(CORRECTIONS.patterns || []);
  }
  
  /**
   * Inicializa el corrector con el diccionario español
   * @private
   */
  async _initialize() {
    if (this.initialized) return;
    
    try {
      const { aff, dic } = await loadDictionary();
      this.spell = nspell(aff, dic);
      
      // Agregar palabras personalizadas al diccionario
      for (const word of this.knownWords) {
        this.spell.add(word);
      }
      
      // Agregar palabras de dominio (nombres de negocio, etc.)
      const domainWords = CORRECTIONS.domainWords || [];
      for (const word of domainWords) {
        this.spell.add(word);
      }
      
      this.initialized = true;
      console.log('[SpellingCorrector] Diccionario español cargado correctamente');
      
    } catch (error) {
      console.warn('[SpellingCorrector] No se pudo cargar nspell, usando fallback:', error.message);
      this.config.useHunspell = false;
    }
  }
  
  /**
   * Asegura que el corrector esté inicializado
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }
  
  /**
   * Construye patrones de corrección
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
   * Procesa el texto y corrige errores ortográficos
   * @param {string} text - Texto a corregir
   * @param {object} options - Opciones adicionales
   * @returns {Promise<ProcessorResult>}
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { text: text || '', changes: [], confidence: 1.0 };
    }
    
    // Asegurar inicialización
    await this.ensureInitialized();
    
    const changes = [];
    let processed = text;
    
    // 1. Aplicar correcciones directas (diccionario personalizado - prioridad alta)
    const directResult = this._applyDirectCorrections(processed);
    processed = directResult.text;
    changes.push(...directResult.changes);
    
    // 2. Aplicar patrones de corrección (regex)
    const patternResult = this._applyPatterns(processed);
    processed = patternResult.text;
    changes.push(...patternResult.changes);
    
    // 3. Corrección con Hunspell (nspell) - para palabras no detectadas
    if (this.config.useHunspell && this.spell) {
      const hunspellResult = this._applyHunspell(processed);
      processed = hunspellResult.text;
      changes.push(...hunspellResult.changes);
    }
    
    // 4. Fallback: Levenshtein para palabras que aún no se corrigieron
    if (this.config.useFallback && options.deepCorrection !== false) {
      const fallbackResult = this._applyLevenshteinFallback(processed);
      processed = fallbackResult.text;
      changes.push(...fallbackResult.changes);
    }
    
    // Calcular confianza basada en cantidad de correcciones
    const confidence = this._calculateConfidence(changes.length, text.length);
    
    return {
      text: processed,
      changes,
      confidence,
    };
  }
  
  /**
   * Aplica corrección usando nspell (Hunspell)
   * @private
   */
  _applyHunspell(text) {
    const changes = [];
    const words = text.split(/(\s+)/);
    
    const correctedWords = words.map((word, index) => {
      if (/^\s+$/.test(word)) return word; // Mantener espacios
      if (word.length < this.config.minWordLength) return word;
      
      // Limpiar puntuación
      const cleanWord = word.replace(/^[.,!?¿¡:;]+|[.,!?¿¡:;]+$/g, '');
      const prefix = word.slice(0, word.indexOf(cleanWord) || 0);
      const suffix = word.slice(word.indexOf(cleanWord) + cleanWord.length);
      
      if (!cleanWord) return word;
      
      // Verificar si está en palabras conocidas (no corregir)
      if (this.knownWords.has(cleanWord.toLowerCase())) return word;
      
      // Verificar si ya está correcta
      if (this.spell.correct(cleanWord)) return word;
      
      // Obtener sugerencias
      const suggestions = this.spell.suggest(cleanWord);
      
      if (suggestions.length > 0) {
        const bestSuggestion = suggestions[0];
        const corrected = this.config.preserveCase
          ? this._preserveCase(cleanWord, bestSuggestion)
          : bestSuggestion;
        
        changes.push({
          type: 'spelling_hunspell',
          original: cleanWord,
          replacement: corrected,
          position: words.slice(0, index).join('').length,
          suggestions: suggestions.slice(0, this.config.maxSuggestions),
        });
        
        return prefix + corrected + suffix;
      }
      
      return word;
    });
    
    return {
      text: correctedWords.join(''),
      changes,
    };
  }
  
  /**
   * Aplica correcciones directas del diccionario personalizado
   * @private
   */
  _applyDirectCorrections(text) {
    const changes = [];
    let result = text;
    
    // Procesar palabra por palabra
    const words = result.split(/(\s+)/);
    const correctedWords = words.map((word, index) => {
      if (/^\s+$/.test(word)) return word; // Mantener espacios
      
      // Limpiar puntuación para buscar
      const cleanWord = word.replace(/^[.,!?¿¡:;]+|[.,!?¿¡:;]+$/g, '');
      const prefix = word.slice(0, word.indexOf(cleanWord) || 0);
      const suffix = word.slice(word.indexOf(cleanWord) + cleanWord.length);
      
      const lower = cleanWord.toLowerCase();
      const correction = this.corrections.get(lower);
      
      if (correction) {
        const corrected = this.config.preserveCase 
          ? this._preserveCase(cleanWord, correction)
          : correction;
        
        changes.push({
          type: 'spelling_direct',
          original: cleanWord,
          replacement: corrected,
          position: words.slice(0, index).join('').length,
        });
        
        return prefix + corrected + suffix;
      }
      
      return word;
    });
    
    return {
      text: correctedWords.join(''),
      changes,
    };
  }
  
  /**
   * Aplica patrones de corrección (regex)
   * @private
   */
  _applyPatterns(text) {
    const changes = [];
    let result = text;
    
    for (const { regex, replacement, description } of this.patterns) {
      const matches = [...result.matchAll(new RegExp(regex.source, 'gi'))];
      
      for (const match of matches) {
        changes.push({
          type: 'spelling_pattern',
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
   * Fallback: corrige palabras usando distancia de Levenshtein
   * Solo para palabras que no fueron corregidas por Hunspell
   * @private
   */
  _applyLevenshteinFallback(text) {
    const changes = [];
    const words = text.split(/(\s+)/);
    const maxDistance = 2;
    
    const correctedWords = words.map((word, index) => {
      if (/^\s+$/.test(word)) return word;
      if (word.length < this.config.minWordLength) return word;
      if (this.knownWords.has(word.toLowerCase())) return word;
      
      // Si Hunspell ya lo validó como correcto, no usar fallback
      if (this.spell?.correct(word)) return word;
      
      // Buscar corrección cercana en diccionario personalizado
      const correction = this._findClosestWord(word, maxDistance);
      
      if (correction && correction !== word.toLowerCase()) {
        const corrected = this.config.preserveCase
          ? this._preserveCase(word, correction)
          : correction;
        
        changes.push({
          type: 'spelling_levenshtein',
          original: word,
          replacement: corrected,
          position: words.slice(0, index).join('').length,
        });
        
        return corrected;
      }
      
      return word;
    });
    
    return {
      text: correctedWords.join(''),
      changes,
    };
  }
  
  /**
   * Encuentra la palabra más cercana en el diccionario
   * @private
   */
  _findClosestWord(word, maxDistance = 2) {
    const lower = word.toLowerCase();
    let bestMatch = null;
    let bestDistance = maxDistance + 1;
    
    // Buscar en palabras conocidas
    for (const known of this.knownWords) {
      const distance = this._levenshtein(lower, known);
      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        bestMatch = known;
      }
    }
    
    // Buscar en correcciones
    for (const [error, correction] of this.corrections) {
      const distance = this._levenshtein(lower, error);
      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        bestMatch = correction;
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calcula distancia de Levenshtein entre dos strings
   * @private
   */
  _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  /**
   * Preserva el case original al aplicar corrección
   * @private
   */
  _preserveCase(original, correction) {
    if (!original || !correction) return correction;
    
    // Todo mayúsculas
    if (original === original.toUpperCase()) {
      return correction.toUpperCase();
    }
    
    // Primera letra mayúscula
    if (original[0] === original[0].toUpperCase()) {
      return correction.charAt(0).toUpperCase() + correction.slice(1);
    }
    
    return correction;
  }
  
  /**
   * Calcula confianza del procesamiento
   * @private
   */
  _calculateConfidence(changesCount, textLength) {
    if (changesCount === 0) return 1.0;
    
    // Más correcciones = menos confianza (el texto original era muy malo)
    const ratio = changesCount / (textLength / 10);
    return Math.max(0.5, 1 - (ratio * 0.1));
  }
  
  /**
   * Agrega una corrección al diccionario en runtime
   * @param {string} error - Palabra incorrecta
   * @param {string} correction - Corrección
   */
  addCorrection(error, correction) {
    this.corrections.set(error.toLowerCase(), correction.toLowerCase());
  }
  
  /**
   * Agrega una palabra conocida (no corregir)
   * @param {string} word - Palabra a agregar
   */
  addKnownWord(word) {
    this.knownWords.add(word.toLowerCase());
    // También agregarla al diccionario Hunspell
    if (this.spell) {
      this.spell.add(word.toLowerCase());
    }
  }
  
  /**
   * Verifica si una palabra es correcta
   * @param {string} word - Palabra a verificar
   * @returns {boolean}
   */
  isCorrect(word) {
    if (this.knownWords.has(word.toLowerCase())) return true;
    if (this.spell) return this.spell.correct(word);
    return false;
  }
  
  /**
   * Obtiene sugerencias para una palabra
   * @param {string} word - Palabra a buscar sugerencias
   * @returns {string[]}
   */
  getSuggestions(word) {
    if (!this.spell) return [];
    return this.spell.suggest(word).slice(0, this.config.maxSuggestions);
  }
}

export default SpellingCorrector;
