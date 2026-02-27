/**
 * Script para limpiar registros duplicados en la base de datos
 * Ejecutar: node src/seeds/cleanup-duplicates.js
 */

import { connectDB, getAgentsDbName, getWorkspacesDbName, getWorkspaceDbName, getTableDataDbName } from '../config/db.js';

async function cleanupDuplicates() {
  console.log('\n🧹 Limpiando registros duplicados...\n');
  
  try {
    // 1. Obtener todos los workspaces
    const workspacesDb = await connectDB(getWorkspacesDbName());
    const allWorkspaces = await workspacesDb.list({ include_docs: true });
    const workspaces = allWorkspaces.rows
      .filter(r => r.doc && !r.id.startsWith('_design'))
      .map(r => r.doc);
    
    console.log(`📁 Encontrados ${workspaces.length} workspaces\n`);
    
    let totalDeleted = 0;
    
    for (const ws of workspaces) {
      console.log(`\n🔍 Procesando workspace: ${ws.name} (${ws._id})`);
      
      // Limpiar agentes duplicados
      const agentsDb = await connectDB(getAgentsDbName(ws._id));
      const agentsResult = await agentsDb.list({ include_docs: true });
      const agents = agentsResult.rows
        .filter(r => r.doc && r.doc.type === 'agent')
        .map(r => r.doc);
      
      // Agrupar por nombre
      const agentsByName = {};
      for (const agent of agents) {
        if (!agentsByName[agent.name]) {
          agentsByName[agent.name] = [];
        }
        agentsByName[agent.name].push(agent);
      }
      
      // Eliminar duplicados (mantener el más reciente)
      for (const [name, agentsList] of Object.entries(agentsByName)) {
        if (agentsList.length > 1) {
          console.log(`  ⚠️ Encontrados ${agentsList.length} agentes con nombre "${name}"`);
          
          // Ordenar por fecha de creación (más reciente primero)
          agentsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          // Mantener el primero, eliminar el resto
          for (let i = 1; i < agentsList.length; i++) {
            const toDelete = agentsList[i];
            console.log(`  🗑️ Eliminando duplicado: ${toDelete._id}`);
            await agentsDb.destroy(toDelete._id, toDelete._rev);
            totalDeleted++;
          }
        }
      }
      
      // Limpiar tablas duplicadas
      const workspaceDb = await connectDB(getWorkspaceDbName(ws._id));
      const tablesResult = await workspaceDb.list({ include_docs: true });
      const tables = tablesResult.rows
        .filter(r => r.doc && r.doc.name && r.doc.headers)
        .map(r => r.doc);
      
      // Agrupar por nombre
      const tablesByName = {};
      for (const table of tables) {
        if (!tablesByName[table.name]) {
          tablesByName[table.name] = [];
        }
        tablesByName[table.name].push(table);
      }
      
      // Eliminar duplicados
      for (const [name, tablesList] of Object.entries(tablesByName)) {
        if (tablesList.length > 1) {
          console.log(`  ⚠️ Encontradas ${tablesList.length} tablas con nombre "${name}"`);
          
          // Ordenar por fecha de creación
          tablesList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          
          // Mantener la primera, eliminar el resto
          for (let i = 1; i < tablesList.length; i++) {
            const toDelete = tablesList[i];
            console.log(`  🗑️ Eliminando tabla duplicada: ${toDelete._id}`);
            await workspaceDb.destroy(toDelete._id, toDelete._rev);
            totalDeleted++;
            
            // También eliminar datos de la tabla duplicada
            try {
              const tableDataDb = await connectDB(getTableDataDbName(ws._id));
              const dataResult = await tableDataDb.list({ include_docs: true });
              const tableData = dataResult.rows
                .filter(r => r.doc && r.doc.tableId === toDelete._id)
                .map(r => r.doc);
              
              for (const data of tableData) {
                await tableDataDb.destroy(data._id, data._rev);
                totalDeleted++;
              }
              if (tableData.length > 0) {
                console.log(`  🗑️ Eliminados ${tableData.length} registros de datos`);
              }
            } catch (e) {
              // Ignorar si no hay datos
            }
          }
        }
      }
    }
    
    console.log(`\n✅ Limpieza completada. ${totalDeleted} registros eliminados.`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

cleanupDuplicates();
