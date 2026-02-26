/**
 * UpdateHandler - Handler para actualizar registros (LLM-First)
 * 
 * El LLM decide cuándo usar update_record.
 * Este handler ejecuta actualizaciones y cancelaciones con confirmación.
 */

import { ActionHandler } from './ActionHandler.js';
import { getEventEmitter, EVENTS } from '../../core/EventEmitter.js';
import { TablePermissions } from '../../services/TablePermissions.js';

export class UpdateHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.eventEmitter = dependencies.eventEmitter || getEventEmitter();
  }
  
  /**
   * Verifica si puede manejar una acción de tipo UPDATE o DELETE
   */
  async canHandle(context) {
    // Si hay confirmación pendiente de update/cancel
    if (context.pendingConfirmation?.action === 'cancel') {
      return true;
    }
    
    const actionType = context.intent?.actionType;
    return actionType === 'update' || actionType === 'delete';
  }
  
  /**
   * Ejecuta la actualización
   */
  async execute(context) {
    const { workspaceId, analysis, pendingConfirmation, message, tables } = context;
    
    // Manejar confirmación pendiente
    if (pendingConfirmation?.action === 'cancel') {
      return this._handleConfirmation(context);
    }
    
    // Verificar permisos de la tabla ANTES de proceder
    const tableId = context.getEffectiveTableId() || analysis?.tableId;
    // Soportar tanto 'id' (de ChatService) como '_id' (de DB directa)
    const targetTable = tables?.find(t => (t.id || t._id) === tableId);
    
    // Verificar si es cancelación/eliminación
    const fieldsToUpdate = analysis?.update?.fieldsToUpdate || {};
    const isCancelacion = (fieldsToUpdate.estado || '').toLowerCase().includes('cancel');
    const actionType = context.intent?.actionType;
    
    // Si es delete o cancelación, verificar permiso de delete
    if (actionType === 'delete' || isCancelacion) {
      const permission = TablePermissions.check(targetTable, 'delete');
      if (!permission.allowed) {
        return {
          handled: true,
          response: permission.reason,
        };
      }
    } else {
      // Es update normal, verificar permiso de update
      const permission = TablePermissions.check(targetTable, 'update');
      if (!permission.allowed) {
        return {
          handled: true,
          response: permission.reason,
        };
      }
    }
    
    if (isCancelacion) {
      return this._askForConfirmation(context);
    }
    
    // Actualización normal
    return this._performUpdate(context);
  }
  
  /**
   * Solicita confirmación antes de cancelar
   */
  async _askForConfirmation(context) {
    const { analysis } = context;
    const searchCriteria = analysis?.update?.searchCriteria || {};
    const fieldsToUpdate = analysis?.update?.fieldsToUpdate || {};
    
    // Buscar info de la cita desde el historial
    const citaInfo = this._extractCitaFromHistory(context);
    if (citaInfo) {
      searchCriteria.mascota = citaInfo.mascota;
    }
    
    // Guardar confirmación pendiente
    context.pendingConfirmation = {
      action: 'cancel',
      tableId: context.getEffectiveTableId(),
      searchCriteria,
      fieldsToUpdate,
      citaInfo,
    };
    context.savePendingState();
    
    // Generar mensaje de confirmación
    const templates = context.agent?.responseTemplates || {};
    let response;
    
    if (templates.cancelConfirm && citaInfo) {
      response = this._processTemplate(templates.cancelConfirm, citaInfo);
    } else {
      response = `⚠️ **¿Estás seguro de cancelar esta cita?**\n\n`;
      if (citaInfo) {
        response += `🐾 ${citaInfo.mascota}\n`;
        response += `📅 ${citaInfo.fecha}\n\n`;
      }
      response += `Responde **Sí** para confirmar o **No** para mantenerla.`;
    }
    
    return {
      handled: true,
      response,
      formatted: true,
    };
  }
  
  /**
   * Maneja la respuesta a la confirmación
   */
  async _handleConfirmation(context) {
    const { message, pendingConfirmation, workspaceId } = context;
    
    const userConfirms = /^(s[ií]|yes|confirmar|ok|dale)$/i.test(message.trim());
    const userDenies = /^(no|cancelar|mantener|dejala)$/i.test(message.trim());
    
    if (userDenies) {
      context.pendingConfirmation = null;
      context.savePendingState();
      
      return {
        handled: true,
        response: '✅ Entendido, la cita se mantiene como estaba. ¿En qué más puedo ayudarte?',
      };
    }
    
    if (userConfirms) {
      const { tableId, searchCriteria, fieldsToUpdate } = pendingConfirmation;
      
      // Ejecutar la actualización
      const updated = await this.tableDataRepository.updateByQuery(
        workspaceId,
        tableId,
        searchCriteria,
        fieldsToUpdate
      );
      
      context.pendingConfirmation = null;
      context.savePendingState();
      
      if (updated) {
        this.eventEmitter.emit(EVENTS.RECORD_UPDATED, {
          workspaceId,
          tableId,
          record: updated,
          changes: fieldsToUpdate,
        });
        
        const templates = context.agent?.responseTemplates || {};
        let response;
        
        if (templates.cancelSuccess) {
          response = this._processTemplate(templates.cancelSuccess, {
            ...updated,
            hora: this._formatTo12Hour(updated.hora),
          });
        } else {
          response = `✅ **Cita cancelada**\n\n`;
          if (updated.mascota) response += `🐾 ${updated.mascota}\n`;
          if (updated.fecha) {
            response += `📅 ${updated.fecha}`;
            if (updated.hora) response += ` a las ${this._formatTo12Hour(updated.hora)}`;
            response += `\n`;
          }
          response += `\nSi necesitas reagendar, avísame.`;
        }
        
        return {
          handled: true,
          response,
          formatted: true,
        };
      } else {
        return {
          handled: true,
          response: 'No encontré una cita con esos datos. ¿Puedes verificar?',
        };
      }
    }
    
    // Respuesta ambigua
    return {
      handled: true,
      response: 'Por favor responde **Sí** para confirmar la cancelación o **No** para mantener la cita.',
    };
  }
  
  /**
   * Ejecuta una actualización normal (no cancelación)
   */
  async _performUpdate(context) {
    const { workspaceId, analysis } = context;
    const tableId = context.getEffectiveTableId();
    
    if (!tableId) {
      return {
        handled: true,
        response: 'No pude determinar qué registro actualizar.',
      };
    }
    
    const searchCriteria = analysis?.update?.searchCriteria || {};
    const fieldsToUpdate = analysis?.update?.fieldsToUpdate || {};
    
    if (Object.keys(searchCriteria).length === 0) {
      return {
        handled: true,
        response: '🔍 Para actualizar el registro, necesito saber cuál. ¿Me puedes dar más detalles?',
      };
    }
    
    const updated = await this.tableDataRepository.updateByQuery(
      workspaceId,
      tableId,
      searchCriteria,
      fieldsToUpdate
    );
    
    if (updated) {
      this.eventEmitter.emit(EVENTS.RECORD_UPDATED, {
        workspaceId,
        tableId,
        record: updated,
        changes: fieldsToUpdate,
      });
      
      return {
        handled: true,
        response: '✅ Registro actualizado correctamente.',
        data: { updated },
      };
    }
    
    return {
      handled: true,
      response: 'No encontré el registro. ¿Puedes verificar los datos?',
    };
  }
  
  /**
   * Extrae información de cita del historial
   */
  _extractCitaFromHistory(context) {
    const messages = context.history.slice(-10);
    
    for (const msg of messages.reverse()) {
      if (msg.role === 'assistant' && msg.content?.includes('Cita agendada')) {
        const mascotaMatch = msg.content.match(/🐾\s*\*?\*?([^*\n]+)/);
        const fechaMatch = msg.content.match(/📅\s*([^\n]+)/);
        
        if (mascotaMatch) {
          return {
            mascota: mascotaMatch[1].trim().replace(/\*+/g, ''),
            fecha: fechaMatch ? fechaMatch[1].trim() : 'N/A',
          };
        }
      }
    }
    
    return null;
  }
  
  _processTemplate(template, context) {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = context[key.trim()];
      return value !== undefined ? value : '';
    });
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

export default UpdateHandler;
