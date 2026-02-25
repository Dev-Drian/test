/**
 * Seed PREMIUM: CRM Completo
 * 
 * Sistema completo de gestión con:
 * - 9 Tablas interconectadas (Clientes, Productos, Ventas, Seguimientos, Tareas, Proveedores, Facturas, Campañas, Log de Flujos)
 * - 2 Agentes especializados (Ventas y Analista)
 * - 2 Flujos compactos de negocio:
 *   1. Proceso Completo de Venta (beforeCreate): busca/crea cliente → valida stock → calcula total → descuenta stock → crea seguimiento
 *   2. Bienvenida Cliente Nuevo: crea tarea de llamada + notificación
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
      // Clientes: solo consulta y creación, NO editar ni eliminar (datos sensibles)
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: false,
        allowDelete: false
      },
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
      // Productos: SOLO consulta (catálogo protegido, solo admin lo modifica)
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
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
      // Ventas: consulta, crear y editar (para cambiar estado), NO eliminar
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false
      },
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
      // Seguimientos: todos los permisos (gestión completa)
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: true
      },
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
      // Tareas: todos los permisos (gestión completa)
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: true
      },
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
      // Proveedores: solo consulta (datos de proveedores protegidos)
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
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
      // Facturas: solo consulta (documentos fiscales, no se modifican)
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
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
      // Campañas: consulta, crear y editar, NO eliminar
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false
      },
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
      // Log de Flujos: SOLO consulta (tabla de sistema, solo lectura)
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
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
      tables: [
        { tableId: clientesTableId, fullAccess: true },
        { tableId: productosTableId, fullAccess: true },
        { tableId: ventasTableId, fullAccess: true },
        { tableId: proveedoresTableId, fullAccess: true },
        { tableId: facturasTableId, fullAccess: true },
      ],
      
      // ═══════════════════════════════════════════════════════════
      // V3 LLM-First Configuration
      // ═══════════════════════════════════════════════════════════
      engineMode: 'llm-first',           // V3: usa Function Calling
      vertical: 'retail',                 // V3: vertical de negocio
      toneStyle: 'friendly',              // V3: tono amigable
      
      // V3: Ejemplos de conversación (few-shot learning)
      fewShotExamples: [
        {
          user: 'quiero registrar una venta',
          assistant: '¡Perfecto! Para registrar la venta necesito algunos datos. ¿Me puedes decir el nombre del cliente?'
        },
        {
          user: 'qué productos tienen',
          assistant: 'Te muestro nuestro catálogo de productos con precios y disponibilidad. ¿Buscas algo en particular?'
        },
        {
          user: 'necesito agregar un cliente nuevo',
          assistant: '¡Claro! Para registrar al nuevo cliente necesito: nombre completo, email y teléfono. ¿Empezamos con el nombre?'
        }
      ],
      
      // V3: Tools habilitadas (vacío = todas)
      enabledTools: ['create_record', 'query_records', 'update_record', 'general_conversation'],
      disabledTools: ['analyze_data'], // Análisis lo hace el otro agente
      
      // V3: Horario de atención
      businessHours: {
        timezone: 'America/Bogota',
        schedule: {
          'lunes_viernes': '08:00-18:00',
          'sabado': '09:00-13:00'
        },
        outsideHoursMessage: 'Estamos fuera de horario. Te atendemos el próximo día hábil.'
      },
      
      // V3: Instrucciones adicionales
      customInstructions: 'Siempre confirma los datos antes de registrar una venta. Si el cliente no existe, ofrece registrarlo primero.',
      
      // ═══════════════════════════════════════════════════════════
      // Prompt legado (usado si engineMode = 'legacy' o 'scoring')
      // ═══════════════════════════════════════════════════════════
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
      tables: [
        { tableId: clientesTableId, fullAccess: true },
        { tableId: productosTableId, fullAccess: true },
        { tableId: ventasTableId, fullAccess: true },
        { tableId: seguimientosTableId, fullAccess: true },
        { tableId: tareasTableId, fullAccess: true },
        { tableId: proveedoresTableId, fullAccess: true },
        { tableId: facturasTableId, fullAccess: true },
        { tableId: campanasTableId, fullAccess: true },
      ],
      
      // ═══════════════════════════════════════════════════════════
      // V3 LLM-First Configuration
      // ═══════════════════════════════════════════════════════════
      engineMode: 'llm-first',
      vertical: 'general',
      toneStyle: 'professional',
      
      fewShotExamples: [
        {
          user: 'cuántas ventas hubo hoy',
          assistant: 'Te muestro el resumen de ventas del día:\n📊 Total ventas: X\n💰 Monto total: $X\n📦 Productos vendidos: X unidades'
        },
        {
          user: 'cuál es el producto más vendido',
          assistant: 'Analizando las ventas, el producto más vendido es [Producto] con X unidades. Representa el Y% del total de ventas.'
        }
      ],
      
      // Solo consulta y análisis, no crea ni modifica
      enabledTools: ['query_records', 'analyze_data', 'general_conversation'],
      disabledTools: ['create_record', 'update_record', 'check_availability'],
      
      customInstructions: 'Presenta los datos de forma clara con formato de tabla cuando sea apropiado. Siempre incluye insights y recomendaciones.',
      
      // Prompt legado
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
    
    // ========== FLUJOS AUTOMATIZADOS (COMPACTOS) ==========
    const flowsDb = await connectDB(getFlowsDbName(WORKSPACE_ID));
    
    // FLUJO 1: Proceso Completo de Venta (beforeCreate)
    // Busca/crea cliente → Valida stock → Permite crear → Calcula total → Descuenta stock → Crea seguimiento
    const flow1Id = uuidv4();
    const flow1 = {
      _id: flow1Id,
      name: 'Proceso Completo de Venta',
      description: 'Crea cliente si no existe, valida stock, calcula total, descuenta inventario y programa seguimiento',
      triggerType: 'beforeCreate',
      triggerTable: ventasTableId,
      triggerTableName: 'Ventas',
      active: true,
      nodes: [
        // 1. Trigger: Antes de crear venta
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 300, y: 50 },
          data: {
            label: 'Antes de crear Venta',
            triggerType: 'beforeCreate',
            table: ventasTableId,
            tableName: 'Ventas'
          }
        },
        // 2. Query: ¿Cliente existe?
        {
          id: 'query-cliente',
          type: 'query',
          position: { x: 300, y: 150 },
          data: {
            label: '¿Cliente existe?',
            targetTable: clientesTableId,
            targetTableName: 'Clientes',
            filterField: 'nombre',
            filterValueType: 'trigger',
            filterValueField: 'cliente',
            outputVar: 'clienteData'
          }
        },
        // 3. Crear cliente si no existe
        {
          id: 'create-cliente',
          type: 'action',
          position: { x: 500, y: 250 },
          data: {
            label: 'Crear Cliente Nuevo',
            actionType: 'create',
            targetTable: clientesTableId,
            targetTableName: 'Clientes',
            fields: {
              nombre: '{{cliente}}',
              tipo: 'Lead',
              fechaRegistro: '{{today}}',
              estado: 'Activo'
            }
          }
        },
        // 4. Query: Buscar producto y verificar stock
        {
          id: 'query-producto',
          type: 'query',
          position: { x: 300, y: 350 },
          data: {
            label: 'Buscar Producto',
            targetTable: productosTableId,
            targetTableName: 'Productos',
            filterField: 'nombre',
            filterValueType: 'trigger',
            filterValueField: 'producto',
            outputVar: 'productoData'
          }
        },
        // 5. Error: Producto no existe
        {
          id: 'error-producto',
          type: 'action',
          position: { x: 500, y: 450 },
          data: {
            label: 'Error: Producto no existe',
            actionType: 'error',
            message: 'No se puede crear la venta: el producto "{{producto}}" no existe'
          }
        },
        // 6. Condition: ¿Stock suficiente?
        {
          id: 'condition-stock',
          type: 'condition',
          position: { x: 300, y: 550 },
          data: {
            label: '¿Stock suficiente?',
            field: 'productoData.stock',
            operator: '>=',
            value: '{{cantidad}}'
          }
        },
        // 7. Error: Stock insuficiente
        {
          id: 'error-stock',
          type: 'action',
          position: { x: 500, y: 650 },
          data: {
            label: 'Error: Stock insuficiente',
            actionType: 'error',
            message: 'Stock insuficiente. Disponible: {{productoData.stock}}, solicitado: {{cantidad}}'
          }
        },
        // 8. Allow: Permitir crear la venta
        {
          id: 'allow-venta',
          type: 'action',
          position: { x: 100, y: 650 },
          data: {
            label: 'Permitir Venta',
            actionType: 'allow',
            message: 'Venta validada correctamente'
          }
        },
        // 9. Update: Calcular total en la venta
        {
          id: 'update-total',
          type: 'action',
          position: { x: 100, y: 750 },
          data: {
            label: 'Calcular Total',
            actionType: 'update',
            targetTable: ventasTableId,
            targetTableName: 'Ventas',
            fields: {
              total: '{{productoData.precio * cantidad}}'
            }
          }
        },
        // 10. Update: Descontar stock del producto
        {
          id: 'update-stock',
          type: 'action',
          position: { x: 100, y: 850 },
          data: {
            label: 'Descontar Stock',
            actionType: 'update',
            targetTable: productosTableId,
            targetTableName: 'Productos',
            filterField: 'nombre',
            filterValueType: 'trigger',
            filterValueField: 'producto',
            fields: {
              stock: '{{productoData.stock - cantidad}}'
            }
          }
        },
        // 11. Create: Seguimiento post-venta
        {
          id: 'create-seguimiento',
          type: 'action',
          position: { x: 100, y: 950 },
          data: {
            label: 'Crear Seguimiento',
            actionType: 'create',
            targetTable: seguimientosTableId,
            targetTableName: 'Seguimientos',
            fields: {
              cliente: '{{cliente}}',
              fecha: '{{nextWeek}}',
              hora: '10:00',
              tipo: 'Llamada',
              notas: 'Seguimiento post-venta - Total: ${{productoData.precio * cantidad}}'
            }
          }
        }
      ],
      edges: [
        // Trigger → Query Cliente
        { id: 'e1', source: 'trigger-1', target: 'query-cliente' },
        // Query Cliente: NO → Crear cliente nuevo
        { id: 'e2-no', source: 'query-cliente', sourceHandle: 'no', target: 'create-cliente', label: 'No' },
        // Crear cliente → Query Producto
        { id: 'e2-create', source: 'create-cliente', target: 'query-producto' },
        // Query Cliente: YES → Query Producto
        { id: 'e2-yes', source: 'query-cliente', sourceHandle: 'yes', target: 'query-producto', label: 'Sí' },
        // Query Producto: NO → Error
        { id: 'e3-no', source: 'query-producto', sourceHandle: 'no', target: 'error-producto', label: 'No' },
        // Query Producto: YES → Condition Stock
        { id: 'e3-yes', source: 'query-producto', sourceHandle: 'yes', target: 'condition-stock', label: 'Sí' },
        // Condition Stock: NO → Error
        { id: 'e4-no', source: 'condition-stock', sourceHandle: 'no', target: 'error-stock', label: 'No' },
        // Condition Stock: YES → Allow
        { id: 'e4-yes', source: 'condition-stock', sourceHandle: 'yes', target: 'allow-venta', label: 'Sí' },
        // Allow → Update Total
        { id: 'e5', source: 'allow-venta', target: 'update-total' },
        // Update Total → Update Stock
        { id: 'e6', source: 'update-total', target: 'update-stock' },
        // Update Stock → Create Seguimiento
        { id: 'e7', source: 'update-stock', target: 'create-seguimiento' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow1);
    console.log('✅ Flujo 1: Proceso Completo de Venta');
    
    // FLUJO 2: Bienvenida Cliente Nuevo
    // Cuando se crea un cliente, crea una tarea de bienvenida
    const flow2Id = uuidv4();
    const flow2 = {
      _id: flow2Id,
      name: 'Bienvenida Cliente Nuevo',
      description: 'Crea tarea de bienvenida al registrar un cliente',
      triggerType: 'create',
      triggerTable: clientesTableId,
      triggerTableName: 'Clientes',
      active: true,
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 200, y: 50 },
          data: {
            label: 'Nuevo Cliente',
            triggerType: 'create',
            table: clientesTableId,
            tableName: 'Clientes'
          }
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 200, y: 200 },
          data: {
            label: 'Crear Tarea Bienvenida',
            actionType: 'create',
            targetTable: tareasTableId,
            targetTableName: 'Tareas',
            fields: {
              titulo: 'Llamar a {{nombre}}',
              descripcion: 'Primera llamada de bienvenida al cliente',
              prioridad: 'Alta',
              fechaVencimiento: '{{tomorrow}}',
              estadoTarea: 'Pendiente'
            }
          }
        },
        {
          id: 'notification-1',
          type: 'action',
          position: { x: 200, y: 350 },
          data: {
            label: 'Notificar',
            actionType: 'notification',
            message: 'Nuevo cliente registrado: {{nombre}} ({{tipo}})'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
        { id: 'e2-3', source: 'action-1', target: 'notification-1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await flowsDb.insert(flow2);
    console.log('✅ Flujo 2: Bienvenida Cliente Nuevo');

    console.log('✅ Flujos compactos creados (2 flujos de negocio)');
    
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
    console.log(`   Tablas: 9 (Clientes, Productos, Ventas, Seguimientos, Tareas, Proveedores, Facturas, Campañas, Log de Flujos)`);
    console.log(`   Agentes: 2 (Ventas, Analista)`);
    console.log(`   Flujos: 2 (Proceso Completo de Venta, Bienvenida Cliente Nuevo)`);
    console.log(`   Datos: ${clientesEjemplo.length} clientes, ${productosEjemplo.length} productos, ${ventasEjemplo.length} ventas, ${proveedoresEjemplo.length} proveedores, ${facturasEjemplo.length} facturas, ${campanasEjemplo.length} campañas`);
    console.log(`   Plan: PREMIUM con automatizaciones simplificadas`);
    
  } catch (error) {
    console.error(`❌ Error en seed PREMIUM:`, error);
    throw error;
  }
}

export default seed;
