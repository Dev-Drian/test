/**
 * EJEMPLOS DE USO - Sistema Dinámico
 * 
 * Demostraciones prácticas de cómo usar el nuevo EntityRepository
 * y las mejoras de validación.
 */

// ============================================
// 1. CREAR REGISTROS CON VALIDACIÓN
// ============================================

import { EntityRepository } from './repositories/EntityRepository.js';

const entityRepo = new EntityRepository();

// Ejemplo 1: Crear cita en veterinaria
async function crearCitaVeterinaria(workspaceId, tableId) {
  const result = await entityRepo.create(workspaceId, tableId, {
    mascota: 'Luna',
    fecha: '2026-02-15',
    hora: '10:00',
    propietario: 'María García',
    telefono: '3001234567',  // Se valida automáticamente (10 dígitos)
    servicio: 'Vacunación',
  }, {
    validate: true,      // Valida campos requeridos y formatos
    normalize: true,     // Normaliza teléfono a solo dígitos
    applyDefaults: true, // Aplica estado='Pendiente' si está configurado
  });
  
  if (result.success) {
    console.log('✅ Cita creada:', result.record);
    // Output: { _id, mascota, fecha, hora, propietario, telefono: "3001234567", ... }
  } else {
    console.error('❌ Errores de validación:');
    result.errors.forEach(err => {
      console.error(`  - ${err.field}: ${err.message}`);
    });
    // Output:
    // - telefono: El teléfono debe tener 10 dígitos
    // - email: Email inválido
  }
}

// Ejemplo 2: Crear reserva en restaurante
async function crearReservaRestaurante(workspaceId, tableId) {
  const result = await entityRepo.create(workspaceId, tableId, {
    cliente: 'Pedro López',
    telefono: '300-123-4567',  // Se normaliza a "3001234567"
    fecha: '2026-02-20',
    hora: '19:00',
    personas: 4,
    mesa: 'Terraza 2',
  }, {
    validate: true,
    normalize: true,
    applyDefaults: true,
  });
  
  return result;
}

// Ejemplo 3: Intentar crear con datos inválidos
async function ejemploValidacion(workspaceId, tableId) {
  const result = await entityRepo.create(workspaceId, tableId, {
    cliente: 'Ana',
    telefono: '123',           // ❌ Inválido: menos de 10 dígitos
    email: 'ana@invalido',     // ❌ Inválido: formato de email
    fecha: '2026/02/15',       // ❌ Inválido: formato debe ser YYYY-MM-DD
    hora: '25:00',             // ❌ Inválido: hora no válida
  }, {
    validate: true,
  });
  
  console.log('Errores:', result.errors);
  // Output:
  // [
  //   { field: 'telefono', message: 'El teléfono debe tener 10 dígitos' },
  //   { field: 'email', message: 'Email inválido' },
  //   { field: 'fecha', message: 'Formato de fecha inválido (use YYYY-MM-DD)' },
  //   { field: 'hora', message: 'Formato de hora inválido (use HH:MM)' }
  // ]
}

// ============================================
// 2. ACTUALIZAR REGISTROS
// ============================================

async function actualizarTelefono(workspaceId, tableId, recordId) {
  const result = await entityRepo.update(workspaceId, tableId, recordId, {
    telefono: '3009876543',  // Se valida y normaliza
  }, {
    validate: true,
    normalize: true,
  });
  
  if (result.success) {
    console.log('✅ Teléfono actualizado');
  } else {
    console.error('❌ Error:', result.errors);
  }
}

// ============================================
// 3. BUSCAR REGISTROS
// ============================================

// Búsqueda exacta
async function buscarCitasPorFecha(workspaceId, tableId) {
  const records = await entityRepo.findBy(workspaceId, tableId, {
    fecha: '2026-02-15',
    estado: 'Confirmada',
  });
  
  console.log(`Encontradas ${records.length} citas`);
  return records;
}

// Búsqueda fuzzy (case-insensitive, con regex)
async function buscarClientePorNombre(workspaceId, tableId, nombre) {
  const records = await entityRepo.findBy(workspaceId, tableId, {
    cliente: nombre,  // Buscará "maria", "María", "MARIA", etc.
  }, {
    fuzzy: true,
    limit: 10,
  });
  
  return records;
}

// Buscar UN solo registro
async function buscarCitaPorMascota(workspaceId, tableId, mascota) {
  const record = await entityRepo.findOneBy(workspaceId, tableId, {
    mascota: mascota,
    fecha: '2026-02-15',
  });
  
  if (record) {
    console.log('Cita encontrada:', record);
  } else {
    console.log('No se encontró la cita');
  }
  
  return record;
}

