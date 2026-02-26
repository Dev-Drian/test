/**
 * Seed: Plantillas de Flujos Globales
 * 
 * Crea plantillas de flujos predefinidas que pueden usarse
 * como punto de partida para crear nuevos flujos.
 * 
 * Las plantillas son DINÁMICAS:
 * - Los nodos usan tipos genéricos que funcionan con cualquier tabla
 * - Las referencias a tablas se resuelven al crear el flujo
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getFlowTemplatesDbName } from '../config/db.js';

/**
 * Plantillas de flujos predefinidas
 */
const FLOW_TEMPLATES = [
  {
    _id: 'template-reservation',
    name: 'Reservación',
    description: 'Flujo para gestionar reservas o citas',
    icon: '📅',
    color: 'emerald',
    isTemplate: true,
    category: 'business',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio',
          trigger: 'onMessage',
          keywords: ['reservar', 'agendar', 'cita', 'reserva', 'reservación'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 150 },
        data: {
          label: 'Datos de reserva',
          fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'fecha', label: 'Fecha', type: 'date', required: true },
            { key: 'hora', label: 'Hora', type: 'time', required: true },
          ],
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 280 },
        data: {
          label: 'Verificar disponibilidad',
          tablePlaceholder: 'reservas',
          operation: 'count',
          filters: [
            { field: 'fecha', operator: 'equals', value: '{{fecha}}' },
            { field: 'hora', operator: 'equals', value: '{{hora}}' },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 410 },
        data: {
          label: '¿Disponible?',
          field: 'queryResult.count',
          operator: 'equals',
          value: 0,
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 100, y: 540 },
        data: {
          label: 'Crear reserva',
          tablePlaceholder: 'reservas',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'hora', value: '{{hora}}' },
            { key: 'estado', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 100, y: 670 },
        data: {
          label: 'Confirmación',
          message: '✅ ¡Reserva confirmada!\n\n📅 Fecha: {{fecha}}\n🕐 Hora: {{hora}}\n\n¡Te esperamos!',
        },
      },
      {
        id: 'message-unavailable',
        type: 'message',
        position: { x: 400, y: 540 },
        data: {
          label: 'No disponible',
          message: '⚠️ Lo sentimos, ese horario no está disponible.\n\n¿Quieres intentar con otro horario?',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'query-1' },
      { id: 'e3', source: 'query-1', target: 'condition-1' },
      { id: 'e4', source: 'condition-1', target: 'insert-1', sourceHandle: 'true' },
      { id: 'e5', source: 'condition-1', target: 'message-unavailable', sourceHandle: 'false' },
      { id: 'e6', source: 'insert-1', target: 'message-success' },
    ],
  },
  {
    _id: 'template-faq',
    name: 'Preguntas Frecuentes',
    description: 'Responde automáticamente preguntas comunes',
    icon: '❓',
    color: 'blue',
    isTemplate: true,
    category: 'support',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio FAQ',
          trigger: 'onMessage',
          keywords: ['preguntas', 'ayuda', 'información', 'info', 'faq', 'dudas'],
        },
      },
      {
        id: 'condition-horario',
        type: 'condition',
        position: { x: 100, y: 180 },
        data: {
          label: '¿Pregunta horario?',
          field: 'message',
          operator: 'contains',
          value: 'horario',
        },
      },
      {
        id: 'condition-precio',
        type: 'condition',
        position: { x: 400, y: 180 },
        data: {
          label: '¿Pregunta precio?',
          field: 'message',
          operator: 'contains',
          value: 'precio',
        },
      },
      {
        id: 'message-horario',
        type: 'message',
        position: { x: 100, y: 320 },
        data: {
          label: 'Respuesta horario',
          message: '🕐 Nuestros horarios:\n\nLunes a Viernes: 9:00 AM - 6:00 PM\nSábados: 10:00 AM - 2:00 PM\nDomingos: Cerrado',
        },
      },
      {
        id: 'message-precio',
        type: 'message',
        position: { x: 400, y: 320 },
        data: {
          label: 'Respuesta precio',
          message: '💰 Consulta nuestros precios en nuestra lista de servicios.\n\n¿Quieres que te muestre los servicios disponibles?',
        },
      },
      {
        id: 'message-default',
        type: 'message',
        position: { x: 250, y: 450 },
        data: {
          label: 'Respuesta general',
          message: '📋 ¿En qué puedo ayudarte?\n\n• Horarios\n• Precios\n• Servicios\n• Reservaciones',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'condition-horario' },
      { id: 'e2', source: 'condition-horario', target: 'message-horario', sourceHandle: 'true' },
      { id: 'e3', source: 'condition-horario', target: 'condition-precio', sourceHandle: 'false' },
      { id: 'e4', source: 'condition-precio', target: 'message-precio', sourceHandle: 'true' },
      { id: 'e5', source: 'condition-precio', target: 'message-default', sourceHandle: 'false' },
    ],
  },
  {
    _id: 'template-registration',
    name: 'Registro de Cliente',
    description: 'Captura datos de nuevos clientes',
    icon: '👤',
    color: 'purple',
    isTemplate: true,
    category: 'crm',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio Registro',
          trigger: 'onMessage',
          keywords: ['registrar', 'registro', 'nuevo cliente', 'registrarme'],
        },
      },
      {
        id: 'message-welcome',
        type: 'message',
        position: { x: 250, y: 150 },
        data: {
          label: 'Bienvenida',
          message: '👋 ¡Hola! Te ayudo con tu registro.\n\nNecesito algunos datos para completarlo.',
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 280 },
        data: {
          label: 'Datos personales',
          fields: [
            { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
            { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
            { key: 'telefono', label: 'Teléfono', type: 'phone', required: true },
          ],
        },
      },
      {
        id: 'query-check',
        type: 'query',
        position: { x: 250, y: 410 },
        data: {
          label: 'Verificar si existe',
          tablePlaceholder: 'clientes',
          operation: 'find',
          filters: [
            { field: 'email', operator: 'equals', value: '{{email}}' },
          ],
        },
      },
      {
        id: 'condition-exists',
        type: 'condition',
        position: { x: 250, y: 540 },
        data: {
          label: '¿Ya existe?',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 100, y: 670 },
        data: {
          label: 'Crear cliente',
          tablePlaceholder: 'clientes',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'telefono', value: '{{telefono}}' },
            { key: 'fechaRegistro', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 100, y: 800 },
        data: {
          label: 'Registro exitoso',
          message: '✅ ¡Registro completado!\n\n¡Bienvenido/a {{nombre}}! Ya puedes acceder a todos nuestros servicios.',
        },
      },
      {
        id: 'message-exists',
        type: 'message',
        position: { x: 400, y: 670 },
        data: {
          label: 'Ya registrado',
          message: '📋 Ya tienes una cuenta registrada con este correo.\n\n¿Necesitas ayuda con algo más?',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-welcome' },
      { id: 'e2', source: 'message-welcome', target: 'collect-1' },
      { id: 'e3', source: 'collect-1', target: 'query-check' },
      { id: 'e4', source: 'query-check', target: 'condition-exists' },
      { id: 'e5', source: 'condition-exists', target: 'message-exists', sourceHandle: 'true' },
      { id: 'e6', source: 'condition-exists', target: 'insert-1', sourceHandle: 'false' },
      { id: 'e7', source: 'insert-1', target: 'message-success' },
    ],
  },
  {
    _id: 'template-cancel',
    name: 'Cancelación',
    description: 'Gestiona cancelaciones de reservas o citas',
    icon: '❌',
    color: 'red',
    isTemplate: true,
    category: 'business',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio Cancelación',
          trigger: 'onMessage',
          keywords: ['cancelar', 'cancela', 'cancelación', 'anular'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 150 },
        data: {
          label: 'Identificación',
          fields: [
            { key: 'email', label: 'Correo de la reserva', type: 'email', required: true },
          ],
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 280 },
        data: {
          label: 'Buscar reserva',
          tablePlaceholder: 'reservas',
          operation: 'find',
          filters: [
            { field: 'email', operator: 'equals', value: '{{email}}' },
            { field: 'estado', operator: 'equals', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 410 },
        data: {
          label: '¿Reserva encontrada?',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'update-1',
        type: 'update',
        position: { x: 100, y: 540 },
        data: {
          label: 'Cancelar reserva',
          tablePlaceholder: 'reservas',
          recordId: '{{queryResult.docs[0]._id}}',
          fields: [
            { key: 'estado', value: 'cancelada' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 100, y: 670 },
        data: {
          label: 'Cancelación confirmada',
          message: '✅ Tu reserva ha sido cancelada.\n\nSi cambias de opinión, puedes hacer una nueva reserva cuando quieras.',
        },
      },
      {
        id: 'message-notfound',
        type: 'message',
        position: { x: 400, y: 540 },
        data: {
          label: 'No encontrada',
          message: '❌ No encontré ninguna reserva activa con ese correo.\n\n¿Quieres intentar con otro correo?',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'query-1' },
      { id: 'e3', source: 'query-1', target: 'condition-1' },
      { id: 'e4', source: 'condition-1', target: 'update-1', sourceHandle: 'true' },
      { id: 'e5', source: 'condition-1', target: 'message-notfound', sourceHandle: 'false' },
      { id: 'e6', source: 'update-1', target: 'message-success' },
    ],
  },
  {
    _id: 'template-notification',
    name: 'Notificación',
    description: 'Envía notificaciones automáticas',
    icon: '🔔',
    color: 'amber',
    isTemplate: true,
    category: 'automation',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Trigger',
          trigger: 'afterCreate',
          tablePlaceholder: 'ventas',
        },
      },
      {
        id: 'condition-monto',
        type: 'condition',
        position: { x: 250, y: 180 },
        data: {
          label: '¿Venta grande?',
          field: 'record.total',
          operator: 'greaterThan',
          value: 100000,
        },
      },
      {
        id: 'notify-1',
        type: 'notify',
        position: { x: 100, y: 320 },
        data: {
          label: 'Notificar equipo',
          channel: 'internal',
          message: '🎉 ¡Nueva venta importante!\n\nCliente: {{record.cliente}}\nTotal: ${{record.total}}',
        },
      },
      {
        id: 'message-log',
        type: 'message',
        position: { x: 400, y: 320 },
        data: {
          label: 'Log normal',
          message: 'Venta registrada: {{record.cliente}} - ${{record.total}}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'condition-monto' },
      { id: 'e2', source: 'condition-monto', target: 'notify-1', sourceHandle: 'true' },
      { id: 'e3', source: 'condition-monto', target: 'message-log', sourceHandle: 'false' },
    ],
  },
];

/**
 * Ejecuta el seed de plantillas de flujos
 */
export async function seedFlowTemplates() {
  console.log('📋 Seeding flow templates...');
  
  try {
    const db = await connectDB(getFlowTemplatesDbName());
    
    // Crear índice para isTemplate
    try {
      await db.createIndex({
        index: { fields: ['isTemplate'] },
        ddoc: 'template-index',
        name: 'isTemplate-index',
      });
    } catch (e) {
      // Índice ya existe
    }
    
    // Insertar o actualizar cada plantilla
    for (const template of FLOW_TEMPLATES) {
      try {
        // Verificar si existe
        const existing = await db.get(template._id).catch(() => null);
        
        if (existing) {
          // Actualizar
          await db.insert({ ...template, _rev: existing._rev });
          console.log(`  ✓ Template actualizado: ${template.name}`);
        } else {
          // Crear
          await db.insert(template);
          console.log(`  ✓ Template creado: ${template.name}`);
        }
      } catch (err) {
        console.error(`  ✗ Error con template ${template.name}:`, err.message);
      }
    }
    
    console.log(`✅ ${FLOW_TEMPLATES.length} flow templates seeded`);
    
  } catch (err) {
    console.error('❌ Error seeding flow templates:', err.message);
    throw err;
  }
}

export default seedFlowTemplates;
