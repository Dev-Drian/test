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
    
    if (!analysis?.tableId) {
      return {
        handled: true,
        response: 'No pude determinar qué información buscas. ¿Puedes ser más específico?',
      };
    }
    
    try {
      // Obtener schema de la tabla para el parser
      const tableSchema = tables?.find(t => t._id === analysis.tableId);
      
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
        // Excluir campos internos y el campo principal
        if (key.startsWith('_') || key === 'main' || key === 'createdAt' || key === 'updatedAt') continue;
        if (value === mainField) continue;
        if (!value) continue;
        
        const config = configMap[key] || {};
        const emoji = config.emoji || '•';
        const label = config.label || key.charAt(0).toUpperCase() + key.slice(1);
        
        // Formatear valor
        let displayValue = value;
        if (key === 'precio' || config.type === 'currency') {
          displayValue = `$${value}`;
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
