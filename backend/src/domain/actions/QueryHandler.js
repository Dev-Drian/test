/**
 * QueryHandler - Handler para consultas de datos
 * 
 * Maneja consultas como:
 * - Ver servicios/precios
 * - Listar citas
 * - Buscar registros
 * - "mis ventas del último mes"
 * - "citas de esta semana"
 * - "ventas mayores a 100000"
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
   * V2: Calcula score de confianza para este handler
   * @param {Context} context 
   * @returns {Promise<number>} Score 0-1
   */
  async confidence(context) {
    let score = 0;
    const intent = context.intent || {};
    const message = (context.message || '').toLowerCase();
    
    // Factor 1: Intent del LLM es query/search
    if (intent.actionType === 'query' || intent.actionType === 'search') {
      const intentScore = (intent.confidence || 0) / 100;
      score += intentScore * 0.5;
    }
    
    // Factor 2: Es pregunta (signos de interrogación)
    if (message.includes('?') || message.startsWith('¿')) {
      score += 0.2;
    }
    
    // Factor 3: Keywords de consulta
    const queryKeywords = ['ver', 'mostrar', 'listar', 'buscar', 'consultar', 'cuáles', 'cuántos', 'dame', 'dime', 'qué'];
    const keywordMatches = queryKeywords.filter(kw => message.includes(kw)).length;
    score += Math.min(keywordMatches * 0.1, 0.25);
    
    // Factor 4: Penalización si hay pendingCreate activo
    if (context.pendingCreate) {
      // Solo penalizar si el intent no es query con alta confianza
      if (intent.actionType !== 'query' || (intent.confidence || 0) < 70) {
        score -= 0.2;
      }
    }
    
    // Factor 5: Palabras de tiempo/periodo aumentan score
    const timeKeywords = ['hoy', 'mañana', 'ayer', 'semana', 'mes', 'año', 'últimos', 'últimas'];
    const timeMatches = timeKeywords.filter(kw => message.includes(kw)).length;
    if (timeMatches > 0) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
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
   * 
   * V3 LLM-First: El Engine ya resolvió tableId en _mapToolArgsToContext()
   * No necesitamos fallbacks con keywords - el LLM entiende semánticamente
   */
  async execute(context) {
    const { workspaceId, analysis, message, tables } = context;
    
    // V3: El tableId ya viene resuelto desde Engine._mapToolArgsToContext()
    const tableId = analysis?.tableId;
    // Soportar tanto 'id' (de ChatService) como '_id' (de DB directa)
    const tableSchema = tableId ? tables?.find(t => (t.id || t._id) === tableId) : null;
    
    // Si no hay tableId, el LLM no pudo determinar la tabla → preguntar
    if (!tableId || !tableSchema) {
      const tableNames = tables?.map(t => t.name).join(', ') || 'ninguna';
      return {
        handled: true,
        response: `¿Sobre qué tabla quieres consultar? Las disponibles son: ${tableNames}`,
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
      
      // Combinar filtros del LLM con los del QueryParser
      let combinedFilters = {
        ...(analysis.query?.filters || {}),
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
      
      const rows = await this.tableDataRepository.query(
        workspaceId,
        analysis.tableId,
        combinedFilters,
        { limit, sort }
      );
      
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
        if (key === 'precio' || fieldConfig.type === 'currency' || fieldConfig.type === 'number') {
          displayValue = `$${Number(value).toLocaleString('es-CO')}`;
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
