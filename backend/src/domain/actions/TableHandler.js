/**
 * TableHandler - Handler para crear tablas vía chat
 * 
 * Maneja la herramienta create_table para crear tablas individuales.
 * Usa LLM para generar campos apropiados si el usuario no los especifica.
 * 
 * @module domain/actions/TableHandler
 */

import { v4 as uuidv4 } from 'uuid';
import { ActionHandler } from './ActionHandler.js';
import { getConfirmationManager, CONFIRM_STATUS } from '../../core/ConfirmationManager.js';
import { getOpenAIProvider } from '../../integrations/ai/OpenAIProvider.js';
import { connectDB, getTableDbName } from '../../config/db.js';
import logger from '../../config/logger.js';

const log = logger.child('TableHandler');

/**
 * Plantillas de campos por tipo de tabla común
 */
const TABLE_TEMPLATES = {
  clientes: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'telefono', label: 'Teléfono', type: 'phone' },
    { key: 'direccion', label: 'Dirección', type: 'textarea' },
    { key: 'ciudad', label: 'Ciudad', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'Prospecto'] },
    { key: 'fechaRegistro', label: 'Fecha de Registro', type: 'date' },
  ],
  productos: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'precio', label: 'Precio', type: 'number', required: true },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'categoria', label: 'Categoría', type: 'select', options: ['General', 'Electrónica', 'Ropa', 'Alimentos', 'Servicios'] },
    { key: 'imagen', label: 'Imagen URL', type: 'url' },
    { key: 'activo', label: 'Activo', type: 'select', options: ['Sí', 'No'] },
  ],
  ventas: [
    { key: 'cliente', label: 'Cliente', type: 'text', required: true },
    { key: 'producto', label: 'Producto', type: 'text', required: true },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
    { key: 'precio', label: 'Precio Unitario', type: 'number', required: true },
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Pagado', 'Cancelado', 'Enviado'] },
  ],
  tareas: [
    { key: 'titulo', label: 'Título', type: 'text', required: true },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
    { key: 'asignado', label: 'Asignado a', type: 'text' },
    { key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente'] },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'En progreso', 'Completada', 'Cancelada'] },
    { key: 'fechaLimite', label: 'Fecha Límite', type: 'date' },
  ],
  citas: [
    { key: 'cliente', label: 'Cliente', type: 'text', required: true },
    { key: 'servicio', label: 'Servicio', type: 'text', required: true },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'hora', label: 'Hora', type: 'text', required: true },
    { key: 'duracion', label: 'Duración (min)', type: 'number' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'] },
    { key: 'notas', label: 'Notas', type: 'textarea' },
  ],
  empleados: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'telefono', label: 'Teléfono', type: 'phone' },
    { key: 'puesto', label: 'Puesto', type: 'text' },
    { key: 'departamento', label: 'Departamento', type: 'select', options: ['Ventas', 'Administración', 'Operaciones', 'IT', 'RRHH'] },
    { key: 'fechaIngreso', label: 'Fecha de Ingreso', type: 'date' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'Vacaciones'] },
  ],
  inventario: [
    { key: 'producto', label: 'Producto', type: 'text', required: true },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
    { key: 'ubicacion', label: 'Ubicación', type: 'text' },
    { key: 'minimo', label: 'Stock Mínimo', type: 'number' },
    { key: 'ultimaActualizacion', label: 'Última Actualización', type: 'date' },
    { key: 'proveedor', label: 'Proveedor', type: 'text' },
  ],
};

export class TableHandler extends ActionHandler {
  constructor(dependencies = {}) {
    super(dependencies);
    this.confirmationManager = getConfirmationManager();
    this.aiProvider = dependencies.aiProvider || getOpenAIProvider();
  }

  /**
   * Verifica si este handler puede manejar el contexto
   * @param {Context} context
   * @returns {Promise<boolean>}
   */
  async canHandle(context) {
    return context.selectedTool === 'create_table';
  }

  /**
   * Ejecuta la acción de creación de tabla
   * @param {Context} context
   * @returns {Promise<object>}
   */
  async execute(context) {
    const args = context.llmExtracted || {};
    const action = args.action || 'generate_plan';
    const chatId = context.chatId;

    log.info('TableHandler execute', { action, chatId, args });

    try {
      switch (action) {
        case 'generate_plan':
          return await this._generatePlan(context, args);
        
        case 'confirm':
          return await this._confirmAndCreate(context);
        
        case 'cancel':
          return await this._cancel(context);
        
        default:
          return await this._generatePlan(context, args);
      }
    } catch (error) {
      log.error('TableHandler error', { error: error.message, stack: error.stack });
      return {
        handled: true,
        response: `Lo siento, hubo un error al procesar tu solicitud: ${error.message}`,
      };
    }
  }

