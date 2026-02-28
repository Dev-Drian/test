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
   * Detecta posibles relaciones entre la tabla principal y otras tablas del workspace
   * @param {object} mainTable - Tabla principal
   * @param {object[]} allTables - Todas las tablas del workspace
   * @param {string[]} alreadyRelatedIds - IDs de tablas ya relacionadas
   * @returns {Array<{tableId, tableName, localField, foreignField, confidence, reason}>}
   */
  _detectPossibleRelations(mainTable, allTables, alreadyRelatedIds = []) {
    const suggestions = [];
    const mainHeaders = mainTable.headers || [];
    
    // Patrones comunes para campos de referencia
    const refPatterns = [
      // clienteId, cliente_id, id_cliente, clienteid
      { pattern: /^(.+?)[-_]?id$/i, type: 'suffix' },
      { pattern: /^id[-_]?(.+?)$/i, type: 'prefix' },
      // fk_cliente, ref_cliente
      { pattern: /^(?:fk|ref)[-_](.+?)$/i, type: 'fk' },
    ];
    
    // Para cada campo de la tabla principal
    for (const header of mainHeaders) {
      const fieldKey = (header.key || header.label || '').toLowerCase();
      
      // Si ya es un campo tipo relation, sugerir la tabla
      if (header.type === 'relation' && header.relation?.tableName) {
        const relatedTable = allTables.find(t => 
          t.name.toLowerCase() === header.relation.tableName.toLowerCase() &&
          t._id !== mainTable._id &&
          !alreadyRelatedIds.includes(t._id)
        );
        if (relatedTable) {
          suggestions.push({
            tableId: relatedTable._id,
            tableName: relatedTable.name,
            localField: header.key || header.label,
            foreignField: '_id',
            confidence: 0.95,
            reason: `El campo "${header.label || header.key}" ya está definido como relación a "${relatedTable.name}"`,
          });
        }
        continue;
      }
      
      // Buscar patrones de referencia
      for (const { pattern, type } of refPatterns) {
        const match = fieldKey.match(pattern);
        if (!match) continue;
        
        const possibleTableName = match[1].toLowerCase();
        
        // Buscar tabla que coincida con el nombre extraído
        for (const candidateTable of allTables) {
          if (candidateTable._id === mainTable._id) continue;
          if (alreadyRelatedIds.includes(candidateTable._id)) continue;
          
          const candidateName = candidateTable.name.toLowerCase();
          // Comparar nombres (singular/plural, con/sin acentos)
          const normalizedCandidate = candidateName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/s$/, ''); // Quitar 's' final para singular
          const normalizedPossible = possibleTableName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/s$/, '');
          
          if (normalizedCandidate === normalizedPossible || 
              normalizedCandidate.includes(normalizedPossible) ||
              normalizedPossible.includes(normalizedCandidate)) {
            
            // Buscar campo _id o id en la tabla candidata
            const candidateHeaders = candidateTable.headers || [];
            let foreignField = '_id';
            if (candidateHeaders.some(h => (h.key || h.label)?.toLowerCase() === 'id')) {
              foreignField = 'id';
            }
            
            // Evitar duplicados
            if (!suggestions.some(s => s.tableId === candidateTable._id && s.localField === (header.key || header.label))) {
              suggestions.push({
                tableId: candidateTable._id,
                tableName: candidateTable.name,
                localField: header.key || header.label,
                foreignField,
                confidence: 0.8,
                reason: `El campo "${header.label || header.key}" parece referenciar a "${candidateTable.name}"`,
              });
            }
          }
        }
      }
    }
    
    // Ordenar por confianza descendente
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Analiza una tabla y sugiere mapeo para un tipo de vista
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string} viewType - calendar | kanban | timeline | cards | table
   * @param {Array} relatedTables - [{tableId, localField, foreignField, alias}]
   * @returns {Promise<{status: string, fieldMap: object, suggestions: string[], confidence: number}>}
   */
  async analyzeAndSuggestMapping(workspaceId, tableId, viewType, relatedTables = []) {
    // 1. Obtener info de la tabla principal
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return {
        status: 'error',
        message: 'Tabla no encontrada',
        fieldMap: null,
      };
    }
    
    let headers = table.headers || [];
    if (headers.length === 0) {
      return {
        status: 'error',
        message: 'La tabla no tiene campos definidos. Agrega campos primero.',
        fieldMap: null,
      };
    }
    
    // 1a. Obtener todas las tablas del workspace para detectar posibles relaciones
    const allTables = await this.tableRepo.findAll(workspaceId);
    const alreadyRelatedIds = relatedTables.map(r => r.tableId);
    const suggestedRelations = this._detectPossibleRelations(table, allTables, alreadyRelatedIds);
    
    // 1b. Si hay tablas relacionadas, obtener sus headers y combinarlos
    const relatedTablesInfo = [];
    if (relatedTables && relatedTables.length > 0) {
      for (const rel of relatedTables) {
        const relatedTable = await this.tableRepo.findById(rel.tableId, workspaceId);
        if (relatedTable && relatedTable.headers) {
          const alias = rel.alias || relatedTable.name;
          relatedTablesInfo.push({
            ...rel,
            table: relatedTable,
            alias
          });
          // Agregar headers con prefijo del alias
          const prefixedHeaders = relatedTable.headers.map(h => ({
            key: `${alias}.${h.key || h.label}`,
            label: `${alias}.${h.label || h.key}`,
            type: h.type,
            originalKey: h.key || h.label,
            fromRelatedTable: true,
            relatedTableId: rel.tableId,
            alias
          }));
          headers = [...headers, ...prefixedHeaders];
        }
      }
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
        suggestedRelations, // Sugerencias de tablas para relacionar
        mappingMetadata: {
          createdBy: 'auto',
          autoMapped: true,
          relatedTables: relatedTablesInfo.map(r => ({ tableId: r.tableId, alias: r.alias })),
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
        relatedTablesInfo,
      };
    }
    
    // 6. Usar LLM para mapeo inteligente
    try {
      const llmResult = await this._llmMapping(table, headers, viewType, viewConfig, relatedTablesInfo);
      
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
        suggestedRelations, // Sugerencias de tablas para relacionar
        mappingMetadata: {
          createdBy: 'llm',
          llmModel: 'gpt-4o-mini',
          relatedTables: relatedTablesInfo.map(r => ({ tableId: r.tableId, alias: r.alias })),
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
        relatedTablesInfo,
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
        suggestedRelations, // Sugerencias de tablas para relacionar
        mappingMetadata: {
          createdBy: 'auto',
          llmFailed: true,
          relatedTables: relatedTablesInfo.map(r => ({ tableId: r.tableId, alias: r.alias })),
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
        relatedTablesInfo,
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
   * Analiza campos seleccionados y sugiere el mejor tipo de vista
   * @param {string} workspaceId 
   * @param {string} tableId 
   * @param {string[]} selectedFields - Campos seleccionados por el usuario
   * @returns {Promise<{status: string, suggestedViewType: string, fieldMap: object, missingFields: object[], suggestions: string[]}>}
   */
  async analyzeFieldsAndSuggestView(workspaceId, tableId, selectedFields) {
    // 1. Obtener info de la tabla
    const table = await this.tableRepo.findById(tableId, workspaceId);
    if (!table) {
      return {
        status: 'error',
        message: 'Tabla no encontrada',
      };
    }
    
    const headers = table.headers || [];
    if (headers.length === 0) {
      return {
        status: 'error',
        message: 'La tabla no tiene campos definidos',
      };
    }
    
    // Filtrar solo los headers de los campos seleccionados
    const selectedHeaders = headers.filter(h => 
      selectedFields.includes(h.key) || selectedFields.includes(h.label)
    );
    
    if (selectedHeaders.length === 0) {
      return {
        status: 'error',
        message: 'Ninguno de los campos seleccionados existe en la tabla',
      };
    }
    
    // 2. Analizar qué tipo de vista encaja mejor usando LLM
    try {
      const result = await this._llmSuggestViewType(table, selectedHeaders, headers);
      
      // 3. Si tenemos un tipo sugerido, hacer el mapeo completo
      if (result.suggestedViewType && VIEW_TYPES[result.suggestedViewType]) {
        const viewConfig = VIEW_TYPES[result.suggestedViewType];
        const autoMapping = this._autoMapFields(selectedHeaders, result.suggestedViewType);
        
        // Combinar mapeo automático con el del LLM
        const combinedMap = { ...autoMapping.fieldMap, ...result.fieldMap };
        
        // Identificar campos requeridos faltantes
        const missingFields = viewConfig.requiredFields
          .filter(field => !combinedMap[field])
          .map(field => ({
            name: field,
            description: viewConfig.fieldDescriptions[field],
            required: true,
          }));
        
        // Identificar campos opcionales sugeridos
        const optionalMissing = viewConfig.optionalFields
          .filter(field => !combinedMap[field])
          .slice(0, 2) // Máximo 2 opcionales
          .map(field => ({
            name: field,
            description: viewConfig.fieldDescriptions[field],
            required: false,
          }));
        
        const allMissing = [...missingFields, ...optionalMissing];
        
        return {
          status: missingFields.length === 0 ? 'complete' : 'incomplete',
          suggestedViewType: result.suggestedViewType,
          suggestedName: result.suggestedName || `${viewConfig.name} de ${table.name}`,
          fieldMap: combinedMap,
          confidence: result.confidence || 0.8,
          missingFields: allMissing,
          suggestions: result.suggestions || [],
          mappingMetadata: {
            createdBy: 'llm',
            selectedFields,
          },
          tableName: table.name,
          tableHeaders: headers.map(h => h.key || h.label),
        };
      }
      
      // Fallback: sugerir tipo "table" que acepta cualquier estructura
      return {
        status: 'incomplete',
        suggestedViewType: 'table',
        suggestedName: `Tabla de ${table.name}`,
        fieldMap: {},
        confidence: 0.5,
        missingFields: [],
        suggestions: ['Los campos seleccionados no coinciden claramente con ningún tipo de vista específico. Se sugiere usar vista de Tabla.'],
        mappingMetadata: {
          createdBy: 'fallback',
          selectedFields,
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
      };
      
    } catch (error) {
      log.error('analyzeFieldsAndSuggestView error:', error);
      
      // Fallback en caso de error
      return {
        status: 'incomplete',
        suggestedViewType: 'table',
        suggestedName: `Tabla de ${table.name}`,
        fieldMap: {},
        confidence: 0.3,
        missingFields: [],
        suggestions: ['No se pudo analizar los campos. Se sugiere configurar manualmente.'],
        mappingMetadata: {
          createdBy: 'error-fallback',
          error: error.message,
        },
        tableName: table.name,
        tableHeaders: headers.map(h => h.key || h.label),
      };
    }
  }

  /**
   * Valida la configuración de una vista antes de crearla
   * Verifica que el mapeo de campos sea correcto y coherente
   * @param {Object} config - Configuración a validar
   * @returns {Object} Resultado de validación
   */
  async validateViewConfiguration(config) {
    const { workspaceId, tableId, viewType, fieldMap, availableFields, viewName } = config;

    try {
      // Obtener información del tipo de vista
      const viewTypeConfig = VIEW_TYPES[viewType];
      if (!viewTypeConfig) {
        return {
          isValid: false,
          errors: [`Tipo de vista "${viewType}" no reconocido`],
          warnings: [],
          suggestions: [],
        };
      }

      const errors = [];
      const warnings = [];
      const suggestions = [];
      const verifiedMapping = {};

      // Verificar campos requeridos
      const requiredFields = viewTypeConfig.requiredFields || [];
      for (const reqField of requiredFields) {
        const mappedValue = fieldMap[reqField];
        if (!mappedValue) {
          errors.push(`Campo requerido "${reqField}" no está mapeado`);
          verifiedMapping[reqField] = { mappedTo: null, isValid: false, isRequired: true };
        } else if (!availableFields.includes(mappedValue)) {
          errors.push(`El campo "${mappedValue}" mapeado a "${reqField}" no existe en la tabla`);
          verifiedMapping[reqField] = { mappedTo: mappedValue, isValid: false, isRequired: true };
        } else {
          verifiedMapping[reqField] = { mappedTo: mappedValue, isValid: true, isRequired: true };
        }
      }

      // Verificar campos opcionales
      const optionalFields = viewTypeConfig.optionalFields || [];
      for (const optField of optionalFields) {
        const mappedValue = fieldMap[optField];
        if (mappedValue) {
          if (!availableFields.includes(mappedValue)) {
            warnings.push(`El campo opcional "${mappedValue}" mapeado a "${optField}" no existe en la tabla`);
            verifiedMapping[optField] = { mappedTo: mappedValue, isValid: false, isRequired: false };
          } else {
            verifiedMapping[optField] = { mappedTo: mappedValue, isValid: true, isRequired: false };
          }
        } else {
          // Campo opcional sin mapear - solo advertencia si es útil
          verifiedMapping[optField] = { mappedTo: null, isValid: true, isRequired: false };
        }
      }

      // Verificar campos duplicados
      const mappedFields = Object.values(fieldMap).filter(Boolean);
      const duplicates = mappedFields.filter((field, index) => mappedFields.indexOf(field) !== index);
      if (duplicates.length > 0) {
        warnings.push(`Los siguientes campos están mapeados múltiples veces: ${[...new Set(duplicates)].join(', ')}`);
      }

      // Verificar nombre de vista
      if (!viewName || viewName.trim().length < 2) {
        errors.push('El nombre de la vista debe tener al menos 2 caracteres');
      }

      // Usar LLM para validación semántica si está disponible
      let llmValidation = null;
      if (this.openai && errors.length === 0) {
        try {
          llmValidation = await this._llmValidateMapping(viewType, fieldMap, availableFields, viewName);
          if (llmValidation.warnings) {
            warnings.push(...llmValidation.warnings);
          }
          if (llmValidation.suggestions) {
            suggestions.push(...llmValidation.suggestions);
          }
        } catch (llmError) {
          log.warn('LLM validation failed, continuing with basic validation:', llmError.message);
        }
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        suggestions,
        verifiedMapping,
        metadata: {
          viewType,
          viewName,
          requiredFieldsCount: requiredFields.length,
          optionalFieldsCount: optionalFields.length,
          mappedFieldsCount: mappedFields.length,
          llmValidated: !!llmValidation,
        },
      };

    } catch (error) {
      log.error('validateViewConfiguration error:', error);
      return {
        isValid: false,
        errors: [`Error al validar: ${error.message}`],
        warnings: [],
        suggestions: [],
      };
    }
  }

  /**
   * Validación semántica con LLM
   * @private
   */
  async _llmValidateMapping(viewType, fieldMap, availableFields, viewName) {
    const prompt = `Eres un validador de configuración de vistas para una aplicación de gestión de datos.

TIPO DE VISTA: ${viewType}
NOMBRE DE VISTA: ${viewName}

MAPEO DE CAMPOS:
${JSON.stringify(fieldMap, null, 2)}

CAMPOS DISPONIBLES EN LA TABLA:
${availableFields.join(', ')}

Analiza si el mapeo tiene sentido semánticamente. Por ejemplo:
- Si es una vista calendario, ¿los campos de fecha realmente parecen ser fechas?
- Si es un kanban, ¿el campo de estado tiene sentido como categoría?
- ¿El nombre de la vista describe bien su propósito?

Responde en JSON con este formato exacto:
{
  "semanticallyValid": true/false,
  "warnings": ["lista de advertencias si hay"],
  "suggestions": ["lista de sugerencias para mejorar"]
}

Solo incluye advertencias o sugerencias si son realmente útiles. No repitas información obvia.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  }
  
  /**
   * Usa LLM para sugerir el mejor tipo de vista basado en campos
   * @private
   */
  async _llmSuggestViewType(table, selectedHeaders, allHeaders) {
    const selectedInfo = selectedHeaders.map(h => ({
      key: h.key || h.label,
      label: h.label || h.key,
      type: h.type || 'text',
    }));
    
    const viewTypesInfo = Object.entries(VIEW_TYPES).map(([key, config]) => ({
      type: key,
      name: config.name,
      description: config.description,
      requiredFields: config.requiredFields,
      optionalFields: config.optionalFields,
    }));
    
    const prompt = `Eres un experto en diseño de interfaces de usuario y visualización de datos.

TABLA: "${table.name}"

CAMPOS SELECCIONADOS POR EL USUARIO:
${JSON.stringify(selectedInfo, null, 2)}

TIPOS DE VISTA DISPONIBLES:
${JSON.stringify(viewTypesInfo, null, 2)}

TAREA: Determina qué tipo de vista es el MÁS ADECUADO para los campos seleccionados.

REGLAS:
1. Considera la SEMÁNTICA de los nombres de campos, no solo los tipos
2. Si hay campos de fecha/hora, considera "calendar"
3. Si hay campos de estado/etapa, considera "kanban"  
4. Si hay campos como "numero", "mesa", "capacidad", considera "floorplan" o "pos"
5. Si los campos son genéricos, sugiere "cards" o "table"
6. El fieldMap debe mapear SOLO los campos seleccionados que coincidan CLARAMENTE
7. Sugiere un nombre descriptivo para la vista
8. Sugiere SOLO si hay campos IMPORTANTES que faltan para esa vista
9. Máximo 2 sugerencias específicas y útiles

Responde SOLO en JSON:
{
  "suggestedViewType": "calendar|kanban|timeline|cards|table|floorplan|pos",
  "suggestedName": "Nombre sugerido para la vista",
  "fieldMap": {
    "campo_vista": "campo_tabla_seleccionado"
  },
  "confidence": 0.0-1.0,
  "suggestions": ["sugerencia específica si falta algo importante"]
}`;

    const response = await this.aiProvider.complete({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 600,
    });
    
    try {
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      log.warn('Failed to parse LLM suggestViewType response:', e);
    }
    
    return { suggestedViewType: 'table', confidence: 0.3, fieldMap: {}, suggestions: [] };
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
  async _llmMapping(table, headers, viewType, viewConfig, relatedTablesInfo = []) {
    const headerInfo = headers.map(h => ({
      key: h.key || h.label,
      label: h.label || h.key,
      type: h.type || 'text',
      fromRelatedTable: h.fromRelatedTable || false,
      alias: h.alias || null,
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
    
    // Añadir contexto sobre tablas relacionadas
    let relatedTablesContext = '';
    if (relatedTablesInfo && relatedTablesInfo.length > 0) {
      relatedTablesContext = `
TABLAS RELACIONADAS (los campos con prefijo son de tablas relacionadas):
${relatedTablesInfo.map(r => `- ${r.alias}: Tabla "${r.table.name}" (relacionada por ${r.localField} → ${r.foreignField})`).join('\n')}

Campos prefijados como "Alias.campo" provienen de tablas relacionadas y pueden usarse para enriquecer la vista.`;
    }
    
    const prompt = `Eres un experto en mapeo de datos para visualizaciones.

TABLA PRINCIPAL: "${table.name}"
CAMPOS DISPONIBLES:
${JSON.stringify(headerInfo, null, 2)}

TIPO DE VISTA: ${viewType} (${viewConfig.name})
CAMPOS REQUERIDOS: ${viewConfig.requiredFields.join(', ')}
CAMPOS OPCIONALES: ${viewConfig.optionalFields.join(', ')}

DESCRIPCIÓN DE CAMPOS DE LA VISTA:
${Object.entries(viewConfig.fieldDescriptions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
${additionalContext}
${relatedTablesContext}

REGLAS IMPORTANTES:
1. Mapea SOLO campos que tengan una coincidencia CLARA y OBVIA
2. Si no estás seguro (menos del 80% de confianza), pon null
3. NO inventes mapeos forzados - es mejor null que un mapeo incorrecto
4. Puedes usar campos de tablas relacionadas (prefijados con alias) si son apropiados
5. Las sugerencias deben ser MUY ESPECÍFICAS y ÚTILES:
   - ✅ BIEN: "Agrega un campo 'precio' de tipo número para los productos"
   - ✅ BIEN: "El campo 'numero' debería llamarse 'numero_mesa' para mejor claridad"
   - ❌ MAL: "Considera agregar más campos" (muy vago)
   - ❌ MAL: "Podrías mejorar la estructura" (no específico)
6. Máximo 2 sugerencias, solo si son REALMENTE necesarias
7. Si la tabla ya tiene todo lo necesario, suggestions debe ser un array vacío []

Responde SOLO en JSON con este formato:
{
  "fieldMap": {
    "campo_vista": "campo_tabla_o_null"
  },
  "confidence": 0.0-1.0,
  "suggestions": []
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
