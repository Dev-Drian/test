/**
 * Seed: Workspaces por Plan
 * 
 * Crea workspaces completos y funcionales para cada tipo de plan:
 * - FREE: "Mi Lista de Tareas" - 1 tabla, 1 agente simple
 * - STARTER: "Mi Tienda" - 3 tablas, 1 agente  
 * - PREMIUM: "CRM Premium" - Ya existe en premium-crm.js
 * - ENTERPRISE: "Corp Manager" - Sistema completo con analytics
 * 
 * Cada workspace incluye:
 * - Tablas con datos de ejemplo
 * - Agentes configurados
 * - Relaciones entre tablas (cuando aplica)
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName, getAgentsDbName, getDbPrefix } from '../config/db.js';

// ═══════════════════════════════════════════════════════════════
// HELPERS: Verificar duplicados antes de crear
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si ya existe un agente con el mismo nombre
 */
async function agentExists(agentsDb, name) {
  try {
    const result = await agentsDb.list({ include_docs: true });
    return result.rows.some(r => r.doc && r.doc.name === name);
  } catch {
    return false;
  }
}

/**
 * Verifica si ya existe una tabla con el mismo nombre
 */
async function tableExists(workspaceDb, name) {
  try {
    const result = await workspaceDb.list({ include_docs: true });
    return result.rows.some(r => r.doc && r.doc.name === name && r.doc.headers);
  } catch {
    return false;
  }
}

/**
 * Verifica si ya existe un workspace
 */