  /**
   * Genera un plan para la tabla
   * @private
   */
  async _generatePlan(context, args) {
    const userRequest = args.user_request || context.message;
    const tableName = args.table_name || this._extractTableName(userRequest);
    const userFields = args.fields || [];

    log.debug('Generating table plan', { tableName, userFields });

    // Determinar campos
    let fields;
    if (userFields.length > 0) {
      // Usuario especificó campos
      fields = userFields.map(f => ({
        key: this._normalizeFieldKey(f.name),
        label: f.name,
        type: f.type || 'text',
        required: f.required || false,
        options: f.options || undefined,
      }));
    } else {
      // Buscar template o generar con IA
      const templateKey = this._findTemplateKey(tableName);
      if (templateKey && TABLE_TEMPLATES[templateKey]) {
        fields = TABLE_TEMPLATES[templateKey];
      } else {
        fields = await this._generateFieldsWithAI(tableName, userRequest);
      }
    }

    const plan = {
      tableName: this._normalizeTableName(tableName),
      fields,
      originalRequest: userRequest,
    };

    // Guardar plan en confirmación pendiente
    this.confirmationManager.createPending(context.chatId, {
      action: 'create_table',
      tableName: plan.tableName,
      data: plan,
    });

    return {
      handled: true,
      response: this._formatPlanMessage(plan),
      data: { plan },
    };
  }

  /**
   * Confirma y crea la tabla
   * @private
   */
  async _confirmAndCreate(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (!pending || pending.action !== 'create_table') {
      return {
        handled: true,
        response: `No hay ninguna tabla pendiente de crear. 

¿Qué tabla te gustaría crear? Por ejemplo:
• "Crear tabla de clientes"
• "Necesito una tabla de productos"
• "Crear tabla de ventas con campos: cliente, producto, cantidad"`,
      };
    }

    if (pending.status === CONFIRM_STATUS.EXPIRED) {
      this.confirmationManager.clear(context.chatId);
      return {
        handled: true,
        response: 'La propuesta anterior expiró. ¿Qué tabla te gustaría crear?',
      };
    }

    const plan = pending.data;

    // Crear la tabla en la BD
    const result = await this._createTable(plan, context.workspaceId);
    
    // Limpiar confirmación
    this.confirmationManager.clear(context.chatId);

    return {
      handled: true,
      response: result.message,
      data: result.success ? { table: result.table } : null,
    };
  }

  /**
   * Crea la tabla en la base de datos
   * @private
   */
  async _createTable(plan, workspaceId) {
    try {
      const tableId = uuidv4();
      
      const table = {
        _id: tableId,
        name: plan.tableName,
        type: 'custom',
        headers: plan.fields.map((f, idx) => ({
          ...f,
          order: idx,
        })),
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: true,
          allowDelete: false,
        },
        createdBy: 'chat-assistant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const db = await connectDB(getTableDbName(workspaceId));
      await db.insert(table);

      log.info('Table created by TableHandler', { tableId, name: table.name, workspaceId });

      const fieldsList = plan.fields.map(f => `• **${f.label}** (${f.type}${f.required ? ', requerido' : ''})`).join('\n');

      return {
        success: true,
        table,
        message: `✅ **¡Tabla creada exitosamente!**

**📊 ${table.name}**
• **ID:** \`${table._id}\`
• **Campos:** ${plan.fields.length}

**Campos creados:**
${fieldsList}

Puedes ver y usar la tabla desde el menú **Tablas**.

¿Necesitas crear otra tabla o una automatización?`,
      };
    } catch (error) {
      log.error('Error creating table', { error: error.message });
      return {
        success: false,
        message: `❌ Error al crear la tabla: ${error.message}`,
      };
    }
  }

  /**
   * Cancela la creación
   * @private
   */
  async _cancel(context) {
    const pending = this.confirmationManager.get(context.chatId);
    
    if (pending && pending.action === 'create_table') {
      this.confirmationManager.clear(context.chatId);
    }

    return {
      handled: true,
      response: 'Entendido, no crearé la tabla. ¿En qué más puedo ayudarte?',
    };
  }

