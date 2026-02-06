import { v4 as uuidv4 } from "uuid";
import { connectDB, getTableDataDbName } from "../config/db.js";

/**
 * Ejecuta consulta sobre tabla (query/search)
 */
export async function runQuery(workspaceId, tableId, options = {}) {
  const db = await connectDB(getTableDataDbName(workspaceId, tableId));
  const { sortBy, sortOrder = "desc", limit = 10, filters = {} } = options;
  const selector = { main: { $ne: true } };
  Object.assign(selector, filters);

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
    selector: { main: { $ne: true }, ...searchCriteria },
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
    selector: { main: { $ne: true } },
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
    selector: { main: { $ne: true } },
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
      selector: { main: { $ne: true } },
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
  
  // Obtener veterinarios activos
  const vetsDb = await connectDB(getTableDataDbName(workspaceId, veterinariosTableId));
  const vetsResult = await vetsDb.find({
    selector: { main: { $ne: true } },
    limit: 50,
  });
  const veterinarios = (vetsResult.docs || []).filter(v => v.activo === "Sí");
  
  // Obtener citas del día
  const citasDb = await connectDB(getTableDataDbName(workspaceId, citasTableId));
  const citasResult = await citasDb.find({
    selector: { main: { $ne: true } },
    limit: 200,
  });
  const citasDelDia = (citasResult.docs || []).filter(c => 
    c.fecha === fecha && c.estado !== "Cancelada"
  );
  
  // Buscar veterinario que ofrezca el servicio y esté libre
  for (const vet of veterinarios) {
    // ¿Ofrece el servicio?
    if (servicio && vet.servicios) {
      const serviciosVet = vet.servicios.toLowerCase();
      const servicioKey = servicio.toLowerCase().split(' ')[0]; // "Consulta general" → "consulta"
      if (!serviciosVet.includes(servicioKey)) continue;
    }
    
    // ¿Está libre a esa hora?
    const tieneConflicto = citasDelDia.some(c => 
      c.veterinario === vet.nombre && c.hora === hora
    );
    
    if (!tieneConflicto) {
      return vet.nombre;
    }
  }
  
  return null; // No hay veterinario disponible
}
