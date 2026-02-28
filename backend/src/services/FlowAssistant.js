/**
 * FlowAssistant - Asistente para crear flujos automáticamente
 * 
 * El bot puede:
 * - Analizar las tablas del workspace
 * - Proponer flujos basados en lo que el usuario pide
 * - Crear flujos automáticamente con nodos y acciones
 * 
 * @module services/FlowAssistant
 */

import { v4 as uuidv4 } from 'uuid';
import { OpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { connectDB, getFlowsDbName, getTableDbName } from '../config/db.js';
import logger from '../config/logger.js';

const log = logger.child('FlowAssistant');

/**
 * Templates de flujos comunes
 */
const FLOW_TEMPLATES = {
  // Notificación por email después de crear registro
  notifyOnCreate: {
    name: 'Notificar al crear {{tableName}}',
    description: 'Envía un email cuando se crea un nuevo registro',
    trigger: 'afterCreate',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo registro',
          trigger: 'afterCreate',
          triggerTable: '{{tableId}}',
          triggerTableName: '{{tableName}}',
          description: 'Cuando se crea un nuevo {{tableName}}',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Enviar Email',
          actionType: 'sendEmail',
          to: '{{emailField}}',
          subject: 'Bienvenido - Nuevo registro creado',
          body: 'Hola {{nombreField}},\n\nTu registro ha sido creado exitosamente.\n\nSaludos.',
          description: 'Envía email de notificación',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
    ],
  },
  
  // Notificación al actualizar estado
  notifyOnStatusChange: {
    name: 'Notificar cambio de estado en {{tableName}}',
    description: 'Envía un email cuando cambia el estado de un registro',
    trigger: 'afterUpdate',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Registro actualizado',
          trigger: 'afterUpdate',
          triggerTable: '{{tableId}}',
          triggerTableName: '{{tableName}}',
          watchFields: ['estado', 'status'],
          description: 'Cuando se actualiza {{tableName}}',
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: '¿Cambió el estado?',
          field: 'estado',
          operator: 'changed',
          description: 'Verifica si el estado cambió',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 300 },
        data: {
          label: 'Enviar Email',
          actionType: 'sendEmail',
          to: '{{emailField}}',
          subject: 'Tu estado ha cambiado',
          body: 'Hola,\n\nTu estado ha sido actualizado a: {{estado}}.\n\nSaludos.',
          description: 'Notifica el cambio',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'action-1', sourceHandle: 'yes' },
    ],
  },
  
  // Crear registro relacionado
  createRelatedRecord: {
    name: 'Crear {{targetTable}} al crear {{tableName}}',
    description: 'Crea automáticamente un registro en otra tabla',
    trigger: 'afterCreate',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo {{tableName}}',
          trigger: 'afterCreate',
          triggerTable: '{{tableId}}',
          triggerTableName: '{{tableName}}',
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Crear {{targetTable}}',
          actionType: 'createRecord',
          targetTable: '{{targetTableId}}',
          targetTableName: '{{targetTable}}',
          fieldMappings: {},
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'action-1' },
    ],
  },
};

/**
 * Palabras clave para detectar campos de email
 */
const EMAIL_FIELD_KEYWORDS = ['email', 'correo', 'mail', 'gmail', 'e-mail'];

/**
 * Palabras clave para detectar campos de nombre
 */
const NAME_FIELD_KEYWORDS = ['nombre', 'name', 'usuario', 'cliente', 'paciente'];

/**
 * Clase principal del asistente de flujos
 */
