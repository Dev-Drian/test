/**
 * Flow Engine - Motor dinámico para ejecutar flujos y procesar templates
 * 
 * Este servicio centraliza la lógica de:
 * - Motor de templates (reemplazar {{variable}} con valores)
 * - Ejecución de flujos basados en nodos
 * - Detección de triggers
 * - Construcción dinámica del system prompt
 */

import { connectDB, getTableDbName, getTableDataDbName } from "../config/db.js";

// ============================================================================
// MOTOR DE TEMPLATES
// ============================================================================

/**
 * Procesa un template reemplazando {{variable}} con valores del contexto
 * @param {string} template - Template con variables {{nombre}}
 * @param {object} context - Objeto con los valores a reemplazar
 * @returns {string} Template procesado
 * 
 * @example
 * processTemplate("Hola {{nombre}}, tu cita es el {{fecha}}", { nombre: "Juan", fecha: "2024-01-15" })
 * // => "Hola Juan, tu cita es el 2024-01-15"
 */
export function processTemplate(template, context = {}) {
  if (!template || typeof template !== 'string') return template || '';
  
  // Variables especiales de fecha
  const today = new Date();
  const specialVars = {
    'today': today.toISOString().split('T')[0],
    'now': today.toISOString(),
    'timestamp': today.getTime().toString(),
  };
  
  // Calcular nextWeek
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  specialVars['nextWeek'] = nextWeek.toISOString().split('T')[0];
  
  // Calcular tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  specialVars['tomorrow'] = tomorrow.toISOString().split('T')[0];
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Primero verificar si es una variable especial
    if (specialVars[trimmedKey]) {
      return specialVars[trimmedKey];
    }
    
    // Soportar acceso anidado como {{mascota.nombre}}
    const keys = trimmedKey.split('.');
    let value = context;
    
    for (const k of keys) {
      if (value === null || value === undefined) break;
      value = value[k];
    }
    
    // Si no se encuentra, dejar el placeholder original o vacío
    if (value === null || value === undefined) {
      return ''; // O return match para mantener el placeholder
    }
    
    return String(value);
  });
}

/**
 * Procesa un template con formateo especial (fechas, horas, moneda)
 * @param {string} template - Template con variables y formatos {{fecha:date}} {{hora:time}} {{precio:currency}}
 * @param {object} context - Objeto con los valores
 * @returns {string} Template procesado
 */
export function processTemplateWithFormat(template, context = {}) {
  if (!template || typeof template !== 'string') return template || '';
  
  return template.replace(/\{\{([^}:]+)(?::([^}]+))?\}\}/g, (match, key, format) => {
    const trimmedKey = key.trim();
    let value = context[trimmedKey];
    
    if (value === null || value === undefined) return '';
    
    // Aplicar formato si se especifica
    if (format) {
      switch (format.toLowerCase()) {
        case 'date':
          value = formatDate(value);
          break;
        case 'time':
        case 'hora':
          value = formatTo12Hour(value);
          break;
        case 'currency':
        case 'money':
          value = formatCurrency(value);
          break;
        case 'upper':
          value = String(value).toUpperCase();
          break;
        case 'lower':
          value = String(value).toLowerCase();
          break;
        case 'capitalize':
          value = capitalize(String(value));
          break;
      }
    }
    
    return String(value);
  });
}

// Helpers de formato
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTo12Hour(time24) {
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

function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(num);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ============================================================================
// DETECCIÓN DE TRIGGERS
// ============================================================================

/**
 * Encuentra el nodo trigger que coincide con el mensaje del usuario
 * @param {string} message - Mensaje del usuario
 * @param {Array} nodes - Nodos del flujo
 * @returns {object|null} Nodo trigger que coincide o null
 */
export function findMatchingTrigger(message, nodes) {
  if (!message || !nodes) return null;
  
  const triggers = nodes.filter(n => n.type === 'trigger');
  const lowerMessage = message.toLowerCase().trim();
  
  for (const trigger of triggers) {
    const data = trigger.data || {};
    
    // Trigger por keyword/patterns
    if (data.patterns && Array.isArray(data.patterns)) {
      for (const pattern of data.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(message)) {
            return { node: trigger, matchType: 'pattern', matchedPattern: pattern };
          }
        } catch {
          // Si el pattern no es regex válido, buscar como texto
          if (lowerMessage.includes(pattern.toLowerCase())) {
            return { node: trigger, matchType: 'keyword', matchedPattern: pattern };
          }
        }
      }
    }
    
    // Trigger por intent
    if (data.intent) {
      const intentPatterns = getIntentPatterns(data.intent);
      for (const pattern of intentPatterns) {
        if (new RegExp(pattern, 'i').test(message)) {
          return { node: trigger, matchType: 'intent', matchedIntent: data.intent };
        }
      }
    }
    
    // Trigger genérico "message" - atrapa todo
    if (data.triggerType === 'message' && !data.patterns && !data.intent) {
      return { node: trigger, matchType: 'catchall' };
    }
  }
  
  return null;
}

