/**
 * DateRangeParser - Parser de rangos de fechas en lenguaje natural
 * 
 * Convierte frases como:
 * - "esta semana" → { start: "2026-02-09", end: "2026-02-15" }
 * - "el mes pasado" → { start: "2026-01-01", end: "2026-01-31" }
 * - "los últimos 7 días" → { start: "2026-02-05", end: "2026-02-12" }
 * - "de enero a marzo" → { start: "2026-01-01", end: "2026-03-31" }
 */

// Nombres de meses en español
const MONTHS = {
  'enero': 0, 'ene': 0,
  'febrero': 1, 'feb': 1,
  'marzo': 2, 'mar': 2,
  'abril': 3, 'abr': 3,
  'mayo': 4, 'may': 4,
  'junio': 5, 'jun': 5,
  'julio': 6, 'jul': 6,
  'agosto': 7, 'ago': 7,
  'septiembre': 8, 'sep': 8, 'sept': 8,
  'octubre': 9, 'oct': 9,
  'noviembre': 10, 'nov': 10,
  'diciembre': 11, 'dic': 11,
};

// Días de la semana
const WEEKDAYS = {
  'domingo': 0, 'dom': 0,
  'lunes': 1, 'lun': 1,
  'martes': 2, 'mar': 2,
  'miércoles': 3, 'miercoles': 3, 'mie': 3,
  'jueves': 4, 'jue': 4,
  'viernes': 5, 'vie': 5,
  'sábado': 6, 'sabado': 6, 'sab': 6,
};

export class DateRangeParser {
  constructor(options = {}) {
    this.timezone = options.timezone || 'America/Bogota';
  }
  
  /**
   * Parsea texto y extrae rango de fechas
   * @param {string} text - Texto a parsear
   * @param {Date} referenceDate - Fecha de referencia (default: hoy)
   * @returns {object|null} - { start, end, type, original }
   */
  parse(text, referenceDate = null) {
    const ref = referenceDate || this._getToday();
    const textLower = text.toLowerCase();
    
    // Intentar cada tipo de patrón
    return (
      this._parseRelativeDay(textLower, ref) ||
      this._parseRelativeWeek(textLower, ref) ||
      this._parseRelativeMonth(textLower, ref) ||
      this._parseRelativeYear(textLower, ref) ||
      this._parseLastNPeriods(textLower, ref) ||
      this._parseMonthRange(textLower, ref) ||
      this._parseSpecificMonth(textLower, ref) ||
      this._parseAbsoluteDate(textLower, ref) ||
      null
    );
  }
  
  /**
   * Parsea días relativos: hoy, ayer, mañana, etc.
   */
  _parseRelativeDay(text, ref) {
    if (/\bhoy\b/.test(text)) {
      const date = this._formatDate(ref);
      return { start: date, end: date, type: 'day', original: 'hoy' };
    }
    
    if (/\bayer\b/.test(text)) {
      const date = this._formatDate(this._addDays(ref, -1));
      return { start: date, end: date, type: 'day', original: 'ayer' };
    }
    
    if (/\bmañana\b/.test(text)) {
      const date = this._formatDate(this._addDays(ref, 1));
      return { start: date, end: date, type: 'day', original: 'mañana' };
    }
    
    if (/\bpasado\s*mañana\b/.test(text)) {
      const date = this._formatDate(this._addDays(ref, 2));
      return { start: date, end: date, type: 'day', original: 'pasado mañana' };
    }
    
    if (/\bantea?yer\b/.test(text)) {
      const date = this._formatDate(this._addDays(ref, -2));
      return { start: date, end: date, type: 'day', original: 'anteayer' };
    }
    
    return null;
  }
  
