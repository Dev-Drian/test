/**
 * Seed Genérico: SALÓN DE BELLEZA
 * 
 * Crea un workspace completo para un salón de belleza con:
 * - Tabla de Citas con campos dinámicos
 * - Tabla de Servicios (catálogo)
 * - Agente de IA configurado
 * - Sin flujos hardcodeados - todo dinámico desde fieldsConfig
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName } from '../config/db.js';

const WORKSPACE_ID = 'salon-generic';
const WORKSPACE_NAME = 'Salón de Belleza Demo';

export async function seed() {
  console.log(`\n[Seed] Iniciando seed para ${WORKSPACE_NAME}...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    
    // 1. Tabla de Servicios
    const serviciosTableId = uuidv4();
    const serviciosTable = {
      _id: serviciosTableId,
      name: 'Servicios',
      type: 'catalog',
      displayField: 'nombre',
      description: 'Catálogo de servicios del salón',
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
          label: 'Servicio',
          type: 'text',
          required: true,
          emoji: '💇'
        },
        {
          key: 'precio',
          label: 'Precio',
          type: 'currency',
          required: true,
          emoji: '💰'
        },
        {
          key: 'duracion',
          label: 'Duración',
          type: 'number',
          required: true,
          emoji: '⏱️'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(serviciosTable);
    console.log('✅ Tabla Servicios creada');
    
    // 2. Tabla de Citas
    const citasTableId = uuidv4();
    const citasTable = {
      _id: citasTableId,
      name: 'Citas',
      type: 'appointments',
      displayField: 'cliente',
      description: 'Citas agendadas en el salón',
      // Citas: puede consultar, crear, actualizar (cancelar), NO eliminar
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
          askMessage: '¿Cómo te llamas?',
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
          askMessage: '¿Cuál es tu número de teléfono?',
          confirmLabel: 'Teléfono',
          priority: 2,
          validation: {
            digits: 10
          }
        },
        {
          key: 'servicio',
          label: 'Servicio',
          type: 'relation',
          required: true,
          emoji: '💇',
          askMessage: '¿Qué servicio necesitas?',
          confirmLabel: 'Servicio',
          priority: 3,
          relation: {
            tableName: 'Servicios',
            displayField: 'nombre'
          }
        },
        {
          key: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          emoji: '📅',
          askMessage: '¿Para qué día deseas tu cita?',
          confirmLabel: 'Fecha',
          priority: 4
        },
        {
          key: 'hora',
          label: 'Hora',
          type: 'time',
          required: true,
          emoji: '🕐',
          askMessage: '¿A qué hora prefieres?',
          confirmLabel: 'Hora',
          priority: 5
        },
        {
          key: 'estado',
          label: 'Estado',
          type: 'select',
          required: false,  // NO pedir al usuario
          hiddenFromChat: true,  // Ocultar en conversación
          emoji: '📊',
          options: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada'],
          defaultValue: 'Pendiente'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(citasTable);
    console.log('✅ Tabla Citas creada');
    
    // 3. Crear agente
    const agentId = uuidv4();
    const agent = {
      _id: agentId,
      name: 'Asistente del Salón',
      description: 'Ayuda a agendar citas y consultar servicios',
      tables: [
        { tableId: citasTableId, fullAccess: false },     // Citas: filtrado por cliente
        { tableId: serviciosTableId, fullAccess: true },  // Servicios: todos ven
      ],
      prompt: `Eres el asistente virtual de ${WORKSPACE_NAME}.

Tu función es ayudar a los clientes a agendar citas y consultar servicios.

REGLAS:
1. Sé amable, profesional y usa emojis apropiados
2. Si preguntan por servicios o precios, consulta la tabla de Servicios
3. Para agendar, solicita todos los campos requeridos uno por uno
4. Confirma toda la información antes de crear la cita
5. Verifica disponibilidad si lo solicitan

PROCESO DE AGENDAMIENTO:
1. Pregunta el nombre del cliente
2. Pide el teléfono de contacto
3. Consulta qué servicio necesita (puedes mostrar las opciones)
4. Solicita la fecha preferida
5. Pregunta la hora deseada
6. Confirma todos los datos y crea la cita

Mantén las respuestas concisas y amigables.`,
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
        createSuccess: '✅ **¡Cita agendada!**\n\n👤 {{cliente}}\n📱 {{telefono}}\n💇 {{servicio}}\n📅 {{fecha}}\n🕐 {{hora}}\n\n¡Te esperamos!',
        missingField: '{{emoji}} {{askMessage}}',
        notFound: '🔍 No encontré esa cita. ¿Quieres agendar una nueva?'
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(agent);
    console.log('✅ Agente creado');
    
    // 4. Workspace doc
    const workspaceDoc = {
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Salón de belleza con sistema de citas',
      type: 'salon',
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
      color: 'rgb(219, 39, 119)', // rosa para salón
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seed',
      members: []
    };
    await workspacesDb.insert(centralWorkspaceDoc);
    console.log('✅ Workspace configurado');
    
    // 5. Datos de ejemplo - Servicios
    const serviciosDb = await connectDB(getTableDataDbName(WORKSPACE_ID, serviciosTableId));
    
    const serviciosEjemplo = [
      { _id: uuidv4(), tableId: serviciosTableId, nombre: 'Corte de Cabello', precio: 25000, duracion: 30 },
      { _id: uuidv4(), tableId: serviciosTableId, nombre: 'Tinte', precio: 80000, duracion: 120 },
      { _id: uuidv4(), tableId: serviciosTableId, nombre: 'Manicure', precio: 20000, duracion: 45 },
      { _id: uuidv4(), tableId: serviciosTableId, nombre: 'Pedicure', precio: 25000, duracion: 60 },
      { _id: uuidv4(), tableId: serviciosTableId, nombre: 'Alisado', precio: 150000, duracion: 180 }
    ];
    
    for (const servicio of serviciosEjemplo) {
      await serviciosDb.insert(servicio);
    }
    console.log('✅ Servicios de ejemplo creados');
    
    // 6. Datos de ejemplo - Citas
    const citasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, citasTableId));
    
    const citasEjemplo = [
      {
        _id: uuidv4(),
        tableId: citasTableId,
        cliente: 'Ana García',
        telefono: '3001234567',
        servicio: 'Corte de Cabello',
        fecha: '2026-02-15',
        hora: '10:00',
        estado: 'Confirmada'
      },
      {
        _id: uuidv4(),
        tableId: citasTableId,
        cliente: 'Laura Martínez',
        telefono: '3109876543',
        servicio: 'Tinte',
        fecha: '2026-02-15',
        hora: '14:00',
        estado: 'Pendiente'
      }
    ];
    
    for (const cita of citasEjemplo) {
      await citasDb.insert(cita);
    }
    console.log('✅ Citas de ejemplo creadas');
    
    console.log(`\n✅ Seed completado para ${WORKSPACE_NAME}`);
    console.log(`   Workspace ID: ${WORKSPACE_ID}`);
    console.log(`   Agent ID: ${agentId}`);
    
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
