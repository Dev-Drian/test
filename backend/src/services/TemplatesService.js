/**
 * TemplatesService - Marketplace de Templates con IA
 * 
 * Templates predefinidos para diferentes industrias y casos de uso.
 * La IA puede sugerir templates basados en la descripción del negocio.
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import OpenAI from 'openai';

const log = logger.child('TemplatesService');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Templates predefinidos del sistema
 */
export const SYSTEM_TEMPLATES = [
  // E-commerce
  {
    id: 'ecommerce_support',
    name: 'Soporte E-commerce',
    category: 'E-commerce',
    industry: 'Retail',
    icon: 'SHOP',
    description: 'Asistente para tiendas online: consultas de pedidos, devoluciones, envíos',
    tags: ['soporte', 'pedidos', 'envíos', 'devoluciones'],
    preview: 'Ideal para tiendas Shopify, WooCommerce, etc.',
    popularity: 95,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'menu', type: 'response', data: { message: '¡Hola! 👋 ¿En qué puedo ayudarte?\n\n1️⃣ Consultar mi pedido\n2️⃣ Hacer una devolución\n3️⃣ Información de envío\n4️⃣ Hablar con un humano' }},
        { id: 'condition', type: 'condition', data: { conditions: [
          { option: '1', target: 'order_query' },
          { option: '2', target: 'return_flow' },
          { option: '3', target: 'shipping_info' },
          { option: '4', target: 'human_handoff' }
        ]}},
        { id: 'order_query', type: 'query', data: { table: 'orders', queryField: 'order_id' }},
        { id: 'return_flow', type: 'response', data: { message: 'Para procesar tu devolución necesito:\n📦 Número de pedido\n📸 Fotos del producto' }},
        { id: 'shipping_info', type: 'response', data: { message: '📦 Envíos:\n• Estándar: 3-5 días ($5)\n• Express: 1-2 días ($15)\n• Gratis en compras +$50' }},
        { id: 'human_handoff', type: 'action', data: { action: 'handoff', department: 'support' }}
      ],
      edges: [
        { source: 'start', target: 'menu' },
        { source: 'menu', target: 'condition' }
      ]
    },
    variables: [
      { key: 'nombre_tienda', label: 'Nombre de tu tienda', default: 'MiTienda' },
      { key: 'email_soporte', label: 'Email de soporte', default: 'soporte@mitienda.com' }
    ]
  },
  
  // Restaurantes
  {
    id: 'restaurant_reservations',
    name: 'Reservas Restaurante',
    category: 'Restaurants',
    industry: 'Hospitality',
    icon: 'REST',
    description: 'Gestión de reservas, menú del día, horarios',
    tags: ['reservas', 'restaurante', 'menú', 'horarios'],
    preview: 'Perfecto para restaurantes y cafeterías',
    popularity: 88,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'greeting', type: 'response', data: { message: '¡Bienvenido a {{nombre_restaurante}}! 🍽️\n\n¿Qué deseas hacer?\n\n1️⃣ Hacer una reserva\n2️⃣ Ver el menú\n3️⃣ Conocer horarios\n4️⃣ Ubicación' }},
        { id: 'reservation', type: 'response', data: { message: '📅 ¿Para qué fecha te gustaría reservar?\n(Ejemplo: 15 de enero)' }},
        { id: 'time', type: 'response', data: { message: '⏰ ¿A qué hora? Horario disponible: {{horario_reservas}}' }},
        { id: 'people', type: 'response', data: { message: '👥 ¿Cuántas personas?' }},
        { id: 'confirm', type: 'action', data: { action: 'createReservation' }},
        { id: 'menu', type: 'response', data: { message: '📜 Nuestro menú del día:\n\n{{menu_del_dia}}\n\n¿Te gustaría reservar mesa?' }},
        { id: 'hours', type: 'response', data: { message: '🕐 Horarios:\n{{horario_atencion}}\n\n📍 Ubicación: {{direccion}}' }}
      ],
      edges: [
        { source: 'start', target: 'greeting' }
      ]
    },
    variables: [
      { key: 'nombre_restaurante', label: 'Nombre del restaurante', default: 'Mi Restaurante' },
      { key: 'horario_atencion', label: 'Horario de atención', default: 'Lun-Sáb: 12:00 - 23:00' },
      { key: 'horario_reservas', label: 'Horario para reservas', default: '13:00 - 22:00' },
      { key: 'menu_del_dia', label: 'Menú del día', default: '🥗 Entrada: Ensalada\n🍝 Principal: Pasta\n🍰 Postre: Tiramisú' }
    ]
  },
  
  // Servicios Médicos
  {
    id: 'medical_appointments',
    name: 'Citas Médicas',
    category: 'Healthcare',
    industry: 'Health',
    icon: 'MED',
    description: 'Agendamiento de citas, recordatorios, información de servicios médicos',
    tags: ['citas', 'médico', 'salud', 'agenda'],
    preview: 'Para consultorios, clínicas y hospitales',
    popularity: 92,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'menu', type: 'response', data: { message: '🏥 {{nombre_clinica}}\n\n¿En qué podemos ayudarte?\n\n1️⃣ Agendar cita\n2️⃣ Cancelar/reagendar cita\n3️⃣ Consultar horarios disponibles\n4️⃣ Información de servicios\n5️⃣ Emergencias' }},
        { id: 'specialty', type: 'response', data: { message: '👨‍⚕️ ¿Con qué especialidad deseas agendar?\n\n{{especialidades}}' }},
        { id: 'date', type: 'response', data: { message: '📅 ¿Para qué fecha? Los horarios disponibles son:\n{{horarios_disponibles}}' }},
        { id: 'confirm_appointment', type: 'action', data: { action: 'createAppointment' }},
        { id: 'emergency', type: 'response', data: { message: '🚨 EMERGENCIAS:\nLlama al {{telefono_emergencias}}\n\nDirección: {{direccion}}\n\nAbierto 24/7' }}
      ],
      edges: [
        { source: 'start', target: 'menu' }
      ]
    },
    variables: [
      { key: 'nombre_clinica', label: 'Nombre de la clínica', default: 'Clínica Salud' },
      { key: 'especialidades', label: 'Especialidades', default: '• Medicina General\n• Pediatría\n• Cardiología\n• Dermatología' },
      { key: 'telefono_emergencias', label: 'Teléfono emergencias', default: '911' }
    ]
  },
  
  // Inmobiliaria
  {
    id: 'real_estate',
    name: 'Inmobiliaria',
    category: 'Real Estate',
    industry: 'Real Estate',
    icon: 'HOME',
    description: 'Consultas de propiedades, agendamiento de visitas, financiamiento',
    tags: ['inmobiliaria', 'propiedades', 'casas', 'departamentos'],
    preview: 'Para agentes y agencias inmobiliarias',
    popularity: 85,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'greeting', type: 'response', data: { message: '🏠 ¡Hola! Soy el asistente de {{nombre_inmobiliaria}}\n\n¿Qué buscas?\n\n1️⃣ Comprar propiedad\n2️⃣ Rentar propiedad\n3️⃣ Vender mi propiedad\n4️⃣ Agendar visita\n5️⃣ Información de financiamiento' }},
        { id: 'buy', type: 'response', data: { message: '🏡 ¿Qué tipo de propiedad buscas?\n\n1️⃣ Casa\n2️⃣ Departamento\n3️⃣ Terreno\n4️⃣ Local comercial' }},
        { id: 'budget', type: 'response', data: { message: '💰 ¿Cuál es tu presupuesto aproximado?\n\n1️⃣ Hasta $100,000\n2️⃣ $100,000 - $250,000\n3️⃣ $250,000 - $500,000\n4️⃣ Más de $500,000' }},
        { id: 'location', type: 'response', data: { message: '📍 ¿En qué zona te interesa?\n{{zonas_disponibles}}' }},
        { id: 'results', type: 'query', data: { table: 'properties', filters: ['type', 'budget', 'location'] }},
        { id: 'schedule_visit', type: 'response', data: { message: '📅 Perfecto. ¿Qué día te gustaría visitar la propiedad?\n\nHorarios disponibles: {{horarios_visitas}}' }}
      ],
      edges: [
        { source: 'start', target: 'greeting' }
      ]
    },
    variables: [
      { key: 'nombre_inmobiliaria', label: 'Nombre de la inmobiliaria', default: 'InmoPlus' },
      { key: 'zonas_disponibles', label: 'Zonas disponibles', default: '• Centro\n• Norte\n• Sur\n• Playa' },
      { key: 'horarios_visitas', label: 'Horarios de visitas', default: 'Lun-Sáb 9:00 - 18:00' }
    ]
  },
  
  // Gimnasio
  {
    id: 'gym_membership',
    name: 'Gimnasio',
    category: 'Fitness',
    industry: 'Sports',
    icon: 'FIT',
    description: 'Información de membresías, clases, horarios',
    tags: ['gimnasio', 'fitness', 'membresía', 'clases'],
    preview: 'Para gimnasios y centros deportivos',
    popularity: 78,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'menu', type: 'response', data: { message: '💪 ¡Bienvenido a {{nombre_gym}}!\n\n1️⃣ Planes y precios\n2️⃣ Horario de clases\n3️⃣ Agendar clase gratis\n4️⃣ Mi membresía\n5️⃣ Ubicación' }},
        { id: 'plans', type: 'response', data: { message: '🏋️ Nuestros planes:\n\n{{planes_membresia}}\n\n¿Te gustaría una clase de prueba GRATIS?' }},
        { id: 'classes', type: 'response', data: { message: '🧘 Horario de clases:\n\n{{horario_clases}}' }},
        { id: 'free_class', type: 'response', data: { message: '🎉 ¡Genial! Para tu clase gratis necesito:\n\n📝 Tu nombre\n📱 Teléfono\n🗓️ Día preferido' }}
      ],
      edges: [
        { source: 'start', target: 'menu' }
      ]
    },
    variables: [
      { key: 'nombre_gym', label: 'Nombre del gimnasio', default: 'PowerGym' },
      { key: 'planes_membresia', label: 'Planes de membresía', default: '• Básico: $30/mes\n• Plus: $50/mes\n• Premium: $80/mes' },
      { key: 'horario_clases', label: 'Horario de clases', default: '• 7:00 Spinning\n• 9:00 Yoga\n• 18:00 CrossFit\n• 19:00 Zumba' }
    ]
  },
  
  // Agencia de Viajes
  {
    id: 'travel_agency',
    name: 'Agencia de Viajes',
    category: 'Travel',
    industry: 'Tourism',
    icon: 'TRAVEL',
    description: 'Consultas de paquetes, reservaciones, cotizaciones',
    tags: ['viajes', 'turismo', 'paquetes', 'reservaciones'],
    preview: 'Para agencias de viajes y tour operadores',
    popularity: 82,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'greeting', type: 'response', data: { message: '✈️ ¡Hola viajero! Soy de {{nombre_agencia}}\n\n¿Qué te gustaría hacer?\n\n1️⃣ Ver paquetes disponibles\n2️⃣ Cotizar un viaje\n3️⃣ Mis reservaciones\n4️⃣ Ofertas especiales\n5️⃣ Hablar con un agente' }},
        { id: 'packages', type: 'response', data: { message: '🌴 Paquetes destacados:\n\n{{paquetes_destacados}}\n\n¿Te interesa alguno?' }},
        { id: 'quote', type: 'response', data: { message: '📝 Para cotizar tu viaje ideal:\n\n🌍 ¿A dónde quieres ir?\n📅 ¿Fechas aproximadas?\n👥 ¿Cuántas personas?' }},
        { id: 'offers', type: 'response', data: { message: '🔥 OFERTAS ESPECIALES:\n\n{{ofertas_especiales}}\n\n¡Reserva hoy y obtén descuento!' }}
      ],
      edges: [
        { source: 'start', target: 'greeting' }
      ]
    },
    variables: [
      { key: 'nombre_agencia', label: 'Nombre de la agencia', default: 'ViajaYa' },
      { key: 'paquetes_destacados', label: 'Paquetes destacados', default: '• Cancún 5D/4N desde $499\n• Europa 10D desde $1,999\n• Disney 4D desde $899' },
      { key: 'ofertas_especiales', label: 'Ofertas especiales', default: '• 2x1 en Cancún\n• 30% off cruceros\n• Niños gratis Disney' }
    ]
  },
  
  // Educación
  {
    id: 'education_school',
    name: 'Centro Educativo',
    category: 'Education',
    industry: 'Education',
    icon: 'EDU',
    description: 'Información de inscripciones, cursos, horarios',
    tags: ['escuela', 'educación', 'cursos', 'inscripciones'],
    preview: 'Para escuelas, academias y centros de formación',
    popularity: 75,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'menu', type: 'response', data: { message: '📚 {{nombre_institucion}}\n\n¿En qué podemos ayudarte?\n\n1️⃣ Información de cursos\n2️⃣ Proceso de inscripción\n3️⃣ Horarios y precios\n4️⃣ Becas disponibles\n5️⃣ Contactar admisiones' }},
        { id: 'courses', type: 'response', data: { message: '📖 Nuestros programas:\n\n{{programas_disponibles}}\n\n¿Sobre cuál te gustaría más información?' }},
        { id: 'enrollment', type: 'response', data: { message: '📝 Proceso de inscripción:\n\n{{proceso_inscripcion}}\n\n¿Te gustaría iniciar tu inscripción?' }},
        { id: 'scholarships', type: 'response', data: { message: '🎓 Becas disponibles:\n\n{{becas_info}}\n\n¿Te gustaría aplicar?' }}
      ],
      edges: [
        { source: 'start', target: 'menu' }
      ]
    },
    variables: [
      { key: 'nombre_institucion', label: 'Nombre de la institución', default: 'Academia Saber' },
      { key: 'programas_disponibles', label: 'Programas', default: '• Inglés\n• Computación\n• Matemáticas\n• Música' },
      { key: 'proceso_inscripcion', label: 'Proceso de inscripción', default: '1. Llenar formulario\n2. Documentos\n3. Pago\n4. ¡Listo!' },
      { key: 'becas_info', label: 'Info de becas', default: '• Excelencia: 50%\n• Deportiva: 30%\n• Necesidad: 40%' }
    ]
  },
  
  // Servicios Legales
  {
    id: 'legal_services',
    name: 'Servicios Legales',
    category: 'Legal',
    industry: 'Professional Services',
    icon: 'LEGAL',
    description: 'Consultas legales, agendamiento de citas, información de servicios',
    tags: ['abogado', 'legal', 'consulta', 'asesoría'],
    preview: 'Para bufetes y abogados independientes',
    popularity: 70,
    flow: {
      nodes: [
        { id: 'start', type: 'trigger', data: { triggerType: 'message' } },
        { id: 'greeting', type: 'response', data: { message: '⚖️ {{nombre_bufete}}\n\n¿En qué área legal necesitas ayuda?\n\n1️⃣ Derecho Familiar\n2️⃣ Derecho Laboral\n3️⃣ Derecho Penal\n4️⃣ Derecho Civil\n5️⃣ Consulta gratuita' }},
        { id: 'family', type: 'response', data: { message: '👨‍👩‍👧 Derecho Familiar:\n\n• Divorcios\n• Custodia\n• Pensión alimenticia\n• Adopción\n\n¿Te gustaría agendar una consulta?' }},
        { id: 'free_consult', type: 'response', data: { message: '📞 Consulta gratuita de 15 minutos.\n\nPara agendar necesito:\n📝 Tu nombre\n📱 Teléfono\n📋 Breve descripción del caso' }}
      ],
      edges: [
        { source: 'start', target: 'greeting' }
      ]
    },
    variables: [
      { key: 'nombre_bufete', label: 'Nombre del bufete', default: 'García & Asociados' }
    ]
  }
];

