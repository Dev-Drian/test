/**
 * AvailabilityHandler - Handler para consultas de disponibilidad (LLM-First)
 * 
 * El LLM decide cuándo usar check_availability.
 * Este handler ejecuta la consulta de horarios/espacios disponibles.
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';

export class AvailabilityHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
  }
  
  /**
   * Verifica si puede manejar una consulta de disponibilidad
   */
  async canHandle(context) {
    return context.intent?.actionType === 'availability';
  }
  
  /**
   * Ejecuta la consulta de disponibilidad
   */
  async execute(context) {
    const { workspaceId, analysis, tablesInfo } = context;
    
    // V3: El tableId ya viene resuelto desde Engine._mapToolArgsToContext()
    const tableId = analysis?.tableId;
    const targetTable = tableId ? tablesInfo?.find(t => t._id === tableId) : null;
    
    // Si no hay tableId, el LLM no pudo determinar la tabla → preguntar
    if (!targetTable) {
      const tableNames = tablesInfo?.map(t => t.name).join(', ') || 'ninguna';
      return {
        handled: true,
        response: `¿Sobre qué quieres consultar disponibilidad? Las tablas disponibles son: ${tableNames}`,
      };
    }
    
    // Determinar si es tabla de citas/horarios o tabla general
    const isAppointmentTable = this._isAppointmentTable(targetTable);
    
    if (isAppointmentTable) {
      return this._handleAppointmentAvailability(context, targetTable);
    } else {
      return this._handleGeneralAvailability(context, targetTable);
    }
  }
  
  /**
   * Determina si una tabla es de citas/horarios basándose en su estructura
   * Detección dinámica por tipo de tabla y campos
   */
  _isAppointmentTable(table) {
    // 1. Por tipo explícito de tabla
    if (table.type === 'calendar' || table.type === 'appointments') {
      return true;
    }
    
    // 2. Por estructura de campos - buscar combinación fecha + hora
    const headers = table.headers || [];
    const fieldTypes = headers.map(h => ({
      type: (h.type || '').toLowerCase(),
      key: (h.key || h.label || '').toLowerCase()
    }));
    
    const hasDateField = fieldTypes.some(f => 
      f.type === 'date' || f.type === 'datetime' || 
      f.key.includes('fecha') || f.key.includes('date')
    );
    
    const hasTimeField = fieldTypes.some(f => 
      f.type === 'time' || 
      f.key.includes('hora') || f.key.includes('time')
    );
    
    // Si tiene fecha Y hora, es probable que sea de citas
    return hasDateField && hasTimeField;
  }
  
  /**
   * Maneja disponibilidad para tablas de citas
   */
  async _handleAppointmentAvailability(context, table) {
    const { workspaceId, analysis } = context;
    const fecha = analysis?.fecha || context.getTomorrow?.() || new Date().toISOString().split('T')[0];
    
    try {
      const availability = await this.tableDataRepository.checkAvailability(
        workspaceId,
        table._id,
        { fecha }
      );
      
      this.eventEmitter.emit(EVENTS.AVAILABILITY_CHECKED, {
        workspaceId,
        fecha,
        slotsAvailable: availability.libres?.length || 0,
      });
      
      return {
        handled: true,
        response: this._formatAppointmentResponse(availability, table.name),
        formatted: true,
        data: { availability },
      };
    } catch (error) {
      console.error('[AvailabilityHandler] Error checking appointments:', error);
      return {
        handled: true,
        response: 'Error al consultar disponibilidad de citas. Intenta de nuevo.',
      };
    }
  }
  
  /**
   * Maneja disponibilidad para tablas generales (productos, servicios, etc.)
   */
  async _handleGeneralAvailability(context, table) {
    const { workspaceId, analysis } = context;
    
    try {
      // Obtener registros de la tabla
      const filters = analysis?.query?.filters || {};
      const limit = analysis?.query?.limit || 20;
      
      const rows = await this.tableDataRepository.query(
        workspaceId,
        table._id,
        filters,
        { limit }
      );
      
      if (!rows || rows.length === 0) {
        return {
          handled: true,
          response: `No hay registros en **${table.name}** actualmente.`,
        };
      }
      
      // Formatear respuesta con los datos
      const response = this._formatGeneralResponse(rows, table);
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { rows, count: rows.length },
      };
    } catch (error) {
      console.error('[AvailabilityHandler] Error querying table:', error);
      return {
        handled: true,
        response: `Error al consultar ${table.name}. Intenta de nuevo.`,
      };
    }
  }
  
  /**
   * Formatea respuesta para tablas generales
   */
  _formatGeneralResponse(rows, table) {
    const tableName = table.name || 'registros';
    const headers = table.headers || [];
    
    let response = `**📋 ${tableName} disponibles (${rows.length})**\n\n`;
    
    // Determinar campos principales a mostrar
    const displayFields = this._getDisplayFields(headers, rows[0]);
    
    rows.slice(0, 10).forEach((row, idx) => {
      const values = displayFields
        .map(f => {
          const val = row[f.key] || row[f.label] || '';
          if (f.key === 'precio' || f.label?.toLowerCase().includes('precio')) {
            return `$${Number(val).toLocaleString()}`;
          }
          return val;
        })
        .filter(v => v)
        .join(' | ');
      
      response += `${idx + 1}. ${values}\n`;
    });
    
    if (rows.length > 10) {
      response += `\n... y ${rows.length - 10} más.`;
    }
    
    response += `\n\n💡 Puedo darte más detalles de cualquiera. Solo pregunta.`;
    
    return response;
  }
  
  /**
   * Obtiene los campos más relevantes para mostrar
   */
  _getDisplayFields(headers, sampleRow) {
    if (!headers || headers.length === 0) {
      // Si no hay headers, usar las keys del primer row
      if (sampleRow) {
        const keys = Object.keys(sampleRow)
          .filter(k => !k.startsWith('_') && k !== 'tableId' && k !== 'createdAt' && k !== 'updatedAt');
        return keys.slice(0, 4).map(k => ({ key: k, label: k }));
      }
      return [];
    }
    
    // Priorizar campos: nombre, titulo, descripcion, precio, categoria
    const priorityKeys = ['nombre', 'name', 'titulo', 'title', 'descripcion', 'precio', 'price', 'categoria', 'category'];
    const sorted = [...headers].sort((a, b) => {
      const aKey = (a.key || a.label || '').toLowerCase();
      const bKey = (b.key || b.label || '').toLowerCase();
      const aIdx = priorityKeys.findIndex(p => aKey.includes(p));
      const bIdx = priorityKeys.findIndex(p => bKey.includes(p));
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    
    return sorted.slice(0, 4);
  }
  
  /**
   * Formatea respuesta de disponibilidad de citas
   */
  _formatAppointmentResponse(availability, tableName) {
    const { fecha, totalCitas, libres, ocupados } = availability;
    const fechaLegible = this._formatDate(fecha);
    
    let response = `**📅 Disponibilidad para ${fechaLegible}**\n\n`;
    
    if (!libres || libres.length === 0) {
      response += 'No hay horarios disponibles para esa fecha.\n\n';
      response += '¿Quieres que busque disponibilidad para otro día?';
      return response;
    }
    
    const horariosDisplay = libres.slice(0, 8).map(h => this._formatTo12Hour(h)).join(', ');
    response += `**Horarios disponibles:** ${horariosDisplay}`;
    
    if (libres.length > 8) {
      response += ` (+${libres.length - 8} más)`;
    }
    
    response += '\n';
    
    if (totalCitas > 0) {
      response += `\nCitas agendadas ese día: ${totalCitas}`;
    }
    
    response += `\n\n💡 Para agendar, dime la hora y el servicio que necesitas.`;
    
    return response;
  }
  
  _formatDate(dateStr) {
    if (!dateStr) return dateStr;
    try {
      const date = new Date(dateStr + 'T12:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dias[date.getDay()]} ${date.getDate()} de ${meses[date.getMonth()]}`;
    } catch {
      return dateStr;
    }
  }
  
  _formatTo12Hour(time24) {
    if (!time24 || typeof time24 !== 'string') return time24;
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    
    return `${hours}:${minutes} ${ampm}`;
  }
}

export default AvailabilityHandler;
