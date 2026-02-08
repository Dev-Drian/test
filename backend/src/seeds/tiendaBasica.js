/**
 * Seed Tienda Básica - PLAN BÁSICO (sin flujos)
 * 
 * Workspace simple para demostrar diferencias entre planes:
 * - Plan: basic (limitado)
 * - Sin flujos
 * - Solo operaciones CREATE y READ
 * - Sin notificaciones avanzadas
 */

import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const couch = nano(COUCHDB_URL);
const WORKSPACE_ID = 'ws_tienda_basica';

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
  console.log('\n🏪 ════════════════════════════════════════════════════════');
  console.log('   SEED: Tienda El Ahorro (Plan BÁSICO - Sin Flujos)');
  console.log('════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────
  // 1. WORKSPACE
  // ─────────────────────────────────────────────────────────────
  const workspacesDb = await connectDB('chatbot_workspaces');
  
  await upsert(workspacesDb, {
    _id: WORKSPACE_ID,
    type: 'workspace',
    name: 'Tienda El Ahorro',
    description: 'Tienda de abarrotes con plan básico',
    businessType: 'retail',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('✅ Workspace creado');

  // ─────────────────────────────────────────────────────────────
  // 2. CONFIGURACIÓN - PLAN BÁSICO
  // ─────────────────────────────────────────────────────────────
  const configDb = await connectDB(`chatbot_${WORKSPACE_ID}`);
  
  await upsert(configDb, {
    _id: `config_${WORKSPACE_ID}`,
    type: 'workspace_config',
    workspaceId: WORKSPACE_ID,
    plan: 'basic', // ← PLAN BÁSICO
    planLimits: {
      maxTables: 3,
      maxAgents: 1,
      maxFlows: 0, // Sin flujos
      maxRecordsPerTable: 100,
      actions: ['create', 'read'], // Solo crear y leer
      features: {
        flows: false,
        availability: false,
        notifications: false,
        customTemplates: false,
        aiAssignment: false,
      },
    },
    business: {
      name: 'Tienda El Ahorro',
      type: 'retail',
      description: 'Tu tienda de confianza',
      phone: '+57 311 222 3344',
      address: 'Cra 10 #20-30, Local 5',
    },
    notifications: {
      enabled: false, // Deshabilitado en básico
    },
    businessHours: {
      monday: { start: '08:00', end: '20:00', enabled: true },
      tuesday: { start: '08:00', end: '20:00', enabled: true },
      wednesday: { start: '08:00', end: '20:00', enabled: true },
      thursday: { start: '08:00', end: '20:00', enabled: true },
      friday: { start: '08:00', end: '20:00', enabled: true },
      saturday: { start: '08:00', end: '18:00', enabled: true },
      sunday: { start: '09:00', end: '14:00', enabled: true },
    },
    ai: {
      model: 'gpt-4o-mini',
      temperature: 0.7,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('✅ Configuración creada (Plan BÁSICO)');

  // ─────────────────────────────────────────────────────────────
  // 3. TABLAS (máximo 3 en plan básico)
  // ─────────────────────────────────────────────────────────────
  const tablesDb = await connectDB(`chatbot_tables_${WORKSPACE_ID}`);
  
  const tables = [
    {
      _id: `table_${WORKSPACE_ID}_productos`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Productos',
      description: 'Inventario de productos',
      icon: '📦',
      headers: [
        { key: 'nombre', label: 'Producto', type: 'text', required: true },
        { key: 'categoria', label: 'Categoría', type: 'select', options: ['Abarrotes', 'Bebidas', 'Limpieza', 'Snacks', 'Lácteos'] },
        { key: 'precio', label: 'Precio', type: 'currency' },
        { key: 'stock', label: 'Stock', type: 'number' },
        { key: 'disponible', label: 'Disponible', type: 'boolean', default: true },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_clientes`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Clientes',
      description: 'Lista de clientes',
      icon: '👤',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'telefono', label: 'Teléfono', type: 'phone' },
        { key: 'direccion', label: 'Dirección', type: 'text' },
        { key: 'notas', label: 'Notas', type: 'text' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: `table_${WORKSPACE_ID}_pedidos`,
      type: 'table',
      workspaceId: WORKSPACE_ID,
      name: 'Pedidos',
      description: 'Pedidos de clientes',
      icon: '🛒',
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'relation', relationTo: `table_${WORKSPACE_ID}_clientes`, required: true },
        { key: 'productos', label: 'Productos', type: 'text', required: true },
        { key: 'total', label: 'Total', type: 'currency' },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Listo', 'Entregado'], default: 'Pendiente' },
        { key: 'fecha', label: 'Fecha', type: 'date' },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  for (const table of tables) {
    await upsert(tablesDb, table);
    console.log(`✅ Tabla: ${table.name} ${table.icon}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. AGENTE BÁSICO (sin flujos)
  // ─────────────────────────────────────────────────────────────
  const agentsDb = await connectDB(`chatbot_agents_${WORKSPACE_ID}`);
  
  const agent = {
    _id: `agent_${WORKSPACE_ID}_vendedor`,
    type: 'agent',
    workspaceId: WORKSPACE_ID,
    name: 'Don Pedro',
    avatar: '🧔',
    description: 'Asistente de la tienda',
    role: 'Atención al cliente básica',
    personality: 'Amable, servicial, tradicional',
    welcomeMessage: '¡Hola! Soy Don Pedro, ¿en qué te puedo ayudar? Puedo decirte qué productos tenemos o registrar un pedido.',
    aiModel: 'gpt-4o-mini',
    tables: tables.map(t => t._id),
    hasFlows: false, // ← SIN FLUJOS
    flows: [], // ← VACÍO
    planFeatures: {
      canCreate: true,
      canRead: true,
      canUpdate: false, // No puede actualizar
      canDelete: false, // No puede eliminar
      canUseFlows: false,
      canCheckAvailability: false,
    },
    systemPrompt: `Eres Don Pedro, el vendedor de Tienda El Ahorro.

PERSONALIDAD:
- Amable y tradicional
- Respuestas simples y directas
- Usa expresiones coloquiales

LIMITACIONES (Plan Básico):
- Solo puedes CREAR pedidos y CONSULTAR productos
- NO puedes modificar ni cancelar pedidos (deriva al dueño)
- NO tienes flujos automáticos
- NO verificas disponibilidad automática

PRODUCTOS DISPONIBLES:
- Abarrotes (arroz, aceite, azúcar, etc.)
- Bebidas (gaseosas, jugos, agua)
- Limpieza (detergente, jabón)
- Snacks (papas, galletas)
- Lácteos (leche, queso, yogurt)

CUANDO TE PIDAN UN PEDIDO:
1. Pregunta qué productos necesitan
2. Pregunta nombre y teléfono
3. Registra el pedido
4. Indica que confirmarán disponibilidad manualmente`,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  await upsert(agentsDb, agent);
  console.log(`✅ Agente: ${agent.name} ${agent.avatar} (SIN FLUJOS)`);

  // NO SE CREAN FLUJOS - Plan básico

  // ─────────────────────────────────────────────────────────────
  // 5. DATOS DE EJEMPLO
  // ─────────────────────────────────────────────────────────────
  const dataDb = await connectDB(`chatbot_tabledata_${WORKSPACE_ID}`);

  const productos = [
    { _id: 'prod_1', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Arroz x 1kg', categoria: 'Abarrotes', precio: 4500, stock: 50, disponible: true },
    { _id: 'prod_2', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Aceite x 1L', categoria: 'Abarrotes', precio: 8900, stock: 30, disponible: true },
    { _id: 'prod_3', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Azúcar x 1kg', categoria: 'Abarrotes', precio: 3800, stock: 40, disponible: true },
    { _id: 'prod_4', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Gaseosa 2L', categoria: 'Bebidas', precio: 5500, stock: 24, disponible: true },
    { _id: 'prod_5', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Agua x 6', categoria: 'Bebidas', precio: 6000, stock: 20, disponible: true },
    { _id: 'prod_6', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Detergente 1kg', categoria: 'Limpieza', precio: 12000, stock: 15, disponible: true },
    { _id: 'prod_7', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Jabón x 3', categoria: 'Limpieza', precio: 4500, stock: 25, disponible: true },
    { _id: 'prod_8', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Papas Margarita', categoria: 'Snacks', precio: 3000, stock: 100, disponible: true },
    { _id: 'prod_9', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Leche x 1L', categoria: 'Lácteos', precio: 4200, stock: 30, disponible: true },
    { _id: 'prod_10', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Queso campesino', categoria: 'Lácteos', precio: 15000, stock: 10, disponible: true },
    { _id: 'prod_11', tableId: `table_${WORKSPACE_ID}_productos`, nombre: 'Yogurt x 1L', categoria: 'Lácteos', precio: 5800, stock: 20, disponible: true },
  ];

  const clientes = [
    { _id: 'cli_1', tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'María Rodríguez', telefono: '311-111-2222', direccion: 'Calle 5 #10-20' },
    { _id: 'cli_2', tableId: `table_${WORKSPACE_ID}_clientes`, nombre: 'José López', telefono: '312-333-4444', direccion: 'Cra 8 #15-30' },
  ];

  for (const p of productos) {
    await upsert(dataDb, p);
  }
  console.log(`✅ Datos: ${productos.length} productos`);

  for (const c of clientes) {
    await upsert(dataDb, c);
  }
  console.log(`✅ Datos: ${clientes.length} clientes`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ SEED TIENDA BÁSICA COMPLETADO');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\n⚠️  PLAN BÁSICO - LIMITACIONES:');
  console.log('   - Sin flujos de automatización');
  console.log('   - Solo CREATE y READ');
  console.log('   - Sin verificación de disponibilidad');
  console.log('   - Sin notificaciones');
  console.log('   - Máximo 3 tablas, 100 registros c/u');
  console.log('\n');
}

main().catch(console.error);