/**
 * Obtiene tags únicos de los templates
 */
function getDbName(workspaceId) {
  return `workspace_${workspaceId}_templates`;
}

/**
 * Lista todos los templates disponibles
 */
export function listTemplates(filters = {}) {
  let templates = [...SYSTEM_TEMPLATES];
  
  if (filters.category) {
    templates = templates.filter(t => t.category === filters.category);
  }
  
  if (filters.industry) {
    templates = templates.filter(t => t.industry === filters.industry);
  }
  
  if (filters.search) {
    const search = filters.search.toLowerCase();
    templates = templates.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search) ||
      t.tags.some(tag => tag.includes(search))
    );
  }
  
  // Ordenar por popularidad
  templates.sort((a, b) => b.popularity - a.popularity);
  
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    industry: t.industry,
    icon: t.icon,
    description: t.description,
    tags: t.tags,
    preview: t.preview,
    popularity: t.popularity,
    variablesCount: t.variables?.length || 0,
    nodesCount: t.flow?.nodes?.length || 0
  }));
}

/**
 * Obtiene un template por ID
 */
export function getTemplate(templateId) {
  return SYSTEM_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Obtiene categorías disponibles
 */
export function getCategories() {
  const categories = new Map();
  
  for (const template of SYSTEM_TEMPLATES) {
    if (!categories.has(template.category)) {
      categories.set(template.category, { name: template.category, count: 0 });
    }
    categories.get(template.category).count++;
  }
  
  return Array.from(categories.values());
}

/**
 * Obtiene industrias disponibles
 */
export function getIndustries() {
  const industries = new Set();
  SYSTEM_TEMPLATES.forEach(t => industries.add(t.industry));
  return Array.from(industries);
}

/**
 * Sugiere templates usando IA basándose en descripción del negocio
 */
export async function suggestTemplates(businessDescription) {
  try {
    const templatesSummary = SYSTEM_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      industry: t.industry,
      description: t.description,
      tags: t.tags
    }));
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Eres un experto en automatización de conversaciones. Te daré una descripción de un negocio y una lista de templates disponibles. Sugiere los 3 templates más relevantes y explica por qué.

