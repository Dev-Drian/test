/**
 * Seed: Plantillas de Flujos Globales
 * 
 * Plantillas DINAMICAS filtradas por:
 * - Plan del usuario (free, basic, professional, enterprise)
 * - Tipo de negocio (salon, restaurant, clinic, gym, store, education, services, general)
 * - Categoria (business, support, crm, automation, marketing)
 */

import { connectDB, getFlowTemplatesDbName } from '../config/db.js';

// Tipos de negocio disponibles
export const BUSINESS_TYPES = [
  'salon', 'restaurant', 'clinic', 'gym', 'store', 'education', 'services', 'general'
];

// Planes disponibles
export const PLAN_TYPES = ['free', 'starter', 'premium', 'enterprise'];

// Categorias de plantillas
export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: 'grid' },
  { id: 'business', label: 'Negocio', icon: 'briefcase', description: 'Reservas, citas, pedidos' },
  { id: 'support', label: 'Soporte', icon: 'chat', description: 'FAQ, atencion al cliente' },
  { id: 'crm', label: 'CRM', icon: 'users', description: 'Clientes, seguimiento' },
  { id: 'automation', label: 'Automatizacion', icon: 'bolt', description: 'Notificaciones, alertas' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone', description: 'Promociones, campanas' },
];

/**
 * Plantillas de flujos predefinidas
 */