  /**
   * Parsea semanas relativas: esta semana, semana pasada, etc.
   */
  _parseRelativeWeek(text, ref) {
    if (/\b(esta|la)\s*semana\b/.test(text) && !/pasada|anterior/.test(text)) {
      const { start, end } = this._getWeekRange(ref);
      return { start, end, type: 'week', original: 'esta semana' };
    }
    
    if (/\bsemana\s*(pasada|anterior)\b/.test(text) || /\bla\s*semana\s*pasada\b/.test(text)) {
      const lastWeek = this._addDays(ref, -7);
      const { start, end } = this._getWeekRange(lastWeek);
      return { start, end, type: 'week', original: 'semana pasada' };
    }
    
    if (/\bpróxima\s*semana\b/.test(text) || /\bsemana\s*(que\s*viene|siguiente)\b/.test(text)) {
      const nextWeek = this._addDays(ref, 7);
      const { start, end } = this._getWeekRange(nextWeek);
      return { start, end, type: 'week', original: 'próxima semana' };
    }
    
    return null;
  }
  
  /**
   * Parsea meses relativos: este mes, mes pasado, etc.
   */
  _parseRelativeMonth(text, ref) {
    if (/\b(este|el)\s*mes\b/.test(text) && !/pasado|anterior/.test(text)) {
      const { start, end } = this._getMonthRange(ref);
      return { start, end, type: 'month', original: 'este mes' };
    }
    
    if (/\bmes\s*(pasado|anterior)\b/.test(text) || /\bel\s*mes\s*pasado\b/.test(text)) {
      const lastMonth = new Date(ref);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const { start, end } = this._getMonthRange(lastMonth);
      return { start, end, type: 'month', original: 'mes pasado' };
    }
    
    if (/\b(último|ultimo)\s*mes\b/.test(text)) {
      const lastMonth = new Date(ref);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const { start, end } = this._getMonthRange(lastMonth);
      return { start, end, type: 'month', original: 'último mes' };
    }
    
    if (/\bpróximo\s*mes\b/.test(text) || /\bmes\s*(que\s*viene|siguiente)\b/.test(text)) {
      const nextMonth = new Date(ref);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { start, end } = this._getMonthRange(nextMonth);
      return { start, end, type: 'month', original: 'próximo mes' };
    }
    
    return null;
  }
  
  /**
   * Parsea años relativos: este año, año pasado, etc.
   */
  _parseRelativeYear(text, ref) {
    if (/\b(este|el)\s*año\b/.test(text) && !/pasado|anterior/.test(text)) {
      const { start, end } = this._getYearRange(ref);
      return { start, end, type: 'year', original: 'este año' };
    }
    
    if (/\baño\s*(pasado|anterior)\b/.test(text) || /\bel\s*año\s*pasado\b/.test(text)) {
      const lastYear = new Date(ref);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const { start, end } = this._getYearRange(lastYear);
      return { start, end, type: 'year', original: 'año pasado' };
    }
    
    return null;
  }
  
  /**
   * Parsea "últimos N días/semanas/meses"
   */
  _parseLastNPeriods(text, ref) {
    // Últimos N días
    const daysMatch = text.match(/(?:últimos?|ultimos?|los\s+últimos?)\s+(\d+)\s*días?/i);
    if (daysMatch) {
      const n = parseInt(daysMatch[1], 10);
      const start = this._formatDate(this._addDays(ref, -n + 1));
      const end = this._formatDate(ref);
      return { start, end, type: 'days', original: `últimos ${n} días` };
    }
    
    // Últimas N semanas
    const weeksMatch = text.match(/(?:últimas?|ultimas?|las\s+últimas?)\s+(\d+)\s*semanas?/i);
    if (weeksMatch) {
      const n = parseInt(weeksMatch[1], 10);
      const start = this._formatDate(this._addDays(ref, -n * 7));
      const end = this._formatDate(ref);
      return { start, end, type: 'weeks', original: `últimas ${n} semanas` };
    }
    
    // Últimos N meses
    const monthsMatch = text.match(/(?:últimos?|ultimos?|los\s+últimos?)\s+(\d+)\s*meses?/i);
    if (monthsMatch) {
      const n = parseInt(monthsMatch[1], 10);
      const startDate = new Date(ref);
      startDate.setMonth(startDate.getMonth() - n);
      const start = this._formatDate(startDate);
      const end = this._formatDate(ref);
      return { start, end, type: 'months', original: `últimos ${n} meses` };
    }
    
    return null;
  }
  
