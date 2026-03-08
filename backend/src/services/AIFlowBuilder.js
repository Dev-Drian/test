/**
 * AIFlowBuilder - Genera flujos automáticamente desde descripción en lenguaje natural
 * 
 * El usuario describe lo que quiere en español y la IA genera los nodos y conexiones.
 * 
 * Ejemplo: "Cuando llegue un pedido, verificar stock, si hay enviar WhatsApp"
 * Resultado: Flujo completo con trigger, condition, action nodes conectados
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

const log = logger.child('AIFlowBuilder');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tipos de nodos disponibles con su configuración
const NODE_TYPES = {
  trigger: {
    description: 'Inicia el flujo cuando ocurre algo',
    subtypes: ['message', 'webhook', 'schedule', 'record_created', 'record_updated'],
    color: 'amber',
    icon: 'bolt'
  },
  condition: {
    description: 'Evalúa una condición y divide el flujo',
    subtypes: ['if_else', 'switch', 'contains', 'equals'],
    color: 'violet',
    icon: 'git-branch'
  },
  action: {
    description: 'Ejecuta una acción',
    subtypes: ['create_record', 'update_record', 'delete_record', 'send_whatsapp', 'send_email', 'send_sms', 'http_request', 'set_variable'],
    color: 'emerald',
    icon: 'play'
  },
  query: {
    description: 'Busca datos en una tabla',
    subtypes: ['find_one', 'find_many', 'count', 'aggregate'],
    color: 'blue',
    icon: 'search'
  },
  response: {
    description: 'Envía una respuesta al usuario',
    subtypes: ['text', 'template', 'buttons', 'list'],
    color: 'cyan',
    icon: 'message'
  },
  wait: {
    description: 'Pausa la ejecución',
    subtypes: ['delay', 'wait_for_input', 'wait_for_approval'],
    color: 'orange',
    icon: 'clock'
  },
  loop: {
    description: 'Itera sobre una lista',
    subtypes: ['for_each', 'while', 'repeat'],
    color: 'pink',
    icon: 'refresh'
  }
};

// Prompt del sistema para generar flujos
const SYSTEM_PROMPT = `Eres un experto en automatización de flujos de trabajo. Tu tarea es convertir descripciones en lenguaje natural a flujos estructurados.

TIPOS DE NODOS DISPONIBLES:
- trigger: Inicia el flujo (message, webhook, schedule, record_created, record_updated)
- condition: Evalúa condiciones (if_else, switch, contains, equals)
- action: Ejecuta acciones (create_record, update_record, delete_record, send_whatsapp, send_email, send_sms, http_request, set_variable)
- query: Busca datos (find_one, find_many, count)
- response: Responde al usuario (text, template, buttons)
- wait: Pausa ejecución (delay, wait_for_input, wait_for_approval)
- loop: Itera sobre listas (for_each)

REGLAS:
1. Todo flujo DEBE empezar con un nodo trigger
2. Los nodos deben tener IDs únicos (usa formato: node_1, node_2, etc.)
3. Las conexiones (edges) van de source a target
4. Posiciona los nodos de arriba a abajo (Y incremental de 150)
5. Para condiciones, usa sourceHandle: "true" o "false" para las salidas
6. Usa nombres y descripciones en español
7. Incluye configuración realista en cada nodo

FORMATO DE RESPUESTA (JSON):
{
  "name": "Nombre del flujo",
  "description": "Descripción breve",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "position": { "x": 250, "y": 0 },
      "data": {
        "label": "Nuevo pedido",
        "triggerType": "record_created",
        "description": "Se activa cuando se crea un pedido",
        "config": {}
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "sourceHandle": null,
      "animated": true
    }
  ],
  "variables": ["variable1", "variable2"]
}

Responde SOLO con el JSON, sin explicaciones adicionales.`;

/**
 * Genera un flujo completo desde una descripción en lenguaje natural
 * @param {string} description - Descripción del flujo en español
 * @param {object} context - Contexto adicional (tablas disponibles, etc.)
 * @returns {Promise<object>} Flujo generado con nodes y edges
 */
