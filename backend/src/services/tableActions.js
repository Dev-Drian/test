import { v4 as uuidv4 } from "uuid";
import { connectDB, getTableDataDbName } from "../config/db.js";

// Selector base para excluir documento de metadatos
// CouchDB: $ne no funciona con campos que no existen, usar $or
const NON_META_SELECTOR = {
  $or: [
    { main: { $exists: false } },
    { main: { $eq: false } },
    { main: { $type: "null" } }
  ]
};

/**
 * Ejecuta consulta sobre tabla (query/search)
 * Excluye el documento de metadatos (main: true)
 */
export async function runQuery(workspaceId, tableId, options = {}) {
  const db = await connectDB(getTableDataDbName(workspaceId, tableId));
  const { sortBy, sortOrder = "desc", limit = 10, filters = {} } = options;
  
  // Combinar con filtros adicionales usando $and si hay filtros
  let selector;
  if (Object.keys(filters).length > 0) {
    selector = { $and: [NON_META_SELECTOR, filters] };
  } else {
    selector = NON_META_SELECTOR;
  }

  const sort = sortBy ? [{ [sortBy]: sortOrder }] : [];
  const result = await db.find({
    selector,
    limit: Math.min(Number(limit) || 10, 100),
    sort: sort.length ? sort : undefined,
  });
  return result.docs || [];
}

/**
 * Crea registro en tabla
 */
