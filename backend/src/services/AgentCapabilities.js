/**
 * AgentCapabilities - Infiere automáticamente qué puede hacer el bot
 * 
 * El usuario NO tiene que configurar los servicios manualmente.
 * Se derivan de las tablas vinculadas al agente.
 */

// Mapeo de tipos de tabla a servicios que ofrece (con acciones por permiso)
const TABLE_TYPE_TO_SERVICES = {
  // Tablas de citas/agenda
  calendar: {
    icon: '📅',
    // Servicios por tipo de permiso
    query: ['Consultar citas', 'Ver disponibilidad', 'Ver historial de citas'],
    create: ['Agendar citas'],
    update: ['Reprogramar citas'],
    delete: ['Cancelar citas'],
    keywords: ['cita', 'citas', 'agenda', 'calendario', 'reserva', 'reservas', 'appointment']
  },
  
  // Tablas de contactos/clientes
  contacts: {
    icon: '👥',
    query: ['Buscar clientes', 'Consultar información de contacto', 'Ver historial'],
    create: ['Registrar clientes'],
    update: ['Actualizar información de clientes'],
    delete: ['Eliminar clientes'],
    keywords: ['cliente', 'clientes', 'contacto', 'contactos', 'paciente', 'pacientes', 'customer']
  },
  
  // Tablas de productos/inventario
  products: {
    icon: '📦',
    query: ['Consultar productos', 'Ver precios', 'Buscar por categoría', 'Verificar stock'],
    create: ['Agregar productos'],
    update: ['Actualizar productos'],
    delete: ['Eliminar productos'],
    keywords: ['producto', 'productos', 'inventario', 'stock', 'artículo', 'item']
  },
  
  // Tablas de servicios ofrecidos
  services: {
    icon: '💼',
    query: ['Consultar servicios', 'Ver precios de servicios', 'Información de servicios'],
    create: ['Agregar servicios'],
    update: ['Modificar servicios'],
    delete: ['Eliminar servicios'],
    keywords: ['servicio', 'servicios', 'tratamiento', 'tratamientos', 'service']
  },
  
  // Tablas de ventas/pedidos
  orders: {
    icon: '🛒',
    query: ['Consultar pedidos', 'Ver estado de pedido', 'Historial de compras'],
    create: ['Crear pedidos'],
    update: ['Modificar pedidos'],
    delete: ['Cancelar pedidos'],
    keywords: ['venta', 'ventas', 'pedido', 'pedidos', 'orden', 'ordenes', 'order', 'sale']
  },
  
  // Tablas de empleados/staff
  staff: {
    icon: '👨‍⚕️',
    query: ['Ver disponibilidad de personal', 'Información de especialistas'],
    create: ['Agregar personal'],
    update: ['Actualizar información de personal'],
    delete: ['Dar de baja personal'],
    keywords: ['empleado', 'empleados', 'doctor', 'doctores', 'staff', 'personal', 'especialista']
  },
  
  // Tabla genérica/custom
  custom: {
    icon: '📋',
    query: ['Consultar registros', 'Buscar información'],
    create: ['Crear registros'],
    update: ['Modificar registros'],
    delete: ['Eliminar registros'],
    keywords: []
  }
};

// Mapeo de industria a limitaciones por defecto
const INDUSTRY_LIMITATIONS = {
  clinic: [
    'No puedo dar diagnósticos médicos',
    'No puedo recetar medicamentos',
    'Para emergencias, llama al número de emergencias'
  ],
  veterinary: [
    'No puedo dar diagnósticos veterinarios',
    'No puedo recetar medicamentos para mascotas',
    'Para emergencias, acude a la clínica más cercana'
  ],
  restaurant: [
    'No proceso pagos directamente',
    'Los precios pueden variar sin previo aviso'
  ],
  salon: [
    'No garantizo disponibilidad hasta confirmar la cita',
    'Los precios pueden variar según el servicio específico'
  ],
  retail: [
    'No proceso pagos directamente',
    'La disponibilidad de productos puede variar'
  ],
  services: [
    'No proceso pagos directamente',
    'Los precios son referenciales'
  ],
  other: []
};

