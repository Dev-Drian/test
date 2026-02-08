/**
 * Seed Multi-Workspace
 * 
 * Crea 3 workspaces de ejemplo con diferentes tipos de negocio:
 * 1. Veterinaria (plan premium)
 * 2. Restaurante (plan premium)
 * 3. Salón de Belleza (plan básico)
 * 
 * Cada uno con su configuración, agentes y tablas específicas.
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:admin@localhost:5984';

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE WORKSPACES
// ═══════════════════════════════════════════════════════════════

const WORKSPACES = [
  {
    id: 'ws_veterinaria_demo',
    name: 'Veterinaria PetCare',
    type: 'veterinary',
    plan: 'premium',
    business: {
      name: 'Veterinaria PetCare',
      type: 'veterinary',
      description: 'Clínica veterinaria especializada en pequeñas especies',
      phone: '+57 300 123 4567',
      email: 'contacto@petcare.com',
      address: 'Calle 123 #45-67, Bogotá',
      website: 'https://petcare.com',
    },
    notifications: {
      enabled: true,
      providers: ['in_app'],
      events: {
        record_created: true,
        record_updated: true,
        record_deleted: true,
        create_completed: true,
      },
    },
    businessHours: {
      monday: { start: '08:00', end: '20:00', enabled: true },
      tuesday: { start: '08:00', end: '20:00', enabled: true },
      wednesday: { start: '08:00', end: '20:00', enabled: true },
      thursday: { start: '08:00', end: '20:00', enabled: true },
      friday: { start: '08:00', end: '20:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: true },
      sunday: { start: '00:00', end: '00:00', enabled: false },
    },
    appointments: {
      duration: 30,
      slotInterval: 30,
    },
  },
  {
    id: 'ws_restaurante_demo',
    name: 'Restaurante La Casona',
    type: 'restaurant',
    plan: 'premium',
    business: {
      name: 'Restaurante La Casona',
      type: 'restaurant',
      description: 'Cocina colombiana tradicional con toques modernos',
      phone: '+57 300 987 6543',
      email: 'reservas@lacasona.com',
      address: 'Carrera 7 #82-35, Bogotá',
      website: 'https://lacasona.com',
    },
    notifications: {
      enabled: true,
      providers: ['in_app'],
      events: {
        record_created: true,
        record_updated: true,
        record_deleted: true,
        create_completed: true,
      },
    },
    businessHours: {
      monday: { start: '12:00', end: '22:00', enabled: true },
      tuesday: { start: '12:00', end: '22:00', enabled: true },
      wednesday: { start: '12:00', end: '22:00', enabled: true },
      thursday: { start: '12:00', end: '23:00', enabled: true },
      friday: { start: '12:00', end: '23:00', enabled: true },
      saturday: { start: '12:00', end: '23:00', enabled: true },
      sunday: { start: '12:00', end: '20:00', enabled: true },
    },
    appointments: {
      duration: 120, // Reservas de 2 horas
      slotInterval: 30,
    },
  },
  {
    id: 'ws_salon_demo',
    name: 'Salón Bella Vida',
    type: 'beauty_salon',
    plan: 'basic', // Plan básico para demostrar diferencias
    business: {
      name: 'Salón de Belleza Bella Vida',
      type: 'beauty_salon',
      description: 'Servicios de peluquería, manicure y estética',
      phone: '+57 300 555 1234',
      email: 'citas@bellavida.com',
      address: 'Calle 85 #15-20, Bogotá',
      website: '',
    },
    notifications: {
      enabled: false, // Deshabilitado en plan básico
      providers: ['in_app'],
      events: {
        record_created: true,
        record_updated: false,
        record_deleted: false,
      },
    },
    businessHours: {
      monday: { start: '09:00', end: '19:00', enabled: true },
      tuesday: { start: '09:00', end: '19:00', enabled: true },
      wednesday: { start: '09:00', end: '19:00', enabled: true },
      thursday: { start: '09:00', end: '19:00', enabled: true },
      friday: { start: '09:00', end: '19:00', enabled: true },
      saturday: { start: '09:00', end: '17:00', enabled: true },
      sunday: { start: '00:00', end: '00:00', enabled: false },
    },
    appointments: {
      duration: 60,
      slotInterval: 30,
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// AGENTES POR WORKSPACE
// ═══════════════════════════════════════════════════════════════

function getAgents(workspaceId, workspaceType) {
  const agents = {
    veterinary: [
      {
        _id: `agent_${workspaceId}_asistente`,
        type: 'agent',
        workspaceId,
        name: 'Luna',
        avatar: '🐾',
        description: 'Asistente virtual de la clínica veterinaria',
        role: 'Asistente de citas y consultas',
        personality: 'Amable, empático con los dueños de mascotas',
        aiModel: 'gpt-4o-mini',
        tables: [],
        flows: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ],
    restaurant: [
      {
        _id: `agent_${workspaceId}_reservas`,
        type: 'agent',
        workspaceId,
        name: 'Carlos',
        avatar: '👨‍🍳',
        description: 'Asistente de reservaciones del restaurante',
        role: 'Gestión de reservas y menú',
        personality: 'Profesional, conocedor de gastronomía',
        aiModel: 'gpt-4o-mini',
        tables: [],
        flows: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ],
    beauty_salon: [
      {
        _id: `agent_${workspaceId}_citas`,
        type: 'agent',
        workspaceId,
        name: 'Sofía',
        avatar: '💇‍♀️',
        description: 'Asistente de citas del salón',
        role: 'Gestión de citas y servicios',
        personality: 'Amigable, conocedora de tendencias',
        aiModel: 'gpt-4o-mini',
        tables: [],
        flows: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ],
  };
  
  return agents[workspaceType] || [];
}

// ═══════════════════════════════════════════════════════════════
// TABLAS POR WORKSPACE
// ═══════════════════════════════════════════════════════════════

function getTables(workspaceId, workspaceType) {
  const tables = {
    veterinary: [
      {
        _id: `table_${workspaceId}_mascotas`,
        type: 'table',
        workspaceId,
        name: 'Mascotas',
        description: 'Registro de pacientes (mascotas)',
        icon: '🐕',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '🐾', askMessage: '¿Cómo se llama tu mascota?', confirmLabel: 'Mascota', priority: 1 },
          { key: 'especie', label: 'Especie', type: 'select', options: ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'], required: true, emoji: '🦴', askMessage: '¿Qué especie es?', priority: 2 },
          { key: 'raza', label: 'Raza', type: 'text', emoji: '📋', askMessage: '¿De qué raza es?', priority: 3 },
          { key: 'edad', label: 'Edad', type: 'text', emoji: '🎂', askMessage: '¿Qué edad tiene?', priority: 4 },
          { key: 'propietario', label: 'Propietario', type: 'text', required: true, emoji: '👤', askMessage: '¿Cuál es tu nombre?', priority: 5 },
          { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', askMessage: '¿Cuál es tu número de teléfono?', priority: 6 },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_veterinarios`,
        type: 'table',
        workspaceId,
        name: 'Veterinarios',
        description: 'Staff veterinario',
        icon: '👨‍⚕️',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'especialidad', label: 'Especialidad', type: 'text' },
          { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_citas`,
        type: 'table',
        tableType: 'appointments',
        workspaceId,
        name: 'Citas',
        description: 'Agenda de citas veterinarias',
        icon: '📅',
        headers: [
          { key: 'mascota', label: 'Mascota', type: 'relation', relationTo: `table_${workspaceId}_mascotas`, required: true, emoji: '🐾', askMessage: '¿Para qué mascota es la cita?', priority: 1 },
          { key: 'veterinario', label: 'Veterinario', type: 'relation', relationTo: `table_${workspaceId}_veterinarios`, emoji: '👨‍⚕️', askMessage: '¿Con qué veterinario prefieres la cita?', priority: 2 },
          { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', askMessage: '¿Para qué fecha necesitas la cita?', priority: 3 },
          { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', askMessage: '¿A qué hora te gustaría?', priority: 4 },
          { key: 'motivo', label: 'Motivo', type: 'text', emoji: '📝', askMessage: '¿Cuál es el motivo de la consulta?', priority: 5 },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada'], default: 'Pendiente' },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    restaurant: [
      {
        _id: `table_${workspaceId}_clientes`,
        type: 'table',
        workspaceId,
        name: 'Clientes',
        description: 'Base de datos de clientes',
        icon: '👥',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👤', askMessage: '¿A nombre de quién será la reserva?', priority: 1 },
          { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', askMessage: '¿Cuál es tu número de contacto?', priority: 2 },
          { key: 'email', label: 'Email', type: 'email', emoji: '📧', askMessage: '¿Cuál es tu correo electrónico?', priority: 3 },
          { key: 'notas', label: 'Notas', type: 'text', emoji: '📝', askMessage: '¿Alguna preferencia o alergia que debamos conocer?' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_mesas`,
        type: 'table',
        workspaceId,
        name: 'Mesas',
        description: 'Distribución de mesas',
        icon: '🪑',
        headers: [
          { key: 'numero', label: 'Número', type: 'number', required: true },
          { key: 'capacidad', label: 'Capacidad', type: 'number', required: true },
          { key: 'ubicacion', label: 'Ubicación', type: 'select', options: ['Interior', 'Terraza', 'Privado'] },
          { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_reservas`,
        type: 'table',
        tableType: 'appointments',
        workspaceId,
        name: 'Reservas',
        description: 'Reservaciones del restaurante',
        icon: '📅',
        headers: [
          { key: 'cliente', label: 'Cliente', type: 'relation', relationTo: `table_${workspaceId}_clientes`, required: true, emoji: '👤', askMessage: '¿A nombre de quién es la reserva?', priority: 1 },
          { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', askMessage: '¿Para qué fecha deseas reservar?', priority: 2 },
          { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', askMessage: '¿A qué hora llegarán?', priority: 3 },
          { key: 'personas', label: 'Personas', type: 'number', required: true, emoji: '👥', askMessage: '¿Para cuántas personas?', priority: 4 },
          { key: 'mesa', label: 'Mesa', type: 'relation', relationTo: `table_${workspaceId}_mesas`, emoji: '🪑', askMessage: '¿Prefieres alguna ubicación? (Interior, Terraza, Privado)', priority: 5 },
          { key: 'ocasion', label: 'Ocasión', type: 'select', options: ['Casual', 'Cumpleaños', 'Aniversario', 'Negocios', 'Otro'], emoji: '🎉', askMessage: '¿Es una ocasión especial?' },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'Sentados', 'Completada', 'No Show', 'Cancelada'], default: 'Pendiente' },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
    beauty_salon: [
      {
        _id: `table_${workspaceId}_clientes`,
        type: 'table',
        workspaceId,
        name: 'Clientes',
        description: 'Clientas del salón',
        icon: '👩',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👩', askMessage: '¿Cuál es tu nombre?', priority: 1 },
          { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', askMessage: '¿Cuál es tu número de teléfono?', priority: 2 },
          { key: 'email', label: 'Email', type: 'email', emoji: '📧' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_servicios`,
        type: 'table',
        workspaceId,
        name: 'Servicios',
        description: 'Catálogo de servicios',
        icon: '💅',
        headers: [
          { key: 'nombre', label: 'Servicio', type: 'text', required: true },
          { key: 'duracion', label: 'Duración (min)', type: 'number', required: true },
          { key: 'precio', label: 'Precio', type: 'currency' },
          { key: 'categoria', label: 'Categoría', type: 'select', options: ['Cabello', 'Uñas', 'Facial', 'Maquillaje', 'Spa'] },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_estilistas`,
        type: 'table',
        workspaceId,
        name: 'Estilistas',
        description: 'Staff del salón',
        icon: '💇‍♀️',
        headers: [
          { key: 'nombre', label: 'Nombre', type: 'text', required: true },
          { key: 'especialidad', label: 'Especialidad', type: 'text' },
          { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: `table_${workspaceId}_citas`,
        type: 'table',
        tableType: 'appointments',
        workspaceId,
        name: 'Citas',
        description: 'Agenda de citas',
        icon: '📅',
        headers: [
          { key: 'cliente', label: 'Cliente', type: 'relation', relationTo: `table_${workspaceId}_clientes`, required: true, emoji: '👩', askMessage: '¿Cuál es tu nombre?', priority: 1 },
          { key: 'servicio', label: 'Servicio', type: 'relation', relationTo: `table_${workspaceId}_servicios`, required: true, emoji: '💅', askMessage: '¿Qué servicio deseas?', priority: 2 },
          { key: 'estilista', label: 'Estilista', type: 'relation', relationTo: `table_${workspaceId}_estilistas`, emoji: '💇‍♀️', askMessage: '¿Tienes preferencia por algún estilista?', priority: 3 },
          { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', askMessage: '¿Para qué día?', priority: 4 },
          { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', askMessage: '¿A qué hora?', priority: 5 },
          { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'En proceso', 'Completada', 'Cancelada'], default: 'Pendiente' },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
  };
  
  return tables[workspaceType] || [];
}

// ═══════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO POR WORKSPACE
// ═══════════════════════════════════════════════════════════════

function getSampleData(workspaceId, workspaceType) {
  const data = {
    veterinary: [
      // Veterinarios
      { _id: `data_${workspaceId}_vet1`, tableId: `table_${workspaceId}_veterinarios`, nombre: 'Dr. Carlos Rodríguez', especialidad: 'Medicina General', disponible: true },
      { _id: `data_${workspaceId}_vet2`, tableId: `table_${workspaceId}_veterinarios`, nombre: 'Dra. María López', especialidad: 'Cirugía', disponible: true },
      { _id: `data_${workspaceId}_vet3`, tableId: `table_${workspaceId}_veterinarios`, nombre: 'Dr. Andrés Gómez', especialidad: 'Dermatología', disponible: false },
      // Mascotas
      { _id: `data_${workspaceId}_pet1`, tableId: `table_${workspaceId}_mascotas`, nombre: 'Max', especie: 'Perro', raza: 'Golden Retriever', edad: '3 años', propietario: 'Juan Pérez', telefono: '3001234567' },
      { _id: `data_${workspaceId}_pet2`, tableId: `table_${workspaceId}_mascotas`, nombre: 'Luna', especie: 'Gato', raza: 'Siamés', edad: '2 años', propietario: 'Ana García', telefono: '3009876543' },
    ],
    restaurant: [
      // Mesas
      { _id: `data_${workspaceId}_mesa1`, tableId: `table_${workspaceId}_mesas`, numero: 1, capacidad: 2, ubicacion: 'Interior', disponible: true },
      { _id: `data_${workspaceId}_mesa2`, tableId: `table_${workspaceId}_mesas`, numero: 2, capacidad: 4, ubicacion: 'Interior', disponible: true },
      { _id: `data_${workspaceId}_mesa3`, tableId: `table_${workspaceId}_mesas`, numero: 3, capacidad: 6, ubicacion: 'Terraza', disponible: true },
      { _id: `data_${workspaceId}_mesa4`, tableId: `table_${workspaceId}_mesas`, numero: 4, capacidad: 8, ubicacion: 'Privado', disponible: true },
      // Clientes
      { _id: `data_${workspaceId}_cli1`, tableId: `table_${workspaceId}_clientes`, nombre: 'Pedro Martínez', telefono: '3005551234', email: 'pedro@email.com' },
    ],
    beauty_salon: [
      // Servicios
      { _id: `data_${workspaceId}_srv1`, tableId: `table_${workspaceId}_servicios`, nombre: 'Corte de cabello', duracion: 45, precio: 35000, categoria: 'Cabello' },
      { _id: `data_${workspaceId}_srv2`, tableId: `table_${workspaceId}_servicios`, nombre: 'Tinte completo', duracion: 120, precio: 120000, categoria: 'Cabello' },
      { _id: `data_${workspaceId}_srv3`, tableId: `table_${workspaceId}_servicios`, nombre: 'Manicure', duracion: 45, precio: 25000, categoria: 'Uñas' },
      { _id: `data_${workspaceId}_srv4`, tableId: `table_${workspaceId}_servicios`, nombre: 'Pedicure', duracion: 60, precio: 35000, categoria: 'Uñas' },
      { _id: `data_${workspaceId}_srv5`, tableId: `table_${workspaceId}_servicios`, nombre: 'Limpieza facial', duracion: 60, precio: 80000, categoria: 'Facial' },
      // Estilistas
      { _id: `data_${workspaceId}_est1`, tableId: `table_${workspaceId}_estilistas`, nombre: 'Carolina Torres', especialidad: 'Colorimetría', disponible: true },
      { _id: `data_${workspaceId}_est2`, tableId: `table_${workspaceId}_estilistas`, nombre: 'Diana Ruiz', especialidad: 'Uñas y Spa', disponible: true },
    ],
  };
  
  return data[workspaceType] || [];
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE SEED
// ═══════════════════════════════════════════════════════════════

async function connectDB(name) {
  return new PouchDB(`${COUCHDB_URL}/${name}`);
}

async function seedWorkspace(wsConfig) {
  console.log(`\n📦 Seeding workspace: ${wsConfig.name}`);
  
  const workspaceId = wsConfig.id;
  
  // 1. Crear workspace
  const workspacesDb = await connectDB('chatbot_workspaces');
  
  const workspace = {
    _id: workspaceId,
    type: 'workspace',
    name: wsConfig.name,
    description: wsConfig.business.description,
    businessType: wsConfig.type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  try {
    const existing = await workspacesDb.get(workspaceId).catch(() => null);
    if (existing) {
      workspace._rev = existing._rev;
    }
    await workspacesDb.put(workspace);
    console.log(`  ✅ Workspace created: ${wsConfig.name}`);
  } catch (err) {
    console.log(`  ⚠️ Workspace: ${err.message}`);
  }
  
  // 2. Crear configuración del workspace
  const configDb = await connectDB(`chatbot_${workspaceId}`);
  
  const config = {
    _id: `config_${workspaceId}`,
    type: 'workspace_config',
    workspaceId,
    plan: wsConfig.plan,
    business: wsConfig.business,
    notifications: wsConfig.notifications,
    businessHours: wsConfig.businessHours,
    appointments: wsConfig.appointments,
    ai: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1024,
    },
    integrations: {
      whatsapp: { enabled: false },
      email: { enabled: false },
      webhook: { enabled: false },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  try {
    const existing = await configDb.get(config._id).catch(() => null);
    if (existing) {
      config._rev = existing._rev;
    }
    await configDb.put(config);
    console.log(`  ✅ Config created (plan: ${wsConfig.plan})`);
  } catch (err) {
    console.log(`  ⚠️ Config: ${err.message}`);
  }
  
  // 3. Crear agentes
  const agentsDb = await connectDB(`chatbot_agents_${workspaceId}`);
  const agents = getAgents(workspaceId, wsConfig.type);
  
  for (const agent of agents) {
    try {
      const existing = await agentsDb.get(agent._id).catch(() => null);
      if (existing) {
        agent._rev = existing._rev;
      }
      await agentsDb.put(agent);
      console.log(`  ✅ Agent: ${agent.name} ${agent.avatar}`);
    } catch (err) {
      console.log(`  ⚠️ Agent: ${err.message}`);
    }
  }
  
  // 4. Crear tablas
  const tablesDb = await connectDB(`chatbot_tables_${workspaceId}`);
  const tables = getTables(workspaceId, wsConfig.type);
  
  // Asignar tablas al agente
  const tableIds = tables.map(t => t._id);
  if (agents.length > 0) {
    agents[0].tables = tableIds;
    try {
      const existingAgent = await agentsDb.get(agents[0]._id).catch(() => null);
      if (existingAgent) {
        agents[0]._rev = existingAgent._rev;
      }
      await agentsDb.put(agents[0]);
    } catch {}
  }
  
  for (const table of tables) {
    try {
      const existing = await tablesDb.get(table._id).catch(() => null);
      if (existing) {
        table._rev = existing._rev;
      }
      await tablesDb.put(table);
      console.log(`  ✅ Table: ${table.name} ${table.icon}`);
    } catch (err) {
      console.log(`  ⚠️ Table: ${err.message}`);
    }
  }
  
  // 5. Crear datos de ejemplo
  const dataDb = await connectDB(`chatbot_tabledata_${workspaceId}`);
  const sampleData = getSampleData(workspaceId, wsConfig.type);
  
  // Crear índices
  try {
    await dataDb.createIndex({ index: { fields: ['tableId'] } });
  } catch {}
  
  for (const row of sampleData) {
    try {
      const existing = await dataDb.get(row._id).catch(() => null);
      if (existing) {
        row._rev = existing._rev;
      }
      row.createdAt = new Date().toISOString();
      await dataDb.put(row);
    } catch (err) {
      console.log(`  ⚠️ Data: ${err.message}`);
    }
  }
  
  console.log(`  ✅ Sample data: ${sampleData.length} rows`);
  
  // 6. Crear índices para notificaciones
  const notifDb = await connectDB(`chatbot_${workspaceId}`);
  try {
    await notifDb.createIndex({ index: { fields: ['type', 'workspaceId', 'read'] } });
    await notifDb.createIndex({ index: { fields: ['type', 'workspaceId', 'createdAt'] } });
  } catch {}
  
  console.log(`  ✅ Indexes created`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌱 SEED MULTI-WORKSPACE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Database URL: ${COUCHDB_URL.replace(/\/\/.*@/, '//<hidden>@')}`);
  
  for (const wsConfig of WORKSPACES) {
    await seedWorkspace(wsConfig);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETADO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nWorkspaces creados:');
  for (const ws of WORKSPACES) {
    console.log(`  - ${ws.name} (${ws.type}) - Plan: ${ws.plan}`);
  }
  console.log('\n');
}

main().catch(console.error);
