/**
 * AvailabilityHandler - Handler para consultas de disponibilidad
 * 
 * Maneja preguntas como:
 * - ¿Hay disponibilidad mañana?
 * - ¿Qué horarios hay libres?
 * - ¿Pueden atenderme el viernes?
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
    const { workspaceId, analysis } = context;
    
    // Buscar tabla de citas en tablesInfo
    const citasTable = context.tablesInfo.find(t => 
      t.name?.toLowerCase().includes('cita') || t.type === 'appointments'
    );
    
    if (!citasTable) {
      return {
        handled: true,
        response: 'No encontré una tabla de citas para verificar disponibilidad.',
      };
    }
    
    // Obtener fecha a consultar (default: mañana)
    const fecha = analysis?.fecha || context.getTomorrow();
    
    try {
      const availability = await this.tableDataRepository.checkAvailability(
        workspaceId,
        citasTable._id,
        { fecha }
      );
      
      this.eventEmitter.emit(EVENTS.AVAILABILITY_CHECKED, {
        workspaceId,
        fecha,
        slotsAvailable: availability.libres.length,
      });
      
      const response = this._formatAvailabilityResponse(availability, analysis);
      
      // Si hay pendingCreate activo, recordar al usuario
      if (context.pendingCreate) {
        const reminder = this._buildPendingReminder(context);
        if (reminder) {
          return {
            handled: true,
            response: response + reminder,
            formatted: true,
          };
        }
      }
      
      return {
        handled: true,
        response,
        formatted: true,
        data: { availability },
      };
      
    } catch (error) {
      console.error('[AvailabilityHandler] Error:', error);
      return {
        handled: true,
        response: 'Error al consultar disponibilidad. Intenta de nuevo.',
      };
    }
  }
  
  /**
   * Formatea la respuesta de disponibilidad
   */
  _formatAvailabilityResponse(availability, params) {
    const { fecha, totalCitas, libres, ocupados } = availability;
    
    // Formatear fecha legible
    const fechaLegible = this._formatDate(fecha);
    
    let response = `**📅 Disponibilidad para ${fechaLegible}**\n\n`;
    
    if (libres.length === 0) {
      response += 'No hay horarios disponibles para esa fecha.\n\n';
      response += '¿Quieres que busque disponibilidad para otro día?';
      return response;
    }
    
    // Mostrar horarios disponibles (máx 8)
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
  
  /**
   * Construye recordatorio si hay pendingCreate
   */
  _buildPendingReminder(context) {
    if (!context.pendingCreate) return null;
    
    const missingFields = context.missingFields;
    if (missingFields.length === 0) return null;
    
    return `\n\n---\n📋 **Continuando con tu cita...**\n¿${missingFields[0]}?`;
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
