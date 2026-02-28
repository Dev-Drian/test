/**
 * Script de migración: Agrega permisos a todos los agentes existentes
 * 
 * Convierte el formato viejo:
 *   tables: [{ tableId: 'xxx', fullAccess: true }]
 * 
 * Al formato nuevo:
 *   tables: [{ tableId: 'xxx', tableName: 'Clientes', fullAccess: true, permissions: { query: true, create: true, update: false, delete: false } }]
 */

import nano from 'nano';
import { connectDB, getDbPrefix, getTableDbName } from '../config/db.js';
import SystemConfig from '../config/system.js';

export async function migrateAgentPermissions() {
  console.log('\n[Migration] Actualizando permisos de agentes...\n');
  
  const COUCHDB_URL = process.env.COUCHDB_URL || SystemConfig.database.url;
  const couch = nano(COUCHDB_URL);
  
  // Listar todas las DBs
  const dbs = await couch.db.list();
  const agentDbs = dbs.filter(d => d.includes('agents_'));
  
  console.log('Bases de datos de agentes encontradas:', agentDbs.length);
  
  let updated = 0;
  let skipped = 0;
  
  for (const dbName of agentDbs) {
    // Extraer workspaceId del nombre de la DB
    const match = dbName.match(/agents_(.+)/);
    if (match === null) continue;
    const workspaceId = match[1];
    
    console.log('\n--- Workspace:', workspaceId, '---');
    
    try {
      const agentsDb = await connectDB(dbName);
      const tablesDb = await connectDB(getTableDbName(workspaceId));
      
      // Obtener nombres de tablas
      const tablesResult = await tablesDb.list({ include_docs: true });
      const tableMap = {};
      tablesResult.rows.forEach(r => {
        if (r.doc && r.doc.name) tableMap[r.id] = r.doc.name;
      });
      
      // Actualizar agentes
      const agentsResult = await agentsDb.list({ include_docs: true });
      
      for (const row of agentsResult.rows) {
        if (row.doc === undefined || row.id.startsWith('_')) continue;
        const agent = row.doc;
        
        // Verificar si las tablas ya tienen el formato nuevo
        const tables = agent.tables || [];
        const needsUpdate = tables.length === 0 ? false : tables.some(t => t.permissions === undefined);
        
        if (needsUpdate === false) {
          console.log('  [OK]', agent.name, '- Ya actualizado');
          skipped++;
          continue;
        }
        
        // Convertir tablas al nuevo formato
        agent.tables = tables.map(t => {
          // Si ya tiene permissions, mantener
          if (t.permissions) return t;
          
          // Si es string simple, convertir
          const tableId = typeof t === 'string' ? t : (t.tableId || t.id || t);
          const tableName = tableMap[tableId] || t.tableName || 'Tabla';
          const fullAccess = t.fullAccess !== false;
          
          return {
            tableId,
            tableName,
            fullAccess,
            permissions: { query: true, create: true, update: false, delete: false }
          };
        });
        
        await agentsDb.insert(agent);
        console.log('  [UPD]', agent.name, '- Permisos agregados');
        updated++;
      }
    } catch (err) {
      console.log('  [ERR]', err.message);
    }
  }
  
  console.log('\n========================================');
  console.log('Migración completada:');
  console.log('  - Actualizados:', updated);
  console.log('  - Ya correctos:', skipped);
  console.log('========================================\n');
}

// Ejecutar si se llama directamente
migrateAgentPermissions().catch(console.error);
