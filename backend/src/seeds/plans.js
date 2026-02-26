/**
 * Seed: Planes de suscripción
 * 
 * Crea los planes en la BD para que sean editables por super admin.
 */

import { connectDB, getDbPrefix } from '../config/db.js';
import { DEFAULT_PLANS } from '../config/plans.js';

export async function seedPlans() {
  console.log('\n[Seed Plans] Iniciando seed de planes...');
  
  try {
    const db = await connectDB(`${getDbPrefix()}_plans`);
    
    // Insertar cada plan
    for (const [planId, planData] of Object.entries(DEFAULT_PLANS)) {
      try {
        // Verificar si ya existe
        const existing = await db.get(planId).catch(() => null);
        
        if (existing) {
          console.log(`⏭️  Plan "${planId}" ya existe, actualizando...`);
          await db.insert({
            ...planData,
            _rev: existing._rev,
            updatedAt: new Date().toISOString()
          });
        } else {
          await db.insert({
            ...planData,
            createdAt: new Date().toISOString()
          });
          console.log(`✅ Plan "${planId}" creado`);
        }
      } catch (err) {
        console.error(`❌ Error creando plan "${planId}":`, err.message);
      }
    }
    
    console.log('[Seed Plans] ✅ Planes creados/actualizados');
    
  } catch (err) {
    console.error('[Seed Plans] Error:', err.message);
    throw err;
  }
}

export default seedPlans;