Templates disponibles:
${JSON.stringify(templatesSummary, null, 2)}

Responde en JSON:
{
  "suggestions": [
    {
      "templateId": "id del template",
      "relevance": 1-100,
      "reason": "Por qué es relevante para este negocio"
    }
  ],
  "customization": "Sugerencias de personalización",
  "additionalNeeds": "Qué otras automatizaciones podría necesitar este negocio"
}`
      }, {
        role: 'user',
        content: businessDescription
      }],
      response_format: { type: 'json_object' },
      temperature: 0.5
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    // Enriquecer con datos completos del template
    result.suggestions = result.suggestions.map(s => ({
      ...s,
      template: SYSTEM_TEMPLATES.find(t => t.id === s.templateId)
    }));
    
    return result;
    
  } catch (error) {
    log.error('Error suggesting templates', { error: error.message });
    
    // Fallback: sugerir los más populares
    return {
      suggestions: SYSTEM_TEMPLATES
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3)
        .map(t => ({
          templateId: t.id,
          template: t,
          relevance: t.popularity,
          reason: 'Template popular y versátil'
        })),
      customization: 'Personaliza las variables según tu negocio',
      additionalNeeds: 'Considera agregar integraciones con tu CRM'
    };
  }
}

/**
 * Instala un template en un workspace
 */
export async function installTemplate(workspaceId, templateId, customVariables = {}) {
  const template = getTemplate(templateId);
  
  if (!template) {
    throw new Error('Template no encontrado');
  }
  
  // Preparar el flujo con variables personalizadas
  let flowDefinition = JSON.stringify(template.flow);
  
  // Reemplazar variables con valores personalizados o defaults
  for (const variable of template.variables || []) {
    const value = customVariables[variable.key] || variable.default;
    flowDefinition = flowDefinition.replace(
      new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g'),
      value
    );
  }
  
  // Crear el flujo en la BD
  const flowsDb = await connectDB(`workspace_${workspaceId}_flows`);
  
  const newFlow = {
    _id: `flow_${uuidv4().substring(0, 8)}`,
    type: 'flow',
    name: `${template.name} (desde template)`,
    description: template.description,
    definition: JSON.parse(flowDefinition),
    templateId: template.id,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await flowsDb.insert(newFlow);
  
  // Registrar instalación
  try {
    const templatesDb = await connectDB(getDbName(workspaceId));
    await templatesDb.insert({
      _id: `install_${Date.now()}`,
      type: 'template_installation',
      templateId,
      flowId: newFlow._id,
      customVariables,
      installedAt: new Date().toISOString()
    });
  } catch {}
  
  log.info('Template installed', { workspaceId, templateId, flowId: newFlow._id });
  
  return {
    flowId: newFlow._id,
    flowName: newFlow.name,
    message: 'Template instalado correctamente'
  };
}

/**
 * Genera un template personalizado con IA
 */
export async function generateCustomTemplate(businessInfo) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `Eres un experto en diseño de chatbots y automatización de conversaciones. Genera un flujo conversacional completo para el negocio descrito.

