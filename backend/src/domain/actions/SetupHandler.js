/**
 * SetupHandler - Handler para configuración asistida de workspaces
 * 
 * Maneja la herramienta setup_workspace para ayudar a los usuarios
 * a configurar tablas y vistas según su tipo de negocio.
 * 
 * @module domain/actions/SetupHandler
 */

import { ActionHandler } from './ActionHandler.js';
import { getSetupAssistant } from '../../services/SetupAssistant.js';
import { getConfirmationManager, CONFIRM_STATUS } from '../../core/ConfirmationManager.js';
import logger from '../../config/logger.js';

const log = logger.child('SetupHandler');

export class SetupHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.setupAssistant = dependencies.setupAssistant || getSetupAssistant({
      tableRepository: this.tableRepository,
      tableDataRepository: this.tableDataRepository,
      viewRepository: dependencies.viewRepository,
    });
    this.confirmationManager = getConfirmationManager();
    this.viewRepository = dependencies.viewRepository;
  }

  /**
   * Verifica si este handler puede manejar el contexto
   * @param {Context} context
   * @returns {Promise<boolean>}
   */
  async canHandle(context) {
    return context.selectedTool === 'setup_workspace';
  }

  /**
   * Ejecuta la acción de configuración
   * @param {Context} context
   * @returns {Promise<object>}
   */
  async execute(context) {
    const args = context.llmExtracted || {};
    const action = args.action || 'generate_plan';
    const chatId = context.chatId;

    log.info('SetupHandler execute', { action, chatId, args });

    try {
      switch (action) {
        case 'generate_plan':
          return await this._generatePlan(context, args);
        
        case 'confirm':
          return await this._confirmPlan(context);
        
        case 'modify':
          return await this._modifyPlan(context, args);
        
        case 'cancel':
          return await this._cancelPlan(context);
        
        default:
          return await this._generatePlan(context, args);
      }
    } catch (error) {
      log.error('SetupHandler error', { error: error.message, stack: error.stack });
      return {
        handled: true,
        response: `Lo siento, hubo un error al procesar tu solicitud: ${error.message}`,
      };
    }
  }

  /**
   * Genera un plan de configuración
   * @private
   */
  async _generatePlan(context, args) {
    const message = args.user_request || context.message;
    
    // Generar plan con el asistente
    const plan = await this.setupAssistant.generateSetupPlan(message, {
      tables: context.tables || [],
      workspaceId: context.workspaceId,
    });

    if (!plan.success) {
      return {
        handled: true,
        response: plan.message,
      };
    }

    // Guardar plan en confirmación pendiente
    this.confirmationManager.createPending(context.chatId, {
      action: 'setup_workspace',
      tableName: plan.templateName,
      data: plan,
    });

    // Formatear mensaje
    const message_response = this.setupAssistant.formatPlanMessage(plan);
    
    return {
      handled: true,
      response: message_response,
      data: { plan },
    };
  }

  /**
   * Confirma y ejecuta el plan
   * @private
   */
  async _confirmPlan(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (!pending || pending.action !== 'setup_workspace') {
      return {
        handled: true,
        response: 'No hay ninguna configuración pendiente. ¿Qué tipo de sistema necesitas?',
      };
    }

    if (pending.status === CONFIRM_STATUS.EXPIRED) {
      this.confirmationManager.clear(context.chatId);
      return {
        handled: true,
        response: 'La configuración anterior expiró. ¿Qué tipo de sistema necesitas?',
      };
    }

    const plan = pending.data;
    
    // Configurar repositorios si no están
    if (!this.setupAssistant.tableRepo) {
      this.setupAssistant.tableRepo = this.tableRepository;
      this.setupAssistant.tableDataRepo = this.tableDataRepository;
      this.setupAssistant.viewRepo = this.viewRepository;
    }

    // Ejecutar plan
    const results = await this.setupAssistant.executePlan(plan, context.workspaceId);
    
    // Limpiar confirmación
    this.confirmationManager.confirm(context.chatId);
    
    // Formatear resultados
    const message_response = this.setupAssistant.formatResultsMessage(results);
    
    return {
      handled: true,
      response: message_response,
      data: { results },
    };
  }

  /**
   * Modifica el plan pendiente
   * @private
   */
  async _modifyPlan(context, args) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (!pending || pending.action !== 'setup_workspace') {
      return {
        handled: true,
        response: 'No hay ninguna configuración pendiente para modificar. ¿Qué tipo de sistema necesitas?',
      };
    }

    const modification = args.modification || context.message;
    
    // Por ahora, regenerar el plan con la modificación
    // TODO: Implementar modificaciones parciales con LLM
    const response = `Entendido. ${modification}\n\nPor ahora, te sugiero que:\n1. Confirmes el plan actual con "sí"\n2. Luego puedes modificar directamente las tablas desde la interfaz\n\n¿Quieres continuar con el plan original o prefieres empezar de nuevo?`;
    
    return {
      handled: true,
      response,
    };
  }

  /**
   * Cancela el plan pendiente
   * @private
   */
  async _cancelPlan(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (pending && pending.action === 'setup_workspace') {
      this.confirmationManager.cancel(context.chatId);
    }
    
    return {
      handled: true,
      response: 'Configuración cancelada. ¿En qué más puedo ayudarte?',
    };
  }

  /**
   * Formatea respuesta
   */
  async formatResponse(context, result) {
    return result.response;
  }
}

export default SetupHandler;