export async function generateFlowFromDescription(description, context = {}) {
  log.info('Generating flow from description', { description: description.substring(0, 100) });
  
  // Verificar si OpenAI está configurado
  if (!process.env.OPENAI_API_KEY) {
    log.warn('OpenAI API key not configured, using template fallback');
    return generateFlowFromTemplate(description);
  }
  
  try {
    // Construir el prompt con contexto
    let userPrompt = `Genera un flujo para: "${description}"`;
    
    if (context.tables && context.tables.length > 0) {
      userPrompt += `\n\nTablas disponibles:\n${context.tables.map(t => `- ${t.name}: ${t.fields?.map(f => f.name).join(', ') || 'sin campos'}`).join('\n')}`;
    }
    
    if (context.variables && context.variables.length > 0) {
      userPrompt += `\n\nVariables globales disponibles: ${context.variables.join(', ')}`;
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }
    
    const flow = JSON.parse(content);
    
    // Validar y enriquecer el flujo
    const validatedFlow = validateAndEnrichFlow(flow);
    
    log.info('Flow generated successfully', { 
      name: validatedFlow.name, 
      nodeCount: validatedFlow.nodes.length,
      edgeCount: validatedFlow.edges.length 
    });
    
    return validatedFlow;
    
  } catch (error) {
    log.error('Error generating flow with AI, using fallback', { error: error.message });
    // Fallback a template si falla OpenAI
    return generateFlowFromTemplate(description);
  }
}

/**
 * Genera un flujo básico desde template cuando AI no está disponible
 */
