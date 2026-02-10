/**
 * Script para verificar los seeds creados
 */
import nano from 'nano';
import dotenv from 'dotenv';
dotenv.config();

const couch = nano(process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984');

async function checkSeeds() {
  console.log('========================================');
  console.log('🔍 VERIFICANDO SEEDS CREADOS');
  console.log('========================================\n');
  
  // 1. Listar todas las bases de datos chatbot_*
  const allDbs = await couch.db.list();
  const chatbotDbs = allDbs.filter(db => db.startsWith('chatbot_'));
  
  console.log('📁 Bases de datos encontradas:');
  chatbotDbs.forEach(db => console.log(`   - ${db}`));
  console.log('');
  
  // 2. Obtener workspaces
  if (!chatbotDbs.includes('chatbot_workspaces')) {
    console.log('⚠️  No existe chatbot_workspaces - ejecuta seeds primero');
    return;
  }
  
  const wsDb = couch.use('chatbot_workspaces');
  const workspaces = await wsDb.list({ include_docs: true });
  
  console.log('========================================');
  console.log('🏢 WORKSPACES CREADOS');
  console.log('========================================\n');
  
  for (const row of workspaces.rows) {
    const ws = row.doc;
    if (!ws || ws._id.startsWith('_design')) continue;
    
    console.log(`\n✅ Workspace: ${ws.name}`);
    console.log(`   ID: ${ws._id}`);
    console.log(`   Tiene flujos: ${ws.hasFlows ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   API Key: ${ws.openaiApiKey ? '✅ Configurada' : '⚠️  No configurada'}`);
    
    // Obtener agente
    const agentsDb = couch.use(`chatbot_agents_${ws._id}`);
    const agents = await agentsDb.list({ include_docs: true });
    
    console.log(`\n   👤 AGENTE:`);
    for (const aRow of agents.rows) {
      const agent = aRow.doc;
      if (!agent || agent._id.startsWith('_design')) continue;
      
      console.log(`      - ${agent.name}`);
      console.log(`        Usa flujos: ${agent.useFlows ? '✅ SÍ' : '❌ NO'}`);
      console.log(`        Prompt: ${agent.systemPrompt?.slice(0, 80)}...`);
    }
    
    // Obtener tablas
    const tablesDb = couch.use(`chatbot_tables_${ws._id}`);
    const tables = await tablesDb.list({ include_docs: true });
    
    console.log(`\n   📊 TABLAS:`);
    for (const tRow of tables.rows) {
      const table = tRow.doc;
      if (!table || table._id.startsWith('_design')) continue;
      
      console.log(`      - ${table.name} (${table.fieldsConfig?.length || 0} campos)`);
      
      // Contar registros
      const dataDb = couch.use(`chatbot_tabledata_${ws._id}`);
      const records = await dataDb.find({
        selector: { 
          tableId: table._id,
          $or: [{ main: { $exists: false }}, { main: { $ne: true }}]
        },
        limit: 1000
      });
      
      console.log(`        Registros: ${records.docs.length}`);
      
      // Mostrar campos
      if (table.fieldsConfig) {
        console.log(`        Campos:`);
        table.fieldsConfig.forEach(f => {
          console.log(`          • ${f.name} (${f.type}) ${f.required ? '* requerido' : ''}`);
        });
      }
    }
    
    console.log('\n   ─────────────────────────────────────');
  }
  
  console.log('\n========================================');
  console.log('📝 RESUMEN DE DIFERENCIAS');
  console.log('========================================\n');
  
  console.log('🔹 BOT NORMAL (sin flujos):');
  console.log('   • useFlows = false');
  console.log('   • El bot responde LIBREMENTE con IA');
  console.log('   • Solo usa el systemPrompt del agente');
  console.log('   • NO ejecuta acciones automáticas (CREATE, UPDATE, etc)');
  console.log('   • Más flexible pero menos estructurado');
  console.log('');
  
  console.log('🔸 BOT CON FLUJOS:');
  console.log('   • useFlows = true');
  console.log('   • El bot sigue un FLUJO ESTRUCTURADO');
  console.log('   • Detecta intenciones (CREATE, UPDATE, QUERY, etc)');
  console.log('   • Ejecuta acciones automáticas según la intención');
  console.log('   • Recolecta campos faltantes paso a paso');
  console.log('   • Valida datos antes de guardar');
  console.log('   • Usa EntityRepository para CRUD dinámico');
  console.log('   • Más estructurado y predecible');
  console.log('');
  
  console.log('========================================\n');
}

checkSeeds()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
