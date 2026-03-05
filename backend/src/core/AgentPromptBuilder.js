/**
 * AgentPromptBuilder - Construye system prompts dinámicos por tenant
 * 
 * Arquitectura V3 LLM-First:
 * - Sistema de prompts configurable sin hardcoding
 * - Soporta few-shot examples por dominio
 * - Multi-idioma sin diccionarios
 * - Personalidad y tono configurables
 * 
 * @module core/AgentPromptBuilder
 */

import logger from '../config/logger.js';

const log = logger.child('AgentPromptBuilder');

/**
 * Estilos de tono predefinidos
 */
const TONE_STYLES = {
  professional: 'Mantén un tono profesional y cortés. Usa lenguaje formal pero accesible.',
  friendly: 'Sé amigable y cercano. Usa un tono casual pero respetuoso. Puedes usar emojis moderadamente.',
  formal: 'Usa lenguaje formal y corporativo. Evita coloquialismos y emojis.',
  empathetic: 'Muestra empatía y comprensión. Prioriza la conexión emocional con el usuario.',
  concise: 'Sé directo y breve. Respuestas cortas y al punto.',
};

/**
 * Templates base por vertical de negocio
 */
const VERTICAL_TEMPLATES = {
  healthcare: {
    role: 'asistente virtual de salud',
    restrictions: [
      'NUNCA proporciones diagnósticos médicos',
      'No sugieras tratamientos específicos sin evaluación profesional',
      'Deriva emergencias médicas al número de emergencias correspondiente',
    ],
    examples: [
      {
        user: 'Me duele mucho la cabeza',
        assistant: 'Lamento que tengas dolor. Para una evaluación precisa necesitas consulta con un profesional. ¿Te gustaría que agende una cita lo antes posible?',
      },
    ],
  },
  
  retail: {
    role: 'asistente de atención al cliente',
    restrictions: [
      'No compartas información de otros clientes',
      'Deriva quejas complejas a un agente humano',
    ],
    examples: [
      {
        user: '¿Cuánto tarda el envío?',
        assistant: 'Los envíos estándar tardan 3-5 días hábiles. ¿Necesitas el producto con urgencia? Tenemos opción express.',
      },
    ],
  },
  
  appointments: {
    role: 'asistente de agendamiento de citas',
    restrictions: [
      'Confirma siempre los datos antes de agendar',
      'Verifica disponibilidad antes de confirmar',
    ],
    examples: [
      {
        user: 'Quiero una cita',
        assistant: '¡Perfecto! Para agendar tu cita necesito algunos datos. ¿Para qué fecha y horario te gustaría? ¿Y qué tipo de servicio necesitas?',
      },
    ],
  },
  
  general: {
    role: 'asistente virtual',
    restrictions: [
      'Solo trabaja con los datos de las tablas configuradas',
      'No inventes información que no esté en el sistema',
    ],
    examples: [
      {
        user: 'Quiero agendar algo',
        assistant: '[USA FUNCIÓN create_record] - El sistema te pedirá los datos necesarios',
      },
      {
        user: 'Qué servicios tienen?',
        assistant: '[USA FUNCIÓN query_records o revisa las tablas disponibles] - Solo menciona lo que existe en el sistema',
      },
    ],
  },
};

/**
 * Clase para construir system prompts dinámicos
 */
class AgentPromptBuilder {
  /**
   * Construye el system prompt completo para un agente
   * @param {object} config - Configuración del agente/tenant
   * @returns {string} - System prompt completo
   */
  build(config) {
    const {
      agentName = 'Asistente',
      companyName = '',
      vertical = 'general',
      tone = 'professional',
      language = 'es',
      capabilities = [],
      restrictions = [],
      businessHours = null,
      customExamples = [],
      customInstructions = '',
      tablesInfo = [],
      dateContext = {},
      businessSnapshot = null,
    } = config;
    
    const verticalTemplate = VERTICAL_TEMPLATES[vertical] || VERTICAL_TEMPLATES.general;
    const toneStyle = TONE_STYLES[tone] || TONE_STYLES.professional;
    
    // Construir prompt por secciones
    const sections = [
      this._buildIdentity(agentName, companyName, verticalTemplate.role),
      this._buildPersonality(toneStyle, language),
      this._buildCapabilities(capabilities, tablesInfo),
      this._buildRestrictions([...verticalTemplate.restrictions, ...restrictions]),
      this._buildBusinessContext(businessHours, dateContext),
      businessSnapshot ? this._buildBusinessSnapshot(businessSnapshot) : '',
      this._buildExamples([...verticalTemplate.examples, ...customExamples]),
      this._buildSpecialSituations(),
      customInstructions ? `\nINSTRUCCIONES ADICIONALES:\n${customInstructions}` : '',
    ];
    
    const prompt = sections.filter(Boolean).join('\n\n');
    
    log.debug('System prompt built', { 
      agentName, 
      vertical, 
      tone, 
      length: prompt.length,
    });
    
    return prompt;
  }
  
