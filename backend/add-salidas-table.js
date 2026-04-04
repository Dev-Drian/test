/**
 * Script para agregar la tabla "Salidas Programadas" al workspace pasadias-paraiso
 * 
 * Esta tabla maneja la disponibilidad de cada destino por fecha/horario.
 * 
 * Ejecutar: node add-salidas-table.js
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB, getWorkspaceDbName, getTableDataDbName } from './src/config/db.js';

const WORKSPACE_ID = 'pasadias-paraiso';

async function getDestinosTable(workspaceDb) {
  const result = await workspaceDb.list({ include_docs: true });
  const destinos = result.rows.find(r => r.doc && r.doc.name === 'Destinos');
  return destinos?.doc;
}

async function tableExists(workspaceDb, name) {
  const result = await workspaceDb.list({ include_docs: true });
  return result.rows.some(r => r.doc && r.doc.name === name);
}

async function addSalidasTable() {
  console.log('\n🚌 Agregando tabla "Salidas Programadas" a Pasadías Paraíso...\n');
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    
    // Verificar si ya existe
    if (await tableExists(workspaceDb, 'Salidas Programadas')) {
      console.log('  ⚠️ La tabla "Salidas Programadas" ya existe, saltando...');
      return;
    }
    
    // Obtener tabla de Destinos para la relación
    const destinosTable = await getDestinosTable(workspaceDb);
    if (!destinosTable) {
      console.log('  ❌ No se encontró la tabla Destinos');
      return;
    }
    
    // ════════════════════════════════════════════════════════════════════
    // TABLA: SALIDAS PROGRAMADAS
    // ════════════════════════════════════════════════════════════════════
    const salidasTableId = uuidv4();
    const salidasTable = {
      _id: salidasTableId,
      name: 'Salidas Programadas',
      type: 'calendar',
      displayField: 'fecha',
      description: 'Calendario de salidas disponibles por destino. Aquí se programa cuándo hay viajes y cuántos cupos quedan.',
      permissions: {
        allowQuery: true,
        allowCreate: false,  // Solo admin crea salidas
        allowUpdate: false,
        allowDelete: false
      },
      headers: [
        { 
          key: 'destino', 
          label: 'Destino', 
          type: 'relation', 
          required: true, 
          emoji: '🏝️',
          priority: 1,
          relation: {
            tableName: 'Destinos',
            displayField: 'nombre',
            searchField: 'nombre',
            autoCreate: false,
            validateOnInput: true
          }
        },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true, emoji: '📅', priority: 2 },
        { key: 'horaSalida', label: 'Hora Salida', type: 'time', required: true, emoji: '🚌', priority: 3 },
        { key: 'horaRegreso', label: 'Hora Regreso', type: 'time', required: true, emoji: '🏠', priority: 4 },
        { key: 'capacidadTotal', label: 'Capacidad Total', type: 'number', required: true, emoji: '👥', priority: 5, validation: { min: 1, max: 100 } },
        { key: 'cuposDisponibles', label: 'Cupos Disponibles', type: 'number', required: true, emoji: '✅', priority: 6, validation: { min: 0 } },
        { key: 'vehiculo', label: 'Vehículo', type: 'text', required: false, emoji: '🚐', hiddenFromChat: true },
        { key: 'guia', label: 'Guía', type: 'text', required: false, emoji: '🧑‍🦯', hiddenFromChat: true },
        { key: 'precioEspecial', label: 'Precio Especial', type: 'number', required: false, emoji: '💰', hiddenFromChat: true },
        { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', options: ['Disponible', 'Pocos cupos', 'Lleno', 'Cancelado'], defaultValue: 'Disponible', priority: 7 },
        { key: 'notas', label: 'Notas', type: 'text', required: false, emoji: '📝', hiddenFromChat: true }
      ],
      createdAt: new Date().toISOString()
    };
    
    await workspaceDb.insert(salidasTable);
    console.log('  ✅ Tabla "Salidas Programadas" creada');
    
    // ════════════════════════════════════════════════════════════════════
    // DATOS DE EJEMPLO: Próximas salidas (siguiente mes)
    // ════════════════════════════════════════════════════════════════════
    const dataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, salidasTableId));
    
    // Obtener los destinos existentes
    const destinosDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, destinosTable._id));
    const destinosResult = await destinosDataDb.list({ include_docs: true });
    const destinos = destinosResult.rows
      .filter(r => r.doc && r.doc.tableId === destinosTable._id)
      .map(r => r.doc);
    
    console.log(`  📍 Encontrados ${destinos.length} destinos`);
    
    // Generar salidas para los próximos 30 días
    const today = new Date();
    const salidas = [];
    
    for (const destino of destinos) {
      // Cada destino tiene salidas ciertos días de la semana
      const diasSemana = destino.categoria === 'Aventura' 
        ? [5, 6, 0] // Viernes, Sábado, Domingo para aventura
        : [3, 4, 5, 6, 0]; // Miércoles a Domingo para otros
      
      for (let i = 0; i < 30; i++) {
        const fecha = new Date(today);
        fecha.setDate(today.getDate() + i);
        
        if (diasSemana.includes(fecha.getDay())) {
          // Calcular cupos aleatorios realistas
          const capacidad = destino.capacidadMax || 40;
          const reservados = Math.floor(Math.random() * (capacidad * 0.7));
          const disponibles = capacidad - reservados;
          
          let estado = 'Disponible';
          if (disponibles === 0) estado = 'Lleno';
          else if (disponibles < capacidad * 0.2) estado = 'Pocos cupos';
          
          salidas.push({
            _id: uuidv4(),
            tableId: salidasTableId,
            destino: destino.nombre,
            fecha: fecha.toISOString().split('T')[0],
            horaSalida: destino.horaSalida || '6:00 AM',
            horaRegreso: destino.horaRegreso || '6:00 PM',
            capacidadTotal: capacidad,
            cuposDisponibles: disponibles,
            estado,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    
    // Insertar salidas
    for (const salida of salidas) {
      await dataDb.insert(salida);
    }
    console.log(`  ✅ ${salidas.length} salidas programadas creadas`);
    
    console.log('\n🎉 ¡Listo! La tabla "Salidas Programadas" está disponible.\n');
    console.log('📋 Ahora puedes:');
    console.log('   - Ver qué fechas tienen disponibilidad para cada destino');
    console.log('   - Consultar cuántos cupos quedan para una fecha');
    console.log('   - El agente puede verificar disponibilidad antes de reservar');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
addSalidasTable();
