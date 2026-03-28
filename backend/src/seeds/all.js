/**
 * Seed All - Sistema de seeding para FlowAI
 * 
 * Uso:
 *   node src/seeds/all.js          # Ejecuta todos los seeds
 *   node src/seeds/all.js --clean  # Limpia BD y ejecuta seeds
 */

import 'dotenv/config';
import seedFlowTemplates from './flow-templates.js';
import seedPlans from './plans.js';
import seedUsers from './users.js';
import { seed as seedPasadiasParaiso } from './pasadias-paraiso.js';
import { getDbPrefix } from '../config/db.js';

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const CLEAN_MODE = process.argv.includes('--clean');

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
  
  console.log(`\nModo: ${CLEAN_MODE ? '🧹 LIMPIEZA + ' : ''}🏝️ PASADÍAS PARAÍSO`);

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
    
    // 3. Seed de Usuarios (primero para que existan cuando se vinculen workspaces)
    console.log('\n👥 Ejecutando seed: Usuarios de prueba');
    console.log('─'.repeat(60));
    await seedUsers();
    
    // 4. Seed Pasadías Paraíso (workspace demo completo)
    console.log('\n🏝️ Ejecutando seed: Pasadías Paraíso');
    console.log('─'.repeat(60));
    await seedPasadiasParaiso();
    
    console.log('\n✅ Seed completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n');
}

main().catch(console.error);