function generateFlowFromTemplate(description) {
  const lowerDesc = description.toLowerCase();
  
  // Detectar tipo de flujo por palabras clave
  let flowType = 'generic';
  if (lowerDesc.includes('cita') || lowerDesc.includes('agenda') || lowerDesc.includes('reserva')) {
    flowType = 'appointment';
  } else if (lowerDesc.includes('soporte') || lowerDesc.includes('ayuda') || lowerDesc.includes('pregunta')) {
    flowType = 'support';
  } else if (lowerDesc.includes('venta') || lowerDesc.includes('producto') || lowerDesc.includes('cotiz')) {
    flowType = 'sales';
  } else if (lowerDesc.includes('encuesta') || lowerDesc.includes('satisfaccion')) {
    flowType = 'survey';
  } else if (lowerDesc.includes('recordatorio') || lowerDesc.includes('pago')) {
    flowType = 'reminder';
  }
  
  const templates = {
    appointment: {
      name: 'Flujo de Agendamiento',
      description: 'Gestiona citas y reservas con tus clientes',
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Nuevo mensaje', triggerType: 'message' } },
        { id: 'node_2', type: 'response', position: { x: 250, y: 120 }, data: { label: 'Saludo', message: 'Hola! Puedo ayudarte a agendar una cita. Por favor indica la fecha que te gustaría.' } },
        { id: 'node_3', type: 'wait', position: { x: 250, y: 240 }, data: { label: 'Esperar fecha', waitType: 'wait_for_input' } },
        { id: 'node_4', type: 'response', position: { x: 250, y: 360 }, data: { label: 'Pedir hora', message: 'Perfecto! Y a qué hora te gustaría?' } },
        { id: 'node_5', type: 'wait', position: { x: 250, y: 480 }, data: { label: 'Esperar hora', waitType: 'wait_for_input' } },
        { id: 'node_6', type: 'action', position: { x: 250, y: 600 }, data: { label: 'Crear cita', actionType: 'create_record', table: 'citas' } },
        { id: 'node_7', type: 'response', position: { x: 250, y: 720 }, data: { label: 'Confirmación', message: 'Tu cita ha sido agendada. Te enviaremos un recordatorio!' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', animated: true },
        { id: 'e4', source: 'node_4', target: 'node_5', animated: true },
        { id: 'e5', source: 'node_5', target: 'node_6', animated: true },
        { id: 'e6', source: 'node_6', target: 'node_7', animated: true }
      ]
    },
    support: {
      name: 'Flujo de Soporte',
      description: 'Responde preguntas y escala a humano si es necesario',
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Mensaje recibido', triggerType: 'message' } },
        { id: 'node_2', type: 'response', position: { x: 250, y: 120 }, data: { label: 'Menu', message: 'Hola! En qué puedo ayudarte?\n\n1. Preguntas frecuentes\n2. Estado de pedido\n3. Hablar con un agente' } },
        { id: 'node_3', type: 'condition', position: { x: 250, y: 240 }, data: { label: 'Opción elegida', conditionType: 'equals' } },
        { id: 'node_4', type: 'response', position: { x: 100, y: 360 }, data: { label: 'FAQ', message: 'Aquí están las preguntas más frecuentes...' } },
        { id: 'node_5', type: 'query', position: { x: 250, y: 360 }, data: { label: 'Buscar pedido', table: 'pedidos' } },
        { id: 'node_6', type: 'action', position: { x: 400, y: 360 }, data: { label: 'Transferir', actionType: 'handoff' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', sourceHandle: '1', animated: true },
        { id: 'e4', source: 'node_3', target: 'node_5', sourceHandle: '2', animated: true },
        { id: 'e5', source: 'node_3', target: 'node_6', sourceHandle: '3', animated: true }
      ]
    },
    sales: {
      name: 'Flujo de Ventas',
      description: 'Califica leads y genera cotizaciones',
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Lead entrante', triggerType: 'message' } },
        { id: 'node_2', type: 'response', position: { x: 250, y: 120 }, data: { label: 'Bienvenida', message: 'Hola! Gracias por tu interés. Qué producto te gustaría conocer?' } },
        { id: 'node_3', type: 'wait', position: { x: 250, y: 240 }, data: { label: 'Esperar respuesta', waitType: 'wait_for_input' } },
        { id: 'node_4', type: 'query', position: { x: 250, y: 360 }, data: { label: 'Buscar producto', table: 'productos' } },
        { id: 'node_5', type: 'response', position: { x: 250, y: 480 }, data: { label: 'Info producto', message: 'Aquí tienes la información del producto...' } },
        { id: 'node_6', type: 'action', position: { x: 250, y: 600 }, data: { label: 'Guardar lead', actionType: 'create_record', table: 'leads' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', animated: true },
        { id: 'e4', source: 'node_4', target: 'node_5', animated: true },
        { id: 'e5', source: 'node_5', target: 'node_6', animated: true }
      ]
    },
    survey: {
      name: 'Flujo de Encuesta',
      description: 'Recolecta feedback de clientes',
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Iniciar encuesta', triggerType: 'message' } },
        { id: 'node_2', type: 'response', position: { x: 250, y: 120 }, data: { label: 'Pregunta 1', message: 'Del 1 al 5, qué tan satisfecho estás con nuestro servicio?' } },
        { id: 'node_3', type: 'wait', position: { x: 250, y: 240 }, data: { label: 'Esperar calificación', waitType: 'wait_for_input' } },
        { id: 'node_4', type: 'response', position: { x: 250, y: 360 }, data: { label: 'Pregunta 2', message: 'Qué podríamos mejorar?' } },
        { id: 'node_5', type: 'wait', position: { x: 250, y: 480 }, data: { label: 'Esperar comentario', waitType: 'wait_for_input' } },
        { id: 'node_6', type: 'action', position: { x: 250, y: 600 }, data: { label: 'Guardar respuesta', actionType: 'create_record', table: 'encuestas' } },
        { id: 'node_7', type: 'response', position: { x: 250, y: 720 }, data: { label: 'Agradecimiento', message: 'Gracias por tu feedback! Nos ayuda a mejorar.' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', animated: true },
        { id: 'e4', source: 'node_4', target: 'node_5', animated: true },
        { id: 'e5', source: 'node_5', target: 'node_6', animated: true },
        { id: 'e6', source: 'node_6', target: 'node_7', animated: true }
      ]
    },
    reminder: {
      name: 'Flujo de Recordatorio',
      description: 'Envía recordatorios de pago o citas',
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Programado', triggerType: 'schedule' } },
        { id: 'node_2', type: 'query', position: { x: 250, y: 120 }, data: { label: 'Buscar pendientes', table: 'pagos', filter: 'pendiente' } },
        { id: 'node_3', type: 'loop', position: { x: 250, y: 240 }, data: { label: 'Por cada pendiente' } },
        { id: 'node_4', type: 'response', position: { x: 250, y: 360 }, data: { label: 'Enviar recordatorio', message: 'Hola! Te recordamos que tienes un pago pendiente.' } },
        { id: 'node_5', type: 'action', position: { x: 250, y: 480 }, data: { label: 'Registrar envío', actionType: 'update_record' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', animated: true },
        { id: 'e4', source: 'node_4', target: 'node_5', animated: true }
      ]
    },
    generic: {
      name: 'Flujo Personalizado',
      description: description,
      nodes: [
        { id: 'node_1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Inicio', triggerType: 'message' } },
        { id: 'node_2', type: 'response', position: { x: 250, y: 120 }, data: { label: 'Respuesta', message: 'Como puedo ayudarte?' } },
        { id: 'node_3', type: 'condition', position: { x: 250, y: 240 }, data: { label: 'Condición', conditionType: 'contains' } },
        { id: 'node_4', type: 'action', position: { x: 250, y: 360 }, data: { label: 'Acción', actionType: 'create_record' } }
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2', animated: true },
        { id: 'e2', source: 'node_2', target: 'node_3', animated: true },
        { id: 'e3', source: 'node_3', target: 'node_4', animated: true }
      ]
    }
  };
  
  const template = templates[flowType];
  
  return {
    ...template,
    generatedAt: new Date().toISOString(),
    aiGenerated: false,
    templateBased: true
  };
}

/**
 * Valida y enriquece el flujo generado
 */
function validateAndEnrichFlow(flow) {
  // Asegurar que tiene estructura básica
  if (!flow.nodes || !Array.isArray(flow.nodes)) {
    flow.nodes = [];
  }
  if (!flow.edges || !Array.isArray(flow.edges)) {
    flow.edges = [];
  }
  
  // Asignar IDs únicos si faltan
  flow.nodes = flow.nodes.map((node, i) => ({
    ...node,
    id: node.id || `node_${uuidv4().substring(0, 8)}`,
    position: node.position || { x: 250, y: i * 150 },
    data: {
      ...node.data,
      label: node.data?.label || `Nodo ${i + 1}`,
    }
  }));
  
  // Validar edges
  flow.edges = flow.edges.map((edge, i) => ({
    ...edge,
    id: edge.id || `edge_${uuidv4().substring(0, 8)}`,
    animated: edge.animated !== false,
    style: { stroke: '#6366f1' }
  }));
  
  // Asegurar que hay al menos un trigger
  const hasTrigger = flow.nodes.some(n => n.type === 'trigger');
  if (!hasTrigger && flow.nodes.length > 0) {
    flow.nodes[0].type = 'trigger';
  }
  
  return {
    name: flow.name || 'Flujo generado',
    description: flow.description || 'Flujo creado con IA',
    nodes: flow.nodes,
    edges: flow.edges,
    variables: flow.variables || [],
    generatedAt: new Date().toISOString(),
    aiGenerated: true
  };
}

/**
 * Sugiere mejoras para un flujo existente
 * @param {object} flow - Flujo actual
 * @returns {Promise<object>} Sugerencias de mejora
 */
export async function suggestFlowImprovements(flow) {
  log.info('Analyzing flow for improvements', { flowName: flow.name });
  
  const analysisPrompt = `Analiza este flujo y sugiere mejoras:

FLUJO ACTUAL:
${JSON.stringify(flow, null, 2)}

Responde en JSON con este formato:
{
  "issues": [
    { "severity": "high|medium|low", "message": "Descripción del problema", "nodeId": "node_x" }
  ],
  "suggestions": [
    { "type": "add_node|modify_node|add_edge|remove", "description": "Qué hacer", "details": {} }
  ],
  "score": 85,
  "summary": "Resumen general del análisis"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Eres un experto en optimización de flujos de automatización. Analiza flujos y sugiere mejoras.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    return JSON.parse(content);
    
  } catch (error) {
    log.error('Error analyzing flow', { error: error.message });
    return {
      issues: [],
      suggestions: [],
      score: 0,
      summary: 'No se pudo analizar el flujo',
      error: error.message
    };
  }
}

/**
 * Genera descripción en lenguaje natural de un flujo existente
 * @param {object} flow - Flujo a describir
 * @returns {Promise<string>} Descripción en español
 */
export async function describeFlow(flow) {
  const prompt = `Describe este flujo de automatización en español, de forma clara y concisa para un usuario no técnico:

${JSON.stringify(flow, null, 2)}

Responde solo con la descripción, máximo 3 párrafos.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content || 'Sin descripción disponible';
    
  } catch (error) {
    log.error('Error describing flow', { error: error.message });
    return 'No se pudo generar la descripción';
  }
}

/**
 * Autocompleta un flujo parcial
 * @param {object} partialFlow - Flujo incompleto
 * @param {string} intent - Qué quiere el usuario que continúe
 * @returns {Promise<object>} Nodos/edges adicionales
 */
export async function autocompleteFlow(partialFlow, intent) {
  const prompt = `Tengo este flujo parcial y quiero ${intent}:

FLUJO ACTUAL:
${JSON.stringify(partialFlow, null, 2)}

Genera SOLO los nodos y edges adicionales necesarios (no repitas los existentes).
El último nodo existente tiene ID: ${partialFlow.nodes[partialFlow.nodes.length - 1]?.id}

Responde en JSON:
{
  "newNodes": [],
  "newEdges": []
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.data?.choices?.[0]?.message?.content || response.choices?.[0]?.message?.content;
    return JSON.parse(content);
    
  } catch (error) {
    log.error('Error autocompleting flow', { error: error.message });
    throw new Error(`Error al autocompletar: ${error.message}`);
  }
}

export default {
  generateFlowFromDescription,
  suggestFlowImprovements,
  describeFlow,
  autocompleteFlow,
  NODE_TYPES
};