class FlowAssistant {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || new OpenAIProvider();
  }

  /**
   * Analiza las tablas del workspace y encuentra la mejor coincidencia
   * @param {string} workspaceId 
   * @param {string} targetTableName - Nombre de tabla que busca el usuario (ej: "usuarios")
   * @returns {Promise<object|null>}
   */
  async findTable(workspaceId, targetTableName) {
    try {
      const db = await connectDB(getTableDbName(workspaceId));
      const result = await db.find({
        selector: {},
        limit: 50,
      });

      const tables = result.docs || [];
      
      if (tables.length === 0) {
        return null;
      }

      // Normalizar nombre buscado
      const searchTerms = targetTableName.toLowerCase().split(/\s+/);
      
      // Buscar coincidencia exacta o parcial
      let bestMatch = null;
      let bestScore = 0;

      for (const table of tables) {
        const tableName = (table.name || '').toLowerCase();
        let score = 0;

        // Coincidencia exacta
        if (tableName === targetTableName.toLowerCase()) {
          score = 100;
        }
        // Coincidencia parcial
        else {
          for (const term of searchTerms) {
            if (tableName.includes(term)) {
              score += 30;
            }
            // Sinónimos comunes
            if (term === 'usuarios' && (tableName.includes('user') || tableName.includes('cliente'))) {
              score += 25;
            }
            if (term === 'clientes' && (tableName.includes('client') || tableName.includes('usuario'))) {
              score += 25;
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = table;
        }
      }

      return bestScore >= 25 ? bestMatch : null;
    } catch (error) {
      log.error('Error finding table', { error: error.message });
      return null;
    }
  }

  /**
   * Detecta campos de email y nombre en una tabla
   * @param {object} table 
   * @returns {object}
   */
  detectTableFields(table) {
    const headers = table.headers || [];
    const result = {
      emailField: null,
      nombreField: null,
      allFields: headers.map(h => h.key || h.label),
    };

    for (const header of headers) {
      const key = (header.key || header.label || '').toLowerCase();
      
      // Detectar campo de email
      if (!result.emailField) {
        for (const keyword of EMAIL_FIELD_KEYWORDS) {
          if (key.includes(keyword) || header.type === 'email') {
            result.emailField = header.key || header.label;
            break;
          }
        }
      }

      // Detectar campo de nombre
      if (!result.nombreField) {
        for (const keyword of NAME_FIELD_KEYWORDS) {
          if (key.includes(keyword)) {
            result.nombreField = header.key || header.label;
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Genera una propuesta de flujo basada en la solicitud del usuario
   * @param {string} userRequest - Lo que el usuario pidió
   * @param {object[]} tables - Tablas disponibles
   * @param {string} workspaceId
   * @returns {Promise<object>}
   */
  async generateFlowProposal(userRequest, tables, workspaceId) {
    const lowerRequest = userRequest.toLowerCase();
    
    // 1. Detectar tipo de flujo solicitado
    let flowType = 'notifyOnCreate';
    let targetAction = 'email';
    
    if (lowerRequest.includes('actualiz') || lowerRequest.includes('cambio') || lowerRequest.includes('estado')) {
      flowType = 'notifyOnStatusChange';
    } else if (lowerRequest.includes('crear') && lowerRequest.includes('en otra')) {
      flowType = 'createRelatedRecord';
    }
    
    // 2. Detectar tabla mencionada
    let detectedTable = null;
    const tableKeywords = ['usuario', 'cliente', 'paciente', 'producto', 'pedido', 'cita', 'reserva'];
    
    for (const keyword of tableKeywords) {
      if (lowerRequest.includes(keyword)) {
        detectedTable = await this.findTable(workspaceId, keyword);
        if (detectedTable) break;
      }
    }

    // Si no encontró por keywords, buscar en tablas existentes
    if (!detectedTable && tables.length > 0) {
      // Intentar con LLM para detectar la tabla correcta
      const tableNames = tables.map(t => t.name);
      const prompt = `El usuario quiere: "${userRequest}"
      
Tablas disponibles: ${tableNames.join(', ')}

¿Cuál tabla es la más relevante? Responde SOLO con el nombre exacto de la tabla.`;

      try {
        const response = await this.aiProvider.chat({
          systemPrompt: 'Eres un asistente que identifica tablas. Responde solo con el nombre de la tabla.',
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4o-mini',
        });
        
        const suggestedName = response.trim();
        detectedTable = tables.find(t => 
          t.name.toLowerCase() === suggestedName.toLowerCase() ||
          t.name.toLowerCase().includes(suggestedName.toLowerCase())
        );
      } catch (e) {
        log.warn('LLM table detection failed', { error: e.message });
      }
    }

    // Si aún no hay tabla, usar la primera disponible
    if (!detectedTable && tables.length > 0) {
      detectedTable = tables[0];
    }

    if (!detectedTable) {
      return {
        success: false,
        message: 'No encontré ninguna tabla en tu workspace. ¿Ya has creado tablas? Puedo ayudarte a crear una primero.',
      };
    }

    // 3. Detectar campos de la tabla
    const fields = this.detectTableFields(detectedTable);

    // 4. Generar propuesta
    const template = FLOW_TEMPLATES[flowType];
    const proposal = {
      success: true,
      flowType,
      table: {
        id: detectedTable._id,
        name: detectedTable.name,
        fields: fields.allFields,
      },
      detectedFields: fields,
      template: template.name.replace('{{tableName}}', detectedTable.name),
      description: template.description,
      trigger: template.trigger,
      action: targetAction,
      needsEmailField: !fields.emailField && targetAction === 'email',
    };

    return proposal;
  }

  /**
   * Formatea la propuesta como mensaje para el usuario
   * @param {object} proposal 
   * @returns {string}
   */
  formatProposalMessage(proposal) {
    if (!proposal.success) {
      return proposal.message;
    }

    let msg = `📋 **Analicé tus tablas y encontré:** "${proposal.table.name}"\n\n`;
    msg += `**Campos disponibles:** ${proposal.table.fields.join(', ')}\n\n`;
    
    msg += `---\n\n`;
    msg += `🔄 **Flujo propuesto:** ${proposal.template}\n\n`;
    msg += `• **Trigger:** Cuando se crea un nuevo registro en "${proposal.table.name}"\n`;
    
    if (proposal.action === 'email') {
      if (proposal.detectedFields.emailField) {
        msg += `• **Acción:** Enviar email a \`${proposal.detectedFields.emailField}\`\n`;
      } else {
        msg += `• **Acción:** Enviar email\n`;
        msg += `\n⚠️ _No encontré un campo de email en tu tabla. Necesitarás agregarlo o especificar a qué dirección enviar._\n`;
      }
    }

    msg += `\n---\n\n`;
    msg += `¿Quieres que **proceda a crear este flujo**? Responde:\n`;
    msg += `• **"Sí, créalo"** - Lo creo automáticamente\n`;
    msg += `• **"Modificar"** - Si quieres cambiar algo primero\n`;
    msg += `• **"Cancelar"** - Para no crear nada`;

    return msg;
  }

  /**
   * Crea el flujo en la base de datos
   * @param {object} proposal 
   * @param {string} workspaceId 
   * @returns {Promise<object>}
   */
  async createFlow(proposal, workspaceId) {
    try {
      const template = FLOW_TEMPLATES[proposal.flowType];
      const flowId = uuidv4();

      // Procesar nodos reemplazando placeholders
      const nodes = JSON.parse(JSON.stringify(template.nodes));
      const edges = JSON.parse(JSON.stringify(template.edges));

      for (const node of nodes) {
        // Reemplazar placeholders en data
        if (node.data) {
          for (const key of Object.keys(node.data)) {
            if (typeof node.data[key] === 'string') {
              node.data[key] = node.data[key]
                .replace(/\{\{tableId\}\}/g, proposal.table.id)
                .replace(/\{\{tableName\}\}/g, proposal.table.name)
                .replace(/\{\{emailField\}\}/g, proposal.detectedFields.emailField || 'email')
                .replace(/\{\{nombreField\}\}/g, proposal.detectedFields.nombreField || 'nombre');
            }
          }
        }
      }

      const flow = {
        _id: flowId,
        name: proposal.template,
        description: proposal.description,
        mainTable: proposal.table.id,
        trigger: proposal.trigger,
        isActive: true,
        nodes,
        edges,
        connections: [],
        rules: [],
        createdBy: 'assistant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const db = await connectDB(getFlowsDbName(workspaceId));
      await db.insert(flow);

      log.info('Flow created by assistant', { flowId, name: flow.name, workspaceId });

      return {
        success: true,
        flow,
        message: `✅ **¡Flujo creado exitosamente!**\n\n• **Nombre:** ${flow.name}\n• **Trigger:** ${flow.trigger}\n• **Estado:** Activo\n\nPuedes ver y editar el flujo en la sección **Automatizar** del menú.\n\n¿Necesitas crear otro flujo o algo más?`,
      };
    } catch (error) {
      log.error('Error creating flow', { error: error.message });
      return {
        success: false,
        message: `Lo siento, hubo un error al crear el flujo: ${error.message}`,
      };
    }
  }

  /**
   * Lista todas las tablas del workspace
   * @param {string} workspaceId 
   * @returns {Promise<object[]>}
   */
  async listTables(workspaceId) {
    try {
      const db = await connectDB(getTableDbName(workspaceId));
      const result = await db.find({
        selector: {},
        limit: 50,
      });
      return result.docs || [];
    } catch (error) {
      log.error('Error listing tables', { error: error.message });
      return [];
    }
  }
}

// Singleton
let instance = null;

export function getFlowAssistant(options) {
  if (!instance) {
    instance = new FlowAssistant(options);
  }
  return instance;
}

export { FlowAssistant, FLOW_TEMPLATES };