  /**
   * Genera campos con IA si no hay template
   * @private
   */
  async _generateFieldsWithAI(tableName, userRequest) {
    const prompt = `El usuario quiere crear una tabla llamada "${tableName}".
Solicitud original: "${userRequest}"

Genera los campos más apropiados para esta tabla.

REGLAS:
1. Genera 5-8 campos relevantes
2. Incluye al menos un campo requerido
3. Usa tipos apropiados: text, number, email, phone, date, select, url, textarea
4. Si el nombre sugiere un tipo de entidad (clientes, productos, etc.), usa campos estándar

RESPONDE EN JSON:
{
  "fields": [
    {"key": "nombre", "label": "Nombre", "type": "text", "required": true},
    ...
  ]
}`;

    try {
      const response = await this.aiProvider.chat({
        systemPrompt: 'Eres un experto en bases de datos. Genera esquemas de tablas óptimos. SOLO responde en JSON.',
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o',
        temperature: 0.3,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.fields || [];
      }
    } catch (error) {
      log.error('Error generating fields with AI', { error: error.message });
    }

    // Fallback: campos básicos
    return [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'descripcion', label: 'Descripción', type: 'textarea' },
      { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'] },
      { key: 'fecha', label: 'Fecha', type: 'date' },
    ];
  }

  /**
   * Extrae el nombre de la tabla del mensaje
   * @private
   */
  _extractTableName(message) {
    const patterns = [
      /tabla\s+(?:de\s+)?["']?([^"']+?)["']?(?:\s+con|\s*$)/i,
      /crear\s+(?:la\s+)?tabla\s+["']?([^"']+?)["']?/i,
      /tabla\s+llamada\s+["']?([^"']+?)["']?/i,
      /tabla\s+["']?([^"']+?)["']?/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return 'Nueva Tabla';
  }

  /**
   * Encuentra la clave del template más cercano
   * @private
   */
  _findTemplateKey(tableName) {
    const lower = tableName.toLowerCase();
    
    const synonyms = {
      clientes: ['cliente', 'clientes', 'customer', 'customers', 'contacto', 'contactos'],
      productos: ['producto', 'productos', 'product', 'products', 'articulo', 'articulos', 'item'],
      ventas: ['venta', 'ventas', 'sale', 'sales', 'orden', 'ordenes', 'pedido', 'pedidos'],
      tareas: ['tarea', 'tareas', 'task', 'tasks', 'todo', 'actividad', 'actividades'],
      citas: ['cita', 'citas', 'appointment', 'appointments', 'reserva', 'reservas', 'booking'],
      empleados: ['empleado', 'empleados', 'employee', 'employees', 'personal', 'staff'],
      inventario: ['inventario', 'inventory', 'stock', 'almacen', 'bodega'],
    };

    for (const [key, synList] of Object.entries(synonyms)) {
      if (synList.some(syn => lower.includes(syn))) {
        return key;
      }
    }

    return null;
  }

  /**
   * Normaliza el nombre de la tabla
   * @private
   */
  _normalizeTableName(name) {
    // Capitalizar primera letra de cada palabra
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normaliza la clave del campo
   * @private
   */
  _normalizeFieldKey(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Formatea el mensaje del plan
   * @private
   */
  _formatPlanMessage(plan) {
    const fieldsList = plan.fields.map(f => {
      let desc = `• **${f.label}** - ${this._formatFieldType(f.type)}`;
      if (f.required) desc += ' _(requerido)_';
      if (f.options?.length > 0) desc += ` [${f.options.join(', ')}]`;
      return desc;
    }).join('\n');

    return `📊 **Plan para crear tabla: "${plan.tableName}"**

**Campos propuestos:**
${fieldsList}

---

**¿Los campos están bien?**
• ✅ **"Sí, créala"** - Crear la tabla ahora
• ✏️ **"Agregar campo X"** - Puedo agregar más campos
• ❌ **"Cancelar"** - No crear nada`;
  }

  /**
   * Formatea el tipo de campo
   * @private
   */
  _formatFieldType(type) {
    const types = {
      text: 'Texto',
      number: 'Número',
      email: 'Email',
      phone: 'Teléfono',
      date: 'Fecha',
      select: 'Selección',
      url: 'URL',
      textarea: 'Texto largo',
    };
    return types[type] || type;
  }
}

export default TableHandler;
