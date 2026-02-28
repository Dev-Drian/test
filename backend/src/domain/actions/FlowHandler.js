/**
 * FlowHandler - Handler para crear flujos/automatizaciones vía chat
 * 
 * Maneja la herramienta create_flow para ayudar a los usuarios
 * a crear automatizaciones conversacionalmente.
 * 
 * @module domain/actions/FlowHandler
 */

import { ActionHandler } from './ActionHandler.js';
import { getFlowAssistant } from '../../services/FlowAssistant.js';
import { getConfirmationManager, CONFIRM_STATUS } from '../../core/ConfirmationManager.js';
import logger from '../../config/logger.js';

const log = logger.child('FlowHandler');

export class FlowHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.flowAssistant = getFlowAssistant();
    this.confirmationManager = getConfirmationManager();
  }

  /**
   * Verifica si este handler puede manejar el contexto
   * @param {Context} context
   * @returns {Promise<boolean>}
   */
  async canHandle(context) {
    return context.selectedTool === 'create_flow';
  }

  /**
   * Ejecuta la acción de creación de flujo
   * @param {Context} context
   * @returns {Promise<object>}
   */
  async execute(context) {
    const args = context.llmExtracted || {};
    const action = args.action || 'analyze';
    const chatId = context.chatId;

    log.info('FlowHandler execute', { action, chatId, args });

    try {
      switch (action) {
        case 'analyze':
        case 'propose':
          return await this._analyzeAndPropose(context, args);
        
        case 'confirm':
          return await this._confirmAndCreate(context);
        
        case 'cancel':
          return await this._cancel(context);
        
        default:
          return await this._analyzeAndPropose(context, args);
      }
    } catch (error) {
      log.error('FlowHandler error', { error: error.message, stack: error.stack });
      return {
        handled: true,
        response: `Lo siento, hubo un error al procesar tu solicitud: ${error.message}`,
      };
    }
  }

  /**
   * Analiza las tablas y propone un flujo
   * @private
   */
  async _analyzeAndPropose(context, args) {
    const userRequest = args.user_request || context.message;
    
    // Obtener tablas del workspace
    const tables = await this.flowAssistant.listTables(context.workspaceId);
    
    if (tables.length === 0) {
      return {
        handled: true,
        response: `No tienes tablas creadas todavía. 

Para crear un flujo de automatización, primero necesitas tener tablas con datos.

¿Quieres que te ayude a **configurar tu sistema** primero? Solo dime qué tipo de negocio tienes (restaurante, clínica, ventas, etc.) y creo las tablas necesarias.`,
      };
    }

    // Generar propuesta de flujo
    const proposal = await this.flowAssistant.generateFlowProposal(
      userRequest,
      tables,
      context.workspaceId
    );

    if (!proposal.success) {
      return {
        handled: true,
        response: proposal.message,
      };
    }

    // Guardar propuesta en confirmación pendiente
    this.confirmationManager.createPending(context.chatId, {
      action: 'create_flow',
      tableName: proposal.table.name,
      data: proposal,
    });

    // Formatear mensaje de propuesta
    const message = this.flowAssistant.formatProposalMessage(proposal);

    return {
      handled: true,
      response: message,
      data: { proposal },
    };
  }

  /**
   * Confirma y crea el flujo
   * @private
   */
  async _confirmAndCreate(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (!pending || pending.action !== 'create_flow') {
      return {
        handled: true,
        response: `No hay ningún flujo pendiente de crear. 

¿Qué automatización te gustaría crear? Por ejemplo:
• "Cuando se cree un usuario, enviar email de bienvenida"
• "Notificar por correo cada nuevo pedido"
• "Cuando cambie el estado de una cita, avisar al cliente"`,
      };
    }

    if (pending.status === CONFIRM_STATUS.EXPIRED) {
      this.confirmationManager.clear(context.chatId);
      return {
        handled: true,
        response: 'La propuesta anterior expiró. ¿Qué flujo te gustaría crear?',
      };
    }

    const proposal = pending.data;

    // Crear el flujo
    const result = await this.flowAssistant.createFlow(proposal, context.workspaceId);
    
    // Limpiar confirmación
    this.confirmationManager.confirm(context.chatId);

    return {
      handled: true,
      response: result.message,
      data: result.success ? { flow: result.flow } : null,
    };
  }

  /**
   * Cancela la creación del flujo
   * @private
   */
  async _cancel(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (pending && pending.action === 'create_flow') {
      this.confirmationManager.cancel(context.chatId);
    }

    return {
      handled: true,
      response: 'Entendido, no crearé el flujo. ¿En qué más puedo ayudarte?',
    };
  }

  /**
   * Formatea respuesta
   */
  async formatResponse(context, result) {
    return result.response;
  }
}

export default FlowHandler;
