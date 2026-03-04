/**
 * Seed: Datos de prueba para tabla Mesas
 */

import { connectDB, getWorkspaceDbName, getTableDataDbName } from '../config/db.js';

const WORKSPACE_ID = 'premium-crm';

export async function seed() {
  console.log('\n[Seed] Agregando datos de prueba a tabla Mesas...');
  
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(WORKSPACE_ID));
    
    // Buscar la tabla Mesas
    const allDocs = await workspaceDb.list({ include_docs: true });
    const mesasTable = allDocs.rows.find(r => r.doc?.name === 'Mesas' && r.doc?.headers);
    
    if (!mesasTable) {
      console.log('❌ Tabla Mesas no encontrada. Creándola...');
      
      // Crear la tabla Mesas
      const { v4: uuidv4 } = await import('uuid');
      const mesasTableId = uuidv4();
      const mesasTableDoc = {
        _id: mesasTableId,
        name: 'Mesas',
        type: 'resources',
        displayField: 'numero',
        description: 'Gestión de mesas del restaurante',
        permissions: {
          allowQuery: true,
          allowCreate: true,
          allowUpdate: true,
          allowDelete: true
        },
        headers: [
          { key: 'numero', label: 'Número de Mesa', type: 'number', required: true, emoji: '🪑', priority: 1 },
          { key: 'capacidad', label: 'Capacidad', type: 'number', required: true, emoji: '👥', priority: 2, validation: { min: 1, max: 20 } },
          { key: 'zona', label: 'Zona', type: 'select', required: true, emoji: '📍', priority: 3, options: ['Interior', 'Terraza', 'VIP', 'Barra'] },
          { key: 'estado', label: 'Estado', type: 'select', required: true, emoji: '📊', priority: 4, options: ['disponible', 'reservada', 'ocupada'], defaultValue: 'disponible' },
          { key: 'cliente', label: 'Cliente', type: 'text', required: true, emoji: '👤', priority: 5 },
          { key: 'fecha_hora', label: 'Fecha y Hora', type: 'text', required: true, emoji: '📅', priority: 6 },
          { key: 'notas', label: 'Notas', type: 'text', required: true, emoji: '📝' }
        ],
        createdAt: new Date().toISOString()
      };
      await workspaceDb.insert(mesasTableDoc);
      console.log('✅ Tabla Mesas creada');
      
      // Usar el ID de la tabla recién creada
      var tableId = mesasTableId;
      var tableDoc = mesasTableDoc;
    } else {
      console.log('✅ Tabla Mesas encontrada:', mesasTable.id);
      var tableId = mesasTable.id;
      var tableDoc = mesasTable.doc;
      
      // Verificar si la tabla tiene todos los campos necesarios
      const existingKeys = tableDoc.headers?.map(h => h.key) || [];
      const missingHeaders = [];
      
      // Hacer todos los campos obligatorios
      let needsUpdate = false;
      tableDoc.headers = tableDoc.headers.map(h => {
        if (!h.required) {
          needsUpdate = true;
          return { ...h, required: true };
        }
        return h;
      });
      
      if (!existingKeys.includes('capacidad')) {
        missingHeaders.push({ key: 'capacidad', label: 'Capacidad', type: 'number', required: true, emoji: '👥', priority: 2, validation: { min: 1, max: 20 } });
      }
      if (!existingKeys.includes('zona')) {
        missingHeaders.push({ key: 'zona', label: 'Zona', type: 'select', required: true, emoji: '📍', priority: 3, options: ['Interior', 'Terraza', 'VIP', 'Barra'] });
      }
      if (!existingKeys.includes('fecha_hora')) {
        missingHeaders.push({ key: 'fecha_hora', label: 'Fecha y Hora', type: 'text', required: true, emoji: '📅', priority: 6 });
        // Remover campo 'hora' antiguo si existe
        if (existingKeys.includes('hora')) {
          tableDoc.headers = tableDoc.headers.filter(h => h.key !== 'hora');
          console.log('  🔄 Reemplazando campo "hora" por "fecha_hora"');
        }
      }
      
      // Agregar headers faltantes o actualizar si hay cambios
      if (missingHeaders.length > 0 || needsUpdate) {
        if (missingHeaders.length > 0) {
          console.log(`  ➕ Agregando campos faltantes: ${missingHeaders.map(h => h.key).join(', ')}`);
          tableDoc.headers = [...tableDoc.headers, ...missingHeaders];
        }
        if (needsUpdate) {
          console.log('  ✅ Todos los campos ahora son obligatorios');
        }
        await workspaceDb.insert(tableDoc);
        console.log('  ✅ Tabla actualizada');
      }
      
      // Mostrar las opciones del campo estado para debug
      const estadoHeader = tableDoc.headers?.find(h => h.key === 'estado');
      if (estadoHeader) {
        console.log('  📋 Opciones de estado:', estadoHeader.options);
      }
    }
    
    // Conectar a la DB de datos de la tabla
    const tableDataDb = await connectDB(getTableDataDbName(WORKSPACE_ID, tableId));
    
    // Verificar qué opciones tiene el campo estado (para usar las correctas)
    const estadoHeader = tableDoc.headers?.find(h => h.key === 'estado');
    const estadoOpciones = estadoHeader?.options || ['disponible', 'reservada', 'ocupada'];
    console.log('  📋 Usando opciones de estado:', estadoOpciones);
    
    // Limpiar datos existentes primero
    const existingData = await tableDataDb.list({ include_docs: true });
    if (existingData.rows.length > 0) {
      console.log(`  🗑️ Limpiando ${existingData.rows.length} registros existentes...`);
      for (const row of existingData.rows) {
        if (row.doc && !row.id.startsWith('_design')) {
          try {
            await tableDataDb.destroy(row.id, row.doc._rev);
          } catch (e) {}
        }
      }
    }
    
    // Mapear estados al formato correcto de la tabla
    const mapEstado = (estado) => {
      const lower = estado.toLowerCase();
      return estadoOpciones.find(o => o.toLowerCase() === lower) || estadoOpciones[0];
    };
    
    // Datos de prueba para las mesas con fechas en formato 12 horas
    const hoy = new Date();
    const formatDate = (h, m, addDays = 0) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + addDays);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const mins = m.toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hour12}:${mins} ${ampm}`;
    };
    
    const mesasData = [
      { numero: 1, capacidad: 2, zona: 'Interior', estado: mapEstado('disponible'), cliente: 'Sin reserva', fecha_hora: formatDate(10, 0), notas: 'Mesa para parejas' },
      { numero: 2, capacidad: 4, zona: 'Interior', estado: mapEstado('reservada'), cliente: 'Carlos García', fecha_hora: formatDate(14, 0), notas: 'Cumpleaños de Ana' },
      { numero: 3, capacidad: 4, zona: 'Interior', estado: mapEstado('ocupada'), cliente: 'María Martínez', fecha_hora: formatDate(13, 30), notas: 'Almuerzo de trabajo' },
      { numero: 4, capacidad: 6, zona: 'Interior', estado: mapEstado('disponible'), cliente: 'Sin reserva', fecha_hora: formatDate(11, 0), notas: 'Mesa familiar grande' },
      { numero: 5, capacidad: 2, zona: 'Terraza', estado: mapEstado('disponible'), cliente: 'Sin reserva', fecha_hora: formatDate(9, 30), notas: 'Vista al jardín' },
      { numero: 6, capacidad: 4, zona: 'Terraza', estado: mapEstado('reservada'), cliente: 'Roberto López', fecha_hora: formatDate(20, 0), notas: 'Cena romántica aniversario' },
      { numero: 7, capacidad: 4, zona: 'Terraza', estado: mapEstado('ocupada'), cliente: 'Familia Ruiz', fecha_hora: formatDate(13, 0), notas: 'Celebración familiar' },
      { numero: 8, capacidad: 8, zona: 'VIP', estado: mapEstado('reservada'), cliente: 'Empresa Rodríguez SA', fecha_hora: formatDate(19, 0), notas: 'Evento empresarial corporativo' },
      { numero: 9, capacidad: 10, zona: 'VIP', estado: mapEstado('disponible'), cliente: 'Sin reserva', fecha_hora: formatDate(12, 0), notas: 'Salón privado disponible' },
      { numero: 10, capacidad: 2, zona: 'Barra', estado: mapEstado('ocupada'), cliente: 'Pedro Sánchez', fecha_hora: formatDate(12, 0), notas: 'Cliente frecuente' },
      { numero: 11, capacidad: 2, zona: 'Barra', estado: mapEstado('disponible'), cliente: 'Sin reserva', fecha_hora: formatDate(10, 30), notas: 'Junto a la entrada' },
      { numero: 12, capacidad: 4, zona: 'Interior', estado: mapEstado('ocupada'), cliente: 'Familia Gómez', fecha_hora: formatDate(13, 0), notas: 'Mesa con silla para niños' },
    ];
    
    // Insertar los datos
    const { v4: uuidv4 } = await import('uuid');
    for (const mesa of mesasData) {
      await tableDataDb.insert({
        _id: uuidv4(),
        ...mesa,
        tableId: tableId,
        workspaceId: WORKSPACE_ID,
        createdAt: new Date().toISOString()
      });
    }
    
    console.log(`✅ ${mesasData.length} mesas agregadas exitosamente`);
    
  } catch (error) {
    console.error('❌ Error en seed de Mesas:', error.message);
    throw error;
  }
}

// Ejecutar directamente si se llama como script
if (process.argv[1]?.includes('mesas-data')) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}