  /**
   * Construye la sección de identidad
   * @private
   */
  _buildIdentity(agentName, companyName, role) {
    let identity = `Eres ${agentName}`;
    if (companyName) {
      identity += `, ${role} de ${companyName}`;
    } else {
      identity += `, un ${role}`;
    }
    return identity + '.';
  }
  
  /**
   * Construye la sección de personalidad
   * @private
   */
  _buildPersonality(toneStyle, language) {
    const langInstructions = {
      es: 'Responde siempre en español.',
      en: 'Always respond in English.',
      pt: 'Sempre responda em português.',
      fr: 'Répondez toujours en français.',
    };
    
    return `ESTILO DE COMUNICACIÓN:
${toneStyle}
${langInstructions[language] || langInstructions.es}
Mantén respuestas concisas (2-3 oraciones cuando sea posible).`;
  }
  
  /**
   * Construye la sección de capacidades
   * @private
   */
  _buildCapabilities(capabilities, tablesInfo) {
    const lines = ['DATOS DISPONIBLES:'];
    
    // Capacidades explícitas
    if (capabilities.length > 0) {
      lines.push('Capacidades adicionales:');
      capabilities.forEach(cap => {
        lines.push(`- ${cap}`);
      });
      lines.push('');
    }
    
    // Tablas disponibles con detalle completo
    if (tablesInfo.length > 0) {
      lines.push('TABLAS DEL SISTEMA (SOLO PUEDES TRABAJAR CON ESTAS):');
      lines.push('');
      
      tablesInfo.forEach(table => {
        const fields = table.fields?.map(f => {
          if (typeof f === 'string') return f;
          return f.name || f.key || f.label || f;
        }).join(', ') || 'sin campos definidos';
        
        // Construir permisos
        const perms = table.permissions || {};
        const allowedActions = [];
        if (perms.canQuery !== false) allowedActions.push('consultar');
        if (perms.canCreate !== false) allowedActions.push('crear');
        if (perms.canUpdate !== false) allowedActions.push('modificar');
        if (perms.canDelete === true) allowedActions.push('eliminar');
        
        lines.push(`📋 ${table.name.toUpperCase()}`);
        lines.push(`   Campos: ${fields}`);
        lines.push(`   Acciones permitidas: ${allowedActions.join(', ') || 'solo lectura'}`);
        lines.push('');
      });
      
      // Instrucciones CRÍTICAS sobre uso de funciones
      lines.push('═══════════════════════════════════════════════════════');
      lines.push('⚠️ REGLA OBLIGATORIA: SIEMPRE DEBES USAR UNA FUNCIÓN');
      lines.push('═══════════════════════════════════════════════════════');
      lines.push('');
      lines.push('🔵 create_record - CREAR/AGENDAR/RESERVAR/REGISTRAR:');
      lines.push('   • "quiero agendar", "reservar", "crear", "registrar"');
      lines.push('   • "necesito una cita", "me gustaría reservar"');
      lines.push('   • INCLUSO si el usuario NO da todos los datos');
      lines.push('   • El sistema pedirá los datos faltantes automáticamente');
      lines.push('   • record_type = nombre EXACTO de la tabla (ej: "Citas")');
      lines.push('');
      lines.push('🔵 query_records - CONSULTAR/VER datos existentes:');
      lines.push('   • Cuando el usuario quiera ver/buscar/consultar datos');
      lines.push('   • SIEMPRE extrae TODOS los criterios de búsqueda en "filters"');
      lines.push('');
      lines.push('   🚨 REGLA CRÍTICA: EXTRAE TODOS LOS FILTROS');
      lines.push('   1. Lee el mensaje completo del usuario');
      lines.push('   2. Identifica CADA criterio mencionado (cliente, estado, fecha, etc.)');
      lines.push('   3. Mapea cada criterio al campo correcto de la tabla');
      lines.push('   4. Incluye TODOS en filters - nunca omitas ninguno');
      lines.push('');
      lines.push('   ✅ EJEMPLOS CORRECTOS:');
      lines.push('   • "ventas de Juan" → filters: {"cliente": "Juan"}');
      lines.push('   • "ventas de María con estado Pendiente" → filters: {"cliente": "María", "estado": "Pendiente"}');
      lines.push('   • "citas canceladas de hoy" → filters: {"estado": "Cancelada", "fecha": "..."}');
      lines.push('   • "busca al empleado Roberto Silva" → filters: {"nombre": "Roberto Silva"}');
      lines.push('   • "información de Ana Martínez" → filters: {"nombre": "Ana Martínez"}')
      lines.push('');
      lines.push('   ❌ ERROR COMÚN: Solo extraer UN filtro cuando hay varios');
      lines.push('   ⚠️ NUNCA envíes filters: {} cuando el usuario menciona criterios de búsqueda');
      
      // Generar ejemplos DINÁMICOS basados en tablas reales
      if (tablesInfo.length > 0) {
        lines.push('');
        lines.push('   📌 USA ESTOS CAMPOS EXACTOS PARA FILTRAR:');
        tablesInfo.forEach(table => {
          const fieldNames = table.fields?.map(f => 
            typeof f === 'string' ? f : (f.name || f.key || f.label || f)
          ) || [];
          if (fieldNames.length > 0) {
            lines.push(`   • ${table.name}: usa {${fieldNames.slice(0, 6).join(', ')}}`);
          }
        });
        
        // Ejemplo dinámico usando la primera tabla con campos
        const tableWithFields = tablesInfo.find(t => t.fields?.length > 0);
        if (tableWithFields) {
          const fields = tableWithFields.fields.map(f => 
            typeof f === 'string' ? f : (f.name || f.key || f.label || f)
          );
          const nameField = fields.find(f => /nombre|cliente|customer|contact/i.test(f)) || fields[0];
          lines.push('');
          lines.push(`   Ejemplo: "datos de Juan Pérez" en ${tableWithFields.name}`);
          lines.push(`   → filters: {"${nameField}": "Juan Pérez"}`);
        }
      }
      lines.push('');
      lines.push('🔵 check_availability - Preguntar DISPONIBILIDAD');
      lines.push('🔵 update_record - MODIFICAR/CANCELAR registros');
      lines.push('🔵 general_conversation - SOLO saludos y preguntas generales');
      lines.push('');
      lines.push('⛔ PROHIBIDO:');
      lines.push('- NO pidas datos tú mismo (¿para qué fecha?, ¿a qué hora?)');
      lines.push('- USA create_record y el sistema pedirá los datos');
      lines.push('');
      lines.push('🚨 DATOS QUE NO EXISTEN:');
      lines.push('Si el usuario pregunta por datos que NO están en las tablas disponibles');
      lines.push('(ej: pregunta por "clientes" pero no hay tabla de clientes):');
      lines.push('→ USA general_conversation con intent="info"');
      lines.push('→ Responde: "No tengo información sobre [X]. Puedo ayudarte con: [lista de tablas]."');
      lines.push('→ NUNCA uses una tabla diferente para "aproximar" la respuesta');
      lines.push('');
      lines.push('EXTRACCIÓN DE DATOS:');
      lines.push('- Si el usuario da datos, EXTRÁELOS en el campo "data"');
      lines.push('- "adrian castro mañana a las 4" → data: {cliente: "Adrian Castro", fecha: "2026-02-26", hora: "16:00"}');
      lines.push('- "quiero una cita" sin datos → data: {} (vacío OK)');
      // Lista de tablas disponibles para referencia rápida
      const tableNamesList = tablesInfo.map(t => t.name).join(', ');
      lines.push('');
      lines.push('📌 RESUMEN - TABLAS DISPONIBLES: ' + tableNamesList);
      lines.push('Si el usuario pregunta por algo que NO está en esta lista, dile que no tienes esa información.');
    } else {
      lines.push('No hay tablas configuradas. Solo puedes mantener conversación general.');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Construye la sección de restricciones
   * @private
   */
  _buildRestrictions(restrictions) {
    if (restrictions.length === 0) return '';
    
    const lines = ['RESTRICCIONES:'];
    restrictions.forEach(r => {
      lines.push(`- ${r}`);
    });
    
    return lines.join('\n');
  }
  
  /**
   * Construye el contexto de negocio (horarios, fechas)
   * @private
   */
  _buildBusinessContext(businessHours, dateContext) {
    const lines = ['CONTEXTO:'];
    
    // Fecha actual
    if (dateContext.today) {
      lines.push(`- Fecha de hoy: ${dateContext.today}`);
    }
    if (dateContext.tomorrow) {
      lines.push(`- Fecha de mañana: ${dateContext.tomorrow}`);
    }
    if (dateContext.dayOfWeek) {
      lines.push(`- Día de la semana: ${dateContext.dayOfWeek}`);
    }
    
    // Horario de atención
    if (businessHours) {
      lines.push(`\nHORARIO DE ATENCIÓN:`);
      if (typeof businessHours === 'string') {
        lines.push(businessHours);
      } else if (businessHours.schedule) {
        Object.entries(businessHours.schedule).forEach(([day, hours]) => {
          lines.push(`- ${day}: ${hours}`);
        });
      }
      if (businessHours.outsideHoursMessage) {
        lines.push(`\nFuera de horario: ${businessHours.outsideHoursMessage}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Inyecta el snapshot del negocio en el prompt
   * @private
   */
  _buildBusinessSnapshot(snapshot) {
    if (!snapshot) return '';
    return snapshot; // Viene pre-formateado de BusinessSnapshot.js
  }
  
  /**
   * Construye la sección de ejemplos (few-shot)
   * @private
   */
  _buildExamples(examples) {
    if (examples.length === 0) return '';
    
    const lines = ['EJEMPLOS DE CONVERSACIÓN:'];
    
    examples.forEach(ex => {
      lines.push(`\nUsuario: "${ex.user}"`);
      lines.push(`Tú: "${ex.assistant}"`);
    });
    
    return lines.join('\n');
  }
  
  /**
   * Construye instrucciones para situaciones especiales
   * @private
   */
  _buildSpecialSituations() {
    return `EJEMPLOS DE USO CORRECTO:

✅ Usuario: "quiero agendar una cita"
   → Llama create_record con record_type="[tabla de citas]", data={}

✅ Usuario: "soy adrian castro para mañana a las 4"
   → Llama create_record extrayendo los datos mencionados en "data"

✅ Usuario: "dame la información de [NOMBRE]"
   → Llama query_records 
   → Busca en "Campos" de la tabla cuál guarda nombres
   → Usa ESE campo en filters

✅ Usuario: "registros que estén [ESTADO]"
   → Llama query_records
   → Busca en "Campos" de la tabla cuál guarda estados
   → Usa ESE campo en filters

✅ Usuario: "hola"
   → Llama general_conversation con intent="greeting"

⚠️ IMPORTANTE:
- Los campos varían por empresa: puede ser "cliente", "nombre", "customer", etc.
- SIEMPRE mira la sección "TABLAS DEL SISTEMA" para ver los campos REALES
- El usuario dice "cliente" pero el campo puede llamarse diferente

RECUERDA:
1. SIEMPRE usa una función
2. Para crear/agendar → create_record (aunque falten datos)
3. Para consultar → query_records con filtros en campos REALES de la tabla
4. El sistema pide los datos faltantes automáticamente`;
  }
  
  /**
   * Construye prompt para clasificación de mensaje (garbage/spam/valid)
   * Reemplaza los regex hardcodeados
   * @param {string} message - Mensaje a clasificar
   * @returns {string} - Prompt para clasificación
   */
  buildClassificationPrompt(message) {
    return `Clasifica el siguiente mensaje del usuario en UNA de estas categorías:

- VALID: Mensaje coherente relacionado con el negocio o una solicitud clara
- GARBAGE: Texto sin sentido, caracteres aleatorios, testing (ej: "asdfasdf", "aaaa", "123123")
- SPAM: Publicidad, promociones no solicitadas, contenido comercial no deseado
- ABUSE: Contenido ofensivo, inapropiado o dañino
- OFF_TOPIC: Pregunta coherente pero no relacionada con el negocio

REGLAS:
1. Mensajes muy cortos como "hola", "si", "no", "ok" son VALID
2. Saludos, despedidas, agradecimientos son VALID
3. Si dudas entre VALID y otra categoría, elige VALID
4. Palabras reales aunque con typos son VALID

Mensaje: "${String(message).slice(0, 200)}"

Responde SOLO con la categoría (una palabra).`;
  }
  
  /**
   * Obtiene la configuración por defecto basada en el agente
   * @param {object} agent - Objeto agente de la BD
   * @returns {object} - Configuración extraída del agente
   */
  extractConfigFromAgent(agent) {
    return {
      agentName: agent?.name || 'Asistente',
      companyName: agent?.companyName || agent?.workspaceName || '',
      vertical: agent?.vertical || agent?.businessType || 'general',
      tone: agent?.tone || agent?.personality || 'professional',
      language: agent?.language || 'es',
      capabilities: agent?.capabilities || [],
      restrictions: agent?.restrictions || [],
      businessHours: agent?.businessHours || null,
      customExamples: agent?.examples || agent?.fewShotExamples || [],
      customInstructions: agent?.customInstructions || agent?.systemPrompt || '',
    };
  }
}

// Singleton
let instance = null;

/**
 * Obtiene la instancia del AgentPromptBuilder
 * @returns {AgentPromptBuilder}
 */
export function getAgentPromptBuilder() {
  if (!instance) {
    instance = new AgentPromptBuilder();
  }
  return instance;
}

export { AgentPromptBuilder, TONE_STYLES, VERTICAL_TEMPLATES };
export default AgentPromptBuilder;
