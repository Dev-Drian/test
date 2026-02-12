/**
 * Seed Genérico: CLÍNICA/VETERINARIA
 * 
 * Crea un workspace completo para una clínica con:
 * - Tabla de Citas con campos dinámicos
 * - Agente de IA configurado
 * - Sin flujos hardcodeados - todo dinámico desde fieldsConfig
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName } from '../config/db.js';

const WORKSPACE_ID = 'clinic-generic';
const WORKSPACE_NAME = 'Clínica Demo';

export async function seed() {
  console.log(`\n[Seed] Iniciando seed para ${WORKSPACE_NAME}...`);
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));    const workspacesDb = await connectDB(getWorkspacesDbName());    
    // 1. Tabla de Citas
    const citasTableId = uuidv4();
    const citasTable = {
      _id: citasTableId,
      name: 'Citas',
      type: 'appointments',
      displayField: 'paciente',
      description: 'Citas médicas agendadas',
      // Citas: puede consultar, crear y actualizar (cancelar), NO eliminar
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false
      },
      headers: [
        {
          key: 'paciente',
          label: 'Paciente',
          type: 'text',
          required: true,
          emoji: '🐾',
          askMessage: '¿Cuál es el nombre del paciente?',
          confirmLabel: 'Paciente',
          priority: 1,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        {
          key: 'responsable',
          label: 'Responsable',
          type: 'text',
          required: true,
          emoji: '👤',
          askMessage: '¿Cuál es tu nombre (responsable)?',
          confirmLabel: 'Responsable',
          priority: 2,
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
          priority: 3,
          validation: {
            digits: 10
          }
        },
        {
          key: 'motivo',
          label: 'Motivo',
          type: 'select',
          required: true,
          emoji: '🩺',
          askMessage: '¿Qué servicio necesitas?',
          confirmLabel: 'Motivo',
          priority: 4,
          options: [
            'Consulta General',
            'Vacunación',
            'Control',
            'Cirugía',
            'Emergencia'
          ]
        },
        {
          key: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          emoji: '📅',
          askMessage: '¿Para qué fecha necesitas la cita?',
          confirmLabel: 'Fecha',
          priority: 5
        },
        {
          key: 'hora',
          label: 'Hora',
          type: 'time',
          required: true,
          emoji: '🕐',
          askMessage: '¿A qué hora te gustaría?',
          confirmLabel: 'Hora',
          priority: 6
        },
        {
          key: 'email',
          label: 'Email',
          type: 'email',
          required: false,
          emoji: '📧',
          askMessage: '¿Cuál es tu correo electrónico? (opcional)',
          confirmLabel: 'Email'
        },
        {
          key: 'estado',
          label: 'Estado',
          type: 'select',
          required: false,  // NO pedir al usuario
          hiddenFromChat: true,  // Ocultar en conversación
          emoji: '📊',
          options: ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada'],
          defaultValue: 'Pendiente'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(citasTable);
    console.log('✅ Tabla Citas creada');
    
    // 2. Crear agente
    const agentId = uuidv4();
    const agent = {
      _id: agentId,
      name: 'Asistente de Citas',
      description: 'Ayuda a agendar citas médicas',
      tables: [
        { tableId: citasTableId, fullAccess: false },  // Citas: filtrado por paciente
      ],
      prompt: `Eres el asistente virtual de ${WORKSPACE_NAME}.

Tu función principal es ayudar a los clientes a agendar citas médicas.

REGLAS:
1. Sé empático, profesional y amable
2. Solicita todos los campos requeridos uno por uno
3. Para emergencias, prioriza la atención inmediata
4. Confirma la información antes de crear la cita
5. Si preguntan por disponibilidad, verifica las citas existentes

PROCESO DE AGENDAMIENTO:
1. Pregunta el nombre del paciente
2. Solicita el nombre del responsable
3. Pide el teléfono de contacto
4. Consulta el motivo de la consulta
5. Pregunta la fecha preferida
6. Solicita la hora deseada
7. Opcionalmente pide el email
8. Confirma todos los datos y crea la cita

Para emergencias, ofrece citas inmediatas o del mismo día.
Mantén las respuestas concisas y profesionales.`,
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
        createSuccess: '✅ **¡Cita agendada!**\n\n🐾 Paciente: {{paciente}}\n👤 Responsable: {{responsable}}\n📱 Teléfono: {{telefono}}\n🩺 Motivo: {{motivo}}\n📅 Fecha: {{fecha}}\n🕐 Hora: {{hora}}\n\n¡Te esperamos!',
        missingField: '{{emoji}} {{askMessage}}',
        notFound: '🔍 No encontré esa cita. ¿Quieres agendar una nueva?'
      },
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(agent);
    console.log('✅ Agente creado');
    
    // 3. Workspace doc
    const workspaceDoc = {
      _id: '_design/workspace',
      name: WORKSPACE_NAME,
      description: 'Clínica/Veterinaria con sistema de citas',
      type: 'clinic',
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
      color: 'rgb(16, 185, 129)', // verde para clínica
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seed',
      members: []
    };
    await workspacesDb.insert(centralWorkspaceDoc);
    console.log('✅ Workspace configurado');
    
    // 4. Datos de ejemplo - Citas
    const citasDb = await connectDB(getTableDataDbName(WORKSPACE_ID, citasTableId));
    
    const citasEjemplo = [
      {
        _id: uuidv4(),
        tableId: citasTableId,
        paciente: 'Luna',
        responsable: 'María García',
        telefono: '3001234567',
        motivo: 'Vacunación',
        fecha: '2026-02-15',
        hora: '10:00',
        email: 'maria@example.com',
        estado: 'Confirmada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: citasTableId,
        paciente: 'Max',
        responsable: 'Carlos Ruiz',
        telefono: '3109876543',
        motivo: 'Consulta General',
        fecha: '2026-02-15',
        hora: '14:00',
        estado: 'Pendiente',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        _id: uuidv4(),
        tableId: citasTableId,
        paciente: 'Bella',
        responsable: 'Ana López',
        telefono: '3201112233',
        motivo: 'Control',
        fecha: '2026-02-16',
        hora: '09:00',
        estado: 'Confirmada',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    for (const cita of citasEjemplo) {
      await citasDb.insert(cita);
    }
    console.log('✅ Citas de ejemplo creadas');
    
    console.log(`\n✅ Seed completado para ${WORKSPACE_NAME}`);
    console.log(`   Workspace ID: ${WORKSPACE_ID}`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Table ID: ${citasTableId}`);
    
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
