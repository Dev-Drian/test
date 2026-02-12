/**
 * QueryParser - Parser de consultas naturales a filtros estructurados
 * 
 * Convierte frases como:
 * - "ventas mayores a 100000" → { total: { $gt: 100000 } }
 * - "citas de esta semana" → { fecha: { $gte: "2026-02-09", $lte: "2026-02-15" } }
 * - "clientes entre 20 y 30 años" → { edad: { $gte: 20, $lte: 30 } }
 */

import { DateRangeParser } from './DateRangeParser.js';

// Operadores de comparación en español
const COMPARISON_OPERATORS = [
  { patterns: [/mayor(es)?\s*(a|que|de)/i, /más\s*de/i, /superior(es)?\s*a/i, />/], operator: '$gt' },
  { patterns: [/menor(es)?\s*(a|que|de)/i, /menos\s*de/i, /inferior(es)?\s*a/i, /</], operator: '$lt' },
  { patterns: [/mayor(es)?\s*o\s*igual(es)?\s*(a|que)/i, />=/], operator: '$gte' },
  { patterns: [/menor(es)?\s*o\s*igual(es)?\s*(a|que)/i, /<=/], operator: '$lte' },
  { patterns: [/igual(es)?\s*a/i, /exactamente/i, /^=/], operator: '$eq' },
  { patterns: [/diferente(s)?\s*(a|de)/i, /distinto(s)?\s*(a|de)/i, /no\s*es/i], operator: '$ne' },
];

// Patrones para rangos
const RANGE_PATTERNS = [
  /entre\s+(\d+(?:[.,]\d+)?)\s*y\s*(\d+(?:[.,]\d+)?)/i,
  /de\s+(\d+(?:[.,]\d+)?)\s+a\s+(\d+(?:[.,]\d+)?)/i,
  /desde\s+(\d+(?:[.,]\d+)?)\s+hasta\s+(\d+(?:[.,]\d+)?)/i,
];

// Campos numéricos comunes
const NUMERIC_FIELD_HINTS = [
  'total', 'monto', 'precio', 'valor', 'cantidad', 'costo',
  'edad', 'años', 'dias', 'horas', 'minutos',
  'ventas', 'ingresos', 'gastos', 'ganancia', 'descuento',
];

// Campos de fecha comunes
const DATE_FIELD_HINTS = [
  'fecha', 'date', 'dia', 'createdAt', 'updatedAt',
  'inicio', 'fin', 'vencimiento', 'nacimiento',
];

export class QueryParser {
  constructor(options = {}) {
    this.timezone = options.timezone || 'America/Bogota';
    this.dateParser = new DateRangeParser({ timezone: this.timezone });
  }
  
  /**
   * Parsea una consulta natural y extrae filtros
   * @param {string} text - Texto de la consulta
   * @param {object} tableSchema - Schema de la tabla { name, headers: [{key, type}] }
   * @returns {object} - { filters, sort, limit, aggregation }
   */
  parse(text, tableSchema = null) {
    const result = {
      filters: {},
      sort: null,
      limit: null,
      aggregation: null,
      dateRange: null,
      confidence: 1.0,
    };
    
    // 1. Extraer filtros de fecha/período
    const dateFilters = this._extractDateFilters(text, tableSchema);
    if (dateFilters) {
      result.dateRange = dateFilters.range;
      Object.assign(result.filters, dateFilters.filters);
    }
    
    // 2. Extraer filtros de comparación numérica
    const comparisonFilters = this._extractComparisonFilters(text, tableSchema);
    Object.assign(result.filters, comparisonFilters);
    
    // 3. Extraer filtros de rango
    const rangeFilters = this._extractRangeFilters(text, tableSchema);
    Object.assign(result.filters, rangeFilters);
    
    // 4. Extraer ordenamiento
    result.sort = this._extractSort(text, tableSchema);
    
    // 5. Extraer límite
    result.limit = this._extractLimit(text);
    
    // 6. Detectar si es agregación
    result.aggregation = this._extractAggregation(text, tableSchema);
    
    return result;
  }
  
