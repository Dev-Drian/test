/**
 * Test Chat - Prueba interactiva del chat
 * 
 * Envía mensajes de prueba y muestra cómo responde el engine.
 * 
 * Uso:
 *   node src/tests/test-chat-v3.js
 */

import 'dotenv/config';
import { ChatService } from '../services/ChatService.js';
import { connectDB, getWorkspacesDbName, getAgentsDbName } from '../config/db.js';

const WORKSPACE_ID = process.env.TEST_WORKSPACE || 'testing-v3';
const API_KEY = process.env.OPENAI_API_KEY;

// Modo siempre LLM-First
const ENGINE_MODE = 'llm-first';

// Variable global para el agentId
let DEFAULT_AGENT_ID = null;

// Mensajes de prueba para diferentes escenarios
const TEST_MESSAGES = [
  // Saludos
  { category: 'Saludos', messages: ['hola', 'buenas tardes', 'hey'] },
  
  // Crear citas (diferentes formas)
  { category: 'Crear cita', messages: [
    'quiero agendar una cita',
    'necesito una cita para mañana',
    'sacar turno',
    'book an appointment',
    'agndar sita',  // typo
  ]},
  
  // Consultar disponibilidad
  { category: 'Disponibilidad', messages: [
    'hay disponibilidad para mañana',
    'qué horarios tienen libres',
    'puedo ir a las 3',
  ]},
  
  // Consultar datos
  { category: 'Consultar', messages: [
    'ver mis citas',
    'mostrar clientes',
    'tengo citas pendientes?',
  ]},
  
  // Modificar/Cancelar
  { category: 'Modificar', messages: [
    'cancelar mi cita',
    'mover mi cita para otro día',
    'cambiar la hora',
  ]},
  
  // Garbage (deben ser rechazados o pedir aclaración)
  { category: 'Garbage', messages: [
    'asdfasdf',
    'aaaaaaa',
    '123123',
  ]},
];

async function runTest(chatService, message) {
  try {
    const startTime = Date.now();
    
    // NO pasar chatId - dejar que el sistema cree uno nuevo
    const result = await chatService.processMessage({
      workspaceId: WORKSPACE_ID,
      agentId: DEFAULT_AGENT_ID,
      message,
      apiKey: API_KEY,
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      response: result.response?.substring(0, 150) + (result.response?.length > 150 ? '...' : ''),
      handler: result._meta?.handler || 'unknown',
      duration,
      mode: result._meta?.mode || ENGINE_MODE,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Obtiene el primer agente disponible
 */
async function getAgent() {
  try {
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const result = await agentsDb.list({ include_docs: true });
    
    const agents = result.rows
      .map(r => r.doc)
      .filter(d => d.type === 'agent' && d.active !== false);
    
    return agents[0] || null;
  } catch (error) {
    console.error('Error getting agent:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🧪 TEST CHAT - PRUEBAS INTERACTIVAS             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nWorkspace: ${WORKSPACE_ID}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗ NOT SET'}`);
  
  if (!API_KEY) {
    console.error('\n❌ Error: OPENAI_API_KEY no configurado');
    process.exit(1);
  }
  
  // Obtener primer agente disponible
  const agent = await getAgent();
  if (!agent) {
    console.error('\n❌ Error: No se encontró ningún agente');
    console.error('   Ejecuta primero: node src/seeds/all.js');
    process.exit(1);
  }
  
  DEFAULT_AGENT_ID = agent._id;
  console.log(`Agent: ${agent.name} (${agent._id.substring(0, 8)}...)`);
  console.log(`Engine Mode: ${agent.engineMode || 'default'}`);
  
  const chatService = new ChatService();
  
  for (const category of TEST_MESSAGES) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${category.category}`);
    console.log('─'.repeat(60));
    
    for (const message of category.messages) {
      process.stdout.write(`\n  💬 "${message}"\n`);
      
      const result = await runTest(chatService, message);
      
      if (result.success) {
        console.log(`     ⏱️  ${result.duration}ms | 🔧 ${result.handler}`);
        console.log(`     📝 ${result.response}`);
      } else {
        console.log(`     ❌ Error: ${result.error}`);
      }
      
      // Pequeña pausa entre mensajes para no saturar la API
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Pruebas completadas');
  console.log('═'.repeat(60) + '\n');
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