/**
 * Detecta el tipo de tabla basándose en su nombre y headers
 */
function detectTableType(table) {
  const name = (table.name || '').toLowerCase();
  const headers = (table.headers || []).map(h => 
    (typeof h === 'string' ? h : h.key || h.label || '').toLowerCase()
  );
  const allText = name + ' ' + headers.join(' ');
  
  // Buscar coincidencias
  for (const [type, config] of Object.entries(TABLE_TYPE_TO_SERVICES)) {
    if (type === 'custom') continue;
    
    for (const keyword of config.keywords) {
      if (allText.includes(keyword)) {
        return type;
      }
    }
  }
  
  // Si tiene campos de fecha/hora, probablemente es agenda
  if (headers.some(h => ['fecha', 'hora', 'date', 'time', 'inicio', 'fin'].includes(h))) {
    return 'calendar';
  }
  
  // Si tiene campos de contacto, probablemente es contactos
  if (headers.some(h => ['telefono', 'phone', 'email', 'correo', 'direccion'].includes(h))) {
    return 'contacts';
  }
  
  // Si tiene precio, probablemente es productos/servicios
  if (headers.some(h => ['precio', 'price', 'costo', 'valor'].includes(h))) {
    return 'products';
  }
  
  return 'custom';
}

/**
 * Detecta la industria basándose en las tablas
 */
function detectIndustry(tables) {
  const allNames = tables.map(t => (t.name || '').toLowerCase()).join(' ');
  
  if (allNames.includes('paciente') || allNames.includes('consulta') || allNames.includes('medic')) {
    return 'clinic';
  }
  if (allNames.includes('mascota') || allNames.includes('veterina')) {
    return 'veterinary';
  }
  if (allNames.includes('mesa') || allNames.includes('menu') || allNames.includes('plato')) {
    return 'restaurant';
  }
  if (allNames.includes('corte') || allNames.includes('estilista') || allNames.includes('salon')) {
    return 'salon';
  }
  if (allNames.includes('producto') || allNames.includes('inventario')) {
    return 'retail';
  }
  
  return 'services';
}

/**
 * Clase principal para obtener capacidades del agente
 */
export class AgentCapabilities {
  
  /**
   * Obtiene todas las capacidades del agente
   * @param {object} agent - El agente
   * @param {array} tables - Tablas vinculadas al agente
   * @returns {object} - Capacidades completas
   */
  static getCapabilities(agent, tables = []) {
    const industry = agent.businessInfo?.industry || detectIndustry(tables);
    const companyName = agent.businessInfo?.companyName || agent.name || 'Asistente';
    
    // Servicios derivados de las tablas (considera permisos)
    const derivedServices = this.deriveServicesFromTables(tables);
    
    // Limitaciones (las del usuario + las default de la industria)
    const userLimitations = agent.limitations || [];
    const industryLimitations = INDUSTRY_LIMITATIONS[industry] || [];
    const allLimitations = [...new Set([...userLimitations, ...industryLimitations])];
    
    return {
      identity: {
        name: agent.name || 'Asistente',
        company: companyName,
        industry,
        role: `Asistente virtual de ${companyName}`
      },
      services: derivedServices,
      limitations: allLimitations,
      tables: tables.map(t => {
        // Obtener permisos reales (con defaults del esquema)
        const permissions = {
          query: t.permissions?.allowQuery !== false,    // default: true
          create: t.permissions?.allowCreate !== false,  // default: true
          update: t.permissions?.allowUpdate !== false,  // default: true
          delete: t.permissions?.allowDelete === true,   // default: false
        };
        return {
          id: t._id,
          name: t.name,
          type: detectTableType(t),
          fields: (t.headers || []).map(h => h.key || h.label || h),
          permissions
        };
      })
    };
  }
  
