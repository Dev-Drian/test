/**
 * EmojiCleaner - Limpiador de emojis
 * 
 * Procesa emojis en el texto:
 * - Puede removerlos completamente
 * - O convertirlos a texto descriptivo
 * - Mantiene emojis "útiles" configurables
 */

export class EmojiCleaner {
  constructor(config = {}) {
    this.config = {
      mode: 'smart', // 'remove', 'keep', 'smart', 'convert'
      keepUseful: true, // Mantener emojis con significado
      maxEmojis: 3, // Máximo de emojis a mantener
      ...config,
    };
    
    // Emojis con significado útil para el contexto
    this.usefulEmojis = new Map([
      ['👍', 'ok'],
      ['👎', 'no'],
      ['✅', 'sí'],
      ['❌', 'no'],
      ['📅', 'fecha'],
      ['🕐', 'hora'],
      ['📱', 'teléfono'],
      ['📧', 'email'],
      ['💰', 'dinero'],
      ['🏠', 'casa'],
      ['🚗', 'carro'],
      ['🐕', 'perro'],
      ['🐈', 'gato'],
      ['👤', 'persona'],
      ['❤️', 'me gusta'],
      ['😊', 'feliz'],
      ['😢', 'triste'],
      ['😠', 'enojado'],
      ['🙏', 'por favor'],
      ['👋', 'hola'],
    ]);
    
    // Regex para detectar emojis
    this.emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;
  }
  
  /**
   * Procesa el texto y maneja emojis
   * @param {string} text - Texto a procesar
   * @param {object} options - Opciones adicionales
   * @returns {Promise<ProcessorResult>}
   */
  async process(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { text: text || '', changes: [], confidence: 1.0 };
    }
    
    const mode = options.emojiMode || this.config.mode;
    
    switch (mode) {
      case 'remove':
        return this._removeAll(text);
      case 'keep':
        return { text, changes: [], confidence: 1.0 };
      case 'convert':
        return this._convertToText(text);
      case 'smart':
      default:
        return this._smartClean(text);
    }
  }
  
  /**
   * Remueve todos los emojis
   * @private
   */
  _removeAll(text) {
    const emojis = text.match(this.emojiRegex) || [];
    const cleaned = text.replace(this.emojiRegex, '').replace(/\s+/g, ' ').trim();
    
    return {
      text: cleaned,
      changes: emojis.length > 0 ? [{
        type: 'emoji_removed',
        original: emojis.join(''),
        replacement: '',
        count: emojis.length,
      }] : [],
      confidence: 1.0,
    };
  }
  
  /**
   * Convierte emojis a texto descriptivo
   * @private
   */
  _convertToText(text) {
    const changes = [];
    let result = text;
    
    for (const [emoji, meaning] of this.usefulEmojis) {
      if (result.includes(emoji)) {
        changes.push({
          type: 'emoji_converted',
          original: emoji,
          replacement: meaning,
        });
        result = result.replace(new RegExp(emoji, 'g'), ` ${meaning} `);
      }
    }
    
    // Remover emojis restantes
    const remaining = result.match(this.emojiRegex) || [];
    result = result.replace(this.emojiRegex, '');
    
    if (remaining.length > 0) {
      changes.push({
        type: 'emoji_removed',
        original: remaining.join(''),
        replacement: '',
      });
    }
    
    // Normalizar espacios
    result = result.replace(/\s+/g, ' ').trim();
    
    return {
      text: result,
      changes,
      confidence: 1.0,
    };
  }
  
  /**
   * Limpieza inteligente: mantiene emojis útiles, remueve decorativos
   * @private
   */
  _smartClean(text) {
    const changes = [];
    let result = text;
    let keptCount = 0;
    
    // Extraer todos los emojis
    const emojis = text.match(this.emojiRegex) || [];
    
    if (emojis.length === 0) {
      return { text, changes: [], confidence: 1.0 };
    }
    
    // Procesar emoji por emoji
    for (const emoji of emojis) {
      const isUseful = this.usefulEmojis.has(emoji);
      const shouldKeep = isUseful && keptCount < this.config.maxEmojis;
      
      if (shouldKeep) {
        keptCount++;
        // Opcionalmente convertir a texto si tiene significado
        if (this.config.convertUseful) {
          const meaning = this.usefulEmojis.get(emoji);
          result = result.replace(emoji, ` ${meaning} `);
          changes.push({
            type: 'emoji_converted',
            original: emoji,
            replacement: meaning,
          });
        }
        // Si no, mantener el emoji
      } else {
        // Remover emoji
        result = result.replace(emoji, '');
        changes.push({
          type: 'emoji_removed',
          original: emoji,
          replacement: '',
          reason: isUseful ? 'max_exceeded' : 'decorative',
        });
      }
    }
    
    // Normalizar espacios
    result = result.replace(/\s+/g, ' ').trim();
    
    return {
      text: result,
      changes,
      confidence: 1.0,
    };
  }
  
  /**
   * Detecta el sentimiento basado en emojis
   * @param {string} text - Texto a analizar
   * @returns {object} { sentiment: 'positive'|'negative'|'neutral', emojis: [] }
   */
  detectSentiment(text) {
    const emojis = text.match(this.emojiRegex) || [];
    
    const positive = ['😊', '😄', '😃', '🙂', '❤️', '👍', '✅', '🎉', '💯', '😍', '🥰', '😎'];
    const negative = ['😢', '😭', '😠', '😡', '👎', '❌', '😤', '😞', '💔', '😰'];
    
    let score = 0;
    for (const emoji of emojis) {
      if (positive.includes(emoji)) score++;
      if (negative.includes(emoji)) score--;
    }
    
    return {
      sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      score,
      emojis,
    };
  }
}

export default EmojiCleaner;