export async function runCreate(workspaceId, tableId, fields) {
  const db = await connectDB(getTableDataDbName(workspaceId, tableId));
  const doc = {
    _id: uuidv4(),
    ...fields,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.insert(doc);
  return doc;
}

/**
 * Actualiza registro(s) por criterio simple
 */
export async function runUpdate(workspaceId, tableId, searchCriteria, fieldsToUpdate) {
  const db = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await db.find({
    selector: { $and: [NON_META_SELECTOR, searchCriteria] },
    limit: 1,
  });
  if (!result.docs?.length) return null;
  const doc = result.docs[0];
  const updated = {
    ...doc,
    ...fieldsToUpdate,
    updatedAt: new Date().toISOString(),
  };
  await db.insert(updated);
  return updated;
}

/**
 * Análisis simple: count, o sum/avg si el campo existe
 */
export async function runAnalyze(workspaceId, tableId, operation, field) {
  const db = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await db.find({
    selector: NON_META_SELECTOR,
    limit: 5000,
  });
  const docs = result.docs || [];
  if (operation === "count") return docs.length;
  if (operation === "sum" && field) {
    return docs.reduce((acc, d) => acc + (Number(d[field]) || 0), 0);
  }
  if (operation === "avg" && field) {
    const sum = docs.reduce((acc, d) => acc + (Number(d[field]) || 0), 0);
    return docs.length ? sum / docs.length : 0;
  }
  return null;
}

/**
 * Consulta de disponibilidad: busca horarios libres para una fecha
 * @param {string} workspaceId - ID del workspace
 * @param {string} citasTableId - ID de la tabla de citas
 * @param {string} veterinariosTableId - ID de la tabla de veterinarios (opcional)
 * @param {object} options - { fecha, servicio, veterinario }
 * @returns {object} - { disponible, horariosOcupados, horariosLibres, veterinariosDisponibles }
 */
export async function checkAvailability(workspaceId, citasTableId, veterinariosTableId, options = {}) {
  const { fecha, servicio, veterinario } = options;
  
  // 1. Obtener citas del día (excluyendo canceladas)
  const citasDb = await connectDB(getTableDataDbName(workspaceId, citasTableId));
  const citasResult = await citasDb.find({
    selector: NON_META_SELECTOR,
    limit: 200,
  });
  
  const citasDelDia = (citasResult.docs || []).filter(c => {
    if (c.fecha !== fecha) return false;
    if (c.estado === "Cancelada") return false;
    return true;
  });
  
  // Horarios ocupados por veterinario
  const ocupadosPorVet = {};
  citasDelDia.forEach(c => {
    const vet = c.veterinario || "Sin asignar";
    if (!ocupadosPorVet[vet]) ocupadosPorVet[vet] = [];
    ocupadosPorVet[vet].push(c.hora);
  });
  
  // 2. Obtener veterinarios si hay tabla
  let veterinarios = [];
  if (veterinariosTableId) {
    const vetsDb = await connectDB(getTableDataDbName(workspaceId, veterinariosTableId));
    const vetsResult = await vetsDb.find({
      selector: NON_META_SELECTOR,
      limit: 50,
    });
    veterinarios = (vetsResult.docs || []).filter(v => v.activo === "Sí");
  }
  
  // 3. Generar horarios estándar (9:00 - 18:00, cada 30 min)
  const horariosBase = [];
  for (let h = 9; h < 18; h++) {
    horariosBase.push(`${String(h).padStart(2, '0')}:00`);
    horariosBase.push(`${String(h).padStart(2, '0')}:30`);
  }
  
  // 4. Calcular disponibilidad por veterinario
  const disponibilidadPorVet = {};
  
  if (veterinarios.length > 0) {
    veterinarios.forEach(vet => {
      // Filtrar por servicio si se especificó
      if (servicio && vet.servicios) {
        const serviciosVet = vet.servicios.toLowerCase();
        if (!serviciosVet.includes(servicio.toLowerCase().split(' ')[0])) {
          return; // Este vet no ofrece el servicio
        }
      }
      
      const ocupados = ocupadosPorVet[vet.nombre] || [];
      const libres = horariosBase.filter(h => !ocupados.includes(h));
      
      disponibilidadPorVet[vet.nombre] = {
        especialidad: vet.especialidad,
        servicios: vet.servicios,
        horarioInicio: vet.horarioInicio,
        horarioFin: vet.horarioFin,
        ocupados,
        libres,
      };
    });
  } else {
    // Sin tabla de veterinarios, calcular genérico
    const ocupadosGeneral = citasDelDia.map(c => c.hora);
    const libresGeneral = horariosBase.filter(h => !ocupadosGeneral.includes(h));
    disponibilidadPorVet["General"] = {
      ocupados: ocupadosGeneral,
      libres: libresGeneral,
    };
  }
  
  // 5. Construir resumen
  const resumen = {
    fecha,
    totalCitas: citasDelDia.length,
    veterinariosDisponibles: Object.keys(disponibilidadPorVet),
    disponibilidad: disponibilidadPorVet,
    horarioAtencion: "Lunes a Viernes de 9:00 a 18:00",
  };
  
  return resumen;
}

/**
 * Encuentra el mejor veterinario disponible para un servicio en fecha/hora
 */
export async function findBestVeterinarian(workspaceId, veterinariosTableId, citasTableId, options = {}) {
  const { fecha, hora, servicio } = options;
  
  if (!veterinariosTableId) return null;
  
  try {
    // Obtener veterinarios activos
    const vetsDb = await connectDB(getTableDataDbName(workspaceId, veterinariosTableId));
    const vetsResult = await vetsDb.find({
      selector: NON_META_SELECTOR,
      limit: 50,
    });
    // Más flexible con el campo activo (Sí, sí, Si, si, true, 1)
    const veterinarios = (vetsResult.docs || []).filter(v => {
      const activo = String(v.activo || '').toLowerCase();
      return activo === 'sí' || activo === 'si' || activo === 'true' || activo === '1' || v.activo === true;
    });
    
    if (veterinarios.length === 0) {
      // Si no hay filtro activo, usar todos los veterinarios
      const allVets = vetsResult.docs || [];
      if (allVets.length > 0) {
        return allVets[0].nombre; // Retornar el primero disponible
      }
      return null;
    }
    
    // Normalizar hora a formato 24h para comparación
    function normalizarHora(h) {
      if (!h) return null;
      const hStr = String(h).toLowerCase().trim();
      // Ya es formato 24h
      const match24 = hStr.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) return `${match24[1].padStart(2, '0')}:${match24[2]}`;
      // Formato 12h con AM/PM
      const match12 = hStr.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
      if (match12) {
        let hours = parseInt(match12[1], 10);
        const mins = match12[2] || '00';
        const period = (match12[3] || '').toLowerCase().replace('.', '');
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${mins}`;
      }
      return hStr;
    }
    
    const horaTarget = normalizarHora(hora);
    
    // Obtener citas del día
    const citasDb = await connectDB(getTableDataDbName(workspaceId, citasTableId));
    const citasResult = await citasDb.find({
      selector: NON_META_SELECTOR,
      limit: 200,
    });
    const citasDelDia = (citasResult.docs || []).filter(c => 
      c.fecha === fecha && c.estado !== "Cancelada"
    );
    
    // Buscar veterinario que ofrezca el servicio y esté libre
    for (const vet of veterinarios) {
      // ¿Ofrece el servicio? (ser flexible con la búsqueda)
      if (servicio && vet.servicios) {
        const serviciosVet = String(vet.servicios).toLowerCase();
        const servicioLower = servicio.toLowerCase();
        // Buscar cualquier palabra del servicio
        const palabrasServicio = servicioLower.split(/\s+/).filter(p => p.length > 2);
        const encontro = palabrasServicio.some(p => serviciosVet.includes(p)) || 
                        serviciosVet.includes(servicioLower);
        if (!encontro) continue;
      }
      
      // ¿Está libre a esa hora?
      const tieneConflicto = citasDelDia.some(c => {
        const horaC = normalizarHora(c.hora);
        return c.veterinario === vet.nombre && horaC === horaTarget;
      });
      
      if (!tieneConflicto) {
        return vet.nombre;
      }
    }
    
    // Si todos tienen conflicto, retornar el primero (mejor que nada)
    return veterinarios[0]?.nombre || null;
  } catch (err) {
    console.error("findBestVeterinarian error:", err.message);
    return null;
  }
}
