/**
 * Seed Genérico: RESTAURANTE
 * 
 * Crea un workspace completo para un restaurante con:
 * - Tabla de Reservas con campos dinámicos
 * - Agente de IA configurado
 * - Sin flujos hardcodeados - todo dinámico desde fieldsConfig
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName, getAgentsDbName } from '../config/db.js';

const WORKSPACE_ID = 'restaurant-generic';
const WORKSPACE_NAME = 'Restaurante Demo';

export async function seed() {
  console.log(`\n[Seed] Iniciando seed para ${WORKSPACE_NAME}...`);
  
  try {
    // 1. Crear workspace
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    
    // ========== TABLA 1: SERVICIOS ==========
    const serviciosTableId = uuidv4();
    const serviciosTable = {
      _id: serviciosTableId,
      name: 'Servicios',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Tipos de servicio del restaurante',
      // Servicios: solo consulta (catálogo protegido)
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        {
          key: 'nombre',
          label: 'Nombre',
          type: 'text',
          required: true,
          emoji: '🍽️'
        },
        {
          key: 'horario',
          label: 'Horario',
          type: 'text',
          required: false,
          emoji: '🕐'
        },
        {
          key: 'descripcion',
          label: 'Descripción',
          type: 'text',
          required: false,
          emoji: '📝'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(serviciosTable);
    console.log('✅ Tabla Servicios creada');
    
    // ========== TABLA 2: HORARIOS ==========
    const horariosTableId = uuidv4();
    const horariosTable = {
      _id: horariosTableId,
      name: 'Horarios',
      type: 'schedule',
      displayField: 'dia',
      description: 'Horarios de atención del restaurante',
      // Horarios: solo consulta
      permissions: {
        allowQuery: true,
        allowCreate: false,
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        {
          key: 'dia',
          label: 'Día',
          type: 'select',
          required: true,
          emoji: '📅',
          options: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        },
        {
          key: 'apertura',
          label: 'Apertura',
          type: 'time',
          required: true,
          emoji: '🌅'
        },
        {
          key: 'cierre',
          label: 'Cierre',
          type: 'time',
          required: true,
          emoji: '🌙'
        },
        {
          key: 'cerrado',
          label: 'Cerrado',
          type: 'select',
          required: false,
          emoji: '🚫',
          options: ['Sí', 'No'],
          defaultValue: 'No'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(horariosTable);
    console.log('✅ Tabla Horarios creada');
    
    // ========== TABLA 3: RESERVAS (con relación a Servicios) ==========
    const reservasTableId = uuidv4();
    const reservasTable = {
      _id: reservasTableId,
      name: 'Reservas',
      type: 'bookings',
      displayField: 'cliente',
      description: 'Reservas de mesas del restaurante',
      // Reservas: puede consultar, crear, actualizar (cancelar), NO eliminar
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
          type: 'text',
          required: true,
          emoji: '👤',
          askMessage: '¿A nombre de quién será la reserva?',
          confirmLabel: 'Cliente',
          priority: 1,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        {
          key: 'telefono',
          label: 'Teléfono',
          type: 'phone',
          required: true,
          emoji: '📱',
          askMessage: '¿A qué número te contactamos?',
          confirmLabel: 'Teléfono',
          priority: 2,
          validation: {
            digits: 10
          }
        },
        {
          key: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          emoji: '📅',
          askMessage: '¿Para qué fecha necesitas la reserva?',
          confirmLabel: 'Fecha',
          priority: 3
        },
        {
          key: 'hora',
          label: 'Hora',
          type: 'time',
          required: true,
          emoji: '🕐',
          askMessage: '¿A qué hora te gustaría?',
          confirmLabel: 'Hora',
          priority: 4
        },
        {
          key: 'personas',
          label: 'Personas',
          type: 'number',
          required: true,
          emoji: '👥',
          askMessage: '¿Para cuántas personas?',
          confirmLabel: 'Personas',
          priority: 5,
          validation: {
            min: 1,
            max: 20
          }
        },
        {
          key: 'servicio',
          label: 'Servicio',
          type: 'relation',
          required: true,
          emoji: '🍽️',
          askMessage: '¿Para qué servicio? (Almuerzo, Cena, etc.)',
          confirmLabel: 'Servicio',
          priority: 6,
          relation: {
            tableName: 'Servicios',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,  // NO permitir crear servicios desde el chat
            showOptionsOnNotFound: true  // Mostrar servicios disponibles si no existe
          }
        },
        {
          key: 'mesa',
          label: 'Mesa',
          type: 'select',
          required: false,
          emoji: '🪑',
          options: ['Terraza', 'Salón Principal', 'Privado', 'Barra'],
          defaultValue: 'Salón Principal',
          priority: 7
        },
        {
          key: 'estado',
          label: 'Estado',
          type: 'select',
          required: false,  // NO pedir al usuario
          hiddenFromChat: true,  // Ocultar en conversación
          emoji: '📊',
          options: ['Pendiente', 'Confirmada', 'Cancelada'],
          defaultValue: 'Pendiente'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(reservasTable);
    console.log('✅ Tabla Reservas creada');
    
    // 2. Crear agente
    const agentId = uuidv4();
    const agent = {
      _id: agentId,
      type: 'agent',  // IMPORTANTE: Identificar como agente, no como tabla
      name: 'Asistente de Reservas',
      description: 'Ayuda a los clientes a hacer reservas',
      tables: [
        { tableId: reservasTableId, fullAccess: false },  // Reservas: filtrado por cliente
        { tableId: serviciosTableId, fullAccess: true },  // Servicios: todos ven
        { tableId: horariosTableId, fullAccess: true },   // Horarios: todos ven
      ],
      prompt: `Eres el asistente virtual de ${WORKSPACE_NAME}.

Tu función principal es ayudar a los clientes a hacer reservas de mesa.

INFORMACIÓN DISPONIBLE:
- Servicios: Almuerzo, Cena, Eventos, Brunch
- Horarios: Consulta la tabla de Horarios para mostrar cuándo abrimos

REGLAS:
1. Sé amable y profesional
2. Si preguntan por servicios u horarios, muéstralos consultando las tablas
3. Solicita todos los campos requeridos uno por uno
4. El servicio DEBE ser uno existente (consulta tabla Servicios)
5. Valida que la hora esté dentro del horario de atención
6. Confirma la información antes de crear la reserva

PROCESO DE RESERVA:
1. Pregunta el nombre del cliente
2. Pide el teléfono de contacto
3. Consulta la fecha deseada
4. Solicita la hora preferida
5. Pregunta para cuántas personas
6. Pregunta qué servicio necesita (Almuerzo/Cena/etc)
7. Ofrece opciones de mesa (opcional)
8. Confirma todos los datos y crea la reserva

VALIDACIONES:
- Teléfono: 10 dígitos
- Personas: entre 1 y 20
- Servicio: debe existir en la tabla Servicios
- Hora: dentro del horario de atención

Si el servicio no existe, di: "Lo siento, ese servicio no está disponible. Tenemos: [lista de servicios]"
Mantén las respuestas concisas y usa emojis apropiados.`,
      aiModel: ['gpt-4o-mini'],
      useFlows: true,  // IMPORTANTE: Habilitar validación automática
      hasFlows: true,  // IMPORTANTE: Habilitar validación automática
      planFeatures: {
        canCreate: true,
        canUpdate: true,
        canQuery: true,
        canDelete: false
      },
      responseTemplates: {
        createSuccess: '✅ **¡Reserva confirmada!**\n\n{{emoji}} {{cliente}}\n📱 {{telefono}}\n📅 {{fecha}}\n🕐 {{hora}}\n👥 {{personas}} personas\n🪑 Mesa: {{mesa}}\n\n¡Te esperamos!',
        missingField: '{{emoji}} {{askMessage}}',
        notFound: '🔍 No encontré ninguna reserva con esos datos. ¿Quieres hacer una nueva?'
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await agentsDb.insert(agent);
    console.log('✅ Agente creado');
    
    // 3. Crear workspace doc
    const workspaceDoc = {
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Restaurante con sistema de reservas',
      type: 'restaurant',
      defaultAgentId: agentId,
      settings: {
        timezone: 'America/Bogota',
        currency: 'COP',
        language: 'es'
      },
      createdAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(workspaceDoc);
    
    // Registrar workspace en la base de datos central
    const centralWorkspaceDoc = {
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      color: 'rgb(220, 38, 38)', // rojo para restaurante
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seed',
      members: []
    };
    await workspacesDb.insert(centralWorkspaceDoc);
    console.log('✅ Workspace configurado');
    
    // 4. Crear datos de ejemplo: SERVICIOS
    const serviciosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, serviciosTableId));
    
    const serviciosEjemplo = [
      {
        _id: uuidv4(),
        tableId: serviciosTableId,
        nombre: 'Almuerzo',
        horario: '12:00 - 15:00',
        descripcion: 'Menú ejecutivo y a la carta',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: serviciosTableId,
        nombre: 'Cena',
        horario: '19:00 - 23:00',
        descripcion: 'Cenas románticas y familiares',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: serviciosTableId,
        nombre: 'Brunch',
        horario: '10:00 - 14:00',
        descripcion: 'Fines de semana únicamente',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: serviciosTableId,
        nombre: 'Eventos',
        horario: 'Bajo reserva',
        descripcion: 'Cumpleaños, celebraciones empresariales',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    for (const servicio of serviciosEjemplo) {
      await serviciosDb.insert(servicio);
    }
    console.log('✅ Servicios de ejemplo creados');
    
    // 5. Crear datos de ejemplo: HORARIOS
    const horariosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, horariosTableId));
    
    const horariosEjemplo = [
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Lunes', apertura: '12:00', cierre: '23:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Martes', apertura: '12:00', cierre: '23:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Miércoles', apertura: '12:00', cierre: '23:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Jueves', apertura: '12:00', cierre: '23:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Viernes', apertura: '12:00', cierre: '00:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Sábado', apertura: '10:00', cierre: '00:00', cerrado: 'No', createdAt: new Date().toISOString() },
      { _id: uuidv4(), tableId: horariosTableId, dia: 'Domingo', apertura: '10:00', cierre: '18:00', cerrado: 'No', createdAt: new Date().toISOString() }
    ];
    
    for (const horario of horariosEjemplo) {
      await horariosDb.insert(horario);
    }
    console.log('✅ Horarios de ejemplo creados');
    
    // 6. Crear datos de ejemplo: RESERVAS (con relación a servicio)
    const reservasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, reservasTableId));
    
    const reservasEjemplo = [
      {
        _id: uuidv4(),
        tableId: reservasTableId,
        cliente: 'María López',
        telefono: '3001234567',
        fecha: '2026-02-15',
        hora: '19:00',
        personas: 4,
        servicio: 'Cena',  // Relación al servicio
        mesa: 'Terraza',
        estado: 'Confirmada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: reservasTableId,
        cliente: 'Carlos Ruiz',
        telefono: '3109876543',
        fecha: '2026-02-15',
        hora: '20:30',
        personas: 2,
        servicio: 'Cena',  // Relación al servicio
        mesa: 'Salón Principal',
        estado: 'Confirmada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: reservasTableId,
        cliente: 'Ana Martínez',
        telefono: '3157894561',
        fecha: '2026-02-16',
        hora: '13:00',
        personas: 6,
        servicio: 'Almuerzo',  // Relación al servicio
        mesa: 'Salón VIP',
        estado: 'Pendiente',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    for (const reserva of reservasEjemplo) {
      await reservasDb.insert(reserva);
    }
    console.log('✅ Reservas de ejemplo creadas');
    
    console.log(`\n✅ Seed completado para ${WORKSPACE_NAME}`);
    console.log(`   Workspace ID: ${WORKSPACE_ID}`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Tablas: Reservas, Servicios, Horarios`);
    console.log(`   Servicios: ${serviciosEjemplo.length} creados`);
    console.log(`   Horarios: 7 días configurados`);
    console.log(`   Reservas: ${reservasEjemplo.length} de ejemplo`);
    
  } catch (error) {
    console.error(`❌ Error en seed de ${WORKSPACE_NAME}:`, error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('\n✅ Seed completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando seed:', error);
      process.exit(1);
    });
}

export default seed;
