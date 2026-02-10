/**
 * Script para actualizar agentes existentes sin campos requeridos
 * 
 * Agrega campos necesarios para que los agentes funcionen correctamente:
 * - prompt, useFlows, hasFlows, planFeatures, active
 */

import 'dotenv/config';
import { connectDB, getAgentsDbName } from '../config/db.js';

const WORKSPACES = ['restaurant-generic', 'salon-generic', 'clinic-generic'];

async function fixAgents() {
  console.log('\n[Fix Agents] Iniciando actualización de agentes...\n');
  
  try {
    for (const workspaceId of WORKSPACES) {
      console.log(`Revisando workspace: ${workspaceId}`);
      
      try {
        const db = await connectDB(getAgentsDbName(workspaceId));
        const result = await db.find({ selector: {}, limit: 200 });
        const agents = result.docs || [];
        
        if (agents.length === 0) {
          console.log(`  ⚠️  No hay agentes en ${workspaceId}`);
          continue;
        }
        
        for (const agent of agents) {
          let needsUpdate = false;
          const updates = {};
          
          // Verificar campos faltantes
          if (!agent.prompt) {
            updates.prompt = `Eres un asistente virtual amable y profesional.
            
Ayuda al usuario con sus consultas sobre la información disponible en las tablas.
Sé conciso y claro en tus respuestas.`;
            needsUpdate = true;
          }
          
          if (agent.useFlows === undefined) {
            updates.useFlows = true;
            needsUpdate = true;
          }
          
          if (agent.hasFlows === undefined) {
            updates.hasFlows = true;
            needsUpdate = true;
          }
          
          if (!agent.planFeatures) {
            updates.planFeatures = {
              canCreate: true,
              canUpdate: true,
              canQuery: true,
              canDelete: false
            };
            needsUpdate = true;
          }
          
          if (agent.active === undefined) {
            updates.active = true;
            needsUpdate = true;
          }
          
          if (!agent.aiModel || agent.aiModel.length === 0) {
            updates.aiModel = ['gpt-4o-mini'];
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const updatedAgent = {
              ...agent,
              ...updates,
              updatedAt: new Date().toISOString()
            };
            
            await db.insert(updatedAgent);
            console.log(`  ✅ Actualizado: ${agent.name} (${agent._id})`);
            console.log(`     Campos agregados:`, Object.keys(updates).join(', '));
          } else {
            console.log(`  ℹ️  OK: ${agent.name} (ya tiene todos los campos)`);
          }
        }
        
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`  ⚠️  Base de datos no existe aún: ${workspaceId}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ Actualización de agentes completada\n');
    
  } catch (error) {
    console.error('❌ Error actualizando agentes:', error);
    throw error;
  }
}

// Ejecutar
fixAgents()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
