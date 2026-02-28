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
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['cita', 'citas', 'agenda', 'calendario', 'reserva', 'reservas', 'appointment']
  },
  
  // Tablas de contactos/clientes
  contacts: {
    icon: '👥',
    query: ['Consultar {tableName}'],
    create: ['Crear nuevos registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['cliente', 'clientes', 'contacto', 'contactos', 'paciente', 'pacientes', 'customer']
  },
  
  // Tablas de productos/inventario
  products: {
    icon: '📦',
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['producto', 'productos', 'inventario', 'stock', 'artículo', 'item']
  },
  
  // Tablas de servicios ofrecidos
  services: {
    icon: '💼',
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['servicio', 'servicios', 'tratamiento', 'tratamientos', 'service']
  },
  
  // Tablas de ventas/pedidos
  orders: {
    icon: '🛒',
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['venta', 'ventas', 'pedido', 'pedidos', 'orden', 'ordenes', 'order', 'sale']
  },
  
  // Tablas de empleados/staff
  staff: {
    icon: '👨‍⚕️',
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
    keywords: ['empleado', 'empleados', 'doctor', 'doctores', 'staff', 'personal', 'especialista']
  },
  
  // Tabla genérica/custom
  custom: {
    icon: '📋',
    query: ['Consultar {tableName}'],
    create: ['Crear registros en {tableName}'],
    update: ['Editar registros de {tableName}'],
    delete: ['Eliminar registros de {tableName}'],
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
   * @param {object} agent - El agente (incluye agent.tables con permisos)
   * @param {array} tables - Tablas reales del workspace
   * @returns {object} - Capacidades completas
   */
  static getCapabilities(agent, tables = []) {
    const industry = agent.businessInfo?.industry || detectIndustry(tables);
    const companyName = agent.businessInfo?.companyName || agent.name || 'Asistente';
    
    // Crear mapa de permisos del agente por tableId
    // Soportar múltiples formatos de agent.tables
    const agentTableConfig = new Map();
    (agent.tables || []).forEach(t => {
      // Normalizar: puede ser string o objeto con diferentes propiedades
      let tableId, permissions;
      
      if (typeof t === 'string') {
        tableId = t;
        permissions = { query: true, create: true, update: false, delete: false };
      } else {
        // Buscar tableId en diferentes propiedades posibles
        tableId = t.tableId || t.id || t._id;
        permissions = t.permissions || { query: true, create: true, update: false, delete: false };
      }
      
      if (tableId) {
        agentTableConfig.set(tableId, permissions);
      }
    });
    
    // Filtrar solo las tablas que el agente tiene configuradas
    // Soportar múltiples formatos
    const agentTableIds = new Set((agent.tables || []).map(t => {
      if (typeof t === 'string') return t;
      return t.tableId || t.id || t._id;
    }).filter(Boolean));
    
    // Soportar tanto _id como id (tablesInfo usa id)
    const linkedTables = tables.filter(t => agentTableIds.has(t._id || t.id));
    
    // Si no hay tablas configuradas, usar todas las disponibles con permisos por defecto
    const effectiveTables = linkedTables.length > 0 ? linkedTables : tables;
    
    // Merge tablas con permisos del agente
    const tablesWithAgentPermissions = effectiveTables.map(t => {
      const tableId = t._id || t.id;
      const agentPerms = agentTableConfig.get(tableId);
      return {
        ...t,
        agentPermissions: agentPerms || { query: true, create: true, update: false, delete: false }
      };
    });
    
    // Servicios derivados de las tablas (usa permisos del agente)
    const derivedServices = this.deriveServicesFromTables(tablesWithAgentPermissions, true);
    
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
      tables: tablesWithAgentPermissions.map(t => {
        // Usar permisos del agente, no de la tabla
        const permissions = t.agentPermissions || {
          query: true,
          create: true,
          update: false,
          delete: false,
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
   * @param {array} tables - Tablas con agentPermissions ya mergeados
   * @param {boolean} useAgentPermissions - Si usar permisos del agente (nuevo) o de la tabla (legacy)
   */
  static deriveServicesFromTables(tables, useAgentPermissions = false) {
    const servicesSet = new Set();
    const servicesList = [];
    
    for (const table of tables) {
      const type = detectTableType(table);
      const config = TABLE_TYPE_TO_SERVICES[type] || TABLE_TYPE_TO_SERVICES.custom;
      const tableName = table.name || 'registros';
      
      // Obtener permisos - usar del agente si disponibles, sino de la tabla
      let permissions;
      if (useAgentPermissions && table.agentPermissions) {
        // Ser más permisivo en la evaluación de permisos (truthy en vez de === true)
        permissions = {
          allowQuery: table.agentPermissions.query !== false,
          allowCreate: !!table.agentPermissions.create,
          allowUpdate: !!table.agentPermissions.update,
          allowDelete: !!table.agentPermissions.delete,
        };
      } else {
        permissions = {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: true,
          allowDelete: false,
          ...(table.permissions || {})
        };
      }
      
      // Agregar servicios según permisos
      const addServices = (servicesArray, icon) => {
        servicesArray.forEach(serviceTemplate => {
          // Reemplazar {tableName} con el nombre real de la tabla
          const service = serviceTemplate.replace('{tableName}', tableName);
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
   * Muestra capacidades de forma amigable sin mencionar detalles técnicos
   */
  static generateHelpText(agent, tables = []) {
    const caps = this.getCapabilities(agent, tables);
    
    let text = `¡Hola! 👋 Soy ${caps.identity.name}`;
    if (caps.identity.company !== caps.identity.name) {
      text += `, asistente virtual de ${caps.identity.company}`;
    }
    text += '.\n\n';
    
    // Agrupar capacidades de forma amigable
    if (caps.tables && caps.tables.length > 0) {
      // Recopilar todas las acciones únicas
      const canQuery = caps.tables.some(t => t.permissions?.query);
      const canCreate = caps.tables.some(t => t.permissions?.create);
      const canUpdate = caps.tables.some(t => t.permissions?.update);
      const canDelete = caps.tables.some(t => t.permissions?.delete);
      
      // Construir lista de capacidades de forma natural
      const capabilities = [];
      
      if (canQuery) {
        capabilities.push('📋 Consultar información y responder preguntas');
      }
      if (canCreate) {
        capabilities.push('✏️ Registrar nuevos datos');
      }
      if (canUpdate) {
        capabilities.push('🔄 Modificar información existente');
      }
      if (canDelete) {
        capabilities.push('🗑️ Eliminar registros cuando lo necesites');
      }
      
      if (capabilities.length > 0) {
        text += '**Puedo ayudarte a:**\n';
        capabilities.forEach(cap => {
          text += `${cap}\n`;
        });
        text += '\n';
      }
    }
    
    // Mostrar limitaciones si las hay (máximo 2 para no saturar)
    if (caps.limitations.length > 0) {
      text += '**Ten en cuenta:**\n';
      caps.limitations.slice(0, 2).forEach(l => {
        text += `⚠️ ${l}\n`;
      });
      text += '\n';
    }
    
    text += '¿En qué te puedo ayudar?';
    
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
