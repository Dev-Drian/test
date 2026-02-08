/**
 * Seed All - Ejecuta todos los seeds en orden
 * 
 * Uso:
 *   node src/seeds/all.js          # Ejecuta todos los seeds
 *   node src/seeds/all.js --clean  # Limpia BD y ejecuta todos los seeds
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const CLEAN_MODE = process.argv.includes('--clean');

// Bases de datos a limpiar (incluye ambos prefijos legacy y nuevo)
const DB_PATTERNS = [
  // Nuevo prefijo
  'chatbot_workspaces',
  'chatbot_',
  // Prefijo legacy
  'db_workspaces',
  'migracion_',
];

// Extraer credenciales y URL base
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
  console.log('\n🧹 ════════════════════════════════════════════════════════');
  console.log('   LIMPIANDO BASES DE DATOS');
  console.log('════════════════════════════════════════════════════════════\n');

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

async function runSeed(seedFile) {
  const seedPath = path.join(__dirname, seedFile);
  console.log(`\n📦 Ejecutando: ${seedFile}`);
  console.log('─'.repeat(60));
  
  try {
    execSync(`node "${seedPath}"`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..')
    });
    return true;
  } catch (error) {
    console.error(`❌ Error ejecutando ${seedFile}`);
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🌱 SEED ALL - CHATBOT PLATFORM                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nModo: ${CLEAN_MODE ? '🧹 LIMPIEZA + SEED' : '📦 SOLO SEED'}`);
  console.log(`Database: ${COUCHDB_URL.replace(/\/\/.*@/, '//<hidden>@')}`);

  // Limpiar si es necesario
  if (CLEAN_MODE) {
    await cleanDatabases();
  }

  // Lista de seeds a ejecutar en orden
  const seeds = [
    'tiendaBasica.js',   // Tienda (PLAN BÁSICO - sin flujos)
    'veterinaria.js',    // Veterinaria (Premium)
    'restaurante.js',    // Restaurante La Casona (Premium)
    'salonBelleza.js',   // Salón Bella Vida (Premium)
  ];

  console.log('\n📋 Seeds a ejecutar:');
  seeds.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

  let success = 0;
  let failed = 0;

  for (const seed of seeds) {
    const result = await runSeed(seed);
    if (result) success++;
    else failed++;
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 RESUMEN                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n   ✅ Exitosos: ${success}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log('\n   Workspaces creados:');
  console.log('   ─────────────────────────────────────────────────────');
  console.log('   🏪 Tienda El Ahorro         - Plan BÁSICO (sin flujos)');
  console.log('   🐾 Veterinaria PetCare      - Plan Premium (con flujos)');
  console.log('   🍽️  Restaurante La Casona   - Plan Premium (con flujos)');
  console.log('   💇‍♀️ Salón Bella Vida        - Plan Premium (con flujos)');
  console.log('\n');
}

main().catch(console.error);