  /**
   * Extrae filtros de fecha basados en períodos
   */
  _extractDateFilters(text, tableSchema) {
    const dateRange = this.dateParser.parse(text);
    if (!dateRange || !dateRange.start) return null;
    
    // Encontrar campo de fecha en el schema
    const dateField = this._findFieldByHint(tableSchema, DATE_FIELD_HINTS) || 'fecha';
    
    const filters = {};
    if (dateRange.start && dateRange.end) {
      filters[dateField] = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    } else if (dateRange.start) {
      filters[dateField] = { $gte: dateRange.start };
    }
    
    return { filters, range: dateRange };
  }
  
  /**
   * Extrae filtros de comparación (>, <, etc.)
   */
  _extractComparisonFilters(text, tableSchema) {
    const filters = {};
    
    for (const { patterns, operator } of COMPARISON_OPERATORS) {
      for (const pattern of patterns) {
        // Buscar patrón seguido de número
        const fullPattern = new RegExp(
          `(\\w+)\\s+${pattern.source}\\s*(\\d+(?:[.,]\\d+)?)`,
          'i'
        );
        const match = text.match(fullPattern);
        
        if (match) {
          const fieldHint = match[1].toLowerCase();
          const value = this._parseNumber(match[match.length - 1]);
          
          // Intentar encontrar el campo real
          const field = this._findFieldByHint(tableSchema, [fieldHint]) || fieldHint;
          
          filters[field] = { [operator]: value };
        }
        
        // También buscar "mayores a X" sin campo explícito
        const simplePattern = new RegExp(
          `${pattern.source}\\s*(\\d+(?:[.,]\\d+)?)`,
          'i'
        );
        const simpleMatch = text.match(simplePattern);
        
        if (simpleMatch && Object.keys(filters).length === 0) {
          const value = this._parseNumber(simpleMatch[simpleMatch.length - 1]);
          // Inferir campo del contexto
          const inferredField = this._inferNumericField(text, tableSchema);
          if (inferredField) {
            filters[inferredField] = { [operator]: value };
          }
        }
      }
    }
    
    return filters;
  }
  
  /**
   * Extrae filtros de rango (entre X y Y)
   */
  _extractRangeFilters(text, tableSchema) {
    const filters = {};
    
    for (const pattern of RANGE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const min = this._parseNumber(match[1]);
        const max = this._parseNumber(match[2]);
        
        // Intentar encontrar el campo del contexto
        const field = this._inferNumericField(text, tableSchema) || 'valor';
        
        filters[field] = {
          $gte: Math.min(min, max),
          $lte: Math.max(min, max),
        };
        break;
      }
    }
    
