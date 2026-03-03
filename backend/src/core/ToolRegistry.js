/**
 * ToolRegistry - Registro de herramientas para Function Calling
 * 
 * Arquitectura V3 LLM-First:
 * - Define tools en formato OpenAI Function Calling
 * - Elimina hardcoding de keywords/regex
 * - El LLM decide qué tool usar basándose en semántica
 * 
 * @module core/ToolRegistry
 */

import logger from '../config/logger.js';

const log = logger.child('ToolRegistry');

/**
 * Definición de herramientas disponibles
 * Formato compatible con OpenAI Function Calling
 */
const CORE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Consulta disponibilidad de horarios, citas libres, o espacios disponibles. Usa esta herramienta cuando el usuario pregunte por horarios disponibles, si hay espacio, o cuándo puede agendar.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha para consultar disponibilidad en formato YYYY-MM-DD. Si el usuario dice "hoy", "mañana", "el lunes", convierte a fecha.',
          },
          service: {
            type: 'string',
            description: 'Tipo de servicio o cita a consultar (ej: "consulta", "limpieza dental", "corte de pelo")',
          },
          time_preference: {
            type: 'string',
            description: 'Preferencia de horario: "mañana", "tarde", "noche", o hora específica "14:00"',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_record',
      description: 'OBLIGATORIO cuando el usuario quiera: agendar, reservar, crear, registrar, agregar, hacer un pedido, ordenar, comprar, solicitar cualquier cosa (en español, inglés o cualquier idioma). Si el usuario dice "quiero hacer un pedido", "quiero pedir", "quiero comprar", "quiero ordenar" → SIEMPRE usar esta función, NUNCA query_records. Usa SIEMPRE esta función aunque el usuario NO proporcione todos los datos - el sistema pedirá los datos faltantes automáticamente. Funciona con: "quiero agendar", "I want to book", "registrar venta", "hacer pedido de 3 cosas", "create appointment", etc.',
      parameters: {
        type: 'object',
        properties: {
          record_type: {
            type: 'string',
            description: 'Nombre EXACTO de la tabla (ej: "Citas", "Clientes", "Ventas", "Tareas"). Usa mayúsculas tal como aparece en la lista de tablas.',
          },
          data: {
            type: 'object',
            description: `EXTRAE TODOS los datos que el usuario proporcionó en su mensaje. 
            
REGLAS DE EXTRACCIÓN:
1. Lee el mensaje COMPLETO y extrae TODO lo mencionado
2. Nombres de personas → campo "cliente" o "nombre"
3. Fechas relativas: "hoy" → fecha actual, "mañana" → siguiente día
4. Horas: "a las 4" → "16:00", "9am" → "09:00"
5. Productos/servicios mencionados → campo correspondiente    
6. Cantidades → campo "cantidad"
7. Si dice "soy [nombre]" → extraer el nombre

EJEMPLOS:
- "Hola, soy Luis y quiero agendar una cita para mañana" → {"cliente": "Luis", "fecha": "2026-02-28"}
- "Registrar venta de 5 camisetas para María" → {"cliente": "María", "producto": "camisetas", "cantidad": 5}
- "I want to book an appointment for tomorrow at 3pm" → {"fecha": "2026-02-28", "hora": "15:00"}
- "agregar tarea: llamar al doctor" → {"titulo": "llamar al doctor"}
- "quiero una cita" (sin datos) → {} vacío está OK`,
            additionalProperties: true,
          },
        },
        required: ['record_type', 'data'],
      },
    },
  },
  {
    type: 'function', 
    function: {
      name: 'query_records',
      description: 'Consulta registros existentes: ver citas, listar clientes, buscar productos, mostrar ventas. Funciona en cualquier idioma: "ver clientes", "show me clients", "list appointments", "mostrar ventas". Usa esta herramienta cuando el usuario quiera ver, consultar, listar, buscar, o mostrar datos existentes.',
      parameters: {
        type: 'object',
        properties: {
          record_type: {
            type: 'string',
            description: 'Tipo de registro a consultar. Usa el nombre EXACTO de la tabla (ej: "Clientes", "Ventas", "Citas", "Tareas", "Productos").',
          },
          filters: {
            type: 'object',
            description: `CRÍTICO: Extrae TODOS los criterios de búsqueda del mensaje del usuario.
            
REGLAS:
1. Cada criterio mencionado = un campo en filters
2. Usa los nombres de campos de la tabla (cliente, estado, fecha, producto, etc.)
3. NUNCA devuelvas {} si el usuario menciona criterios
4. Funciona con español, inglés, portugués, etc.

EJEMPLOS:
- "ventas de Juan" / "sales from Juan" → {"cliente": "Juan"}
- "ventas de María García con estado pendiente" → {"cliente": "María García", "estado": "Pendiente"}
- "citas de hoy" / "appointments for today" → {"fecha": "2026-02-27"}
- "clientes activos de Bogotá" → {"estado": "Activo", "ciudad": "Bogotá"}
- "show me all clients" → {} (consulta general, sin filtros)
- "tareas pendientes" / "pending tasks" → {"estado": "Pendiente"}

Si el usuario NO menciona ningún criterio específico (solo "ver clientes") → {} vacío está OK.`,
            additionalProperties: true,
          },
          limit: {
            type: 'integer',
            description: 'Número máximo de resultados. Default: 10',
            default: 10,
          },
        },
        required: ['record_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_record',
      description: 'Modifica un registro existente: cambiar cita, actualizar cliente, modificar precio, cancelar reserva. Usa esta herramienta cuando el usuario quiera modificar, cambiar, actualizar, mover, o cancelar algo existente.',
      parameters: {
        type: 'object',
        properties: {
          record_type: {
            type: 'string',
            description: 'Tipo de registro a modificar.',
          },
          search_criteria: {
            type: 'object',
            description: 'Criterios para identificar el registro a modificar.',
            additionalProperties: true,
          },
          updates: {
            type: 'object',
            description: 'Campos a actualizar con sus nuevos valores.',
            additionalProperties: true,
          },
          action: {
            type: 'string',
            enum: ['update', 'cancel', 'reschedule'],
            description: 'Tipo de modificación: update para cambios generales, cancel para cancelar/anular, reschedule para mover de fecha/hora.',
          },
        },
        required: ['record_type', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_data',
      description: 'Analiza datos: totales, promedios, estadísticas, reportes. Usa esta herramienta cuando el usuario pregunte por totales, cuántos, promedios, porcentajes, o resúmenes.',
      parameters: {
        type: 'object',
        properties: {
          analysis_type: {
            type: 'string',
            enum: ['count', 'sum', 'average', 'min', 'max', 'distribution'],
            description: 'Tipo de análisis requerido.',
          },
          record_type: {
            type: 'string',
            description: 'Tipo de registro a analizar.',
          },
          field: {
            type: 'string',
            description: 'Campo sobre el cual realizar el análisis.',
          },
          filters: {
            type: 'object',
            description: 'Filtros para limitar el análisis.',
            additionalProperties: true,
          },
        },
        required: ['analysis_type', 'record_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'general_conversation',
      description: 'Responde a saludos, preguntas generales, o conversación casual en CUALQUIER idioma (español, inglés, portugués, spanglish). Usa esta herramienta cuando el mensaje NO sea una acción sobre datos: saludos (hola, hi, hello, oi), agradecimientos (gracias, thanks), preguntas sobre el negocio, información general. También para mensajes con emojis: "👋 hola", "hi there! 🎉".',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            enum: ['greeting', 'farewell', 'thanks', 'help', 'info', 'other'],
            description: 'Tipo de mensaje conversacional.',
          },
          topic: {
            type: 'string',
            description: 'Tema de la pregunta si es sobre información del negocio.',
          },
        },
        required: ['intent'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setup_workspace',
      description: `Configura el workspace con tablas y vistas prediseñadas. Usa esta herramienta cuando el usuario quiera:
- Configurar un sistema completo (POS, CRM, citas, etc.)
- "Quiero un sistema para mi restaurante"
- "Ayúdame a configurar mi negocio"
- "Necesito tablas para una clínica"
- "Configura un sistema de ventas"

NO uses para crear una sola tabla o campo - solo para configuraciones completas de negocio.`,
      parameters: {
        type: 'object',
        properties: {
          business_type: {
            type: 'string',
            description: 'Tipo de negocio detectado: restaurante, clinica, ventas, reservas, tareas, o null si no está claro.',
          },
          user_request: {
            type: 'string',
            description: 'Lo que el usuario pidió textualmente.',
          },
          action: {
            type: 'string',
            enum: ['generate_plan', 'confirm', 'modify', 'cancel'],
            description: 'generate_plan=primera vez, confirm=usuario dijo sí, modify=usuario quiere cambiar algo, cancel=usuario canceló.',
          },
          modification: {
            type: 'string',
            description: 'Si action=modify, qué quiere modificar el usuario.',
          },
        },
        required: ['user_request', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_flow',
      description: `Crea automatizaciones (flujos) en el sistema. Usa esta herramienta cuando el usuario quiera:
- Crear un flujo de automatización
- "Quiero que cuando se cree un usuario se envíe un email"
- "Notificar por correo cuando haya un nuevo pedido"
- "Crear una automatización para..."
- "Cuando se cree un registro en X, hacer Y"
- "Enviar notificación al Gmail cuando..."

Detecta la tabla mencionada y propone el flujo apropiado.`,
      parameters: {
        type: 'object',
        properties: {
          user_request: {
            type: 'string',
            description: 'Lo que el usuario pidió textualmente.',
          },
          trigger_table: {
            type: 'string',
            description: 'Nombre de la tabla que dispara el flujo (usuarios, clientes, pedidos, etc.) o null si no está claro.',
          },
          trigger_event: {
            type: 'string',
            enum: ['afterCreate', 'afterUpdate', 'beforeCreate', 'schedule'],
            description: 'Evento que dispara el flujo.',
          },
          action_type: {
            type: 'string',
            enum: ['sendEmail', 'createRecord', 'updateRecord', 'notify', 'webhook'],
            description: 'Tipo de acción a realizar.',
          },
          action: {
            type: 'string',
            enum: ['analyze', 'propose', 'confirm', 'cancel'],
            description: 'analyze=primera vez para analizar tablas, propose=mostrar propuesta, confirm=crear el flujo, cancel=cancelar.',
          },
        },
        required: ['user_request', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_table',
      description: `Crea una nueva tabla en el workspace. Usa esta herramienta cuando el usuario quiera:
- "Crear una tabla de clientes"
- "Necesito una tabla para productos"
- "Quiero agregar una tabla de ventas"
- "Crea una tabla llamada X con campos Y, Z"

NO uses para crear sistemas completos (usa setup_workspace para eso).
Úsala solo para crear UNA tabla individual.`,
      parameters: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Nombre de la tabla a crear (ej: "Clientes", "Productos", "Ventas")',
          },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre del campo' },
                type: { type: 'string', enum: ['text', 'number', 'email', 'phone', 'date', 'select', 'url', 'textarea'], description: 'Tipo de campo' },
                required: { type: 'boolean', description: 'Si el campo es obligatorio' },
                options: { type: 'array', items: { type: 'string' }, description: 'Opciones para campos tipo select' },
              },
            },
            description: 'Campos de la tabla. Si no se especifican, el asistente sugerirá campos apropiados.',
          },
          user_request: {
            type: 'string',
            description: 'Lo que el usuario pidió textualmente.',
          },
          action: {
            type: 'string',
            enum: ['generate_plan', 'confirm', 'cancel'],
            description: 'generate_plan=primera vez, confirm=crear la tabla, cancel=cancelar.',
          },
        },
        required: ['user_request', 'action'],
      },
    },
  },
];

/**
 * Registro de herramientas del sistema
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.executors = new Map();
    
    // Registrar herramientas core
    this._registerCoreTools();
  }
  
  /**
   * Registra las herramientas core del sistema
   * @private
   */
  _registerCoreTools() {
    CORE_TOOLS.forEach(tool => {
      this.tools.set(tool.function.name, tool);
    });
    
    log.info('Core tools registered', { count: this.tools.size });
  }
  
  /**
   * Registra un executor para una herramienta
   * El executor es la función que realmente ejecuta la acción
   * @param {string} toolName - Nombre de la herramienta
   * @param {Function} executor - Función que ejecuta la acción
   */
  registerExecutor(toolName, executor) {
    if (!this.tools.has(toolName)) {
      log.warn('Registering executor for unknown tool', { toolName });
    }
    this.executors.set(toolName, executor);
  }
  
  /**
   * Registra una nueva herramienta personalizada
   * Permite a tenants agregar herramientas específicas
   * @param {object} toolDefinition - Definición de la herramienta
   * @param {Function} executor - Función que ejecuta la acción
   */
  registerTool(toolDefinition, executor) {
    const name = toolDefinition.function?.name;
    if (!name) {
      throw new Error('Tool definition must have a function.name');
    }
    
    this.tools.set(name, toolDefinition);
    if (executor) {
      this.executors.set(name, executor);
    }
    
    log.info('Custom tool registered', { name });
  }
  
  /**
   * Obtiene todas las herramientas en formato OpenAI
   * @param {object} options - Opciones de filtrado
   * @param {string[]} options.enabled - Lista de tools habilitadas (si está vacía, todas)
   * @param {string[]} options.disabled - Lista de tools deshabilitadas
   * @param {object[]} options.tables - Tablas disponibles para inyectar en descripciones
   * @returns {object[]} - Array de tools en formato OpenAI
   */
  getTools(options = {}) {
    const { enabled = [], disabled = [], tables = [] } = options;
    
    let tools = Array.from(this.tools.values());
    
    // Si NO hay tablas, permitir herramientas de configuración
    // Esto permite crear tablas/sistemas aunque no haya tablas aún
    if (tables.length === 0) {
      log.debug('No tables configured, limiting to configuration tools');
      const allowedWithoutTables = ['general_conversation', 'setup_workspace', 'create_flow', 'create_table'];
      return tools.filter(t => allowedWithoutTables.includes(t.function.name));
    }
    
    // Inyectar nombres de tablas reales en las descripciones de record_type
    if (tables.length > 0) {
      const tableNames = tables.map(t => t.name).join(', ');
      const tablesDescription = `Tipo de registro. USA EXACTAMENTE uno de estos nombres: ${tableNames}. Es OBLIGATORIO usar el nombre exacto de la tabla.`;
      
      tools = tools.map(tool => {
        // Deep clone para no mutar originales
        const clone = JSON.parse(JSON.stringify(tool));
        const props = clone.function?.parameters?.properties;
        
        // Actualizar descripción de record_type si existe
        if (props?.record_type) {
          props.record_type.description = tablesDescription;
          // Agregar enum con los nombres exactos para forzar al LLM
          props.record_type.enum = tables.map(t => t.name);
        }
        
        return clone;
      });
      
      log.debug('Injected table names into tools', { tableNames });
    }
    
    // Herramientas de configuración que SIEMPRE deben estar disponibles
    // Estas son "meta-tools" que no dependen de datos sino que configuran el sistema
    const alwaysEnabledTools = ['setup_workspace', 'create_flow', 'create_table', 'general_conversation'];
    
    // Filtrar por enabled si se especifica
    if (enabled.length > 0) {
      tools = tools.filter(t => 
        enabled.includes(t.function.name) || 
        alwaysEnabledTools.includes(t.function.name)
      );
    }
    
    // Excluir disabled (pero nunca excluir las always enabled)
    if (disabled.length > 0) {
      tools = tools.filter(t => 
        !disabled.includes(t.function.name) || 
        alwaysEnabledTools.includes(t.function.name)
      );
    }
    
    return tools;
  }
  
  /**
   * Obtiene el executor de una herramienta
   * @param {string} toolName - Nombre de la herramienta
   * @returns {Function|null} - Executor o null si no existe
   */
  getExecutor(toolName) {
    return this.executors.get(toolName) || null;
  }
  
  /**
   * Verifica si una herramienta existe
   * @param {string} toolName - Nombre de la herramienta
   * @returns {boolean}
   */
  hasTool(toolName) {
    return this.tools.has(toolName);
  }
  
  /**
   * Obtiene los nombres de todas las herramientas
   * @returns {string[]}
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Obtiene el handler correspondiente para una tool
   * @param {string} toolName - Nombre de la tool
   * @returns {string} - Nombre del handler correspondiente
   */
  getHandlerForTool(toolName) {
    const mapping = {
      'check_availability': 'AvailabilityHandler',
      'create_record': 'CreateHandler',
      'query_records': 'QueryHandler',
      'update_record': 'UpdateHandler',
      'analyze_data': 'QueryHandler', // Análisis usa QueryHandler
      'general_conversation': 'FallbackHandler',
      'setup_workspace': 'SetupHandler', // Configuración asistida
      'create_flow': 'FlowHandler', // Crear automatizaciones
      'create_table': 'TableHandler', // Crear tablas individuales
    };
    
    return mapping[toolName] || 'FallbackHandler';
  }
}

// Singleton
let instance = null;

/**
 * Obtiene la instancia del ToolRegistry
 * @returns {ToolRegistry}
 */
export function getToolRegistry() {
  if (!instance) {
    instance = new ToolRegistry();
  }
  return instance;
}

export { ToolRegistry, CORE_TOOLS };
export default ToolRegistry;
