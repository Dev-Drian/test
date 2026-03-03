/**
 * Datos de plantillas de flujos para el SmartFlowAssistant
 * Sincronizado con seeds/flow-templates.js pero con keywords para matching rápido
 * 
 * @module services/flowTemplatesData
 */

export const FLOW_TEMPLATES_DATA = [
  // ============================================================================
  // PLANTILLAS FREE
  // ============================================================================
  {
    _id: 'template-reservation-basic',
    name: 'Reservacion Simple',
    description: 'Flujo basico para gestionar reservas o citas',
    category: 'business',
    keywords: ['reservar', 'reserva', 'cita', 'agendar', 'turno', 'hora', 'appointment'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Inicio', trigger: 'onMessage', keywords: ['reservar', 'agendar', 'cita'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos de reserva', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'fecha', label: 'Fecha', type: 'date', required: true }, { key: 'hora', label: 'Hora', type: 'time', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 310 }, data: { label: 'Crear reserva', tablePlaceholder: 'reservas', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'fecha', value: '{{fecha}}' }, { key: 'hora', value: '{{hora}}' }, { key: 'estado', value: 'pendiente' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 440 }, data: { label: 'Confirmacion', message: 'Reserva registrada.\\n\\nFecha: {{fecha}}\\nHora: {{hora}}\\n\\nTe contactaremos para confirmar.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-faq-basic',
    name: 'Preguntas Frecuentes',
    description: 'Responde automaticamente las preguntas mas comunes',
    category: 'support',
    keywords: ['faq', 'preguntas', 'frecuentes', 'horario', 'precio', 'informacion', 'ayuda', 'dudas'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Preguntas', trigger: 'onMessage', keywords: ['horario', 'precio', 'ubicacion', 'contacto'] } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 180 }, data: { label: 'Tipo de pregunta', field: 'message', operator: 'contains', value: 'horario' } },
      { id: 'message-horario', type: 'message', position: { x: 100, y: 310 }, data: { label: 'Horarios', message: 'Nuestros horarios son:\\nLunes a Viernes: 9:00 - 18:00\\nSabado: 9:00 - 14:00\\nDomingo: Cerrado' } },
      { id: 'message-default', type: 'message', position: { x: 400, y: 310 }, data: { label: 'Info general', message: 'Para mas informacion puedes contactarnos o visitar nuestra pagina web.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'condition-1' }, { id: 'e2', source: 'condition-1', target: 'message-horario', sourceHandle: 'true' }, { id: 'e3', source: 'condition-1', target: 'message-default', sourceHandle: 'false' }],
  },
  {
    _id: 'template-contact-basic',
    name: 'Formulario de Contacto',
    description: 'Recopila informacion de contacto de clientes potenciales',
    category: 'crm',
    keywords: ['contacto', 'formulario', 'consulta', 'informacion', 'lead'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Nuevo contacto', trigger: 'onMessage', keywords: ['contacto', 'informacion', 'consulta'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos de contacto', fields: [{ key: 'nombre', label: 'Nombre completo', type: 'text', required: true }, { key: 'email', label: 'Correo', type: 'email', required: true }, { key: 'telefono', label: 'Telefono', type: 'phone' }, { key: 'mensaje', label: 'Mensaje', type: 'text' }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Guardar contacto', tablePlaceholder: 'contactos', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'email', value: '{{email}}' }, { key: 'telefono', value: '{{telefono}}' }, { key: 'mensaje', value: '{{mensaje}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Gracias por contactarnos, {{nombre}}.\\n\\nNos comunicaremos contigo pronto.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },

  // ============================================================================
  // PLANTILLAS STARTER
  // ============================================================================
  {
    _id: 'template-reservation-advanced',
    name: 'Reservacion con Disponibilidad',
    description: 'Flujo completo con verificacion de disponibilidad en tiempo real',
    category: 'business',
    keywords: ['reservar', 'disponibilidad', 'verificar', 'cita', 'agendar', 'slot', 'horario disponible'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Inicio', trigger: 'onMessage', keywords: ['reservar', 'agendar', 'cita'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 150 }, data: { label: 'Fecha deseada', fields: [{ key: 'fecha', label: 'Fecha', type: 'date', required: true }] } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 280 }, data: { label: 'Verificar disponibilidad', tablePlaceholder: 'reservas', operation: 'count', filters: [{ field: 'fecha', operator: 'equals', value: '{{fecha}}' }] } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 410 }, data: { label: 'Hay espacio', field: 'queryResult.count', operator: 'lessThan', value: 10 } },
      { id: 'collect-2', type: 'collect', position: { x: 100, y: 540 }, data: { label: 'Completar reserva', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'hora', label: 'Hora', type: 'time', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 100, y: 670 }, data: { label: 'Crear reserva', tablePlaceholder: 'reservas', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'fecha', value: '{{fecha}}' }, { key: 'hora', value: '{{hora}}' }, { key: 'estado', value: 'confirmada' }] } },
      { id: 'message-success', type: 'message', position: { x: 100, y: 800 }, data: { label: 'Confirmacion', message: 'Reserva confirmada para {{fecha}} a las {{hora}}.' } },
      { id: 'message-full', type: 'message', position: { x: 400, y: 540 }, data: { label: 'Sin disponibilidad', message: 'Lo sentimos, no hay disponibilidad para esa fecha. Intenta con otra fecha.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'query-1' }, { id: 'e3', source: 'query-1', target: 'condition-1' }, { id: 'e4', source: 'condition-1', target: 'collect-2', sourceHandle: 'true' }, { id: 'e5', source: 'collect-2', target: 'insert-1' }, { id: 'e6', source: 'insert-1', target: 'message-success' }, { id: 'e7', source: 'condition-1', target: 'message-full', sourceHandle: 'false' }],
  },
  {
    _id: 'template-registration',
    name: 'Registro de Clientes',
    description: 'Captura y guarda informacion completa de nuevos clientes',
    category: 'crm',
    keywords: ['registrar', 'cliente', 'nuevo', 'inscribir', 'registro', 'alta', 'crear cliente'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Nuevo cliente', trigger: 'onMessage', keywords: ['registrar', 'inscribir', 'nuevo'] } },
      { id: 'message-welcome', type: 'message', position: { x: 250, y: 150 }, data: { label: 'Bienvenida', message: 'Bienvenido. Vamos a registrar tus datos.' } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 280 }, data: { label: 'Datos del cliente', fields: [{ key: 'nombre', label: 'Nombre completo', type: 'text', required: true }, { key: 'email', label: 'Correo', type: 'email', required: true }, { key: 'telefono', label: 'Telefono', type: 'phone', required: true }] } },
      { id: 'query-check', type: 'query', position: { x: 250, y: 410 }, data: { label: 'Verificar duplicado', tablePlaceholder: 'clientes', operation: 'count', filters: [{ field: 'email', operator: 'equals', value: '{{email}}' }] } },
      { id: 'condition-exists', type: 'condition', position: { x: 250, y: 540 }, data: { label: 'Ya existe', field: 'queryResult.count', operator: 'greaterThan', value: 0 } },
      { id: 'message-exists', type: 'message', position: { x: 100, y: 670 }, data: { label: 'Cliente existe', message: 'Ya tienes una cuenta registrada con ese correo.' } },
      { id: 'insert-1', type: 'insert', position: { x: 400, y: 670 }, data: { label: 'Crear cliente', tablePlaceholder: 'clientes', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'email', value: '{{email}}' }, { key: 'telefono', value: '{{telefono}}' }, { key: 'estado', value: 'activo' }] } },
      { id: 'message-success', type: 'message', position: { x: 400, y: 800 }, data: { label: 'Registro exitoso', message: 'Registro completado, {{nombre}}. Bienvenido.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'message-welcome' }, { id: 'e2', source: 'message-welcome', target: 'collect-1' }, { id: 'e3', source: 'collect-1', target: 'query-check' }, { id: 'e4', source: 'query-check', target: 'condition-exists' }, { id: 'e5', source: 'condition-exists', target: 'message-exists', sourceHandle: 'true' }, { id: 'e6', source: 'condition-exists', target: 'insert-1', sourceHandle: 'false' }, { id: 'e7', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-cancel',
    name: 'Cancelacion de Citas',
    description: 'Permite a los clientes cancelar sus reservas facilmente',
    category: 'business',
    keywords: ['cancelar', 'cancelacion', 'anular', 'eliminar', 'cita', 'reserva'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Cancelacion', trigger: 'onMessage', keywords: ['cancelar', 'anular'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 150 }, data: { label: 'Buscar reserva', fields: [{ key: 'telefono', label: 'Tu telefono', type: 'phone', required: true }] } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 280 }, data: { label: 'Buscar cita', tablePlaceholder: 'reservas', operation: 'find', filters: [{ field: 'telefono', operator: 'equals', value: '{{telefono}}' }] } },
      { id: 'condition-found', type: 'condition', position: { x: 250, y: 410 }, data: { label: 'Cita encontrada', field: 'queryResult.count', operator: 'greaterThan', value: 0 } },
      { id: 'update-1', type: 'update', position: { x: 100, y: 540 }, data: { label: 'Cancelar cita', tablePlaceholder: 'reservas', fields: [{ key: 'estado', value: 'cancelada' }] } },
      { id: 'message-cancelled', type: 'message', position: { x: 100, y: 670 }, data: { label: 'Confirmacion', message: 'Tu cita ha sido cancelada.' } },
      { id: 'message-not-found', type: 'message', position: { x: 400, y: 540 }, data: { label: 'No encontrada', message: 'No encontramos ninguna cita activa con ese numero.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'query-1' }, { id: 'e3', source: 'query-1', target: 'condition-found' }, { id: 'e4', source: 'condition-found', target: 'update-1', sourceHandle: 'true' }, { id: 'e5', source: 'update-1', target: 'message-cancelled' }, { id: 'e6', source: 'condition-found', target: 'message-not-found', sourceHandle: 'false' }],
  },

  // ============================================================================
  // PLANTILLAS PREMIUM
  // ============================================================================
  {
    _id: 'template-reminder',
    name: 'Recordatorios Automaticos',
    description: 'Envia recordatorios automaticos antes de las citas programadas',
    category: 'automation',
    keywords: ['recordatorio', 'avisar', 'notificar', 'antes', 'cita', 'manana', 'automatico', 'alerta'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Trigger Diario', trigger: 'schedule', schedule: { time: '08:00' } } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 180 }, data: { label: 'Buscar citas de manana', tablePlaceholder: 'citas', operation: 'find', filters: [{ field: 'fecha', operator: 'equals', value: '{{tomorrow}}' }] } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 310 }, data: { label: 'Hay citas', field: 'queryResult.count', operator: 'greaterThan', value: 0 } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Enviar recordatorios', actionType: 'sendEmail', forEach: 'queryResult.docs', message: 'Recordatorio: Tienes una cita programada para manana.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'query-1' }, { id: 'e2', source: 'query-1', target: 'condition-1' }, { id: 'e3', source: 'condition-1', target: 'action-1', sourceHandle: 'true' }],
  },
  {
    _id: 'template-survey',
    name: 'Encuesta de Satisfaccion',
    description: 'Solicita feedback de clientes despues del servicio',
    category: 'crm',
    keywords: ['encuesta', 'satisfaccion', 'feedback', 'opinion', 'calificar', 'servicio', 'completado', 'experiencia'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Servicio completado', trigger: 'afterUpdate', tablePlaceholder: 'servicios', condition: { field: 'estado', equals: 'completado' } } },
      { id: 'message-1', type: 'message', position: { x: 250, y: 180 }, data: { label: 'Solicitar calificacion', message: 'Gracias por tu visita.\\n\\nCalifica tu experiencia del 1 al 5.' } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 310 }, data: { label: 'Recibir calificacion', fields: [{ key: 'calificacion', label: 'Calificacion', type: 'number' }, { key: 'comentario', label: 'Comentario', type: 'text' }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 440 }, data: { label: 'Guardar feedback', tablePlaceholder: 'feedback', fields: [{ key: 'calificacion', value: '{{calificacion}}' }, { key: 'comentario', value: '{{comentario}}' }] } },
      { id: 'message-thanks', type: 'message', position: { x: 250, y: 570 }, data: { label: 'Agradecimiento', message: 'Gracias por tu opinion. Nos ayuda a mejorar.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'message-1' }, { id: 'e2', source: 'message-1', target: 'collect-1' }, { id: 'e3', source: 'collect-1', target: 'insert-1' }, { id: 'e4', source: 'insert-1', target: 'message-thanks' }],
  },
  {
    _id: 'template-followup',
    name: 'Seguimiento Post-Venta',
    description: 'Contacta automaticamente despues de una compra',
    category: 'crm',
    keywords: ['seguimiento', 'postventa', 'despues', 'compra', 'venta', 'contactar', 'follow', 'up'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nueva venta', trigger: 'afterCreate', tablePlaceholder: 'ventas' } },
      { id: 'delay-1', type: 'delay', position: { x: 250, y: 180 }, data: { label: 'Esperar 3 dias', delay: { value: 3, unit: 'days' } } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Enviar email', actionType: 'sendEmail', to: '{{record.email}}', subject: 'Como te fue con tu compra?', body: 'Hola {{record.nombre}},\\n\\nQueremos saber como te fue con tu compra.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'delay-1' }, { id: 'e2', source: 'delay-1', target: 'action-1' }],
  },
  {
    _id: 'template-notification',
    name: 'Notificacion de Ventas',
    description: 'Notifica al equipo cuando hay una nueva venta',
    category: 'automation',
    keywords: ['notificacion', 'venta', 'nueva', 'equipo', 'avisar', 'alerta', 'notificar'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nueva venta', trigger: 'afterCreate', tablePlaceholder: 'ventas' } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 180 }, data: { label: 'Venta grande', field: 'record.monto', operator: 'greaterThan', value: 1000 } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Notificar equipo', actionType: 'sendEmail', to: 'ventas@empresa.com', subject: 'Nueva venta importante', body: 'Se registro una venta de ${{record.monto}}' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'condition-1' }, { id: 'e2', source: 'condition-1', target: 'action-1', sourceHandle: 'true' }],
  },
  {
    _id: 'template-promotion-vip',
    name: 'Promociones para VIP',
    description: 'Envia promociones exclusivas a clientes VIP',
    category: 'marketing',
    keywords: ['promocion', 'vip', 'exclusivo', 'descuento', 'oferta', 'cliente especial'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nueva promocion', trigger: 'manual' } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 180 }, data: { label: 'Buscar VIPs', tablePlaceholder: 'clientes', operation: 'find', filters: [{ field: 'tipo', operator: 'equals', value: 'vip' }] } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Enviar promocion', actionType: 'sendEmail', forEach: 'queryResult.docs', subject: 'Promocion exclusiva para ti', body: 'Hola {{nombre}},\\n\\nTenemos una oferta especial solo para ti.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'query-1' }, { id: 'e2', source: 'query-1', target: 'action-1' }],
  },
  {
    _id: 'template-waitlist',
    name: 'Lista de Espera Inteligente',
    description: 'Gestiona lista de espera con notificacion automatica',
    category: 'business',
    keywords: ['lista', 'espera', 'waitlist', 'disponibilidad', 'avisar', 'notificar cuando'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Lista espera', trigger: 'onMessage', keywords: ['lista de espera', 'esperar', 'avisar'] } },
      { id: 'message-1', type: 'message', position: { x: 250, y: 180 }, data: { label: 'Confirmar', message: 'Te agregamos a nuestra lista de espera. Te avisaremos cuando haya disponibilidad.' } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 310 }, data: { label: 'Datos', fields: [{ key: 'nombre', label: 'Tu nombre', type: 'text', required: true }, { key: 'telefono', label: 'Telefono', type: 'phone', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 440 }, data: { label: 'Agregar a lista', tablePlaceholder: 'lista_espera', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'telefono', value: '{{telefono}}' }, { key: 'estado', value: 'pendiente' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 570 }, data: { label: 'Confirmacion', message: 'Listo, {{nombre}}. Estas en la lista de espera.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'message-1' }, { id: 'e2', source: 'message-1', target: 'collect-1' }, { id: 'e3', source: 'collect-1', target: 'insert-1' }, { id: 'e4', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-loyalty',
    name: 'Programa de Fidelidad',
    description: 'Gestiona puntos y recompensas automaticamente',
    category: 'crm',
    keywords: ['fidelidad', 'puntos', 'recompensa', 'loyalty', 'premio', 'programa'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nueva compra', trigger: 'afterCreate', tablePlaceholder: 'ventas' } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 180 }, data: { label: 'Buscar cliente', tablePlaceholder: 'clientes', operation: 'findOne', filters: [{ field: '_id', operator: 'equals', value: '{{record.clienteId}}' }] } },
      { id: 'update-1', type: 'update', position: { x: 250, y: 310 }, data: { label: 'Sumar puntos', tablePlaceholder: 'clientes', fields: [{ key: 'puntos', value: '{{queryResult.puntos + record.monto * 0.1}}' }] } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 440 }, data: { label: 'Tiene recompensa', field: 'queryResult.puntos', operator: 'greaterThan', value: 1000 } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 570 }, data: { label: 'Notificar recompensa', actionType: 'sendEmail', to: '{{queryResult.email}}', subject: 'Tienes una recompensa!', body: 'Felicidades, has acumulado suficientes puntos para un premio.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'query-1' }, { id: 'e2', source: 'query-1', target: 'update-1' }, { id: 'e3', source: 'update-1', target: 'condition-1' }, { id: 'e4', source: 'condition-1', target: 'action-1', sourceHandle: 'true' }],
  },

  // ============================================================================
  // PLANTILLAS POR TIPO DE NEGOCIO
  // ============================================================================
  {
    _id: 'template-salon-appointment',
    name: 'Citas de Salon',
    description: 'Flujo especializado para salones de belleza',
    category: 'business',
    keywords: ['salon', 'belleza', 'corte', 'pelo', 'cabello', 'estilista', 'cita salon'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Cita salon', trigger: 'onMessage', keywords: ['cita', 'corte', 'salon'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'servicio', label: 'Servicio', type: 'select', options: ['Corte', 'Tinte', 'Peinado', 'Manicure'] }, { key: 'fecha', label: 'Fecha', type: 'date', required: true }, { key: 'hora', label: 'Hora', type: 'time', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear cita', tablePlaceholder: 'citas', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'servicio', value: '{{servicio}}' }, { key: 'fecha', value: '{{fecha}}' }, { key: 'hora', value: '{{hora}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Cita agendada para {{servicio}} el {{fecha}} a las {{hora}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-restaurant-reservation',
    name: 'Reserva de Mesa',
    description: 'Flujo para reservaciones de restaurante',
    category: 'business',
    keywords: ['restaurante', 'mesa', 'reserva', 'comida', 'cena', 'almuerzo', 'personas'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Reservar mesa', trigger: 'onMessage', keywords: ['reservar mesa', 'restaurante', 'cena'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos reserva', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'personas', label: 'Personas', type: 'number', required: true }, { key: 'fecha', label: 'Fecha', type: 'date', required: true }, { key: 'hora', label: 'Hora', type: 'time', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear reserva', tablePlaceholder: 'reservas', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'personas', value: '{{personas}}' }, { key: 'fecha', value: '{{fecha}}' }, { key: 'hora', value: '{{hora}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Mesa reservada para {{personas}} personas el {{fecha}} a las {{hora}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-clinic-appointment',
    name: 'Cita Medica',
    description: 'Flujo para consultorios medicos y clinicas',
    category: 'business',
    keywords: ['clinica', 'medico', 'doctor', 'cita', 'consulta', 'paciente', 'salud'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Cita medica', trigger: 'onMessage', keywords: ['cita', 'medico', 'doctor', 'consulta'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos paciente', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'especialidad', label: 'Especialidad', type: 'select', options: ['General', 'Pediatria', 'Ginecologia', 'Cardiologia'] }, { key: 'fecha', label: 'Fecha', type: 'date', required: true }, { key: 'hora', label: 'Hora', type: 'time', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear cita', tablePlaceholder: 'citas', fields: [{ key: 'paciente', value: '{{nombre}}' }, { key: 'especialidad', value: '{{especialidad}}' }, { key: 'fecha', value: '{{fecha}}' }, { key: 'hora', value: '{{hora}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Cita agendada con {{especialidad}} para el {{fecha}} a las {{hora}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-gym-class',
    name: 'Reserva de Clase',
    description: 'Flujo para gimnasios y centros deportivos',
    category: 'business',
    keywords: ['gimnasio', 'gym', 'clase', 'entrenamiento', 'deporte', 'fitness', 'ejercicio'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Reservar clase', trigger: 'onMessage', keywords: ['clase', 'gym', 'entrenar'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'clase', label: 'Clase', type: 'select', options: ['Spinning', 'Yoga', 'CrossFit', 'Pilates', 'Zumba'] }, { key: 'fecha', label: 'Fecha', type: 'date', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear reserva', tablePlaceholder: 'clases', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'clase', value: '{{clase}}' }, { key: 'fecha', value: '{{fecha}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Reserva confirmada para la clase de {{clase}} el {{fecha}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-store-order',
    name: 'Pedido Rapido',
    description: 'Flujo para tiendas con pedidos por chat',
    category: 'business',
    keywords: ['pedido', 'tienda', 'comprar', 'orden', 'producto', 'compra'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Nuevo pedido', trigger: 'onMessage', keywords: ['pedir', 'comprar', 'quiero'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos pedido', fields: [{ key: 'producto', label: 'Producto', type: 'text', required: true }, { key: 'cantidad', label: 'Cantidad', type: 'number', required: true }, { key: 'direccion', label: 'Direccion', type: 'text', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear pedido', tablePlaceholder: 'pedidos', fields: [{ key: 'producto', value: '{{producto}}' }, { key: 'cantidad', value: '{{cantidad}}' }, { key: 'direccion', value: '{{direccion}}' }, { key: 'estado', value: 'pendiente' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Pedido recibido: {{cantidad}}x {{producto}}. Te lo enviaremos a {{direccion}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-education-enrollment',
    name: 'Inscripcion a Curso',
    description: 'Flujo para escuelas y centros educativos',
    category: 'business',
    keywords: ['inscripcion', 'curso', 'escuela', 'educacion', 'clase', 'matricula', 'estudiar'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Inscripcion', trigger: 'onMessage', keywords: ['inscribir', 'curso', 'estudiar'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos estudiante', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'curso', label: 'Curso', type: 'text', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Crear inscripcion', tablePlaceholder: 'inscripciones', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'email', value: '{{email}}' }, { key: 'curso', value: '{{curso}}' }, { key: 'estado', value: 'pendiente' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Inscripcion registrada para {{curso}}. Te enviaremos los detalles a {{email}}.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },
  {
    _id: 'template-services-quote',
    name: 'Solicitud de Cotizacion',
    description: 'Flujo para empresas de servicios',
    category: 'business',
    keywords: ['cotizacion', 'presupuesto', 'servicio', 'precio', 'costo', 'cuanto cuesta'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Cotizacion', trigger: 'onMessage', keywords: ['cotizar', 'presupuesto', 'precio'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'servicio', label: 'Servicio requerido', type: 'text', required: true }, { key: 'detalles', label: 'Detalles', type: 'text' }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 340 }, data: { label: 'Guardar solicitud', tablePlaceholder: 'cotizaciones', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'email', value: '{{email}}' }, { key: 'servicio', value: '{{servicio}}' }, { key: 'detalles', value: '{{detalles}}' }] } },
      { id: 'message-success', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Confirmacion', message: 'Solicitud recibida. Te enviaremos la cotizacion a {{email}} en breve.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'message-success' }],
  },

  // ============================================================================
  // PLANTILLAS AVANZADAS
  // ============================================================================
  {
    _id: 'template-followup-delayed',
    name: 'Follow-up Automatico',
    description: 'Seguimiento automatico con delays configurables',
    category: 'automation',
    keywords: ['followup', 'seguimiento', 'automatico', 'delay', 'dias', 'despues'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nuevo registro', trigger: 'afterCreate', tablePlaceholder: 'clientes' } },
      { id: 'delay-1', type: 'delay', position: { x: 250, y: 180 }, data: { label: 'Esperar 1 dia', delay: { value: 1, unit: 'days' } } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Email dia 1', actionType: 'sendEmail', subject: 'Bienvenido!', body: 'Gracias por registrarte.' } },
      { id: 'delay-2', type: 'delay', position: { x: 250, y: 440 }, data: { label: 'Esperar 3 dias', delay: { value: 3, unit: 'days' } } },
      { id: 'action-2', type: 'action', position: { x: 250, y: 570 }, data: { label: 'Email dia 4', actionType: 'sendEmail', subject: 'Como te podemos ayudar?', body: 'Queremos saber si necesitas algo.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'delay-1' }, { id: 'e2', source: 'delay-1', target: 'action-1' }, { id: 'e3', source: 'action-1', target: 'delay-2' }, { id: 'e4', source: 'delay-2', target: 'action-2' }],
  },
  {
    _id: 'template-confirmation-email',
    name: 'Email de Bienvenida',
    description: 'Envia email automatico cuando un usuario se registra',
    category: 'automation',
    keywords: ['bienvenida', 'bienvenido', 'registre', 'registro', 'registrar', 'nuevo', 'usuario', 'cliente', 'email', 'correo', 'enviar', 'automatico'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nuevo registro', trigger: 'afterCreate', tablePlaceholder: 'clientes' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 200 }, data: { label: 'Enviar email', actionType: 'sendEmail', to: '{{record.email}}', subject: 'Bienvenido!', body: 'Hola {{record.nombre}},\\n\\nGracias por registrarte.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
  },
  {
    _id: 'template-approval-flow',
    name: 'Reserva con Aprobacion',
    description: 'Flujo que requiere aprobacion manual',
    category: 'business',
    keywords: ['aprobacion', 'aprobar', 'manual', 'revision', 'autorizar', 'validar'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Solicitud', trigger: 'onMessage', keywords: ['solicitar', 'pedir'] } },
      { id: 'collect-1', type: 'collect', position: { x: 250, y: 180 }, data: { label: 'Datos', fields: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }, { key: 'solicitud', label: 'Solicitud', type: 'text', required: true }] } },
      { id: 'insert-1', type: 'insert', position: { x: 250, y: 310 }, data: { label: 'Guardar solicitud', tablePlaceholder: 'solicitudes', fields: [{ key: 'nombre', value: '{{nombre}}' }, { key: 'solicitud', value: '{{solicitud}}' }, { key: 'estado', value: 'pendiente_aprobacion' }] } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 440 }, data: { label: 'Notificar admin', actionType: 'sendEmail', to: 'admin@empresa.com', subject: 'Nueva solicitud pendiente', body: 'Hay una nueva solicitud de {{nombre}} que requiere aprobacion.' } },
      { id: 'message-1', type: 'message', position: { x: 250, y: 570 }, data: { label: 'Confirmacion', message: 'Tu solicitud ha sido recibida y esta pendiente de aprobacion.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'collect-1' }, { id: 'e2', source: 'collect-1', target: 'insert-1' }, { id: 'e3', source: 'insert-1', target: 'action-1' }, { id: 'e4', source: 'action-1', target: 'message-1' }],
  },
  {
    _id: 'template-webhook-integration',
    name: 'Integracion con Webhook',
    description: 'Conecta con sistemas externos via webhook',
    category: 'automation',
    keywords: ['webhook', 'integracion', 'api', 'externo', 'conectar', 'sistema'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nuevo registro', trigger: 'afterCreate', tablePlaceholder: 'ventas' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 200 }, data: { label: 'Llamar webhook', actionType: 'webhook', url: 'https://api.externa.com/webhook', method: 'POST', body: '{{record}}' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }],
  },
  {
    _id: 'template-scheduled-reminders',
    name: 'Recordatorios Masivos',
    description: 'Envia recordatorios programados a multiples contactos',
    category: 'automation',
    keywords: ['recordatorio', 'masivo', 'programado', 'todos', 'broadcast', 'envio masivo'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Programado', trigger: 'schedule', schedule: { time: '09:00', days: ['mon', 'wed', 'fri'] } } },
      { id: 'query-1', type: 'query', position: { x: 250, y: 180 }, data: { label: 'Buscar contactos', tablePlaceholder: 'clientes', operation: 'find', filters: [{ field: 'estado', operator: 'equals', value: 'activo' }] } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 310 }, data: { label: 'Enviar a todos', actionType: 'sendEmail', forEach: 'queryResult.docs', subject: 'Recordatorio', body: 'Hola {{nombre}}, este es tu recordatorio.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'query-1' }, { id: 'e2', source: 'query-1', target: 'action-1' }],
  },
  {
    _id: 'template-switch-routing',
    name: 'Enrutador Inteligente',
    description: 'Dirige mensajes segun criterios',
    category: 'automation',
    keywords: ['enrutar', 'dirigir', 'clasificar', 'routing', 'switch', 'condicional'],
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Nuevo mensaje', trigger: 'onMessage' } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 180 }, data: { label: 'Es urgente?', field: 'message', operator: 'contains', value: 'urgente' } },
      { id: 'action-urgent', type: 'action', position: { x: 100, y: 310 }, data: { label: 'Notificar urgente', actionType: 'sendEmail', to: 'soporte@empresa.com', subject: 'URGENTE', body: 'Mensaje urgente: {{message}}' } },
      { id: 'condition-2', type: 'condition', position: { x: 400, y: 310 }, data: { label: 'Es venta?', field: 'message', operator: 'contains', value: 'comprar' } },
      { id: 'action-sales', type: 'action', position: { x: 300, y: 440 }, data: { label: 'A ventas', actionType: 'sendEmail', to: 'ventas@empresa.com', subject: 'Nuevo lead', body: 'Posible cliente: {{message}}' } },
      { id: 'message-default', type: 'message', position: { x: 500, y: 440 }, data: { label: 'Respuesta general', message: 'Gracias por tu mensaje. Te responderemos pronto.' } },
    ],
    edges: [{ id: 'e1', source: 'start-1', target: 'condition-1' }, { id: 'e2', source: 'condition-1', target: 'action-urgent', sourceHandle: 'true' }, { id: 'e3', source: 'condition-1', target: 'condition-2', sourceHandle: 'false' }, { id: 'e4', source: 'condition-2', target: 'action-sales', sourceHandle: 'true' }, { id: 'e5', source: 'condition-2', target: 'message-default', sourceHandle: 'false' }],
  },
  {
    _id: 'template-welcome-sequence',
    name: 'Secuencia de Bienvenida',
    description: 'Secuencia de emails de onboarding',
    category: 'automation',
    keywords: ['bienvenida', 'secuencia', 'onboarding', 'serie', 'emails', 'nuevo usuario'],
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Nuevo usuario', trigger: 'afterCreate', tablePlaceholder: 'usuarios' } },
      { id: 'action-1', type: 'action', position: { x: 250, y: 150 }, data: { label: 'Email bienvenida', actionType: 'sendEmail', to: '{{record.email}}', subject: 'Bienvenido!', body: 'Gracias por unirte.' } },
      { id: 'delay-1', type: 'delay', position: { x: 250, y: 280 }, data: { label: 'Esperar 2 dias', delay: { value: 2, unit: 'days' } } },
      { id: 'action-2', type: 'action', position: { x: 250, y: 410 }, data: { label: 'Email tips', actionType: 'sendEmail', to: '{{record.email}}', subject: 'Tips para empezar', body: 'Aqui tienes algunos consejos.' } },
      { id: 'delay-2', type: 'delay', position: { x: 250, y: 540 }, data: { label: 'Esperar 5 dias', delay: { value: 5, unit: 'days' } } },
      { id: 'action-3', type: 'action', position: { x: 250, y: 670 }, data: { label: 'Email feedback', actionType: 'sendEmail', to: '{{record.email}}', subject: 'Como te ha ido?', body: 'Queremos saber tu experiencia.' } },
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1' }, { id: 'e2', source: 'action-1', target: 'delay-1' }, { id: 'e3', source: 'delay-1', target: 'action-2' }, { id: 'e4', source: 'action-2', target: 'delay-2' }, { id: 'e5', source: 'delay-2', target: 'action-3' }],
  },
];

export default FLOW_TEMPLATES_DATA;