El flujo debe incluir:
- Un nodo de inicio (trigger)
- Mensajes de bienvenida y menú principal
- Flujos para las funcionalidades principales del negocio
- Manejo de preguntas frecuentes
- Opción de contacto humano

Responde en JSON con la estructura:
{
  "name": "Nombre del template",
  "category": "Categoría",
  "industry": "Industria",
  "icon": "emoji",
  "description": "Descripción",
  "tags": ["tag1", "tag2"],
  "flow": {
    "nodes": [
      { "id": "...", "type": "trigger|response|condition|action|query", "data": {...} }
    ],
    "edges": [
      { "source": "nodeId", "target": "nodeId" }
    ]
  },
  "variables": [
    { "key": "...", "label": "...", "default": "..." }
  ]
}`
      }, {
        role: 'user',
        content: `Genera un template para: ${JSON.stringify(businessInfo)}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });
    
    return JSON.parse(response.choices[0].message.content);
    
  } catch (error) {
    log.error('Error generating custom template', { error: error.message });
    throw error;
  }
}

/**
 * Guarda un flujo como template personalizado
 */
export async function saveAsTemplate(workspaceId, flowId, templateInfo) {
  const flowsDb = await connectDB(`workspace_${workspaceId}_flows`);
  const flow = await flowsDb.get(flowId);
  
  const templatesDb = await connectDB(getDbName(workspaceId));
  
  const customTemplate = {
    _id: `custom_${uuidv4().substring(0, 8)}`,
    type: 'custom_template',
    name: templateInfo.name || flow.name,
    category: templateInfo.category || 'Custom',
    industry: templateInfo.industry || 'General',
    icon: templateInfo.icon || '📋',
    description: templateInfo.description || '',
    tags: templateInfo.tags || [],
    flow: flow.definition,
    variables: templateInfo.variables || [],
    createdAt: new Date().toISOString(),
    isPublic: templateInfo.isPublic || false
  };
  
  await templatesDb.insert(customTemplate);
  
  return customTemplate;
}

/**
 * Lista templates personalizados de un workspace
 */
export async function listCustomTemplates(workspaceId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    const result = await db.find({
      selector: { type: 'custom_template' }
    });
    
    return result.docs || [];
  } catch {
    return [];
  }
}

export default {
  SYSTEM_TEMPLATES,
  listTemplates,
  getTemplate,
  getCategories,
  getIndustries,
  suggestTemplates,
  installTemplate,
  generateCustomTemplate,
  saveAsTemplate,
  listCustomTemplates
};