    return filters;
  }
  
  /**
   * Extrae ordenamiento
   */
  _extractSort(text, tableSchema) {
    const sortPatterns = [
      { pattern: /ordenar?\s+por\s+(\w+)\s*(asc|desc|ascendente|descendente)?/i, field: 1, dir: 2 },
      { pattern: /más\s+(recientes?|nuevos?|antiguos?)/i, field: 'fecha', dir: 1 },
      { pattern: /(primeros?|últimos?)\s+(\d+)?/i, field: null, dir: 1 },
      { pattern: /mayor(es)?\s+a\s+menor/i, field: null, dir: 'desc' },
      { pattern: /menor(es)?\s+a\s+mayor/i, field: null, dir: 'asc' },
    ];
    
    for (const { pattern, field: fieldIdx, dir: dirIdx } of sortPatterns) {
      const match = text.match(pattern);
      if (match) {
        let field = typeof fieldIdx === 'string' ? fieldIdx : (match[fieldIdx] || 'createdAt');
        let direction = -1; // default desc
        
        if (typeof dirIdx === 'string') {
          direction = dirIdx === 'asc' ? 1 : -1;
        } else if (match[dirIdx]) {
          const dirText = match[dirIdx].toLowerCase();
          if (dirText.includes('asc') || dirText.includes('antiguo')) {
            direction = 1;
          }
        }
        
        // Si menciona "últimos" es descendente, si "primeros" es ascendente
        if (match[0].toLowerCase().includes('último')) direction = -1;
        if (match[0].toLowerCase().includes('primero')) direction = 1;
        
        return { [field]: direction };
      }
    }
    
    return null;
  }
  
  /**
   * Extrae límite
   */
  _extractLimit(text) {
    const limitPatterns = [
      /(?:los\s+)?(?:últimos?|primeros?|top)\s+(\d+)/i,
      /(\d+)\s+(?:más\s+)?recientes?/i,
      /limit(?:e|ar)?\s*(?:a|:)?\s*(\d+)/i,
      /solo\s+(\d+)/i,
      /máximo\s+(\d+)/i,
    ];
    
    for (const pattern of limitPatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return null;
  }
  
  /**
   * Detecta si es una consulta de agregación
   */
  _extractAggregation(text, tableSchema) {
    const aggPatterns = [
      { pattern: /total\s+de\s+(\w+)/i, type: 'sum', field: 1 },
      { pattern: /suma(?:r)?\s+(?:de\s+)?(\w+)/i, type: 'sum', field: 1 },
      { pattern: /promedio\s+(?:de\s+)?(\w+)/i, type: 'avg', field: 1 },
      { pattern: /cuánto[s]?\s+(?:hay|tengo|tienen)/i, type: 'count', field: null },
      { pattern: /contar\s+(\w+)/i, type: 'count', field: 1 },
      { pattern: /(?:el\s+)?máximo\s+(?:de\s+)?(\w+)/i, type: 'max', field: 1 },
      { pattern: /(?:el\s+)?mínimo\s+(?:de\s+)?(\w+)/i, type: 'min', field: 1 },
    ];
    
    for (const { pattern, type, field: fieldIdx } of aggPatterns) {
      const match = text.match(pattern);
      if (match) {
        let field = fieldIdx ? match[fieldIdx] : null;
        
        // Si es suma y no especifica campo, buscar campo numérico
        if ((type === 'sum' || type === 'avg') && !field) {
          field = this._inferNumericField(text, tableSchema);
        }
        
        return { type, field };
      }
    }
    
    return null;
  }
  
  /**
   * Busca un campo en el schema que coincida con las pistas
   */
  _findFieldByHint(tableSchema, hints) {
    if (!tableSchema?.headers) return null;
    
    for (const hint of hints) {
      const header = tableSchema.headers.find(h => {
        const key = (h.key || h.label || h).toLowerCase();
        return key.includes(hint.toLowerCase()) || hint.toLowerCase().includes(key);
      });
      if (header) {
        return header.key || header.label || header;
      }
    }
    
    return null;
  }
  
  /**
   * Infiere el campo numérico del contexto
   */
  _inferNumericField(text, tableSchema) {
    const textLower = text.toLowerCase();
    
    // Buscar menciones de campos numéricos en el texto
    for (const hint of NUMERIC_FIELD_HINTS) {
      if (textLower.includes(hint)) {
        const found = this._findFieldByHint(tableSchema, [hint]);
        if (found) return found;
        return hint;
      }
    }
    
    // Si el schema tiene campos numéricos, usar el primero
    if (tableSchema?.headers) {
      const numericHeader = tableSchema.headers.find(h => 
        h.type === 'number' || h.type === 'currency' || h.type === 'integer'
      );
      if (numericHeader) {
        return numericHeader.key || numericHeader.label;
      }
    }
    
    return null;
  }
  
  /**
   * Parsea un número con soporte para comas y puntos
   */
  _parseNumber(str) {
    if (!str) return 0;
    // Remover separadores de miles y normalizar decimales
    const normalized = str.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(normalized) || 0;
  }
}

export default QueryParser;
