/**
 * Test V3 Engine - Pruebas de la arquitectura LLM-First
 * 
 * Ejecuta pruebas automatizadas para validar:
 * - Function Calling funciona correctamente
 * - Clasificación de mensajes (garbage/valid)
 * - Los 3 modos del engine (llm-first, scoring, legacy)
 * - Mapeo de tools a handlers
 * 
 * Uso:
 *   node src/tests/test-v3-engine.js
 * 
 * Requisitos:
 *   - Tener OPENAI_API_KEY configurado
 *   - Haber ejecutado: node src/seeds/testing-v3.js
 */

import 'dotenv/config';
import { Engine, ENGINE_MODES } from '../core/Engine.js';
import { getToolRegistry } from '../core/ToolRegistry.js';
import { getAgentPromptBuilder } from '../core/AgentPromptBuilder.js';
import { getOpenAIProvider } from '../integrations/ai/OpenAIProvider.js';
import { Context } from '../core/Context.js';
import { ActionFactory } from '../domain/actions/ActionFactory.js';

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

const PASS = `${colors.green}✓ PASS${colors.reset}`;
const FAIL = `${colors.red}✗ FAIL${colors.reset}`;
const SKIP = `${colors.yellow}○ SKIP${colors.reset}`;

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function log(message) {
  console.log(message);
}