async function workspaceExists(workspacesDb, id) {
  try {
    await workspacesDb.get(id);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// WORKSPACE FREE: Lista de Tareas
// Límites: 1 tabla, 1 agente, 100 registros
// ═══════════════════════════════════════════════════════════════
async function seedFreeWorkspace() {
  const WORKSPACE_ID = 'free-tasks';
  const WORKSPACE_NAME = 'Mi Lista de Tareas';
  
  console.log(`\n[Seed FREE] Creando workspace "${WORKSPACE_NAME}"...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const tableDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
    
    // Verificar si ya existen los datos
    if (await tableExists(workspaceDb, 'Tareas')) {
      console.log('  ⏭️ Workspace ya tiene datos, saltando...');
      return;
    }
    
    // ═══ TABLA: Tareas ═══
    const tareasTableId = uuidv4();
    const tareasTable = {
      _id: tareasTableId,
      name: 'Tareas',
      type: 'tasks',
      displayField: 'titulo',
      description: 'Lista de tareas personales',
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: true
      },
      headers: [
        { key: 'titulo', label: 'Tarea', type: 'text', required: true, emoji: '✏️', priority: 1 },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝' },
        { key: 'prioridad', label: 'Prioridad', type: 'select', required: true, emoji: '🎯', options: ['Baja', 'Media', 'Alta'], defaultValue: 'Media', priority: 2 },
        { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Pendiente', 'En Progreso', 'Completada'], defaultValue: 'Pendiente', priority: 3 },
        { key: 'fechaLimite', label: 'Fecha Límite', type: 'date', required: false, emoji: '📅' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(tareasTable);
    console.log('  ✅ Tabla Tareas creada');
    
    // ═══ AGENTE: Asistente de Tareas ═══
    const agenteId = uuidv4();
    const agente = {
      _id: agenteId,
      type: 'agent',
      name: 'Asistente de Tareas',
      description: 'Te ayudo a organizar tus tareas del día',
      tables: [{ tableId: tareasTableId, tableName: 'Tareas', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } }],
      engineMode: 'llm-first',
      vertical: 'productivity',
      toneStyle: 'friendly',
      fewShotExamples: [
        { user: 'agregar tarea', assistant: '¡Claro! ¿Cuál es la tarea que quieres agregar?' },
        { user: 'ver mis tareas pendientes', assistant: 'Te muestro tus tareas pendientes...' }
      ],
      enabledTools: ['create_record', 'query_records', 'update_record', 'general_conversation'],
      customInstructions: 'Ayuda al usuario a organizar sus tareas. Sé breve y directo.',
      prompt: `Eres un asistente de tareas. Ayudas a crear, listar y actualizar tareas.
Funciones: crear tareas, ver pendientes, marcar como completadas, cambiar prioridad.`,
      aiModel: ['gpt-4o-mini'],
      active: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agente);
    console.log('  ✅ Agente creado');
    
    // ═══ DATOS DE EJEMPLO ═══
    const ejemplosTareas = [
      { titulo: 'Revisar correos', prioridad: 'Alta', estado: 'Pendiente', fechaLimite: '2026-02-27' },
      { titulo: 'Llamar al doctor', prioridad: 'Media', estado: 'Pendiente', fechaLimite: '2026-02-28' },
      { titulo: 'Comprar víveres', prioridad: 'Baja', estado: 'En Progreso' },
    ];
    
    for (const tarea of ejemplosTareas) {
      await tableDataDb.insert({
        _id: uuidv4(),
        tableId: tareasTableId,
        ...tarea,
        createdAt: new Date().toISOString()
      });
    }
    console.log('  ✅ 3 tareas de ejemplo creadas');
    
    // ═══ WORKSPACE DOC ═══
    const workspaceDoc = {
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Lista de tareas personal',
      type: 'personal-tasks',
      defaultAgentId: agenteId,
      plan: 'free',
      settings: { timezone: 'America/Bogota', language: 'es' },
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(workspaceDoc);
    
    // Workspace central
    await workspacesDb.insert({
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      color: 'rgb(107, 114, 128)', // gris para free
      plan: 'free',
      createdBy: 'seed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: []
    });
    
    console.log(`  ✅ Workspace "${WORKSPACE_NAME}" configurado\n`);
    return { workspaceId: WORKSPACE_ID, agentId: agenteId, tables: [{ id: tareasTableId, name: 'Tareas' }] };
    
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`  ⏭️  Workspace FREE ya existe, omitiendo...\n`);
    } else {
      console.error(`  ❌ Error en workspace FREE:`, err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// WORKSPACE STARTER: Mi Tienda
// Límites: 3 tablas, 1 agente, 500 registros
// ═══════════════════════════════════════════════════════════════
async function seedStarterWorkspace() {
  const WORKSPACE_ID = 'starter-tienda';
  const WORKSPACE_NAME = 'Mi Tienda Online';
  
  console.log(`\n[Seed STARTER] Creando workspace "${WORKSPACE_NAME}"...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const tableDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
    
    // Verificar si ya existen los datos
    if (await tableExists(workspaceDb, 'Productos')) {
      console.log('  ⏭️ Workspace ya tiene datos, saltando...');
      return;
    }
    
    // ═══ TABLA 1: Productos ═══
    const productosTableId = uuidv4();
    const productosTable = {
      _id: productosTableId,
      name: 'Productos',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Catálogo de productos',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre', label: 'Producto', type: 'text', required: true, emoji: '📦', priority: 1 },
        { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '🏷️', options: ['Electrónica', 'Ropa', 'Hogar', 'Accesorios'], priority: 2 },
        { key: 'precio', label: 'Precio', type: 'number', required: true, emoji: '💰', priority: 3 },
        { key: 'stock', label: 'Stock', type: 'number', required: false, emoji: '📊', defaultValue: 0 },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(productosTable);
    console.log('  ✅ Tabla Productos creada');
    
    // ═══ TABLA 2: Clientes ═══
    const clientesTableId = uuidv4();
    const clientesTable = {
      _id: clientesTableId,
      name: 'Clientes',
      type: 'customers',
      displayField: 'nombre',
      description: 'Base de clientes',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '👤', priority: 1 },
        { key: 'email', label: 'Email', type: 'email', required: true, emoji: '📧', priority: 2 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: false, emoji: '📱' },
        { key: 'ciudad', label: 'Ciudad', type: 'text', required: false, emoji: '🏙️' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(clientesTable);
    console.log('  ✅ Tabla Clientes creada');
    
    // ═══ TABLA 3: Pedidos ═══
    const pedidosTableId = uuidv4();
    const pedidosTable = {
      _id: pedidosTableId,
      name: 'Pedidos',
      type: 'orders',
      displayField: 'cliente',
      description: 'Pedidos de clientes',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { 
          key: 'cliente', label: 'Cliente', type: 'relation', required: true, emoji: '👤', priority: 1,
          relation: { tableName: 'Clientes', displayField: 'nombre', autoCreate: true }
        },
        { 
          key: 'producto', label: 'Producto', type: 'relation', required: true, emoji: '📦', priority: 2,
          relation: { tableName: 'Productos', displayField: 'nombre', showOptionsOnNotFound: true }
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, emoji: '🔢', priority: 3 },
        { key: 'total', label: 'Total', type: 'number', required: false, emoji: '💵', hiddenFromChat: true },
        { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'], defaultValue: 'Pendiente' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(pedidosTable);
    console.log('  ✅ Tabla Pedidos creada');
    
    // ═══ AGENTE: Vendedor Online ═══
    const agenteId = uuidv4();
    const agente = {
      _id: agenteId,
      type: 'agent',
      name: 'Vendedor Online',
      description: 'Gestiona productos, clientes y pedidos de tu tienda',
      tables: [
        { tableId: productosTableId, tableName: 'Productos', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: clientesTableId, tableName: 'Clientes', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: pedidosTableId, tableName: 'Pedidos', fullAccess: true, permissions: { query: true, create: true, update: false, delete: false } }
      ],
      engineMode: 'llm-first',
      vertical: 'ecommerce',
      toneStyle: 'friendly',
      fewShotExamples: [
        { user: 'qué productos tienen', assistant: 'Te muestro nuestro catálogo con precios y disponibilidad.' },
        { user: 'quiero hacer un pedido', assistant: '¡Perfecto! ¿Qué producto te interesa?' }
      ],
      enabledTools: ['create_record', 'query_records', 'update_record', 'general_conversation'],
      customInstructions: 'Ayuda a los clientes a ver productos y hacer pedidos. Siempre confirma el pedido antes de registrarlo.',
      prompt: `Eres el vendedor de una tienda online.
Funciones: mostrar productos, registrar clientes, crear pedidos, ver estado de pedidos.
Siempre confirma los datos antes de crear un pedido.`,
      aiModel: ['gpt-4o-mini'],
      active: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agente);
    console.log('  ✅ Agente Vendedor creado');
    
    // ═══ DATOS DE EJEMPLO ═══
    // Productos
    const productos = [
      { nombre: 'Audífonos Bluetooth', categoria: 'Electrónica', precio: 89000, stock: 25, descripcion: 'Audífonos inalámbricos con cancelación de ruido' },
      { nombre: 'Camiseta Básica', categoria: 'Ropa', precio: 35000, stock: 50, descripcion: 'Camiseta 100% algodón' },
      { nombre: 'Lámpara LED', categoria: 'Hogar', precio: 45000, stock: 15, descripcion: 'Lámpara de escritorio ajustable' },
      { nombre: 'Funda Celular', categoria: 'Accesorios', precio: 25000, stock: 100, descripcion: 'Funda protectora universal' },
    ];
    
    for (const prod of productos) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: productosTableId, ...prod, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 4 productos de ejemplo');
    
    // Clientes
    const clientes = [
      { nombre: 'Laura Gómez', email: 'laura@email.com', telefono: '3001234567', ciudad: 'Bogotá' },
      { nombre: 'Carlos Mendoza', email: 'carlos@email.com', telefono: '3109876543', ciudad: 'Medellín' },
    ];
    
    for (const cli of clientes) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: clientesTableId, ...cli, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 2 clientes de ejemplo');
    
    // Pedidos
    const pedidos = [
      { cliente: 'Laura Gómez', producto: 'Audífonos Bluetooth', cantidad: 1, total: 89000, estado: 'Entregado' },
      { cliente: 'Carlos Mendoza', producto: 'Camiseta Básica', cantidad: 2, total: 70000, estado: 'Enviado' },
    ];
    
    for (const ped of pedidos) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: pedidosTableId, ...ped, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 2 pedidos de ejemplo');
    
    // ═══ WORKSPACE DOC ═══
    await workspaceDb.insert({
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Tienda online con gestión de productos y pedidos',
      type: 'ecommerce',
      defaultAgentId: agenteId,
      plan: 'starter',
      settings: { timezone: 'America/Bogota', currency: 'COP', language: 'es' },
      createdAt: new Date().toISOString()
    });
    
    await workspacesDb.insert({
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      color: 'rgb(59, 130, 246)', // azul para starter
      plan: 'starter',
      createdBy: 'seed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: []
    });
    
    console.log(`  ✅ Workspace "${WORKSPACE_NAME}" configurado\n`);
    return { workspaceId: WORKSPACE_ID, agentId: agenteId };
    
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`  ⏭️  Workspace STARTER ya existe, omitiendo...\n`);
    } else {
      console.error(`  ❌ Error en workspace STARTER:`, err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// WORKSPACE ENTERPRISE: Corp Manager
// Sin límites: tablas ilimitadas, múltiples agentes, analytics
// ═══════════════════════════════════════════════════════════════
async function seedEnterpriseWorkspace() {
  const WORKSPACE_ID = 'enterprise-corp';
  const WORKSPACE_NAME = 'Corp Manager Pro';
  
  console.log(`\n[Seed ENTERPRISE] Creando workspace "${WORKSPACE_NAME}"...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const tableDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
    
    // Verificar si ya existen los datos
    if (await tableExists(workspaceDb, 'Empleados')) {
      console.log('  ⏭️ Workspace ya tiene datos, saltando...');
      return;
    }
    
    // ═══ TABLA 1: Empleados ═══
    const empleadosTableId = uuidv4();
    await workspaceDb.insert({
      _id: empleadosTableId,
      name: 'Empleados',
      type: 'employees',
      displayField: 'nombre',
      description: 'Directorio de empleados',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: true },
      headers: [
        { key: 'nombre', label: 'Nombre Completo', type: 'text', required: true, emoji: '👤', priority: 1 },
        { key: 'email', label: 'Email Corporativo', type: 'email', required: true, emoji: '📧', priority: 2 },
        { key: 'departamento', label: 'Departamento', type: 'select', required: true, emoji: '🏢', options: ['Ventas', 'Marketing', 'Desarrollo', 'RRHH', 'Finanzas', 'Operaciones'], priority: 3 },
        { key: 'cargo', label: 'Cargo', type: 'text', required: true, emoji: '💼', priority: 4 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: false, emoji: '📱' },
        { key: 'fechaIngreso', label: 'Fecha Ingreso', type: 'date', required: false, emoji: '📅' },
        { key: 'salario', label: 'Salario', type: 'number', required: false, emoji: '💰', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Tabla Empleados');
    
    // ═══ TABLA 2: Departamentos ═══
    const deptosTableId = uuidv4();
    await workspaceDb.insert({
      _id: deptosTableId,
      name: 'Departamentos',
      type: 'departments',
      displayField: 'nombre',
      description: 'Estructura organizacional',
      permissions: { allowQuery: true, allowCreate: false, allowUpdate: false, allowDelete: false },
      headers: [
        { key: 'nombre', label: 'Departamento', type: 'text', required: true, emoji: '🏢', priority: 1 },
        { key: 'responsable', label: 'Responsable', type: 'text', required: true, emoji: '👔', priority: 2 },
        { key: 'presupuesto', label: 'Presupuesto Anual', type: 'number', required: false, emoji: '💰' },
        { key: 'empleados', label: 'Nº Empleados', type: 'number', required: false, emoji: '👥' }
      ],
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Tabla Departamentos');
    
    // ═══ TABLA 3: Proyectos ═══
    const proyectosTableId = uuidv4();
    await workspaceDb.insert({
      _id: proyectosTableId,
      name: 'Proyectos',
      type: 'projects',
      displayField: 'nombre',
      description: 'Gestión de proyectos corporativos',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre', label: 'Proyecto', type: 'text', required: true, emoji: '📋', priority: 1 },
        { key: 'departamento', label: 'Departamento', type: 'select', required: true, emoji: '🏢', options: ['Ventas', 'Marketing', 'Desarrollo', 'RRHH', 'Finanzas', 'Operaciones'], priority: 2 },
        { key: 'lider', label: 'Líder', type: 'text', required: true, emoji: '👤', priority: 3 },
        { key: 'presupuesto', label: 'Presupuesto', type: 'number', required: true, emoji: '💰', priority: 4 },
        { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Planificación', 'En Curso', 'Pausado', 'Completado', 'Cancelado'], defaultValue: 'Planificación' },
        { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date', required: true, emoji: '📅' },
        { key: 'fechaFin', label: 'Fecha Fin', type: 'date', required: false, emoji: '🏁' },
        { key: 'avance', label: 'Avance %', type: 'number', required: false, emoji: '📈', defaultValue: 0 }
      ],
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Tabla Proyectos');
    
    // ═══ TABLA 4: Gastos ═══
    const gastosTableId = uuidv4();
    await workspaceDb.insert({
      _id: gastosTableId,
      name: 'Gastos',
      type: 'expenses',
      displayField: 'concepto',
      description: 'Control de gastos por departamento',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'concepto', label: 'Concepto', type: 'text', required: true, emoji: '📝', priority: 1 },
        { key: 'departamento', label: 'Departamento', type: 'select', required: true, emoji: '🏢', options: ['Ventas', 'Marketing', 'Desarrollo', 'RRHH', 'Finanzas', 'Operaciones'], priority: 2 },
        { key: 'monto', label: 'Monto', type: 'number', required: true, emoji: '💰', priority: 3 },
        { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '🏷️', options: ['Nómina', 'Servicios', 'Insumos', 'Tecnología', 'Marketing', 'Viajes', 'Otros'] },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', defaultValue: 'today' },
        { key: 'aprobado', label: 'Aprobado', type: 'select', required: true, emoji: '✅', options: ['Pendiente', 'Aprobado', 'Rechazado'], defaultValue: 'Pendiente' }
      ],
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Tabla Gastos');
    
    // ═══ TABLA 5: KPIs ═══
    const kpisTableId = uuidv4();
    await workspaceDb.insert({
      _id: kpisTableId,
      name: 'KPIs',
      type: 'metrics',
      displayField: 'indicador',
      description: 'Indicadores clave de rendimiento',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'indicador', label: 'Indicador', type: 'text', required: true, emoji: '📊', priority: 1 },
        { key: 'departamento', label: 'Departamento', type: 'select', required: true, emoji: '🏢', options: ['Ventas', 'Marketing', 'Desarrollo', 'RRHH', 'Finanzas', 'Operaciones', 'General'], priority: 2 },
        { key: 'valorActual', label: 'Valor Actual', type: 'number', required: true, emoji: '📈', priority: 3 },
        { key: 'meta', label: 'Meta', type: 'number', required: true, emoji: '🎯', priority: 4 },
        { key: 'unidad', label: 'Unidad', type: 'select', required: true, emoji: '📐', options: ['%', '$', 'Unidades', 'Horas', 'Días'] },
        { key: 'periodo', label: 'Período', type: 'select', required: true, emoji: '📅', options: ['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Anual'] }
      ],
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Tabla KPIs');
    
    // ═══ AGENTE 1: Recursos Humanos ═══
    const agenteRRHHId = uuidv4();
    await agentsDb.insert({
      _id: agenteRRHHId,
      type: 'agent',
      name: 'Asistente Corporativo',
      description: 'Gestión completa: empleados, proyectos, gastos y KPIs',
      tables: [
        { tableId: empleadosTableId, tableName: 'Empleados', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: deptosTableId, tableName: 'Departamentos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: proyectosTableId, tableName: 'Proyectos', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } },
        { tableId: gastosTableId, tableName: 'Gastos', fullAccess: true, permissions: { query: true, create: true, update: false, delete: false } },
        { tableId: kpisTableId, tableName: 'KPIs', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } }
      ],
      engineMode: 'llm-first',
      vertical: 'hr',
      toneStyle: 'professional',
      enabledTools: ['create_record', 'query_records', 'update_record', 'analyze_data', 'general_conversation'],
      fewShotExamples: [
        { user: 'cuántos proyectos activos hay', assistant: 'Te muestro los proyectos activos con su estado y avance.' },
        { user: 'dame los KPIs del mes', assistant: 'Te presento los indicadores clave actuales comparados con sus metas.' }
      ],
      prompt: `Eres el asistente corporativo de una empresa.
Funciones: 
- Gestionar empleados y directorio
- Ver estructura departamental
- Consultar y analizar proyectos (estado, avance, presupuesto)
- Revisar gastos por departamento
- Mostrar KPIs e indicadores de rendimiento
Presenta datos con cifras claras y porcentajes cuando aplique.`,
      aiModel: ['gpt-4o-mini'],
      active: true,
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Agente RRHH');
    
    // ═══ AGENTE 2: Analista de Gestión ═══
    const agenteAnalistaId = uuidv4();
    await agentsDb.insert({
      _id: agenteAnalistaId,
      type: 'agent',
      name: 'Analista de Gestión',
      description: 'Análisis de proyectos, gastos y KPIs',
      tables: [
        { tableId: proyectosTableId, tableName: 'Proyectos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: gastosTableId, tableName: 'Gastos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: kpisTableId, tableName: 'KPIs', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } },
        { tableId: deptosTableId, tableName: 'Departamentos', fullAccess: true, permissions: { query: true, create: false, update: false, delete: false } }
      ],
      engineMode: 'llm-first',
      vertical: 'analytics',
      toneStyle: 'professional',
      enabledTools: ['query_records', 'analyze_data', 'general_conversation'],
      disabledTools: ['create_record'], // Solo consulta y análisis
      fewShotExamples: [
        { user: 'cuál es el departamento con más gastos', assistant: 'Te muestro el análisis de gastos por departamento...' },
        { user: 'cómo van los KPIs', assistant: 'Te presento el estado actual de los indicadores clave...' }
      ],
      prompt: `Eres un analista de gestión corporativa.
Funciones: analizar proyectos, reportar gastos, evaluar KPIs.
Presenta datos con cifras claras, porcentajes y recomendaciones.`,
      aiModel: ['gpt-4o-mini'],
      active: true,
      createdAt: new Date().toISOString()
    });
    console.log('  ✅ Agente Analista');
    
    // ═══ DATOS DE EJEMPLO ═══
    // Departamentos
    const deptos = [
      { nombre: 'Ventas', responsable: 'Ana Martínez', presupuesto: 150000000, empleados: 12 },
      { nombre: 'Marketing', responsable: 'Roberto Silva', presupuesto: 80000000, empleados: 8 },
      { nombre: 'Desarrollo', responsable: 'Diana Torres', presupuesto: 200000000, empleados: 25 },
      { nombre: 'RRHH', responsable: 'Carmen López', presupuesto: 40000000, empleados: 5 },
      { nombre: 'Finanzas', responsable: 'Miguel Ángel Rojas', presupuesto: 60000000, empleados: 7 },
      { nombre: 'Operaciones', responsable: 'Fernando Gómez', presupuesto: 120000000, empleados: 15 }
    ];
    for (const d of deptos) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: deptosTableId, ...d, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 6 departamentos');
    
    // Empleados
    const empleados = [
      { nombre: 'Ana Martínez', email: 'ana.martinez@corp.com', departamento: 'Ventas', cargo: 'Directora de Ventas', fechaIngreso: '2020-03-15' },
      { nombre: 'Roberto Silva', email: 'roberto.silva@corp.com', departamento: 'Marketing', cargo: 'Director de Marketing', fechaIngreso: '2019-06-01' },
      { nombre: 'Diana Torres', email: 'diana.torres@corp.com', departamento: 'Desarrollo', cargo: 'CTO', fechaIngreso: '2018-01-10' },
      { nombre: 'Pedro Ramírez', email: 'pedro.ramirez@corp.com', departamento: 'Ventas', cargo: 'Ejecutivo Senior', fechaIngreso: '2021-02-20' },
      { nombre: 'Lucía Fernández', email: 'lucia.fernandez@corp.com', departamento: 'Desarrollo', cargo: 'Tech Lead', fechaIngreso: '2020-08-15' },
      { nombre: 'Andrés Moreno', email: 'andres.moreno@corp.com', departamento: 'Marketing', cargo: 'Social Media Manager', fechaIngreso: '2022-01-05' }
    ];
    for (const e of empleados) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: empleadosTableId, ...e, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 6 empleados');
    
    // Proyectos
    const proyectos = [
      { nombre: 'Migración Cloud', departamento: 'Desarrollo', lider: 'Diana Torres', presupuesto: 80000000, estado: 'En Curso', fechaInicio: '2025-10-01', avance: 65 },
      { nombre: 'Campaña Q1 2026', departamento: 'Marketing', lider: 'Roberto Silva', presupuesto: 25000000, estado: 'En Curso', fechaInicio: '2026-01-01', avance: 40 },
      { nombre: 'Sistema de Ventas v2', departamento: 'Ventas', lider: 'Ana Martínez', presupuesto: 45000000, estado: 'Planificación', fechaInicio: '2026-03-01', avance: 0 },
      { nombre: 'Automatización RRHH', departamento: 'RRHH', lider: 'Carmen López', presupuesto: 15000000, estado: 'Completado', fechaInicio: '2025-06-01', fechaFin: '2025-12-15', avance: 100 }
    ];
    for (const p of proyectos) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: proyectosTableId, ...p, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 4 proyectos');
    
    // Gastos
    const gastos = [
      { concepto: 'Nómina Febrero', departamento: 'Desarrollo', monto: 85000000, categoria: 'Nómina', fecha: '2026-02-01', aprobado: 'Aprobado' },
      { concepto: 'Nómina Febrero', departamento: 'Ventas', monto: 42000000, categoria: 'Nómina', fecha: '2026-02-01', aprobado: 'Aprobado' },
      { concepto: 'AWS Services', departamento: 'Desarrollo', monto: 8500000, categoria: 'Tecnología', fecha: '2026-02-15', aprobado: 'Aprobado' },
      { concepto: 'Google Ads', departamento: 'Marketing', monto: 12000000, categoria: 'Marketing', fecha: '2026-02-10', aprobado: 'Aprobado' },
      { concepto: 'Viaje cliente México', departamento: 'Ventas', monto: 4500000, categoria: 'Viajes', fecha: '2026-02-20', aprobado: 'Pendiente' }
    ];
    for (const g of gastos) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: gastosTableId, ...g, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 5 gastos');
    
    // KPIs
    const kpis = [
      { indicador: 'Ingresos Mensuales', departamento: 'Ventas', valorActual: 280000000, meta: 300000000, unidad: '$', periodo: 'Mensual' },
      { indicador: 'Conversión Leads', departamento: 'Ventas', valorActual: 18, meta: 25, unidad: '%', periodo: 'Mensual' },
      { indicador: 'Engagement Rate', departamento: 'Marketing', valorActual: 4.2, meta: 5, unidad: '%', periodo: 'Semanal' },
      { indicador: 'Uptime Sistema', departamento: 'Desarrollo', valorActual: 99.8, meta: 99.9, unidad: '%', periodo: 'Mensual' },
      { indicador: 'Satisfacción Empleados', departamento: 'RRHH', valorActual: 78, meta: 85, unidad: '%', periodo: 'Trimestral' }
    ];
    for (const k of kpis) {
      await tableDataDb.insert({ _id: uuidv4(), tableId: kpisTableId, ...k, createdAt: new Date().toISOString() });
    }
    console.log('  ✅ 5 KPIs');
    
    // ═══ WORKSPACE DOC ═══
    await workspaceDb.insert({
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Sistema de gestión corporativa con analytics',
      type: 'enterprise-management',
      defaultAgentId: agenteAnalistaId,
      plan: 'enterprise',
      settings: { timezone: 'America/Bogota', currency: 'COP', language: 'es' },
      features: { analytics: true, multiAgent: true, customFlows: true, apiAccess: true },
      createdAt: new Date().toISOString()
    });
    
    await workspacesDb.insert({
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      color: 'rgb(245, 158, 11)', // ámbar para enterprise
      plan: 'enterprise',
      createdBy: 'seed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: []
    });
    
    console.log(`  ✅ Workspace "${WORKSPACE_NAME}" configurado\n`);
    return { workspaceId: WORKSPACE_ID, agents: [agenteRRHHId, agenteAnalistaId] };
    
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`  ⏭️  Workspace ENTERPRISE ya existe, omitiendo...\n`);
    } else {
      console.error(`  ❌ Error en workspace ENTERPRISE:`, err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTUALIZAR USUARIOS CON WORKSPACES
// ═══════════════════════════════════════════════════════════════
async function linkUsersToWorkspaces() {
  console.log('\n[Seed] Vinculando usuarios a workspaces...');
  
  try {
    const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
    
    // user-nuevo (FREE) NO se vincula - hará onboarding
    const userWorkspaces = {
      'user-starter': { workspaces: [{ id: 'starter-tienda', role: 'owner' }], workspacesOwner: ['starter-tienda'] },
      'user-demo': { workspaces: [{ id: 'premium-crm', role: 'owner' }], workspacesOwner: ['premium-crm'] },
      'user-admin': { workspaces: [{ id: 'enterprise-corp', role: 'owner' }], workspacesOwner: ['enterprise-corp'] }
    };
    
    for (const [userId, data] of Object.entries(userWorkspaces)) {
      try {
        const user = await accountsDb.get(userId);
        user.workspaces = data.workspaces;
        user.workspacesOwner = data.workspacesOwner;
        user.updatedAt = new Date().toISOString();
        await accountsDb.insert(user);
        console.log(`  ✅ ${userId} vinculado a ${data.workspacesOwner.join(', ')}`);
      } catch (e) {
        console.log(`  ⚠️ Usuario ${userId} no encontrado, omitiendo...`);
      }
    }
    
    console.log('[Seed] ✅ Usuarios vinculados\n');
  } catch (err) {
    console.error('[Seed] Error vinculando usuarios:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════════
export async function seedAllWorkspaces() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        🏢 SEED: WORKSPACES POR PLAN                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  // FREE: NO crear workspace - el usuario hará onboarding
  // await seedFreeWorkspace();
  
  await seedStarterWorkspace();
  // premium-crm ya existe en premium-crm.js
  await seedEnterpriseWorkspace();
  await linkUsersToWorkspaces();
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('📦 WORKSPACES CREADOS:');
  console.log('────────────────────────────────────────────────────────────');
  console.log('🆓 FREE:       (onboarding requerido)');
  console.log('⭐ STARTER:    starter-tienda (3 tablas, 1 agente)');
  console.log('💎 PREMIUM:    premium-crm (9 tablas, 2 agentes)');
  console.log('👑 ENTERPRISE: enterprise-corp (5 tablas, 2 agentes)');
  console.log('════════════════════════════════════════════════════════════\n');
}

export default seedAllWorkspaces;