const FLOW_TEMPLATES = [
  // ============================================================================
  // PLANTILLAS FREE - Disponibles para todos
  // ============================================================================
  {
    _id: 'template-reservation-basic',
    name: 'Reservacion Simple',
    description: 'Flujo basico para gestionar reservas o citas',
    icon: 'calendar',
    color: 'emerald',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['free', 'starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio',
          trigger: 'onMessage',
          keywords: ['reservar', 'agendar', 'cita', 'reserva'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
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
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 310 },
        data: {
          label: 'Crear reserva',
          tablePlaceholder: 'reservas',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'hora', value: '{{hora}}' },
            { key: 'estado', value: 'pendiente' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 440 },
        data: {
          label: 'Confirmacion',
          message: 'Reserva registrada.\n\nFecha: {{fecha}}\nHora: {{hora}}\n\nTe contactaremos para confirmar.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },
  {
    _id: 'template-faq-basic',
    name: 'Preguntas Frecuentes',
    description: 'Responde automaticamente las preguntas mas comunes',
    icon: 'question',
    color: 'blue',
    isTemplate: true,
    category: 'support',
    requiredPlan: ['free', 'starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'store', 'education', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Preguntas',
          trigger: 'onMessage',
          keywords: ['horario', 'precio', 'ubicacion', 'contacto', 'informacion'],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 180 },
        data: {
          label: 'Tipo de pregunta',
          field: 'message',
          operator: 'contains',
          value: 'horario',
        },
      },
      {
        id: 'message-horario',
        type: 'message',
        position: { x: 100, y: 310 },
        data: {
          label: 'Horarios',
          message: 'Nuestros horarios son:\n\nLunes a Viernes: 9:00 - 18:00\nSabado: 9:00 - 14:00\nDomingo: Cerrado',
        },
      },
      {
        id: 'message-default',
        type: 'message',
        position: { x: 400, y: 310 },
        data: {
          label: 'Info general',
          message: 'Para mas informacion puedes contactarnos o visitar nuestra pagina web.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'condition-1' },
      { id: 'e2', source: 'condition-1', target: 'message-horario', sourceHandle: 'true' },
      { id: 'e3', source: 'condition-1', target: 'message-default', sourceHandle: 'false' },
    ],
  },
  {
    _id: 'template-contact-basic',
    name: 'Formulario de Contacto',
    description: 'Recopila informacion de contacto de clientes potenciales',
    icon: 'mail',
    color: 'cyan',
    isTemplate: true,
    category: 'crm',
    requiredPlan: ['free', 'starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'store', 'education', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo contacto',
          trigger: 'onMessage',
          keywords: ['contacto', 'informacion', 'consulta'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de contacto',
          fields: [
            { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
            { key: 'email', label: 'Correo electronico', type: 'email', required: true },
            { key: 'telefono', label: 'Telefono', type: 'phone' },
            { key: 'mensaje', label: 'Mensaje', type: 'text' },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Guardar contacto',
          tablePlaceholder: 'contactos',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'telefono', value: '{{telefono}}' },
            { key: 'mensaje', value: '{{mensaje}}' },
            { key: 'fechaRegistro', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Gracias por contactarnos, {{nombre}}.\n\nNos comunicaremos contigo pronto.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // ============================================================================
  // PLANTILLAS BASIC - Para planes basic+
  // ============================================================================
  {
    _id: 'template-reservation-advanced',
    name: 'Reservacion con Disponibilidad',
    description: 'Flujo completo con verificacion de disponibilidad en tiempo real',
    icon: 'calendar-check',
    color: 'emerald',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio',
          trigger: 'onMessage',
          keywords: ['reservar', 'agendar', 'cita', 'reserva', 'reservacion'],
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
          label: 'Disponible',
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
          label: 'Confirmacion',
          message: 'Reserva confirmada.\n\nFecha: {{fecha}}\nHora: {{hora}}\n\nTe esperamos.',
        },
      },
      {
        id: 'message-unavailable',
        type: 'message',
        position: { x: 400, y: 540 },
        data: {
          label: 'No disponible',
          message: 'Lo sentimos, ese horario no esta disponible.\n\nPor favor elige otra fecha u hora.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'query-1' },
      { id: 'e3', source: 'query-1', target: 'condition-1' },
      { id: 'e4', source: 'condition-1', target: 'insert-1', sourceHandle: 'true' },
      { id: 'e5', source: 'insert-1', target: 'message-success' },
      { id: 'e6', source: 'condition-1', target: 'message-unavailable', sourceHandle: 'false' },
    ],
  },
  {
    _id: 'template-registration',
    name: 'Registro de Clientes',
    description: 'Captura y guarda informacion completa de nuevos clientes',
    icon: 'user-plus',
    color: 'violet',
    isTemplate: true,
    category: 'crm',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'store', 'education', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo cliente',
          trigger: 'onMessage',
          keywords: ['registrar', 'inscribir', 'nuevo', 'registro'],
        },
      },
      {
        id: 'message-welcome',
        type: 'message',
        position: { x: 250, y: 150 },
        data: {
          label: 'Bienvenida',
          message: 'Bienvenido. Vamos a registrar tus datos.',
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 280 },
        data: {
          label: 'Datos del cliente',
          fields: [
            { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
            { key: 'email', label: 'Correo electronico', type: 'email', required: true },
            { key: 'telefono', label: 'Telefono', type: 'phone', required: true },
            { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date' },
          ],
        },
      },
      {
        id: 'query-check',
        type: 'query',
        position: { x: 250, y: 410 },
        data: {
          label: 'Verificar duplicado',
          tablePlaceholder: 'clientes',
          operation: 'count',
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
          label: 'Ya existe',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'message-exists',
        type: 'message',
        position: { x: 100, y: 670 },
        data: {
          label: 'Cliente existe',
          message: 'Ya tienes una cuenta registrada con ese correo.\n\nEn que mas puedo ayudarte?',
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 400, y: 670 },
        data: {
          label: 'Crear cliente',
          tablePlaceholder: 'clientes',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'telefono', value: '{{telefono}}' },
            { key: 'fechaNacimiento', value: '{{fechaNacimiento}}' },
            { key: 'fechaRegistro', value: '{{today}}' },
            { key: 'estado', value: 'activo' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 400, y: 800 },
        data: {
          label: 'Registro exitoso',
          message: 'Registro completado, {{nombre}}.\n\nBienvenido.',
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
    name: 'Cancelacion de Citas',
    description: 'Permite a los clientes cancelar sus reservas facilmente',
    icon: 'x-circle',
    color: 'red',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Cancelacion',
          trigger: 'onMessage',
          keywords: ['cancelar', 'anular', 'eliminar cita'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 150 },
        data: {
          label: 'Buscar reserva',
          fields: [
            { key: 'telefono', label: 'Tu numero de telefono', type: 'phone', required: true },
          ],
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 280 },
        data: {
          label: 'Buscar cita',
          tablePlaceholder: 'reservas',
          operation: 'find',
          filters: [
            { field: 'telefono', operator: 'equals', value: '{{telefono}}' },
            { field: 'estado', operator: 'equals', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'condition-found',
        type: 'condition',
        position: { x: 250, y: 410 },
        data: {
          label: 'Cita encontrada',
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
          label: 'Cancelar cita',
          tablePlaceholder: 'reservas',
          filters: [
            { field: 'telefono', equals: '{{telefono}}' },
            { field: 'estado', equals: 'confirmada' },
          ],
          fields: [
            { key: 'estado', value: 'cancelada' },
            { key: 'fechaCancelacion', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-cancelled',
        type: 'message',
        position: { x: 100, y: 670 },
        data: {
          label: 'Confirmacion',
          message: 'Tu cita ha sido cancelada.\n\nSi deseas reagendar, estamos para ayudarte.',
        },
      },
      {
        id: 'message-not-found',
        type: 'message',
        position: { x: 400, y: 540 },
        data: {
          label: 'No encontrada',
          message: 'No encontramos ninguna cita activa con ese numero.\n\nVerifica tus datos o contactanos.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'query-1' },
      { id: 'e3', source: 'query-1', target: 'condition-found' },
      { id: 'e4', source: 'condition-found', target: 'update-1', sourceHandle: 'true' },
      { id: 'e5', source: 'update-1', target: 'message-cancelled' },
      { id: 'e6', source: 'condition-found', target: 'message-not-found', sourceHandle: 'false' },
    ],
  },
  
  // ============================================================================
  // PLANTILLAS PROFESSIONAL - Para planes professional+
  // ============================================================================
  {
    _id: 'template-reminder',
    name: 'Recordatorios Automaticos',
    description: 'Envia recordatorios automaticos antes de las citas programadas',
    icon: 'bell',
    color: 'cyan',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'education', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Trigger Diario',
          trigger: 'schedule',
          schedule: { time: '08:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 180 },
        data: {
          label: 'Buscar citas de manana',
          tablePlaceholder: 'citas',
          operation: 'find',
          filters: [
            { field: 'fecha', operator: 'equals', value: '{{tomorrow}}' },
            { field: 'estado', operator: 'equals', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 310 },
        data: {
          label: 'Hay citas',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'notify-1',
        type: 'notify',
        position: { x: 100, y: 440 },
        data: {
          label: 'Enviar recordatorios',
          channel: 'sms',
          message: 'Recordatorio: Tienes una cita programada para manana a las {{hora}}.\n\nPara cancelar responde CANCELAR.',
          forEach: 'queryResult.docs',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'query-1' },
      { id: 'e2', source: 'query-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'notify-1', sourceHandle: 'true' },
    ],
  },
  {
    _id: 'template-survey',
    name: 'Encuesta de Satisfaccion',
    description: 'Solicita y registra feedback de clientes despues del servicio',
    icon: 'star',
    color: 'yellow',
    isTemplate: true,
    category: 'crm',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'store', 'education', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Despues de servicio',
          trigger: 'afterUpdate',
          tablePlaceholder: 'servicios',
          condition: { field: 'estado', equals: 'completado' },
        },
      },
      {
        id: 'message-1',
        type: 'message',
        position: { x: 250, y: 180 },
        data: {
          label: 'Solicitar calificacion',
          message: 'Gracias por tu visita.\n\nCalifica tu experiencia del 1 al 5 (siendo 5 excelente).',
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 310 },
        data: {
          label: 'Recibir calificacion',
          fields: [
            { key: 'calificacion', label: 'Calificacion', type: 'number', validation: { min: 1, max: 5 } },
            { key: 'comentario', label: 'Comentario (opcional)', type: 'text' },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 440 },
        data: {
          label: 'Guardar feedback',
          tablePlaceholder: 'feedback',
          fields: [
            { key: 'cliente', value: '{{record.cliente}}' },
            { key: 'calificacion', value: '{{calificacion}}' },
            { key: 'comentario', value: '{{comentario}}' },
            { key: 'servicio', value: '{{record._id}}' },
            { key: 'fecha', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-thanks',
        type: 'message',
        position: { x: 250, y: 570 },
        data: {
          label: 'Agradecimiento',
          message: 'Gracias por tu opinion.\n\nNos ayuda a mejorar.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-1' },
      { id: 'e2', source: 'message-1', target: 'collect-1' },
      { id: 'e3', source: 'collect-1', target: 'insert-1' },
      { id: 'e4', source: 'insert-1', target: 'message-thanks' },
    ],
  },
  {
    _id: 'template-followup',
    name: 'Seguimiento Post-Venta',
    description: 'Contacta automaticamente despues de una compra importante',
    icon: 'phone',
    color: 'indigo',
    isTemplate: true,
    category: 'crm',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['store', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Despues de venta',
          trigger: 'afterCreate',
          tablePlaceholder: 'ventas',
        },
      },
      {
        id: 'condition-monto',
        type: 'condition',
        position: { x: 250, y: 180 },
        data: {
          label: 'Compra mayor a $500',
          field: 'record.total',
          operator: 'greaterThan',
          value: 500,
        },
      },
      {
        id: 'notify-team',
        type: 'notify',
        position: { x: 100, y: 310 },
        data: {
          label: 'Notificar equipo',
          channel: 'internal',
          message: 'Venta importante realizada\n\nCliente: {{record.cliente}}\nTotal: ${{record.total}}\n\nAsignar seguimiento personalizado.',
        },
      },
      {
        id: 'update-1',
        type: 'update',
        position: { x: 100, y: 440 },
        data: {
          label: 'Marcar para seguimiento',
          tablePlaceholder: 'clientes',
          filters: [{ field: 'nombre', equals: '{{record.cliente}}' }],
          fields: [
            { key: 'requiereSeguimiento', value: true },
            { key: 'ultimaCompra', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-thanks',
        type: 'message',
        position: { x: 250, y: 570 },
        data: {
          label: 'Agradecimiento',
          message: 'Gracias por tu compra, {{record.cliente}}.\n\nSi tienes alguna pregunta, estamos para ayudarte.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'condition-monto' },
      { id: 'e2', source: 'condition-monto', target: 'notify-team', sourceHandle: 'true' },
      { id: 'e3', source: 'notify-team', target: 'update-1' },
      { id: 'e4', source: 'update-1', target: 'message-thanks' },
      { id: 'e5', source: 'condition-monto', target: 'message-thanks', sourceHandle: 'false' },
    ],
  },
  {
    _id: 'template-notification',
    name: 'Notificacion de Ventas',
    description: 'Notifica al equipo cuando se registra una venta importante',
    icon: 'bell-ring',
    color: 'amber',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['store', 'restaurant', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva venta',
          trigger: 'afterCreate',
          tablePlaceholder: 'ventas',
        },
      },
      {
        id: 'condition-monto',
        type: 'condition',
        position: { x: 250, y: 180 },
        data: {
          label: 'Monto alto',
          field: 'record.total',
          operator: 'greaterThan',
          value: 1000,
        },
      },
      {
        id: 'notify-1',
        type: 'notify',
        position: { x: 100, y: 320 },
        data: {
          label: 'Notificar equipo',
          channel: 'internal',
          message: 'VENTA IMPORTANTE\n\nCliente: {{record.cliente}}\nTotal: ${{record.total}}\nProductos: {{record.productos}}',
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

  // ============================================================================
  // PLANTILLAS ENTERPRISE - Solo para planes enterprise
  // ============================================================================
  {
    _id: 'template-promotion-vip',
    name: 'Promociones para VIP',
    description: 'Envia ofertas exclusivas diferenciadas por tipo de cliente',
    icon: 'gift',
    color: 'pink',
    isTemplate: true,
    category: 'marketing',
    requiredPlan: ['enterprise'],
    businessTypes: ['salon', 'restaurant', 'gym', 'store', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio Promocion',
          trigger: 'onMessage',
          keywords: ['promocion', 'oferta', 'descuento', 'promo'],
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 180 },
        data: {
          label: 'Buscar cliente',
          tablePlaceholder: 'clientes',
          operation: 'find',
          filters: [
            { field: 'telefono', operator: 'equals', value: '{{sender.phone}}' },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 310 },
        data: {
          label: 'Es cliente VIP',
          field: 'queryResult.docs[0].tipo',
          operator: 'equals',
          value: 'VIP',
        },
      },
      {
        id: 'message-vip',
        type: 'message',
        position: { x: 100, y: 440 },
        data: {
          label: 'Promo VIP',
          message: 'Hola {{queryResult.docs[0].nombre}}.\n\nComo cliente VIP tienes un 30% de descuento exclusivo.\n\nCodigo: VIP30',
        },
      },
      {
        id: 'message-regular',
        type: 'message',
        position: { x: 400, y: 440 },
        data: {
          label: 'Promo Regular',
          message: 'Tenemos promociones para ti.\n\n15% de descuento esta semana.\n\nCodigo: PROMO15',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'query-1' },
      { id: 'e2', source: 'query-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'message-vip', sourceHandle: 'true' },
      { id: 'e4', source: 'condition-1', target: 'message-regular', sourceHandle: 'false' },
    ],
  },
  {
    _id: 'template-waitlist',
    name: 'Lista de Espera Inteligente',
    description: 'Gestiona lista de espera con notificacion automatica',
    icon: 'clipboard-list',
    color: 'orange',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['enterprise'],
    businessTypes: ['salon', 'restaurant', 'clinic', 'gym', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Inicio Lista Espera',
          trigger: 'onMessage',
          keywords: ['lista de espera', 'esperar', 'avisar', 'disponibilidad'],
        },
      },
      {
        id: 'message-1',
        type: 'message',
        position: { x: 250, y: 180 },
        data: {
          label: 'Confirmar lista',
          message: 'Te agregamos a nuestra lista de espera.\n\nTe avisaremos cuando haya disponibilidad.\n\nPara que fecha te gustaria?',
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 310 },
        data: {
          label: 'Datos de espera',
          fields: [
            { key: 'nombre', label: 'Tu nombre', type: 'text', required: true },
            { key: 'telefono', label: 'Telefono', type: 'phone', required: true },
            { key: 'fechaDeseada', label: 'Fecha preferida', type: 'date' },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 440 },
        data: {
          label: 'Agregar a lista',
          tablePlaceholder: 'lista_espera',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'telefono', value: '{{telefono}}' },
            { key: 'fechaDeseada', value: '{{fechaDeseada}}' },
            { key: 'estado', value: 'pendiente' },
            { key: 'fechaRegistro', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 570 },
        data: {
          label: 'Confirmacion',
          message: 'Listo, {{nombre}}.\n\nEstas en la lista de espera.\n\nTe contactaremos al {{telefono}} cuando haya disponibilidad.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-1' },
      { id: 'e2', source: 'message-1', target: 'collect-1' },
      { id: 'e3', source: 'collect-1', target: 'insert-1' },
      { id: 'e4', source: 'insert-1', target: 'message-success' },
    ],
  },
  {
    _id: 'template-loyalty',
    name: 'Programa de Fidelidad',
    description: 'Gestiona puntos y recompensas automaticamente',
    icon: 'award',
    color: 'amber',
    isTemplate: true,
    category: 'marketing',
    requiredPlan: ['enterprise'],
    businessTypes: ['salon', 'restaurant', 'gym', 'store', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Consulta puntos',
          trigger: 'onMessage',
          keywords: ['puntos', 'recompensas', 'fidelidad', 'beneficios'],
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 180 },
        data: {
          label: 'Buscar cliente',
          tablePlaceholder: 'clientes',
          operation: 'find',
          filters: [
            { field: 'telefono', operator: 'equals', value: '{{sender.phone}}' },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 310 },
        data: {
          label: 'Es miembro',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'message-points',
        type: 'message',
        position: { x: 100, y: 440 },
        data: {
          label: 'Mostrar puntos',
          message: 'Hola {{queryResult.docs[0].nombre}}.\n\nTienes {{queryResult.docs[0].puntos}} puntos acumulados.\n\nCon 100 puntos obtienes un 20% de descuento.',
        },
      },
      {
        id: 'message-register',
        type: 'message',
        position: { x: 400, y: 440 },
        data: {
          label: 'Invitar registro',
          message: 'Aun no eres parte de nuestro programa de fidelidad.\n\nRegistrate y obtiene puntos en cada visita.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'query-1' },
      { id: 'e2', source: 'query-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'message-points', sourceHandle: 'true' },
      { id: 'e4', source: 'condition-1', target: 'message-register', sourceHandle: 'false' },
    ],
  },

  // ============================================================================
  // PLANTILLAS POR TIPO DE NEGOCIO ESPECIFICO
  // ============================================================================
  
  // SALON / BARBERIA
  {
    _id: 'template-salon-appointment',
    name: 'Citas de Salon',
    description: 'Gestiona citas con seleccion de servicio y estilista',
    icon: 'scissors',
    color: 'pink',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['salon'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Agendar cita',
          trigger: 'onMessage',
          keywords: ['corte', 'cita', 'salon', 'peinado', 'tinte'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de cita',
          fields: [
            { key: 'nombre', label: 'Tu nombre', type: 'text', required: true },
            { key: 'servicio', label: 'Que servicio deseas', type: 'select', options: ['Corte', 'Tinte', 'Peinado', 'Tratamiento'], required: true },
            { key: 'fecha', label: 'Fecha preferida', type: 'date', required: true },
            { key: 'hora', label: 'Hora preferida', type: 'time', required: true },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Crear cita',
          tablePlaceholder: 'citas',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'servicio', value: '{{servicio}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'hora', value: '{{hora}}' },
            { key: 'estado', value: 'pendiente' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Cita registrada.\n\nServicio: {{servicio}}\nFecha: {{fecha}}\nHora: {{hora}}\n\nTe confirmaremos pronto.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // RESTAURANTE
  {
    _id: 'template-restaurant-reservation',
    name: 'Reserva de Mesa',
    description: 'Reservaciones con seleccion de zona y personas',
    icon: 'utensils',
    color: 'orange',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['restaurant'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Reservar mesa',
          trigger: 'onMessage',
          keywords: ['mesa', 'reserva', 'cenar', 'restaurante'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de reserva',
          fields: [
            { key: 'nombre', label: 'Nombre de la reserva', type: 'text', required: true },
            { key: 'personas', label: 'Numero de personas', type: 'number', required: true },
            { key: 'fecha', label: 'Fecha', type: 'date', required: true },
            { key: 'hora', label: 'Hora', type: 'time', required: true },
            { key: 'zona', label: 'Zona preferida', type: 'select', options: ['Interior', 'Terraza', 'Bar', 'Sin preferencia'] },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Crear reserva',
          tablePlaceholder: 'reservas',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'personas', value: '{{personas}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'hora', value: '{{hora}}' },
            { key: 'zona', value: '{{zona}}' },
            { key: 'estado', value: 'pendiente' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Reserva registrada.\n\nMesa para {{personas}} personas\nFecha: {{fecha}} a las {{hora}}\nZona: {{zona}}\n\nTe esperamos.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // CLINICA
  {
    _id: 'template-clinic-appointment',
    name: 'Cita Medica',
    description: 'Agenda citas medicas con seleccion de especialidad',
    icon: 'stethoscope',
    color: 'green',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['clinic'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva cita',
          trigger: 'onMessage',
          keywords: ['cita', 'consulta', 'doctor', 'medico', 'agendar'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos del paciente',
          fields: [
            { key: 'nombre', label: 'Nombre del paciente', type: 'text', required: true },
            { key: 'especialidad', label: 'Especialidad', type: 'select', options: ['Medicina General', 'Pediatria', 'Dermatologia', 'Cardiologia'], required: true },
            { key: 'fecha', label: 'Fecha preferida', type: 'date', required: true },
            { key: 'motivo', label: 'Motivo de consulta', type: 'text' },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Registrar cita',
          tablePlaceholder: 'citas',
          fields: [
            { key: 'paciente', value: '{{nombre}}' },
            { key: 'especialidad', value: '{{especialidad}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'motivo', value: '{{motivo}}' },
            { key: 'estado', value: 'por confirmar' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Solicitud de cita recibida.\n\nEspecialidad: {{especialidad}}\nFecha solicitada: {{fecha}}\n\nTe contactaremos para confirmar horario.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // GIMNASIO
  {
    _id: 'template-gym-class',
    name: 'Reserva de Clase',
    description: 'Permite reservar lugar en clases grupales',
    icon: 'dumbbell',
    color: 'red',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['gym'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Reservar clase',
          trigger: 'onMessage',
          keywords: ['clase', 'reservar', 'yoga', 'spinning', 'crossfit'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de reserva',
          fields: [
            { key: 'nombre', label: 'Tu nombre', type: 'text', required: true },
            { key: 'clase', label: 'Tipo de clase', type: 'select', options: ['Yoga', 'Spinning', 'CrossFit', 'Pilates', 'Zumba'], required: true },
            { key: 'fecha', label: 'Fecha', type: 'date', required: true },
            { key: 'horario', label: 'Horario', type: 'select', options: ['07:00', '09:00', '17:00', '19:00'], required: true },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Registrar reserva',
          tablePlaceholder: 'reservas',
          fields: [
            { key: 'miembro', value: '{{nombre}}' },
            { key: 'clase', value: '{{clase}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'horario', value: '{{horario}}' },
            { key: 'estado', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Lugar reservado.\n\nClase: {{clase}}\nFecha: {{fecha}}\nHorario: {{horario}}\n\nRecuerda llegar 10 minutos antes.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // TIENDA / ECOMMERCE
  {
    _id: 'template-store-order',
    name: 'Pedido Rapido',
    description: 'Toma pedidos de productos directamente por chat',
    icon: 'shopping-cart',
    color: 'violet',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['store'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo pedido',
          trigger: 'onMessage',
          keywords: ['pedido', 'comprar', 'ordenar', 'quiero'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos del pedido',
          fields: [
            { key: 'nombre', label: 'Tu nombre', type: 'text', required: true },
            { key: 'producto', label: 'Que producto deseas', type: 'text', required: true },
            { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
            { key: 'direccion', label: 'Direccion de entrega', type: 'text', required: true },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Registrar pedido',
          tablePlaceholder: 'pedidos',
          fields: [
            { key: 'cliente', value: '{{nombre}}' },
            { key: 'producto', value: '{{producto}}' },
            { key: 'cantidad', value: '{{cantidad}}' },
            { key: 'direccion', value: '{{direccion}}' },
            { key: 'estado', value: 'pendiente' },
            { key: 'fechaPedido', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Pedido registrado.\n\nProducto: {{producto}}\nCantidad: {{cantidad}}\n\nTe contactaremos para confirmar disponibilidad y precio.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // ACADEMIA / EDUCACION
  {
    _id: 'template-education-enrollment',
    name: 'Inscripcion a Curso',
    description: 'Gestiona inscripciones a cursos o talleres',
    icon: 'graduation-cap',
    color: 'blue',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['education'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva inscripcion',
          trigger: 'onMessage',
          keywords: ['inscribir', 'curso', 'taller', 'clase', 'aprender'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de inscripcion',
          fields: [
            { key: 'nombre', label: 'Nombre del estudiante', type: 'text', required: true },
            { key: 'email', label: 'Correo electronico', type: 'email', required: true },
            { key: 'curso', label: 'Curso de interes', type: 'text', required: true },
            { key: 'nivel', label: 'Nivel', type: 'select', options: ['Principiante', 'Intermedio', 'Avanzado'] },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Registrar inscripcion',
          tablePlaceholder: 'inscripciones',
          fields: [
            { key: 'estudiante', value: '{{nombre}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'curso', value: '{{curso}}' },
            { key: 'nivel', value: '{{nivel}}' },
            { key: 'estado', value: 'pre-inscrito' },
            { key: 'fechaRegistro', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Pre-inscripcion registrada.\n\nCurso: {{curso}}\nNivel: {{nivel}}\n\nTe enviaremos los detalles a {{email}}.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // SERVICIOS PROFESIONALES
  {
    _id: 'template-services-quote',
    name: 'Solicitud de Cotizacion',
    description: 'Recibe solicitudes de cotizacion de servicios',
    icon: 'file-text',
    color: 'slate',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['starter', 'premium', 'enterprise'],
    businessTypes: ['services'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva cotizacion',
          trigger: 'onMessage',
          keywords: ['cotizacion', 'presupuesto', 'precio', 'costo', 'cuanto'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 180 },
        data: {
          label: 'Datos de cotizacion',
          fields: [
            { key: 'nombre', label: 'Nombre o empresa', type: 'text', required: true },
            { key: 'email', label: 'Correo electronico', type: 'email', required: true },
            { key: 'servicio', label: 'Servicio requerido', type: 'text', required: true },
            { key: 'descripcion', label: 'Describe tu proyecto', type: 'text', required: true },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 340 },
        data: {
          label: 'Registrar solicitud',
          tablePlaceholder: 'cotizaciones',
          fields: [
            { key: 'cliente', value: '{{nombre}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'servicio', value: '{{servicio}}' },
            { key: 'descripcion', value: '{{descripcion}}' },
            { key: 'estado', value: 'pendiente' },
            { key: 'fechaSolicitud', value: '{{today}}' },
          ],
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 250, y: 470 },
        data: {
          label: 'Confirmacion',
          message: 'Solicitud recibida.\n\nServicio: {{servicio}}\n\nPreparamos tu cotizacion y te la enviaremos a {{email}} en las proximas 24 horas.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-success' },
    ],
  },

  // ============================================================================
  // NUEVAS PLANTILLAS CON NODOS AVANZADOS
  // ============================================================================

  // Follow-up automatico con tiempo de espera
  {
    _id: 'template-followup-delayed',
    name: 'Follow-up Automatico',
    description: 'Envia mensaje de seguimiento despues de un tiempo de espera',
    icon: 'clock',
    color: 'indigo',
    isTemplate: true,
    category: 'crm',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'store', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Despues de cita',
          trigger: 'afterUpdate',
          tablePlaceholder: 'citas',
          condition: { field: 'estado', equals: 'completada' },
        },
      },
      {
        id: 'wait-1',
        type: 'wait',
        position: { x: 250, y: 180 },
        data: {
          label: 'Esperar 2 horas',
          duration: 2,
          unit: 'hours',
        },
      },
      {
        id: 'whatsapp-1',
        type: 'whatsapp',
        position: { x: 250, y: 310 },
        data: {
          label: 'Mensaje WhatsApp',
          to: '{{record.telefono}}',
          message: 'Hola {{record.nombre}}!\n\nGracias por tu visita hoy. Esperamos que hayas tenido una excelente experiencia.\n\nTe gustaria dejarnos una resena? Tu opinion nos ayuda a mejorar.',
        },
      },
      {
        id: 'update-1',
        type: 'update',
        position: { x: 250, y: 440 },
        data: {
          label: 'Marcar seguimiento',
          tablePlaceholder: 'citas',
          recordId: '{{record._id}}',
          fields: [
            { key: 'followupEnviado', value: true },
            { key: 'fechaFollowup', value: '{{now}}' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'wait-1' },
      { id: 'e2', source: 'wait-1', target: 'whatsapp-1' },
      { id: 'e3', source: 'whatsapp-1', target: 'update-1' },
    ],
  },

  // Confirmacion de cita con email
  {
    _id: 'template-confirmation-email',
    name: 'Confirmacion por Email',
    description: 'Envia confirmacion automatica por correo electronico',
    icon: 'mail',
    color: 'blue',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'education', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva reserva',
          trigger: 'afterCreate',
          tablePlaceholder: 'reservas',
        },
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 250, y: 180 },
        data: {
          label: 'Enviar confirmacion',
          to: '{{record.email}}',
          subject: 'Confirmacion de tu reserva',
          body: 'Hola {{record.nombre}},\n\nTu reserva ha sido registrada exitosamente.\n\nDetalles:\n- Fecha: {{record.fecha}}\n- Hora: {{record.hora}}\n\nTe esperamos!\n\nSaludos.',
        },
      },
      {
        id: 'notification-1',
        type: 'notification',
        position: { x: 250, y: 310 },
        data: {
          label: 'Notificar equipo',
          channel: 'internal',
          message: 'Nueva reserva recibida\n\nCliente: {{record.nombre}}\nFecha: {{record.fecha}}\nHora: {{record.hora}}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'email-1' },
      { id: 'e2', source: 'email-1', target: 'notification-1' },
    ],
  },

  // Aprobacion manual de reservas
  {
    _id: 'template-approval-flow',
    name: 'Reserva con Aprobacion',
    description: 'Requiere aprobacion manual antes de confirmar la reserva',
    icon: 'check-circle',
    color: 'emerald',
    isTemplate: true,
    category: 'business',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'restaurant', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nueva solicitud',
          trigger: 'onMessage',
          keywords: ['reservar', 'agendar', 'cita'],
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
            { key: 'telefono', label: 'Telefono', type: 'phone', required: true },
            { key: 'fecha', label: 'Fecha', type: 'date', required: true },
            { key: 'hora', label: 'Hora', type: 'time', required: true },
          ],
        },
      },
      {
        id: 'insert-1',
        type: 'insert',
        position: { x: 250, y: 280 },
        data: {
          label: 'Crear solicitud',
          tablePlaceholder: 'reservas',
          fields: [
            { key: 'nombre', value: '{{nombre}}' },
            { key: 'telefono', value: '{{telefono}}' },
            { key: 'fecha', value: '{{fecha}}' },
            { key: 'hora', value: '{{hora}}' },
            { key: 'estado', value: 'pendiente_aprobacion' },
          ],
        },
      },
      {
        id: 'message-pending',
        type: 'message',
        position: { x: 250, y: 410 },
        data: {
          label: 'Mensaje espera',
          message: 'Tu solicitud ha sido recibida.\n\nFecha: {{fecha}}\nHora: {{hora}}\n\nEn breve te confirmaremos la disponibilidad.',
        },
      },
      {
        id: 'approval-1',
        type: 'approval',
        position: { x: 250, y: 540 },
        data: {
          label: 'Esperar aprobacion',
          assignTo: 'admin',
          message: 'Nueva solicitud de reserva\n\nCliente: {{nombre}}\nFecha: {{fecha}} {{hora}}',
          timeout: { value: 24, unit: 'hours' },
        },
      },
      {
        id: 'condition-approved',
        type: 'condition',
        position: { x: 250, y: 670 },
        data: {
          label: 'Aprobada?',
          field: 'approval.status',
          operator: 'equals',
          value: 'approved',
        },
      },
      {
        id: 'update-approved',
        type: 'update',
        position: { x: 100, y: 800 },
        data: {
          label: 'Confirmar reserva',
          tablePlaceholder: 'reservas',
          recordId: '{{insertResult._id}}',
          fields: [
            { key: 'estado', value: 'confirmada' },
          ],
        },
      },
      {
        id: 'whatsapp-approved',
        type: 'whatsapp',
        position: { x: 100, y: 930 },
        data: {
          label: 'Notificar aprobacion',
          to: '{{telefono}}',
          message: 'Tu reserva ha sido CONFIRMADA!\n\nFecha: {{fecha}}\nHora: {{hora}}\n\nTe esperamos!',
        },
      },
      {
        id: 'update-rejected',
        type: 'update',
        position: { x: 400, y: 800 },
        data: {
          label: 'Rechazar reserva',
          tablePlaceholder: 'reservas',
          recordId: '{{insertResult._id}}',
          fields: [
            { key: 'estado', value: 'rechazada' },
          ],
        },
      },
      {
        id: 'whatsapp-rejected',
        type: 'whatsapp',
        position: { x: 400, y: 930 },
        data: {
          label: 'Notificar rechazo',
          to: '{{telefono}}',
          message: 'Lo sentimos, no tenemos disponibilidad para la fecha solicitada.\n\nPor favor intenta con otra fecha u hora.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'insert-1' },
      { id: 'e3', source: 'insert-1', target: 'message-pending' },
      { id: 'e4', source: 'message-pending', target: 'approval-1' },
      { id: 'e5', source: 'approval-1', target: 'condition-approved' },
      { id: 'e6', source: 'condition-approved', target: 'update-approved', sourceHandle: 'true' },
      { id: 'e7', source: 'update-approved', target: 'whatsapp-approved' },
      { id: 'e8', source: 'condition-approved', target: 'update-rejected', sourceHandle: 'false' },
      { id: 'e9', source: 'update-rejected', target: 'whatsapp-rejected' },
    ],
  },

  // Webhook para integracion externa
  {
    _id: 'template-webhook-integration',
    name: 'Integracion con Webhook',
    description: 'Envia datos a un sistema externo via webhook (Zapier, Make, etc)',
    icon: 'link',
    color: 'violet',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'store', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo registro',
          trigger: 'afterCreate',
          tablePlaceholder: 'clientes',
        },
      },
      {
        id: 'transform-1',
        type: 'transform',
        position: { x: 250, y: 180 },
        data: {
          label: 'Preparar datos',
          operations: [
            { output: 'fullName', expression: '{{record.nombre}} {{record.apellido}}' },
            { output: 'registrationDate', expression: '{{formatDate record.createdAt "YYYY-MM-DD"}}' },
          ],
        },
      },
      {
        id: 'webhook-1',
        type: 'webhook',
        position: { x: 250, y: 310 },
        data: {
          label: 'Enviar a Zapier',
          url: '{{settings.zapierWebhook}}',
          method: 'POST',
          body: {
            event: 'new_customer',
            customer: {
              name: '{{fullName}}',
              email: '{{record.email}}',
              phone: '{{record.telefono}}',
              date: '{{registrationDate}}',
            },
          },
        },
      },
      {
        id: 'condition-success',
        type: 'condition',
        position: { x: 250, y: 440 },
        data: {
          label: 'Exito?',
          field: 'webhookResult.status',
          operator: 'equals',
          value: 200,
        },
      },
      {
        id: 'notification-success',
        type: 'notification',
        position: { x: 100, y: 570 },
        data: {
          label: 'Log exito',
          channel: 'internal',
          message: 'Cliente sincronizado con CRM externo: {{record.nombre}}',
        },
      },
      {
        id: 'notification-error',
        type: 'notification',
        position: { x: 400, y: 570 },
        data: {
          label: 'Log error',
          channel: 'internal',
          message: 'Error al sincronizar cliente {{record.nombre}}: {{webhookResult.error}}',
          priority: 'high',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'transform-1' },
      { id: 'e2', source: 'transform-1', target: 'webhook-1' },
      { id: 'e3', source: 'webhook-1', target: 'condition-success' },
      { id: 'e4', source: 'condition-success', target: 'notification-success', sourceHandle: 'true' },
      { id: 'e5', source: 'condition-success', target: 'notification-error', sourceHandle: 'false' },
    ],
  },

  // Recordatorios programados con loop
  {
    _id: 'template-scheduled-reminders',
    name: 'Recordatorios Masivos',
    description: 'Envia recordatorios a todos los clientes con citas programadas',
    icon: 'bell',
    color: 'amber',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'education', 'general'],
    nodes: [
      {
        id: 'schedule-1',
        type: 'schedule',
        position: { x: 250, y: 50 },
        data: {
          label: 'Cada manana',
          schedule: {
            type: 'daily',
            time: '08:00',
            timezone: 'America/Bogota',
          },
        },
      },
      {
        id: 'query-1',
        type: 'query',
        position: { x: 250, y: 180 },
        data: {
          label: 'Citas de hoy',
          tablePlaceholder: 'citas',
          operation: 'find',
          filters: [
            { field: 'fecha', operator: 'equals', value: '{{today}}' },
            { field: 'estado', operator: 'equals', value: 'confirmada' },
            { field: 'recordatorioEnviado', operator: 'notEquals', value: true },
          ],
        },
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 310 },
        data: {
          label: 'Hay citas?',
          field: 'queryResult.count',
          operator: 'greaterThan',
          value: 0,
        },
      },
      {
        id: 'loop-1',
        type: 'loop',
        position: { x: 250, y: 440 },
        data: {
          label: 'Para cada cita',
          collection: 'queryResult.docs',
          itemVariable: 'cita',
        },
      },
      {
        id: 'sms-1',
        type: 'sms',
        position: { x: 250, y: 570 },
        data: {
          label: 'Enviar SMS',
          to: '{{cita.telefono}}',
          message: 'Recordatorio: Tienes cita hoy a las {{cita.hora}}. Te esperamos!',
        },
      },
      {
        id: 'update-1',
        type: 'update',
        position: { x: 250, y: 700 },
        data: {
          label: 'Marcar enviado',
          tablePlaceholder: 'citas',
          recordId: '{{cita._id}}',
          fields: [
            { key: 'recordatorioEnviado', value: true },
          ],
        },
      },
      {
        id: 'notification-end',
        type: 'notification',
        position: { x: 250, y: 830 },
        data: {
          label: 'Resumen',
          channel: 'internal',
          message: 'Recordatorios enviados: {{queryResult.count}} citas para hoy',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'schedule-1', target: 'query-1' },
      { id: 'e2', source: 'query-1', target: 'condition-1' },
      { id: 'e3', source: 'condition-1', target: 'loop-1', sourceHandle: 'true' },
      { id: 'e4', source: 'loop-1', target: 'sms-1' },
      { id: 'e5', source: 'sms-1', target: 'update-1' },
      { id: 'e6', source: 'update-1', target: 'loop-1', label: 'siguiente' },
      { id: 'e7', source: 'loop-1', target: 'notification-end', sourceHandle: 'done' },
    ],
  },

  // Switch para rutas multiples
  {
    _id: 'template-switch-routing',
    name: 'Enrutador Inteligente',
    description: 'Dirige al cliente segun el tipo de consulta',
    icon: 'split',
    color: 'purple',
    isTemplate: true,
    category: 'support',
    requiredPlan: ['premium', 'enterprise'],
    businessTypes: ['salon', 'clinic', 'store', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 400, y: 50 },
        data: {
          label: 'Nueva consulta',
          trigger: 'onMessage',
          keywords: ['ayuda', 'consulta', 'informacion', 'soporte'],
        },
      },
      {
        id: 'message-menu',
        type: 'message',
        position: { x: 400, y: 150 },
        data: {
          label: 'Menu opciones',
          message: 'Hola! Como puedo ayudarte?\n\n1. Agendar cita\n2. Ver mis citas\n3. Precios y servicios\n4. Ubicacion y horarios\n5. Hablar con un asesor',
        },
      },
      {
        id: 'collect-option',
        type: 'collect',
        position: { x: 400, y: 280 },
        data: {
          label: 'Opcion',
          fields: [
            { key: 'opcion', label: 'Selecciona una opcion (1-5)', type: 'number', required: true },
          ],
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 400, y: 410 },
        data: {
          label: 'Segun opcion',
          field: 'opcion',
          cases: [
            { value: 1, label: 'Agendar' },
            { value: 2, label: 'Ver citas' },
            { value: 3, label: 'Precios' },
            { value: 4, label: 'Ubicacion' },
            { value: 5, label: 'Asesor' },
          ],
        },
      },
      {
        id: 'message-agendar',
        type: 'message',
        position: { x: 100, y: 570 },
        data: {
          label: 'Agendar',
          message: 'Para agendar una cita, necesito algunos datos...',
        },
      },
      {
        id: 'message-citas',
        type: 'message',
        position: { x: 250, y: 570 },
        data: {
          label: 'Mis citas',
          message: 'Buscando tus citas... Por favor proporciona tu telefono.',
        },
      },
      {
        id: 'message-precios',
        type: 'message',
        position: { x: 400, y: 570 },
        data: {
          label: 'Precios',
          message: 'Estos son nuestros servicios y precios:\n\n- Servicio A: $50\n- Servicio B: $80\n- Servicio C: $120',
        },
      },
      {
        id: 'message-ubicacion',
        type: 'message',
        position: { x: 550, y: 570 },
        data: {
          label: 'Ubicacion',
          message: 'Estamos ubicados en:\n\nDireccion: Calle Principal #123\n\nHorario:\nLun-Vie: 9:00-18:00\nSab: 9:00-14:00',
        },
      },
      {
        id: 'notification-asesor',
        type: 'notification',
        position: { x: 700, y: 570 },
        data: {
          label: 'Escalar',
          channel: 'internal',
          message: 'Cliente solicita hablar con asesor\n\nChat: {{chatId}}\nMensaje: {{message}}',
          priority: 'high',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-menu' },
      { id: 'e2', source: 'message-menu', target: 'collect-option' },
      { id: 'e3', source: 'collect-option', target: 'switch-1' },
      { id: 'e4', source: 'switch-1', target: 'message-agendar', sourceHandle: 'case-1' },
      { id: 'e5', source: 'switch-1', target: 'message-citas', sourceHandle: 'case-2' },
      { id: 'e6', source: 'switch-1', target: 'message-precios', sourceHandle: 'case-3' },
      { id: 'e7', source: 'switch-1', target: 'message-ubicacion', sourceHandle: 'case-4' },
      { id: 'e8', source: 'switch-1', target: 'notification-asesor', sourceHandle: 'case-5' },
    ],
  },

  // Manejo de errores
  {
    _id: 'template-error-handling',
    name: 'Flujo con Manejo de Errores',
    description: 'Demuestra como manejar errores elegantemente en un flujo',
    icon: 'shield-check',
    color: 'red',
    isTemplate: true,
    category: 'automation',
    requiredPlan: ['enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'store', 'services', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo pedido',
          trigger: 'onMessage',
          keywords: ['pedido', 'ordenar', 'comprar'],
        },
      },
      {
        id: 'collect-1',
        type: 'collect',
        position: { x: 250, y: 150 },
        data: {
          label: 'Datos pedido',
          fields: [
            { key: 'producto', label: 'Producto', type: 'text', required: true },
            { key: 'cantidad', label: 'Cantidad', type: 'number', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
          ],
        },
      },
      {
        id: 'query-stock',
        type: 'query',
        position: { x: 250, y: 280 },
        data: {
          label: 'Verificar stock',
          tablePlaceholder: 'productos',
          operation: 'find',
          filters: [
            { field: 'nombre', operator: 'contains', value: '{{producto}}' },
          ],
        },
      },
      {
        id: 'error-handler-1',
        type: 'error_handler',
        position: { x: 500, y: 280 },
        data: {
          label: 'Si falla query',
          catches: ['query-stock'],
          action: 'continue',
        },
      },
      {
        id: 'condition-stock',
        type: 'condition',
        position: { x: 250, y: 410 },
        data: {
          label: 'Hay stock?',
          field: 'queryResult.docs[0].stock',
          operator: 'greaterOrEqual',
          value: '{{cantidad}}',
        },
      },
      {
        id: 'insert-order',
        type: 'insert',
        position: { x: 100, y: 540 },
        data: {
          label: 'Crear pedido',
          tablePlaceholder: 'pedidos',
          fields: [
            { key: 'producto', value: '{{producto}}' },
            { key: 'cantidad', value: '{{cantidad}}' },
            { key: 'email', value: '{{email}}' },
            { key: 'estado', value: 'procesando' },
          ],
        },
      },
      {
        id: 'email-confirm',
        type: 'email',
        position: { x: 100, y: 670 },
        data: {
          label: 'Confirmar por email',
          to: '{{email}}',
          subject: 'Pedido recibido',
          body: 'Tu pedido de {{cantidad}} x {{producto}} ha sido recibido.',
        },
      },
      {
        id: 'message-success',
        type: 'message',
        position: { x: 100, y: 800 },
        data: {
          label: 'Exito',
          message: 'Pedido registrado! Te enviamos la confirmacion a {{email}}.',
        },
      },
      {
        id: 'message-no-stock',
        type: 'message',
        position: { x: 400, y: 540 },
        data: {
          label: 'Sin stock',
          message: 'Lo sentimos, no tenemos suficiente stock de {{producto}}.\n\nDisponible: {{queryResult.docs[0].stock}} unidades.',
        },
      },
      {
        id: 'message-error',
        type: 'message',
        position: { x: 500, y: 410 },
        data: {
          label: 'Error generico',
          message: 'Lo sentimos, hubo un problema con tu pedido. Por favor intenta mas tarde o contactanos.',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'collect-1' },
      { id: 'e2', source: 'collect-1', target: 'query-stock' },
      { id: 'e3', source: 'query-stock', target: 'condition-stock' },
      { id: 'e4', source: 'condition-stock', target: 'insert-order', sourceHandle: 'true' },
      { id: 'e5', source: 'insert-order', target: 'email-confirm' },
      { id: 'e6', source: 'email-confirm', target: 'message-success' },
      { id: 'e7', source: 'condition-stock', target: 'message-no-stock', sourceHandle: 'false' },
      { id: 'e8', source: 'error-handler-1', target: 'message-error' },
    ],
  },

  // Secuencia de bienvenida con multiples canales
  {
    _id: 'template-welcome-sequence',
    name: 'Secuencia de Bienvenida',
    description: 'Envia varios mensajes de bienvenida por diferentes canales',
    icon: 'sparkles',
    color: 'pink',
    isTemplate: true,
    category: 'marketing',
    requiredPlan: ['enterprise'],
    businessTypes: ['salon', 'clinic', 'gym', 'store', 'education', 'general'],
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: {
          label: 'Nuevo cliente',
          trigger: 'afterCreate',
          tablePlaceholder: 'clientes',
        },
      },
      {
        id: 'message-welcome',
        type: 'message',
        position: { x: 250, y: 150 },
        data: {
          label: 'Bienvenida chat',
          message: 'Bienvenido {{record.nombre}}! Gracias por registrarte con nosotros.',
        },
      },
      {
        id: 'email-welcome',
        type: 'email',
        position: { x: 250, y: 280 },
        data: {
          label: 'Email bienvenida',
          to: '{{record.email}}',
          subject: 'Bienvenido a nuestra familia!',
          body: 'Hola {{record.nombre}},\n\nGracias por unirte. Aqui tienes un 10% de descuento en tu primera compra.\n\nCodigo: BIENVENIDO10',
        },
      },
      {
        id: 'wait-1',
        type: 'wait',
        position: { x: 250, y: 410 },
        data: {
          label: 'Esperar 1 dia',
          duration: 1,
          unit: 'days',
        },
      },
      {
        id: 'whatsapp-tips',
        type: 'whatsapp',
        position: { x: 250, y: 540 },
        data: {
          label: 'Tips por WhatsApp',
          to: '{{record.telefono}}',
          message: 'Hola {{record.nombre}}! Queremos compartirte algunos tips:\n\n1. Agenda tus citas con anticipacion\n2. Acumula puntos en cada visita\n3. Refiere amigos y gana beneficios',
        },
      },
      {
        id: 'wait-2',
        type: 'wait',
        position: { x: 250, y: 670 },
        data: {
          label: 'Esperar 3 dias',
          duration: 3,
          unit: 'days',
        },
      },
      {
        id: 'sms-promo',
        type: 'sms',
        position: { x: 250, y: 800 },
        data: {
          label: 'SMS promocional',
          to: '{{record.telefono}}',
          message: '{{record.nombre}}, tu descuento BIENVENIDO10 vence en 7 dias. Usalo en tu primera visita!',
        },
      },
      {
        id: 'update-onboarding',
        type: 'update',
        position: { x: 250, y: 930 },
        data: {
          label: 'Marcar completado',
          tablePlaceholder: 'clientes',
          recordId: '{{record._id}}',
          fields: [
            { key: 'onboardingCompletado', value: true },
            { key: 'fechaOnboarding', value: '{{now}}' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'message-welcome' },
      { id: 'e2', source: 'message-welcome', target: 'email-welcome' },
      { id: 'e3', source: 'email-welcome', target: 'wait-1' },
      { id: 'e4', source: 'wait-1', target: 'whatsapp-tips' },
      { id: 'e5', source: 'whatsapp-tips', target: 'wait-2' },
      { id: 'e6', source: 'wait-2', target: 'sms-promo' },
      { id: 'e7', source: 'sms-promo', target: 'update-onboarding' },
    ],
  },
];

/**
 * Ejecuta el seed de plantillas de flujos
 */
export async function seedFlowTemplates() {
  console.log('[Seed] Flow templates...');
  
  try {
    const db = await connectDB(getFlowTemplatesDbName());
    
    // Crear indices
    try {
      await db.createIndex({
        index: { fields: ['isTemplate'] },
        ddoc: 'template-index',
        name: 'isTemplate-index',
      });
      await db.createIndex({
        index: { fields: ['category'] },
        ddoc: 'category-index',
        name: 'category-index',
      });
      await db.createIndex({
        index: { fields: ['requiredPlan'] },
        ddoc: 'plan-index',
        name: 'requiredPlan-index',
      });
      await db.createIndex({
        index: { fields: ['businessTypes'] },
        ddoc: 'business-index',
        name: 'businessTypes-index',
      });
    } catch (e) {
      // Indices ya existen
    }
    
    // Insertar o actualizar cada plantilla
    for (const template of FLOW_TEMPLATES) {
      try {
        const existing = await db.get(template._id).catch(() => null);
        
        if (existing) {
          await db.insert({ ...template, _rev: existing._rev });
          console.log(`  [OK] Template actualizado: ${template.name}`);
        } else {
          await db.insert(template);
          console.log(`  [OK] Template creado: ${template.name}`);
        }
      } catch (err) {
        console.error(`  [ERR] Template ${template.name}:`, err.message);
      }
    }
    
    console.log(`[OK] ${FLOW_TEMPLATES.length} flow templates seeded`);
    
  } catch (err) {
    console.error('[ERR] Seeding flow templates:', err.message);
    throw err;
  }
}

export default seedFlowTemplates;
