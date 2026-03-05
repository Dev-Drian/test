/**
 * Seed: Dulce Momento 🧁
 *
 * Pastelería boutique en Medellín. Vende tortas personalizadas, cupcakes y
 * desayunos sorpresa por WhatsApp e Instagram.
 *
 * Tablas (4):
 *   1. Catálogo       — productos, sabores, tamaños y precios
 *   2. Clientes       — base de datos de compradores frecuentes
 *   3. Pedidos        — cada encargo con estado de producción
 *   4. Agenda         — entregas y recoger programados
 *
 * Agente (1):
 *   - Asistente Dulce Momento: toma pedidos, cotiza, verifica disponibilidad
 *
 * Flujos (3):
 *   1. Nuevo Pedido        (beforeCreate en Pedidos): verifica cliente → crea agenda → allow
 *   2. Pedido Confirmado   (create en Pedidos):      notifica al equipo de producción
 *   3. Pedido Listo        (update en Pedidos):      notifica que está listo para entregar/recoger
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import {
  connectDB,
  getWorkspaceDbName,
  getWorkspacesDbName,
  getTableDataDbName,
  getAgentsDbName,
  getFlowsDbName,
  getDbPrefix,
} from '../config/db.js';

const WORKSPACE_ID   = 'dulce-momento';
const WORKSPACE_NAME = 'Dulce Momento 🧁';

async function tableExists(workspaceDb, name) {
  try {
    const result = await workspaceDb.list({ include_docs: true });
    return result.rows.some(r => r.doc && r.doc.name === name && r.doc.headers);
  } catch {
    return false;
  }
}

export async function seed() {
  console.log(`\n[Seed] Iniciando seed DULCE MOMENTO para ${WORKSPACE_NAME}...`);

  try {
    const workspaceDb  = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb     = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const flowsDb      = await connectDB(getFlowsDbName(WORKSPACE_ID));

    if (await tableExists(workspaceDb, 'Catálogo')) {
      console.log('  ⏭️  Workspace ya tiene datos, saltando...');
      return;
    }

    // ═══════════════════════════════════════════════════════
    // TABLA 1: CATÁLOGO
    // ═══════════════════════════════════════════════════════
    const catalogoId = uuidv4();
    await workspaceDb.insert({
      _id: catalogoId,
      name: 'Catálogo',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Productos disponibles: tortas, cupcakes y desayunos sorpresa',
      permissions: { allowQuery: true, allowCreate: false, allowUpdate: false, allowDelete: false },
      headers: [
        { key: 'nombre',      label: 'Producto',       type: 'text',   required: true,  emoji: '🧁', priority: 1 },
        { key: 'categoria',   label: 'Categoría',      type: 'select', required: true,  emoji: '🏷️', priority: 2, options: ['Torta', 'Cupcakes', 'Desayuno Sorpresa', 'Cheesecake', 'Galletas'] },
        { key: 'sabor',       label: 'Sabores',        type: 'text',   required: true,  emoji: '🍫', priority: 3 },
        { key: 'tamano',      label: 'Tamaño',         type: 'select', required: false, emoji: '📐', options: ['Personal (1-2p)', 'Pequeña (4-6p)', 'Mediana (8-12p)', 'Grande (15-20p)', '6 unid', '12 unid', '24 unid'] },
        { key: 'precio',      label: 'Precio base COP', type: 'number', required: true, emoji: '💰', priority: 4, validation: { min: 0 } },
        { key: 'disponible',  label: 'Disponible',     type: 'select', required: true,  emoji: '✅', options: ['Sí', 'No'], defaultValue: 'Sí' },
        { key: 'descripcion', label: 'Descripción',    type: 'text',   required: false, emoji: '📝' },
        { key: 'diasProduccion', label: 'Días producción', type: 'number', required: true, emoji: '⏰', defaultValue: 3 },
      ],
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Tabla Catálogo creada');

    // ═══════════════════════════════════════════════════════
    // TABLA 2: CLIENTES
    // ═══════════════════════════════════════════════════════
    const clientesId = uuidv4();
    await workspaceDb.insert({
      _id: clientesId,
      name: 'Clientes',
      type: 'customers',
      displayField: 'nombre',
      description: 'Base de compradores de Dulce Momento',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre',    label: 'Nombre',    type: 'text',   required: true,  emoji: '👤', priority: 1 },
        { key: 'telefono',  label: 'Teléfono',  type: 'phone',  required: true,  emoji: '📱', priority: 2 },
        { key: 'email',     label: 'Email',     type: 'email',  required: false, emoji: '📧', priority: 3 },
        { key: 'direccion', label: 'Dirección', type: 'text',   required: false, emoji: '📍', priority: 4 },
        { key: 'ciudad',    label: 'Ciudad',    type: 'select', required: true,  emoji: '🏙️', options: ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Sabaneta', 'Otro'], defaultValue: 'Medellín' },
        { key: 'canal',     label: 'Canal',     type: 'select', required: true,  emoji: '📲', options: ['WhatsApp', 'Instagram', 'Referido', 'Web'], defaultValue: 'WhatsApp' },
        { key: 'fechaRegistro', label: 'Fecha Registro', type: 'date', required: false, emoji: '📅', defaultValue: 'today' },
        { key: 'pedidosTotal',  label: 'Total Pedidos',  type: 'number', required: false, emoji: '🛒', defaultValue: 0 },
      ],
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Tabla Clientes creada');

    // ═══════════════════════════════════════════════════════
    // TABLA 3: PEDIDOS
    // ═══════════════════════════════════════════════════════
    const pedidosId = uuidv4();
    await workspaceDb.insert({
      _id: pedidosId,
      name: 'Pedidos',
      type: 'orders',
      displayField: 'referencia',
      description: 'Registro de cada encargo con su estado de producción',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'referencia',     label: 'Referencia',     type: 'text',     required: true,  emoji: '🔖', priority: 1 },
        { key: 'cliente',        label: 'Cliente',        type: 'text',     required: true,  emoji: '👤', priority: 2 },
        { key: 'telefono',       label: 'Teléfono',       type: 'phone',    required: true,  emoji: '📱', priority: 3 },
        { key: 'producto',       label: 'Producto',       type: 'text',     required: true,  emoji: '🧁', priority: 4 },
        { key: 'sabor',          label: 'Sabor',          type: 'text',     required: true,  emoji: '🍫', priority: 5 },
        { key: 'tamano',         label: 'Tamaño/Unidades',type: 'text',     required: true,  emoji: '📐', priority: 6 },
        { key: 'dedicatoria',    label: 'Dedicatoria',    type: 'text',     required: false, emoji: '💌' },
        { key: 'fechaEntrega',   label: 'Fecha Entrega',  type: 'date',     required: true,  emoji: '📅', priority: 7 },
        { key: 'horaEntrega',    label: 'Hora Entrega',   type: 'text',     required: true,  emoji: '🕐', defaultValue: '12:00' },
        { key: 'modalidad',      label: 'Modalidad',      type: 'select',   required: true,  emoji: '🚚', options: ['Domicilio', 'Punto de entrega'], defaultValue: 'Domicilio', priority: 8 },
        { key: 'direccionEntrega', label: 'Dirección Entrega', type: 'text', required: false, emoji: '📍' },
        { key: 'valor',          label: 'Valor COP',      type: 'number',   required: true,  emoji: '💰', priority: 9 },
        { key: 'anticipo',       label: 'Anticipo COP',   type: 'number',   required: false, emoji: '💵', defaultValue: 0 },
        { key: 'saldo',          label: 'Saldo COP',      type: 'number',   required: false, emoji: '💳', defaultValue: 0 },
        { key: 'estado',         label: 'Estado',         type: 'select',   required: true,  emoji: '📊', options: ['Pendiente pago', 'Confirmado', 'En producción', 'Listo', 'Entregado', 'Cancelado'], defaultValue: 'Pendiente pago', priority: 10 },
        { key: 'notas',          label: 'Notas especiales', type: 'text',   required: false, emoji: '📝' },
        { key: 'linkPago',       label: 'Link de pago',     type: 'text',   required: false, emoji: '🔗' },
        { key: 'estadoPago',     label: 'Estado del pago',  type: 'select', required: false, emoji: '💳', options: ['sin_pago','pendiente','pagado','rechazado'], defaultValue: 'sin_pago' },
      ],
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Tabla Pedidos creada');

    // ═══════════════════════════════════════════════════════
    // TABLA 4: AGENDA
    // ═══════════════════════════════════════════════════════
    const agendaId = uuidv4();
    await workspaceDb.insert({
      _id: agendaId,
      name: 'Agenda',
      type: 'schedule',
      displayField: 'cliente',
      description: 'Calendario de entregas y recoger programados',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'fecha',       label: 'Fecha',          type: 'date',   required: true,  emoji: '📅', priority: 1 },
        { key: 'hora',        label: 'Hora',           type: 'text',   required: true,  emoji: '🕐', priority: 2 },
        { key: 'cliente',     label: 'Cliente',        type: 'text',   required: true,  emoji: '👤', priority: 3 },
        { key: 'telefono',    label: 'Teléfono',       type: 'phone',  required: true,  emoji: '📱', priority: 4 },
        { key: 'pedido',      label: 'Pedido Ref.',    type: 'text',   required: true,  emoji: '🔖', priority: 5 },
        { key: 'modalidad',   label: 'Modalidad',      type: 'select', required: true,  emoji: '🚚', options: ['Domicilio', 'Punto de entrega'], priority: 6 },
        { key: 'direccion',   label: 'Dirección',      type: 'text',   required: false, emoji: '📍' },
        { key: 'barrio',      label: 'Barrio/Sector',  type: 'text',   required: false, emoji: '🗺️' },
        { key: 'estadoAgenda',label: 'Estado',         type: 'select', required: true,  emoji: '📊', options: ['Programado', 'Despachado', 'Entregado', 'No hubo nadie', 'Reagendado'], defaultValue: 'Programado' },
        { key: 'notas',       label: 'Notas',          type: 'text',   required: false, emoji: '📝' },
      ],
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Tabla Agenda creada');

    // ═══════════════════════════════════════════════════════
    // AGENTE: Asistente Dulce Momento
    // ═══════════════════════════════════════════════════════
    const agenteId = uuidv4();
    await agentsDb.insert({
      _id: agenteId,
      type: 'agent',
      name: 'Asistente Dulce Momento',
      description: 'Toma pedidos, cotiza productos y verifica disponibilidad de fechas',
      tables: [
        { tableId: catalogoId,  tableName: 'Catálogo',  fullAccess: false, permissions: { query: true,  create: false, update: false, delete: false } },
        { tableId: clientesId,  tableName: 'Clientes',  fullAccess: true,  permissions: { query: true,  create: true,  update: true,  delete: false } },
        { tableId: pedidosId,   tableName: 'Pedidos',   fullAccess: true,  permissions: { query: true,  create: true,  update: true,  delete: false } },
        { tableId: agendaId,    tableName: 'Agenda',    fullAccess: true,  permissions: { query: true,  create: true,  update: false, delete: false } },
      ],
      engineMode: 'llm-first',
      vertical: 'bakery',
      toneStyle: 'friendly',
      fewShotExamples: [
        { user: 'quiero pedir una torta', assistant: '¡Con mucho gusto! 🎂 Para cotizarte necesito saber: ¿para cuántas personas es la torta y qué sabor tienes en mente?' },
        { user: 'cuánto vale una torta mediana de chocolate', assistant: 'Una torta mediana (8 a 12 personas) de chocolate está desde $85.000. ¿Te la hacemos con relleno de arequipe, chantilly o frutas?' },
        { user: 'tienen disponibilidad para el sábado', assistant: '¡Claro! Para confirmarte disponibilidad necesito la fecha exacta. Los pedidos se deben hacer con mínimo 3 días de anticipación 🗓️' },
        { user: 'quiero un desayuno sorpresa para mañana', assistant: '¡Qué lindo detalle! 💐 Para el desayuno sorpresa necesito: dirección de entrega, hora y nombre del destinatario. Los desayunos se confirman con anticipo del 50%.' },
      ],
      enabledTools: ['query_records', 'create_record', 'update_record', 'general_conversation'],
      customInstructions: `Siempre pregunta la fecha de entrega al inicio. Recuerda al cliente que se necesitan mínimo 3 días de anticipación. Al registrar un pedido, genera la referencia con formato DM-[año][mes][día]-[3 letras del nombre del cliente en mayúsculas], ejemplo: DM-20260305-MAR. El anticipo mínimo es el 50% del valor total.`,
      prompt: `Eres el asistente virtual de Dulce Momento 🧁, una pastelería boutique en Medellín.

TU FUNCIÓN:
- Cotizar tortas, cupcakes, cheesecakes y desayunos sorpresa
- Registrar pedidos con todos los detalles
- Verificar disponibilidad de fechas y tiempos de producción
- Registrar clientes nuevos
- Consultar el estado de un pedido existente

CATÁLOGO RESUMIDO:
- Torta personal (1-2p): desde $28.000
- Torta pequeña (4-6p): desde $55.000
- Torta mediana (8-12p): desde $85.000
- Torta grande (15-20p): desde $140.000
- Cupcakes x6: desde $32.000 | x12: desde $58.000
- Desayuno sorpresa: desde $75.000
- Cheesecake (molde): desde $70.000

SABORES DISPONIBLES:
Chocolate, Vainilla, Limón, Frutos rojos, Oreo, Arequipe, Maracuyá, Red Velvet

RELLENOS:
Arequipe, Chantilly, Crema de frutos rojos, Ganache de chocolate

PROCESO DE PEDIDO:
1. Pregunta producto y tamaño
2. Sabor y relleno
3. Dedicatoria (si aplica)
4. Fecha y hora de entrega
5. Modalidad (domicilio o punto de entrega)
6. Dirección si es domicilio
7. Confirma precio y solicita anticipo (50%)
8. Registra el pedido con referencia DM-AAAAMMDDD-XXX

REGLAS IMPORTANTES:
- Mínimo 3 días de anticipación para cualquier pedido
- Domicilios solo en Medellín, Envigado, Bello, Itagüí y Sabaneta
- Anticipo del 50% para confirmar el pedido
- Decoraciones especiales (+$15.000 a +$40.000 según complejidad)
- Nunca prometas decoraciones figurativas sin confirmar con el equipo

Usa un tono cálido, alegre y profesional. Usa emojis relacionados con repostería.`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,
      hasFlows: true,
      planFeatures: { canCreate: true, canUpdate: true, canQuery: true, canDelete: false, hasAutomations: true },
      active: true,
      createdAt: new Date().toISOString(),
    });
    console.log('✅ Agente Asistente Dulce Momento creado');

    // ═══════════════════════════════════════════════════════
    // FLUJO 1: Procesamiento de Nuevo Pedido (beforeCreate)
    // Verifica cliente → Calcula saldo → Crea entrada en Agenda → Allow
    // ═══════════════════════════════════════════════════════
    const flow1Id = uuidv4();
    await flowsDb.insert({
      _id: flow1Id,
      name: 'Procesamiento de Nuevo Pedido',
      description: 'Verifica cliente, calcula saldo y crea entrada en la agenda de entregas',
      triggerType: 'beforeCreate',
      triggerTable: pedidosId,
      triggerTableName: 'Pedidos',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1', type: 'trigger', position: { x: 300, y: 50 },
          data: { label: 'Antes de crear Pedido', triggerType: 'beforeCreate', table: pedidosId, tableName: 'Pedidos' }
        },
        {
          id: 'query-cliente', type: 'query', position: { x: 300, y: 170 },
          data: { label: '¿Cliente existe?', targetTable: clientesId, targetTableName: 'Clientes', filterField: 'telefono', filterValueType: 'trigger', filterValueField: 'telefono', outputVar: 'clienteData' }
        },
        {
          id: 'create-cliente', type: 'action', position: { x: 530, y: 290 },
          data: { label: 'Registrar Cliente Nuevo', actionType: 'create', targetTable: clientesId, targetTableName: 'Clientes', fields: { nombre: '{{cliente}}', telefono: '{{telefono}}', canal: 'WhatsApp', fechaRegistro: '{{today}}', pedidosTotal: 1 } }
        },
        {
          id: 'allow-pedido', type: 'action', position: { x: 300, y: 420 },
          data: { label: 'Aprobar Pedido', actionType: 'allow', message: 'Pedido validado, procediendo a crear agenda de entrega' }
        },
        {
          id: 'create-agenda', type: 'action', position: { x: 300, y: 540 },
          data: { label: 'Crear Entrada en Agenda', actionType: 'create', targetTable: agendaId, targetTableName: 'Agenda', fields: { fecha: '{{fechaEntrega}}', hora: '{{horaEntrega}}', cliente: '{{cliente}}', telefono: '{{telefono}}', pedido: '{{referencia}}', modalidad: '{{modalidad}}', direccion: '{{direccionEntrega}}', estadoAgenda: 'Programado' } }
        },
        {
          id: 'notify-equipo', type: 'action', position: { x: 300, y: 660 },
          data: { label: 'Notificar al equipo', actionType: 'notification', message: '🧁 Nuevo pedido {{referencia}} de {{cliente}} — {{producto}} para el {{fechaEntrega}}' }
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'query-cliente' },
        { id: 'e2-no', source: 'query-cliente', sourceHandle: 'false', target: 'create-cliente', label: 'Cliente nuevo' },
        { id: 'e2-yes', source: 'query-cliente', sourceHandle: 'true', target: 'allow-pedido', label: 'Ya existe' },
        { id: 'e3', source: 'create-cliente', target: 'allow-pedido' },
        { id: 'e4', source: 'allow-pedido', target: 'create-agenda' },
        { id: 'e5', source: 'create-agenda', target: 'notify-equipo' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Flujo 1: Procesamiento de Nuevo Pedido');

    // ═══════════════════════════════════════════════════════
    // FLUJO 2: Recordatorio de Producción (create en Pedidos)
    // Al confirmar pedido, notifica al equipo de producción
    // ═══════════════════════════════════════════════════════
    const flow2Id = uuidv4();
    await flowsDb.insert({
      _id: flow2Id,
      name: 'Recordatorio de Producción',
      description: 'Al crear un pedido confirmado, notifica a producción con los detalles',
      triggerType: 'create',
      triggerTable: pedidosId,
      triggerTableName: 'Pedidos',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1', type: 'trigger', position: { x: 200, y: 50 },
          data: { label: 'Pedido Creado', triggerType: 'create', table: pedidosId, tableName: 'Pedidos' }
        },
        {
          id: 'condition-1', type: 'condition', position: { x: 200, y: 170 },
          data: { label: '¿Estado = Confirmado?', field: 'estado', operator: '==', value: 'Confirmado' }
        },
        {
          id: 'notify-prod', type: 'action', position: { x: 200, y: 310 },
          data: { label: 'Notificar Producción', actionType: 'notification', message: '🎂 Pedido a producción: {{referencia}} | {{producto}} ({{tamano}}) | Sabor: {{sabor}} | Dedicatoria: {{dedicatoria}} | Entrega: {{fechaEntrega}} {{horaEntrega}} | Notas: {{notas}}' }
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-yes', source: 'condition-1', sourceHandle: 'true', target: 'notify-prod', label: 'Sí' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Flujo 2: Recordatorio de Producción');

    // ═══════════════════════════════════════════════════════
    // FLUJO 3: Pedido Listo para Entregar (update en Pedidos)
    // Cuando estado cambia a "Listo", actualiza la Agenda y notifica
    // ═══════════════════════════════════════════════════════
    const flow3Id = uuidv4();
    await flowsDb.insert({
      _id: flow3Id,
      name: 'Pedido Listo para Entrega',
      description: 'Cuando el pedido está listo, actualiza la agenda y notifica al mensajero',
      triggerType: 'update',
      triggerTable: pedidosId,
      triggerTableName: 'Pedidos',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1', type: 'trigger', position: { x: 200, y: 50 },
          data: { label: 'Pedido Actualizado', triggerType: 'update', table: pedidosId, tableName: 'Pedidos' }
        },
        {
          id: 'condition-1', type: 'condition', position: { x: 200, y: 170 },
          data: { label: 'Estado = Listo?', field: 'estado', operator: '==', value: 'Listo' }
        },
        {
          id: 'update-agenda', type: 'action', position: { x: 200, y: 310 },
          data: { label: 'Actualizar Agenda', actionType: 'update', targetTable: agendaId, targetTableName: 'Agenda', filterField: 'pedido', filterValueType: 'trigger', filterValueField: 'referencia', fields: { estadoAgenda: 'Despachado' } }
        },
        {
          id: 'notify-envio', type: 'action', position: { x: 200, y: 450 },
          data: { label: 'Notificar despacho', actionType: 'notification', message: '🚚 ¡Pedido {{referencia}} LISTO! Cliente: {{cliente}} ({{telefono}}) — Entrega: {{fechaEntrega}} {{horaEntrega}} — Modalidad: {{modalidad}} — Dirección: {{direccionEntrega}}' }
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'condition-1' },
        { id: 'e2-yes', source: 'condition-1', sourceHandle: 'true', target: 'update-agenda', label: 'Sí' },
        { id: 'e3', source: 'update-agenda', target: 'notify-envio' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Flujo 3: Pedido Listo para Entrega');

    // ═══════════════════════════════════════════════════════
    // FLUJO 4: Notificación al Cliente por cambio de estado
    // Avisa al cliente en cada etapa relevante de su pedido
    // ═══════════════════════════════════════════════════════
    const flow4Id = uuidv4();
    await flowsDb.insert({
      _id: flow4Id,
      name: 'Notificación al Cliente — Estado del Pedido',
      description: 'Notifica al cliente cuando su pedido pasa a En producción, Listo o Entregado',
      triggerType: 'update',
      triggerTable: pedidosId,
      triggerTableName: 'Pedidos',
      isActive: true,
      nodes: [
        {
          id: 'trigger-1', type: 'trigger', position: { x: 300, y: 50 },
          data: { label: 'Pedido Actualizado', triggerType: 'update', table: pedidosId, tableName: 'Pedidos' }
        },
        {
          id: 'cond-produccion', type: 'condition', position: { x: 100, y: 180 },
          data: { label: 'Estado = En producción?', field: 'estado', operator: '==', value: 'En producción' }
        },
        {
          id: 'notify-produccion', type: 'action', position: { x: 100, y: 320 },
          data: {
            label: 'Avisar: en preparación',
            actionType: 'notification',
            channel: 'whatsapp',
            to: '{{telefono}}',
            message: '🧁 ¡Hola {{cliente}}! Ya empezamos a preparar tu pedido *{{referencia}}* ({{producto}}). Te avisaremos cuando esté listo 🎂',
          }
        },
        {
          id: 'cond-listo', type: 'condition', position: { x: 300, y: 180 },
          data: { label: 'Estado = Listo?', field: 'estado', operator: '==', value: 'Listo' }
        },
        {
          id: 'notify-listo', type: 'action', position: { x: 300, y: 320 },
          data: {
            label: 'Avisar: listo para entrega',
            actionType: 'notification',
            channel: 'whatsapp',
            to: '{{telefono}}',
            message: '✅ ¡{{cliente}}, tu pedido *{{referencia}}* está LISTO! 🎉\n\n📦 *{{producto}}*\n📅 Entrega: {{fechaEntrega}} a las {{horaEntrega}}\n🚚 Modalidad: {{modalidad}}{{#if direccionEntrega}}\n📍 Dirección: {{direccionEntrega}}{{/if}}\n💳 Saldo pendiente: ${{saldo}}\n\n¡Gracias por confiar en Dulce Momento! 🧁',
          }
        },
        {
          id: 'cond-entregado', type: 'condition', position: { x: 500, y: 180 },
          data: { label: 'Estado = Entregado?', field: 'estado', operator: '==', value: 'Entregado' }
        },
        {
          id: 'notify-entregado', type: 'action', position: { x: 500, y: 320 },
          data: {
            label: 'Avisar: entregado + valoración',
            actionType: 'notification',
            channel: 'whatsapp',
            to: '{{telefono}}',
            message: '🎂 ¡{{cliente}}, esperamos que hayas disfrutado tu *{{producto}}*!\n\nNos encantaría saber tu opinión 🌟. ¿Nos dejas una reseña?\n\nRecuerda que tenemos promociones para clientes frecuentes 💝\n\n— Dulce Momento 🧁',
          }
        },
      ],
      edges: [
        { id: 'e1a', source: 'trigger-1', target: 'cond-produccion' },
        { id: 'e1b', source: 'trigger-1', target: 'cond-listo' },
        { id: 'e1c', source: 'trigger-1', target: 'cond-entregado' },
        { id: 'e2a', source: 'cond-produccion', sourceHandle: 'true', target: 'notify-produccion', label: 'Sí' },
        { id: 'e2b', source: 'cond-listo',       sourceHandle: 'true', target: 'notify-listo',      label: 'Sí' },
        { id: 'e2c', source: 'cond-entregado',   sourceHandle: 'true', target: 'notify-entregado',  label: 'Sí' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Flujo 4: Notificación al Cliente');

    // ═══════════════════════════════════════════════════════
    // WORKSPACE DOCS
    // ═══════════════════════════════════════════════════════
    try {
      await workspaceDb.insert({
        _id: '_design/workspace',
        name: WORKSPACE_NAME,
        description: 'Pastelería boutique en Medellín — pedidos, entregas y catálogo',
        type: 'bakery',
        defaultAgentId: agenteId,
        plan: 'starter',
        settings: { timezone: 'America/Bogota', currency: 'COP', language: 'es' },
        createdAt: new Date().toISOString(),
      });
    } catch (e) { /* ya existe */ }

    try {
      await workspacesDb.insert({
        _id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        color: 'rgb(236, 72, 153)',
        emoji: '🧁',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'seed',
        plan: 'starter',
        members: [],
      });
    } catch (e) { /* ya existe */ }
    console.log('✅ Workspace configurado');

    // ═══════════════════════════════════════════════════════
    // DATOS DE EJEMPLO
    // ═══════════════════════════════════════════════════════

    // Catálogo
    const catalogoDb = await connectDB(getTableDataDbName(WORKSPACE_ID, catalogoId));
    const productos = [
      { nombre: 'Torta de Chocolate Intenso',      categoria: 'Torta',            sabor: 'Chocolate', tamano: 'Mediana (8-12p)', precio: 90000,  disponible: 'Sí', descripcion: 'Torta húmeda con ganache y relleno de arequipe',    diasProduccion: 3 },
      { nombre: 'Torta Red Velvet',                categoria: 'Torta',            sabor: 'Red Velvet', tamano: 'Mediana (8-12p)', precio: 95000, disponible: 'Sí', descripcion: 'Capas de Red Velvet con frosting de queso crema', diasProduccion: 3 },
      { nombre: 'Torta de Maracuyá',               categoria: 'Torta',            sabor: 'Maracuyá',   tamano: 'Pequeña (4-6p)', precio: 60000,  disponible: 'Sí', descripcion: 'Torta esponjosa con mousse de maracuyá',           diasProduccion: 2 },
      { nombre: 'Torta de Vainilla personalizada', categoria: 'Torta',            sabor: 'Vainilla',   tamano: 'Grande (15-20p)', precio: 150000, disponible: 'Sí', descripcion: 'Perfecta para 15 años o bodas',                   diasProduccion: 4 },
      { nombre: 'Torta Personal Oreo',             categoria: 'Torta',            sabor: 'Oreo',       tamano: 'Personal (1-2p)', precio: 30000, disponible: 'Sí', descripcion: 'Individual con cookies Oreo y crema',             diasProduccion: 1 },
      { nombre: 'Cheesecake de Frutos Rojos',      categoria: 'Cheesecake',       sabor: 'Frutos rojos', tamano: 'Mediana (8-12p)', precio: 85000, disponible: 'Sí', descripcion: 'New York cheesecake con coulis de frutos rojos', diasProduccion: 2 },
      { nombre: 'Cheesecake de Limón',             categoria: 'Cheesecake',       sabor: 'Limón',       tamano: 'Pequeña (4-6p)', precio: 65000,  disponible: 'Sí', descripcion: 'Cremoso con glaseado de limón Meyer',            diasProduccion: 2 },
      { nombre: 'Cupcakes de Chocolate x12',       categoria: 'Cupcakes',         sabor: 'Chocolate',   tamano: '12 unid',        precio: 62000,  disponible: 'Sí', descripcion: 'Con frosting de chocolate belga',                diasProduccion: 1 },
      { nombre: 'Cupcakes Surtidos x6',            categoria: 'Cupcakes',         sabor: 'Vainilla',    tamano: '6 unid',         precio: 34000,  disponible: 'Sí', descripcion: '3 chocolate + 3 vainilla con decoración',        diasProduccion: 1 },
      { nombre: 'Desayuno Sorpresa Básico',        categoria: 'Desayuno Sorpresa', sabor: 'Variado',   tamano: 'Personal (1-2p)', precio: 78000,  disponible: 'Sí', descripcion: 'Pancakes, fruta, jugo y tarjeta personalizada',  diasProduccion: 1 },
      { nombre: 'Desayuno Sorpresa Premium',       categoria: 'Desayuno Sorpresa', sabor: 'Variado',   tamano: 'Personal (1-2p)', precio: 120000, disponible: 'Sí', descripcion: 'Waffle, fruta, torta personal, globos y peluche', diasProduccion: 1 },
      { nombre: 'Galletas Decoradas x24',          categoria: 'Galletas',         sabor: 'Vainilla',    tamano: '24 unid',        precio: 85000,  disponible: 'Sí', descripcion: 'Royal icing personalizado para eventos',         diasProduccion: 3 },
      { nombre: 'Torta Frutos Rojos y Chantilly',  categoria: 'Torta',            sabor: 'Frutos rojos', tamano: 'Mediana (8-12p)', precio: 92000, disponible: 'Sí', descripcion: 'Fresca y ligera, ideal para reuniones',          diasProduccion: 2 },
      { nombre: 'Torta de Arequipe con Nueces',    categoria: 'Torta',            sabor: 'Arequipe',    tamano: 'Grande (15-20p)', precio: 145000, disponible: 'Sí', descripcion: 'Tres capas de esponja con arequipe y nueces tostadas', diasProduccion: 3 },
      { nombre: 'Cupcakes Temáticos x12',          categoria: 'Cupcakes',         sabor: 'Vainilla',    tamano: '12 unid',        precio: 75000,  disponible: 'Sí', descripcion: 'Diseño personalizado para evento (cumpleaños, baby shower, etc.)', diasProduccion: 2 },
    ];
    for (const p of productos) await catalogoDb.insert({ _id: uuidv4(), tableId: catalogoId, ...p, createdAt: new Date().toISOString() });
    console.log(`✅ ${productos.length} productos en catálogo`);

    // Clientes
    const clientesDb = await connectDB(getTableDataDbName(WORKSPACE_ID, clientesId));
    const clientes = [
      { nombre: 'Valentina Restrepo',  telefono: '3001234567', email: 'vale@gmail.com',      direccion: 'Cra 43 #18-25, El Poblado',    ciudad: 'Medellín',  canal: 'Instagram', pedidosTotal: 8 },
      { nombre: 'Camila Gómez',        telefono: '3117654321', email: 'cami.gomez@gmail.com', direccion: 'Cll 10 #32-11, Envigado',       ciudad: 'Envigado',  canal: 'WhatsApp',  pedidosTotal: 5 },
      { nombre: 'Daniela Martínez',    telefono: '3209876543', email: null,                   direccion: 'Cra 65 #44-20, Laureles',       ciudad: 'Medellín',  canal: 'WhatsApp',  pedidosTotal: 3 },
      { nombre: 'Isabela Torres',      telefono: '3154561234', email: 'isabelat@yahoo.com',   direccion: 'Cll 76 #52-80, Robledo',        ciudad: 'Medellín',  canal: 'Referido',  pedidosTotal: 2 },
      { nombre: 'Alejandra Herrera',   telefono: '3008889012', email: null,                   direccion: 'Av. El Poblado #14-35',         ciudad: 'Medellín',  canal: 'Instagram', pedidosTotal: 4 },
      { nombre: 'Sofía Cárdenas',      telefono: '3143456789', email: 'sofia.c@gmail.com',    direccion: 'Cll 32 #77-11, Castilla',       ciudad: 'Bello',     canal: 'WhatsApp',  pedidosTotal: 1 },
      { nombre: 'Mariana Ospina',      telefono: '3167890123', email: 'mariana.o@outlook.com', direccion: 'Cra 80 #12-30, Belén',         ciudad: 'Medellín',  canal: 'WhatsApp',  pedidosTotal: 6 },
      { nombre: 'Natalia Vargas',      telefono: '3102345678', email: null,                   direccion: 'Cll 19 #67-22, Sabaneta',       ciudad: 'Sabaneta',  canal: 'Instagram', pedidosTotal: 2 },
      { nombre: 'Andrea Peña',         telefono: '3185678901', email: 'andrea.p@gmail.com',  direccion: 'Cra 51 #81-40, Campo Valdés',  ciudad: 'Medellín',  canal: 'Referido',  pedidosTotal: 3 },
      { nombre: 'Paula Jiménez',       telefono: '3219012345', email: null,                   direccion: 'Cll 4 #43-10, Itagüí',          ciudad: 'Itagüí',    canal: 'WhatsApp',  pedidosTotal: 1 },
      { nombre: 'Laura Salazar',       telefono: '3001357924', email: 'lauras@gmail.com',     direccion: 'Cra 43A #6-15, Provenza',       ciudad: 'Medellín',  canal: 'Instagram', pedidosTotal: 9 },
      { nombre: 'Mónica Castro',       telefono: '3112468013', email: null,                   direccion: 'Cll 49 #70-80, Estadio',        ciudad: 'Medellín',  canal: 'WhatsApp',  pedidosTotal: 2 },
      { nombre: 'Empresa Eventos SAS', telefono: '6044567890', email: 'eventos@empresa.co',   direccion: 'Cra 54 #19-30, Piso 2',        ciudad: 'Medellín',  canal: 'Referido',  pedidosTotal: 12 },
      { nombre: 'Catalina Ríos',       telefono: '3135792468', email: null,                   direccion: 'Cll 83 #30-40, La Castellana', ciudad: 'Medellín',  canal: 'Instagram', pedidosTotal: 1 },
      { nombre: 'Gloria Mendez',       telefono: '3046801357', email: 'gloria.m@hotmail.com', direccion: 'Cra 70 #65-12, Laureles',       ciudad: 'Medellín',  canal: 'Referido',  pedidosTotal: 7 },
    ];
    const clienteIds = [];
    for (const c of clientes) {
      const id = uuidv4();
      clienteIds.push(id);
      await clientesDb.insert({ _id: id, tableId: clientesId, ...c, fechaRegistro: '2025-06-01', createdAt: new Date().toISOString() });
    }
    console.log(`✅ ${clientes.length} clientes creados`);

    // Pedidos (22 pedidos variados)
    const pedidosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, pedidosId));
    const pedidos = [
      { referencia: 'DM-20260210-VAL', cliente: 'Valentina Restrepo', telefono: '3001234567', producto: 'Torta de Chocolate Intenso',     sabor: 'Chocolate',  tamano: 'Mediana (8-12p)', dedicatoria: 'Feliz cumpleaños Mamá ❤️', fechaEntrega: '2026-03-15', horaEntrega: '10:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 43 #18-25, El Poblado', valor: 90000,  anticipo: 45000, saldo: 45000, estado: 'Confirmado', notas: 'Sin maní' },
      { referencia: 'DM-20260211-CAM', cliente: 'Camila Gómez',       telefono: '3117654321', producto: 'Desayuno Sorpresa Premium',       sabor: 'Variado',    tamano: 'Personal (1-2p)', dedicatoria: 'Happy Birthday Amor',       fechaEntrega: '2026-03-16', horaEntrega: '08:00', modalidad: 'Domicilio', direccionEntrega: 'Cll 10 #32-11, Envigado',  valor: 120000, anticipo: 60000, saldo: 60000, estado: 'En producción', notas: 'Llevar globos rosas' },
      { referencia: 'DM-20260212-DAN', cliente: 'Daniela Martínez',   telefono: '3209876543', producto: 'Cheesecake de Frutos Rojos',      sabor: 'Frutos rojos', tamano: 'Mediana (8-12p)', dedicatoria: '',                        fechaEntrega: '2026-03-17', horaEntrega: '12:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 85000,  anticipo: 42500, saldo: 42500, estado: 'Listo',            notas: '' },
      { referencia: 'DM-20260213-LAU', cliente: 'Laura Salazar',      telefono: '3001357924', producto: 'Torta Red Velvet',               sabor: 'Red Velvet', tamano: 'Grande (15-20p)', dedicatoria: 'Happy 15 Valentina',        fechaEntrega: '2026-03-20', horaEntrega: '15:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 43A #6-15, Provenza',  valor: 165000, anticipo: 82500, saldo: 82500, estado: 'Confirmado', notas: 'Decoración principesa rosa, flores en papel' },
      { referencia: 'DM-20260213-EMP', cliente: 'Empresa Eventos SAS', telefono: '6044567890', producto: 'Galletas Decoradas x24',        sabor: 'Vainilla',   tamano: '24 unid',         dedicatoria: '',                          fechaEntrega: '2026-03-14', horaEntrega: '09:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 85000,  anticipo: 85000, saldo: 0,     estado: 'Entregado',      notas: 'Logo de la empresa en las galletas' },
      { referencia: 'DM-20260214-MAR', cliente: 'Mariana Ospina',     telefono: '3167890123', producto: 'Cupcakes Temáticos x12',         sabor: 'Vainilla',   tamano: '12 unid',         dedicatoria: '¡Feliz Baby Shower!',       fechaEntrega: '2026-03-22', horaEntrega: '11:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 80 #12-30, Belén',     valor: 75000,  anticipo: 37500, saldo: 37500, estado: 'Confirmado', notas: 'Azul bebé, osos y estrellas' },
      { referencia: 'DM-20260214-GLO', cliente: 'Gloria Mendez',      telefono: '3046801357', producto: 'Torta de Arequipe con Nueces',   sabor: 'Arequipe',   tamano: 'Mediana (8-12p)', dedicatoria: 'Para el cumple de Carlos',  fechaEntrega: '2026-03-18', horaEntrega: '14:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 70 #65-12, Laureles',  valor: 115000, anticipo: 57500, saldo: 57500, estado: 'En producción', notas: '' },
      { referencia: 'DM-20260215-ALE', cliente: 'Alejandra Herrera',  telefono: '3008889012', producto: 'Torta Personal Oreo',            sabor: 'Oreo',       tamano: 'Personal (1-2p)', dedicatoria: 'Te amo',                    fechaEntrega: '2026-03-15', horaEntrega: '19:00', modalidad: 'Domicilio', direccionEntrega: 'Av. El Poblado #14-35',    valor: 30000,  anticipo: 30000, saldo: 0,     estado: 'Listo',            notas: 'Con vela' },
      { referencia: 'DM-20260215-ISO', cliente: 'Isabela Torres',     telefono: '3154561234', producto: 'Torta de Maracuyá',              sabor: 'Maracuyá',   tamano: 'Pequeña (4-6p)',  dedicatoria: '',                          fechaEntrega: '2026-03-19', horaEntrega: '12:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 60000,  anticipo: 30000, saldo: 30000, estado: 'Confirmado', notas: '' },
      { referencia: 'DM-20260215-AND', cliente: 'Andrea Peña',        telefono: '3185678901', producto: 'Desayuno Sorpresa Básico',       sabor: 'Variado',    tamano: 'Personal (1-2p)', dedicatoria: 'Buenos días bestie',        fechaEntrega: '2026-03-16', horaEntrega: '07:30', modalidad: 'Domicilio', direccionEntrega: 'Cra 51 #81-40, Campo Valdés', valor: 78000, anticipo: 78000, saldo: 0,     estado: 'Entregado',      notas: 'Tocar el timbre del 303' },
      { referencia: 'DM-20260216-MON', cliente: 'Mónica Castro',      telefono: '3112468013', producto: 'Cupcakes de Chocolate x12',      sabor: 'Chocolate',  tamano: '12 unid',         dedicatoria: '',                          fechaEntrega: '2026-03-21', horaEntrega: '10:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 62000,  anticipo: 31000, saldo: 31000, estado: 'Confirmado', notas: '' },
      { referencia: 'DM-20260217-SOF', cliente: 'Sofía Cárdenas',     telefono: '3143456789', producto: 'Torta de Vainilla personalizada', sabor: 'Vainilla',  tamano: 'Grande (15-20p)', dedicatoria: 'Feliz Matrimonio 🥂',       fechaEntrega: '2026-03-29', horaEntrega: '16:00', modalidad: 'Domicilio', direccionEntrega: 'Cll 32 #77-11, Castilla',  valor: 170000, anticipo: 85000, saldo: 85000, estado: 'Confirmado', notas: 'Flores blancas y dorado. El novio es alérgico a las fresas' },
      { referencia: 'DM-20260217-NAT', cliente: 'Natalia Vargas',     telefono: '3102345678', producto: 'Cheesecake de Limón',            sabor: 'Limón',      tamano: 'Pequeña (4-6p)',  dedicatoria: '',                          fechaEntrega: '2026-03-17', horaEntrega: '13:00', modalidad: 'Domicilio', direccionEntrega: 'Cll 19 #67-22, Sabaneta',  valor: 65000,  anticipo: 32500, saldo: 32500, estado: 'En producción', notas: '' },
      { referencia: 'DM-20260218-EMP', cliente: 'Empresa Eventos SAS', telefono: '6044567890', producto: 'Torta Frutos Rojos y Chantilly', sabor: 'Frutos rojos', tamano: 'Grande (15-20p)', dedicatoria: 'Premio al mejor equipo', fechaEntrega: '2026-03-25', horaEntrega: '12:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 54 #19-30, Piso 2',   valor: 160000, anticipo: 80000, saldo: 80000, estado: 'Confirmado', notas: 'Logotipo en fondant' },
      { referencia: 'DM-20260219-CAT', cliente: 'Catalina Ríos',      telefono: '3135792468', producto: 'Cupcakes Surtidos x6',           sabor: 'Vainilla',   tamano: '6 unid',          dedicatoria: 'Gracias profe',             fechaEntrega: '2026-03-20', horaEntrega: '08:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 34000,  anticipo: 34000, saldo: 0,     estado: 'Entregado',      notas: '' },
      { referencia: 'DM-20260220-PAU', cliente: 'Paula Jiménez',      telefono: '3219012345', producto: 'Torta de Chocolate Intenso',     sabor: 'Chocolate',  tamano: 'Pequeña (4-6p)',  dedicatoria: '',                          fechaEntrega: '2026-03-23', horaEntrega: '12:00', modalidad: 'Domicilio', direccionEntrega: 'Cll 4 #43-10, Itagüí',     valor: 62000,  anticipo: 31000, saldo: 31000, estado: 'Pendiente pago', notas: '' },
      { referencia: 'DM-20260301-VAL', cliente: 'Valentina Restrepo',  telefono: '3001234567', producto: 'Galletas Decoradas x24',        sabor: 'Vainilla',   tamano: '24 unid',         dedicatoria: '',                          fechaEntrega: '2026-04-05', horaEntrega: '09:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 85000,  anticipo: 0,     saldo: 85000, estado: 'Pendiente pago', notas: 'Temática jardín de mariposas' },
      { referencia: 'DM-20260302-LAU', cliente: 'Laura Salazar',      telefono: '3001357924', producto: 'Desayuno Sorpresa Premium',       sabor: 'Variado',    tamano: 'Personal (1-2p)', dedicatoria: '¡Feliz aniversario!',       fechaEntrega: '2026-03-28', horaEntrega: '08:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 43A #6-15, Provenza',  valor: 120000, anticipo: 60000, saldo: 60000, estado: 'Confirmado', notas: 'Incluir rose gold globos' },
      { referencia: 'DM-20260303-MAR', cliente: 'Mariana Ospina',     telefono: '3167890123', producto: 'Torta Red Velvet',               sabor: 'Red Velvet', tamano: 'Pequeña (4-6p)',  dedicatoria: 'Con amor',                  fechaEntrega: '2026-03-30', horaEntrega: '12:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 65000,  anticipo: 32500, saldo: 32500, estado: 'Confirmado', notas: '' },
      { referencia: 'DM-20260304-EMP', cliente: 'Empresa Eventos SAS', telefono: '6044567890', producto: 'Cupcakes Temáticos x12',        sabor: 'Vainilla',   tamano: '12 unid',         dedicatoria: '',                          fechaEntrega: '2026-03-14', horaEntrega: '07:00', modalidad: 'Punto de entrega', direccionEntrega: '', valor: 75000,  anticipo: 75000, saldo: 0,     estado: 'Entregado',      notas: '3 sabores distintos' },
      { referencia: 'DM-20260304-GLO', cliente: 'Gloria Mendez',      telefono: '3046801357', producto: 'Cheesecake de Frutos Rojos',      sabor: 'Frutos rojos', tamano: 'Pequeña (4-6p)', dedicatoria: '',                      fechaEntrega: '2026-04-02', horaEntrega: '11:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 70 #65-12, Laureles',  valor: 68000,  anticipo: 34000, saldo: 34000, estado: 'Pendiente pago', notas: '' },
      { referencia: 'DM-20260305-DAN', cliente: 'Daniela Martínez',   telefono: '3209876543', producto: 'Torta de Maracuyá',              sabor: 'Maracuyá',   tamano: 'Mediana (8-12p)', dedicatoria: 'Cumple de mamá 🌸',          fechaEntrega: '2026-04-10', horaEntrega: '14:00', modalidad: 'Domicilio', direccionEntrega: 'Cra 65 #44-20, Laureles',  valor: 92000,  anticipo: 0,     saldo: 92000, estado: 'Pendiente pago', notas: 'Sin azúcar si es posible' },
    ];
    for (const p of pedidos) await pedidosDb.insert({ _id: uuidv4(), tableId: pedidosId, ...p, createdAt: new Date().toISOString() });
    console.log(`✅ ${pedidos.length} pedidos creados`);

    // Agenda (entradas para los pedidos confirmados/en producción/listos)
    const agendaDb = await connectDB(getTableDataDbName(WORKSPACE_ID, agendaId));
    const agendaEntradas = [
      { fecha: '2026-03-15', hora: '10:00', cliente: 'Valentina Restrepo', telefono: '3001234567', pedido: 'DM-20260210-VAL', modalidad: 'Domicilio', direccion: 'Cra 43 #18-25, El Poblado', barrio: 'El Poblado',   estadoAgenda: 'Programado' },
      { fecha: '2026-03-15', hora: '19:00', cliente: 'Alejandra Herrera',  telefono: '3008889012', pedido: 'DM-20260215-ALE', modalidad: 'Domicilio', direccion: 'Av. El Poblado #14-35',     barrio: 'Provenza',     estadoAgenda: 'Despachado' },
      { fecha: '2026-03-16', hora: '07:30', cliente: 'Andrea Peña',        telefono: '3185678901', pedido: 'DM-20260215-AND', modalidad: 'Domicilio', direccion: 'Cra 51 #81-40, Campo Valdés', barrio: 'Campo Valdés', estadoAgenda: 'Entregado' },
      { fecha: '2026-03-16', hora: '08:00', cliente: 'Camila Gómez',       telefono: '3117654321', pedido: 'DM-20260211-CAM', modalidad: 'Domicilio', direccion: 'Cll 10 #32-11, Envigado',   barrio: 'Envigado',     estadoAgenda: 'Programado' },
      { fecha: '2026-03-17', hora: '12:00', cliente: 'Daniela Martínez',   telefono: '3209876543', pedido: 'DM-20260212-DAN', modalidad: 'Punto de entrega', direccion: '',                   barrio: '',             estadoAgenda: 'Programado' },
      { fecha: '2026-03-17', hora: '13:00', cliente: 'Natalia Vargas',     telefono: '3102345678', pedido: 'DM-20260217-NAT', modalidad: 'Domicilio', direccion: 'Cll 19 #67-22, Sabaneta',   barrio: 'Sabaneta',     estadoAgenda: 'Programado' },
      { fecha: '2026-03-18', hora: '14:00', cliente: 'Gloria Mendez',      telefono: '3046801357', pedido: 'DM-20260214-GLO', modalidad: 'Domicilio', direccion: 'Cra 70 #65-12, Laureles',   barrio: 'Laureles',     estadoAgenda: 'Programado' },
      { fecha: '2026-03-20', hora: '15:00', cliente: 'Laura Salazar',      telefono: '3001357924', pedido: 'DM-20260213-LAU', modalidad: 'Domicilio', direccion: 'Cra 43A #6-15, Provenza',   barrio: 'El Poblado',   estadoAgenda: 'Programado' },
      { fecha: '2026-03-20', hora: '08:00', cliente: 'Catalina Ríos',      telefono: '3135792468', pedido: 'DM-20260219-CAT', modalidad: 'Punto de entrega', direccion: '',                   barrio: '',             estadoAgenda: 'Entregado' },
      { fecha: '2026-03-21', hora: '10:00', cliente: 'Mónica Castro',      telefono: '3112468013', pedido: 'DM-20260216-MON', modalidad: 'Punto de entrega', direccion: '',                   barrio: '',             estadoAgenda: 'Programado' },
      { fecha: '2026-03-22', hora: '11:00', cliente: 'Mariana Ospina',     telefono: '3167890123', pedido: 'DM-20260214-MAR', modalidad: 'Domicilio', direccion: 'Cra 80 #12-30, Belén',       barrio: 'Belén',        estadoAgenda: 'Programado' },
    ];
    for (const a of agendaEntradas) await agendaDb.insert({ _id: uuidv4(), tableId: agendaId, ...a, notas: '', createdAt: new Date().toISOString() });
    console.log(`✅ ${agendaEntradas.length} entradas en la agenda`);

    // Vincular usuario starter
    try {
      const accountsDb = await connectDB(`${getDbPrefix()}accounts`);
      const res = await accountsDb.find({ selector: { email: 'starter@migracion.ai' }, limit: 1 });
      if (res.docs.length > 0) {
        const user = res.docs[0];
        if (!user.workspaces) user.workspaces = [];
        if (!user.workspaces.includes(WORKSPACE_ID)) {
          user.workspaces.push(WORKSPACE_ID);
          user.updatedAt = new Date().toISOString();
          await accountsDb.insert(user);
          console.log('✅ Workspace vinculado a starter@migracion.ai');
        }
      }
    } catch (e) { /* ignorar */ }

    console.log(`\n✅ Seed DULCE MOMENTO completado`);
    console.log(`   Workspace:  ${WORKSPACE_ID}`);
    console.log(`   Tablas:     4 (Catálogo, Clientes, Pedidos, Agenda)`);
    console.log(`   Agente:     1 (Asistente Dulce Momento)`);
    console.log(`   Flujos:     4 (Procesamiento, Recordatorio Producción, Pedido Listo, Notif. Cliente)`);
    console.log(`   Datos:      ${productos.length} productos · ${clientes.length} clientes · ${pedidos.length} pedidos · ${agendaEntradas.length} entregas`);

  } catch (error) {
    console.error('❌ Error en seed Dulce Momento:', error);
    throw error;
  }
}

export default seed;