  /**
   * Deriva servicios automáticamente de las tablas
   */
  static deriveServicesFromTables(tables) {
    const servicesSet = new Set();
    const servicesList = [];
    
    for (const table of tables) {
      const type = detectTableType(table);
      const config = TABLE_TYPE_TO_SERVICES[type] || TABLE_TYPE_TO_SERVICES.custom;
      const tableName = table.name || 'registros';
      
      // Obtener permisos efectivos de la tabla
      const permissions = {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false,
        ...(table.permissions || {})
      };
      
      // Agregar servicios según permisos
      const addServices = (servicesArray, icon) => {
        servicesArray.forEach(service => {
          if (!servicesSet.has(service)) {
            servicesSet.add(service);
            servicesList.push({
              icon,
              text: service,
              relatedTable: tableName
            });
          }
        });
      };
      
      // Siempre agregar servicios de consulta si allowQuery
      if (permissions.allowQuery && config.query) {
        addServices(config.query, config.icon);
      }
      
      // Agregar creación si allowCreate
      if (permissions.allowCreate && config.create) {
        addServices(config.create, config.icon);
      }
      
      // Agregar actualización si allowUpdate
      if (permissions.allowUpdate && config.update) {
        addServices(config.update, config.icon);
      }
      
      // Agregar eliminación si allowDelete
      if (permissions.allowDelete && config.delete) {
        addServices(config.delete, config.icon);
      }
    }
    
    // Si no hay tablas, servicios genéricos
    if (servicesList.length === 0) {
      return [
        { icon: '💬', text: 'Responder preguntas', relatedTable: null },
        { icon: '📋', text: 'Dar información general', relatedTable: null }
      ];
    }
    
    return servicesList;
  }
  
  /**
   * Genera texto para cuando el usuario pregunta "¿qué puedes hacer?"
   */
  static generateHelpText(agent, tables = []) {
    const caps = this.getCapabilities(agent, tables);
    
    let text = `¡Hola! 👋 Soy ${caps.identity.name}`;
    if (caps.identity.company !== caps.identity.name) {
      text += `, asistente virtual de ${caps.identity.company}`;
    }
    text += '.\n\n';
    
    text += '**Puedo ayudarte con:**\n';
    caps.services.forEach(s => {
      text += `${s.icon} ${s.text}\n`;
    });
    
    if (caps.limitations.length > 0) {
      text += '\n**Importante:**\n';
      caps.limitations.slice(0, 3).forEach(l => {
        text += `⚠️ ${l}\n`;
      });
    }
    
    text += '\n¿En qué te puedo ayudar?';
    
    return text;
  }
  
  /**
   * Genera el contexto para el system prompt del LLM
   */
  static generateSystemContext(agent, tables = []) {
    const caps = this.getCapabilities(agent, tables);
    
    let context = `Eres "${caps.identity.name}", ${caps.identity.role}.\n\n`;
    
    context += 'SERVICIOS QUE OFRECES:\n';
    caps.services.forEach(s => {
      context += `- ${s.text}`;
      if (s.relatedTable) context += ` (tabla: ${s.relatedTable})`;
      context += '\n';
    });
    
    if (caps.limitations.length > 0) {
      context += '\nLIMITACIONES (lo que NO puedes hacer):\n';
      caps.limitations.forEach(l => {
        context += `- ${l}\n`;
      });
    }
    
    context += '\nTABLAS DISPONIBLES CON PERMISOS:\n';
    caps.tables.forEach(t => {
      const perms = [];
      if (t.permissions.query) perms.push('consultar');
      if (t.permissions.create) perms.push('crear');
      if (t.permissions.update) perms.push('modificar');
      if (t.permissions.delete) perms.push('eliminar');
      
      context += `- ${t.name} (${t.type})\n`;
      context += `  Campos: [${t.fields.join(', ')}]\n`;
      context += `  Puedo: ${perms.join(', ') || 'solo informar'}\n`;
    });
    
    return context;
  }
}

export default AgentCapabilities;
