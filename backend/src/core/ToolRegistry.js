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
      description: 'OBLIGATORIO cuando el usuario quiera: agendar, reservar, crear, registrar, agregar cualquier cosa. Usa SIEMPRE esta función aunque el usuario NO proporcione todos los datos - el sistema pedirá los datos faltantes automáticamente.',
      parameters: {
        type: 'object',
        properties: {
          record_type: {
            type: 'string',
            description: 'Nombre EXACTO de la tabla (ej: "Citas", "Clientes"). Usa mayúsculas tal como aparece.',
          },
          data: {
            type: 'object',
            description: 'Datos que el usuario YA proporcionó. Extrae TODO lo mencionado. Ejemplos: "adrian castro mañana a las 4" → {"cliente": "Adrian Castro", "fecha": "2026-02-26", "hora": "16:00"}. Si NO dio datos, usa {} vacío.',
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
      description: 'Consulta registros existentes: ver citas, listar clientes, buscar productos, mostrar ventas. Usa esta herramienta cuando el usuario quiera ver, consultar, listar, buscar, o mostrar datos existentes.',
      parameters: {
        type: 'object',
        properties: {
          record_type: {
            type: 'string',
            description: 'Tipo de registro a consultar. Usa el nombre EXACTO de la tabla (ej: "Clientes", "Ventas", "Citas").',
          },
          filters: {
            type: 'object',
            description: `CRÍTICO: Extrae TODOS los criterios de búsqueda del mensaje del usuario.
            
REGLAS:
1. Cada criterio mencionado = un campo en filters
2. Usa los nombres de campos de la tabla (cliente, estado, fecha, producto, etc.)
3. NUNCA devuelvas {} si el usuario menciona criterios

EJEMPLOS:
- "ventas de Juan" → {"cliente": "Juan"}
- "ventas de María García con estado pendiente" → {"cliente": "María García", "estado": "Pendiente"}
- "citas de hoy" → {"fecha": "2026-02-26"}
- "clientes activos de Bogotá" → {"estado": "Activo", "ciudad": "Bogotá"}
- "productos con precio mayor a 100" → {"precio": ">100"}

Si el usuario NO menciona ningún criterio específico → {} vacío.`,
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
      description: 'Responde a saludos, preguntas generales, o conversación casual. Usa esta herramienta cuando el mensaje NO sea una acción sobre datos: saludos, agradecimientos, preguntas sobre el negocio, información general.',
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
    
    // Si NO hay tablas, solo permitir general_conversation
    // Esto evita que el LLM intente crear/consultar registros sin tablas
    if (tables.length === 0) {
      log.debug('No tables configured, limiting to general_conversation only');
      return tools.filter(t => t.function.name === 'general_conversation');
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
    
    // Filtrar por enabled si se especifica
    if (enabled.length > 0) {
      tools = tools.filter(t => enabled.includes(t.function.name));
    }
    
    // Excluir disabled
    if (disabled.length > 0) {
      tools = tools.filter(t => !disabled.includes(t.function.name));
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
