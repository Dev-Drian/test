/**
 * QueryHandler - Handler para consultas de datos (LLM-First)
 * 
 * El LLM decide cuándo usar query_records y extrae los filtros.
 * Este handler solo ejecuta la consulta.
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';
import { QueryParser } from '../../parsing/QueryParser.js';
import { TablePermissions } from '../../services/TablePermissions.js';

export class QueryHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
    this.queryParser = new QueryParser();
  }
  
  /**
   * Verifica si puede manejar una acción de tipo QUERY
   */
  async canHandle(context) {
    const actionType = context.intent?.actionType;
    return actionType === 'query' || actionType === 'search';
  }
  
  /**
   * Ejecuta la consulta
   */
  async execute(context) {
    const { workspaceId, analysis, message, tables } = context;
    
    // V3: El tableId ya viene resuelto desde Engine._mapToolArgsToContext()
    const tableId = analysis?.tableId;
    // Soportar tanto 'id' (de ChatService) como '_id' (de DB directa)
    const tableSchema = tableId ? tables?.find(t => (t.id || t._id) === tableId) : null;
    
    // Si no hay tableId, el LLM no pudo determinar la tabla → sugerir opciones
    if (!tableId || !tableSchema) {
      const tableNames = tables?.map(t => t.name) || [];
      const requestedType = context.llmExtracted?.record_type || analysis?.requestedType;
      
      // Respuesta amigable según el contexto
      if (tableNames.length === 0) {
        return {
          handled: true,
          response: 'No tengo tablas configuradas para consultar información. Por favor, contacta al administrador.',
        };
      }
      
      // Si el usuario pidió algo específico que no existe
      if (requestedType) {
        return {
          handled: true,
          response: `No encontré información sobre "${requestedType}". 📋 Puedo ayudarte con: ${tableNames.join(', ')}. ¿Qué te gustaría consultar?`,
        };
      }
      
      // Respuesta genérica
      return {
        handled: true,
        response: `📋 Puedo mostrarte información sobre: ${tableNames.join(', ')}. ¿Qué te gustaría consultar?`,
      };
    }
    
    try {
      
      // ═══ DETECTAR PREGUNTAS SOBRE OPCIONES DE CAMPO ═══
      // "qué tipos de clientes existen", "cuáles son las categorías"
      const fieldOptionsResult = this._checkForFieldOptionsQuestion(message, tableSchema);
      if (fieldOptionsResult) {
        return fieldOptionsResult;
      }
      
      // Verificar permisos
      const permission = TablePermissions.check(tableSchema, 'query');
      if (!permission.allowed) {
        return {
          handled: true,
          response: permission.reason,
        };
      }
      
      // Parsear consulta con QueryParser para filtros avanzados
      const parsedQuery = this.queryParser.parse(message, tableSchema);
      console.log('[QueryHandler] ParsedQuery:', JSON.stringify(parsedQuery, null, 2));
      
      // Normalizar nombres de campos de los filtros del LLM para que coincidan con la tabla
      let llmFilters = this._normalizeFilters(analysis.query?.filters || {}, tableSchema);
      console.log('[QueryHandler] LLM filters normalized:', JSON.stringify(llmFilters, null, 2));
      
      // ═══ FALLBACK: Extraer filtros si el LLM falló ═══
      if (Object.keys(llmFilters).length === 0) {
        const fallbackFilters = this._extractFallbackFilters(message, tableSchema);
        if (Object.keys(fallbackFilters).length > 0) {
          console.log('[QueryHandler] FALLBACK filters extracted:', JSON.stringify(fallbackFilters, null, 2));
          llmFilters = fallbackFilters;
        }
      }
      
      // Combinar filtros del LLM con los del QueryParser
      let combinedFilters = {
        ...llmFilters,
        ...parsedQuery.filters,
      };
      
      // ═══ CONTROL DE ACCESO POR TABLA ═══
      // Verificar si el agente tiene fullAccess para esta tabla
      const agentTables = context.agent?.tables || [];
      const tableConfig = agentTables.find(t => 
        (typeof t === 'object' ? t.tableId : t) === analysis.tableId
      );
      const hasFullAccess = typeof tableConfig === 'object' ? tableConfig.fullAccess !== false : true;
      
      if (hasFullAccess) {
        console.log('[QueryHandler] Table has fullAccess, showing all data');
      } else {
        console.log('[QueryHandler] Table has restricted access (fullAccess: false)');
        // TODO: Implementar filtrado cuando haya sistema de autenticación
      }
      
      // Usar límite del parser o del análisis
      const limit = parsedQuery.limit || analysis.query?.limit || 10;
      
      // Usar sort del parser o del análisis
      const sort = parsedQuery.sort || (analysis.query?.sortBy 
        ? [{ [analysis.query.sortBy]: analysis.query.sortOrder || 'desc' }] 
        : undefined);
      
      // Si es agregación del QueryParser, manejar diferente
      if (parsedQuery.aggregation) {
        return await this._handleAggregation(context, combinedFilters, parsedQuery.aggregation);
      }
      
      // ═══ V3: ANÁLISIS ESTADÍSTICO INTELIGENTE ═══
      // Si el LLM detectó analyze_data o hay patrones analíticos en el mensaje
      if (analysis.isAnalysis || this._isAnalyticalQuestion(message)) {
        console.log('[QueryHandler] Detected analytical question, using smart analysis');
        return await this._handleSmartAnalysis(context, combinedFilters, tableSchema, analysis);
      }
      
      // Separar filtros: exactos van a CouchDB, texto se filtra en JS
      const { dbFilters, textFilters } = this._separateFilters(combinedFilters);
      console.log('[QueryHandler] DB filters:', JSON.stringify(dbFilters));
      console.log('[QueryHandler] Text filters:', JSON.stringify(textFilters));
      
      // Query con filtros exactos (más registros si hay filtros de texto)
      const queryLimit = Object.keys(textFilters).length > 0 ? Math.max(limit * 10, 100) : limit;
      
      let rows = await this.tableDataRepository.query(
        workspaceId,
        analysis.tableId,
        dbFilters,
        { limit: queryLimit, sort }
      );
      
      // Aplicar filtros de texto case-insensitive en JavaScript
      if (Object.keys(textFilters).length > 0) {
        const beforeCount = rows.length;
        rows = this._applyTextFilters(rows, textFilters);
        console.log(`[QueryHandler] Text filter applied: ${beforeCount} → ${rows.length} rows`);
        
        // Aplicar límite después del filtrado
        if (rows.length > limit) {
          rows = rows.slice(0, limit);
        }
      }
      
      this.eventEmitter.emit(EVENTS.RECORD_QUERIED, {
        workspaceId,
        tableId: analysis.tableId,
        count: rows.length,
        filters: combinedFilters,
      });
      
      if (rows.length === 0) {
        // Si hay filtro de fecha, dar contexto
        if (parsedQuery.dateRange) {
          return {
            handled: true,
            response: `No se encontraron resultados para ${parsedQuery.dateRange.original || 'ese período'}.`,
          };
        }
        return {
          handled: true,
          response: 'No se encontraron resultados.',
        };
      }
      
      // Formatear resultados dinámicamente
      const response = await this._formatResults(context, rows, analysis, parsedQuery);
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { rows, filters: combinedFilters, dateRange: parsedQuery.dateRange },
      };
      
    } catch (error) {
      console.error('[QueryHandler] Error:', error);
      return {
        handled: true,
        response: 'Error al consultar los datos. Intenta de nuevo.',
      };
    }
  }
  
  /**
   * Maneja consultas de agregación (suma, promedio, conteo, etc.)
   */
  async _handleAggregation(context, filters, aggregation) {
    const { workspaceId, analysis } = context;
    
    try {
      const rows = await this.tableDataRepository.query(
        workspaceId,
        analysis.tableId,
        filters,
        { limit: 1000 } // Traer más para agregar
      );
      
      if (rows.length === 0) {
        return {
          handled: true,
          response: 'No hay datos para calcular.',
        };
      }
      
      let result;
      const field = aggregation.field;
      
      switch (aggregation.type) {
        case 'count':
          result = rows.length;
          return {
            handled: true,
            response: `📊 Total: **${result}** registros`,
          };
          
        case 'sum':
          if (!field) {
            return { handled: true, response: 'No pude determinar qué campo sumar.' };
          }
          result = rows.reduce((sum, row) => sum + (parseFloat(row[field]) || 0), 0);
          return {
            handled: true,
            response: `📊 Total de ${field}: **$${result.toLocaleString('es-CO')}**`,
          };
          
        case 'avg':
          if (!field) {
            return { handled: true, response: 'No pude determinar qué campo promediar.' };
          }
          const sum = rows.reduce((s, row) => s + (parseFloat(row[field]) || 0), 0);
          result = sum / rows.length;
          return {
            handled: true,
            response: `📊 Promedio de ${field}: **$${result.toLocaleString('es-CO', { maximumFractionDigits: 2 })}**`,
          };
          
        case 'max':
          if (!field) {
            return { handled: true, response: 'No pude determinar qué campo analizar.' };
          }
          result = Math.max(...rows.map(row => parseFloat(row[field]) || 0));
          return {
            handled: true,
            response: `📊 Máximo de ${field}: **$${result.toLocaleString('es-CO')}**`,
          };
          
        case 'min':
          if (!field) {
            return { handled: true, response: 'No pude determinar qué campo analizar.' };
          }
          result = Math.min(...rows.map(row => parseFloat(row[field]) || 0));
          return {
            handled: true,
            response: `📊 Mínimo de ${field}: **$${result.toLocaleString('es-CO')}**`,
          };
          
        default:
          return { handled: true, response: 'Tipo de análisis no soportado.' };
      }
      
    } catch (error) {
      console.error('[QueryHandler] Aggregation error:', error);
      return { handled: true, response: 'Error al calcular.' };
    }
  }
  
  /**
   * Normaliza los nombres de campos de los filtros del LLM
   * para que coincidan con los nombres reales de los campos en la tabla.
   * Hace matching case-insensitive y por contenido parcial.
   * 
   * @param {object} filters - Filtros del LLM
   * @param {object} tableSchema - Schema de la tabla con headers/fields
   * @returns {object} - Filtros normalizados con nombres correctos de campos
   * @private
   */
  _normalizeFilters(filters, tableSchema) {
    if (!filters || Object.keys(filters).length === 0) return {};
    if (!tableSchema?.headers?.length && !tableSchema?.fields?.length) return filters;
    
    // Obtener lista de campos reales de la tabla
    const realFields = (tableSchema.headers || tableSchema.fields || []).map(h => {
      if (typeof h === 'string') return h;
      return h.name || h.key || h.label || h;
    });
    
    const normalizedFilters = {};
    
    for (const [filterKey, filterValue] of Object.entries(filters)) {
      const filterKeyLower = filterKey.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Buscar campo real que coincida
      let matchedField = null;
      
      // 1. Coincidencia exacta (case-insensitive)
      for (const field of realFields) {
        const fieldLower = field.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (fieldLower === filterKeyLower) {
          matchedField = field;
          break;
        }
      }
      
      // 2. Coincidencia parcial (uno contiene al otro)
      if (!matchedField) {
        for (const field of realFields) {
          const fieldLower = field.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (fieldLower.includes(filterKeyLower) || filterKeyLower.includes(fieldLower)) {
            matchedField = field;
            break;
          }
        }
      }
      
      // 3. Matching por alias comunes (cliente ↔ nombre, comprador ↔ cliente, etc.)
      if (!matchedField) {
        const aliases = {
          'cliente': ['nombre', 'client', 'customer', 'comprador'],
          'nombre': ['cliente', 'client', 'name'],
          'fecha': ['date', 'dia'],
          'tipo': ['type', 'categoria'],
          'estado': ['status', 'state'],
          'producto': ['product', 'item', 'articulo'],
        };
        
        for (const field of realFields) {
          const fieldLower = field.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          
          // Verificar si filterKey tiene alias que matchee con el field
          const filterAliases = aliases[filterKeyLower] || [];
          if (filterAliases.some(alias => fieldLower.includes(alias) || alias.includes(fieldLower))) {
            matchedField = field;
            break;
          }
          
          // Verificar si el field tiene alias que matchee con filterKey
          const fieldAliases = aliases[fieldLower] || [];
          if (fieldAliases.some(alias => filterKeyLower.includes(alias) || alias.includes(filterKeyLower))) {
            matchedField = field;
            break;
          }
        }
      }
      
      // Usar el campo encontrado o el original
      const finalKey = matchedField || filterKey;
      normalizedFilters[finalKey] = filterValue;
      
      if (matchedField && matchedField !== filterKey) {
        console.log(`[QueryHandler] Filter normalized: "${filterKey}" → "${matchedField}"`);
      }
    }
    
    return normalizedFilters;
  }
  
  /**
   * Separa filtros en: exactos (para CouchDB) y texto (para filtrar en JS)
   * Los filtros de texto se manejan en JavaScript porque CouchDB no soporta
   * búsqueda case-insensitive de forma nativa.
   * 
   * @param {object} filters - Filtros combinados
   * @returns {{dbFilters: object, textFilters: object}}
   * @private
   */
  _separateFilters(filters) {
    const dbFilters = {};
    const textFilters = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'string' && value.length > 0) {
        // Texto → filtrar en JavaScript (case-insensitive)
        textFilters[key] = value;
      } else if (value !== undefined && value !== null) {
        // Números, booleanos, etc. → filtrar en CouchDB
        dbFilters[key] = value;
      }
    }
    
    return { dbFilters, textFilters };
  }
  
  /**
   * Aplica filtros de texto case-insensitive después de la query
   * (CouchDB no siempre soporta $regex, así que filtramos en JS)
   * 
   * @param {object[]} rows - Resultados de la query
   * @param {object} filters - Filtros a aplicar
   * @returns {object[]} - Resultados filtrados
   * @private
   */
  _applyTextFilters(rows, filters) {
    if (!filters || Object.keys(filters).length === 0) return rows;
    
    return rows.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        if (typeof value !== 'string') continue;
        
        const rowValue = row[key];
        if (rowValue === undefined || rowValue === null) return false;
        
        // Comparación case-insensitive con normalización de acentos
        const rowValueNorm = String(rowValue).toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const filterValueNorm = value.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Verificar si contiene (no exacto)
        if (!rowValueNorm.includes(filterValueNorm)) {
          return false;
        }
      }
      return true;
    });
  }
  
  /**
   * Formatea los resultados de la consulta
   */
  async _formatResults(context, rows, analysis, parsedQuery = {}) {
    // Obtener configuración de campos de la tabla
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      analysis.tableId
    );
    
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    // Si hay rango de fecha, mencionarlo
    let header = `📋 Encontré ${rows.length} resultado(s)`;
    if (parsedQuery.dateRange?.original) {
      header += ` (${parsedQuery.dateRange.original})`;
    }
    header += ':\n\n';
    
    let response = header;
    
    rows.slice(0, 10).forEach((row, i) => {
      // Obtener el campo principal (usualmente 'nombre')
      const mainField = row.nombre || row.nombre || row.title || Object.values(row).find(v => typeof v === 'string' && v.length > 0);
      
      response += `${i + 1}. **${mainField || 'Sin nombre'}**\n`;
      
      // Agregar detalles
      const details = [];
      // Campos de metadata que nunca se muestran al usuario
      const HIDDEN_METADATA_FIELDS = ['chatOriginId', 'createdVia', 'createdByBot', 'procesadoPor', 'requiereRevision'];
      
      for (const [key, value] of Object.entries(row)) {
        // Excluir campos internos, IDs, metadatos y campos de seguimiento del chat
        if (key.startsWith('_') || key === 'id' || key === 'main' || key === 'tableId' || key === 'createdAt' || key === 'updatedAt') continue;
        if (HIDDEN_METADATA_FIELDS.includes(key)) continue;
        if (value === mainField) continue;
        if (!value) continue;
        
        // Verificar configuración del campo
        const fieldConfig = configMap[key] || {};
        
        // Respetar hiddenFromChat - campos sensibles que no se muestran
        if (fieldConfig.hiddenFromChat) continue;
        
        const emoji = fieldConfig.emoji || '•';
        const label = fieldConfig.label || key.charAt(0).toUpperCase() + key.slice(1);
        
        // Formatear valor según tipo
        let displayValue = value;
        if (key === 'precio' || fieldConfig.type === 'currency') {
          displayValue = `$${Number(value).toLocaleString('es-CO')}`;
        } else if (fieldConfig.type === 'number') {
          // Números sin símbolo de moneda (stock, cantidad, etc.)
          displayValue = Number(value).toLocaleString('es-CO');
        } else if (key === 'duracion') {
          displayValue = `${value} min`;
        }
        
        details.push(`   ${emoji} ${label}: ${displayValue}`);
      }
      
      if (details.length > 0) {
        response += details.join('\n') + '\n';
      }
      
      response += '\n';
    });
    
    if (rows.length > 10) {
      response += `... y ${rows.length - 10} más`;
    }
    
    return response;
  }
  
  /**
   * Extrae filtros del mensaje del usuario cuando el LLM falla
   * Usa NLP básico para detectar patrones comunes
   * 
   * @param {string} message - Mensaje del usuario
   * @param {object} tableSchema - Schema de la tabla
   * @returns {object} - Filtros extraídos
   * @private
   */
  _extractFallbackFilters(message, tableSchema) {
    const filters = {};
    const msgLower = message.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Obtener campos de la tabla
    const realFields = (tableSchema?.headers || tableSchema?.fields || []).map(h => {
      if (typeof h === 'string') return h;
      return h.name || h.key || h.label || h;
    });
    
    // Campo de nombre/cliente
    const nameField = realFields.find(f => 
      /^(nombre|cliente|customer|contact|paciente|usuario)$/i.test(f)
    );
    
    // Campo de estado
    const statusField = realFields.find(f => 
      /^(estado|status|situacion)$/i.test(f)
    );
    
    // ═══ PATRÓN 1: "de [nombre]" ═══
    // Matches: "ventas de María García", "citas de Juan Pérez"
    const namePattern = /(?:de|del?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i;
    const nameMatch = message.match(namePattern);
    if (nameMatch && nameField) {
      filters[nameField] = nameMatch[1].trim();
    }
    
    // ═══ PATRÓN 2: "con estado [estado]" o "estado [estado]" ═══
    // Matches: "con estado pendiente", "estado cancelada"
    const statusPattern = /(?:con\s+)?estado\s+([a-záéíóúñ]+)/i;
    const statusMatch = message.match(statusPattern);
    if (statusMatch && statusField) {
      // Capitalizar primera letra
      const status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
      filters[statusField] = status;
    }
    
    // ═══ PATRÓN 3: "[estado]s" como adjetivo (pendientes, canceladas) ═══
    // Matches: "ventas pendientes", "citas canceladas"
    if (!filters[statusField] && statusField) {
      const statusAdjectivePattern = /\b(pendiente|cancelad[oa]|completad[oa]|activ[oa]|inactiv[oa])s?\b/i;
      const adjMatch = msgLower.match(statusAdjectivePattern);
      if (adjMatch) {
        // Normalizar: "pendientes" → "Pendiente"
        let status = adjMatch[1].replace(/s$/, '').replace(/[oa]$/, 'o');
        status = status.charAt(0).toUpperCase() + status.slice(1);
        if (status === 'Cancelado') status = 'Cancelada';
        if (status === 'Completado') status = 'Completada';
        filters[statusField] = status;
      }
    }
    
    console.log('[QueryHandler] Fallback extraction:', { 
      message: message.substring(0, 50),
      nameField,
      statusField,
      filters 
    });
    
    return filters;
  }
  
  /**
   * Detecta si el usuario pregunta por opciones de un campo (tipo, categoría, estado)
   * Ej: "qué tipos de clientes existen", "cuáles son las categorías"
   * 
   * @param {string} message - Mensaje del usuario
   * @param {object} tableSchema - Schema de la tabla
   * @returns {object|null} - Respuesta con opciones o null si no aplica
   * @private
   */
  _checkForFieldOptionsQuestion(message, tableSchema) {
    const msgLower = message.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Patrones que indican pregunta sobre opciones
    const askingForOptions = /\b(que|cual|cuales)\s+(tipo|tipos|categoria|categorias|estado|estados|opciones)\b/i.test(msgLower)
      || /\b(tipo|tipos|categoria|categorias)\s+(de|hay|existen|tienen)/i.test(msgLower)
      || /\bexisten\s+(tipo|categoria)/i.test(msgLower);
    
    if (!askingForOptions) return null;
    
    // Obtener campos de la tabla
    const fields = tableSchema?.headers || tableSchema?.fields || [];
    
    // Buscar campo con opciones que coincida con la pregunta
    const fieldKeywords = {
      'tipo': ['tipo', 'types'],
      'categoria': ['categoria', 'category'],
      'estado': ['estado', 'status'],
    };
    
    for (const field of fields) {
      const fieldConfig = typeof field === 'object' ? field : { key: field };
      const fieldKey = (fieldConfig.key || fieldConfig.name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Verificar si el campo tiene opciones y coincide con la pregunta
      const options = fieldConfig.options;
      if (!options || !Array.isArray(options) || options.length === 0) continue;
      
      // Verificar si la pregunta menciona este tipo de campo
      for (const [keyword, aliases] of Object.entries(fieldKeywords)) {
        if (msgLower.includes(keyword) && (fieldKey.includes(keyword) || aliases.some(a => fieldKey.includes(a)))) {
          const label = fieldConfig.label || fieldConfig.key || keyword;
          const emoji = fieldConfig.emoji || '📋';
          
          console.log('[QueryHandler] Field options question detected:', {
            field: fieldKey,
            options
          });
          
          return {
            handled: true,
            response: `${emoji} Los **${label.toLowerCase()}s** disponibles son:\n\n${options.map(opt => `• ${opt}`).join('\n')}\n\n¿Cuál deseas usar?`,
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Detecta si el mensaje es una pregunta analítica
   * @private
   */
  _isAnalyticalQuestion(message) {
    const patterns = [
      /\b(cual|cuales?|quien|quienes?)\s+(es|son|tiene|tienen)\s+(el|la|los|las)?\s*(m[aá]s|menos|mejor|peor|mayor|menor)/i,
      /\b(m[aá]s|menos)\s+(vendid[oa]s?|comprad[oa]s?|registrad[oa]s?|frecuentes?|important[es]?)/i,
      /\b(total|promedio|suma|conteo|resumen|estad[íi]sticas?|an[áa]lisis)\b/i,
      /\b(cu[áa]nt[oa]s?)\s+(hay|tenemos|existen|son|vendimos|ganamos)\b/i,
      /\bpor\s+(categor[íi]a|tipo|estado|cliente|producto|mes|semana)/i,
      /\btop\s+(\d+|\w+)/i,
      /\b(ranking|clasificaci[óo]n|ordenad[oa]s?\s+por)\b/i,
    ];
    return patterns.some(p => p.test(message));
  }
  
  /**
   * Maneja análisis estadístico inteligente
   * @private
   */
  async _handleSmartAnalysis(context, filters, tableSchema, analysis) {
    const { workspaceId, message, tablesData } = context;
    
    try {
      // Obtener TODOS los datos para análisis (máximo 1000)
      let allRows = await this.tableDataRepository.query(
        workspaceId,
        analysis.tableId,
        filters,
        { limit: 1000 }
      );
      
      if (allRows.length === 0) {
        return { handled: true, response: 'No hay datos disponibles para analizar.' };
      }
      
      const tableName = tableSchema?.name || 'registros';
      const msgLower = message.toLowerCase();
      
      // ═══ ANÁLISIS 1: ¿Quién tiene más/menos? (agrupación) ═══
      // "cliente con más ventas", "producto más vendido"
      const groupPattern = /\b(cliente|producto|categor[íi]a|tipo|vendedor|usuario)\s+(con\s+)?m[aá]s\s+(ventas?|compras?|registros?)/i;
      const groupMatch = message.match(groupPattern);
      
      if (groupMatch || msgLower.includes('más vendido') || msgLower.includes('más ventas')) {
        // Determinar campo de agrupación
        let groupField = 'cliente';
        if (msgLower.includes('producto')) groupField = 'producto';
        else if (msgLower.includes('categoría') || msgLower.includes('categoria')) groupField = 'categoria';
        else if (msgLower.includes('tipo')) groupField = 'tipo';
        
        // Agrupar datos
        const grouped = {};
        for (const row of allRows) {
          const key = row[groupField] || 'Sin asignar';
          if (!grouped[key]) {
            grouped[key] = { count: 0, total: 0, items: [] };
          }
          grouped[key].count++;
          grouped[key].total += parseFloat(row.total || row.cantidad || row.monto || 0);
          grouped[key].items.push(row);
        }
        
        // Ordenar por conteo
        const sorted = Object.entries(grouped)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.count - a.count);
        
        if (sorted.length === 0) {
          return { handled: true, response: 'No pude determinar los datos para el análisis.' };
        }
        
        const top = sorted[0];
        const response = `📊 **Análisis de ${tableName}**\n\n` +
          `🏆 **${groupField.charAt(0).toUpperCase() + groupField.slice(1)} con más registros:**\n` +
          `**${top.name}** con **${top.count}** ${tableName.toLowerCase()}\n\n` +
          `📋 **Top 5:**\n` +
          sorted.slice(0, 5).map((item, i) => 
            `${i + 1}. ${item.name}: ${item.count} (${item.total > 0 ? '$' + item.total.toLocaleString('es-CO') : ''})`
          ).join('\n');
        
        return { handled: true, response };
      }
      
      // ═══ ANÁLISIS 2: Totales y resúmenes ═══
      if (msgLower.includes('total') || msgLower.includes('resumen') || msgLower.includes('cuántos') || msgLower.includes('cuantos')) {
        // Buscar campos numéricos
        const numericFields = (tableSchema?.headers || [])
          .filter(h => h.type === 'number' || h.key === 'total' || h.key === 'cantidad' || h.key === 'precio')
          .map(h => h.key);
        
        let response = `📊 **Resumen de ${tableName}**\n\n`;
        response += `📋 **Total de registros:** ${allRows.length}\n\n`;
        
        // Calcular sumas de campos numéricos
        for (const field of numericFields) {
          const sum = allRows.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0);
          if (sum > 0) {
            const avg = sum / allRows.length;
            const fieldLabel = (tableSchema?.headers?.find(h => h.key === field)?.label || field);
            response += `💰 **${fieldLabel}:**\n`;
            response += `   • Total: $${sum.toLocaleString('es-CO')}\n`;
            response += `   • Promedio: $${avg.toLocaleString('es-CO', { maximumFractionDigits: 0 })}\n\n`;
          }
        }
        
        // Agrupar por campo de estado si existe
        const statusField = (tableSchema?.headers || []).find(h => 
          h.type === 'select' && (h.key.includes('estado') || h.key.includes('status'))
        );
        if (statusField) {
          const byStatus = {};
          for (const row of allRows) {
            const status = row[statusField.key] || 'Sin estado';
            byStatus[status] = (byStatus[status] || 0) + 1;
          }
          response += `📈 **Por ${statusField.label}:**\n`;
          for (const [status, count] of Object.entries(byStatus)) {
            const pct = ((count / allRows.length) * 100).toFixed(1);
            response += `   • ${status}: ${count} (${pct}%)\n`;
          }
        }
        
        return { handled: true, response };
      }
      
      // ═══ ANÁLISIS 3: Por categoría/tipo ═══
      if (msgLower.includes('por categoría') || msgLower.includes('por categoria') || msgLower.includes('por tipo')) {
        const categoryField = (tableSchema?.headers || []).find(h => 
          h.type === 'select' || h.key.includes('categoria') || h.key.includes('tipo')
        );
        
        if (categoryField) {
          const byCategory = {};
          for (const row of allRows) {
            const cat = row[categoryField.key] || 'Sin categoría';
            if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
            byCategory[cat].count++;
            byCategory[cat].total += parseFloat(row.total || row.cantidad || 0);
          }
          
          let response = `📊 **${tableName} por ${categoryField.label}**\n\n`;
          for (const [cat, data] of Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count)) {
            const pct = ((data.count / allRows.length) * 100).toFixed(1);
            response += `• **${cat}**: ${data.count} (${pct}%)`;
            if (data.total > 0) response += ` - $${data.total.toLocaleString('es-CO')}`;
            response += '\n';
          }
          
          return { handled: true, response };
        }
      }
      
      // ═══ FALLBACK: Mostrar estadísticas básicas + datos ═══
      let response = `📊 **${tableName}** - ${allRows.length} registros\n\n`;
      
      // Mostrar los primeros registros formateados
      response += await this._formatResults(context, allRows.slice(0, 10), analysis, {});
      
      return { handled: true, response };
      
    } catch (error) {
      console.error('[QueryHandler] Smart analysis error:', error);
      return { handled: true, response: 'Error al realizar el análisis. Intenta de nuevo.' };
    }
  }
}

export default QueryHandler;
