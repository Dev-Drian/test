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
      const llmFilters = this._normalizeFilters(analysis.query?.filters || {}, tableSchema);
      console.log('[QueryHandler] LLM filters normalized:', JSON.stringify(llmFilters, null, 2));
      
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
      
      // Si es agregación, manejar diferente
      if (parsedQuery.aggregation) {
        return await this._handleAggregation(context, combinedFilters, parsedQuery.aggregation);
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
      for (const [key, value] of Object.entries(row)) {
        // Excluir campos internos, IDs, y metadatos
        if (key.startsWith('_') || key === 'id' || key === 'main' || key === 'tableId' || key === 'createdAt' || key === 'updatedAt') continue;
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
}

export default QueryHandler;
