/**
 * Script para agregar keywords/aliases a la tabla Salidas Programadas
 * para que el LLM la encuentre cuando el usuario pregunte por "fechas", "disponibilidad", etc.
 */

import { connectDB, getWorkspaceDbName } from './src/config/db.js';

async function updateSalidasTable() {
  console.log('\n📅 Actualizando tabla "Salidas Programadas" con keywords...\n');
  
  const db = await connectDB(getWorkspaceDbName('pasadias-paraiso'));
  const result = await db.list({ include_docs: true });
  const salidasRow = result.rows.find(r => r.doc && r.doc.name === 'Salidas Programadas');
  
  if (!salidasRow) {
    console.log('❌ No se encontró la tabla');
    return;
  }
  
  const salidas = salidasRow.doc;
  
  // Agregar keywords y descripción mejorada
  salidas.keywords = [
    'fechas disponibles',
    'disponibilidad', 
    'calendario',
    'cupos',
    'salidas',
    'horarios',
    'cuando hay viaje',
    'que dias',
    'próximas salidas'
  ];
  
  salidas.description = 'Calendario de salidas disponibles. Consultar SIEMPRE antes de crear una reserva para verificar si hay cupos para la fecha solicitada. Contiene: destino, fecha, horarios, cupos disponibles.';
  
  // También asegurar que allowQuery esté habilitado
  salidas.permissions = {
    ...salidas.permissions,
    allowQuery: true
  };
  
  salidas.updatedAt = new Date().toISOString();
  await db.insert(salidas);
  
  console.log('✅ Tabla actualizada con keywords:', salidas.keywords);
  console.log('✅ Descripción:', salidas.description);
}

updateSalidasTable();