// ============================================
// 4. VALIDAR ANTES DE GUARDAR
// ============================================

async function validarDatosAntesDeSave(workspaceId, tableId, data) {
  // Obtener campos requeridos de la tabla
  const tableRepo = new TableRepository();
  const requiredFields = await tableRepo.getRequiredFields(workspaceId, tableId);
  
  // Verificar qué campos faltan
  const missing = entityRepo.getMissingFields(data, requiredFields);
  
  if (missing.length > 0) {
    console.log('⚠️ Faltan campos:', missing);
    return false;
  }
  
  // Verificar si está completo
  const isComplete = entityRepo.isComplete(data, requiredFields);
  console.log('¿Datos completos?', isComplete);
  
  return isComplete;
}

// ============================================
// 5. FORMATEAR PARA MOSTRAR AL USUARIO
// ============================================

async function formatearRegistroParaUsuario(workspaceId, tableId, record) {
  const formatted = await entityRepo.formatRecord(workspaceId, tableId, record);
  
  console.log(formatted);
  // Output:
  // 🐾 **Mascota:** Luna
  // 📅 **Fecha:** viernes 15 de febrero
  // 🕐 **Hora:** 10:00 AM
  // 👤 **Propietario:** María García
  // 📱 **Teléfono:** 3001234567
  // 🩺 **Servicio:** Vacunación
  
  return formatted;
}

// ============================================
// 6. VERIFICAR CAMPOS FALTANTES EN FLUJO
// ============================================

async function flujoRecoleccionCampos(workspaceId, tableId, collectedData) {
  const tableRepo = new TableRepository();
  const requiredFields = await tableRepo.getRequiredFields(workspaceId, tableId);
  
  // Paso 1: ¿Qué campos faltan?
  const missing = entityRepo.getMissingFields(collectedData, requiredFields);
  
  if (missing.length === 0) {
    // Todos los campos completos, crear registro
    const result = await entityRepo.create(workspaceId, tableId, collectedData, {
      validate: true,
      normalize: true,
      applyDefaults: true,
    });
    
    if (result.success) {
      return { status: 'created', record: result.record };
    } else {
      return { status: 'validation_error', errors: result.errors };
    }
  } else {
    // Faltan campos, pedir el siguiente
    const nextField = missing[0];
    const fieldsConfig = await tableRepo.getFieldsConfig(workspaceId, tableId);
    const fieldConfig = fieldsConfig.find(f => f.key === nextField);
    
    return {
      status: 'missing_fields',
      missing: missing,
      nextField: nextField,
      askMessage: fieldConfig?.askMessage || `¿Cuál es el ${fieldConfig?.label || nextField}?`,
    };
  }
}

// ============================================
// 7. INTEGRACIÓN CON CONTEXT (ChatService)
// ============================================

async function ejemploIntegracionContext(context) {
  // En CreateHandler, al fusionar campos
  const mergeResult = context.mergeFields({
    telefono: '300-123-4567',  // Se validará y normalizará
    email: 'juan@example.com',
  }, {
    validate: true,
    normalize: true,
  });
  
  console.log('Aceptados:', mergeResult.accepted);
  // Output: ['telefono', 'email']
  
  console.log('Rechazados:', mergeResult.rejected);
  // Output: []
  
  // Si hay rechazados:
  if (mergeResult.rejected.length > 0) {
    const firstRejected = mergeResult.rejected[0];
    console.log(`Campo ${firstRejected.key} rechazado: ${firstRejected.reason}`);
    // Pedir de nuevo al usuario
  }
  
  // Verificar si está completo
  if (context.isComplete()) {
    // Crear el registro usando EntityRepository
    const entityRepo = new EntityRepository();
    const result = await entityRepo.create(
      context.workspaceId,
      context.pendingCreate.tableId,
      context.collectedFields,
      {
        validate: true,
        normalize: true,
        applyDefaults: true,
      }
    );
    
    if (result.success) {
      console.log('✅ Registro creado con éxito');
      context.clearPendingCreate();
    } else {
      console.error('❌ Errores:', result.errors);
      // Mostrar al usuario qué campos tienen error
    }
  }
}

// ============================================
// 8. MANEJO DE ERRORES ESPECÍFICOS
// ============================================

