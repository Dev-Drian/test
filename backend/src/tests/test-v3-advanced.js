/**
 * Test V3 Advanced - Pruebas avanzadas del motor LLM-First
 * 
 * Escenarios:
 * - Conversaciones multi-turn (mantiene contexto)
 * - Consultas de datos reales
 * - Cambios de intención
 * - Typos e idiomas mixtos
 * - Flujos completos de creación
 * 
 * Ejecutar:
 *   node src/tests/test-v3-advanced.js
 */

import 'dotenv/config';
import { ChatService } from '../services/ChatService.js';
import { connectDB, getAgentsDbName, getTableDbName, getTableDataDbName } from '../config/db.js';

const WORKSPACE_ID = process.env.TEST_WORKSPACE || 'testing-v3';
const API_KEY = process.env.OPENAI_API_KEY;

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

function log(color, ...args) {
  console.log(colors[color] || '', ...args, colors.reset);
}

function divider(char = '─', length = 70) {
  console.log(colors.dim + char.repeat(length) + colors.reset);
}

/**
 * Estadísticas de los tests
 */
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  totalTime: 0,
  byHandler: {},
};

/**
 * Ejecuta un mensaje y registra resultados
 */
async function runMessage(chatService, message, options = {}) {
  const { chatId, agentId, expectHandler, expectContains, description } = options;
  stats.total++;
  
  const startTime = Date.now();
  
  try {
    const result = await chatService.processMessage({
      workspaceId: WORKSPACE_ID,
      agentId,
      chatId,
      message,
      apiKey: API_KEY,
    });
    
    const duration = Date.now() - startTime;
    stats.totalTime += duration;
    
    const handler = result._meta?.handler || 'unknown';
    stats.byHandler[handler] = (stats.byHandler[handler] || 0) + 1;
    
    // Verificar expectativas
    let passed = true;
    let failReason = '';
    
    if (expectHandler && handler !== expectHandler) {
      passed = false;
      failReason = `Expected handler ${expectHandler}, got ${handler}`;
    }
    
    if (expectContains && !result.response?.toLowerCase().includes(expectContains.toLowerCase())) {
      passed = false;
      failReason = `Expected response to contain "${expectContains}"`;
    }
    
    if (passed) {
      stats.passed++;
      log('green', `  ✓ ${description || message}`);
    } else {
      stats.failed++;
      log('red', `  ✗ ${description || message}`);
      log('red', `    Reason: ${failReason}`);
    }
    
    // Mostrar respuesta resumida
    const response = result.response || '';
    const shortResponse = response.length > 120 ? response.substring(0, 120) + '...' : response;
    log('dim', `    [${handler}] ${duration}ms`);
    log('cyan', `    "${shortResponse}"`);
    
    return {
      success: true,
      chatId: result.chatId,
      response: result.response,
      handler,
      duration,
      passed,
    };
    
  } catch (error) {
    stats.failed++;
    const duration = Date.now() - startTime;
    log('red', `  ✗ ${description || message}`);
    log('red', `    Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      duration,
      passed: false,
    };
  }
}

/**
 * Obtener datos de prueba existentes
 */
async function getTestData() {
  try {
    const tablesDb = await connectDB(getTableDbName(WORKSPACE_ID));
    const tablesResult = await tablesDb.list({ include_docs: true });
    const tables = tablesResult.rows.map(r => r.doc).filter(d => d.type === 'table');
    
    const citasTable = tables.find(t => t.name?.toLowerCase().includes('cita'));
    const clientesTable = tables.find(t => t.name?.toLowerCase().includes('cliente'));
    
    let citas = [];
    let clientes = [];
    
    if (citasTable) {
      const dataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
      const citasResult = await dataDb.find({
        selector: { tableId: citasTable._id },
        limit: 10,
      });
      citas = citasResult.docs || [];
    }
    
    if (clientesTable) {
      const dataDb = await connectDB(getTableDataDbName(WORKSPACE_ID));
      const clientesResult = await dataDb.find({
        selector: { tableId: clientesTable._id },
        limit: 10,
      });
      clientes = clientesResult.docs || [];
    }
    
    return { tables, citas, clientes, citasTable, clientesTable };
  } catch (error) {
    log('yellow', `  ⚠ Error loading test data: ${error.message}`);
    return { tables: [], citas: [], clientes: [] };
  }
}

/**
 * Obtener agente V3
 */
async function getV3Agent() {
  try {
    const agentsDb = await connectDB(getAgentsDbName(WORKSPACE_ID));
    const result = await agentsDb.list({ include_docs: true });
    const agents = result.rows.map(r => r.doc).filter(d => d.type === 'agent');
    
    return agents.find(a => a.engineMode === 'llm-first' || a.name?.includes('V3'));
  } catch (error) {
    log('red', `Error loading agent: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ESCENARIOS DE PRUEBA
// ═══════════════════════════════════════════════════════════════════════

async function testSaludosYGarbage(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 1: Saludos y Garbage Detection');
  divider();
  
  await runMessage(chatService, 'hola', { 
    agentId, 
    expectHandler: 'FallbackHandler',
    description: 'Saludo simple'
  });
  
  await runMessage(chatService, 'buenos días, ¿cómo están?', { 
    agentId, 
    description: 'Saludo formal'
  });
  
  await runMessage(chatService, 'hi there!', { 
    agentId, 
    description: 'Saludo en inglés'
  });
  
  await runMessage(chatService, 'asdfghjkl', { 
    agentId, 
    expectHandler: 'MessageClassifier',
    description: 'Garbage text'
  });
  
  await runMessage(chatService, '!!!???...', { 
    agentId, 
    expectHandler: 'MessageClassifier',
    description: 'Solo símbolos'
  });
  
  await runMessage(chatService, '12345678', { 
    agentId, 
    description: 'Solo números'
  });
}

async function testConsultasDatos(chatService, agentId, testData) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 2: Consultas de Datos');
  divider();
  
  await runMessage(chatService, 'muéstrame las citas', { 
    agentId, 
    expectHandler: 'QueryHandler',
    description: 'Ver citas (debería usar QueryHandler)'
  });
  
  await runMessage(chatService, 'quiero ver los clientes registrados', { 
    agentId, 
    expectHandler: 'QueryHandler',
    description: 'Ver clientes'
  });
  
  await runMessage(chatService, '¿cuántas citas hay para hoy?', { 
    agentId, 
    description: 'Conteo de citas'
  });
  
  await runMessage(chatService, 'show me all appointments', { 
    agentId, 
    description: 'Query en inglés'
  });
  
  // Si hay datos, preguntar por uno específico
  if (testData.clientes.length > 0) {
    const cliente = testData.clientes[0];
    const nombre = cliente.data?.nombre || cliente.data?.name;
    if (nombre) {
      await runMessage(chatService, `buscar cliente ${nombre}`, { 
        agentId, 
        description: `Buscar cliente específico: ${nombre}`
      });
    }
  }
}

async function testDisponibilidad(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 3: Disponibilidad');
  divider();
  
  await runMessage(chatService, '¿hay disponibilidad mañana?', { 
    agentId, 
    expectHandler: 'AvailabilityHandler',
    description: 'Disponibilidad mañana'
  });
  
  await runMessage(chatService, '¿qué horarios tienen libres para el viernes?', { 
    agentId, 
    description: 'Horarios libres'
  });
  
  await runMessage(chatService, 'is there any availability for tomorrow?', { 
    agentId, 
    description: 'Availability en inglés'
  });
  
  await runMessage(chatService, '¿me pueden atender hoy a las 3?', { 
    agentId, 
    description: 'Disponibilidad con hora específica'
  });
}

async function testCrearCita(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 4: Crear Cita (flujo conversacional)');
  divider();
  
  // Primera interacción - inicio del flujo
  const r1 = await runMessage(chatService, 'quiero agendar una cita', { 
    agentId, 
    description: 'Iniciar creación de cita'
  });
  
  // Segunda interacción - dar datos parciales (nuevo chat por ahora)
  await runMessage(chatService, 'me llamo Juan Pérez', { 
    agentId, 
    description: 'Dar nombre'
  });
  
  // Tercera - con más datos
  await runMessage(chatService, 'necesito una cita para mañana a las 10 a nombre de María', { 
    agentId, 
    description: 'Cita con datos completos'
  });
  
  // Variantes
  await runMessage(chatService, 'book an appointment for tomorrow at 2pm', { 
    agentId, 
    description: 'Crear cita en inglés'
  });
  
  await runMessage(chatService, 'agnrdra sita mañana', { 
    agentId, 
    description: 'Crear cita con typos'
  });
}

async function testModificarCancelar(chatService, agentId, testData) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 5: Modificar y Cancelar');
  divider();
  
  await runMessage(chatService, 'quiero cancelar mi cita', { 
    agentId, 
    description: 'Cancelar cita'
  });
  
  await runMessage(chatService, 'necesito mover mi cita para otro día', { 
    agentId, 
    description: 'Reagendar cita'
  });
  
  await runMessage(chatService, 'cambiar la hora de mi cita a las 4', { 
    agentId, 
    description: 'Cambiar hora'
  });
  
  // Si hay datos específicos
  if (testData.clientes.length > 0) {
    const cliente = testData.clientes[0];
    const nombre = cliente.data?.nombre;
    if (nombre) {
      await runMessage(chatService, `cancelar la cita de ${nombre}`, { 
        agentId, 
        description: `Cancelar cita de ${nombre}`
      });
    }
  }
}

async function testCambioIntencion(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 6: Cambios de Intención');
  divider();
  
  // Empezar con una cosa, luego cambiar
  await runMessage(chatService, 'quiero ver mis citas... no espera, mejor agendar una nueva', { 
    agentId, 
    description: 'Consulta → Crear (cambio mid-message)'
  });
  
  await runMessage(chatService, 'hay disponibilidad? quiero reservar', { 
    agentId, 
    description: 'Disponibilidad + intención de crear'
  });
  
  await runMessage(chatService, 'primero dime cuántas citas hay y luego quiero crear una', { 
    agentId, 
    description: 'Múltiples intenciones'
  });
}

async function testIdiomasMixtos(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 7: Idiomas y Variantes');
  divider();
  
  await runMessage(chatService, 'quiero make an appointment please', { 
    agentId, 
    description: 'Spanglish'
  });
  
  await runMessage(chatService, 'tengo una meeting mañana, necesito reschedule', { 
    agentId, 
    description: 'Más spanglish'
  });
  
  await runMessage(chatService, 'Preciso agendar uma consulta', { 
    agentId, 
    description: 'Portugués'
  });
  
  await runMessage(chatService, 'porfis dame los horarios disponibles uwu', { 
    agentId, 
    description: 'Lenguaje informal'
  });
}

async function testEdgeCases(chatService, agentId) {
  console.log('\n');
  log('bright', '📋 ESCENARIO 8: Edge Cases');
  divider();
  
  await runMessage(chatService, '', { 
    agentId, 
    description: 'Mensaje vacío'
  });
  
  await runMessage(chatService, '?', { 
    agentId, 
    description: 'Solo signo de interrogación'
  });
  
  await runMessage(chatService, 'cita cita cita cita cita', { 
    agentId, 
    description: 'Repetición de palabra'
  });
  
  await runMessage(chatService, 'por favor ayuda necesito información urgente!!!', { 
    agentId, 
    description: 'Mensaje urgente genérico'
  });
  
  await runMessage(chatService, '¿?¿?¿?', { 
    agentId, 
    description: 'Solo signos'
  });
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log(colors.bright + '╔══════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bright + '║           🧪 TEST V3 ADVANCED - PRUEBAS EXHAUSTIVAS                   ║' + colors.reset);
  console.log(colors.bright + '╚══════════════════════════════════════════════════════════════════════╝' + colors.reset);
  
  console.log(`\nWorkspace: ${WORKSPACE_ID}`);
  console.log(`API Key: ${API_KEY ? '✓ Configurada' : '✗ NO CONFIGURADA'}`);
  
  if (!API_KEY) {
    log('red', '\n❌ Error: OPENAI_API_KEY no configurada');
    process.exit(1);
  }
  
  // Cargar agente V3
  const agent = await getV3Agent();
  if (!agent) {
    log('red', '\n❌ Error: No se encontró agente V3');
    log('yellow', '   Ejecuta primero: node src/seeds/all.js --v3 --clean');
    process.exit(1);
  }
  
  log('green', `\nAgente: ${agent.name}`);
  log('dim', `ID: ${agent._id}`);
  log('dim', `Mode: ${agent.engineMode}`);
  
  // Cargar datos de prueba
  const testData = await getTestData();
  log('dim', `\nDatos cargados: ${testData.citas.length} citas, ${testData.clientes.length} clientes`);
  
  const chatService = new ChatService();
  const agentId = agent._id;
  
  // Ejecutar todos los escenarios
  const startTime = Date.now();
  
  await testSaludosYGarbage(chatService, agentId);
  await testConsultasDatos(chatService, agentId, testData);
  await testDisponibilidad(chatService, agentId);
  await testCrearCita(chatService, agentId);
  await testModificarCancelar(chatService, agentId, testData);
  await testCambioIntencion(chatService, agentId);
  await testIdiomasMixtos(chatService, agentId);
  await testEdgeCases(chatService, agentId);
  
  const totalDuration = Date.now() - startTime;
  
  // Resumen final
  console.log('\n');
  console.log(colors.bright + '═'.repeat(70) + colors.reset);
  log('bright', '📊 RESUMEN DE RESULTADOS');
  console.log(colors.bright + '═'.repeat(70) + colors.reset);
  
  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
  const avgTime = Math.round(stats.totalTime / stats.total);
  
  console.log(`\n  Total tests: ${stats.total}`);
  log(stats.passed === stats.total ? 'green' : 'yellow', `  Passed: ${stats.passed} (${passRate}%)`);
  if (stats.failed > 0) {
    log('red', `  Failed: ${stats.failed}`);
  }
  console.log(`\n  Tiempo total: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Tiempo promedio: ${avgTime}ms por mensaje`);
  
  console.log('\n  Handlers utilizados:');
  Object.entries(stats.byHandler)
    .sort((a, b) => b[1] - a[1])
    .forEach(([handler, count]) => {
      const pct = ((count / stats.total) * 100).toFixed(0);
      console.log(`    ${handler}: ${count} (${pct}%)`);
    });
  
  console.log('\n' + colors.bright + '═'.repeat(70) + colors.reset);
  
  if (stats.failed === 0) {
    log('bgGreen', ' ✓ TODOS LOS TESTS PASARON ');
  } else {
    log('bgYellow', ` ⚠ ${stats.failed} TESTS FALLARON `);
  }
  
  console.log('\n');
  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
