/**
 * SetupAssistant - Asistente de configuración para clientes
 * 
 * Agente de SISTEMA que ayuda a los usuarios a:
 * - Crear tablas con campos apropiados
 * - Configurar vistas (POS, Calendar, Kanban, etc)
 * - Agregar campos a tablas existentes
 * - Cargar datos de ejemplo
 * 
 * Este agente está disponible en TODOS los workspaces automáticamente.
 * 
 * @module services/SetupAssistant
 */

import { OpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { VIEW_TYPES } from './ViewMappingService.js';
import logger from '../config/logger.js';

const log = logger.child('SetupAssistant');

/**
 * Templates predefinidos de negocios
 */
const BUSINESS_TEMPLATES = {
  restaurante: {
    name: 'Restaurante / Cafetería',
    keywords: ['restaurante', 'cafe', 'cafeteria', 'bar', 'comida', 'pos', 'punto de venta', 'mesero', 'cocina'],
    tables: [
      {
        name: 'Mesas',
        description: 'Mesas del establecimiento',
        headers: [
          { key: 'numero', label: 'Número', type: 'text', required: true },
          { key: 'capacidad', label: 'Capacidad', type: 'number' },
          { key: 'zona', label: 'Zona', type: 'select', options: ['Interior', 'Terraza', 'Bar', 'VIP'] },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Libre', 'Ocupada', 'Reservada'] },
        ],
        color: '#10B981',
        sampleData: [
          { numero: 'Mesa 1', capacidad: 4, zona: 'Interior', estado: 'Libre' },
          { numero: 'Mesa 2', capacidad: 2, zona: 'Interior', estado: 'Libre' },
          { numero: 'Mesa 3', capacidad: 6, zona: 'Terraza', estado: 'Libre' },
          { numero: 'Mesa 4', capacidad: 4, zona: 'Terraza', estado: 'Libre' },
          { numero: 'Barra 1', capacidad: 2, zona: 'Bar', estado: 'Libre' },
        ],
      },
      {
        name: 'Productos',
        description: 'Menú de productos',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'precio', label: 'Precio', type: 'number', required: true },
          { key: 'categoria', label: 'Categoría', type: 'select', options: ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres', 'Extras'] },
          { key: 'descripcion', label: 'Descripción', type: 'text' },
          { key: 'disponible', label: 'Disponible', type: 'boolean' },
        ],
        color: '#F59E0B',
        sampleData: [
          { nombre: 'Hamburguesa Clásica', precio: 12.50, categoria: 'Platos Fuertes', descripcion: 'Con queso, lechuga y tomate', disponible: true },
          { nombre: 'Pizza Margherita', precio: 15.00, categoria: 'Platos Fuertes', descripcion: 'Tomate, mozzarella y albahaca', disponible: true },
          { nombre: 'Ensalada César', precio: 9.00, categoria: 'Entradas', descripcion: 'Lechuga, pollo, crutones', disponible: true },
          { nombre: 'Coca-Cola', precio: 3.50, categoria: 'Bebidas', descripcion: '350ml', disponible: true },
          { nombre: 'Agua Mineral', precio: 2.00, categoria: 'Bebidas', descripcion: '500ml', disponible: true },
          { nombre: 'Cerveza', precio: 5.00, categoria: 'Bebidas', descripcion: 'Nacional 330ml', disponible: true },
          { nombre: 'Helado', precio: 4.00, categoria: 'Postres', descripcion: 'Vainilla, chocolate o fresa', disponible: true },
          { nombre: 'Papas Fritas', precio: 4.50, categoria: 'Extras', descripcion: 'Porción', disponible: true },
        ],
      },
      {
        name: 'Pedidos',
        description: 'Pedidos de los clientes',
        headers: [
          { key: 'mesa_id', label: 'Mesa', type: 'relation', relation: { tableName: 'Mesas', displayField: 'numero' } },
          { key: 'items', label: 'Productos', type: 'text' },
          { key: 'total', label: 'Total', type: 'number' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Abierto', 'En cocina', 'Listo', 'Pagado', 'Cancelado'] },
          { key: 'mesero', label: 'Mesero', type: 'text' },
        ],
        color: '#3B82F6',
        sampleData: [], // Empieza vacía
      },
    ],
    views: [
      { type: 'pos', name: 'Punto de Venta', tables: { primary: 'Mesas', secondary: 'Pedidos', tertiary: 'Productos' } },
    ],
  },

  clinica: {
    name: 'Clínica / Consultorio',
    keywords: ['clinica', 'consultorio', 'doctor', 'medico', 'citas', 'pacientes', 'salud', 'hospital', 'dental', 'veterinaria'],
    tables: [
      {
        name: 'Pacientes',
        description: 'Registro de pacientes',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'telefono', label: 'Teléfono', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'fecha_nacimiento', label: 'Fecha Nacimiento', type: 'date' },
          { key: 'notas', label: 'Notas', type: 'text' },
        ],
        color: '#EC4899',
        sampleData: [
          { nombre: 'María García', telefono: '555-0101', email: 'maria@email.com' },
          { nombre: 'Juan Pérez', telefono: '555-0102', email: 'juan@email.com' },
          { nombre: 'Ana López', telefono: '555-0103', email: 'ana@email.com' },
        ],
      },
      {
        name: 'Citas',
        description: 'Agenda de citas',
        headers: [
          { key: 'paciente_id', label: 'Paciente', type: 'relation', relation: { tableName: 'Pacientes', displayField: 'nombre' }, required: true },
          { key: 'fecha', label: 'Fecha', type: 'date', required: true },
          { key: 'hora', label: 'Hora', type: 'text', required: true },
          { key: 'servicio', label: 'Servicio', type: 'select', options: ['Consulta General', 'Control', 'Urgencia', 'Procedimiento'] },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Programada', 'Confirmada', 'En curso', 'Completada', 'Cancelada'] },
          { key: 'doctor', label: 'Doctor', type: 'text' },
          { key: 'notas', label: 'Notas', type: 'text' },
        ],
        color: '#4F46E5',
        sampleData: [],
      },
      {
        name: 'Servicios',
        description: 'Catálogo de servicios',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'duracion', label: 'Duración (min)', type: 'number' },
          { key: 'precio', label: 'Precio', type: 'number' },
          { key: 'descripcion', label: 'Descripción', type: 'text' },
        ],
        color: '#10B981',
        sampleData: [
          { nombre: 'Consulta General', duracion: 30, precio: 50, descripcion: 'Revisión general' },
          { nombre: 'Control', duracion: 15, precio: 30, descripcion: 'Seguimiento' },
          { nombre: 'Procedimiento', duracion: 60, precio: 150, descripcion: 'Procedimiento médico' },
        ],
      },
    ],
    views: [
      { type: 'calendar', name: 'Agenda de Citas', tableId: 'Citas' },
      { type: 'kanban', name: 'Estado de Citas', tableId: 'Citas' },
    ],
  },

  ventas: {
    name: 'Ventas / CRM',
    keywords: ['ventas', 'crm', 'clientes', 'leads', 'prospectos', 'oportunidades', 'comercial', 'vendedor'],
    tables: [
      {
        name: 'Clientes',
        description: 'Base de clientes',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'empresa', label: 'Empresa', type: 'text' },
          { key: 'telefono', label: 'Teléfono', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'ciudad', label: 'Ciudad', type: 'text' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'Prospecto'] },
        ],
        color: '#3B82F6',
        sampleData: [
          { nombre: 'Carlos Ruiz', empresa: 'Tech Corp', telefono: '555-0201', email: 'carlos@techcorp.com', ciudad: 'México', estado: 'Activo' },
          { nombre: 'Laura Martínez', empresa: 'Retail SA', telefono: '555-0202', email: 'laura@retail.com', ciudad: 'Bogotá', estado: 'Activo' },
        ],
      },
      {
        name: 'Ventas',
        description: 'Registro de ventas',
        headers: [
          { key: 'cliente_id', label: 'Cliente', type: 'relation', relation: { tableName: 'Clientes', displayField: 'nombre' }, required: true },
          { key: 'producto', label: 'Producto', type: 'text', required: true },
          { key: 'monto', label: 'Monto', type: 'number', required: true },
          { key: 'fecha', label: 'Fecha', type: 'date' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Pagada', 'Cancelada'] },
          { key: 'vendedor', label: 'Vendedor', type: 'text' },
        ],
        color: '#10B981',
        sampleData: [],
      },
      {
        name: 'Productos',
        description: 'Catálogo de productos',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'precio', label: 'Precio', type: 'number', required: true },
          { key: 'categoria', label: 'Categoría', type: 'text' },
          { key: 'stock', label: 'Stock', type: 'number' },
        ],
        color: '#F59E0B',
        sampleData: [
          { nombre: 'Producto A', precio: 100, categoria: 'Electrónica', stock: 50 },
          { nombre: 'Producto B', precio: 250, categoria: 'Software', stock: 999 },
        ],
      },
    ],
    views: [
      { type: 'kanban', name: 'Pipeline de Ventas', tableId: 'Ventas' },
      { type: 'cards', name: 'Clientes', tableId: 'Clientes' },
    ],
  },

  reservas: {
    name: 'Reservaciones',
    keywords: ['reservas', 'reservaciones', 'hotel', 'habitaciones', 'alquiler', 'renta', 'booking'],
    tables: [
      {
        name: 'Espacios',
        description: 'Espacios disponibles',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'tipo', label: 'Tipo', type: 'select', options: ['Habitación', 'Sala', 'Espacio', 'Equipo'] },
          { key: 'capacidad', label: 'Capacidad', type: 'number' },
          { key: 'precio_hora', label: 'Precio/Hora', type: 'number' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Disponible', 'Ocupado', 'Mantenimiento'] },
        ],
        color: '#8B5CF6',
        sampleData: [
          { nombre: 'Sala A', tipo: 'Sala', capacidad: 10, precio_hora: 50, estado: 'Disponible' },
          { nombre: 'Sala B', tipo: 'Sala', capacidad: 20, precio_hora: 80, estado: 'Disponible' },
        ],
      },
      {
        name: 'Reservas',
        description: 'Reservaciones',
        headers: [
          { key: 'espacio_id', label: 'Espacio', type: 'relation', relation: { tableName: 'Espacios', displayField: 'nombre' }, required: true },
          { key: 'cliente', label: 'Cliente', type: 'text', required: true },
          { key: 'fecha', label: 'Fecha', type: 'date', required: true },
          { key: 'hora_inicio', label: 'Hora Inicio', type: 'text' },
          { key: 'hora_fin', label: 'Hora Fin', type: 'text' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'Check-in', 'Check-out', 'Cancelada'] },
        ],
        color: '#EC4899',
        sampleData: [],
      },
    ],
    views: [
      { type: 'calendar', name: 'Calendario de Reservas', tableId: 'Reservas' },
      { type: 'floorplan', name: 'Mapa de Espacios', tables: { primary: 'Espacios', secondary: 'Reservas' } },
    ],
  },

  tareas: {
    name: 'Gestión de Tareas',
    keywords: ['tareas', 'proyectos', 'tasks', 'todo', 'pendientes', 'equipo', 'asignaciones'],
    tables: [
      {
        name: 'Tareas',
        description: 'Lista de tareas',
        headers: [
          { key: 'titulo', label: 'Título', type: 'text', required: true },
          { key: 'descripcion', label: 'Descripción', type: 'text' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Por hacer', 'En progreso', 'Revisión', 'Completada'] },
          { key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente'] },
          { key: 'asignado', label: 'Asignado a', type: 'text' },
          { key: 'fecha_limite', label: 'Fecha Límite', type: 'date' },
        ],
        color: '#6366F1',
        sampleData: [
          { titulo: 'Tarea de ejemplo', descripcion: 'Esta es una tarea de prueba', estado: 'Por hacer', prioridad: 'Media' },
        ],
      },
    ],
    views: [
      { type: 'kanban', name: 'Tablero Kanban', tableId: 'Tareas' },
    ],
  },
};

/**
 * Clase principal del asistente de configuración
 */
export class SetupAssistant {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || new OpenAIProvider();
    this.tableRepo = options.tableRepository;
    this.tableDataRepo = options.tableDataRepository;
    this.viewRepo = options.viewRepository;
  }

  /**
   * Detecta qué tipo de negocio quiere configurar el usuario
   * @param {string} message - Mensaje del usuario
   * @returns {Promise<object>} - Template detectado y confianza
   */
  async detectBusinessType(message) {
    const messageLower = message.toLowerCase();
    
    // Primero intentar match por keywords
    for (const [key, template] of Object.entries(BUSINESS_TEMPLATES)) {
      const matchedKeywords = template.keywords.filter(kw => messageLower.includes(kw));
      if (matchedKeywords.length > 0) {
        return {
          type: key,
          template,
          confidence: Math.min(0.9, 0.5 + (matchedKeywords.length * 0.2)),
          matchedKeywords,
        };
      }
    }

    // Si no hay match directo, usar LLM
    const prompt = `Analiza este mensaje y determina qué tipo de negocio quiere configurar el usuario.

MENSAJE: "${message}"

TIPOS DISPONIBLES:
${Object.entries(BUSINESS_TEMPLATES).map(([key, t]) => `- ${key}: ${t.name} (${t.keywords.slice(0, 3).join(', ')})`).join('\n')}

Responde SOLO en JSON:
{
  "type": "clave_del_tipo_o_null",
  "confidence": 0.0-1.0,
  "reason": "breve explicación"
}

Si no puedes determinar el tipo con al menos 60% de confianza, pon type: null.`;

    try {
      const response = await this.aiProvider.complete({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 200,
      });

      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.type && BUSINESS_TEMPLATES[result.type]) {
          return {
            type: result.type,
            template: BUSINESS_TEMPLATES[result.type],
            confidence: result.confidence,
            reason: result.reason,
          };
        }
      }
    } catch (e) {
      log.warn('LLM detection failed:', e);
    }

    return { type: null, template: null, confidence: 0 };
  }

  /**
   * Genera un plan de configuración basado en el mensaje del usuario
   * @param {string} message - Mensaje del usuario
   * @param {object} context - Contexto (workspace, tablas existentes, etc)
   * @returns {Promise<object>} - Plan de configuración
   */
  async generateSetupPlan(message, context = {}) {
    // Detectar tipo de negocio
    const detection = await this.detectBusinessType(message);

    if (!detection.type) {
      return {
        success: false,
        needsMoreInfo: true,
        message: `No estoy seguro de qué tipo de sistema necesitas. ¿Podrías decirme más sobre tu negocio?

**Algunos ejemplos que puedo ayudarte a configurar:**
• 🍽️ Restaurante / Cafetería (POS, mesas, pedidos)
• 🏥 Clínica / Consultorio (pacientes, citas)
• 💼 Ventas / CRM (clientes, oportunidades)
• 📅 Reservaciones (espacios, calendario)
• ✅ Gestión de Tareas (kanban, proyectos)

¿Cuál se parece más a lo que necesitas?`,
      };
    }

    const template = detection.template;
    const existingTables = context.tables || [];
    const existingTableNames = existingTables.map(t => t.name.toLowerCase());

    // Filtrar tablas que no existen aún
    const newTables = template.tables.filter(t => 
      !existingTableNames.includes(t.name.toLowerCase())
    );

    // Generar plan
    const plan = {
      success: true,
      type: detection.type,
      templateName: template.name,
      confidence: detection.confidence,
      
      tables: newTables.map(t => ({
        name: t.name,
        description: t.description,
        fieldsCount: t.headers.length,
        fields: t.headers.map(h => h.label),
        sampleDataCount: t.sampleData?.length || 0,
        _config: t, // Config completa para ejecutar
      })),
      
      views: template.views.map(v => ({
        type: v.type,
        name: v.name,
        viewTypeName: VIEW_TYPES[v.type]?.name || v.type,
        _config: v,
      })),

      skipped: template.tables
        .filter(t => existingTableNames.includes(t.name.toLowerCase()))
        .map(t => t.name),
    };

    return plan;
  }

  /**
   * Formatea el plan como mensaje para el usuario
   * @param {object} plan - Plan generado
   * @returns {string} - Mensaje formateado
   */
  formatPlanMessage(plan) {
    if (!plan.success) {
      return plan.message;
    }

    let msg = `¡Perfecto! Voy a configurar un sistema de **${plan.templateName}** para ti.\n\n`;

    if (plan.tables.length > 0) {
      msg += `📋 **TABLAS A CREAR:**\n`;
      plan.tables.forEach((t, i) => {
        msg += `${i + 1}. **${t.name}** - ${t.description}\n`;
        msg += `   Campos: ${t.fields.join(', ')}\n`;
        if (t.sampleDataCount > 0) {
          msg += `   _(incluye ${t.sampleDataCount} datos de ejemplo)_\n`;
        }
      });
      msg += '\n';
    }

    if (plan.views.length > 0) {
      msg += `📊 **VISTAS A CREAR:**\n`;
      plan.views.forEach((v, i) => {
        msg += `${i + 1}. **${v.name}** (${v.viewTypeName})\n`;
      });
      msg += '\n';
    }

    if (plan.skipped.length > 0) {
      msg += `⏭️ _Tablas existentes (no se modificarán): ${plan.skipped.join(', ')}_\n\n`;
    }

    msg += `---\n`;
    msg += `¿Quieres que lo configure así?\n`;
    msg += `• Responde **"sí"** para crear todo\n`;
    msg += `• O dime qué quieres **modificar** (ej: "agrega un campo teléfono a Mesas")\n`;

    return msg;
  }

  /**
   * Ejecuta el plan de configuración
   * @param {object} plan - Plan a ejecutar
   * @param {string} workspaceId - ID del workspace
   * @returns {Promise<object>} - Resultado de la ejecución
   */
  async executePlan(plan, workspaceId) {
    if (!this.tableRepo || !this.tableDataRepo) {
      throw new Error('Repositories not configured');
    }

    const results = {
      tables: [],
      views: [],
      errors: [],
    };

    const tableIdMap = {}; // Para mapear nombres a IDs creados

    // 1. Crear tablas
    for (const tableConfig of plan.tables) {
      try {
        const config = tableConfig._config;
        
        // Ajustar relaciones si la tabla referenciada fue creada
        const headers = config.headers.map(h => {
          if (h.type === 'relation' && h.relation?.tableName) {
            const refTableId = tableIdMap[h.relation.tableName];
            if (refTableId) {
              return {
                ...h,
                relation: {
                  ...h.relation,
                  tableId: refTableId,
                },
              };
            }
          }
          return h;
        });

        const newTable = await this.tableRepo.create({
          workspaceId,
          name: config.name,
          description: config.description,
          headers,
          color: config.color,
          icon: config.icon,
        });

        tableIdMap[config.name] = newTable._id;
        results.tables.push({ name: config.name, id: newTable._id, status: 'created' });

        // 2. Insertar datos de ejemplo
        if (config.sampleData?.length > 0) {
          for (const data of config.sampleData) {
            await this.tableDataRepo.create(data, workspaceId, newTable._id);
          }
          results.tables[results.tables.length - 1].sampleRecords = config.sampleData.length;
        }

        log.info(`Created table: ${config.name}`, { workspaceId, tableId: newTable._id });
      } catch (err) {
        log.error(`Failed to create table: ${tableConfig.name}`, { error: err.message });
        results.errors.push({ type: 'table', name: tableConfig.name, error: err.message });
      }
    }

    // 3. Crear vistas
    if (this.viewRepo) {
      for (const viewConfig of plan.views) {
        try {
          const config = viewConfig._config;
          
          // Resolver IDs de tablas
          let tableId = null;
          let tables = null;

          if (config.tableId) {
            tableId = tableIdMap[config.tableId];
          }

          if (config.tables) {
            tables = {
              primary: tableIdMap[config.tables.primary],
              secondary: tableIdMap[config.tables.secondary],
            };
            if (config.tables.tertiary) {
              tables.tertiary = tableIdMap[config.tables.tertiary];
            }
          }

          if (!tableId && !tables?.primary) {
            log.warn(`Cannot create view ${config.name}: table not found`);
            continue;
          }

          const newView = await this.viewRepo.create({
            workspaceId,
            name: config.name,
            type: config.type,
            tableId: tableId || tables?.primary,
            tables,
            color: VIEW_TYPES[config.type]?.color || '#4F46E5',
            fieldMap: {}, // Se mapeará después
          });

          results.views.push({ name: config.name, type: config.type, id: newView._id, status: 'created' });
          log.info(`Created view: ${config.name}`, { workspaceId, viewId: newView._id });
        } catch (err) {
          log.error(`Failed to create view: ${viewConfig.name}`, { error: err.message });
          results.errors.push({ type: 'view', name: viewConfig.name, error: err.message });
        }
      }
    }

    return results;
  }

  /**
   * Formatea el resultado de la ejecución
   * @param {object} results - Resultados de executePlan
   * @returns {string} - Mensaje formateado
   */
  formatResultsMessage(results) {
    let msg = `✅ **¡Configuración completada!**\n\n`;

    if (results.tables.length > 0) {
      msg += `📋 **Tablas creadas:**\n`;
      results.tables.forEach(t => {
        msg += `• ${t.name}`;
        if (t.sampleRecords) msg += ` _(${t.sampleRecords} registros de ejemplo)_`;
        msg += '\n';
      });
      msg += '\n';
    }

    if (results.views.length > 0) {
      msg += `📊 **Vistas creadas:**\n`;
      results.views.forEach(v => {
        msg += `• ${v.name} (${v.type})\n`;
      });
      msg += '\n';
    }

    if (results.errors.length > 0) {
      msg += `⚠️ **Errores:**\n`;
      results.errors.forEach(e => {
        msg += `• ${e.name}: ${e.error}\n`;
      });
      msg += '\n';
    }

    msg += `---\n`;
    msg += `Puedes ir a **Tablas** para ver tus datos o a **Vistas** para usar las visualizaciones.\n`;
    msg += `¿Necesitas algo más?`;

    return msg;
  }

  /**
   * Obtiene los templates disponibles
   * @returns {object[]}
   */
  getAvailableTemplates() {
    return Object.entries(BUSINESS_TEMPLATES).map(([key, t]) => ({
      key,
      name: t.name,
      tablesCount: t.tables.length,
      viewsCount: t.views.length,
      keywords: t.keywords.slice(0, 5),
    }));
  }
}

// Singleton
let instance = null;

export function getSetupAssistant(options) {
  if (!instance) {
    instance = new SetupAssistant(options);
  }
  return instance;
}

export { BUSINESS_TEMPLATES };