/**
 * Patrones predefinidos para intenciones comunes
 */
function getIntentPatterns(intent) {
  const patterns = {
    create: [
      '\\b(agendar|reservar|crear|hacer|quiero|necesito|sacar)\\b.*\\b(cita|turno|reserva|hora)\\b',
      '\\b(cita|turno|reserva)\\b.*\\b(para|el|mañana|hoy)\\b',
      '\\bquiero\\b.*\\b(agendar|reservar)\\b'
    ],
    read: [
      '\\b(ver|mostrar|cuáles|listar|mis)\\b.*\\b(citas|turnos|reservas)\\b',
      '\\b(tengo|hay)\\b.*\\b(citas|turnos)\\b'
    ],
    update: [
      '\\b(cambiar|modificar|actualizar|mover|reagendar)\\b.*\\b(cita|turno|hora|fecha)\\b'
    ],
    delete: [
      '\\b(cancelar|eliminar|borrar|anular|quitar)\\b.*\\b(cita|turno|reserva)\\b',
      '\\bno\\b.*\\b(puedo|voy)\\b.*\\b(ir|asistir)\\b'
    ],
    query: [
      '\\b(cuánto|precio|costo|vale|cobran)\\b',
      '\\b(horarios?|disponibilidad)\\b',
      '\\b(qué|cuáles)\\b.*\\b(servicios?|ofrecen|tienen)\\b'
    ],
    availability: [
      '\\b(disponible|libre|hay\\s+hora)\\b',
      '\\b(horarios?)\\b.*\\b(disponibles?|libres?)\\b',
      '\\bpueden\\b.*\\b(atender|el|mañana)\\b'
    ]
  };
  
  return patterns[intent] || [];
}

// ============================================================================
// EJECUCIÓN DE FLUJOS
// ============================================================================

/**
 * Ejecuta un flujo desde un nodo inicial
 * @param {string} startNodeId - ID del nodo inicial
 * @param {Array} nodes - Todos los nodos del flujo
 * @param {Array} edges - Conexiones entre nodos
 * @param {object} context - Contexto de ejecución (datos del usuario, mensaje, etc.)
 * @returns {object} Resultado de la ejecución
 */
export async function executeFlow(startNodeId, nodes, edges, context) {
  const execution = {
    steps: [],
    result: null,
    response: null,
    error: null,
    fieldsToAsk: [],
    actionToExecute: null,
    confirmationNeeded: null
  };
  
  let currentNodeId = startNodeId;
  let iterations = 0;
  const maxIterations = 50; // Prevenir loops infinitos
  
  while (currentNodeId && iterations < maxIterations) {
    iterations++;
    
    const node = nodes.find(n => n.id === currentNodeId);
    if (!node) break;
    
    execution.steps.push({ nodeId: node.id, type: node.type });
    
    // Ejecutar el nodo según su tipo
    const nodeResult = await executeNode(node, context, execution);
    
    if (nodeResult.stop) {
      // El nodo indica que debemos detenernos (ej: falta info, pedir confirmación)
      break;
    }
    
    // Encontrar el siguiente nodo
    currentNodeId = findNextNode(node.id, edges, nodeResult.condition, nodes);
  }
  
  return execution;
}

/**
 * Ejecuta un nodo individual
 */