  /**
   * Parsea rango de meses: "de enero a marzo"
   */
  _parseMonthRange(text, ref) {
    const pattern = /de\s+(\w+)\s+a\s+(\w+)/i;
    const match = text.match(pattern);
    
    if (match) {
      const startMonth = MONTHS[match[1].toLowerCase()];
      const endMonth = MONTHS[match[2].toLowerCase()];
      
      if (startMonth !== undefined && endMonth !== undefined) {
        const year = ref.getFullYear();
        const start = this._formatDate(new Date(year, startMonth, 1));
        const lastDay = new Date(year, endMonth + 1, 0).getDate();
        const end = this._formatDate(new Date(year, endMonth, lastDay));
        
        return { start, end, type: 'month_range', original: match[0] };
      }
    }
    
    return null;
  }
  
  /**
   * Parsea mes específico: "en enero", "de febrero"
   */
  _parseSpecificMonth(text, ref) {
    for (const [monthName, monthNum] of Object.entries(MONTHS)) {
      const pattern = new RegExp(`(?:en|de|del?)\\s+${monthName}\\b`, 'i');
      if (pattern.test(text)) {
        const year = ref.getFullYear();
        const start = this._formatDate(new Date(year, monthNum, 1));
        const lastDay = new Date(year, monthNum + 1, 0).getDate();
        const end = this._formatDate(new Date(year, monthNum, lastDay));
        
        return { start, end, type: 'month', original: monthName };
      }
    }
    
    return null;
  }
  
  /**
   * Parsea fechas absolutas: "el 15 de febrero", "15/02/2026"
   */
  _parseAbsoluteDate(text, ref) {
    // Formato: "el 15 de febrero"
    const spanishPattern = /(?:el\s+)?(\d{1,2})\s+de\s+(\w+)(?:\s+(?:de(?:l)?\s+)?(\d{4}))?/i;
    const spanishMatch = text.match(spanishPattern);
    
    if (spanishMatch) {
      const day = parseInt(spanishMatch[1], 10);
      const month = MONTHS[spanishMatch[2].toLowerCase()];
      const year = spanishMatch[3] ? parseInt(spanishMatch[3], 10) : ref.getFullYear();
      
      if (month !== undefined && day >= 1 && day <= 31) {
        const date = this._formatDate(new Date(year, month, day));
        return { start: date, end: date, type: 'date', original: spanishMatch[0] };
      }
    }
    
    // Formato: DD/MM/YYYY o DD-MM-YYYY
    const numericPattern = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
    const numericMatch = text.match(numericPattern);
    
    if (numericMatch) {
      const day = parseInt(numericMatch[1], 10);
      const month = parseInt(numericMatch[2], 10) - 1;
      let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : ref.getFullYear();
      
      // Año de 2 dígitos
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const date = this._formatDate(new Date(year, month, day));
        return { start: date, end: date, type: 'date', original: numericMatch[0] };
      }
    }
    
    return null;
  }
  
  // ─── Utilidades ───────────────────────────────────────────────
  
  /**
   * Obtiene la fecha de hoy en la zona horaria configurada
   */
  _getToday() {
    // Crear fecha en zona horaria de Colombia
    const now = new Date();
    const colombiaOffset = -5 * 60; // UTC-5
    const localOffset = now.getTimezoneOffset();
    const diff = colombiaOffset - localOffset;
    
    return new Date(now.getTime() + diff * 60 * 1000);
  }
  
  /**
   * Añade días a una fecha
   */
  _addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  /**
   * Obtiene el rango de una semana (lunes a domingo)
   */
  _getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    
    const monday = new Date(d);
    monday.setDate(diff);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: this._formatDate(monday),
      end: this._formatDate(sunday),
    };
  }
  
  /**
   * Obtiene el rango de un mes
   */
  _getMonthRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      start: this._formatDate(firstDay),
      end: this._formatDate(lastDay),
    };
  }
  
  /**
   * Obtiene el rango de un año
   */
  _getYearRange(date) {
    const year = date.getFullYear();
    
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }
  
  /**
   * Formatea fecha a YYYY-MM-DD
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export default DateRangeParser;
