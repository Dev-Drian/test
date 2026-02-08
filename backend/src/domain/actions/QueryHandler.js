/**
 * QueryHandler - Handler para consultas de datos
 * 
 * Maneja consultas como:
 * - Ver servicios/precios
 * - Listar citas
 * - Buscar registros
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';

export class QueryHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
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
    const { workspaceId, analysis } = context;
    
    if (!analysis?.tableId) {
      return {
        handled: true,
        response: 'No pude determinar qué información buscas. ¿Puedes ser más específico?',
      };
    }
    
    try {
      const rows = await this.tableDataRepository.query(
        workspaceId,
        analysis.tableId,
        analysis.query?.filters || {},
        {
          limit: analysis.query?.limit || 10,
          sort: analysis.query?.sortBy ? [{ [analysis.query.sortBy]: analysis.query.sortOrder || 'desc' }] : undefined,
        }
      );
      
      this.eventEmitter.emit(EVENTS.RECORD_QUERIED, {
        workspaceId,
        tableId: analysis.tableId,
        count: rows.length,
      });
      
      if (rows.length === 0) {
        return {
          handled: true,
          response: 'No se encontraron resultados.',
        };
      }
      
      // Formatear resultados dinámicamente
      const response = await this._formatResults(context, rows, analysis);
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { rows },
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
   * Formatea los resultados de la consulta
   */
  async _formatResults(context, rows, analysis) {
    // Obtener configuración de campos de la tabla
    const fieldsConfig = await this.tableRepository.getFieldsConfig(
      context.workspaceId,
      analysis.tableId
    );
    
    const configMap = {};
    fieldsConfig.forEach(fc => {
      configMap[fc.key] = fc;
    });
    
    let response = `📋 Encontré ${rows.length} resultado(s):\n\n`;
    
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
