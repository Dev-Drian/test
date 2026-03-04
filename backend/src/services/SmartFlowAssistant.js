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
    
    // DETECTAR SOLICITUDES COMPLEJAS que requieren flujo custom
    // Si tiene múltiples acciones conectadas con "y", "además", "también"
    const hasMultipleActions = (
      (request.includes(' y ') && (request.includes('crear') || request.includes('enviar') || request.includes('notificar'))) ||
      request.includes('además') ||
      request.includes('también') ||
      (request.match(/cuando.*,.*y/i)) || // "cuando X, Y y Z"
      (request.includes('cree') && request.includes('notifi')) || // crear + notificar
      (request.includes('email') && request.includes('crear')) // email + crear registro
    );
    
    // Si es complejo, forzar flujo custom
    if (hasMultipleActions) {
      log.info('Complex request detected, forcing custom flow', { request: request.substring(0, 80) });
      return null; // Esto hará que se genere un flujo custom
    }
    
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
    
    // Requiere al menos 3 keywords para alta confianza (más estricto)
    if (best.score >= 3) {
      return {
        templateId: best.templateId,
        confidence: best.confidence,
        reason: `Coincidencia por keywords: ${best.matchedKeywords.join(', ')}`,
        needsCustomFlow: false,
      };
    }
    
    // Con 2 keywords, solo si la cobertura es buena
    if (best.score === 2 && best.coverage >= 0.3) {
      return {
        templateId: best.templateId,
        confidence: 65,
        reason: `Coincidencia parcial: ${best.matchedKeywords.join(', ')}`,
        needsCustomFlow: false,
      };
    }
    
    // Con menos coincidencias, mejor generar custom
    log.info('Low keyword match, suggesting custom flow', { score: best.score, coverage: best.coverage });
    return null;
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
    const lowerRequest = userRequest.toLowerCase();
    
    // Detectar TODAS las tablas mencionadas
    const mentionedTables = tables.filter(t => {
      const tableLower = t.name.toLowerCase();
      const singular = tableLower.replace(/s$/, '');
      return lowerRequest.includes(tableLower) || lowerRequest.includes(singular);
    });
    
    // Si no se menciona ninguna tabla, usar la primera
    const mainTable = mentionedTables[0] || tables[0];
    const secondaryTable = mentionedTables[1] || tables.find(t => t._id !== mainTable._id);
    
    // Detectar condiciones mencionadas
    const hasCondition = lowerRequest.includes('prioridad') || 
                        lowerRequest.includes('estado') ||
                        lowerRequest.includes('cuando') && lowerRequest.includes('sea') ||
                        lowerRequest.includes('si ');
    
    // Detectar acciones múltiples
    const wantsEmail = lowerRequest.includes('email') || lowerRequest.includes('notifi') || lowerRequest.includes('correo');
    const wantsCreateRecord = lowerRequest.includes('crear') || lowerRequest.includes('cree') || lowerRequest.includes('agreg');
    const wantsWebhook = lowerRequest.includes('webhook') || lowerRequest.includes('api');
    
    // Construir descripción de tablas para el prompt
    const tableInfo = tables.slice(0, 5).map(t => ({
      name: t.name,
      id: t._id,
      fields: (t.headers || []).map(h => ({ key: h.key || h.label, label: h.label || h.key, type: h.type })),
    }));

    const prompt = `Genera un flujo de automatización COMPLETO para: "${userRequest}"

TABLAS DISPONIBLES:
${tableInfo.map(t => `- ${t.name} (ID: ${t.id})\n  Campos: ${t.fields.map(f => f.key).join(', ')}`).join('\n')}

INSTRUCCIONES CRÍTICAS:
1. Usa IDs únicos para cada nodo (trigger-1, condition-1, action-1, action-2, etc.)
2. Si el usuario menciona una CONDICIÓN (prioridad, estado, etc.), agrega un nodo "condition"
3. Si menciona MÚLTIPLES acciones (email Y crear registro), agrega MÚLTIPLES nodos "action"
4. Conecta todos los nodos con edges correctos
5. Usa los nombres EXACTOS de las tablas y campos

TIPOS DE NODOS DISPONIBLES:
- trigger: {type: "trigger", data: {trigger: "afterCreate"|"afterUpdate", triggerTable: "ID_TABLA", triggerTableName: "NOMBRE"}}
- condition: {type: "condition", data: {label: "...", field: "record.CAMPO", operator: "equals"|"contains", value: "VALOR"}}
- action (email): {type: "action", data: {actionType: "sendEmail", to: "{{record.email}}", subject: "...", body: "..."}}
- action (crear): {type: "action", data: {actionType: "createRecord", targetTable: "ID_TABLA", fields: [{key: "campo", value: "{{record.X}}"}]}}

EJEMPLO DE FLUJO COMPLEJO:
{
  "name": "Notificación y seguimiento de tareas urgentes",
  "description": "Cuando se crea tarea con prioridad alta, notifica y crea seguimiento",
  "mainTable": "ID_TAREAS",
  "trigger": "afterCreate",
  "nodes": [
    {"id": "trigger-1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Nueva tarea", "trigger": "afterCreate", "triggerTable": "ID_TAREAS"}},
    {"id": "condition-1", "type": "condition", "position": {"x": 250, "y": 180}, "data": {"label": "¿Prioridad alta?", "field": "record.prioridad", "operator": "equals", "value": "alta"}},
    {"id": "action-1", "type": "action", "position": {"x": 250, "y": 310}, "data": {"label": "Notificar equipo", "actionType": "sendEmail", "to": "equipo@empresa.com", "subject": "Tarea urgente", "body": "Nueva tarea: {{record.titulo}}"}},
    {"id": "action-2", "type": "action", "position": {"x": 250, "y": 440}, "data": {"label": "Crear seguimiento", "actionType": "createRecord", "targetTable": "ID_SEGUIMIENTOS", "fields": [{"key": "titulo", "value": "Seguimiento: {{record.titulo}}"}, {"key": "fecha", "value": "{{today + 2 days}}"}]}}
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "condition-1"},
    {"id": "e2", "source": "condition-1", "target": "action-1", "sourceHandle": "true"},
    {"id": "e3", "source": "action-1", "target": "action-2"}
  ]
}

RESPONDE SOLO EN JSON VÁLIDO (sin markdown, sin \`\`\`):`;

    try {
      const response = await this.aiProvider.chat({
        systemPrompt: 'Eres un experto en automatizaciones. Genera flujos JSON completos y funcionales. NUNCA uses markdown ni bloques de código. Responde SOLO el JSON.',
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o', // Usar modelo más capaz para flujos complejos
        temperature: 0.2,
      });

      log.debug('LLM response for custom flow', { response: response?.substring(0, 500) });

      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const flow = JSON.parse(jsonMatch[0]);
        log.info('Custom flow generated', { 
          name: flow.name, 
          nodeCount: flow.nodes?.length,
          edgeCount: flow.edges?.length,
        });
        return flow;
      }
      
      // Generar flujo por defecto si el parsing falla
      log.warn('Could not parse custom flow, generating default');
      return this._generateAdvancedDefaultFlow(userRequest, mainTable, secondaryTable, tables);
    } catch (error) {
      log.error('Error generating custom flow', { error: error.message });
      return this._generateAdvancedDefaultFlow(userRequest, mainTable, secondaryTable, tables);
    }
  }

  /**
   * Genera un flujo avanzado por defecto para solicitudes complejas
   * @private
   */
  _generateAdvancedDefaultFlow(userRequest, mainTable, secondaryTable, allTables) {
    const lowerRequest = userRequest.toLowerCase();
    const nodes = [];
    const edges = [];
    let yPos = 50;
    
    // Detectar trigger
    const trigger = lowerRequest.includes('actualiz') ? 'afterUpdate' : 'afterCreate';
    const triggerLabel = trigger === 'afterCreate' ? 'Nuevo registro' : 'Registro actualizado';
    
    // Nodo 1: Trigger
    nodes.push({
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 250, y: yPos },
      data: {
        label: triggerLabel,
        trigger: trigger,
        triggerTable: mainTable._id,
        triggerTableName: mainTable.name,
      },
    });
    yPos += 130;
    
    // Detectar si hay condición
    const conditionField = this._detectConditionField(lowerRequest, mainTable);
    if (conditionField) {
      nodes.push({
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: yPos },
        data: {
          label: `¿${conditionField.label}?`,
          field: `record.${conditionField.key}`,
          operator: 'equals',
          value: conditionField.value,
        },
      });
      edges.push({ id: 'e1', source: 'trigger-1', target: 'condition-1' });
      yPos += 130;
    }
    
    // Detectar acciones
    const wantsEmail = lowerRequest.includes('email') || lowerRequest.includes('notifi') || lowerRequest.includes('correo');
    const wantsCreate = (lowerRequest.includes('cree') || lowerRequest.includes('crear')) && secondaryTable;
    
    const lastNodeId = conditionField ? 'condition-1' : 'trigger-1';
    let actionCount = 0;
    
    // Acción: Email
    if (wantsEmail) {
      actionCount++;
      const emailField = (mainTable.headers || []).find(h => 
        (h.key || h.label || '').toLowerCase().includes('email') ||
        h.type === 'email'
      );
      
      nodes.push({
        id: `action-${actionCount}`,
        type: 'action',
        position: { x: 250, y: yPos },
        data: {
          label: 'Enviar notificación',
          actionType: 'sendEmail',
          to: emailField ? `{{record.${emailField.key || emailField.label}}}` : 'equipo@empresa.com',
          subject: `Notificación: ${mainTable.name}`,
          body: `Se ha procesado un registro en ${mainTable.name}.\n\nDetalles: {{record}}`,
        },
      });
      
      if (conditionField) {
        edges.push({ id: `e${edges.length + 1}`, source: lastNodeId, target: `action-${actionCount}`, sourceHandle: 'true' });
      } else {
        edges.push({ id: `e${edges.length + 1}`, source: lastNodeId, target: `action-${actionCount}` });
      }
      yPos += 130;
    }
    
    // Acción: Crear registro en otra tabla
    if (wantsCreate && secondaryTable) {
      actionCount++;
      const prevActionId = actionCount > 1 ? `action-${actionCount - 1}` : (conditionField ? 'condition-1' : 'trigger-1');
      
      // Campos básicos para el nuevo registro
      const newFields = [];
      const secondaryHeaders = secondaryTable.headers || [];
      
      // Buscar campo título/nombre
      const titleField = secondaryHeaders.find(h => 
        ['titulo', 'nombre', 'name', 'descripcion'].includes((h.key || h.label || '').toLowerCase())
      );
      if (titleField) {
        const mainTitleField = (mainTable.headers || []).find(h =>
          ['titulo', 'nombre', 'name'].includes((h.key || h.label || '').toLowerCase())
        );
        newFields.push({
          key: titleField.key || titleField.label,
          value: mainTitleField ? `Seguimiento: {{record.${mainTitleField.key || mainTitleField.label}}}` : 'Seguimiento automático',
        });
      }
      
      // Buscar campo fecha
      const dateField = secondaryHeaders.find(h => 
        (h.key || h.label || '').toLowerCase().includes('fecha') ||
        h.type === 'date'
      );
      if (dateField) {
        // Calcular fecha +2 días
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        newFields.push({
          key: dateField.key || dateField.label,
          value: futureDate.toISOString().split('T')[0],
        });
      }
      
      nodes.push({
        id: `action-${actionCount}`,
        type: 'action',
        position: { x: 250, y: yPos },
        data: {
          label: `Crear ${secondaryTable.name}`,
          actionType: 'createRecord',
          targetTable: secondaryTable._id,
          targetTableName: secondaryTable.name,
          fields: newFields,
        },
      });
      
      if (prevActionId.includes('action')) {
        edges.push({ id: `e${edges.length + 1}`, source: prevActionId, target: `action-${actionCount}` });
      } else if (conditionField) {
        edges.push({ id: `e${edges.length + 1}`, source: prevActionId, target: `action-${actionCount}`, sourceHandle: 'true' });
      } else {
        edges.push({ id: `e${edges.length + 1}`, source: prevActionId, target: `action-${actionCount}` });
      }
    }
    
    // Si no se detectaron acciones, agregar una por defecto
    if (actionCount === 0) {
      nodes.push({
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: yPos },
        data: {
          label: 'Acción automática',
          actionType: 'sendEmail',
          to: '{{record.email}}',
          subject: 'Notificación automática',
          body: 'Se ha procesado tu registro.',
        },
      });
      edges.push({ id: 'e2', source: lastNodeId, target: 'action-1' });
    }
    
    return {
      name: `Automatización para ${mainTable.name}`,
      description: userRequest.substring(0, 100),
      mainTable: mainTable._id,
      mainTableName: mainTable.name,
      trigger,
      nodes,
      edges,
    };
  }
  
  /**
   * Detecta condiciones mencionadas en el request
   * @private
   */
  _detectConditionField(request, table) {
    const headers = table.headers || [];
    
    // Buscar "prioridad alta", "estado completado", etc.
    for (const header of headers) {
      const key = (header.key || header.label || '').toLowerCase();
      
      if (key.includes('prioridad') && request.includes('prioridad')) {
        const value = request.includes('alta') ? 'alta' : 
                     request.includes('urgente') ? 'urgente' :
                     request.includes('baja') ? 'baja' : 'alta';
        return { key: header.key || header.label, label: `Prioridad ${value}`, value };
      }
      
      if (key.includes('estado') && request.includes('estado')) {
        const value = request.includes('completad') ? 'Completado' :
                     request.includes('pendiente') ? 'Pendiente' :
                     request.includes('activ') ? 'Activo' : 'Completado';
        return { key: header.key || header.label, label: `Estado ${value}`, value };
      }
    }
    
    // Buscar patrones genéricos
    if (request.includes('prioridad alta')) {
      return { key: 'prioridad', label: 'Prioridad alta', value: 'alta' };
    }
    if (request.includes('prioridad urgente')) {
      return { key: 'prioridad', label: 'Prioridad urgente', value: 'urgente' };
    }
    
    return null;
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
    const request = (userRequest || '').toLowerCase();
    
    log.info('Personalizing nodes', { 
      userRequest, 
      tableName, 
      headerCount: tableHeaders.length,
      headers: tableHeaders.map(h => h.key || h.label)
    });
    
    // Detectar si el usuario quiere ciertos elementos (más flexible)
    const wantsBienvenida = request.includes('bienvenid') || 
                           request.includes('welcome') ||
                           request.includes('nuevo cliente') ||
                           request.includes('nuevo usuario') ||
                           request.includes('se registr');
    const wantsDatosCliente = (request.includes('dato') && (request.includes('cliente') || request.includes('usuario'))) ||
                             request.includes('sus datos') ||
                             request.includes('con sus') ||
                             request.includes('información');
    const wantsNombre = request.includes('nombre') || request.includes('personaliz');
    
    // Flag para siempre incluir datos en emails de bienvenida/nuevo registro
    const isWelcomeFlow = wantsBienvenida || wantsDatosCliente || 
                         request.includes('email') || 
                         request.includes('correo');
    
    log.info('Personalization flags', { wantsBienvenida, wantsDatosCliente, wantsNombre, isWelcomeFlow });
    
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
        
        // Personalizar el body con los datos del cliente (siempre para emails de bienvenida/registro)
        // Si hay headers de tabla, incluir los datos
        if ((isWelcomeFlow || wantsDatosCliente || wantsBienvenida || wantsNombre) && tableHeaders.length > 0) {
          let body = '';
          
          if (nombreField) {
            const nombreKey = nombreField.key || nombreField.label;
            body += `Hola {{record.${nombreKey}}},\n\n`;
            body += `¡Bienvenido/a! Gracias por registrarte.\n\n`;
          } else {
            body += `¡Hola!\n\n¡Bienvenido/a! Gracias por registrarte.\n\n`;
          }
          
          // Agregar datos del cliente (máximo 6 campos relevantes)
          body += `**Tus datos registrados:**\n`;
          const relevantHeaders = tableHeaders.filter(h => {
            const key = (h.key || h.label || '').toLowerCase();
            // Excluir campos internos y de auditoría
            return !key.startsWith('_') && 
                   !key.includes('createdat') && 
                   !key.includes('updatedat') &&
                   !key.includes('estado');
          });
          
          relevantHeaders.slice(0, 6).forEach(header => {
            const key = header.key || header.label;
            const label = header.label || header.key;
            body += `• ${label}: {{record.${key}}}\n`;
          });
          
          body += `\n¿Tienes alguna pregunta? Estamos para ayudarte.`;
          
          node.data.body = body;
          log.info('Personalized email body', { bodyLength: body.length, fieldsIncluded: relevantHeaders.length });
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
