/**
 * Seed para Veterinaria - Crea workspace, tablas, agentes y flujos
 * Ejecutar: node src/seeds/veterinaria.js
 */
import { v4 as uuidv4 } from "uuid";
import nano from "nano";
import dotenv from "dotenv";

dotenv.config();

const couchUrl = process.env.COUCHDB_URL || "http://admin:password@127.0.0.1:5984";
const couch = nano(couchUrl);

// Helpers para nombres de bases de datos (MISMO patrón que db.js)
const getWorkspaceDbName = (wsId) => `migracion_${wsId}_table`;
const getTableDataDbName = (wsId, tableId) => `migracion_${wsId}_table_${tableId}`;
const getAgentsDbName = (wsId) => `migracion_${wsId}_agents`;
const getFlowsDbName = (wsId) => `migracion_${wsId}_flows`;

async function connectDB(dbName) {
  try {
    await couch.db.create(dbName);
  } catch (err) {
    if (err.statusCode !== 412) throw err; // 412 = already exists
  }
  const db = couch.use(dbName);
  try {
    await db.createIndex({ index: { fields: ["_id"] } });
  } catch {}
  return db;
}

async function seed() {
  console.log("🐾 Iniciando seed de Veterinaria...\n");

  // 1. Crear Workspace
  const workspaceId = uuidv4();
  const workspacesDb = await connectDB("db_workspaces");
  
  const workspace = {
    _id: workspaceId,
    name: "Veterinaria PetCare",
    color: "rgb(76, 175, 80)",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "seed",
    members: [],
  };
  
  await workspacesDb.insert(workspace);
  console.log(`✅ Workspace creado: ${workspace.name} (${workspaceId})`);

  // 2. Crear Tablas
  const tablesDb = await connectDB(getWorkspaceDbName(workspaceId));
  
  const tablesData = [
    // ========== VETERINARIOS ==========
    {
      name: "Veterinarios",
      type: "staff",
      color: "#673AB7",
      icon: { name: "person" },
      headers: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "especialidad", label: "Especialidad", type: "text", required: false, defaultValue: "General" },
        { key: "servicios", label: "Servicios que ofrece", type: "text", required: false },
        { key: "horarioInicio", label: "Hora inicio", type: "text", required: false, defaultValue: "09:00" },
        { key: "horarioFin", label: "Hora fin", type: "text", required: false, defaultValue: "18:00" },
        { key: "diasTrabajo", label: "Días de trabajo", type: "text", required: false, defaultValue: "Lunes a Viernes" },
        { key: "telefono", label: "Teléfono", type: "text", required: false },
        { key: "activo", label: "Activo", type: "select", options: ["Sí", "No"], required: false, defaultValue: "Sí" },
      ],
      sampleData: [
        { nombre: "Dr. Rodríguez", especialidad: "Cirugía", servicios: "Consulta general, Esterilización, Vacunación, Control", horarioInicio: "09:00", horarioFin: "17:00", diasTrabajo: "Lunes a Viernes", telefono: "555-0001", activo: "Sí" },
        { nombre: "Dra. Fernández", especialidad: "Medicina general", servicios: "Consulta general, Vacunación, Control, Ecografía", horarioInicio: "10:00", horarioFin: "18:00", diasTrabajo: "Lunes a Sábado", telefono: "555-0002", activo: "Sí" },
        { nombre: "Dr. Martínez", especialidad: "Diagnóstico", servicios: "Radiografía, Ecografía, Consulta general", horarioInicio: "08:00", horarioFin: "14:00", diasTrabajo: "Lunes a Viernes", telefono: "555-0003", activo: "Sí" },
      ],
    },
    // ========== MASCOTAS ==========
    {
      name: "Mascotas",
      type: "pets",
      color: "#4CAF50",
      icon: { name: "pets" },
      headers: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "especie", label: "Especie", type: "select", options: ["Perro", "Gato", "Ave", "Conejo", "Otro"], required: true, defaultValue: "Perro" },
        { key: "raza", label: "Raza", type: "text", required: false, defaultValue: "Mestizo" },
        { key: "edad", label: "Edad (años)", type: "number", required: false },
        { key: "peso", label: "Peso (kg)", type: "number", required: false },
        { key: "propietario", label: "Propietario", type: "text", required: true },
        { key: "telefono", label: "Teléfono", type: "text", required: true },
      ],
      sampleData: [
        { nombre: "Max", especie: "Perro", raza: "Labrador", edad: 3, peso: 28, propietario: "Juan Pérez", telefono: "555-1234" },
        { nombre: "Luna", especie: "Gato", raza: "Siamés", edad: 2, peso: 4, propietario: "María García", telefono: "555-5678" },
        { nombre: "Rocky", especie: "Perro", raza: "Bulldog", edad: 5, peso: 22, propietario: "Carlos López", telefono: "555-9012" },
        { nombre: "Michi", especie: "Gato", raza: "Persa", edad: 4, peso: 5, propietario: "Ana Martínez", telefono: "555-3456" },
        { nombre: "Coco", especie: "Ave", raza: "Loro", edad: 8, peso: 0.4, propietario: "Pedro Sánchez", telefono: "555-7890" },
      ],
    },
    // ========== SERVICIOS ==========
    {
      name: "Servicios",
      type: "services",
      color: "#FF9800",
      icon: { name: "medical" },
      headers: [
        { key: "nombre", label: "Servicio", type: "text", required: true },
        { key: "categoria", label: "Categoría", type: "select", options: ["Consultas", "Vacunas", "Cirugías", "Estética", "Diagnóstico"], required: false },
        { key: "precio", label: "Precio ($)", type: "number", required: false },
        { key: "duracion", label: "Duración (min)", type: "number", required: false, defaultValue: 30 },
        { key: "descripcion", label: "Descripción", type: "text", required: false },
      ],
      sampleData: [
        { nombre: "Consulta general", categoria: "Consultas", precio: 50, duracion: 30, descripcion: "Revisión completa de la mascota" },
        { nombre: "Vacunación", categoria: "Vacunas", precio: 35, duracion: 15, descripcion: "Vacuna según calendario" },
        { nombre: "Control", categoria: "Consultas", precio: 40, duracion: 20, descripcion: "Seguimiento de tratamiento" },
        { nombre: "Esterilización", categoria: "Cirugías", precio: 150, duracion: 60, descripcion: "Procedimiento quirúrgico" },
        { nombre: "Baño y corte", categoria: "Estética", precio: 40, duracion: 60, descripcion: "Baño completo con corte" },
        { nombre: "Radiografía", categoria: "Diagnóstico", precio: 80, duracion: 20, descripcion: "Imagen por rayos X" },
        { nombre: "Ecografía", categoria: "Diagnóstico", precio: 100, duracion: 30, descripcion: "Imagen por ultrasonido" },
      ],
    },
    // ========== CITAS ==========
    {
      name: "Citas",
      type: "appointments",
      color: "#2196F3",
      icon: { name: "calendar" },
      uniqueConstraint: {
        fields: ["veterinario", "fecha", "hora"],
        excludeWhen: { estado: "Cancelada" },
        errorMessage: "El veterinario ya tiene una cita a esa hora"
      },
      headers: [
        { 
          key: "mascota", 
          label: "Mascota", 
          type: "relation", 
          required: true,
          relation: {
            tableName: "Mascotas",
            displayField: "nombre",
            searchField: "nombre",
            autoCreate: true,
            autoCreateFields: ["nombre", "propietario", "telefono", "especie"]
          }
        },
        { key: "propietario", label: "Propietario", type: "text", required: true },
        { key: "telefono", label: "Teléfono contacto", type: "text", required: true },
        { key: "fecha", label: "Fecha", type: "date", required: true },
        { key: "hora", label: "Hora", type: "text", required: true },
        { 
          key: "servicio", 
          label: "Servicio", 
          type: "relation", 
          required: true,
          relation: {
            tableName: "Servicios",
            displayField: "nombre",
            searchField: "nombre",
            autoCreate: false,
            showOptionsOnNotFound: true
          }
        },
        { 
          key: "veterinario", 
          label: "Veterinario", 
          type: "relation", 
          required: false,
          defaultValue: "Por asignar",
          relation: {
            tableName: "Veterinarios",
            displayField: "nombre",
            searchField: "nombre",
            autoCreate: false,
            showOptionsOnNotFound: true
          }
        },
        { key: "estado", label: "Estado", type: "select", options: ["Pendiente", "Confirmada", "En curso", "Completada", "Cancelada"], required: false, defaultValue: "Pendiente" },
        { key: "notas", label: "Notas", type: "text", required: false },
      ],
      sampleData: [
        { mascota: "Max", propietario: "Juan Pérez", telefono: "555-1234", fecha: "2026-02-06", hora: "09:00", servicio: "Vacunación", veterinario: "Dr. Rodríguez", estado: "Confirmada" },
        { mascota: "Luna", propietario: "María García", telefono: "555-5678", fecha: "2026-02-06", hora: "10:30", servicio: "Consulta general", veterinario: "Dra. Fernández", estado: "Pendiente" },
        { mascota: "Rocky", propietario: "Carlos López", telefono: "555-9012", fecha: "2026-02-07", hora: "11:00", servicio: "Control", veterinario: "Dr. Rodríguez", estado: "Pendiente" },
        { mascota: "Luna", propietario: "María García", telefono: "555-5678", fecha: "2026-02-07", hora: "14:00", servicio: "Ecografía", veterinario: "Dra. Fernández", estado: "Pendiente" },
      ],
    },
    // ========== INVENTARIO ==========
    {
      name: "Inventario",
      type: "inventory",
      color: "#9C27B0",
      icon: { name: "box" },
      headers: [
        { key: "producto", label: "Producto", type: "text", required: true },
        { key: "categoria", label: "Categoría", type: "select", options: ["Medicamentos", "Alimentos", "Accesorios", "Higiene"], required: false },
        { key: "stock", label: "Stock", type: "number", required: false, defaultValue: 0 },
        { key: "precio", label: "Precio ($)", type: "number", required: false },
        { key: "minimo", label: "Stock mínimo", type: "number", required: false, defaultValue: 5 },
      ],
      sampleData: [
        { producto: "Antiparasitario canino", categoria: "Medicamentos", stock: 25, precio: 18, minimo: 10 },
        { producto: "Antiparasitario felino", categoria: "Medicamentos", stock: 20, precio: 15, minimo: 10 },
        { producto: "Alimento premium perro 15kg", categoria: "Alimentos", stock: 12, precio: 65, minimo: 5 },
        { producto: "Alimento premium gato 5kg", categoria: "Alimentos", stock: 18, precio: 45, minimo: 8 },
        { producto: "Collar antipulgas", categoria: "Accesorios", stock: 30, precio: 12, minimo: 15 },
        { producto: "Shampoo medicado", categoria: "Higiene", stock: 15, precio: 22, minimo: 8 },
      ],
    },
  ];

  const createdTables = [];

  for (const tableInfo of tablesData) {
    const tableId = uuidv4();
    const table = {
      _id: tableId,
      name: tableInfo.name,
      description: `Tabla de ${tableInfo.name.toLowerCase()} de la veterinaria`,
      type: tableInfo.type,
      headers: tableInfo.headers,
      uniqueConstraint: tableInfo.uniqueConstraint || null,
      color: tableInfo.color,
      icon: tableInfo.icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await tablesDb.insert(table);
    console.log(`  📋 Tabla creada: ${table.name}`);

    // Crear base de datos de datos de la tabla
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    
    // Insertar documento principal
    await dataDb.insert({
      _id: uuidv4(),
      main: true,
      tableId: tableId,
      name: table.name,
      headers: table.headers,
      type: table.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Insertar datos de ejemplo
    for (const row of tableInfo.sampleData) {
      await dataDb.insert({
        _id: uuidv4(),
        ...row,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    console.log(`     ↳ ${tableInfo.sampleData.length} registros insertados`);

    createdTables.push({ id: tableId, name: table.name, type: table.type });
  }

  // 3. Crear Agentes
  const agentsDb = await connectDB(getAgentsDbName(workspaceId));
  
  // ========== AGENTE 1: CON FLUJOS (Principal) ==========
  const agentConFlujos = {
    _id: uuidv4(),
    name: "Asistente PetCare Pro",
    description: "Agente avanzado CON FLUJOS - Gestiona citas con validación de disponibilidad y asignación automática",
    workspaceId,
    type: "public",
    aiModel: ["gpt-4o-mini"],
    language: "es",
    tables: createdTables.map(t => ({ id: t.id, tableId: t.id, title: t.name })),
    hasFlows: true,
    instructions: [
      {
        title: "Identidad",
        actions: [
          "Eres el asistente virtual PRO de Veterinaria PetCare",
          "Usas flujos avanzados para validar disponibilidad y asignar veterinarios",
          "Horario de atención: Lunes a Viernes 8:00-20:00, Sábados 9:00-14:00"
        ]
      },
      {
        title: "Capacidades avanzadas",
        actions: [
          "Verificas disponibilidad en tiempo real antes de agendar",
          "Asignas automáticamente el veterinario adecuado según el servicio",
          "Creas mascotas automáticamente si no existen",
          "Validas que no haya conflictos de horarios"
        ]
      },
    ],
    tone: 70,
    answer: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await agentsDb.insert(agentConFlujos);
  console.log(`\n🤖 Agente CON FLUJOS: ${agentConFlujos.name}`);

  // ========== AGENTE 2: SIN FLUJOS (Básico) ==========
  const agentSinFlujos = {
    _id: uuidv4(),
    name: "Asistente PetCare Básico",
    description: "Agente básico SIN FLUJOS - Solo consultas simples y creación básica",
    workspaceId,
    type: "public",
    aiModel: ["gpt-4o-mini"],
    language: "es",
    tables: createdTables.map(t => ({ id: t.id, tableId: t.id, title: t.name })),
    hasFlows: false,
    instructions: [
      {
        title: "Identidad",
        actions: [
          "Eres el asistente virtual básico de Veterinaria PetCare",
          "Puedes responder preguntas y crear registros simples",
          "NO tienes validación de disponibilidad avanzada"
        ]
      },
      {
        title: "Limitaciones",
        actions: [
          "Solo puedes crear citas sin verificar disponibilidad",
          "No asignas veterinarios automáticamente",
          "Recomienda usar el Asistente Pro para funciones avanzadas"
        ]
      },
    ],
    tone: 60,
    answer: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await agentsDb.insert(agentSinFlujos);
  console.log(`🤖 Agente SIN FLUJOS: ${agentSinFlujos.name}`);

  // 4. Crear Flujos (solo para el agente con flujos)
  const flowsDb = await connectDB(getFlowsDbName(workspaceId));
  
  const citasTable = createdTables.find(t => t.name === "Citas");
  const mascotasTable = createdTables.find(t => t.name === "Mascotas");
  const vetsTable = createdTables.find(t => t.name === "Veterinarios");
  const serviciosTable = createdTables.find(t => t.name === "Servicios");
  const inventarioTable = createdTables.find(t => t.name === "Inventario");

  // ========== FLUJO 1: Agendar Citas ==========
  const flowAgendarCitas = {
    _id: uuidv4(),
    name: "Agendar Citas",
    description: "Flujo para agendar citas con validación de disponibilidad",
    agentId: agentConFlujos._id,
    mainTable: citasTable?.id || null,
    trigger: "create",
    isActive: true,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "🚀 Trigger", trigger: "create" },
      },
      {
        id: "table-mascotas",
        type: "table",
        position: { x: 100, y: 180 },
        data: { label: "📋 Mascotas", tableId: mascotasTable?.id, action: "validate" },
      },
      {
        id: "availability-1",
        type: "availability",
        position: { x: 500, y: 180 },
        data: { label: "📅 Disponibilidad", staffTable: vetsTable?.id },
      },
      {
        id: "action-autocreate",
        type: "action",
        position: { x: 100, y: 320 },
        data: { label: "⚡ Auto-crear mascota", action: "auto_create" },
      },
      {
        id: "action-assign",
        type: "action",
        position: { x: 500, y: 320 },
        data: { label: "⚡ Asignar veterinario", action: "auto_assign" },
      },
      {
        id: "table-citas",
        type: "table",
        position: { x: 300, y: 450 },
        data: { label: "📋 Crear Cita", tableId: citasTable?.id, action: "create" },
      },
      {
        id: "response-success",
        type: "response",
        position: { x: 300, y: 580 },
        data: { label: "💬 Confirmación", type: "success" },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "table-mascotas", animated: true },
      { id: "e2", source: "trigger-1", target: "availability-1", animated: true },
      { id: "e3", source: "table-mascotas", target: "action-autocreate", animated: true },
      { id: "e4", source: "availability-1", target: "action-assign", animated: true },
      { id: "e5", source: "action-autocreate", target: "table-citas", animated: true },
      { id: "e6", source: "action-assign", target: "table-citas", animated: true },
      { id: "e7", source: "table-citas", target: "response-success", animated: true },
    ],
    connections: [
      { tableId: mascotasTable?.id, tableName: "Mascotas", type: "relation", config: { autoCreate: true } },
      { tableId: vetsTable?.id, tableName: "Veterinarios", type: "availability", config: { autoAssign: true } },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await flowsDb.insert(flowAgendarCitas);
  console.log(`\n🔄 Flujo creado: ${flowAgendarCitas.name}`);

  // ========== FLUJO 2: Cancelar Citas ==========
  const flowCancelarCitas = {
    _id: uuidv4(),
    name: "Cancelar Citas",
    description: "Flujo para cancelar citas existentes",
    agentId: agentConFlujos._id,
    mainTable: citasTable?.id || null,
    trigger: "update",
    isActive: true,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "🚀 Cancelar", trigger: "update" },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 300, y: 180 },
        data: { label: "❓ ¿Existe la cita?", condition: "exists" },
      },
      {
        id: "action-cancel",
        type: "action",
        position: { x: 150, y: 320 },
        data: { label: "⚡ Cambiar estado", action: "set_value", field: "estado", value: "Cancelada" },
      },
      {
        id: "response-error",
        type: "response",
        position: { x: 450, y: 320 },
        data: { label: "💬 No encontrada", type: "error" },
      },
      {
        id: "response-success",
        type: "response",
        position: { x: 150, y: 450 },
        data: { label: "💬 Cancelada", type: "success" },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-1", animated: true },
      { id: "e2", source: "condition-1", target: "action-cancel", sourceHandle: "yes", animated: true },
      { id: "e3", source: "condition-1", target: "response-error", sourceHandle: "no", animated: true },
      { id: "e4", source: "action-cancel", target: "response-success", animated: true },
    ],
    connections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await flowsDb.insert(flowCancelarCitas);
  console.log(`🔄 Flujo creado: ${flowCancelarCitas.name}`);

  // ========== FLUJO 3: Consultar Disponibilidad ==========
  const flowDisponibilidad = {
    _id: uuidv4(),
    name: "Consultar Disponibilidad",
    description: "Flujo para mostrar horarios disponibles",
    agentId: agentConFlujos._id,
    mainTable: citasTable?.id || null,
    trigger: "availability",
    isActive: true,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "🚀 Disponibilidad", trigger: "availability" },
      },
      {
        id: "table-citas",
        type: "table",
        position: { x: 150, y: 180 },
        data: { label: "📋 Buscar Citas", tableId: citasTable?.id, action: "read" },
      },
      {
        id: "table-vets",
        type: "table",
        position: { x: 450, y: 180 },
        data: { label: "📋 Veterinarios", tableId: vetsTable?.id, action: "read" },
      },
      {
        id: "action-calc",
        type: "action",
        position: { x: 300, y: 320 },
        data: { label: "⚡ Calcular horarios libres", action: "calculate_availability" },
      },
      {
        id: "response-1",
        type: "response",
        position: { x: 300, y: 450 },
        data: { label: "💬 Mostrar disponibilidad", type: "options" },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "table-citas", animated: true },
      { id: "e2", source: "trigger-1", target: "table-vets", animated: true },
      { id: "e3", source: "table-citas", target: "action-calc", animated: true },
      { id: "e4", source: "table-vets", target: "action-calc", animated: true },
      { id: "e5", source: "action-calc", target: "response-1", animated: true },
    ],
    connections: [
      { tableId: vetsTable?.id, tableName: "Veterinarios", type: "staff" },
      { tableId: citasTable?.id, tableName: "Citas", type: "appointments" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await flowsDb.insert(flowDisponibilidad);
  console.log(`🔄 Flujo creado: ${flowDisponibilidad.name}`);

  // ========== FLUJO 4: Vender Producto ==========
  const flowVenderProducto = {
    _id: uuidv4(),
    name: "Vender Producto",
    description: "Flujo para venta de productos del inventario",
    agentId: agentConFlujos._id,
    mainTable: inventarioTable?.id || null,
    trigger: "update",
    isActive: true,
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 300, y: 50 },
        data: { label: "🚀 Vender", trigger: "update" },
      },
      {
        id: "condition-stock",
        type: "condition",
        position: { x: 300, y: 180 },
        data: { label: "❓ ¿Hay stock?", condition: "greater", field: "stock", value: 0 },
      },
      {
        id: "action-reduce",
        type: "action",
        position: { x: 150, y: 320 },
        data: { label: "⚡ Reducir stock", action: "decrement", field: "stock" },
      },
      {
        id: "response-nostock",
        type: "response",
        position: { x: 450, y: 320 },
        data: { label: "💬 Sin stock", type: "error", message: "No hay stock disponible" },
      },
      {
        id: "response-success",
        type: "response",
        position: { x: 150, y: 450 },
        data: { label: "💬 Vendido", type: "success" },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "condition-stock", animated: true },
      { id: "e2", source: "condition-stock", target: "action-reduce", sourceHandle: "yes", animated: true },
      { id: "e3", source: "condition-stock", target: "response-nostock", sourceHandle: "no", animated: true },
      { id: "e4", source: "action-reduce", target: "response-success", animated: true },
    ],
    connections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await flowsDb.insert(flowVenderProducto);
  console.log(`🔄 Flujo creado: ${flowVenderProducto.name}`);

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("🎉 SEED COMPLETADO");
  console.log("=".repeat(60));
  console.log(`\n📦 Workspace ID: ${workspaceId}`);
  console.log(`📋 Tablas creadas: ${createdTables.length}`);
  createdTables.forEach(t => console.log(`   - ${t.name} (${t.id})`));
  console.log(`\n🤖 Agentes creados:`);
  console.log(`   - ${agentConFlujos.name} (CON FLUJOS) - ID: ${agentConFlujos._id}`);
  console.log(`   - ${agentSinFlujos.name} (SIN FLUJOS) - ID: ${agentSinFlujos._id}`);
  console.log(`\n🔄 Flujos creados: 4`);
  console.log(`   - ${flowAgendarCitas.name}`);
  console.log(`   - ${flowCancelarCitas.name}`);
  console.log(`   - ${flowDisponibilidad.name}`);
  console.log(`   - ${flowVenderProducto.name}`);
  console.log("\n💡 Copia el Workspace ID para usarlo en el frontend.\n");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en seed:", err);
    process.exit(1);
  });
