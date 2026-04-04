/**
 * Script para mejorar los campos de adultos/niños en la tabla Reservas
 * 
 * Cambia las preguntas para que sean más naturales:
 * - "¿Cuántas personas van? (adultos y niños)"
 * - Pregunta adultos y niños juntos de forma más conversacional
 * 
 * Ejecutar: node update-reservas-fields.js
 */

import { connectDB, getWorkspaceDbName } from './src/config/db.js';

const WORKSPACE_ID = 'pasadias-paraiso';

async function updateReservasFields() {
  console.log('\n📝 Actualizando campos de la tabla Reservas...\n');
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    
    // Buscar la tabla Reservas
    const result = await workspaceDb.list({ include_docs: true });
    const reservasRow = result.rows.find(r => r.doc && r.doc.name === 'Reservas');
    
    if (!reservasRow) {
      console.log('  ❌ No se encontró la tabla Reservas');
      return;
    }
    
    const reservas = reservasRow.doc;
    console.log(`  📋 Tabla encontrada: ${reservas._id}`);
    
    // Actualizar los headers
    const headers = reservas.headers.map(h => {
      if (h.key === 'adultos') {
        return {
          ...h,
          askMessage: '¿Para cuántas personas adultas?',
          description: 'Número de adultos que van al pasadía',
          priority: 5
        };
      }
      if (h.key === 'ninos') {
        return {
          ...h,
          askMessage: '¿Van niños? ¿Cuántos?',
          description: 'Número de niños (menores de 12 años)',
          priority: 6
        };
      }
      if (h.key === 'fechaViaje') {
        return {
          ...h,
          askMessage: '¿Para qué fecha desea reservar? (Verificaré disponibilidad)',
          description: 'Fecha del viaje - se verifica contra salidas disponibles',
          priority: 4
        };
      }
      return h;
    });
    
    // También agregar un campo combinado de personas como alternativa
    // Este campo puede capturar "2 adultos y 1 niño" en una sola respuesta
    const hasPersonasField = headers.some(h => h.key === 'personas');
    
    if (!hasPersonasField) {
      // Encontrar la posición después de fechaViaje
      const fechaIndex = headers.findIndex(h => h.key === 'fechaViaje');
      
      // Agregar campo virtual/helper para captura natural
      // Este campo NO se guarda, solo ayuda al LLM a entender mejor
      headers.splice(fechaIndex + 1, 0, {
        key: 'personas',
        label: '¿Cuántas personas?',
        type: 'text',
        required: false,
        emoji: '👨‍👩‍👧‍👦',
        priority: 5,
        askMessage: '¿Para cuántas personas? (adultos y niños)',
        description: 'Campo helper: el usuario puede decir "2 adultos y 1 niño" y el sistema extrae los valores',
        extractTo: ['adultos', 'ninos'],  // Indica que este campo se extrae a otros
        hiddenFromChat: true,  // No se muestra en resumen
        virtual: true  // No se guarda en BD
      });
      
      // Actualizar prioridades de adultos y niños
      headers.forEach(h => {
        if (h.key === 'adultos') h.priority = 6;
        if (h.key === 'ninos') h.priority = 7;
      });
    }
    
    reservas.headers = headers;
    reservas.updatedAt = new Date().toISOString();
    
    // Guardar cambios
    await workspaceDb.insert(reservas);
    
    console.log('  ✅ Campos actualizados:');
    console.log('     - fechaViaje: "¿Para qué fecha desea reservar?"');
    console.log('     - personas: "¿Para cuántas personas? (adultos y niños)"');
    console.log('     - adultos: "¿Para cuántas personas adultas?"');
    console.log('     - niños: "¿Van niños? ¿Cuántos?"');
    
    console.log('\n🎉 ¡Listo! Las preguntas ahora son más naturales.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
updateReservasFields();