async function executeNode(node, context, execution) {
  const data = node.data || {};
  
  switch (node.type) {
    case 'trigger':
      // Los triggers solo inician el flujo, no hacen nada
      return { continue: true };
      
    case 'table':
      // Nodo de tabla - configurar qué tabla y campos usar
      context.currentTableId = data.tableId;
      context.fieldsConfig = data.fieldsConfig || [];
      
      // Verificar campos requeridos que faltan
      const missingFields = checkMissingFields(data.fieldsConfig, context.collectedData || {});
      if (missingFields.length > 0) {
        execution.fieldsToAsk = missingFields;
        execution.response = missingFields[0].askMessage || `¿Cuál es el ${missingFields[0].fieldKey}?`;
        return { stop: true };
      }
      return { continue: true };
      
    case 'condition':
      // Evaluar condición
      const conditionResult = evaluateCondition(data.condition, context);
      return { continue: true, condition: conditionResult ? 'true' : 'false' };
      
    case 'action':
      // Configurar acción a ejecutar
      if (data.confirmationRequired && !context.confirmed) {
        execution.confirmationNeeded = {
          message: processTemplate(data.confirmationMessage || '¿Confirmas esta acción?', context),
          actionType: data.actionType,
          data: context.collectedData
        };
        execution.response = execution.confirmationNeeded.message;
        return { stop: true };
      }
      
      execution.actionToExecute = {
        type: data.actionType,
        tableId: context.currentTableId || data.tableId,
        data: context.collectedData,
        assignConfig: data.assignConfig
      };
      
      return { continue: true };
      
    case 'availability':
      // Verificar disponibilidad
      execution.checkAvailability = {
        tableId: data.tableId || context.currentTableId,
        date: context.collectedData?.fecha,
        time: context.collectedData?.hora
      };
      return { continue: true };
      
    case 'response':
      // Generar respuesta
      const responseText = processTemplateWithFormat(
        data.responseTemplate || data.label || 'Operación completada',
        { ...context, ...context.collectedData }
      );
      execution.response = responseText;
      return { continue: true };
      
    default:
      return { continue: true };
  }
}

/**
 * Verifica qué campos requeridos faltan
 */
function checkMissingFields(fieldsConfig, collectedData) {
  if (!fieldsConfig || !Array.isArray(fieldsConfig)) return [];
  
  return fieldsConfig.filter(field => {
    if (!field.required) return false;
    const value = collectedData[field.fieldKey];
    return value === undefined || value === null || value === '';
  });
}

/**
 * Evalúa una condición simple
 */
function evaluateCondition(condition, context) {
  if (!condition) return true;
  
  // Soportar condiciones simples: "hasData", "confirmed", "field == value"
  try {
    // Reemplazar variables en la condición
    let evalCondition = condition;
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        evalCondition = evalCondition.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
    }
    
    // Evaluar (con precaución)
    // eslint-disable-next-line no-new-func
    return new Function(`return ${evalCondition}`)();
  } catch {
    return true;
  }
}

/**
 * Encuentra el siguiente nodo basado en edges
 */
function findNextNode(currentId, edges, condition, nodes) {
  const outgoingEdges = edges.filter(e => e.source === currentId);
  
  if (outgoingEdges.length === 0) return null;
  
  // Si hay condición, buscar edge que coincida
  if (condition) {
    const conditionalEdge = outgoingEdges.find(e => 
      e.condition === condition || 
      e.sourceHandle === condition ||
      e.label?.toLowerCase() === condition.toLowerCase()
    );
    if (conditionalEdge) return conditionalEdge.target;
  }
  
  // Si no hay condición o no coincide, tomar el primer edge
  return outgoingEdges[0]?.target;
}

// ============================================================================
// CONSTRUCCIÓN DE SYSTEM PROMPT DINÁMICO
// ============================================================================

/**
 * Construye el system prompt dinámicamente desde la configuración del agente
 * @param {object} agent - Documento del agente
 * @param {Array} tablesData - Datos de las tablas vinculadas
 * @returns {string} System prompt construido
 */
export function buildDynamicSystemPrompt(agent, tablesData = []) {
  const context = {
    agentName: agent?.name || 'Asistente',
    agentDesc: agent?.description || '',
    tables: tablesData.map(t => t.tableName).join(', '),
    language: agent?.language || 'español',
    date: new Date().toLocaleDateString('es-CO'),
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  };
  
  // Si el agente tiene un systemPrompt personalizado, usarlo
  if (agent?.systemPrompt) {
    let prompt = processTemplate(agent.systemPrompt, context);
    
    // Agregar datos de tablas si están disponibles
    if (tablesData.length > 0) {
      prompt += '\n\nDATOS DISPONIBLES:\n';
      prompt += formatTablesData(tablesData);
    }
    
    return prompt;
  }
  
  // Prompt por defecto si no hay personalizado
  return buildDefaultPrompt(agent, tablesData, context);
}

/**
 * Prompt por defecto para agentes sin systemPrompt personalizado
 */
