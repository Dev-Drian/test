/**
 * ViewMappingService - Servicio para mapeo inteligente de campos
 * 
 * Usa el LLM para sugerir cómo mapear los campos de una tabla
 * a los campos requeridos por un tipo de vista específico.
 * 
 * También resuelve relaciones automáticamente para mostrar
 * displayField en lugar de IDs.
 */

import { OpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { TableRepository } from '../repositories/TableRepository.js';
import { TableDataRepository } from '../repositories/TableDataRepository.js';
import { findTableByName } from './relationHandler.js';
import logger from '../config/logger.js';

const log = logger.child('ViewMappingService');

// Definición de tipos de vista con sus campos requeridos y opcionales
export const VIEW_TYPES = {
  calendar: {
    name: 'Calendario',
    description: 'Vista de calendario para citas, eventos, reservas',
    icon: '📅',
    requiredFields: ['start', 'title'],
    optionalFields: ['end', 'description', 'color', 'location'],
    fieldDescriptions: {
      start: 'Fecha/hora de inicio del evento',
      end: 'Fecha/hora de fin del evento (o duración)',
      title: 'Título o nombre del evento (persona, servicio, etc.)',
      description: 'Descripción o notas adicionales',
      color: 'Campo para colorear eventos por categoría',
      location: 'Ubicación o lugar del evento',
    },
    suggestedTableTypes: ['calendar', 'appointments', 'reservations'],
  },
  
  kanban: {
    name: 'Tablero Kanban',
    description: 'Vista de columnas para seguimiento de estados/etapas',
    icon: '📋',
    requiredFields: ['title', 'status'],
    optionalFields: ['description', 'assignee', 'priority', 'dueDate'],
    fieldDescriptions: {
      title: 'Título o nombre del elemento',
      status: 'Estado actual (define las columnas)',
      description: 'Descripción o detalles',
      assignee: 'Persona asignada',
      priority: 'Nivel de prioridad',
      dueDate: 'Fecha límite',
    },
    suggestedTableTypes: ['tasks', 'orders', 'leads', 'projects'],
  },
  
  timeline: {
    name: 'Línea de Tiempo',
    description: 'Vista cronológica de eventos o historial',
    icon: '📈',
    requiredFields: ['date', 'title'],
    optionalFields: ['description', 'type', 'icon'],
    fieldDescriptions: {
      date: 'Fecha del evento',
      title: 'Título o descripción corta',
      description: 'Descripción detallada',
      type: 'Tipo o categoría del evento',
      icon: 'Icono representativo',
    },
    suggestedTableTypes: ['history', 'logs', 'activities'],
  },
  
  cards: {
    name: 'Tarjetas',
    description: 'Vista de tarjetas/cards para visualizar elementos',
    icon: '🃏',
    requiredFields: ['title'],
    optionalFields: ['subtitle', 'description', 'image', 'badge', 'footer'],
    fieldDescriptions: {
      title: 'Título principal de la tarjeta',
      subtitle: 'Subtítulo o información secundaria',
      description: 'Descripción o contenido',
      image: 'URL de imagen',
      badge: 'Etiqueta o badge',
      footer: 'Información del pie',
    },
    suggestedTableTypes: ['products', 'contacts', 'services'],
  },
  
  table: {
    name: 'Tabla Avanzada',
    description: 'Vista de tabla con filtros y ordenamiento avanzado',
    icon: '📊',
    requiredFields: [],
    optionalFields: ['columns', 'sortBy', 'groupBy'],
    fieldDescriptions: {
      columns: 'Columnas a mostrar',
      sortBy: 'Campo para ordenar por defecto',
      groupBy: 'Campo para agrupar filas',
    },
    suggestedTableTypes: ['*'],
  },
  
  floorplan: {
    name: 'Plano / Mesas',
    description: 'Vista de mesas o espacios con estado en tiempo real (restaurantes, salones)',
    icon: '🍽️',
    requiredFields: ['identifier', 'capacity'],
    optionalFields: ['zone', 'status', 'description'],
    fieldDescriptions: {
      identifier: 'Número o nombre de la mesa/espacio',
      capacity: 'Capacidad (número de personas)',
      zone: 'Zona o área (terraza, interior, VIP)',
      status: 'Estado actual (libre, ocupada, reservada)',
      description: 'Notas o descripción adicional',
    },
    suggestedTableTypes: ['tables', 'rooms', 'spaces'],
    // FloorPlan puede usar multi-tabla para calcular estados desde Reservas
    supportsMultiTable: true,
    multiTableConfig: {
      description: 'Combina tabla de mesas con tabla de reservas para calcular estado automático',
      secondaryTable: {
        purpose: 'reservations',
        suggestedNames: ['reservas', 'reservaciones', 'bookings'],
        joinField: 'mesa_id',
        statusCalculation: {
          dateField: 'fecha',
          timeField: 'hora',
          statusField: 'estado',
        },
      },
      computedStatuses: {
        available: { label: 'Libre', color: '#10B981' },
        reserved: { label: 'Reservada', color: '#F59E0B' },
        occupied: { label: 'Ocupada', color: '#EF4444' },
        blocked: { label: 'No disponible', color: '#6B7280' },
      },
    },
  },
  
  pos: {
    name: 'Punto de Venta',
    description: 'Vista de mesas con pedidos y productos (restaurantes, bares, cafeterías)',
    icon: '🛒',
    requiredFields: ['identifier'],
    optionalFields: ['capacity', 'zone', 'status'],
    fieldDescriptions: {
      identifier: 'Número o nombre de la mesa (ej: "Mesa 1", "T5", "Terraza 3")',
      capacity: 'Capacidad de personas',
      zone: 'Zona o área (Interior, Terraza, Bar)',
      status: 'Estado de la mesa (libre, ocupada, reservada)',
    },
    suggestedTableTypes: ['tables', 'mesas'],
    supportsMultiTable: true,
    multiTableConfig: {
      description: 'Combina mesas + pedidos + productos para gestión de órdenes',
      tables: {
        primary: {
          purpose: 'tables',
          description: 'Tabla de mesas/espacios del establecimiento',
          suggestedNames: ['mesas', 'tables', 'espacios'],
          requiredFields: {
            identifier: 'numero, nombre, mesa - Identificador de la mesa',
          },
          optionalFields: {
            capacity: 'capacidad, personas - Número de asientos',
            zone: 'zona, area - Ubicación dentro del local',
            status: 'estado - Estado de la mesa (opcional, se calcula automático)',
          },
        },
        orders: {
          purpose: 'orders',
          description: 'Tabla de pedidos/órdenes activas y cerradas',
          suggestedNames: ['pedidos', 'ordenes', 'orders', 'cuentas'],
          joinField: 'mesa_id',
          requiredFields: {
            mesa_id: 'mesa_id, mesa - Relación con la mesa',
            items: 'items, productos - Array JSON de productos pedidos',
            total: 'total, monto - Total del pedido',
            estado: 'estado, status - Estado del pedido (abierto, pendiente, listo, pagado)',
          },
          note: 'Esta tabla se llena automáticamente desde el POS. Puedes empezar vacía.',
        },
        products: {
          purpose: 'products',
          description: 'Tabla de productos/menú disponible para vender',
          suggestedNames: ['productos', 'menu', 'products', 'articulos', 'catalogo'],
          requiredFields: {
            nombre: 'nombre, name, producto - Nombre del producto',
            precio: 'precio, price, valor - Precio de venta',
          },
          optionalFields: {
            categoria: 'categoria, tipo - Para agrupar en el menú (Bebidas, Comidas, Postres)',
            disponible: 'disponible, activo - Si está disponible para vender',
            descripcion: 'descripcion - Detalles del producto',
          },
        },
      },
      orderStatuses: {
        open: { label: 'Abierto', color: '#3B82F6' },
        pending: { label: 'Pendiente', color: '#F59E0B' },
        ready: { label: 'Listo', color: '#10B981' },
        paid: { label: 'Pagado', color: '#6B7280' },
        cancelled: { label: 'Cancelado', color: '#EF4444' },
      },
    },
  },
};

// Aliases comunes para campos (español/inglés)
const FIELD_ALIASES = {
  start: ['fecha', 'fecha_inicio', 'date', 'start_date', 'dia', 'fecha_cita', 'inicio', 'when'],
  end: ['fecha_fin', 'hora_fin', 'end_date', 'fin', 'termino', 'hasta'],
  title: ['nombre', 'titulo', 'cliente', 'servicio', 'name', 'title', 'asunto', 'tema', 'mascota', 'paciente'],
  description: ['descripcion', 'notas', 'notes', 'detalles', 'comentarios', 'observaciones'],
  status: ['estado', 'status', 'etapa', 'fase', 'stage', 'situacion'],
  color: ['tipo', 'categoria', 'type', 'category', 'color', 'servicio'],
  assignee: ['asignado', 'responsable', 'encargado', 'assignee', 'owner', 'doctor', 'empleado'],
  priority: ['prioridad', 'priority', 'urgencia', 'importancia'],
  dueDate: ['fecha_limite', 'vencimiento', 'due_date', 'deadline'],
  location: ['ubicacion', 'lugar', 'direccion', 'location', 'address', 'sala'],
  date: ['fecha', 'date', 'dia', 'cuando'],
  // FloorPlan / POS - Mesas
  identifier: ['numero', 'numero_mesa', 'mesa', 'table', 'table_number', 'numero_de_mesa', 'id_mesa', 'nombre'],
  capacity: ['capacidad', 'personas', 'asientos', 'seats', 'capacity', 'cupos', 'plazas'],
  zone: ['zona', 'area', 'seccion', 'zone', 'section', 'ubicacion', 'salon'],
  // POS - Productos
  nombre: ['nombre', 'name', 'producto', 'articulo', 'item', 'titulo', 'plato'],
  precio: ['precio', 'price', 'costo', 'valor', 'importe', 'monto', 'cost'],
  categoria: ['categoria', 'category', 'tipo', 'type', 'grupo', 'clase', 'familia'],
  disponible: ['disponible', 'available', 'activo', 'active', 'stock', 'habilitado', 'enabled'],
  // POS - Pedidos
  mesa_id: ['mesa_id', 'mesa', 'table_id', 'table', 'id_mesa'],
  items: ['items', 'productos', 'lineas', 'detalle', 'products', 'order_items'],
  total: ['total', 'monto', 'importe', 'amount', 'suma', 'subtotal'],
};

export class ViewMappingService {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || new OpenAIProvider();
    this.tableRepo = options.tableRepository || new TableRepository();
    this.tableDataRepo = options.tableDataRepository || new TableDataRepository();
    // Cache de relaciones resueltas para evitar queries repetidas
    this._relationCache = new Map();
  }
  
  /**
   * Limpia el cache de relaciones
   */
  clearRelationCache() {
    this._relationCache.clear();
  }
  
  /**
   * Configura el API key del proveedor de IA
   */
  setApiKey(apiKey) {
    this.aiProvider.setApiKey(apiKey);
  }
  
  /**
   * Obtiene los tipos de vista disponibles
   * @returns {object[]}
   */
  getViewTypes() {
    return Object.entries(VIEW_TYPES).map(([key, config]) => ({
      type: key,
      name: config.name,
      description: config.description,
      icon: config.icon,
      requiredFields: config.requiredFields,
      optionalFields: config.optionalFields,
    }));
  }
  
  /**
   * Analiza una tabla y sugiere mapeo para un tipo de vista
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} viewType - calendar | kanban | timeline | cards | table
   * @returns {Promise<{status: string, fieldMap: object, suggestions: string[], confidence: number}>}
   */
  async analyzeAndSuggestMapping(workspaceId, tableId, viewType) {
    // 1. Obtener info de la tabla
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return {
        status: 'error',
        message: 'Tabla no encontrada',
        fieldMap: null,
      };
    }
    
    const headers = table.headers || [];
    if (headers.length === 0) {
      return {
        status: 'error',
        message: 'La tabla no tiene campos definidos. Agrega campos primero.',
        fieldMap: null,
      };
    }
    
    // 2. Validar tipo de vista
    const viewConfig = VIEW_TYPES[viewType];
    if (!viewConfig) {
      return {
        status: 'error',
        message: `Tipo de vista no soportado: ${viewType}`,
        fieldMap: null,
      };
    }
    
    // 3. Intentar mapeo automático por aliases
    const autoMapping = this._autoMapFields(headers, viewType);
    log.debug('Auto mapping result:', autoMapping);
    
    // 4. Verificar campos requeridos
    const missingRequired = viewConfig.requiredFields.filter(
      field => !autoMapping.fieldMap[field]
    );
    
    // 5. Si el auto-mapeo es completo, no necesitamos LLM
    if (missingRequired.length === 0) {
      return {
        status: 'complete',
        fieldMap: autoMapping.fieldMap,
        confidence: autoMapping.confidence,
        suggestions: [],
        mappingMetadata: {
          createdBy: 'auto',
          autoMapped: true,
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
      };
    }
    
    // 6. Usar LLM para mapeo inteligente
    try {
      const llmResult = await this._llmMapping(table, headers, viewType, viewConfig);
      
      // Combinar auto-mapeo con LLM (preferir LLM donde hubo dudas)
      const combinedMap = { ...autoMapping.fieldMap };
      for (const [key, value] of Object.entries(llmResult.fieldMap || {})) {
        if (value && (!combinedMap[key] || autoMapping.lowConfidence?.includes(key))) {
          combinedMap[key] = value;
        }
      }
      
      // Re-verificar campos requeridos
      const stillMissing = viewConfig.requiredFields.filter(
        field => !combinedMap[field]
      );
      
      return {
        status: stillMissing.length === 0 ? 'complete' : 'incomplete',
        fieldMap: combinedMap,
        confidence: llmResult.confidence || 0.8,
        missing: stillMissing,
        suggestions: llmResult.suggestions || [],
        mappingMetadata: {
          createdBy: 'llm',
          llmModel: 'gpt-4o-mini',
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
      };
      
    } catch (error) {
      log.error('LLM mapping error:', error);
      
      // Fallback al auto-mapeo
      return {
        status: missingRequired.length === 0 ? 'complete' : 'incomplete',
        fieldMap: autoMapping.fieldMap,
        confidence: autoMapping.confidence * 0.8,
        missing: missingRequired,
        suggestions: missingRequired.map(field => 
          `Falta campo para "${field}": ${viewConfig.fieldDescriptions[field]}`
        ),
        mappingMetadata: {
          createdBy: 'auto',
          llmFailed: true,
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
      };
    }
  }
  
  /**
   * Valida si una tabla es compatible con un tipo de vista
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} viewType 
   * @returns {Promise<{compatible: boolean, reason?: string, suggestions?: string[]}>}
   */
  async validateTableCompatibility(workspaceId, tableId, viewType) {
    const result = await this.analyzeAndSuggestMapping(workspaceId, tableId, viewType);
    
    if (result.status === 'error') {
      return {
        compatible: false,
        reason: result.message,
      };
    }
    
    if (result.status === 'incomplete') {
      const viewConfig = VIEW_TYPES[viewType];
      return {
        compatible: false,
        reason: `La tabla no tiene campos compatibles para ${viewConfig.name}`,
        missing: result.missing,
        suggestions: result.suggestions,
        partialMap: result.fieldMap,
      };
    }
    
    return {
      compatible: true,
      fieldMap: result.fieldMap,
      confidence: result.confidence,
    };
  }
  
  /**
   * Mapeo automático usando aliases predefinidos
   * @private
   */
  _autoMapFields(headers, viewType) {
    const viewConfig = VIEW_TYPES[viewType];
    const allViewFields = [...viewConfig.requiredFields, ...viewConfig.optionalFields];
    const fieldMap = {};
    const lowConfidence = [];
    let totalConfidence = 0;
    let mappedCount = 0;
    
    for (const viewField of allViewFields) {
      const aliases = FIELD_ALIASES[viewField] || [];
      let bestMatch = null;
      let bestScore = 0;
      
      for (const header of headers) {
        const headerKey = (header.key || header.label || '').toLowerCase();
        const headerLabel = (header.label || header.key || '').toLowerCase();
        
        // Coincidencia exacta con alias
        for (const alias of aliases) {
          const aliasLower = alias.toLowerCase();
          if (headerKey === aliasLower || headerLabel === aliasLower) {
            bestMatch = header.key || header.label;
            bestScore = 1.0;
            break;
          }
          // Coincidencia parcial
          if (headerKey.includes(aliasLower) || aliasLower.includes(headerKey)) {
            if (bestScore < 0.7) {
              bestMatch = header.key || header.label;
              bestScore = 0.7;
            }
          }
        }
        
        // Coincidencia por tipo de campo
        if (!bestMatch && viewField === 'start' && header.type === 'date') {
          bestMatch = header.key || header.label;
          bestScore = 0.6;
        }
        if (!bestMatch && viewField === 'end' && header.type === 'time') {
          bestMatch = header.key || header.label;
          bestScore = 0.5;
        }
      }
      
      if (bestMatch) {
        fieldMap[viewField] = bestMatch;
        totalConfidence += bestScore;
        mappedCount++;
        if (bestScore < 0.8) {
          lowConfidence.push(viewField);
        }
      }
    }
    
    return {
      fieldMap,
      confidence: mappedCount > 0 ? totalConfidence / mappedCount : 0,
      lowConfidence,
    };
  }
  
  /**
   * Mapeo usando LLM para casos complejos
   * @private
   */
  async _llmMapping(table, headers, viewType, viewConfig) {
    const headerInfo = headers.map(h => ({
      key: h.key || h.label,
      label: h.label || h.key,
      type: h.type || 'text',
    }));
    
    // Contexto adicional según tipo de vista
    let additionalContext = '';
    if (viewType === 'pos' || viewType === 'floorplan') {
      additionalContext = `
CONTEXTO ESPECÍFICO PARA ${viewType.toUpperCase()}:
- Para mesas: busca campos como "numero", "mesa", "nombre", "capacidad", "zona", "area"
- El campo "identifier" es el número o nombre de la mesa (ej: Mesa 1, T5)
- El campo "capacity" es cuántas personas caben
- El campo "zone" es la ubicación (Interior, Terraza, etc)`;
    } else if (viewType === 'calendar') {
      additionalContext = `
CONTEXTO ESPECÍFICO PARA CALENDARIO:
- "start" es la fecha/hora de inicio del evento
- "title" es el nombre/descripción principal del evento
- Busca campos como "fecha", "cliente", "cita", "hora"`;
    } else if (viewType === 'kanban') {
      additionalContext = `
CONTEXTO ESPECÍFICO PARA KANBAN:
- "status" es el campo que define las columnas (estado, etapa, fase)
- "title" es el nombre visible en cada tarjeta`;
    }
    
    const prompt = `Eres un experto en mapeo de datos para visualizaciones.

TABLA: "${table.name}"
CAMPOS DISPONIBLES:
${JSON.stringify(headerInfo, null, 2)}

TIPO DE VISTA: ${viewType} (${viewConfig.name})
CAMPOS REQUERIDOS: ${viewConfig.requiredFields.join(', ')}
CAMPOS OPCIONALES: ${viewConfig.optionalFields.join(', ')}

DESCRIPCIÓN DE CAMPOS DE LA VISTA:
${Object.entries(viewConfig.fieldDescriptions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
${additionalContext}

Tu tarea:
1. Mapea los campos de la tabla a los campos de la vista
2. Si un campo no tiene equivalente claro, déjalo null
3. Sugiere mejoras si la tabla es incompleta

Responde SOLO en JSON con este formato:
{
  "fieldMap": {
    "campo_vista": "campo_tabla_o_null"
  },
  "confidence": 0.0-1.0,
  "suggestions": ["sugerencia 1", "sugerencia 2"]
}`;

    const response = await this.aiProvider.complete({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 500,
    });
    
    // Parsear respuesta JSON
    try {
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      log.warn('Failed to parse LLM response:', e);
    }
    
    return { fieldMap: {}, confidence: 0, suggestions: [] };
  }
  
  /**
   * Resuelve relaciones para un conjunto de registros
   * Reemplaza IDs con displayField de tablas relacionadas
   * @param {string} workspaceId - ID del workspace
   * @param {object[]} records - Registros a procesar
   * @param {object[]} headers - Headers de la tabla con info de relaciones
   * @returns {Promise<object[]>} - Registros con relaciones resueltas
   */
  async resolveRelations(workspaceId, records, headers) {
    if (!records?.length || !headers?.length) return records;
    
    // Identificar campos con relación
    const relationFields = headers.filter(h => 
      h.type === 'relation' && h.relation?.tableName
    );
    
    if (relationFields.length === 0) return records;
    
    log.debug(`Resolving ${relationFields.length} relation fields`);
    
    // Para cada campo con relación, recolectar valores únicos
    const relationQueries = {};
    
    for (const field of relationFields) {
      const values = new Set();
      for (const record of records) {
        const value = record[field.key];
        if (value && typeof value === 'string') {
          values.add(value);
        }
      }
      
      if (values.size > 0) {
        relationQueries[field.key] = {
          field,
          values: Array.from(values),
          resolved: {},
        };
      }
    }
    
    // Resolver cada relación en batch
    for (const [fieldKey, query] of Object.entries(relationQueries)) {
      const { field, values } = query;
      const cacheKey = `${workspaceId}:${field.relation.tableName}`;
      
      // Obtener o inicializar cache para esta tabla
      if (!this._relationCache.has(cacheKey)) {
        this._relationCache.set(cacheKey, new Map());
      }
      const tableCache = this._relationCache.get(cacheKey);
      
      // Filtrar valores no cacheados
      const uncached = values.filter(v => !tableCache.has(v));
      
      if (uncached.length > 0) {
        try {
          // Buscar tabla relacionada
          const relatedTable = await findTableByName(workspaceId, field.relation.tableName);
          
          if (relatedTable) {
            // Obtener registros de la tabla relacionada
            const relatedRecords = await this.tableDataRepo.query(
              workspaceId,
              relatedTable._id,
              {},
              { limit: 1000 }
            );
            
            const searchField = field.relation.searchField || 'nombre';
            const displayField = field.relation.displayField || searchField;
            
            // Mapear valores a displayField
            for (const relRecord of relatedRecords) {
              const searchValue = relRecord[searchField];
              const displayValue = relRecord[displayField] || searchValue;
              
              // Si el ID está en nuestros valores buscados
              if (searchValue && uncached.includes(searchValue)) {
                tableCache.set(searchValue, displayValue);
              }
              // También cachear por _id
              if (relRecord._id && uncached.includes(relRecord._id)) {
                tableCache.set(relRecord._id, displayValue);
              }
            }
          }
        } catch (err) {
          log.warn(`Failed to resolve relation for ${fieldKey}:`, err.message);
        }
      }
      
      // Copiar cache resuelto a query
      for (const value of values) {
        query.resolved[value] = tableCache.get(value) || value;
      }
    }
    
    // Aplicar resoluciones a los registros
    return records.map(record => {
      const resolved = { ...record };
      
      for (const [fieldKey, query] of Object.entries(relationQueries)) {
        const originalValue = record[fieldKey];
        if (originalValue && query.resolved[originalValue]) {
          // Guardar valor original como _ref y reemplazar con display
          resolved[`_${fieldKey}_ref`] = originalValue;
          resolved[fieldKey] = query.resolved[originalValue];
        }
      }
      
      return resolved;
    });
  }
  
  /**
   * Transforma datos de tabla según el mapeo de vista
   * Opcionalmente resuelve relaciones si se proporcionan headers
   * @param {object[]} records - Registros de la tabla
   * @param {object} fieldMap - Mapeo de campos
   * @param {object} computedFields - Campos calculados
   * @param {object} options - Opciones adicionales
   * @param {string} options.workspaceId - Para resolver relaciones
   * @param {object[]} options.headers - Headers de tabla con info de relaciones
   * @returns {Promise<object[]>|object[]}
   */
  async transformData(records, fieldMap, computedFields = {}, options = {}) {
    let processedRecords = records;
    
    // Resolver relaciones si se proporcionan headers
    if (options.workspaceId && options.headers) {
      processedRecords = await this.resolveRelations(
        options.workspaceId, 
        records, 
        options.headers
      );
    }
    
    return processedRecords.map(record => {
      const transformed = { _id: record._id };
      
      // Aplicar mapeo simple
      for (const [viewField, tableField] of Object.entries(fieldMap)) {
        if (tableField && record[tableField] !== undefined) {
          transformed[viewField] = record[tableField];
        }
      }
      
      // Aplicar campos calculados
      for (const [field, config] of Object.entries(computedFields)) {
        if (config.type === 'duration' && transformed.start) {
          // Calcular end basado en duración
          const duration = record[config.durationField] || config.defaultMinutes || 30;
          transformed[field] = this._addMinutes(transformed.start, duration);
        } else if (config.type === 'concat') {
          // Concatenar campos
          const values = (config.fields || []).map(f => record[f]).filter(Boolean);
          transformed[field] = values.join(config.separator || ' ');
        } else if (config.type === 'default' && !transformed[field]) {
          transformed[field] = config.defaultValue;
        }
      }
      
      // Incluir datos originales como _raw para referencia
      transformed._raw = record;
      
      return transformed;
    });
  }
  
  /**
   * Agrega minutos a una fecha/hora
   * @private
   */
  _addMinutes(dateStr, minutes) {
    try {
      // Si es solo hora (HH:mm), devolver hora + duración
      if (/^\d{2}:\d{2}$/.test(dateStr)) {
        const [h, m] = dateStr.split(':').map(Number);
        const totalMinutes = h * 60 + m + minutes;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
      
      // Si es fecha completa, usar Date
      const date = new Date(dateStr);
      date.setMinutes(date.getMinutes() + minutes);
      return date.toISOString();
    } catch {
      return dateStr;
    }
  }
  
  /**
   * Obtiene datos combinados de múltiples tablas para vistas como FloorPlan
   * @param {string} workspaceId 
   * @param {object} tablesConfig - { primary: tableId, secondary: tableId, joinField: string }
   * @param {object} options - Opciones adicionales
   * @returns {Promise<{primary: object[], secondary: object[], combined: object[]}>}
   */
  async fetchMultiTableData(workspaceId, tablesConfig, options = {}) {
    const { primary, secondary, joinField } = tablesConfig;
    
    // Obtener datos de tabla primaria
    const primaryRecords = await this.tableDataRepo.query(
      workspaceId,
      primary,
      {},
      { limit: options.limit || 500 }
    );
    
    // Si no hay tabla secundaria, devolver solo primaria
    if (!secondary) {
      return {
        primary: primaryRecords,
        secondary: [],
        combined: primaryRecords,
      };
    }
    
    // Obtener datos de tabla secundaria
    const secondaryRecords = await this.tableDataRepo.query(
      workspaceId,
      secondary,
      {},
      { limit: options.limit || 1000 }
    );
    
    // Combinar datos (left join: todos los primarios con sus secundarios)
    const combined = primaryRecords.map(primaryRec => {
      // Buscar registros secundarios relacionados
      const related = secondaryRecords.filter(secRec => {
        const joinValue = secRec[joinField];
        // Comparar por _id o por nombre/identificador
        return joinValue === primaryRec._id || 
               joinValue === primaryRec.nombre ||
               joinValue === primaryRec.numero ||
               joinValue === primaryRec.identifier;
      });
      
      return {
        ...primaryRec,
        _related: related,
        _relatedCount: related.length,
      };
    });
    
    return {
      primary: primaryRecords,
      secondary: secondaryRecords,
      combined,
    };
  }
  
  /**
   * Calcula estado de mesas basado en reservas del día
   * @param {object[]} tables - Registros de mesas (con _related de reservas)
   * @param {object} config - Configuración de campos
   * @param {Date} targetDate - Fecha para calcular (default: hoy)
   * @returns {object[]} - Mesas con estado calculado
   */
  calculateFloorplanStatuses(tables, config = {}, targetDate = new Date()) {
    const {
      dateField = 'fecha',
      timeField = 'hora',
      statusField = 'estado',
      cancelledStatuses = ['cancelada', 'Cancelada', 'cancelled'],
    } = config;
    
    const today = targetDate.toISOString().split('T')[0];
    const nowHours = targetDate.getHours();
    const nowMinutes = targetDate.getMinutes();
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    
    return tables.map(table => {
      const reservations = table._related || [];
      
      // Filtrar reservas de hoy que no estén canceladas
      const todayReservations = reservations.filter(res => {
        const resDate = res[dateField];
        const resStatus = res[statusField];
        
        // Verificar que sea de hoy
        const isToday = resDate === today || 
                       (resDate && resDate.startsWith && resDate.startsWith(today));
        
        // Verificar que no esté cancelada
        const isCancelled = cancelledStatuses.includes(resStatus);
        
        return isToday && !isCancelled;
      });
      
      // Determinar estado actual
      let computedStatus = 'available';
      let currentReservation = null;
      let nextReservation = null;
      
      for (const res of todayReservations) {
        const timeStr = res[timeField];
        if (!timeStr) continue;
        
        // Parsear hora (asumiendo formato HH:mm o H:mm AM/PM)
        let resMinutes = this._parseTimeToMinutes(timeStr);
        if (resMinutes === null) continue;
        
        // Asumimos duración de 90 minutos si no se especifica
        const duration = res.duracion || 90;
        const endMinutes = resMinutes + duration;
        
        // ¿Está activa ahora?
        if (nowTotalMinutes >= resMinutes && nowTotalMinutes < endMinutes) {
          computedStatus = 'occupied';
          currentReservation = res;
          break;
        }
        
        // ¿Es futura?
        if (resMinutes > nowTotalMinutes) {
          // Si es en las próximas 2 horas, marcar como reservada
          if (resMinutes - nowTotalMinutes <= 120) {
            computedStatus = 'reserved';
            nextReservation = res;
          }
          break;
        }
      }
      
      // Si tiene estado manual "bloqueada", respetar
      if (table.estado === 'bloqueada' || table.status === 'blocked') {
        computedStatus = 'blocked';
      }
      
      return {
        ...table,
        _computedStatus: computedStatus,
        _currentReservation: currentReservation,
        _nextReservation: nextReservation,
        _todayReservations: todayReservations,
      };
    });
  }
  
  /**
   * Parsea string de hora a minutos del día
   * @private
   */
  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    
    // Formato 24h: "14:30"
    let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    
    // Formato 12h: "2:30 PM" o "2:30PM"
    match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
    
    return null;
  }
  
  /**
   * Obtiene datos para vista POS (3 tablas: mesas, pedidos, productos)
   * @param {string} workspaceId 
   * @param {object} tablesConfig - { primary, secondary (orders), tertiary (products) }
   * @returns {Promise<object>}
   */
  async fetchPOSData(workspaceId, tablesConfig) {
    const { primary, secondary, tertiary, joinField = 'mesa_id' } = tablesConfig;
    
    // 1. Obtener mesas
    const tables = await this.tableDataRepo.query(workspaceId, primary, {}, { limit: 100 });
    
    // 2. Obtener pedidos activos (no pagados/cancelados)
    let orders = [];
    if (secondary) {
      const allOrders = await this.tableDataRepo.query(workspaceId, secondary, {}, { limit: 500 });
      // Filtrar solo pedidos activos
      orders = allOrders.filter(o => {
        const status = (o.estado || o.status || '').toLowerCase();
        return !['pagado', 'paid', 'cancelado', 'cancelled', 'cerrado', 'closed'].includes(status);
      });
    }
    
    // 3. Obtener productos/menú
    let products = [];
    if (tertiary) {
      products = await this.tableDataRepo.query(workspaceId, tertiary, {}, { limit: 500 });
    }
    
    // 4. Combinar mesas con sus pedidos activos
    const tablesWithOrders = tables.map(table => {
      const tableOrders = orders.filter(order => {
        const orderTable = order[joinField] || order.mesa_id || order.mesa;
        return orderTable === table._id || 
               orderTable === table.numero || 
               orderTable === table.nombre ||
               orderTable === String(table.numero);
      });
      
      // Calcular total de la mesa
      const activeOrder = tableOrders.find(o => 
        !['pagado', 'paid', 'cerrado'].includes((o.estado || '').toLowerCase())
      );
      
      let total = 0;
      let itemCount = 0;
      
      if (activeOrder) {
        // Si tiene items como array
        if (Array.isArray(activeOrder.items)) {
          activeOrder.items.forEach(item => {
            const qty = item.cantidad || item.qty || 1;
            const price = item.precio || item.price || 0;
            total += qty * price;
            itemCount += qty;
          });
        }
        // Si tiene total directo
        if (activeOrder.total) {
          total = activeOrder.total;
        }
      }
      
      // Determinar estado de la mesa
      let tableStatus = 'available';
      if (activeOrder) {
        const orderStatus = (activeOrder.estado || activeOrder.status || '').toLowerCase();
        if (orderStatus === 'pendiente' || orderStatus === 'pending') {
          tableStatus = 'pending';
        } else if (orderStatus === 'preparando' || orderStatus === 'preparing') {
          tableStatus = 'preparing';
        } else if (orderStatus === 'listo' || orderStatus === 'ready') {
          tableStatus = 'ready';
        } else {
          tableStatus = 'occupied';
        }
      }
      
      return {
        ...table,
        _orders: tableOrders,
        _activeOrder: activeOrder,
        _total: total,
        _itemCount: itemCount,
        _tableStatus: tableStatus,
      };
    });
    
    // Organizar productos por categoría
    const productsByCategory = {};
    products.forEach(product => {
      const category = product.categoria || product.category || 'General';
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });
    
    return {
      tables: tablesWithOrders,
      orders,
      products,
      productsByCategory,
      meta: {
        totalTables: tables.length,
        occupiedTables: tablesWithOrders.filter(t => t._tableStatus !== 'available').length,
        totalActiveOrders: orders.length,
        totalProducts: products.length,
      },
    };
  }
  
  /**
   * Agrega un producto a un pedido
   * Este método prepara los datos, la escritura real la hace el controller
   * @param {object} order - Pedido actual (o null para crear nuevo)
   * @param {object} product - Producto a agregar
   * @param {number} quantity - Cantidad
   * @returns {object} - Pedido actualizado
   */
  addProductToOrder(order, product, quantity = 1) {
    const items = order?.items ? [...order.items] : [];
    
    // Buscar si ya existe el producto
    const existingIndex = items.findIndex(item => 
      item.producto_id === product._id || 
      item.nombre === product.nombre
    );
    
    if (existingIndex >= 0) {
      // Incrementar cantidad
      items[existingIndex] = {
        ...items[existingIndex],
        cantidad: (items[existingIndex].cantidad || 1) + quantity,
      };
    } else {
      // Agregar nuevo item
      items.push({
        producto_id: product._id,
        nombre: product.nombre || product.name,
        precio: product.precio || product.price || 0,
        cantidad: quantity,
      });
    }
    
    // Calcular nuevo total
    const total = items.reduce((sum, item) => {
      return sum + (item.precio || 0) * (item.cantidad || 1);
    }, 0);
    
    return {
      ...order,
      items,
      total,
      updatedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Quita un producto de un pedido
   * @param {object} order - Pedido actual
   * @param {string} productId - ID del producto a quitar
   * @param {number} quantity - Cantidad a quitar (default: todo)
   * @returns {object} - Pedido actualizado
   */
  removeProductFromOrder(order, productId, quantity = null) {
    if (!order?.items) return order;
    
    let items = [...order.items];
    const existingIndex = items.findIndex(item => 
      item.producto_id === productId || item._id === productId
    );
    
    if (existingIndex >= 0) {
      if (quantity === null || items[existingIndex].cantidad <= quantity) {
        // Quitar completamente
        items.splice(existingIndex, 1);
      } else {
        // Decrementar
        items[existingIndex] = {
          ...items[existingIndex],
          cantidad: items[existingIndex].cantidad - quantity,
        };
      }
    }
    
    // Recalcular total
    const total = items.reduce((sum, item) => {
      return sum + (item.precio || 0) * (item.cantidad || 1);
    }, 0);
    
    return {
      ...order,
      items,
      total,
      updatedAt: new Date().toISOString(),
    };
  }
}

export default ViewMappingService;
