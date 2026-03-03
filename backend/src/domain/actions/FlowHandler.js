/**
 * FlowHandler - Handler para crear flujos/automatizaciones vía chat
 * 
 * Maneja la herramienta create_flow para ayudar a los usuarios
 * a crear automatizaciones conversacionalmente.
 * 
 * ACTUALIZADO: Ahora usa SmartFlowAssistant que:
 * - Lee plantillas globales de la BD
 * - Usa GPT-4o para recomendar la mejor plantilla
 * - Si no hay plantilla adecuada, genera flujo personalizado
 * 
 * @module domain/actions/FlowHandler
 */

import { ActionHandler } from './ActionHandler.js';
import { getSmartFlowAssistant } from '../../services/SmartFlowAssistant.js';
import { getConfirmationManager, CONFIRM_STATUS } from '../../core/ConfirmationManager.js';
import logger from '../../config/logger.js';

const log = logger.child('FlowHandler');

export class FlowHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.smartAssistant = getSmartFlowAssistant();
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
   * Analiza las tablas y propone un flujo usando SmartFlowAssistant
   * @private
   */
  async _analyzeAndPropose(context, args) {
    const userRequest = args.user_request || context.message;
    
    // Obtener info del usuario/workspace para filtrar plantillas
    const userPlan = context.agent?.plan || 'free';
    const businessType = context.businessInfo?.type || 'general';

    // Usar SmartFlowAssistant para analizar y proponer
    const proposal = await this.smartAssistant.analyzeAndPropose(
      userRequest,
      context.workspaceId,
      { userPlan, businessType }
    );

    if (!proposal.success) {
      return {
        handled: true,
        response: proposal.message,
      };
    }

    // Determinar tabla a usar
    const tableName = proposal.type === 'template' 
      ? proposal.suggestedTable || proposal.recommendation?.suggestedTable
      : proposal.customFlow?.mainTable;

    // Guardar propuesta en confirmación pendiente
    this.confirmationManager.createPending(context.chatId, {
      action: 'create_flow',
      tableName: tableName,
      data: proposal,
      userRequest: userRequest, // Guardar para personalización
    });

    return {
      handled: true,
      response: proposal.message,
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
    const userRequest = pending.userRequest || '';

    // Buscar el ID de la tabla sugerida
    let tableId = null;
    if (proposal.tables && proposal.suggestedTable) {
      const table = proposal.tables.find(t => 
        t.name.toLowerCase() === proposal.suggestedTable?.toLowerCase()
      );
      tableId = table?._id;
    }

    // Crear el flujo usando SmartFlowAssistant
    const result = await this.smartAssistant.createFlow(
      proposal, 
      context.workspaceId,
      tableId,
      userRequest
    );
    
    // Limpiar confirmación
    this.confirmationManager.clear(context.chatId);

    return {
      handled: true,
      response: result.message,
      data: result.success ? { 
        flow: result.flow,
        flowCreated: result.flowCreated, // Para que el frontend pueda detectarlo
      } : null,
    };
  }

  /**
   * Cancela la creación del flujo
   * @private
   */
  async _cancel(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (pending && pending.action === 'create_flow') {
      this.confirmationManager.clear(context.chatId);
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
