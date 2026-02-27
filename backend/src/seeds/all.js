/**
 * Seed All - Ejecuta el seed del CRM y/o Testing V3
 * 
 * Uso:
 *   node src/seeds/all.js          # Ejecuta seed del CRM
 *   node src/seeds/all.js --clean  # Limpia BD y ejecuta seed
 *   node src/seeds/all.js --v3     # Ejecuta solo seed de testing V3
 *   node src/seeds/all.js --all    # Ejecuta CRM + Testing V3
 */

import 'dotenv/config';
import seedPremiumCRM from './premium-crm.js';
import seedTestingV3 from './testing-v3.js';
import seedFlowTemplates from './flow-templates.js';
import seedPlans from './plans.js';
import seedUsers from './users.js';
import seedAllWorkspaces from './workspaces-by-plan.js';
import { getDbPrefix } from '../config/db.js';

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const CLEAN_MODE = process.argv.includes('--clean');
const V3_ONLY = process.argv.includes('--v3');
const RUN_ALL = process.argv.includes('--all');

const DB_PREFIX = getDbPrefix();

// Patrones de bases de datos a limpiar
const DB_PATTERNS = [
  `${DB_PREFIX}workspaces`,
  DB_PREFIX,
  'chatbot_',
];

function parseCouchUrl(url) {
  const match = url.match(/^(https?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (match) {
    return {
      baseUrl: `${match[1]}${match[4]}`,
      auth: Buffer.from(`${match[2]}:${match[3]}`).toString('base64')
    };
  }
  return { baseUrl: url, auth: null };
}

const { baseUrl, auth } = parseCouchUrl(COUCHDB_URL);
const authHeaders = auth ? { 'Authorization': `Basic ${auth}` } : {};

async function listDatabases() {
  try {
    const response = await fetch(`${baseUrl}/_all_dbs`, { headers: authHeaders });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error listando bases de datos:', error.message);
    return [];
  }
}

async function deleteDatabase(dbName) {
  try {
    const response = await fetch(`${baseUrl}/${dbName}`, { method: 'DELETE', headers: authHeaders });
    if (response.ok) {
      console.log(`  🗑️  Eliminada: ${dbName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`  ⚠️  Error eliminando ${dbName}:`, error.message);
    return false;
  }
}

async function cleanDatabases() {
  console.log('\n🧹 Limpiando bases de datos...\n');

  const allDbs = await listDatabases();
  const toDelete = allDbs.filter(db => 
    DB_PATTERNS.some(pattern => db.startsWith(pattern))
  );

  if (toDelete.length === 0) {
    console.log('No hay bases de datos para eliminar.\n');
    return;
  }

  console.log(`Eliminando ${toDelete.length} bases de datos...\n`);
  
  for (const db of toDelete) {
    await deleteDatabase(db);
  }

  console.log('\n✅ Limpieza completada\n');
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🌱 SEED - DATABASE SEEDER                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  const mode = V3_ONLY ? '🧪 TESTING V3' : RUN_ALL ? '📦 CRM + TESTING V3' : '📦 CRM PREMIUM';
  console.log(`\nModo: ${CLEAN_MODE ? '🧹 LIMPIEZA + ' : ''}${mode}`);

  if (CLEAN_MODE) {
    await cleanDatabases();
  }

  try {
    // 1. Seed de Planes (siempre primero - son globales)
    console.log('\n💎 Ejecutando seed: Planes de suscripción');
    console.log('─'.repeat(60));
    await seedPlans();
    
    // 2. Seed de plantillas de flujos (son globales)
    console.log('\n📋 Ejecutando seed: Plantillas de Flujos');
    console.log('─'.repeat(60));
    await seedFlowTemplates();
    
    // 3. Seed CRM Premium (a menos que sea --v3 only)
    if (!V3_ONLY) {
      console.log('\n📦 Ejecutando seed: CRM Premium');
      console.log('─'.repeat(60));
      await seedPremiumCRM();
    }
    
    // 4. Seed de Workspaces por Plan (Free, Starter, Enterprise)
    if (!V3_ONLY) {
      console.log('\n🏢 Ejecutando seed: Workspaces por Plan');
      console.log('─'.repeat(60));
      await seedAllWorkspaces();
    }
    
    // 5. Seed Testing V3 (si es --v3 o --all)
    if (V3_ONLY || RUN_ALL) {
      console.log('\n🧪 Ejecutando seed: Testing V3');
      console.log('─'.repeat(60));
      await seedTestingV3();
    }
    
    // 6. Seed de Usuarios (siempre al final - depende de workspaces)
    console.log('\n👥 Ejecutando seed: Usuarios de prueba');
    console.log('─'.repeat(60));
    await seedUsers();
    
    console.log('\n✅ Seed completado exitosamente');
    
    // Mostrar instrucciones para testing
    if (V3_ONLY || RUN_ALL) {
      console.log('\n📋 Para probar V3:');
      console.log('   node src/tests/test-v3-engine.js    # Tests automáticos');
      console.log('   node src/tests/test-chat-v3.js      # Tests de chat');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

main().catch(console.error);
