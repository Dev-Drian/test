/**
 * Seed Restaurante La Casona
 * 
 * Workspace completo de restaurante con:
 * - Configuración Premium
 * - Agente de reservas
 * - Tablas: Clientes, Mesas, Menú, Reservas
 * - Flujos dinámicos para reservas y consultas
 * - Datos de ejemplo realistas
 */

import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const couch = nano(COUCHDB_URL);
const WORKSPACE_ID = 'ws_restaurante_lacasona';

async function connectDB(name) {
  try {
    await couch.db.create(name);
  } catch (err) {
    if (err.statusCode !== 412) throw err;
  }
  return couch.use(name);
}

async function upsert(db, doc) {
  try {
    const existing = await db.get(doc._id).catch(() => null);
    if (existing) {
      doc._rev = existing._rev;
    }
    await db.insert(doc);
    return true;
  } catch (err) {
    console.log(`  ⚠️ ${doc._id}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🍽️ ════════════════════════════════════════════════════════');
  console.log('   SEED: Restaurante La Casona (Premium)');
  console.log('════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────
  // 1. WORKSPACE
  // ─────────────────────────────────────────────────────────────
  const workspacesDb = await connectDB('chatbot_workspaces');
  
  await upsert(workspacesDb, {
    _id: WORKSPACE_ID,
    type: 'workspace',
    name: 'Restaurante La Casona',
    description: 'Cocina colombiana tradicional con toques modernos',
    businessType: 'restaurant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('✅ Workspace creado');

  // ─────────────────────────────────────────────────────────────
  // 2. CONFIGURACIÓN DEL WORKSPACE
  // ─────────────────────────────────────────────────────────────
  const configDb = await connectDB(`chatbot_${WORKSPACE_ID}`);
  
  await upsert(configDb, {
    _id: `config_${WORKSPACE_ID}`,
    type: 'workspace_config',
    workspaceId: WORKSPACE_ID,
    plan: 'premium',
    business: {
      name: 'Restaurante La Casona',
      type: 'restaurant',
      description: 'Experiencia gastronómica colombiana única',
      phone: '+57 601 555 1234',
      email: 'reservas@lacasona.com.co',
      address: 'Carrera 7 #82-35, Zona G, Bogotá',
      website: 'https://lacasona.com.co',
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
      friday: { start: '12:00', end: '23:30', enabled: true },
      saturday: { start: '12:00', end: '23:30', enabled: true },
      sunday: { start: '12:00', end: '21:00', enabled: true },
    },
    appointments: {
      enabled: true,
      duration: 120,
      slotInterval: 30,
      maxPerSlot: 4,
      requireConfirmation: false,
      allowCancellation: true,
      cancellationHours: 2,
    },
    ai: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('✅ Configuración creada (Plan Premium)');

  // ─────────────────────────────────────────────────────────────
  // 3. TABLAS
  // ─────────────────────────────────────────────────────────────
  const tablesDb = await connectDB(`chatbot_tables_${WORKSPACE_ID}`);
  
  const tables = [
    {
      _id: `table_${WORKSPACE_ID}_clientes`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Clientes',
      description: 'Base de datos de clientes frecuentes',
      icon: '👥',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👤', askMessage: '¿A nombre de quién será la reserva?', confirmLabel: 'Cliente', priority: 1 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', askMessage: '¿Cuál es tu número de teléfono para confirmar la reserva?', priority: 2 },
        { key: 'email', label: 'Email', type: 'email', emoji: '📧', askMessage: '¿Tienes un correo electrónico? (opcional)' },
        { key: 'alergias', label: 'Alergias', type: 'text', emoji: '⚠️', askMessage: '¿Tienes alguna alergia alimentaria que debamos conocer?' },
        { key: 'preferencias', label: 'Preferencias', type: 'text', emoji: '💝', askMessage: '¿Alguna preferencia especial? (mesa ventana, zona tranquila, etc.)' },
        { key: 'visitas', label: 'Visitas', type: 'number', default: 1 },
        { key: 'vip', label: 'Cliente VIP', type: 'boolean', default: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_mesas`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Mesas',
      description: 'Distribución y capacidad de mesas',
      icon: '🪑',
      headers: [
        { key: 'numero', label: 'Número', type: 'number', required: true },
        { key: 'capacidad', label: 'Capacidad', type: 'number', required: true },
        { key: 'ubicacion', label: 'Ubicación', type: 'select', options: ['Salón Principal', 'Terraza', 'Salón Privado', 'Barra'] },
        { key: 'descripcion', label: 'Descripción', type: 'text' },
        { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_menu`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Menú',
      description: 'Carta de platos y bebidas',
      icon: '📜',
      headers: [
        { key: 'nombre', label: 'Plato', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripción', type: 'text' },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Entradas', 'Sopas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Vinos'] },
        { key: 'precio', label: 'Precio', type: 'currency' },
        { key: 'vegetariano', label: 'Vegetariano', type: 'boolean', default: false },
        { key: 'recomendado', label: 'Chef Recomienda', type: 'boolean', default: false },
        { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_reservas`,
      type: 'table',
      tableType: 'appointments',
      workspaceId: WORKSPACE_ID,
      name: 'Reservas',
      description: 'Reservaciones del restaurante',
      icon: '📅',
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'relation', relationTo: `table_${WORKSPACE_ID}_clientes`, required: true, emoji: '👤', askMessage: '¿A nombre de quién será la reserva?', confirmLabel: 'Cliente', priority: 1 },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', askMessage: '¿Para qué fecha deseas reservar?', confirmLabel: 'Fecha', priority: 2 },
        { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', askMessage: '¿A qué hora llegarán?', confirmLabel: 'Hora', priority: 3 },
        { key: 'personas', label: 'Personas', type: 'number', required: true, emoji: '👥', askMessage: '¿Para cuántas personas?', confirmLabel: 'Comensales', priority: 4, validation: { min: 1, max: 20 } },
        { key: 'mesa', label: 'Mesa', type: 'relation', relationTo: `table_${WORKSPACE_ID}_mesas`, emoji: '🪑', askMessage: '¿Prefieres alguna ubicación? (Salón Principal, Terraza, Salón Privado)', priority: 5 },
        { key: 'ocasion', label: 'Ocasión', type: 'select', options: ['Casual', 'Cumpleaños', 'Aniversario', 'Propuesta', 'Negocios', 'Graduación', 'Otro'], emoji: '🎉', askMessage: '¿Es una ocasión especial? (cumpleaños, aniversario, negocios...)' },
        { key: 'comentarios', label: 'Comentarios', type: 'text', emoji: '📝', askMessage: '¿Algún comentario adicional? (decoración especial, pastel, etc.)' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'Sentados', 'Completada', 'No Show', 'Cancelada'], default: 'Pendiente' },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  for (const table of tables) {
    await upsert(tablesDb, table);
    console.log(`✅ Tabla: ${table.name} ${table.icon}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. AGENTE
  // ─────────────────────────────────────────────────────────────
  const agentsDb = await connectDB(`chatbot_agents_${WORKSPACE_ID}`);
  
  const agent = {
    _id: `agent_${WORKSPACE_ID}_carlos`,
    type: 'agent',
    workspaceId: WORKSPACE_ID,
    name: 'Carlos',
    avatar: '👨‍🍳',
    description: 'Maître virtual del restaurante La Casona',
    role: 'Maître y gestor de reservas',
    personality: 'Elegante, conocedor de gastronomía, atento a los detalles',
    welcomeMessage: '¡Bienvenido a La Casona! 🍽️ Soy Carlos, tu maître virtual. ¿En qué puedo ayudarte hoy? Puedo asistirte con reservas, información del menú o recomendaciones especiales.',
    aiModel: 'gpt-4o-mini',
    tables: tables.map(t => t._id),
    flows: [`flow_${WORKSPACE_ID}_reserva`, `flow_${WORKSPACE_ID}_menu`, `flow_${WORKSPACE_ID}_disponibilidad`],
    systemPrompt: `Eres Carlos, el maître virtual del restaurante La Casona en Bogotá.

PERSONALIDAD:
- Elegante pero cercano
- Conocedor de gastronomía colombiana
- Atento a ocasiones especiales
- Proactivo en ofrecer recomendaciones

INFORMACIÓN DEL RESTAURANTE:
- Ubicación: Zona G, Bogotá
- Especialidad: Cocina colombiana contemporánea
- Horario: Lunes a Domingo, almuerzo y cena
- Capacidad: 80 personas

PLATOS DESTACADOS:
- Bandeja Paisa Gourmet
- Ajiaco Bogotano
- Sancocho de Gallina
- Lomo al Trapo
- Postre: Tres Leches de Arequipe

CUANDO HAGAS RESERVAS:
1. Siempre pregunta fecha, hora y número de personas
2. Ofrece ubicación (Terraza para romántico, Salón Privado para negocios)
3. Pregunta si es ocasión especial
4. Menciona que pueden añadir decoración o pastel`,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  await upsert(agentsDb, agent);
  console.log(`✅ Agente: ${agent.name} ${agent.avatar}`);

  // ─────────────────────────────────────────────────────────────
  // 5. FLUJOS
  // ─────────────────────────────────────────────────────────────
  const flowsDb = await connectDB(`chatbot_flows_${WORKSPACE_ID}`);

  const flows = [
    {
      _id: `flow_${WORKSPACE_ID}_reserva`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Flujo de Reservación',
      description: 'Proceso completo para hacer una reserva',
      trigger: {
        type: 'intent',
        patterns: ['reservar', 'reserva', 'mesa', 'quiero una mesa', 'hacer reservación', 'agendar'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Inicio Reserva',
            triggerType: 'intent',
            patterns: ['reservar', 'reserva', 'mesa', 'quiero una mesa'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Bienvenida',
            message: '¡Excelente elección! 🍽️ Con gusto te ayudo con tu reserva en La Casona.\n\n¿Para qué fecha te gustaría reservar?',
          },
        },
        {
          id: 'node_3',
          type: 'action',
          position: { x: 100, y: 300 },
          data: {
            label: 'Recolectar Datos',
            actionType: 'collect_fields',
            tableId: `table_${WORKSPACE_ID}_reservas`,
            fields: ['fecha', 'hora', 'personas', 'cliente'],
          },
        },
        {
          id: 'node_4',
          type: 'condition',
          position: { x: 100, y: 400 },
          data: {
            label: 'Verificar Disponibilidad',
            condition: 'availability_check',
            tableId: `table_${WORKSPACE_ID}_reservas`,
          },
        },
        {
          id: 'node_5a',
          type: 'action',
          position: { x: 0, y: 500 },
          data: {
            label: 'Crear Reserva',
            actionType: 'create_record',
            tableId: `table_${WORKSPACE_ID}_reservas`,
          },
        },
        {
          id: 'node_5b',
          type: 'response',
          position: { x: 200, y: 500 },
          data: {
            label: 'Sin Disponibilidad',
            message: 'Lo siento, no tenemos disponibilidad para esa fecha/hora. ¿Te gustaría probar otro horario?',
          },
        },
        {
          id: 'node_6',
          type: 'response',
          position: { x: 0, y: 600 },
          data: {
            label: 'Confirmación',
            message: '✅ ¡Tu reserva ha sido confirmada!\n\n📅 {{fecha:date}}\n🕐 {{hora:time}}\n👥 {{personas}} personas\n👤 A nombre de: {{cliente.nombre}}\n\n¿Es una ocasión especial? Podemos preparar algo especial para ti 🎉',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3', source: 'node_3', target: 'node_4' },
        { id: 'e4a', source: 'node_4', sourceHandle: 'yes', target: 'node_5a', label: 'disponible' },
        { id: 'e4b', source: 'node_4', sourceHandle: 'no', target: 'node_5b', label: 'no disponible' },
        { id: 'e5', source: 'node_5a', target: 'node_6' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_menu`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Consulta de Menú',
      description: 'Mostrar información del menú y recomendaciones',
      trigger: {
        type: 'intent',
        patterns: ['menú', 'menu', 'carta', 'qué tienen', 'platos', 'comer', 'especialidad'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Consulta Menú',
            triggerType: 'intent',
            patterns: ['menú', 'carta', 'platos'],
          },
        },
        {
          id: 'node_2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: {
            label: 'Buscar Recomendados',
            actionType: 'query',
            tableId: `table_${WORKSPACE_ID}_menu`,
            filters: { recomendado: true, disponible: true },
          },
        },
        {
          id: 'node_3',
          type: 'response',
          position: { x: 100, y: 300 },
          data: {
            label: 'Mostrar Menú',
            message: '📜 **Nuestro Menú del Día**\n\n🌟 **Recomendaciones del Chef:**\n{{#each results}}\n• **{{nombre}}** - {{precio:currency}}\n  _{{descripcion}}_\n{{/each}}\n\n¿Te gustaría ver alguna categoría específica? (Entradas, Platos Fuertes, Postres, Vinos)',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_disponibilidad`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Consulta de Disponibilidad',
      description: 'Verificar mesas disponibles sin crear reserva',
      trigger: {
        type: 'intent',
        patterns: ['disponibilidad', 'hay mesa', 'están llenos', 'hay cupo', 'hay espacio'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Consulta Disponibilidad',
            triggerType: 'intent',
            patterns: ['disponibilidad', 'hay mesa'],
          },
        },
        {
          id: 'node_2',
          type: 'availability',
          position: { x: 100, y: 200 },
          data: {
            label: 'Verificar Slots',
            tableId: `table_${WORKSPACE_ID}_reservas`,
            dateField: 'fecha',
            timeField: 'hora',
          },
        },
        {
          id: 'node_3',
          type: 'response',
          position: { x: 100, y: 300 },
          data: {
            label: 'Mostrar Disponibilidad',
            message: '📅 **Disponibilidad para {{fecha:date}}:**\n\n{{#each slots}}\n🕐 {{hora}} - {{estado}}\n{{/each}}\n\n¿Te gustaría reservar alguno de estos horarios?',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', sourceHandle: 'available', target: 'node_3' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_cancelar`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Cancelar Reserva',
      description: 'Proceso para cancelar una reservación existente',
      trigger: {
        type: 'intent',
        patterns: ['cancelar', 'anular', 'eliminar reserva', 'ya no puedo ir'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Solicitud Cancelación',
            triggerType: 'intent',
            patterns: ['cancelar', 'anular reserva'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Solicitar Datos',
            message: 'Lamento que no puedas asistir 😔\n\nPara cancelar tu reserva, necesito el nombre con el que la hiciste y la fecha.',
          },
        },
        {
          id: 'node_3',
          type: 'action',
          position: { x: 100, y: 300 },
          data: {
            label: 'Buscar Reserva',
            actionType: 'search',
            tableId: `table_${WORKSPACE_ID}_reservas`,
            searchFields: ['cliente.nombre', 'fecha'],
          },
        },
        {
          id: 'node_4',
          type: 'condition',
          position: { x: 100, y: 400 },
          data: {
            label: 'Verificar Reserva',
            condition: 'record_found',
          },
        },
        {
          id: 'node_5a',
          type: 'action',
          position: { x: 0, y: 500 },
          data: {
            label: 'Confirmar Cancelación',
            actionType: 'update',
            tableId: `table_${WORKSPACE_ID}_reservas`,
            updates: { estado: 'Cancelada' },
            requireConfirmation: true,
          },
        },
        {
          id: 'node_5b',
          type: 'response',
          position: { x: 200, y: 500 },
          data: {
            label: 'No Encontrada',
            message: 'No encontré una reserva con esos datos. ¿Podrías verificar el nombre y la fecha?',
          },
        },
        {
          id: 'node_6',
          type: 'response',
          position: { x: 0, y: 600 },
          data: {
            label: 'Confirmación',
            message: '✅ Tu reserva ha sido cancelada.\n\nEsperamos verte pronto en La Casona. ¡Hasta luego! 👋',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3', source: 'node_3', target: 'node_4' },
        { id: 'e4a', source: 'node_4', sourceHandle: 'yes', target: 'node_5a', label: 'encontrada' },
        { id: 'e4b', source: 'node_4', sourceHandle: 'no', target: 'node_5b', label: 'no encontrada' },
        { id: 'e5', source: 'node_5a', target: 'node_6' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const flow of flows) {
    await upsert(flowsDb, flow);
    console.log(`✅ Flujo: ${flow.name}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. DATOS DE EJEMPLO
  // ─────────────────────────────────────────────────────────────
  const dataDb = await connectDB(`chatbot_tabledata_${WORKSPACE_ID}`);
  
  // Crear índices
  try {
    await dataDb.createIndex({ index: { fields: ['tableId'] } });
    await dataDb.createIndex({ index: { fields: ['tableId', 'fecha', 'hora'] } });
  } catch {}

  // Mesas
  const mesas = [
    { _id: `data_mesa_1`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 1, capacidad: 2, ubicacion: 'Salón Principal', descripcion: 'Mesa íntima junto a la ventana', disponible: true },
    { _id: `data_mesa_2`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 2, capacidad: 2, ubicacion: 'Salón Principal', descripcion: 'Mesa para parejas', disponible: true },
    { _id: `data_mesa_3`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 3, capacidad: 4, ubicacion: 'Salón Principal', descripcion: 'Mesa familiar', disponible: true },
    { _id: `data_mesa_4`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 4, capacidad: 4, ubicacion: 'Salón Principal', descripcion: 'Mesa central', disponible: true },
    { _id: `data_mesa_5`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 5, capacidad: 6, ubicacion: 'Terraza', descripcion: 'Mesa grande con vista', disponible: true },
    { _id: `data_mesa_6`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 6, capacidad: 4, ubicacion: 'Terraza', descripcion: 'Mesa al aire libre', disponible: true },
    { _id: `data_mesa_7`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 7, capacidad: 8, ubicacion: 'Terraza', descripcion: 'Mesa grande para grupos', disponible: true },
    { _id: `data_mesa_8`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 8, capacidad: 10, ubicacion: 'Salón Privado', descripcion: 'Salón privado para eventos', disponible: true },
    { _id: `data_mesa_9`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 9, capacidad: 20, ubicacion: 'Salón Privado', descripcion: 'Gran salón para celebraciones', disponible: true },
    { _id: `data_mesa_10`, tableId: `table_${WORKSPACE_ID}_mesas`, numero: 10, capacidad: 4, ubicacion: 'Barra', descripcion: 'Barra con vista a la cocina', disponible: true },
  ];

  // Menú
  const menu = [
    // Entradas
    { _id: `data_menu_1`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Empanadas de Pipián', descripcion: 'Tradicionales empanadas caucanas con ají de maní', categoria: 'Entradas', precio: 18000, vegetariano: true, recomendado: true, disponible: true },
    { _id: `data_menu_2`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Patacones con Hogao', descripcion: 'Plátano verde frito con salsa criolla', categoria: 'Entradas', precio: 15000, vegetariano: true, recomendado: false, disponible: true },
    { _id: `data_menu_3`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Chicharrón de Róbalo', descripcion: 'Trozos crujientes con limón y ají', categoria: 'Entradas', precio: 28000, vegetariano: false, recomendado: true, disponible: true },
    
    // Sopas
    { _id: `data_menu_4`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Ajiaco Bogotano', descripcion: 'Sopa tradicional con pollo, papas y guascas', categoria: 'Sopas', precio: 32000, vegetariano: false, recomendado: true, disponible: true },
    { _id: `data_menu_5`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Sancocho de Gallina', descripcion: 'Caldo campesino con gallina criolla', categoria: 'Sopas', precio: 35000, vegetariano: false, recomendado: true, disponible: true },
    
    // Platos Fuertes
    { _id: `data_menu_6`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Bandeja Paisa Gourmet', descripcion: 'Nuestra versión del clásico con ingredientes premium', categoria: 'Platos Fuertes', precio: 48000, vegetariano: false, recomendado: true, disponible: true },
    { _id: `data_menu_7`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Lomo al Trapo', descripcion: 'Lomo de res envuelto en sal gruesa, término a elegir', categoria: 'Platos Fuertes', precio: 58000, vegetariano: false, recomendado: true, disponible: true },
    { _id: `data_menu_8`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Trucha al Ajillo', descripcion: 'Trucha de Tota con ajo y hierbas', categoria: 'Platos Fuertes', precio: 42000, vegetariano: false, recomendado: false, disponible: true },
    { _id: `data_menu_9`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Lechona Tolimense', descripcion: 'Cerdo relleno con arroz y arvejas (solo fines de semana)', categoria: 'Platos Fuertes', precio: 38000, vegetariano: false, recomendado: false, disponible: true },
    { _id: `data_menu_10`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Vegetariano de la Casa', descripcion: 'Plato con vegetales de temporada y quinoa', categoria: 'Platos Fuertes', precio: 35000, vegetariano: true, recomendado: false, disponible: true },
    
    // Postres
    { _id: `data_menu_11`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Tres Leches de Arequipe', descripcion: 'Nuestro postre insignia con dulce de leche', categoria: 'Postres', precio: 18000, vegetariano: true, recomendado: true, disponible: true },
    { _id: `data_menu_12`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Cuajada con Melao', descripcion: 'Queso fresco con miel de panela', categoria: 'Postres', precio: 14000, vegetariano: true, recomendado: false, disponible: true },
    { _id: `data_menu_13`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Postre de Natas', descripcion: 'Tradicional postre bogotano', categoria: 'Postres', precio: 16000, vegetariano: true, recomendado: false, disponible: true },
    
    // Bebidas
    { _id: `data_menu_14`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Limonada de Coco', descripcion: 'Refrescante limonada con leche de coco', categoria: 'Bebidas', precio: 12000, vegetariano: true, recomendado: true, disponible: true },
    { _id: `data_menu_15`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Jugo de Lulo', descripcion: 'Jugo natural de lulo', categoria: 'Bebidas', precio: 10000, vegetariano: true, recomendado: false, disponible: true },
    
    // Vinos
    { _id: `data_menu_16`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Vino Tinto Reserva', descripcion: 'Cabernet Sauvignon, Valle del Maule', categoria: 'Vinos', precio: 85000, vegetariano: true, recomendado: true, disponible: true },
    { _id: `data_menu_17`, tableId: `table_${WORKSPACE_ID}_menu`, nombre: 'Vino Blanco Casa Silva', descripcion: 'Sauvignon Blanc, ideal con mariscos', categoria: 'Vinos', precio: 75000, vegetariano: true, recomendado: false, disponible: true },
  ];

  // Clientes de ejemplo
  const clientes = [
    { _id: `data_cliente_1`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'María González', telefono: '3001234567', email: 'maria.gonzalez@email.com', alergias: 'Mariscos', preferencias: 'Mesa junto a la ventana', visitas: 5, vip: true },
    { _id: `data_cliente_2`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'Carlos Rodríguez', telefono: '3009876543', email: 'carlos.r@empresa.com', alergias: null, preferencias: 'Zona tranquila para negocios', visitas: 8, vip: true },
    { _id: `data_cliente_3`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'Ana Martínez', telefono: '3005551234', email: 'ana.m@gmail.com', alergias: 'Gluten', preferencias: 'Terraza', visitas: 3, vip: false },
  ];

  const allData = [...mesas, ...menu, ...clientes];
  
  for (const row of allData) {
    row.createdAt = new Date().toISOString();
    await upsert(dataDb, row);
  }
  
  console.log(`✅ Datos: ${mesas.length} mesas, ${menu.length} platos, ${clientes.length} clientes`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ SEED RESTAURANTE COMPLETADO');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