function logTest(name, passed, details = '') {
  if (passed === null) {
    skipCount++;
    log(`  ${SKIP} ${name} ${colors.dim}${details}${colors.reset}`);
  } else if (passed) {
    passCount++;
    log(`  ${PASS} ${name} ${colors.dim}${details}${colors.reset}`);
  } else {
    failCount++;
    log(`  ${FAIL} ${name} ${colors.dim}${details}${colors.reset}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: ToolRegistry
// ═══════════════════════════════════════════════════════════════
function testToolRegistry() {
  log('\n📦 Testing ToolRegistry...');
  
  const registry = getToolRegistry();
  
  // Test: Tools están registradas
  const tools = registry.getTools();
  logTest('Core tools registered', tools.length >= 5, `(${tools.length} tools)`);
  
  // Test: Nombres de tools esperados
  const expectedTools = ['check_availability', 'create_record', 'query_records', 'update_record', 'general_conversation'];
  const hasAllTools = expectedTools.every(t => registry.hasTool(t));
  logTest('Expected tools exist', hasAllTools);
  
  // Test: Mapeo a handlers
  logTest('check_availability → AvailabilityHandler', registry.mapToLegacyHandler('check_availability') === 'AvailabilityHandler');
  logTest('create_record → CreateHandler', registry.mapToLegacyHandler('create_record') === 'CreateHandler');
  logTest('query_records → QueryHandler', registry.mapToLegacyHandler('query_records') === 'QueryHandler');
  
  // Test: Filtrado de tools
  const filtered = registry.getTools({ enabled: ['create_record', 'query_records'] });
  logTest('Tool filtering works', filtered.length === 2, `(got ${filtered.length})`);
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: AgentPromptBuilder
// ═══════════════════════════════════════════════════════════════
function testAgentPromptBuilder() {
  log('\n📝 Testing AgentPromptBuilder...');
  
  const builder = getAgentPromptBuilder();
  
  // Test: Build básico
  const prompt = builder.build({
    agentName: 'TestBot',
    companyName: 'TestCorp',
    vertical: 'healthcare',
    tone: 'friendly',
  });
  
  logTest('Builds system prompt', prompt.length > 100, `(${prompt.length} chars)`);
  logTest('Includes agent name', prompt.includes('TestBot'));
  logTest('Includes company name', prompt.includes('TestCorp'));
  logTest('Includes tone style', prompt.toLowerCase().includes('amigable') || prompt.toLowerCase().includes('friendly'));
  
  // Test: Vertical healthcare tiene restricciones
  logTest('Healthcare has restrictions', prompt.includes('diagnóstico') || prompt.includes('médic'));
  
  // Test: Few-shot examples
  const promptWithExamples = builder.build({
    agentName: 'Bot',
    customExamples: [
      { user: 'test question', assistant: 'test answer' }
    ],
  });
  logTest('Includes few-shot examples', promptWithExamples.includes('test question'));
  
  // Test: Extract config from agent
  const config = builder.extractConfigFromAgent({
    name: 'MyAgent',
    vertical: 'retail',
    tone: 'formal',
  });
  logTest('Extracts config from agent', config.agentName === 'MyAgent');
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: OpenAIProvider (requiere API key)
// ═══════════════════════════════════════════════════════════════
async function testOpenAIProvider() {
  log('\n🤖 Testing OpenAIProvider...');
  
  const provider = getOpenAIProvider();
  
  if (!process.env.OPENAI_API_KEY) {
    logTest('OpenAI API key configured', null, '(OPENAI_API_KEY not set)');
    return;
  }
  
  logTest('OpenAI API key configured', true);
  
  try {
    // Test: Clasificación de mensaje válido
    const validResult = await provider.classifyMessage('Hola, quiero agendar una cita');
    logTest('Classifies valid message', validResult.isValid === true, `(${validResult.category})`);
    
    // Test: Clasificación de garbage
    const garbageResult = await provider.classifyMessage('asdfasdfasdf');
    logTest('Classifies garbage message', garbageResult.category === 'GARBAGE', `(${garbageResult.category})`);
    
    // Test: Function calling
    const tools = getToolRegistry().getTools();
    const fcResult = await provider.functionCall({
      systemPrompt: 'Eres un asistente de citas.',
      messages: [{ role: 'user', content: 'quiero agendar una cita para mañana' }],
      tools,
      model: 'gpt-4o-mini',
    });
    
    logTest('Function calling returns tool', fcResult.tool !== null, `(tool: ${fcResult.tool})`);
    logTest('Function calling selects create_record', fcResult.tool === 'create_record', `(got: ${fcResult.tool})`);
    
    // Test: Query intent
    const queryResult = await provider.functionCall({
      systemPrompt: 'Eres un asistente de citas.',
      messages: [{ role: 'user', content: 'muéstrame las citas de mañana' }],
      tools,
      model: 'gpt-4o-mini',
    });
    logTest('Query intent → query_records', queryResult.tool === 'query_records', `(got: ${queryResult.tool})`);
    
    // Test: Availability intent
    const availResult = await provider.functionCall({
      systemPrompt: 'Eres un asistente de citas.',
      messages: [{ role: 'user', content: '¿hay disponibilidad para mañana?' }],
      tools,
      model: 'gpt-4o-mini',
    });
    logTest('Availability intent → check_availability', availResult.tool === 'check_availability', `(got: ${availResult.tool})`);
    
    // Test: Greeting → general_conversation
    const greetResult = await provider.functionCall({
      systemPrompt: 'Eres un asistente de citas.',
      messages: [{ role: 'user', content: 'hola, buenas tardes' }],
      tools,
      model: 'gpt-4o-mini',
    });
    logTest('Greeting → general_conversation or direct response', 
      greetResult.tool === 'general_conversation' || greetResult.response !== null,
      `(tool: ${greetResult.tool}, hasResponse: ${!!greetResult.response})`
    );
    
  } catch (error) {
    logTest('OpenAI API calls', false, `(Error: ${error.message})`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: Engine Modes
// ═══════════════════════════════════════════════════════════════
function testEngineModes() {
  log('\n⚙️ Testing Engine Modes...');
  
  // Test: Default mode is LLM-First
  const engine1 = new Engine();
  logTest('Default mode is llm-first', engine1.mode === ENGINE_MODES.LLM_FIRST);
  
  // Test: Explicit LLM-First
  const engine2 = new Engine({ mode: ENGINE_MODES.LLM_FIRST });
  logTest('Can set llm-first mode', engine2.mode === ENGINE_MODES.LLM_FIRST);
  
  // Test: Scoring mode
  const engine3 = new Engine({ mode: ENGINE_MODES.SCORING });
  logTest('Can set scoring mode', engine3.mode === ENGINE_MODES.SCORING);
  
  // Test: Legacy mode
  const engine4 = new Engine({ mode: ENGINE_MODES.LEGACY });
  logTest('Can set legacy mode', engine4.mode === ENGINE_MODES.LEGACY);
  
  // Test: Legacy compatibility flag
  const engine5 = new Engine({ useLegacyMode: true });
  logTest('useLegacyMode flag works', engine5.mode === ENGINE_MODES.LEGACY);
  
  // Test: setMode
  const engine6 = new Engine();
  engine6.setMode(ENGINE_MODES.SCORING);
  logTest('setMode() works', engine6.mode === ENGINE_MODES.SCORING);
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: Message Classification
// ═══════════════════════════════════════════════════════════════
async function testMessageClassification() {
  log('\n🔍 Testing Message Classification (LLM-based)...');
  
  if (!process.env.OPENAI_API_KEY) {
    logTest('Skipping (no API key)', null);
    return;
  }
  
  const provider = getOpenAIProvider();
  
  const testCases = [
    { input: 'Hola', expected: 'VALID', desc: 'Simple greeting' },
    { input: 'quiero agendar una cita', expected: 'VALID', desc: 'Intent message' },
    { input: 'si', expected: 'VALID', desc: 'Confirmation' },
    { input: 'asdfasdf', expected: 'GARBAGE', desc: 'Random chars' },
    { input: 'aaaaaaa', expected: 'GARBAGE', desc: 'Repeated chars' },
    { input: '123123123', expected: 'GARBAGE', desc: 'Random numbers' },
    { input: 'COMPRA AHORA!!!', expected: 'SPAM', desc: 'Spam message' },
    { input: 'buenas tardes, quisiera información', expected: 'VALID', desc: 'Polite request' },
    { input: 'ok', expected: 'VALID', desc: 'Short confirmation' },
    { input: 'agndar sita', expected: 'VALID', desc: 'Typos should be valid' },
  ];
  
  for (const tc of testCases) {
    try {
      const result = await provider.classifyMessage(tc.input);
      const passed = result.category === tc.expected || 
                    (tc.expected === 'VALID' && result.isValid);
      logTest(`"${tc.input}" → ${tc.expected}`, passed, `(got: ${result.category})`);
    } catch (error) {
      logTest(`"${tc.input}"`, false, `(Error: ${error.message})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE: Intent Detection Comparison (V2 vs V3)
// ═══════════════════════════════════════════════════════════════
async function testIntentComparison() {
  log('\n⚔️ Testing V2 vs V3 Intent Detection...');
  
  if (!process.env.OPENAI_API_KEY) {
    logTest('Skipping (no API key)', null);
    return;
  }
  
  const provider = getOpenAIProvider();
  const tools = getToolRegistry().getTools();
  
  // Mensajes que V2 (keywords) podría fallar pero V3 debería entender
  const edgeCases = [
    { input: 'sacar turno', expectedTool: 'create_record', desc: 'Argentina slang' },
    { input: 'book appointment', expectedTool: 'create_record', desc: 'English' },
    { input: 'agndar para manana', expectedTool: 'create_record', desc: 'Typos' },
    { input: 'reservar hora', expectedTool: 'create_record', desc: 'Chile slang' },
    { input: 'hay cupo disponible', expectedTool: 'check_availability', desc: 'Alternative phrasing' },
    { input: 'puedo ir mañana?', expectedTool: 'check_availability', desc: 'Implicit availability' },
    { input: 'cancelar mi reserva', expectedTool: 'update_record', desc: 'Cancel = update' },
    { input: 'quiero mover mi cita', expectedTool: 'update_record', desc: 'Reschedule' },
  ];
  
  for (const tc of edgeCases) {
    try {
      const result = await provider.functionCall({
        systemPrompt: 'Eres un asistente de citas.',
        messages: [{ role: 'user', content: tc.input }],
        tools,
        model: 'gpt-4o-mini',
      });
      
      const passed = result.tool === tc.expectedTool;
      logTest(`"${tc.input}" → ${tc.expectedTool}`, passed, `(got: ${result.tool}) - ${tc.desc}`);
    } catch (error) {
      logTest(`"${tc.input}"`, false, `(Error: ${error.message})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🧪 TEST SUITE: V3 LLM-FIRST ENGINE             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  console.log(`\n${colors.dim}Date: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}API Key: ${process.env.OPENAI_API_KEY ? '✓ configured' : '✗ not set'}${colors.reset}`);
  
  // Tests sin API
  testToolRegistry();
  testAgentPromptBuilder();
  testEngineModes();
  
  // Tests con API
  await testOpenAIProvider();
  await testMessageClassification();
  await testIntentComparison();
  
  // Resumen
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   ${colors.green}Passed: ${passCount}${colors.reset}`);
  console.log(`   ${colors.red}Failed: ${failCount}${colors.reset}`);
  console.log(`   ${colors.yellow}Skipped: ${skipCount}${colors.reset}`);
  console.log('═'.repeat(60));
  
  if (failCount > 0) {
    console.log(`\n${colors.red}⚠️  Some tests failed. Review the output above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
