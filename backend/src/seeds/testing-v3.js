/**
 * Seed Testing V3 - Workspace de pruebas para arquitectura LLM-First
 * 
 * Crea un workspace específico para probar todas las funcionalidades V3:
 * - Function Calling
 * - Clasificación de mensajes
 * - Different engine modes
 * - Vertical configurations
 * 
 * Uso:
 *   node src/seeds/testing-v3.js
 *   node src/seeds/testing-v3.js --clean
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getWorkspacesDbName, getTableDataDbName, getAgentsDbName } from '../config/db.js';

const WORKSPACE_ID = 'testing-v3';
const WORKSPACE_NAME = 'Testing V3 LLM-First';

export async function seed() {
  console.log(`\n[Seed] Iniciando seed de TESTING V3...`);
  
  const isClean = process.argv.includes('--clean');
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const tableDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
    
    // ========== LIMPIAR SI --clean ==========
    if (isClean) {
      console.log('🧹 Limpiando datos existentes...');
      
      // Eliminar todos los documentos de cada DB
      const dbs = [workspaceDb, agentsDb, tableDataDb];
      for (const db of dbs) {
        try {
          const allDocs = await db.list({ include_docs: true });
          const toDelete = allDocs.rows
            .filter(row => !row.id.startsWith('_design'))
            .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
          if (toDelete.length > 0) {
            await db.bulk({ docs: toDelete });
          }
        } catch (e) {
          // Ignorar si la DB no existe
        }
      }
      
      // Eliminar workspace del registro global
      try {
        const existing = await workspacesDb.get(WORKSPACE_ID);
        await workspacesDb.destroy(existing._id, existing._rev);
      } catch (e) {
        // No existe, ignorar
      }
      
      console.log('✅ Limpieza completada');
    }
    
    // ========== TABLA: CITAS (para probar availability) ==========
    const citasTableId = uuidv4();
    const citasTable = {
      _id: citasTableId,
      name: 'Citas',
      type: 'appointments',
      displayField: 'cliente',
      description: 'Citas para probar check_availability',
      permissions: {
        allowQuery: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: false
      },
      headers: [
        { key: 'cliente', label: 'Cliente', type: 'text', required: true, emoji: '👤', priority: 1 },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', priority: 2 },
        { key: 'hora', label: 'Hora', type: 'time', required: true, emoji: '🕐', priority: 3 },
        { key: 'servicio', label: 'Servicio', type: 'select', required: true, emoji: '💼', 
          options: ['Consulta', 'Seguimiento', 'Emergencia'], priority: 4 },
        { key: 'estado', label: 'Estado', type: 'select', required: false, 
          options: ['Pendiente', 'Confirmada', 'Cancelada'], defaultValue: 'Pendiente' },
        { key: 'notas', label: 'Notas', type: 'text', required: false }
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(citasTable);
    console.log('✅ Tabla Citas creada');
    
    // ========== TABLA: CLIENTES ==========
    const clientesTableId = uuidv4();
    const clientesTable = {
      _id: clientesTableId,
      name: 'Clientes',
      type: 'customers',
      displayField: 'nombre',
      permissions: { allowQuery: true, allowCreate: true, allowUpdate: true, allowDelete: false },
      headers: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, priority: 1 },
        { key: 'email', label: 'Email', type: 'email', required: true, priority: 2 },
        { key: 'telefono', label: 'Teléfono', type: 'phone', required: true, priority: 3 },
      ],
      createdAt: new Date().toISOString()
    };
    await workspaceDb.insert(clientesTable);
    console.log('✅ Tabla Clientes creada');
    
    // ========== DATOS DE PRUEBA: Citas existentes ==========
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const citasData = [
      { cliente: 'María García', fecha: tomorrow, hora: '09:00', servicio: 'Consulta', estado: 'Confirmada' },
      { cliente: 'Juan López', fecha: tomorrow, hora: '10:00', servicio: 'Seguimiento', estado: 'Pendiente' },
      { cliente: 'Ana Martínez', fecha: tomorrow, hora: '11:00', servicio: 'Consulta', estado: 'Confirmada' },
      // Huecos: 12:00, 13:00, 14:00 libres
      { cliente: 'Pedro Sánchez', fecha: tomorrow, hora: '15:00', servicio: 'Emergencia', estado: 'Confirmada' },
    ];
    
    for (const cita of citasData) {
      await tableDataDb.insert({
        _id: uuidv4(),
        tableId: citasTableId,
        ...cita,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`✅ ${citasData.length} citas de prueba creadas`);
    
    // ========== DATOS DE PRUEBA: Clientes ==========
    const clientesData = [
      { nombre: 'María García', email: 'maria@test.com', telefono: '3001234567' },
      { nombre: 'Juan López', email: 'juan@test.com', telefono: '3007654321' },
      { nombre: 'Ana Martínez', email: 'ana@test.com', telefono: '3009876543' },
    ];
    
    for (const cliente of clientesData) {
      await tableDataDb.insert({
        _id: uuidv4(),
        tableId: clientesTableId,
        ...cliente,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`✅ ${clientesData.length} clientes de prueba creados`);
    
    // ═══════════════════════════════════════════════════════════════
    // AGENTE: LLM-First
    // ═══════════════════════════════════════════════════════════════
    const agenteLLMId = uuidv4();
    const agenteLLM = {
      _id: agenteLLMId,
      type: 'agent',
      name: 'Asistente de Citas',
      description: 'Agente con arquitectura LLM-First para testing',
      tables: [
        { tableId: citasTableId, fullAccess: true },
        { tableId: clientesTableId, fullAccess: true },
      ],
      
      // V3 Configuration
      engineMode: 'llm-first',
      vertical: 'healthcare',
      toneStyle: 'friendly',
      
      fewShotExamples: [
        {
          user: 'hay disponibilidad para mañana',
          assistant: 'Déjame revisar los horarios disponibles para mañana. Tenemos espacios a las 12:00, 13:00 y 14:00. ¿Cuál te viene mejor?'
        },
        {
          user: 'quiero agendar una cita',
          assistant: '¡Con gusto te ayudo! Para agendar necesito: nombre, fecha y hora preferida. ¿Empezamos con tu nombre?'
        },
        {
          user: 'cancelar mi cita',
          assistant: 'Entiendo que necesitas cancelar. ¿Me puedes dar tu nombre para buscar tu cita?'
        }
      ],
      
      enabledTools: [], // Todas habilitadas
      disabledTools: [],
      
      businessHours: {
        timezone: 'America/Bogota',
        schedule: { 'lunes_viernes': '08:00-18:00', 'sabado': '08:00-12:00' },
        outsideHoursMessage: 'Estamos fuera de horario. Te atendemos mañana.'
      },
      
      customInstructions: 'Este es un agente de pruebas. Responde de forma clara y concisa.',
      
      // IMPORTANTE: Habilitar flujos automáticos para crear registros
      hasFlows: true,
      
      aiModel: ['gpt-4o-mini'],
      active: true,
      createdAt: new Date().toISOString()
    };
    await agentsDb.insert(agenteLLM);
    console.log('✅ Agente LLM-First creado');
    
    // ========== WORKSPACE DOC ==========
    const workspaceDoc = {
      _id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      description: 'Workspace de testing para arquitectura LLM-First',
      plan: 'premium',
      defaultAgentId: agenteLLMId,
      createdAt: new Date().toISOString(),
      agents: [agenteLLMId],
    };
    
    try {
      const existing = await workspacesDb.get(WORKSPACE_ID);
      workspaceDoc._rev = existing._rev;
    } catch (e) { /* No existe */ }
    
    await workspacesDb.insert(workspaceDoc);
    console.log('✅ Workspace creado');
    
    // ========== RESUMEN ==========
    console.log('\n' + '═'.repeat(60));
    console.log('📦 SEED TESTING COMPLETADO');
    console.log('═'.repeat(60));
    console.log(`   Workspace: ${WORKSPACE_ID}`);
    console.log(`   Tablas: Citas, Clientes`);
    console.log(`   Agentes: 1 (LLM-First)`);
    console.log(`   Datos: ${citasData.length} citas, ${clientesData.length} clientes`);
    console.log('═'.repeat(60));
    console.log('\n🧪 INSTRUCCIONES DE TESTING:');
    console.log('   1. Usa el chat con el agente');
    console.log('   2. Revisa logs para debugging\n');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  }
}

// Ejecutar si es el archivo principal
if (process.argv[1].includes('testing-v3')) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seed;
