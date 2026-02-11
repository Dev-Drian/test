/**
 * Seed PREMIUM: CRM Completo
 * 
 * Sistema completo de gestión con:
 * - 5 Tablas interconectadas (Clientes, Productos, Ventas, Seguimientos, Tareas)
 * - 2 Agentes especializados (Ventas y Estadísticas)
 * - Flujos automatizados
 * - Relaciones entre tablas
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName, getAgentsDbName, getFlowsDbName } from '../config/db.js';

const WORKSPACE_ID = 'premium-crm';
const WORKSPACE_NAME = 'CRM Premium';

export async function seed() {
  console.log(`\n[Seed] Iniciando seed PREMIUM para ${WORKSPACE_NAME}...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    
    // ========== TABLA 1: CLIENTES ==========
    const clientesTableId = uuidv4();
    const clientesTable = {
      _id: clientesTableId,
      name: 'Clientes',
      type: 'customers',
      displayField: 'nombre',
      description: 'Base de datos de clientes',
      headers: [
        { key: 'nombre', label: 'Nombre Completo', type: 'text', required: true, emoji: '👤', priority: 1 },
        { key: 'email', label: 'Email', type: 'email', required: true, emoji: '📧', priority: 2 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 3, validation: { digits: 10 } },
        { key: 'empresa', label: 'Empresa', type: 'text', required: false, emoji: '🏢', priority: 4 },
        { key: 'tipo', label: 'Tipo', type: 'select', required: true, emoji: '🏷️', options: ['Lead', 'Cliente', 'VIP'], defaultValue: 'Lead', priority: 5 },
        { key: 'fechaRegistro', label: 'Fecha Registro', type: 'date', required: false, emoji: '📅', defaultValue: 'today' },
        { key: 'estado', label: 'Estado', type: 'select', required: false, hiddenFromChat: true, emoji: '📊', options: ['Activo', 'Inactivo', 'Pendiente'], defaultValue: 'Activo' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(clientesTable);
    console.log('✅ Tabla Clientes creada');
    
    // ========== TABLA 2: PRODUCTOS ==========
    const productosTableId = uuidv4();
    const productosTable = {
      _id: productosTableId,
      name: 'Productos',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Catálogo de productos/servicios',
      headers: [
        { key: 'nombre', label: 'Producto', type: 'text', required: true, emoji: '📦', priority: 1 },
        { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '🏷️', options: ['Software', 'Hardware', 'Servicio', 'Consultoría'], priority: 2 },
        { key: 'precio', label: 'Precio', type: 'number', required: true, emoji: '💰', priority: 3, validation: { min: 0 } },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝' },
        { key: 'stock', label: 'Stock', type: 'number', required: false, emoji: '📊', validation: { min: 0 }, defaultValue: 0 }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(productosTable);
    console.log('✅ Tabla Productos creada');
    
    // ========== TABLA 3: VENTAS ==========
    const ventasTableId = uuidv4();
    const ventasTable = {
      _id: ventasTableId,
      name: 'Ventas',
      type: 'transactions',
      displayField: 'cliente',
      description: 'Registro de ventas realizadas',
      headers: [
        { 
          key: 'cliente', 
          label: 'Cliente', 
          type: 'relation', 
          required: true, 
          emoji: '👤', 
          priority: 1,
          relation: {
            tableName: 'Clientes',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            validateOnInput: false,
            showOptionsOnNotFound: true
          }
        },
        { 
          key: 'producto', 
          label: 'Producto', 
          type: 'relation', 
          required: true, 
          emoji: '📦', 
          priority: 2,
          relation: {
            tableName: 'Productos',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            validateOnInput: true,
            showOptionsOnNotFound: true
          }
        },
        { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, emoji: '🔢', priority: 3, validation: { min: 1 } },
        { key: 'total', label: 'Total', type: 'number', required: false, hiddenFromChat: true, emoji: '💵', priority: 4, validation: { min: 0 }, defaultValue: 0, autoCalculate: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: false, hiddenFromChat: true, emoji: '📅', priority: 5, defaultValue: 'today' },
        { key: 'estadoPago', label: 'Estado Pago', type: 'select', required: false, hiddenFromChat: true, emoji: '💳', options: ['Pendiente', 'Pagado', 'Cancelado'], defaultValue: 'Pendiente' },
        { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(ventasTable);
    console.log('✅ Tabla Ventas creada');
    
    // ========== TABLA 4: SEGUIMIENTOS ==========
    const seguimientosTableId = uuidv4();
    const seguimientosTable = {
      _id: seguimientosTableId,
      name: 'Seguimientos',
      type: 'followups',
      displayField: 'cliente',
      description: 'Seguimiento a clientes potenciales',
      headers: [
        { 
          key: 'cliente', 
          label: 'Cliente', 
          type: 'relation', 
          required: true, 
          emoji: '👤', 
          priority: 1,
          relation: {
            tableName: 'Clientes',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            validateOnInput: false,
            showOptionsOnNotFound: true
          }
        },
        { key: 'fecha', label: 'Fecha Seguimiento', type: 'date', required: true, emoji: '📅', priority: 2 },
        { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', priority: 3 },
        { key: 'tipo', label: 'Tipo', type: 'select', required: true, emoji: '📞', options: ['Llamada', 'Email', 'Reunión', 'WhatsApp'], priority: 4 },
        { key: 'resultado', label: 'Resultado', type: 'select', required: false, emoji: '✅', options: ['Exitoso', 'Sin respuesta', 'Reagendar', 'No interesado'] },
        { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(seguimientosTable);
    console.log('✅ Tabla Seguimientos creada');
    
    // ========== TABLA 5: TAREAS ==========
    const tareasTableId = uuidv4();
    const tareasTable = {
      _id: tareasTableId,
      name: 'Tareas',
      type: 'tasks',
      displayField: 'titulo',
      description: 'Gestión de tareas del equipo',
      headers: [
        { key: 'titulo', label: 'Título', type: 'text', required: true, emoji: '✏️', priority: 1 },
        { key: 'descripcion', label: 'Descripción', type: 'text', required: false, emoji: '📝' },
        { key: 'prioridad', label: 'Prioridad', type: 'select', required: true, emoji: '🎯', options: ['Baja', 'Media', 'Alta', 'Urgente'], defaultValue: 'Media', priority: 2 },
        { key: 'fechaVencimiento', label: 'Fecha Vencimiento', type: 'date', required: true, emoji: '📅', priority: 3 },
        { key: 'responsable', label: 'Responsable', type: 'text', required: false, emoji: '👤' },
        { key: 'estadoTarea', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Pendiente', 'En Progreso', 'Completada', 'Bloqueada'], defaultValue: 'Pendiente' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(tareasTable);
    console.log('✅ Tabla Tareas creada');
    
    // ========== TABLA 6: PROVEEDORES ==========
    const proveedoresTableId = uuidv4();
    const proveedoresTable = {
      _id: proveedoresTableId,
      name: 'Proveedores',
      type: 'suppliers',
      displayField: 'nombre',
      description: 'Proveedores de productos',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '🏭', priority: 1 },
        { key: 'contacto', label: 'Contacto', type: 'text', required: true, emoji: '👤', priority: 2 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, emoji: '📱', priority: 3, validation: { digits: 10 } },
        { key: 'email', label: 'Email', type: 'email', required: true, emoji: '📧', priority: 4 },
        { key: 'categoria', label: 'Categoría', type: 'select', required: true, emoji: '🏷️', options: ['Tecnología', 'Oficina', 'Servicios'], priority: 5 },
        { key: 'calificacion', label: 'Calificación', type: 'number', required: false, emoji: '⭐', validation: { min: 1, max: 5 } }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(proveedoresTable);
    console.log('✅ Tabla Proveedores creada');
    
    // ========== TABLA 7: FACTURAS ==========
    const facturasTableId = uuidv4();
    const facturasTable = {
      _id: facturasTableId,
      name: 'Facturas',
      type: 'invoices',
      displayField: 'numeroFactura',
      description: 'Facturas generadas',
      headers: [
        { key: 'numeroFactura', label: 'Número', type: 'text', required: true, emoji: '🧾', priority: 1 },
        { 
          key: 'cliente', 
          label: 'Cliente', 
          type: 'relation', 
          required: true, 
          emoji: '👤', 
          priority: 2,
          relation: {
            tableName: 'Clientes',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            validateOnInput: true,
            showOptionsOnNotFound: true
          }
        },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', priority: 3, defaultValue: 'today' },
        { key: 'subtotal', label: 'Subtotal', type: 'number', required: true, emoji: '💵', validation: { min: 0 } },
        { key: 'iva', label: 'IVA', type: 'number', required: true, emoji: '📊', validation: { min: 0 } },
        { key: 'total', label: 'Total', type: 'number', required: true, emoji: '💰', validation: { min: 0 } },
        { key: 'estadoFactura', label: 'Estado', type: 'select', required: true, emoji: '✅', options: ['Pendiente', 'Pagada', 'Vencida'], defaultValue: 'Pendiente' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(facturasTable);
    console.log('✅ Tabla Facturas creada');
    
    // ========== TABLA 8: CAMPAÑAS ==========
    const campanasTableId = uuidv4();
    const campanasTable = {
      _id: campanasTableId,
      name: 'Campañas',
      type: 'marketing',
      displayField: 'nombre',
      description: 'Campañas de marketing',
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, emoji: '📢', priority: 1 },
        { key: 'tipo', label: 'Tipo', type: 'select', required: true, emoji: '🎯', options: ['Email', 'WhatsApp', 'SMS', 'Redes Sociales'], priority: 2 },
        { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date', required: true, emoji: '📅', priority: 3 },
        { key: 'fechaFin', label: 'Fecha Fin', type: 'date', required: false, emoji: '📅' },
        { key: 'presupuesto', label: 'Presupuesto', type: 'number', required: false, emoji: '💰', validation: { min: 0 } },
        { key: 'alcance', label: 'Alcance', type: 'number', required: false, emoji: '👥', validation: { min: 0 } },
        { key: 'conversiones', label: 'Conversiones', type: 'number', required: false, emoji: '✅', validation: { min: 0 }, defaultValue: 0 },
        { key: 'estadoCampana', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Borrador', 'Activa', 'Pausada', 'Finalizada'], defaultValue: 'Borrador' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(campanasTable);
    console.log('✅ Tabla Campañas creada');
    
    // ========== TABLA 9: LOG DE FLUJOS ==========
    const flowLogsTableId = uuidv4();
    const flowLogsTable = {
      _id: flowLogsTableId,
      name: 'Log de Flujos',
      type: 'system_logs',
      displayField: 'flowName',
      description: 'Registro de ejecución de flujos automatizados',
      isSystemTable: true,
      headers: [
        { key: 'flowId', label: 'Flow ID', type: 'text', required: true, emoji: '🔗', priority: 1 },
        { key: 'flowName', label: 'Nombre del Flujo', type: 'text', required: true, emoji: '⚡', priority: 2 },
        { key: 'triggerType', label: 'Tipo Trigger', type: 'select', required: true, emoji: '🎯', options: ['create', 'update', 'delete', 'beforeCreate', 'manual'], priority: 3 },
        { key: 'triggerTable', label: 'Tabla Origen', type: 'text', required: true, emoji: '📋', priority: 4 },
        { key: 'triggerRecordId', label: 'Registro Origen', type: 'text', required: false, emoji: '🔍' },
        { key: 'status', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['pending', 'running', 'completed', 'failed', 'skipped'], defaultValue: 'pending', priority: 5 },
        { key: 'startedAt', label: 'Inicio', type: 'datetime', required: false, emoji: '🕐' },
        { key: 'completedAt', label: 'Fin', type: 'datetime', required: false, emoji: '🕑' },
        { key: 'duration', label: 'Duración (ms)', type: 'number', required: false, emoji: '⏱️' },
        { key: 'nodesExecuted', label: 'Nodos Ejecutados', type: 'number', required: false, emoji: '🔢', defaultValue: 0 },
        { key: 'errorMessage', label: 'Error', type: 'text', required: false, emoji: '❌' },
        { key: 'resultSummary', label: 'Resumen', type: 'text', required: false, emoji: '📝' },
        { key: 'executionDetails', label: 'Detalles JSON', type: 'text', required: false, emoji: '📄' }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(flowLogsTable);
    console.log('✅ Tabla Log de Flujos creada');
    
    // ========== AGENTE 1: VENTAS ==========
    const agenteVentasId = uuidv4();
    const agenteVentas = {
      _id: agenteVentasId,
      type: 'agent',
      name: 'Asistente de Ventas',
      description: 'Especializado en registrar ventas y gestionar clientes',
      tables: [clientesTableId, productosTableId, ventasTableId, proveedoresTableId, facturasTableId],
      prompt: `Eres el asistente de ventas del CRM ${WORKSPACE_NAME}.

TU FUNCIÓN:
- Registrar nuevos clientes, productos y ventas
- Gestionar proveedores y facturas
- Consultar productos disponibles y su stock
- Calcular totales de ventas
- Actualizar información de clientes

INFORMACIÓN DISPONIBLE:
- Clientes: nombre, email, teléfono, empresa, tipo
- Productos: nombre, categoría, precio, stock
- Ventas: cliente, producto, cantidad, total, fecha

PROCESO DE VENTA:
1. Verifica si el cliente existe (consulta tabla Clientes)
2. Si no existe, registra primero al cliente
3. Consulta el producto disponible
4. Solicita la cantidad
5. Calcula el total (precio × cantidad)
6. Registra la venta

VALIDACIONES:
- Cliente debe existir en la tabla Clientes
VALIDACIONES IMPORTANTES:
- Cliente debe existir en tabla Clientes
- Producto debe existir en tabla Productos
- Cantidad debe ser mayor a 0
- NUNCA pidas el Total, se calcula automáticamente (precio × cantidad)
- El sistema valida stock disponible automáticamente

REGLAS:
- Sé proactivo: si el cliente no existe, ofrece registrarlo
- Muestra productos con precios y stock cuando te pregunten
- Al registrar venta, solo pide: cliente, producto, cantidad
- Confirma todos los datos antes de crear la venta
- Usa formato claro: "Cliente: X, Producto: Y, Cantidad: Z"

Mantén un tono profesional y amigable. Usa emojis apropiados.`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,
      hasFlows: true,
      planFeatures: {
        canCreate: true,
        canUpdate: true,
        canQuery: true,
        canDelete: false,
        hasAutomations: true
      },
      active: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agenteVentas);
    console.log('✅ Agente de Ventas creado');
    
    // ========== AGENTE 2: ESTADÍSTICAS ==========
    const agenteEstadisticasId = uuidv4();
    const agenteEstadisticas = {
      _id: agenteEstadisticasId,
      type: 'agent',
      name: 'Analista de Datos',
      description: 'Especializado en análisis y reportes',
      tables: [clientesTableId, productosTableId, ventasTableId, seguimientosTableId, tareasTableId, proveedoresTableId, facturasTableId, campanasTableId],
      prompt: `Eres el analista de datos del CRM ${WORKSPACE_NAME}.

TU FUNCIÓN:
- Generar reportes y estadísticas de ventas, clientes, campañas
- Analizar tendencias de ventas y rendimiento de productos
- Mostrar métricas clave del negocio (ROI, conversiones, facturación)
- Identificar oportunidades y problemas (stock bajo, clientes inactivos)

ACCESO A DATOS:
- Clientes (total, tipos, nuevos)
- Productos (más vendidos, categorías)
- Ventas (totales, promedios, por periodo)
- Seguimientos (efectividad, pendientes)
- Tareas (completadas, pendientes, por prioridad)

REPORTES QUE PUEDES GENERAR:
📊 Ventas totales del periodo
📈 Productos más vendidos
👥 Clientes por tipo (Lead/Cliente/VIP)
💰 Ticket promedio
📞 Seguimientos pendientes
✅ Tareas por estado

ANÁLISIS AUTOMÁTICO:
- Compara periodos (mes actual vs anterior)
- Identifica tendencias (crecimiento/decrecimiento)
- Detecta clientes inactivos
- Sugiere acciones basadas en datos

FORMATO DE RESPUESTA:
- Usa tablas para datos comparativos
- Incluye porcentajes y totales
- Destaca insights importantes
- Sugiere acciones concretas

Sé analítico, objetivo y orientado a resultados. Usa gráficos de texto cuando sea útil.`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,
      hasFlows: true,
      planFeatures: {
        canCreate: false,  // Analista no crea, solo consulta
        canUpdate: false,
        canQuery: true,
        canDelete: false,
        hasAnalytics: true
      },
      active: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agenteEstadisticas);
    console.log('✅ Agente Analista creado');
    
    // ========== WORKSPACE DOC ==========
    const workspaceDoc = {
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Sistema CRM completo con múltiples agentes',
      type: 'crm-premium',
      defaultAgentId: agenteVentasId,
      plan: 'premium',
      settings: {
        timezone: 'America/Bogota',
        currency: 'COP',
        language: 'es'
      },
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(workspaceDoc);
    
    const centralWorkspaceDoc = {
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      color: 'rgb(16, 185, 129)', // verde para premium
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seed',
      plan: 'premium',
      members: []
    };
    await workspacesDb.insert(centralWorkspaceDoc);
    console.log('✅ Workspace configurado');
    
    // ========== FLUJOS AUTOMATIZADOS ==========
    const flowsDb = await connectDB(getFlowsDbName(WORKSPACE_ID));
    
    // FLUJO 1: Seguimiento automático después de venta
    const flow1Id = uuidv4();
    const flow1 = {
      _id: flow1Id,
      name: 'Seguimiento Post-Venta',
      description: 'Crea un seguimiento automático cuando se registra una venta',
      agentId: agenteVentasId,
      mainTable: ventasTableId,
      trigger: 'create',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 100, y: 50 },
          data: {
            label: 'Nueva Venta',
            trigger: 'create',
            description: 'Cuando se crea una venta'
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 100, y: 150 },
          data: {
            label: 'Venta > $500k',
            field: 'total',
            operator: '>',
            value: 500000
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 50, y: 280 },
          data: {
            label: 'Crear Seguimiento VIP',
            actionType: 'create',
            targetTable: seguimientosTableId,
            fields: {
              cliente: '{{cliente}}',
              fecha: '{{nextWeek}}',
              hora: '10:00',
              tipo: 'Reunión',
              notas: 'Seguimiento VIP - Venta mayor a $500k'
            }
          }
        },
        {
          id: 'action-2',
          type: 'action',
          position: { x: 200, y: 280 },
          data: {
            label: 'Crear Seguimiento Normal',
            actionType: 'create',
            targetTable: seguimientosTableId,
            fields: {
              cliente: '{{cliente}}',
              fecha: '{{nextWeek}}',
              hora: '14:00',
              tipo: 'Llamada',
              notas: 'Seguimiento post-venta'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-3', source: 'condition-1', target: 'action-1', label: 'Sí' },
        { id: 'e2-4', source: 'condition-1', target: 'action-2', label: 'No' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow1);
    console.log('✅ Flujo 1: Seguimiento Post-Venta');
    
    // FLUJO 2: Bienvenida a nuevo cliente
    const flow2Id = uuidv4();
    const flow2 = {
      _id: flow2Id,
      name: 'Bienvenida Cliente Nuevo',
      description: 'Crea tarea de bienvenida cuando se registra un cliente',
      agentId: agenteVentasId,
      mainTable: clientesTableId,
      trigger: 'create',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Nuevo Cliente',
            trigger: 'create',
            description: 'Cuando se registra un cliente'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 180 },
          data: {
            label: 'Crear Tarea de Bienvenida',
            actionType: 'create',
            targetTable: tareasTableId,
            fields: {
              titulo: 'Llamar a {{nombre}}',
              descripcion: 'Primera llamada de bienvenida al cliente nuevo',
              prioridad: 'Alta',
              fechaVencimiento: '{{tomorrow}}',
              estadoTarea: 'Pendiente'
            }
          }
        },
        {
          id: 'action-2',
          type: 'action',
          position: { x: 150, y: 310 },
          data: {
            label: 'Enviar Email',
            actionType: 'notification',
            notificationType: 'email',
            template: 'Bienvenido {{nombre}}! Gracias por registrarte.'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
        { id: 'e2-3', source: 'action-1', target: 'action-2' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow2);
    console.log('✅ Flujo 2: Bienvenida Cliente Nuevo');
    
    // FLUJO 3: Recordatorio de pago pendiente
    const flow3Id = uuidv4();
    const flow3 = {
      _id: flow3Id,
      name: 'Recordatorio Pago Pendiente',
      description: 'Crea tarea de recordatorio para ventas pendientes',
      agentId: agenteVentasId,
      mainTable: ventasTableId,
      trigger: 'create',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Venta Creada',
            trigger: 'create',
            description: 'Cuando se registra una venta'
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 150, y: 150 },
          data: {
            label: 'Estado = Pendiente',
            field: 'estadoPago',
            operator: '==',
            value: 'Pendiente'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 280 },
          data: {
            label: 'Crear Tarea Recordatorio',
            actionType: 'create',
            targetTable: tareasTableId,
            fields: {
              titulo: 'Recordar pago a {{cliente}}',
              descripcion: 'Venta #{{_id}} - Total: ${{total}}',
              prioridad: 'Media',
              fechaVencimiento: '{{in3Days}}',
              estadoTarea: 'Pendiente'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-3', source: 'condition-1', target: 'action-1', label: 'Sí' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow3);
    console.log('✅ Flujo 3: Recordatorio Pago Pendiente');
    
    // FLUJO 4: Actualización de tipo de cliente
    const flow4Id = uuidv4();
    const flow4 = {
      _id: flow4Id,
      name: 'Upgrade Cliente a VIP',
      description: 'Actualiza cliente a VIP cuando acumula 3 ventas',
      agentId: agenteVentasId,
      mainTable: ventasTableId,
      trigger: 'create',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Nueva Venta',
            trigger: 'create'
          }
        },
        {
          id: 'query-1',
          type: 'query',
          position: { x: 150, y: 150 },
          data: {
            label: 'Contar Ventas del Cliente',
            sourceTable: ventasTableId,
            filter: { cliente: '{{cliente}}' }
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 150, y: 250 },
          data: {
            label: '>=3 ventas',
            field: 'count',
            operator: '>=',
            value: 3
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 380 },
          data: {
            label: 'Actualizar a VIP',
            actionType: 'update',
            targetTable: clientesTableId,
            filter: { nombre: '{{cliente}}' },
            fields: {
              tipo: 'VIP'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'query-1' },
        { id: 'e2-3', source: 'query-1', target: 'condition-1' },
        { id: 'e3-4', source: 'condition-1', target: 'action-1', label: 'Sí' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow4);
    console.log('✅ Flujo 4: Upgrade Cliente a VIP');
    
    // ========== FLUJO 5: VALIDAR STOCK ANTES DE VENTA ==========
    const flow5Id = uuidv4();
    const flow5 = {
      _id: flow5Id,
      name: 'Validar Stock Disponible',
      description: 'Valida que haya stock suficiente antes de crear una venta',
      triggerType: 'beforeCreate',
      triggerTable: ventasTableId,
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Antes de crear Venta',
            event: 'beforeCreate',
            table: ventasTableId
          }
        },
        {
          id: 'query-1',
          type: 'query',
          position: { x: 150, y: 150 },
          data: {
            label: 'Obtener stock actual',
            queryType: 'findOne',
            targetTable: productosTableId,
            filter: { nombre: '{{producto}}' },
            outputVar: 'productoData'
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 150, y: 250 },
          data: {
            label: 'Stock suficiente?',
            field: 'productoData.stock',
            operator: '>=',
            value: '{{cantidad}}'
          }
        },
        {
          id: 'action-error',
          type: 'action',
          position: { x: 50, y: 380 },
          data: {
            label: 'Rechazar venta',
            actionType: 'error',
            message: '❌ Stock insuficiente. Disponible: {{productoData.stock}} unidades'
          }
        },
        {
          id: 'action-allow',
          type: 'action',
          position: { x: 250, y: 380 },
          data: {
            label: 'Permitir venta',
            actionType: 'allow'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'query-1' },
        { id: 'e2-3', source: 'query-1', target: 'condition-1' },
        { id: 'e3-error', source: 'condition-1', target: 'action-error', label: 'No' },
        { id: 'e3-allow', source: 'condition-1', target: 'action-allow', label: 'Sí' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow5);
    console.log('✅ Flujo 5: Validar Stock Disponible');
    
    // ========== FLUJO 6: AUTO-CALCULAR TOTAL DE VENTA ==========
    const flow6Id = uuidv4();
    const flow6 = {
      _id: flow6Id,
      name: 'Calcular Total de Venta',
      description: 'Calcula automáticamente el total multiplicando precio × cantidad',
      triggerType: 'create',
      triggerTable: ventasTableId,
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Venta creada',
            event: 'create',
            table: ventasTableId
          }
        },
        {
          id: 'query-1',
          type: 'query',
          position: { x: 150, y: 150 },
          data: {
            label: 'Obtener precio producto',
            queryType: 'findOne',
            targetTable: productosTableId,
            filter: { nombre: '{{producto}}' },
            outputVar: 'productoData'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 280 },
          data: {
            label: 'Actualizar Total',
            actionType: 'update',
            targetTable: ventasTableId,
            filter: { _id: '{{_id}}' },
            fields: {
              total: '{{productoData.precio * cantidad}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'query-1' },
        { id: 'e2-3', source: 'query-1', target: 'action-1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow6);
    console.log('✅ Flujo 6: Calcular Total de Venta');
    
    // ========== FLUJO 7: ACTUALIZAR STOCK DESPUÉS DE VENTA ==========
    const flow7Id = uuidv4();
    const flow7 = {
      _id: flow7Id,
      name: 'Descontar Stock',
      description: 'Descuenta el stock del producto después de una venta',
      triggerType: 'create',
      triggerTable: ventasTableId,
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Venta creada',
            event: 'create',
            table: ventasTableId
          }
        },
        {
          id: 'query-1',
          type: 'query',
          position: { x: 150, y: 150 },
          data: {
            label: 'Obtener producto',
            queryType: 'findOne',
            targetTable: productosTableId,
            filter: { nombre: '{{producto}}' },
            outputVar: 'productoData'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 280 },
          data: {
            label: 'Descontar stock',
            actionType: 'update',
            targetTable: productosTableId,
            filter: { nombre: '{{producto}}' },
            fields: {
              stock: '{{productoData.stock - cantidad}}'
            }
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'query-1' },
        { id: 'e2-3', source: 'query-1', target: 'action-1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow7);
    console.log('✅ Flujo 7: Descontar Stock');
    
    // ========== FLUJO 8: ALERTA STOCK BAJO ==========
    const flow8Id = uuidv4();
    const flow8 = {
      _id: flow8Id,
      name: 'Alerta Stock Bajo',
      description: 'Crea tarea cuando stock baja de 10 unidades',
      triggerType: 'update',
      triggerTable: productosTableId,
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Producto actualizado',
            event: 'update',
            table: productosTableId
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 150, y: 150 },
          data: {
            label: 'Stock < 10',
            field: 'stock',
            operator: '<',
            value: 10
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 280 },
          data: {
            label: 'Crear tarea reabastecimiento',
            actionType: 'create',
            targetTable: tareasTableId,
            fields: {
              titulo: 'Reabastecer: {{nombre}}',
              descripcion: 'Stock crítico: {{stock}} unidades. Contactar proveedor.',
              prioridad: 'Alta',
              fechaVencimiento: '{{today + 3}}',
              estadoTarea: 'Pendiente'
            }
          }
        },
        {
          id: 'notification-1',
          type: 'notification',
          position: { x: 150, y: 410 },
          data: {
            label: 'Notificar equipo',
            channel: 'email',
            message: '⚠️ Stock bajo de {{nombre}}: quedan {{stock}} unidades'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-3', source: 'condition-1', target: 'action-1', label: 'Sí' },
        { id: 'e3-4', source: 'action-1', target: 'notification-1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow8);
    console.log('✅ Flujo 8: Alerta Stock Bajo');
    
    // ========== FLUJO 9: GENERACIÓN AUTOMÁTICA DE FACTURA ==========
    const flow9Id = uuidv4();
    const flow9 = {
      _id: flow9Id,
      name: 'Generar Factura Automática',
      description: 'Crea factura automáticamente cuando estado de pago = Pagada',
      triggerType: 'update',
      triggerTable: ventasTableId,
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 150, y: 50 },
          data: {
            label: 'Venta actualizada',
            event: 'update',
            table: ventasTableId
          }
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 150, y: 150 },
          data: {
            label: 'Estado = Pagada',
            field: 'estadoPago',
            operator: '==',
            value: 'Pagada'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 150, y: 280 },
          data: {
            label: 'Crear Factura',
            actionType: 'create',
            targetTable: facturasTableId,
            fields: {
              numeroFactura: 'FAC-{{timestamp}}',
              cliente: '{{cliente}}',
              fecha: '{{today}}',
              subtotal: '{{total / 1.19}}',
              iva: '{{total * 0.19 / 1.19}}',
              total: '{{total}}',
              estadoFactura: 'Pagada'
            }
          }
        },
        {
          id: 'notification-1',
          type: 'notification',
          position: { x: 150, y: 410 },
          data: {
            label: 'Enviar factura por email',
            channel: 'email',
            message: 'Factura generada para {{cliente}}. Total: ${{total}}'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-3', source: 'condition-1', target: 'action-1', label: 'Sí' },
        { id: 'e3-4', source: 'action-1', target: 'notification-1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow9);
    console.log('✅ Flujo 9: Generar Factura Automática');
    
    // ========== DATOS DE EJEMPLO ==========
    
    // CLIENTES
    const clientesDb = await connectDB(getTableDataDbName(WORKSPACE_ID, clientesTableId));
    const clientesEjemplo = [
      { _id: uuidv4(), tableId: clientesTableId, nombre: 'Juan Pérez', email: 'juan@empresa.com', telefono: '3001234567', empresa: 'TechCorp', tipo: 'Cliente', fechaRegistro: '2026-01-15', estado: 'Activo', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: clientesTableId, nombre: 'María García', email: 'maria@startup.co', telefono: '3109876543', empresa: 'Startup XYZ', tipo: 'VIP', fechaRegistro: '2025-12-01', estado: 'Activo', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: clientesTableId, nombre: 'Carlos Ruiz', email: 'carlos@gmail.com', telefono: '3157894561', empresa: null, tipo: 'Lead', fechaRegistro: '2026-02-08', estado: 'Pendiente', createdAt: new Date().toISOString() }
    ];
    for (const cliente of clientesEjemplo) await clientesDb.insert(cliente);
    console.log('✅ Clientes de ejemplo creados');
    
    // PRODUCTOS
    const productosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, productosTableId));
    const productosEjemplo = [
      { _id: uuidv4(), tableId: productosTableId, nombre: 'Software CRM Pro', categoria: 'Software', precio: 500000, descripcion: 'Licencia anual', stock: 100, createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: productosTableId, nombre: 'Consultoría Digital', categoria: 'Consultoría', precio: 1200000, descripcion: 'Paquete 10 horas', stock: 0, createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: productosTableId, nombre: 'Servidor Cloud', categoria: 'Hardware', precio: 800000, descripcion: 'Servidor dedicado mensual', stock: 50, createdAt: new Date().toISOString() }
    ];
    for (const producto of productosEjemplo) await productosDb.insert(producto);
    console.log('✅ Productos de ejemplo creados');
    
    // VENTAS
    const ventasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, ventasTableId));
    const ventasEjemplo = [
      { _id: uuidv4(), tableId: ventasTableId, cliente: 'Juan Pérez', producto: 'Software CRM Pro', cantidad: 2, total: 1000000, fecha: '2026-02-01', estadoPago: 'Pagado', notas: 'Cliente satisfecho', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: ventasTableId, cliente: 'María García', producto: 'Consultoría Digital', cantidad: 1, total: 1200000, fecha: '2026-02-05', estadoPago: 'Pagado', notas: 'Renovación anual', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: ventasTableId, cliente: 'Juan Pérez', producto: 'Servidor Cloud', cantidad: 1, total: 800000, fecha: '2026-02-08', estadoPago: 'Pendiente', notas: '', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: ventasTableId, cliente: 'Carlos Ruiz', producto: 'Software CRM Pro', cantidad: 1, total: 500000, fecha: '2026-02-09', estadoPago: 'Pendiente', notas: '', createdAt: new Date().toISOString() }
    ];
    for (const venta of ventasEjemplo) await ventasDb.insert(venta);
    console.log('✅ Ventas de ejemplo creadas');
    
    // SEGUIMIENTOS
    const seguimientosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, seguimientosTableId));
    const seguimientosEjemplo = [
      { _id: uuidv4(), tableId: seguimientosTableId, cliente: 'Carlos Ruiz', fecha: '2026-02-15', hora: '10:00', tipo: 'Llamada', resultado: 'Sin respuesta', notas: 'Intentar nuevamente', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: seguimientosTableId, cliente: 'María García', fecha: '2026-02-12', hora: '14:30', tipo: 'Reunión', resultado: 'Exitoso', notas: 'Interesada en más servicios', createdAt: new Date().toISOString() }
    ];
    for (const seguimiento of seguimientosEjemplo) await seguimientosDb.insert(seguimiento);
    console.log('✅ Seguimientos de ejemplo creados');
    
    // TAREAS
    const tareasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, tareasTableId));
    const tareasEjemplo = [
      { _id: uuidv4(), tableId: tareasTableId, titulo: 'Revisar propuesta TechCorp', descripcion: 'Preparar presentación para Juan Pérez', prioridad: 'Alta', fechaVencimiento: '2026-02-12', responsable: 'Vendedor', estadoTarea: 'En Progreso', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: tareasTableId, titulo: 'Llamar a Carlos Ruiz', descripcion: 'Seguimiento post-venta', prioridad: 'Media', fechaVencimiento: '2026-02-11', responsable: 'Vendedor', estadoTarea: 'Pendiente', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: tareasTableId, titulo: 'Actualizar catálogo', descripcion: 'Agregar nuevos productos', prioridad: 'Baja', fechaVencimiento: '2026-02-20', responsable: 'Admin', estadoTarea: 'Pendiente', createdAt: new Date().toISOString() }
    ];
    for (const tarea of tareasEjemplo) await tareasDb.insert(tarea);
    console.log('✅ Tareas de ejemplo creadas');
    
    // PROVEEDORES
    const proveedoresDb = await connectDB(getTableDataDbName(WORKSPACE_ID, proveedoresTableId));
    const proveedoresEjemplo = [
      { _id: uuidv4(), tableId: proveedoresTableId, nombre: 'Tech Solutions SA', contacto: 'Roberto Gómez', telefono: '3201234567', email: 'ventas@techsolutions.com', categoria: 'Tecnología', calificacion: 5, createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: proveedoresTableId, nombre: 'Oficina Total', contacto: 'Laura Martínez', telefono: '3109876543', email: 'contacto@oficinatotal.co', categoria: 'Oficina', calificacion: 4, createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: proveedoresTableId, nombre: 'Consultoría Digital', contacto: 'Pedro Silva', telefono: '3157894561', email: 'info@consultoria.com', categoria: 'Servicios', calificacion: 5, createdAt: new Date().toISOString() }
    ];
    for (const proveedor of proveedoresEjemplo) await proveedoresDb.insert(proveedor);
    console.log('✅ Proveedores de ejemplo creados');
    
    // FACTURAS
    const facturasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, facturasTableId));
    const facturasEjemplo = [
      { _id: uuidv4(), tableId: facturasTableId, numeroFactura: 'FAC-2026-001', cliente: 'Juan Pérez', fecha: '2026-01-20', subtotal: 420168, iva: 79832, total: 500000, estadoFactura: 'Pagada', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: facturasTableId, numeroFactura: 'FAC-2026-002', cliente: 'María García', fecha: '2026-02-05', subtotal: 1008403, iva: 191597, total: 1200000, estadoFactura: 'Pagada', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: facturasTableId, numeroFactura: 'FAC-2026-003', cliente: 'Carlos Ruiz', fecha: '2026-02-10', subtotal: 126050, iva: 23950, total: 150000, estadoFactura: 'Pendiente', createdAt: new Date().toISOString() }
    ];
    for (const factura of facturasEjemplo) await facturasDb.insert(factura);
    console.log('✅ Facturas de ejemplo creadas');
    
    // CAMPAÑAS
    const campanasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, campanasTableId));
    const campanasEjemplo = [
      { _id: uuidv4(), tableId: campanasTableId, nombre: 'Lanzamiento Software CRM 2.0', tipo: 'Email', fechaInicio: '2026-01-01', fechaFin: '2026-01-31', presupuesto: 5000000, alcance: 1500, conversiones: 45, estadoCampana: 'Finalizada', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: campanasTableId, nombre: 'Promoción Consultoría', tipo: 'WhatsApp', fechaInicio: '2026-02-01', fechaFin: '2026-02-28', presupuesto: 3000000, alcance: 800, conversiones: 12, estadoCampana: 'Activa', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: campanasTableId, nombre: 'Expansión Redes Sociales', tipo: 'Redes Sociales', fechaInicio: '2026-03-01', fechaFin: '2026-03-31', presupuesto: 8000000, alcance: 5000, conversiones: 0, estadoCampana: 'Borrador', createdAt: new Date().toISOString() }
    ];
    for (const campana of campanasEjemplo) await campanasDb.insert(campana);
    console.log('✅ Campañas de ejemplo creadas');
    
    console.log(`\n✅ Seed PREMIUM completado para ${WORKSPACE_NAME}`);
    console.log(`   Workspace ID: ${WORKSPACE_ID}`);
    console.log(`   Tablas: 8 (Clientes, Productos, Ventas, Seguimientos, Tareas, Proveedores, Facturas, Campañas)`);
    console.log(`   Agentes: 2 (Ventas, Analista)`);
    console.log(`   Flujos: 9 (Post-Venta, Bienvenida, Recordatorio, Upgrade VIP, Validar Stock, Calcular Total, Descontar Stock, Alerta Stock, Facturación)`);
    console.log(`   Datos: ${clientesEjemplo.length} clientes, ${productosEjemplo.length} productos, ${ventasEjemplo.length} ventas, ${proveedoresEjemplo.length} proveedores, ${facturasEjemplo.length} facturas, ${campanasEjemplo.length} campañas`);
    console.log(`   Plan: PREMIUM con automatizaciones avanzadas`);
    
  } catch (error) {
    console.error(`❌ Error en seed PREMIUM:`, error);
    throw error;
  }
}

export default seed;
