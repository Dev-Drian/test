/**
 * Seed Salón de Belleza Bella Vida
 * 
 * Workspace completo de salón de belleza con:
 * - Configuración Premium
 * - Agente de citas
 * - Tablas: Clientes, Servicios, Estilistas, Productos, Citas
 * - Flujos dinámicos para citas, consultas y productos
 * - Datos de ejemplo realistas
 */

import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const couch = nano(COUCHDB_URL);
const WORKSPACE_ID = 'ws_salon_bellavida';

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
  console.log('\n💇‍♀️ ════════════════════════════════════════════════════════');
  console.log('   SEED: Salón de Belleza Bella Vida (Premium)');
  console.log('════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────
  // 1. WORKSPACE
  // ─────────────────────────────────────────────────────────────
  const workspacesDb = await connectDB('chatbot_workspaces');
  
  await upsert(workspacesDb, {
    _id: WORKSPACE_ID,
    type: 'workspace',
    name: 'Salón Bella Vida',
    description: 'Tu espacio de belleza y bienestar',
    businessType: 'beauty_salon',
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
      name: 'Salón de Belleza Bella Vida',
      type: 'beauty_salon',
      description: 'Expertos en colorimetría, cortes y tratamientos capilares',
      phone: '+57 300 555 8899',
      email: 'citas@bellavida.com.co',
      address: 'Calle 85 #15-20, Local 102, Bogotá',
      website: 'https://salonbellavida.com.co',
      instagram: '@salonbellavida',
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
      monday: { start: '09:00', end: '19:00', enabled: true },
      tuesday: { start: '09:00', end: '19:00', enabled: true },
      wednesday: { start: '09:00', end: '19:00', enabled: true },
      thursday: { start: '09:00', end: '20:00', enabled: true },
      friday: { start: '09:00', end: '20:00', enabled: true },
      saturday: { start: '08:00', end: '18:00', enabled: true },
      sunday: { start: '00:00', end: '00:00', enabled: false },
    },
    appointments: {
      enabled: true,
      duration: 60, // Por defecto 1 hora, pero depende del servicio
      slotInterval: 30,
      maxPerStylish: 1, // Una cita por estilista a la vez
      requireConfirmation: true,
      allowCancellation: true,
      cancellationHours: 4,
      reminderHours: 24,
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
      description: 'Base de datos de clientas',
      icon: '👩',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👩', askMessage: '¿Cuál es tu nombre?', confirmLabel: 'Cliente', priority: 1 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', askMessage: '¿Cuál es tu número de teléfono?', priority: 2 },
        { key: 'email', label: 'Email', type: 'email', emoji: '📧' },
        { key: 'tipoCabello', label: 'Tipo de Cabello', type: 'select', options: ['Liso', 'Ondulado', 'Rizado', 'Afro'], emoji: '💇‍♀️' },
        { key: 'colorActual', label: 'Color Actual', type: 'text', emoji: '🎨', askMessage: '¿Cuál es el color actual de tu cabello?' },
        { key: 'alergias', label: 'Alergias', type: 'text', emoji: '⚠️', askMessage: '¿Tienes alguna alergia a productos de belleza?' },
        { key: 'estilistaPref', label: 'Estilista Preferida', type: 'relation', relationTo: `table_${WORKSPACE_ID}_estilistas` },
        { key: 'visitas', label: 'Visitas', type: 'number', default: 1 },
        { key: 'puntos', label: 'Puntos Fidelidad', type: 'number', default: 0 },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_estilistas`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Estilistas',
      description: 'Equipo de profesionales',
      icon: '✂️',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'especialidad', label: 'Especialidad', type: 'select', options: ['Colorimetría', 'Cortes', 'Peinados', 'Tratamientos', 'Maquillaje', 'Uñas'] },
        { key: 'experiencia', label: 'Años de Experiencia', type: 'number' },
        { key: 'instagram', label: 'Instagram', type: 'text' },
        { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
        { key: 'horario', label: 'Horario', type: 'text' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_servicios`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Servicios',
      description: 'Catálogo de servicios',
      icon: '💅',
      headers: [
        { key: 'nombre', label: 'Servicio', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripción', type: 'text' },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Cabello', 'Color', 'Tratamientos', 'Uñas', 'Maquillaje', 'Spa', 'Paquetes'] },
        { key: 'duracion', label: 'Duración (min)', type: 'number', required: true },
        { key: 'precio', label: 'Precio', type: 'currency' },
        { key: 'precioDesde', label: 'Desde', type: 'currency' },
        { key: 'precioHasta', label: 'Hasta', type: 'currency' },
        { key: 'popular', label: 'Popular', type: 'boolean', default: false },
        { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_productos`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Productos',
      description: 'Productos a la venta',
      icon: '🧴',
      headers: [
        { key: 'nombre', label: 'Producto', type: 'text', required: true },
        { key: 'marca', label: 'Marca', type: 'text' },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Shampoo', 'Acondicionador', 'Tratamiento', 'Styling', 'Color', 'Accesorios'] },
        { key: 'precio', label: 'Precio', type: 'currency' },
        { key: 'stock', label: 'Stock', type: 'number' },
        { key: 'descripcion', label: 'Descripción', type: 'text' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_citas`,
      type: 'table',
      tableType: 'appointments',
      workspaceId: WORKSPACE_ID,
      name: 'Citas',
      description: 'Agenda de citas del salón',
      icon: '📅',
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'relation', relationTo: `table_${WORKSPACE_ID}_clientes`, required: true, emoji: '👩', askMessage: '¿Cuál es tu nombre?', confirmLabel: 'Cliente', priority: 1 },
        { key: 'servicio', label: 'Servicio', type: 'relation', relationTo: `table_${WORKSPACE_ID}_servicios`, required: true, emoji: '💅', askMessage: '¿Qué servicio te gustaría? (corte, tinte, manicure, etc.)', confirmLabel: 'Servicio', priority: 2 },
        { key: 'estilista', label: 'Estilista', type: 'relation', relationTo: `table_${WORKSPACE_ID}_estilistas`, emoji: '✂️', askMessage: '¿Tienes preferencia por alguna estilista?', priority: 3 },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', askMessage: '¿Para qué día te gustaría la cita?', confirmLabel: 'Fecha', priority: 4 },
        { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', askMessage: '¿A qué hora te queda bien?', confirmLabel: 'Hora', priority: 5 },
        { key: 'notas', label: 'Notas', type: 'text', emoji: '📝', askMessage: '¿Alguna nota adicional? (color específico, referencia de corte, etc.)' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Confirmada', 'En proceso', 'Completada', 'Cancelada', 'No Show'], default: 'Pendiente' },
        { key: 'duracionTotal', label: 'Duración', type: 'number' },
        { key: 'precioEstimado', label: 'Precio Estimado', type: 'currency' },
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
    _id: `agent_${WORKSPACE_ID}_sofia`,
    type: 'agent',
    workspaceId: WORKSPACE_ID,
    name: 'Sofía',
    avatar: '💇‍♀️',
    description: 'Asistente virtual de Bella Vida',
    role: 'Asesora de belleza y gestión de citas',
    personality: 'Amigable, conocedora de tendencias, empática',
    welcomeMessage: '¡Hola! ✨ Soy Sofía, tu asistente de belleza en Bella Vida. ¿En qué puedo ayudarte hoy? Puedo agendar tu cita, contarte sobre nuestros servicios o darte recomendaciones de productos.',
    aiModel: 'gpt-4o-mini',
    tables: tables.map(t => t._id),
    flows: [
      `flow_${WORKSPACE_ID}_cita`,
      `flow_${WORKSPACE_ID}_servicios`,
      `flow_${WORKSPACE_ID}_disponibilidad`,
      `flow_${WORKSPACE_ID}_reagendar`,
      `flow_${WORKSPACE_ID}_productos`,
    ],
    systemPrompt: `Eres Sofía, la asistente virtual del Salón de Belleza Bella Vida en Bogotá.

PERSONALIDAD:
- Amigable y cercana (tuteas a las clientas)
- Conocedora de tendencias de moda y belleza
- Empática y atenta a las necesidades
- Usa emojis con moderación ✨💇‍♀️💅

INFORMACIÓN DEL SALÓN:
- Ubicación: Calle 85, Bogotá (Zona Norte)
- Especialidades: Colorimetría avanzada, cortes de tendencia
- Horario: Lunes a Sábado
- Instagram: @salonbellavida

SERVICIOS DESTACADOS:
- Balayage y mechas (desde $180.000)
- Corte + Tratamiento ($65.000)
- Keratina brasileña ($250.000 - $400.000)
- Manicure/Pedicure ($25.000 - $45.000)
- Maquillaje profesional ($80.000 - $150.000)

ESTILISTAS:
- Carolina: Experta en colorimetría
- Diana: Especialista en cortes y peinados
- Valentina: Manicurista y uñas acrílicas
- Camila: Maquillaje profesional

CUANDO AGENDES CITAS:
1. Pregunta qué servicio necesita
2. Recomienda la estilista según el servicio
3. Ofrece horarios disponibles
4. Pregunta por notas especiales (referencias, color, etc.)
5. Menciona el tiempo estimado del servicio

PUNTOS DE FIDELIDAD:
- 1 punto por cada $10.000
- 100 puntos = 10% descuento`,
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
      _id: `flow_${WORKSPACE_ID}_cita`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Agendar Cita',
      description: 'Proceso completo para agendar una cita de belleza',
      trigger: {
        type: 'intent',
        patterns: ['cita', 'agendar', 'reservar', 'quiero una cita', 'necesito turno', 'appointment'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Solicitud de Cita',
            triggerType: 'intent',
            patterns: ['cita', 'agendar', 'reservar'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Bienvenida',
            message: '¡Perfecto! ✨ Me encanta ayudarte a verte increíble.\n\n¿Qué servicio te gustaría? Tenemos:\n💇‍♀️ Corte\n🎨 Color/Mechas\n💆‍♀️ Tratamientos\n💅 Manicure/Pedicure\n💄 Maquillaje',
          },
        },
        {
          id: 'node_3',
          type: 'action',
          position: { x: 100, y: 300 },
          data: {
            label: 'Recolectar Datos',
            actionType: 'collect_fields',
            tableId: `table_${WORKSPACE_ID}_citas`,
            fields: ['servicio', 'fecha', 'hora', 'cliente'],
          },
        },
        {
          id: 'node_4',
          type: 'action',
          position: { x: 100, y: 400 },
          data: {
            label: 'Sugerir Estilista',
            actionType: 'query',
            tableId: `table_${WORKSPACE_ID}_estilistas`,
            filters: { disponible: true },
            message: '¿Tienes preferencia por alguna de nuestras estilistas?\n{{#each results}}\n✂️ **{{nombre}}** - {{especialidad}}\n{{/each}}',
          },
        },
        {
          id: 'node_5',
          type: 'availability',
          position: { x: 100, y: 500 },
          data: {
            label: 'Verificar Disponibilidad',
            tableId: `table_${WORKSPACE_ID}_citas`,
            dateField: 'fecha',
            timeField: 'hora',
            estilistField: 'estilista',
          },
        },
        {
          id: 'node_6a',
          type: 'action',
          position: { x: 0, y: 600 },
          data: {
            label: 'Crear Cita',
            actionType: 'create_record',
            tableId: `table_${WORKSPACE_ID}_citas`,
          },
        },
        {
          id: 'node_6b',
          type: 'response',
          position: { x: 200, y: 600 },
          data: {
            label: 'Sin Disponibilidad',
            message: 'Ups, ese horario ya está ocupado 😔\n\nTe sugiero estos horarios disponibles:\n{{#each availableSlots}}\n🕐 {{hora}}\n{{/each}}\n\n¿Cuál prefieres?',
          },
        },
        {
          id: 'node_7',
          type: 'response',
          position: { x: 0, y: 700 },
          data: {
            label: 'Confirmación',
            message: '✅ ¡Listo! Tu cita está agendada:\n\n💅 **{{servicio.nombre}}**\n📅 {{fecha:date}}\n🕐 {{hora:time}}\n✂️ Con: {{estilista.nombre}}\n⏱️ Duración: ~{{servicio.duracion}} min\n💰 Precio estimado: {{servicio.precio:currency}}\n\nTe enviaremos un recordatorio. ¡Nos vemos! ✨',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3', source: 'node_3', target: 'node_4' },
        { id: 'e4', source: 'node_4', target: 'node_5' },
        { id: 'e5a', source: 'node_5', sourceHandle: 'available', target: 'node_6a', label: 'disponible' },
        { id: 'e5b', source: 'node_5', sourceHandle: 'busy', target: 'node_6b', label: 'no disponible' },
        { id: 'e6', source: 'node_6a', target: 'node_7' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_servicios`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Consulta de Servicios',
      description: 'Mostrar información de servicios y precios',
      trigger: {
        type: 'intent',
        patterns: ['servicios', 'precios', 'cuánto cuesta', 'qué ofrecen', 'carta', 'menú'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Consulta Servicios',
            triggerType: 'intent',
            patterns: ['servicios', 'precios'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Categorías',
            message: '¡Con gusto te cuento! ✨\n\n¿Qué categoría te interesa?\n\n💇‍♀️ **Cabello** (cortes, peinados)\n🎨 **Color** (tintes, mechas, balayage)\n💆‍♀️ **Tratamientos** (keratina, hidratación)\n💅 **Uñas** (manicure, pedicure)\n💄 **Maquillaje**\n🎁 **Paquetes** (combos especiales)',
          },
        },
        {
          id: 'node_3',
          type: 'action',
          position: { x: 100, y: 300 },
          data: {
            label: 'Buscar por Categoría',
            actionType: 'query',
            tableId: `table_${WORKSPACE_ID}_servicios`,
            filterByMessage: true,
            sortBy: 'popular',
          },
        },
        {
          id: 'node_4',
          type: 'response',
          position: { x: 100, y: 400 },
          data: {
            label: 'Mostrar Servicios',
            message: '{{categoria}} en Bella Vida:\n\n{{#each results}}\n{{#if popular}}⭐{{/if}} **{{nombre}}**\n   _{{descripcion}}_\n   ⏱️ {{duracion}} min | 💰 {{#if precioDesde}}Desde {{precioDesde:currency}}{{else}}{{precio:currency}}{{/if}}\n\n{{/each}}\n\n¿Te gustaría agendar alguno? 😊',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3', source: 'node_3', target: 'node_4' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_disponibilidad`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Consulta Disponibilidad',
      description: 'Ver horarios disponibles',
      trigger: {
        type: 'intent',
        patterns: ['disponibilidad', 'horarios libres', 'hay cupo', 'hay citas'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Consulta Disponibilidad',
            triggerType: 'intent',
            patterns: ['disponibilidad', 'horarios'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Solicitar Fecha',
            message: '¿Para qué día te gustaría ver disponibilidad? 📅',
          },
        },
        {
          id: 'node_3',
          type: 'availability',
          position: { x: 100, y: 300 },
          data: {
            label: 'Verificar Slots',
            tableId: `table_${WORKSPACE_ID}_citas`,
            dateField: 'fecha',
            timeField: 'hora',
            showByStylish: true,
          },
        },
        {
          id: 'node_4',
          type: 'response',
          position: { x: 100, y: 400 },
          data: {
            label: 'Mostrar Disponibilidad',
            message: '📅 **Disponibilidad para {{fecha:date}}:**\n\n{{#each stylists}}\n✂️ **{{nombre}}** ({{especialidad}})\n{{#each slots}}\n   🕐 {{hora}} - {{estado}}\n{{/each}}\n\n{{/each}}\n\n¿Te gustaría agendar algún horario? 😊',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3', source: 'node_3', sourceHandle: 'available', target: 'node_4' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_reagendar`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Reagendar/Cancelar Cita',
      description: 'Modificar o cancelar una cita existente',
      trigger: {
        type: 'intent',
        patterns: ['reagendar', 'cambiar cita', 'cancelar', 'mover cita', 'no puedo ir'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Solicitud Cambio',
            triggerType: 'intent',
            patterns: ['reagendar', 'cancelar', 'cambiar cita'],
          },
        },
        {
          id: 'node_2',
          type: 'response',
          position: { x: 100, y: 200 },
          data: {
            label: 'Preguntar Acción',
            message: 'Entiendo, ¿qué te gustaría hacer?\n\n1️⃣ **Reagendar** mi cita para otro día/hora\n2️⃣ **Cancelar** mi cita',
          },
        },
        {
          id: 'node_3',
          type: 'condition',
          position: { x: 100, y: 300 },
          data: {
            label: 'Tipo de Acción',
            conditions: ['reagendar', 'cancelar'],
          },
        },
        {
          id: 'node_4a',
          type: 'action',
          position: { x: 0, y: 400 },
          data: {
            label: 'Buscar Cita (Reagendar)',
            actionType: 'search',
            tableId: `table_${WORKSPACE_ID}_citas`,
            searchFields: ['cliente.nombre', 'cliente.telefono'],
          },
        },
        {
          id: 'node_4b',
          type: 'action',
          position: { x: 200, y: 400 },
          data: {
            label: 'Buscar Cita (Cancelar)',
            actionType: 'search',
            tableId: `table_${WORKSPACE_ID}_citas`,
            searchFields: ['cliente.nombre', 'cliente.telefono'],
          },
        },
        {
          id: 'node_5a',
          type: 'action',
          position: { x: 0, y: 500 },
          data: {
            label: 'Actualizar Fecha/Hora',
            actionType: 'update',
            tableId: `table_${WORKSPACE_ID}_citas`,
            fields: ['fecha', 'hora'],
            requireConfirmation: true,
          },
        },
        {
          id: 'node_5b',
          type: 'action',
          position: { x: 200, y: 500 },
          data: {
            label: 'Cancelar Cita',
            actionType: 'update',
            tableId: `table_${WORKSPACE_ID}_citas`,
            updates: { estado: 'Cancelada' },
            requireConfirmation: true,
          },
        },
        {
          id: 'node_6a',
          type: 'response',
          position: { x: 0, y: 600 },
          data: {
            label: 'Confirmar Reagendamiento',
            message: '✅ ¡Listo! Tu cita ha sido reagendada:\n\n📅 Nueva fecha: {{fecha:date}}\n🕐 Nueva hora: {{hora:time}}\n\n¡Te esperamos! ✨',
          },
        },
        {
          id: 'node_6b',
          type: 'response',
          position: { x: 200, y: 600 },
          data: {
            label: 'Confirmar Cancelación',
            message: 'Tu cita ha sido cancelada 😔\n\nEsperamos verte pronto. ¡Siempre serás bienvenida en Bella Vida! 💕',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_1', target: 'node_2' },
        { id: 'e2', source: 'node_2', target: 'node_3' },
        { id: 'e3a', source: 'node_3', sourceHandle: 'yes', target: 'node_4a', label: 'reagendar' },
        { id: 'e3b', source: 'node_3', sourceHandle: 'no', target: 'node_4b', label: 'cancelar' },
        { id: 'e4a', source: 'node_4a', target: 'node_5a' },
        { id: 'e4b', source: 'node_4b', target: 'node_5b' },
        { id: 'e5a', source: 'node_5a', target: 'node_6a' },
        { id: 'e5b', source: 'node_5b', target: 'node_6b' },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: `flow_${WORKSPACE_ID}_productos`,
      type: 'flow',
      workspaceId: WORKSPACE_ID,
      agentId: agent._id,
      name: 'Consulta de Productos',
      description: 'Mostrar productos disponibles para venta',
      trigger: {
        type: 'intent',
        patterns: ['productos', 'shampoo', 'comprar', 'tratamiento para casa', 'qué venden'],
      },
      nodes: [
        {
          id: 'node_1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Consulta Productos',
            triggerType: 'intent',
            patterns: ['productos', 'shampoo', 'comprar'],
          },
        },
        {
          id: 'node_2',
          type: 'action',
          position: { x: 100, y: 200 },
          data: {
            label: 'Buscar Productos',
            actionType: 'query',
            tableId: `table_${WORKSPACE_ID}_productos`,
            filters: { stock: { $gt: 0 } },
          },
        },
        {
          id: 'node_3',
          type: 'response',
          position: { x: 100, y: 300 },
          data: {
            label: 'Mostrar Productos',
            message: '🧴 **Productos disponibles en Bella Vida:**\n\n{{#each results}}\n• **{{nombre}}** - _{{marca}}_\n   {{descripcion}}\n   💰 {{precio:currency}}\n\n{{/each}}\n\n¿Te interesa alguno? Puedes comprarlo en tu próxima visita o apartarlo ahora 😊',
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
    await dataDb.createIndex({ index: { fields: ['tableId', 'estilista', 'fecha'] } });
  } catch {}

  // Estilistas
  const estilistas = [
    { _id: `data_est_1`, tableId: `table_${WORKSPACE_ID}_estilistas`, nombre: 'Carolina Torres', especialidad: 'Colorimetría', experiencia: 8, instagram: '@caro.color', disponible: true, horario: 'Lunes a Sábado 9am-6pm' },
    { _id: `data_est_2`, tableId: `table_${WORKSPACE_ID}_estilistas`, nombre: 'Diana Ruiz', especialidad: 'Cortes', experiencia: 6, instagram: '@diana.cuts', disponible: true, horario: 'Martes a Sábado 10am-7pm' },
    { _id: `data_est_3`, tableId: `table_${WORKSPACE_ID}_estilistas`, nombre: 'Valentina Gómez', especialidad: 'Uñas', experiencia: 4, instagram: '@vale.nails', disponible: true, horario: 'Lunes a Viernes 9am-6pm' },
    { _id: `data_est_4`, tableId: `table_${WORKSPACE_ID}_estilistas`, nombre: 'Camila Vargas', especialidad: 'Maquillaje', experiencia: 5, instagram: '@cami.makeup', disponible: true, horario: 'Miércoles a Domingo 11am-8pm' },
  ];

  // Servicios
  const servicios = [
    // Cabello
    { _id: `data_srv_1`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Corte Dama', descripcion: 'Corte personalizado según tu rostro y estilo', categoria: 'Cabello', duracion: 45, precio: 45000, popular: true, disponible: true },
    { _id: `data_srv_2`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Corte + Lavado', descripcion: 'Incluye masaje capilar', categoria: 'Cabello', duracion: 60, precio: 55000, popular: true, disponible: true },
    { _id: `data_srv_3`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Peinado Evento', descripcion: 'Peinado elaborado para ocasiones especiales', categoria: 'Cabello', duracion: 90, precio: 80000, popular: false, disponible: true },
    
    // Color
    { _id: `data_srv_4`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Tinte Raíz', descripcion: 'Retoque de raíz con tu color', categoria: 'Color', duracion: 90, precio: 85000, popular: false, disponible: true },
    { _id: `data_srv_5`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Tinte Completo', descripcion: 'Color en todo el cabello', categoria: 'Color', duracion: 120, precioDesde: 120000, precioHasta: 180000, popular: true, disponible: true },
    { _id: `data_srv_6`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Mechas/Rayitos', descripcion: 'Iluminaciones naturales', categoria: 'Color', duracion: 150, precioDesde: 150000, precioHasta: 250000, popular: true, disponible: true },
    { _id: `data_srv_7`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Balayage', descripcion: 'Técnica de barrido para efecto degradado', categoria: 'Color', duracion: 180, precioDesde: 200000, precioHasta: 350000, popular: true, disponible: true },
    { _id: `data_srv_8`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Decoloración', descripcion: 'Proceso de decoloración profesional', categoria: 'Color', duracion: 120, precioDesde: 150000, precioHasta: 280000, popular: false, disponible: true },
    
    // Tratamientos
    { _id: `data_srv_9`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Keratina Brasileña', descripcion: 'Alisado y nutrición profunda - dura 4 meses', categoria: 'Tratamientos', duracion: 180, precioDesde: 250000, precioHasta: 400000, popular: true, disponible: true },
    { _id: `data_srv_10`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Botox Capilar', descripcion: 'Hidratación intensiva sin alisar', categoria: 'Tratamientos', duracion: 90, precio: 120000, popular: true, disponible: true },
    { _id: `data_srv_11`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Hidratación Profunda', descripcion: 'Tratamiento nutritivo con ampolla', categoria: 'Tratamientos', duracion: 45, precio: 45000, popular: false, disponible: true },
    
    // Uñas
    { _id: `data_srv_12`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Manicure Tradicional', descripcion: 'Limpieza, forma y esmalte', categoria: 'Uñas', duracion: 40, precio: 25000, popular: true, disponible: true },
    { _id: `data_srv_13`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Manicure Semipermanente', descripcion: 'Esmalte en gel, dura 3 semanas', categoria: 'Uñas', duracion: 60, precio: 40000, popular: true, disponible: true },
    { _id: `data_srv_14`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Uñas Acrílicas', descripcion: 'Extensiones con acrílico', categoria: 'Uñas', duracion: 120, precio: 80000, popular: false, disponible: true },
    { _id: `data_srv_15`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Pedicure Spa', descripcion: 'Tratamiento completo de pies', categoria: 'Uñas', duracion: 60, precio: 45000, popular: true, disponible: true },
    
    // Maquillaje
    { _id: `data_srv_16`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Maquillaje Social', descripcion: 'Para eventos, fiestas, reuniones', categoria: 'Maquillaje', duracion: 60, precio: 80000, popular: true, disponible: true },
    { _id: `data_srv_17`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Maquillaje Novia', descripcion: 'Incluye prueba + día de boda', categoria: 'Maquillaje', duracion: 90, precio: 250000, popular: false, disponible: true },
    { _id: `data_srv_18`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Clase de Automaquillaje', descripcion: 'Aprende a maquillarte sola', categoria: 'Maquillaje', duracion: 120, precio: 150000, popular: false, disponible: true },
    
    // Paquetes
    { _id: `data_srv_19`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Paquete Novia Completo', descripcion: 'Peinado + Maquillaje + Manicure', categoria: 'Paquetes', duracion: 240, precio: 380000, popular: true, disponible: true },
    { _id: `data_srv_20`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Día de Spa', descripcion: 'Mani + Pedi + Facial + Masaje', categoria: 'Paquetes', duracion: 180, precio: 180000, popular: true, disponible: true },
    { _id: `data_srv_21`, tableId: `table_${WORKSPACE_ID}_servicios`, nombre: 'Corte + Tratamiento', descripcion: 'Corte + Hidratación profunda', categoria: 'Paquetes', duracion: 90, precio: 65000, popular: true, disponible: true },
  ];

  // Productos
  const productos = [
    { _id: `data_prod_1`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Shampoo Sin Sulfatos', marca: 'Olaplex', categoria: 'Shampoo', precio: 95000, stock: 15, descripcion: 'Ideal para cabello teñido' },
    { _id: `data_prod_2`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Acondicionador Reparador', marca: 'Olaplex', categoria: 'Acondicionador', precio: 98000, stock: 12, descripcion: 'Repara enlaces rotos' },
    { _id: `data_prod_3`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Mascarilla Hidratante', marca: 'Moroccanoil', categoria: 'Tratamiento', precio: 120000, stock: 8, descripcion: 'Hidratación intensa con argán' },
    { _id: `data_prod_4`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Aceite de Argán', marca: 'Moroccanoil', categoria: 'Tratamiento', precio: 85000, stock: 20, descripcion: 'Brillo y control del frizz' },
    { _id: `data_prod_5`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Protector Térmico', marca: 'GHD', categoria: 'Styling', precio: 75000, stock: 18, descripcion: 'Protege hasta 230°C' },
    { _id: `data_prod_6`, tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Spray Texturizador', marca: 'Schwarzkopf', categoria: 'Styling', precio: 55000, stock: 14, descripcion: 'Para ondas playeras' },
  ];

  // Clientes
  const clientes = [
    { _id: `data_cli_1`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'Laura Martínez', telefono: '3001112233', email: 'laura.m@gmail.com', tipoCabello: 'Ondulado', colorActual: 'Castaño oscuro', alergias: null, visitas: 12, puntos: 450, estilistaPref: 'data_est_1' },
    { _id: `data_cli_2`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'Mónica Restrepo', telefono: '3004445566', email: 'monica.r@outlook.com', tipoCabello: 'Liso', colorActual: 'Rubio', alergias: 'Amoniaco', visitas: 8, puntos: 280, estilistaPref: 'data_est_1' },
    { _id: `data_cli_3`, tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'Andrea Ospina', telefono: '3007778899', email: null, tipoCabello: 'Rizado', colorActual: 'Negro', alergias: null, visitas: 5, puntos: 150, estilistaPref: 'data_est_2' },
  ];

  const allData = [...estilistas, ...servicios, ...productos, ...clientes];
  
  for (const row of allData) {
    row.createdAt = new Date().toISOString();
    await upsert(dataDb, row);
  }
  
  console.log(`✅ Datos: ${estilistas.length} estilistas, ${servicios.length} servicios, ${productos.length} productos, ${clientes.length} clientes`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ SEED SALÓN DE BELLEZA COMPLETADO');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
