/**
 * SmartFlowAssistant - Asistente inteligente para flujos con plantillas globales
 * 
 * Características:
 * - Lee plantillas globales de la BD (chatbot_flow_templates)
 * - Usa LLM (GPT-4o) para recomendar la mejor plantilla
 * - Si no encuentra plantilla adecuada, crea el flujo desde cero
 * - Pide confirmación antes de crear
 * 
 * @module services/SmartFlowAssistant
 */

import { v4 as uuidv4 } from 'uuid';
import { OpenAIProvider, getOpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { connectDB, getFlowsDbName, getFlowTemplatesDbName, getTableDbName } from '../config/db.js';
import logger from '../config/logger.js';
import { FLOW_TEMPLATES_DATA } from './flowTemplatesData.js';

const log = logger.child('SmartFlowAssistant');

/**
 * PLANTILLAS HARDCODEADAS - 28 plantillas completas con keywords para matching rápido
 * Importadas desde flowTemplatesData.js
 */
const HARDCODED_TEMPLATES = FLOW_TEMPLATES_DATA;

/**
 * Clase principal del asistente inteligente de flujos
 */
class SmartFlowAssistant {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || getOpenAIProvider();
  }

  /**
   * Obtiene todas las plantillas globales de la BD
   * @param {string} userPlan - Plan del usuario
   * @param {string} businessType - Tipo de negocio
   * @returns {Promise<object[]>}
   */
  async getGlobalTemplates(userPlan = 'free', businessType = 'general') {
    // PRIMERO: Usar plantillas hardcodeadas (siempre disponibles)
    log.info('Using hardcoded templates as primary source', { count: HARDCODED_TEMPLATES.length });
    
    // También intentar cargar de BD para más opciones
    let dbTemplates = [];
    try {
      const db = await connectDB(getFlowTemplatesDbName());
      const result = await db.find({
        selector: { isTemplate: true },
        limit: 200,
      });
      dbTemplates = result.docs || [];
      log.info('Additional templates from DB', { count: dbTemplates.length });
    } catch (error) {
      log.warn('Could not load DB templates, using hardcoded only', { error: error.message });
    }

    // Combinar: hardcoded primero, luego BD (evitar duplicados por _id)
    const hardcodedIds = new Set(HARDCODED_TEMPLATES.map(t => t._id));
    const uniqueDbTemplates = dbTemplates.filter(t => !hardcodedIds.has(t._id));
    
    const allTemplates = [...HARDCODED_TEMPLATES, ...uniqueDbTemplates];
    log.info('Total templates available', { hardcoded: HARDCODED_TEMPLATES.length, db: uniqueDbTemplates.length, total: allTemplates.length });
    
    return allTemplates;
  }

  /**
   * Obtiene las tablas del workspace
   * @param {string} workspaceId
   * @returns {Promise<object[]>}
   */
  async getWorkspaceTables(workspaceId) {
    try {
      const db = await connectDB(getTableDbName(workspaceId));
      const result = await db.find({
        selector: {},
        limit: 50,
      });
      return result.docs || [];
    } catch (error) {
      log.error('Error loading workspace tables', { error: error.message });
      return [];
    }
  }

  /**
   * Búsqueda rápida por keywords (sin LLM)
   * Devuelve el template con más coincidencias de keywords
   * @private
   */
  _findByKeywords(userRequest, templates) {
    const request = userRequest.toLowerCase();
    
    // Encontrar TODOS los templates que coinciden y sus scores
    const matches = [];
    
    for (const template of templates) {
      const keywords = template.keywords || [];
      const matchedKeywords = keywords.filter(kw => request.includes(kw.toLowerCase()));
      
      if (matchedKeywords.length > 0) {
        // Calcular score: número de keywords coincidentes / total de keywords del template
        // Esto premia templates donde coinciden más de sus keywords clave
        const score = matchedKeywords.length;
        const coverage = matchedKeywords.length / keywords.length;
        
        matches.push({
          templateId: template._id,
          templateName: template.name,
          matchedKeywords,
          score,
          coverage,
          // Confianza basada en cantidad de coincidencias
          confidence: Math.min(95, 50 + (matchedKeywords.length * 15)),
        });
      }
    }
    
    if (matches.length === 0) {
      return null;
    }
    
    // Ordenar por: 1) más keywords coincidentes, 2) mejor cobertura
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.coverage - a.coverage;
    });
    
    const best = matches[0];
    
    // Log para debugging
    log.info('Keyword matching results', { 
      request: request.substring(0, 50),
      totalMatches: matches.length,
      best: { name: best.templateName, keywords: best.matchedKeywords, score: best.score },
      alternatives: matches.slice(1, 3).map(m => ({ name: m.templateName, score: m.score })),
    });
    
    // Requiere al menos 2 keywords para devolver con alta confianza
    if (best.score >= 2) {
      return {
        templateId: best.templateId,
        confidence: best.confidence,
        reason: `Coincidencia por keywords: ${best.matchedKeywords.join(', ')}`,
        needsCustomFlow: false,
      };
    }
    
    // Con 1 keyword, devolver con confianza media
    return {
      templateId: best.templateId,
      confidence: 60,
      reason: `Coincidencia parcial: ${best.matchedKeywords.join(', ')}`,
      needsCustomFlow: false,
    };
  }

  /**
   * Usa el LLM para encontrar la mejor plantilla
   * @param {string} userRequest - Lo que el usuario pidió
   * @param {object[]} templates - Plantillas disponibles
   * @param {object[]} tables - Tablas del workspace
   * @returns {Promise<object|null>}
   */
  async findBestTemplate(userRequest, templates, tables) {
    // Si no hay plantillas, indicar que necesita flujo custom
    if (!templates || templates.length === 0) {
      log.debug('No templates available, will generate custom');
      return { needsCustomFlow: true };
    }

    // PRIMERO: Intentar búsqueda rápida por keywords
    const keywordMatch = this._findByKeywords(userRequest, templates);
    if (keywordMatch) {
      log.info('Using keyword match instead of LLM', { templateId: keywordMatch.templateId });
      return keywordMatch;
    }

    // Si no hay match por keywords, usar LLM
    log.info('No keyword match, falling back to LLM');

    const tableNames = tables.map(t => t.name).join(', ');
    
    // Incluir keywords para mejor matching
    const templateSummaries = templates.slice(0, 20).map(t => ({
      id: t._id,
      name: t.name,
      description: t.description,
      category: t.category,
      keywords: t.keywords || [],
      nodeCount: t.nodes?.length || 0,
    }));

    log.info('Template summaries for LLM', { templates: templateSummaries.map(t => `${t.id} (${t.keywords?.join(',')})`) });

    const prompt = `El usuario quiere: "${userRequest}"

TABLAS DEL WORKSPACE: ${tableNames || 'Ninguna'}

PLANTILLAS DISPONIBLES (usa el id exacto):
${templateSummaries.map(t => `- ${t.id}: "${t.name}" - ${t.description} [keywords: ${(t.keywords || []).join(', ')}] (${t.nodeCount} nodos)`).join('\n')}

REGLAS:
1. Busca coincidencia por keywords primero
2. "encuesta" o "satisfaccion" o "feedback" → template-survey
3. "recordatorio" o "avisar antes" → template-reminder  
4. "reserva" o "cita" o "agendar" → template-reservation-basic
5. "registrar cliente" o "nuevo cliente" → template-registration
6. "cancelar" → template-cancel
7. "bienvenida" o "email nuevo cliente" → template-welcome-email
8. "seguimiento" o "post-venta" → template-followup
9. needsCustomFlow:true SOLO si ninguna plantilla aplica

RESPONDE JSON:
{"templateId": "id-exacto", "confidence": 80, "reason": "motivo", "suggestedTable": "tabla o null", "needsCustomFlow": false}`;

    try {
      const response = await this.aiProvider.chat({
        systemPrompt: 'Eres un experto en automatizaciones. Tu trabajo es ENCONTRAR la plantilla que mejor se ajuste a lo que pide el usuario. SIEMPRE intenta encontrar una plantilla existente antes de sugerir crear una custom. Responde SOLO en JSON válido.',
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        temperature: 0.1, // Más determinístico
      });

      log.debug('LLM response for template matching', { response: response?.substring(0, 200) });

      // Parsear respuesta JSON - más robusto
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        log.info('LLM template recommendation', { templateId: result.templateId, confidence: result.confidence });
        return result;
      }
      
      log.warn('Could not parse LLM response for template matching');
      return { needsCustomFlow: true };
    } catch (error) {
      log.error('Error finding best template', { error: error.message });
      return { needsCustomFlow: true }; // Fallback a flujo custom
    }
  }

  /**
   * Genera un flujo personalizado usando LLM
   * @param {string} userRequest
   * @param {object[]} tables
   * @returns {Promise<object>}
   */
  async generateCustomFlow(userRequest, tables) {
    const tableDetails = tables.map(t => ({
      name: t.name,
      id: t._id,
      fields: (t.headers || []).map(h => h.key || h.label),
    }));

    // Detectar tabla mencionada
    const lowerRequest = userRequest.toLowerCase();
    let suggestedTable = tables[0]; // Default a primera tabla
    for (const table of tables) {
      const tableLower = table.name.toLowerCase();
      if (lowerRequest.includes(tableLower) || 
          lowerRequest.includes(tableLower.replace(/s$/, '')) || // singular
          tableLower.includes(lowerRequest.split(' ').find(w => w.length > 4) || '')) {
        suggestedTable = table;
        break;
      }
    }

    const prompt = `Genera un flujo de automatización para: "${userRequest}"

TABLA PRINCIPAL DETECTADA: ${suggestedTable.name} (ID: ${suggestedTable._id})
CAMPOS: ${(suggestedTable.headers || []).map(h => h.key || h.label).join(', ')}

OTRAS TABLAS:
${JSON.stringify(tableDetails.filter(t => t.id !== suggestedTable._id), null, 2)}

GENERA UN FLUJO SIMPLE con estos nodes:
1. trigger: dispara cuando se crea/actualiza en la tabla
2. action: la acción a realizar (sendEmail, createRecord, etc.)

RESPONDE SOLO EN JSON (sin markdown):
{"name": "Nombre", "description": "Desc", "mainTable": "${suggestedTable._id}", "mainTableName": "${suggestedTable.name}", "trigger": "afterCreate", "actionType": "sendEmail", "nodes": [...], "edges": [...]}`;

    try {
      const response = await this.aiProvider.chat({
        systemPrompt: 'Genera flujos de automatización en JSON válido. Sin bloques de código markdown.',
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        temperature: 0.3,
      });

      log.debug('LLM response for custom flow', { response: response?.substring(0, 300) });

      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const flow = JSON.parse(jsonMatch[0]);
        log.info('Custom flow generated', { name: flow.name, trigger: flow.trigger });
        return flow;
      }
      
      // Generar flujo básico por defecto si el parsing falla
      log.warn('Could not parse custom flow, generating default');
      return this._generateDefaultFlow(userRequest, suggestedTable);
    } catch (error) {
      log.error('Error generating custom flow', { error: error.message });
      // Generar flujo básico por defecto
      return this._generateDefaultFlow(userRequest, tables[0]);
    }
  }

  /**
   * Genera un flujo por defecto cuando todo lo demás falla
   * @private
   */
  _generateDefaultFlow(userRequest, table) {
    const lowerRequest = userRequest.toLowerCase();
    
    // Detectar tipo de acción
    let actionType = 'sendEmail';
    if (lowerRequest.includes('notific') || lowerRequest.includes('aviso')) {
      actionType = 'notify';
    } else if (lowerRequest.includes('crear') || lowerRequest.includes('agregar')) {
      actionType = 'createRecord';
    }

    // Detectar trigger
    let trigger = 'afterCreate';
    if (lowerRequest.includes('actualiz') || lowerRequest.includes('cambio') || lowerRequest.includes('modific')) {
      trigger = 'afterUpdate';
    }

    // Detectar campo de email
    const emailField = (table.headers || []).find(h => 
      (h.key || h.label || '').toLowerCase().includes('email') ||
      (h.key || h.label || '').toLowerCase().includes('correo') ||
      h.type === 'email'
    );

    const triggerLabel = trigger === 'afterCreate' ? 'Nuevo registro' : 'Registro actualizado';
    const actionLabel = actionType === 'sendEmail' ? 'Enviar Email' : 'Ejecutar acción';

    return {
      name: `Automatización para ${table.name}`,
      description: `Flujo generado automáticamente: ${userRequest}`,
      mainTable: table._id,
      mainTableName: table.name,
      trigger,
      actionType,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            label: triggerLabel,
            trigger: trigger,
            triggerTable: table._id,
            triggerTableName: table.name,
          },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 250, y: 200 },
          data: {
            label: actionLabel,
            actionType: actionType,
            to: emailField ? `{{${emailField.key || emailField.label}}}` : '{{email}}',
            subject: `Notificación: ${table.name}`,
            body: 'Se ha procesado tu registro.\n\nGracias.',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'action-1' },
      ],
    };
  }

  /**
   * Analiza la solicitud del usuario y genera una propuesta
   * @param {string} userRequest
   * @param {string} workspaceId
   * @param {object} options
   * @returns {Promise<object>}
   */
  async analyzeAndPropose(userRequest, workspaceId, options = {}) {
    const { userPlan = 'free', businessType = 'general' } = options;

    log.info('SmartFlowAssistant.analyzeAndPropose', { userRequest, workspaceId, userPlan });

    // 1. Obtener tablas del workspace
    const tables = await this.getWorkspaceTables(workspaceId);

    if (tables.length === 0) {
      return {
        success: false,
        needsTables: true,
        message: `📋 **No tienes tablas creadas todavía**

Para crear automatizaciones, primero necesitas tener tablas con datos.

**¿Qué te gustaría hacer?**
- 📊 **"Crear una tabla de clientes"** - Te creo la tabla
- 🏢 **"Configurar sistema para mi restaurante"** - Te creo todo el sistema
- 🏥 **"Necesito tablas para mi clínica"** - Te preparo las tablas

¿Con qué empezamos?`,
      };
    }

    // 2. Obtener plantillas globales
    const templates = await this.getGlobalTemplates(userPlan, businessType);
    log.info('Templates available for matching', { count: templates.length, names: templates.slice(0, 5).map(t => t.name) });

    // 3. Usar LLM para encontrar la mejor plantilla
    const recommendation = await this.findBestTemplate(userRequest, templates, tables);
    log.info('LLM recommendation result', { recommendation });

    // 4. Si hay una plantilla recomendada (umbral bajo de 30% para permitir más matches)
    if (recommendation?.templateId && recommendation.confidence >= 30) {
      const template = templates.find(t => t._id === recommendation.templateId);
      if (template) {
        log.info('Using template', { templateName: template.name, confidence: recommendation.confidence });
        return {
          success: true,
          type: 'template',
          template,
          recommendation,
          suggestedTable: recommendation.suggestedTable,
          tables,
          message: this._formatTemplateProposal(template, recommendation, tables),
        };
      }
    }

    // 5. Si no hay plantilla, generar flujo personalizado
    if (recommendation?.needsCustomFlow || !recommendation?.templateId) {
      const customFlow = await this.generateCustomFlow(userRequest, tables);
      
      if (customFlow) {
        return {
          success: true,
          type: 'custom',
          customFlow,
          tables,
          message: this._formatCustomProposal(customFlow, userRequest),
        };
      }
    }

    // 6. Fallback - no se pudo generar nada
    return {
      success: false,
      message: `🤔 No pude entender bien qué automatización necesitas.

**Ejemplos de lo que puedo hacer:**
- "Cuando se cree un cliente, enviar email de bienvenida"
- "Notificar por correo cada nuevo pedido"
- "Al actualizar estado de cita, avisar al paciente"
- "Crear tarea automáticamente cuando se registre una venta"

¿Podrías describirme con más detalle qué necesitas automatizar?`,
    };
  }

  /**
   * Formatea la propuesta de plantilla
   * @private
   */
  _formatTemplateProposal(template, recommendation, tables) {
    const tableNames = tables.map(t => t.name).join(', ');
    
    let msg = `🎯 **¡Encontré una plantilla perfecta para ti!**\n\n`;
    msg += `**📋 ${template.name}**\n`;
    msg += `${template.description}\n\n`;
    
    if (recommendation.suggestedTable) {
      msg += `📊 **Tabla sugerida:** ${recommendation.suggestedTable}\n\n`;
    }
    
    msg += `---\n\n`;
    msg += `**¿Qué hará este flujo?**\n`;
    
    // Analizar nodes del template
    const nodes = template.nodes || [];
    const trigger = nodes.find(n => n.type === 'start' || n.type === 'trigger');
    if (trigger?.data?.keywords) {
      msg += `• Se activa con: ${trigger.data.keywords.join(', ')}\n`;
    }
    
    const actions = nodes.filter(n => n.type === 'action' || n.type === 'message' || n.type === 'insert');
    actions.forEach(action => {
      if (action.data?.actionType === 'sendEmail') {
        msg += `• Envía un email automático\n`;
      } else if (action.type === 'insert') {
        msg += `• Guarda datos en tu tabla\n`;
      } else if (action.type === 'message') {
        msg += `• Muestra confirmación al usuario\n`;
      }
    });
    
    msg += `\n---\n\n`;
    msg += `**¿Procedemos?**\n`;
    msg += `• ✅ **"Sí, créalo"** - Lo configuro automáticamente\n`;
    msg += `• ✏️ **"Modificar"** - Si quieres cambiar algo\n`;
    msg += `• ❌ **"Cancelar"** - Para no crear nada`;
    
    return msg;
  }

  /**
   * Formatea la propuesta de flujo personalizado
   * @private
   */
  _formatCustomProposal(customFlow, userRequest) {
    let msg = `🔧 **He diseñado un flujo personalizado para ti**\n\n`;
    msg += `No encontré una plantilla exacta, así que creé uno a medida:\n\n`;
    msg += `---\n\n`;
    msg += `**📋 ${customFlow.name}**\n`;
    msg += `${customFlow.description}\n\n`;
    msg += `**Trigger:** ${this._formatTrigger(customFlow.trigger)}\n`;
    msg += `**Pasos:** ${customFlow.nodes?.length || 0} nodos\n\n`;
    
    msg += `---\n\n`;
    msg += `**Resumen de acciones:**\n`;
    (customFlow.nodes || []).forEach((node, idx) => {
      if (node.type !== 'trigger' && node.type !== 'start') {
        msg += `${idx}. ${node.data?.label || node.type}\n`;
      }
    });
    
    msg += `\n---\n\n`;
    msg += `**¿Te parece bien?**\n`;
    msg += `• ✅ **"Sí, créalo"** - Lo creo ahora\n`;
    msg += `• ❌ **"Cancelar"** - Para no crear nada`;
    
    return msg;
  }

  /**
   * Personaliza los nodos del template con datos de la tabla del usuario
   * @private
   */
  _personalizeNodes(nodes, tableHeaders, tableName, userRequest) {
    const request = userRequest.toLowerCase();
    
    log.info('Personalizing nodes', { 
      userRequest, 
      tableName, 
      headerCount: tableHeaders.length,
      headers: tableHeaders.map(h => h.key || h.label)
    });
    
    // Detectar si el usuario quiere ciertos elementos
    const wantsBienvenida = request.includes('bienvenid') || request.includes('bienvenido');
    const wantsDatosCliente = request.includes('datos') && (request.includes('cliente') || request.includes('usuario'));
    const wantsNombre = request.includes('nombre');
    
    log.info('Personalization flags', { wantsBienvenida, wantsDatosCliente, wantsNombre });
    
    // Encontrar campos comunes en los headers
    const emailField = tableHeaders.find(h => 
      (h.key || h.label || '').toLowerCase().includes('email') ||
      (h.key || h.label || '').toLowerCase().includes('correo') ||
      h.type === 'email'
    );
    const nombreField = tableHeaders.find(h => 
      (h.key || h.label || '').toLowerCase().includes('nombre') ||
      (h.key || h.label || '').toLowerCase() === 'name'
    );
    const telefonoField = tableHeaders.find(h => 
      (h.key || h.label || '').toLowerCase().includes('telefono') ||
      (h.key || h.label || '').toLowerCase().includes('phone')
    );

    return nodes.map(node => {
      // Personalizar nodos de trigger
      if (node.type === 'trigger' || node.type === 'start') {
        if (node.data?.tablePlaceholder && tableName) {
          node.data.triggerTableName = tableName;
        }
      }
      
      // Personalizar nodos de acción (emails)
      if (node.type === 'action' && node.data?.actionType === 'sendEmail') {
        // Personalizar el destinatario con el campo de email real
        if (emailField) {
          const emailKey = emailField.key || emailField.label;
          node.data.to = `{{record.${emailKey}}}`;
        }
        
        // Personalizar el subject si el usuario pidió bienvenida
        if (wantsBienvenida && !node.data.subject?.toLowerCase().includes('bienvenid')) {
          node.data.subject = '¡Bienvenido/a!';
        }
        
        // Personalizar el body con los datos del cliente
        if (wantsDatosCliente || wantsBienvenida || wantsNombre) {
          let body = '';
          
          if (nombreField) {
            const nombreKey = nombreField.key || nombreField.label;
            body += `Hola {{record.${nombreKey}}},\n\n`;
            body += `¡Bienvenido/a! Gracias por registrarte.\n\n`;
          } else {
            body += `¡Hola!\n\n¡Bienvenido/a! Gracias por registrarte.\n\n`;
          }
          
          // Agregar datos del cliente
          body += `**Tus datos registrados:**\n`;
          tableHeaders.slice(0, 6).forEach(header => {
            const key = header.key || header.label;
            const label = header.label || header.key;
            if (key && !key.startsWith('_')) {
              body += `• ${label}: {{record.${key}}}\n`;
            }
          });
          
          body += `\n¿Tienes alguna pregunta? Estamos para ayudarte.`;
          
          node.data.body = body;
        }
      }
      
      return node;
    });
  }

  /**
   * Formatea el tipo de trigger
   * @private
   */
  _formatTrigger(trigger) {
    const triggers = {
      afterCreate: 'Cuando se crea un registro',
      afterUpdate: 'Cuando se actualiza un registro',
      beforeCreate: 'Antes de crear un registro',
      schedule: 'Programado',
      onMessage: 'Cuando el usuario envía un mensaje',
    };
    return triggers[trigger] || trigger;
  }

  /**
   * Crea el flujo en la base de datos
   * @param {object} proposal - Propuesta generada por analyzeAndPropose
   * @param {string} workspaceId
   * @param {string} suggestedTableId - ID de la tabla a usar
   * @returns {Promise<object>}
   */
  async createFlow(proposal, workspaceId, suggestedTableId = null, userRequest = '') {
    try {
      const flowId = uuidv4();
      let flow;

      // Obtener información de la tabla para personalizar
      let tableHeaders = [];
      let tableName = '';
      let actualTableId = suggestedTableId;
      
      // Buscar la tabla en la propuesta
      const searchTableId = suggestedTableId || proposal.suggestedTable || proposal.recommendation?.suggestedTable;
      if (searchTableId && proposal.tables) {
        const table = proposal.tables.find(t => 
          t._id === searchTableId || 
          t.name === searchTableId ||
          t.name?.toLowerCase() === searchTableId?.toLowerCase()
        );
        if (table) {
          tableHeaders = table.headers || [];
          tableName = table.name || 'registros';
          actualTableId = table._id;
          log.info('Found table for personalization', { tableName, headerCount: tableHeaders.length });
        }
      }
      
      // Si no encontramos la tabla en la propuesta pero hay tablas, usar la primera
      if (!tableHeaders.length && proposal.tables?.length > 0) {
        const firstTable = proposal.tables[0];
        tableHeaders = firstTable.headers || [];
        tableName = firstTable.name || 'registros';
        actualTableId = firstTable._id;
        log.info('Using first table for personalization', { tableName, headerCount: tableHeaders.length });
      }

      if (proposal.type === 'template') {
        // Usar plantilla como base
        const template = proposal.template;
        
        // Personalizar nodos con datos de la tabla del usuario
        const personalizedNodes = this._personalizeNodes(
          JSON.parse(JSON.stringify(template.nodes || [])),
          tableHeaders,
          tableName,
          userRequest
        );
        
        flow = {
          _id: flowId,
          name: template.name,
          description: template.description,
          category: template.category,
          mainTable: actualTableId,
          mainTableName: tableName,
          trigger: template.nodes?.find(n => n.type === 'start' || n.type === 'trigger')?.data?.trigger || 'afterCreate',
          isActive: true,
          nodes: personalizedNodes,
          edges: JSON.parse(JSON.stringify(template.edges || [])),
          connections: [],
          rules: [],
          createdBy: 'smart-assistant',
          createdFromTemplate: template._id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else if (proposal.type === 'custom') {
        // Usar flujo personalizado
        const custom = proposal.customFlow;
        flow = {
          _id: flowId,
          name: custom.name,
          description: custom.description,
          mainTable: suggestedTableId || custom.mainTable,
          trigger: custom.trigger || 'afterCreate',
          isActive: true,
          nodes: custom.nodes || [],
          edges: custom.edges || [],
          connections: [],
          rules: [],
          createdBy: 'smart-assistant',
          createdFromAI: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        throw new Error('Invalid proposal type');
      }

      // Guardar en BD
      const db = await connectDB(getFlowsDbName(workspaceId));
      await db.insert(flow);

      log.info('Flow created by SmartFlowAssistant', { flowId, name: flow.name, workspaceId, type: proposal.type });

      return {
        success: true,
        flow,
        flowCreated: {
          id: flow._id,
          name: flow.name,
        },
        message: `✅ **¡Flujo "${flow.name}" creado exitosamente!**

Tu automatización ya está activa y funcionando.

**[→ Ver y editar el flujo](/flows?id=${flow._id})**

¿Necesitas crear otro flujo o algo más?`,
      };
    } catch (error) {
      log.error('Error creating flow', { error: error.message });
      return {
        success: false,
        message: `❌ Error al crear el flujo: ${error.message}`,
      };
    }
  }
}

// Singleton
let instance = null;

export function getSmartFlowAssistant(options) {
  if (!instance) {
    instance = new SmartFlowAssistant(options);
  }
  return instance;
}

export { SmartFlowAssistant };