function buildDefaultPrompt(agent, tablesData, context) {
  const style = agent?.communicationStyle || {};
  const tone = agent?.tone || 50; // 0=formal, 100=casual
  
  let toneDescription = 'profesional y amable';
  if (tone < 30) toneDescription = 'formal y profesional';
  else if (tone > 70) toneDescription = 'casual y amigable';
  
  let prompt = `Eres "${context.agentName}", un asistente ${toneDescription}. ${context.agentDesc}

ESTILO:
- Respuestas breves y directas (máximo ${style.maxSentences || 3} oraciones)
- ${style.useEmojis !== false ? 'Usa emojis apropiados' : 'No uses emojis'}
- Idioma: ${context.language}
`;

  // Instrucciones del agente
  const instructions = agent?.instructions || [];
  if (instructions.length > 0) {
    prompt += '\nINSTRUCCIONES:\n';
    instructions.forEach((inst, i) => {
      if (typeof inst === 'string') {
        prompt += `${i + 1}. ${inst}\n`;
      } else if (inst?.title) {
        prompt += `${i + 1}. ${inst.title}\n`;
        if (inst.actions?.length > 0) {
          inst.actions.forEach(act => prompt += `   - ${act}\n`);
        }
      }
    });
  }
  
  // Datos de tablas
  if (tablesData.length > 0) {
    prompt += '\nDATOS DISPONIBLES:\n';
    prompt += formatTablesData(tablesData);
  }
  
  // Templates de respuesta personalizados
  const templates = agent?.responseTemplates;
  if (templates) {
    prompt += '\nPLANTILLAS DE RESPUESTA (usa estos formatos):\n';
    if (templates.createSuccess) prompt += `- Al crear: "${templates.createSuccess}"\n`;
    if (templates.cancelConfirm) prompt += `- Al cancelar: "${templates.cancelConfirm}"\n`;
    if (templates.missingField) prompt += `- Campo faltante: "${templates.missingField}"\n`;
  }
  
  prompt += `
REGLAS:
- NUNCA menciones que eres IA, ChatGPT u OpenAI
- Actúa siempre como "${context.agentName}"
- Si no tienes información, dilo brevemente`;

  return prompt;
}

/**
 * Formatea los datos de las tablas para el prompt
 */
function formatTablesData(tablesData) {
  let result = '';
  
  tablesData.forEach(table => {
    result += `\n${table.tableName} (${table.headers.join(', ')}):\n`;
    if (table.data.length === 0) {
      result += '   (sin registros)\n';
    } else {
      table.data.slice(0, 10).forEach((row, i) => {
        const rowStr = Object.entries(row)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        result += `   ${i + 1}. ${rowStr}\n`;
      });
      if (table.data.length > 10) {
        result += `   ... y ${table.data.length - 10} más\n`;
      }
    }
  });
  
  return result;
}

// ============================================================================
// HELPERS PARA CAMPOS DINÁMICOS
// ============================================================================

/**
 * Obtiene la configuración de campos desde una tabla
 * @param {string} workspaceId - ID del workspace
 * @param {string} tableId - ID de la tabla
 * @returns {Array} Array de configuración de campos
 */
export async function getTableFieldsConfig(workspaceId, tableId) {
  try {
    const tableDb = await connectDB(getTableDbName(workspaceId));
    const tableDoc = await tableDb.get(tableId);
    
    return (tableDoc.headers || []).map(header => ({
      fieldKey: header.key || header.id,
      label: header.label || header.title || header.key,
      type: header.type || 'text',
      required: header.required || false,
      options: header.options || [],
      relatedTable: header.relatedTable
    }));
  } catch {
    return [];
  }
}

/**
 * Genera el mensaje para pedir un campo basado en su configuración
 */
export function generateFieldPrompt(fieldConfig, context = {}) {
  // Si hay mensaje personalizado, usarlo
  if (fieldConfig.askMessage) {
    return processTemplate(fieldConfig.askMessage, context);
  }
  
  const label = fieldConfig.label || fieldConfig.fieldKey;
  
  // Mensajes por defecto según tipo de campo
  switch (fieldConfig.type) {
    case 'date':
      return `📅 ¿Para qué fecha sería?`;
    case 'time':
      return `🕐 ¿A qué hora te gustaría?`;
    case 'phone':
    case 'telefono':
      return `📱 ¿Cuál es tu número de teléfono?`;
    case 'email':
      return `📧 ¿Cuál es tu correo electrónico?`;
    case 'select':
      if (fieldConfig.options?.length > 0) {
        const opts = fieldConfig.options.slice(0, 5).join(', ');
        return `¿Cuál ${label} prefieres? (${opts})`;
      }
      return `¿Cuál es el ${label}?`;
    default:
      return `¿Cuál es el ${label}?`;
  }
}