async function manejarErroresValidacion(workspaceId, tableId, data) {
  const result = await entityRepo.create(workspaceId, tableId, data, {
    validate: true,
  });
  
  if (!result.success) {
    // Agrupar errores por tipo
    const phoneErrors = result.errors.filter(e => e.field.includes('telefono'));
    const emailErrors = result.errors.filter(e => e.field.includes('email'));
    const dateErrors = result.errors.filter(e => e.field.includes('fecha'));
    
    if (phoneErrors.length > 0) {
      console.log('⚠️ Teléfonos inválidos:');
      phoneErrors.forEach(e => console.log(`  - ${e.message}`));
    }
    
    if (emailErrors.length > 0) {
      console.log('⚠️ Emails inválidos:');
      emailErrors.forEach(e => console.log(`  - ${e.message}`));
    }
    
    if (dateErrors.length > 0) {
      console.log('⚠️ Fechas inválidas:');
      dateErrors.forEach(e => console.log(`  - ${e.message}`));
    }
    
    // Generar mensaje para el usuario
    const mensaje = `❌ Hay ${result.errors.length} error(es):\n` +
      result.errors.map(e => `• ${e.field}: ${e.message}`).join('\n');
    
    return mensaje;
  }
}

// ============================================
// 9. ESTADÍSTICAS Y METADATOS
// ============================================

async function obtenerEstadisticasTabla(workspaceId, tableId) {
  const tableRepo = new TableRepository();
  
  // Stats generales
  const stats = await tableRepo.getStats(workspaceId, tableId);
  console.log('Estadísticas:', stats);
  // Output:
  // {
  //   tableId: "...",
  //   tableName: "Citas",
  //   totalRecords: 45,
  //   fieldCount: 8,
  //   requiredFields: 5
  // }
  
  // Verificar que existe
  const exists = await tableRepo.exists(workspaceId, tableId);
  console.log('Tabla existe:', exists);
  
  // Obtener opciones de un campo
  const servicios = await tableRepo.getFieldOptions(workspaceId, tableId, 'servicio');
  console.log('Servicios disponibles:', servicios);
  // Output: ['Vacunación', 'Consulta', 'Cirugía', ...]
}

// ============================================
// 10. EJEMPLO COMPLETO: FLUJO DE CREACIÓN
// ============================================

async function flujoCompletoCreacion(workspaceId, tableId) {
  const entityRepo = new EntityRepository();
  const tableRepo = new TableRepository();
  
  // 1. Obtener configuración de la tabla
  const fieldsConfig = await tableRepo.getFieldsConfig(workspaceId, tableId);
  const requiredFields = fieldsConfig.filter(f => f.required).map(f => f.key);
  
  console.log('Campos requeridos:', requiredFields);
  
  // 2. Recolectar datos del usuario (simulado)
  const userData = {
    mascota: 'Max',
    fecha: '2026-02-15',
    hora: '14:00',
    propietario: 'Carlos Ruiz',
    telefono: '300 987 6543',  // Con espacios, se normalizará
  };
  
  // 3. Validar campos faltantes
  const missing = entityRepo.getMissingFields(userData, requiredFields);
  
  if (missing.length > 0) {
    console.log(`Faltan ${missing.length} campos:`, missing);
    // Aquí pedirías los campos faltantes al usuario
    return;
  }
  
  // 4. Crear el registro con validación completa
  const result = await entityRepo.create(workspaceId, tableId, userData, {
    validate: true,      // Valida todos los campos
    normalize: true,     // telefono: "300 987 6543" → "3009876543"
    applyDefaults: true, // Aplica estado='Pendiente', etc.
  });
  
  // 5. Manejar resultado
  if (result.success) {
    console.log('✅ Registro creado con éxito');
    
    // Formatear para mostrar al usuario
    const formatted = await entityRepo.formatRecord(workspaceId, tableId, result.record);
    console.log('\n' + formatted);
    
    return result.record;
  } else {
    console.error('❌ Error al crear:');
    result.errors.forEach(err => {
      console.error(`  ${err.field}: ${err.message}`);
    });
    
    return null;
  }
}

// ============================================
// EXPORTAR EJEMPLOS
// ============================================

export {
  crearCitaVeterinaria,
  crearReservaRestaurante,
  ejemploValidacion,
  actualizarTelefono,
  buscarCitasPorFecha,
  buscarClientePorNombre,
  buscarCitaPorMascota,
  validarDatosAntesDeSave,
  formatearRegistroParaUsuario,
  flujoRecoleccionCampos,
  ejemploIntegracionContext,
  manejarErroresValidacion,
  obtenerEstadisticasTabla,
  flujoCompletoCreacion,
};
