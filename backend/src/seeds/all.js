/**
 * Seed All - Ejecuta todos los seeds genéricos
 * 
 * Uso:
 *   node src/seeds/all.js          # Ejecuta todos los seeds
 *   node src/seeds/all.js --clean  # Limpia BD y ejecuta todos los seeds
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar los nuevos seeds genéricos
import seedRestaurant from './generic-restaurant.js';
import seedSalon from './generic-salon.js';
import seedClinic from './generic-clinic.js';

// Importar configuración dinámica de DB
import { getDbPrefix } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password@127.0.0.1:5984';
const CLEAN_MODE = process.argv.includes('--clean');

// Obtener prefijo dinámico desde configuración
const DB_PREFIX = getDbPrefix();

// Patrones de bases de datos a limpiar (incluye legacy 'chatbot_')
const DB_PATTERNS = [
  `${DB_PREFIX}workspaces`,
  DB_PREFIX,
  'chatbot_', // Limpiar también legacy si existe
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
  console.log(`   LIMPIANDO BASES DE DATOS (Prefijo: ${DB_PREFIX})`);
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

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      🌱 SEED ALL - SISTEMA DINÁMICO MULTI-EMPRESA       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nModo: ${CLEAN_MODE ? '🧹 LIMPIEZA + SEED' : '📦 SOLO SEED'}`);
  console.log(`Database: ${COUCHDB_URL.replace(/\/\/.*@/, '//<hidden>@')}`);

  // Limpiar si es necesario
  if (CLEAN_MODE) {
    await cleanDatabases();
  }

  console.log('\n📋 Seeds genéricos a ejecutar:');
  console.log('   1. 🍽️  Restaurante (generic-restaurant)');
  console.log('   2. 💇  Salón de Belleza (generic-salon)');
  console.log('   3. 🏥  Clínica/Veterinaria (generic-clinic)');

  let success = 0;
  let failed = 0;

  // Ejecutar seeds directamente (ya están importados)
  const seedFunctions = [
    { name: 'Restaurante', fn: seedRestaurant },
    { name: 'Salón de Belleza', fn: seedSalon },
    { name: 'Clínica', fn: seedClinic },
  ];

  for (const { name, fn } of seedFunctions) {
    try {
      console.log(`\n📦 Ejecutando seed: ${name}`);
      console.log('─'.repeat(60));
      await fn();
      success++;
    } catch (error) {
      console.error(`❌ Error ejecutando seed ${name}:`, error.message);
      failed++;
    }
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 RESUMEN                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n   ✅ Exitosos: ${success}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log('\n   Workspaces creados (100% dinámicos):');
  console.log('   ─────────────────────────────────────────────────────');
  console.log('   🍽️  Restaurante Demo        - Sistema de reservas');
  console.log('   💇  Salón de Belleza Demo   - Sistema de citas');
  console.log('   🏥  Clínica Demo             - Sistema de citas médicas');
  console.log('\n   ✨ Todos configurados dinámicamente desde fieldsConfig');
  console.log('   ✨ Sin código hardcodeado - todo desde BD');
  console.log('\n');
}

main().catch(console.error);
