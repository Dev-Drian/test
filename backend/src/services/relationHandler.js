import { v4 as uuidv4 } from "uuid";
import { connectDB, getWorkspaceDbName, getTableDataDbName } from "../config/db.js";

/**
 * Convierte hora de formato 24h a 12h con AM/PM
 */
function formatTo12Hour(time24) {
  if (!time24 || typeof time24 !== 'string') return time24;
  const match = time24.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time24;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Genera mensaje amigable para pedir campos faltantes de un registro relacionado
 * Ahora incluye opciones disponibles si el campo es de tipo select o tiene relación
 */
function generateFriendlyMissingFieldsMessage(entityName, tableName, missingFields) {
  // Si solo falta un campo, generar pregunta específica
  if (missingFields.length === 1) {
    const field = missingFields[0];
    return generateFieldQuestion(entityName, field);
  }
  
  // Si faltan varios, preguntar el primero y mencionar los otros
  const firstField = missingFields[0];
  const question = generateFieldQuestion(entityName, firstField);
  
  // Mencionar que también necesitamos los otros
  const otherFields = missingFields.slice(1).map(f => f.label.toLowerCase()).join(', ');
  return `${question}\n(También necesito: ${otherFields})`;
}

/**
 * Genera una pregunta natural para un campo específico
 * Incluye opciones si están disponibles
 */
function generateFieldQuestion(entityName, field) {
  const { key, label, type, options } = field;
  
  // Preguntas naturales por campo conocido
  const naturalQuestions = {
    especie: `¿Qué tipo de mascota es ${entityName}?`,
    propietario: `¿Quién es el dueño de ${entityName}?`,
    telefono: `¿Cuál es el teléfono de contacto para ${entityName}?`,
    raza: `¿De qué raza es ${entityName}?`,
    edad: `¿Cuántos años tiene ${entityName}?`,
  };
  
  let question = naturalQuestions[key] || `¿Cuál es ${label.toLowerCase()} de ${entityName}?`;
  
  // Si tiene opciones (tipo select), mostrarlas
  if (type === 'select' && options && options.length > 0) {
    const optionsStr = options.slice(0, 5).join(', ');
    const moreStr = options.length > 5 ? ` (+${options.length - 5} más)` : '';
    question += `\nOpciones: ${optionsStr}${moreStr}`;
  }
  
  return question;
}

/**
 * Busca una tabla por nombre dentro del workspace
 * CouchDB no soporta $regex con flags, así que hacemos búsqueda manual
 */
async function findTableByName(workspaceId, tableName) {
  const tablesDb = await connectDB(getWorkspaceDbName(workspaceId));
  const result = await tablesDb.find({
    selector: {},
    limit: 100,
  });
  const tables = result.docs || [];
  const searchLower = tableName.toLowerCase();
  
  // Primero buscar coincidencia exacta, luego parcial
  return tables.find(t => t.name && t.name.toLowerCase() === searchLower) 
    || tables.find(t => t.name && t.name.toLowerCase().includes(searchLower))
    || null;
}

/**
 * Obtiene los metadatos de una tabla
 */
async function getTableMeta(workspaceId, tableId) {
  const tablesDb = await connectDB(getWorkspaceDbName(workspaceId));
  return await tablesDb.get(tableId).catch(() => null);
}

/**
 * Obtiene los campos requeridos de una tabla relacionada
 * Incluye el defaultValue si existe, y options si es un select
 */
async function getRequiredFieldsForRelatedTable(workspaceId, tableId) {
  const tableMeta = await getTableMeta(workspaceId, tableId);
  if (!tableMeta?.headers) return [];
  
  return tableMeta.headers
    .filter(h => h.required === true)
    .map(h => ({ 
      key: h.key, 
      label: h.label || h.key,
      defaultValue: h.defaultValue, // Para auto-aplicar si existe
      type: h.type,                 // Para saber si es select
      options: h.options,           // Opciones disponibles si es select
      relation: h.relation,         // Si tiene relación con otra tabla
    }));
}

/**
 * Verifica unicidad/disponibilidad basado en la configuración de la tabla
 * La tabla puede tener uniqueConstraint: { fields: ["fecha", "hora"], excludeWhen: { estado: "Cancelada" } }
 */
async function checkUniqueConstraint(workspaceId, tableId, tableMeta, fields) {
  const constraint = tableMeta?.uniqueConstraint;
  if (!constraint || !constraint.fields || constraint.fields.length === 0) {
    return { valid: true };
  }
  
  // Verificar que tenemos todos los campos necesarios para validar
  const hasAllFields = constraint.fields.every(f => fields[f] !== undefined && fields[f] !== null);
  if (!hasAllFields) {
    return { valid: true }; // No podemos validar aún, faltan campos
  }
  
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await dataDb.find({
    selector: {
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 500,
  });
  
  const docs = result.docs || [];
  
  // Buscar conflicto
  const conflict = docs.find(doc => {
    // Si tiene excludeWhen, verificar si este doc debe ser excluido
    if (constraint.excludeWhen) {
      const shouldExclude = Object.entries(constraint.excludeWhen).every(([key, val]) => {
        return doc[key] === val;
      });
      if (shouldExclude) return false;
    }
    
    // Comparar todos los campos del constraint
    return constraint.fields.every(fieldKey => {
      const docVal = normalizeForComparison(doc[fieldKey]);
      const newVal = normalizeForComparison(fields[fieldKey]);
      return docVal === newVal;
    });
  });
  
  if (conflict) {
    const conflictDetails = constraint.fields
      .map(f => {
        let val = conflict[f];
        // Formatear hora a 12h si es campo hora
        if (f === 'hora' && val) val = formatTo12Hour(val);
        return `${f}: ${val}`;
      })
      .join(", ");
    return {
      valid: false,
      conflict: conflict,
      message: constraint.errorMessage 
        ? `${constraint.errorMessage} (${conflictDetails})`
        : `Ya existe un registro con ${conflictDetails}`,
    };
  }
  
  return { valid: true };
}

/**
 * Normaliza valores para comparación flexible (fechas, horas, texto)
 */
function normalizeForComparison(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).toLowerCase().trim();
  
  // Para horas, extraer solo el primer número
  const hourMatch = str.match(/^(\d{1,2})/);
  if (hourMatch && (str.includes(':') || str.includes('hora') || str.includes('am') || str.includes('pm'))) {
    return hourMatch[1];
  }
  
  return str;
}

/**
 * Busca un registro en una tabla por valor de campo
 */
async function findRecordInTable(workspaceId, tableId, searchField, searchValue) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  // Búsqueda case-insensitive
  const result = await dataDb.find({
    selector: {
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 100,
  });
  
  const docs = result.docs || [];
  const searchLower = String(searchValue).toLowerCase().trim();
  
  return docs.find(doc => {
    const fieldValue = doc[searchField];
    return fieldValue && String(fieldValue).toLowerCase().trim() === searchLower;
  });
}

/**
 * Obtiene todos los valores únicos de un campo en una tabla (para mostrar opciones)
 */
async function getFieldOptions(workspaceId, tableId, fieldName) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await dataDb.find({
    selector: {
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 100,
  });
  
  const docs = result.docs || [];
  const options = [...new Set(docs.map(d => d[fieldName]).filter(Boolean))];
  return options;
}

/**
 * Crea un registro en una tabla relacionada con defaults aplicados
 */
async function createRelatedRecord(workspaceId, tableId, fields) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const tableMeta = await getTableMeta(workspaceId, tableId);
  
  // Obtener defaults de la tabla
  const defaults = {};
  if (tableMeta?.headers) {
    tableMeta.headers.forEach(h => {
      if (h.defaultValue !== undefined && h.key) {
        defaults[h.key] = h.defaultValue;
      }
    });
  }
  
  const doc = {
    _id: uuidv4(),
    ...defaults,  // Defaults primero
    ...fields,    // Campos del usuario sobreescriben
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await dataDb.insert(doc);
  return doc;
}

/**
 * Procesa las relaciones de los campos antes de crear un registro
 * 
 * Retorna:
 * - success: true si todo OK y se puede crear
 * - needsMoreData: true si falta crear registro relacionado y se necesitan más datos
 * - pendingRelation: info de la relación pendiente (tabla, campos requeridos)
 * - uniqueConflict: si hay conflicto de unicidad (ej: cita en mismo horario)
 */
export async function processRelations(workspaceId, tableId, fields) {
  const tableMeta = await getTableMeta(workspaceId, tableId);
  
  if (!tableMeta?.headers) {
    return { success: true, fields, createdRelations: [], errors: [] };
  }
  
  const createdRelations = [];
  const errors = [];
  const processedFields = { ...fields };
  
  // 1. Verificar constraint de unicidad (dinámico, basado en configuración de tabla)
  const uniqueCheck = await checkUniqueConstraint(workspaceId, tableId, tableMeta, fields);
  if (!uniqueCheck.valid) {
    return {
      success: false,
      uniqueConflict: true,
      existingRecord: uniqueCheck.conflict,
      message: uniqueCheck.message,
    };
  }
  
  // 2. Procesar cada campo con relación
  for (const header of tableMeta.headers) {
    if (header.type !== "relation" || !header.relation) continue;
    
    const fieldValue = fields[header.key];
    if (!fieldValue) continue;
    
    // IMPORTANTE: Si el valor es el defaultValue del campo, no validar contra la tabla relacionada
    // Esto permite valores como "Por asignar" que no son registros reales
    if (header.defaultValue && fieldValue === header.defaultValue) {
      continue; // Saltar validación, es un valor placeholder válido
    }
    
    const { tableName, searchField, displayField, autoCreate, autoCreateFields, showOptionsOnNotFound } = header.relation;
    
    // Buscar la tabla relacionada
    const relatedTable = await findTableByName(workspaceId, tableName);
    if (!relatedTable) {
      errors.push(`No se encontró la tabla "${tableName}"`);
      continue;
    }
    
    // Buscar si existe el registro
    const mainSearchField = searchField || displayField || "nombre";
    const existingRecord = await findRecordInTable(workspaceId, relatedTable._id, mainSearchField, fieldValue);
    
    if (existingRecord) {
      // Existe, todo bien
      continue;
    }
    
    // No existe - ¿qué hacemos?
    if (autoCreate) {
      // Verificar qué campos requeridos tiene la tabla relacionada
      const requiredFields = await getRequiredFieldsForRelatedTable(workspaceId, relatedTable._id);
      const newRecordFields = {};
      
      // Campo principal (nombre de la mascota, etc.)
      newRecordFields[mainSearchField] = fieldValue;
      
      // NO aplicar defaultValues automáticamente para campos required
      // Si es required, el usuario DEBE proporcionarlo conscientemente
      
      // Intentar extraer campos adicionales del registro original
      if (autoCreateFields) {
        for (const acf of autoCreateFields) {
          if (acf !== mainSearchField && fields[acf]) {
            newRecordFields[acf] = fields[acf];
          }
        }
      }
      
      console.log("[relationHandler] autoCreate check:", {
        fieldValue,
        mainSearchField,
        autoCreateFields,
        fieldsFromOriginal: fields,
        newRecordFields,
        requiredFields: requiredFields.map(r => ({ key: r.key, options: r.options })),
      });
      
      // Verificar qué campos requeridos FALTAN (excluyendo el campo principal)
      const missingRequired = requiredFields.filter(rf => {
        if (rf.key === mainSearchField) return false; // Ya lo tenemos
        const val = newRecordFields[rf.key];
        return val === undefined || val === null || val === '';
      });
      
      if (missingRequired.length > 0) {
        // Faltan datos para crear el registro relacionado - FLUJO RECURSIVO
        return {
          success: false,
          needsMoreData: true,
          pendingRelation: {
            tableName: relatedTable.name,
            tableId: relatedTable._id,
            fieldKey: header.key,
            fieldValue: fieldValue,
            searchField: mainSearchField,
            missingFields: missingRequired,
            partialData: newRecordFields,
            originalFields: fields, // Guardar los campos originales de la cita
          },
          message: generateFriendlyMissingFieldsMessage(fieldValue, relatedTable.name, missingRequired),
        };
      }
      
      // Tenemos todos los datos, crear el registro relacionado
      try {
        const created = await createRelatedRecord(workspaceId, relatedTable._id, newRecordFields);
        createdRelations.push({
          table: relatedTable.name,
          record: created,
          field: header.key,
          value: fieldValue,
        });
      } catch (err) {
        errors.push(`Error al crear ${relatedTable.name}: ${err.message}`);
      }
    } else if (showOptionsOnNotFound) {
      // Mostrar opciones disponibles
      const options = await getFieldOptions(workspaceId, relatedTable._id, displayField || "nombre");
      return {
        success: false,
        optionRequired: true,
        field: header.key,
        fieldValue: fieldValue,
        availableOptions: options,
        message: `"${fieldValue}" no está registrado en ${relatedTable.name}. Opciones disponibles: ${options.slice(0, 6).join(', ')}`,
      };
    } else {
      errors.push(`"${fieldValue}" no existe en ${relatedTable.name}`);
    }
  }
  
  // Si no hay errores, todo bien
  return {
    success: errors.length === 0,
    fields: processedFields,
    createdRelations,
    errors,
    optionErrors: [],
  };
}

/**
 * Completa la creación de un registro relacionado pendiente con datos adicionales
 */
export async function completePendingRelation(workspaceId, pendingRelation, additionalFields) {
  const fullFields = {
    ...pendingRelation.partialData,
    ...additionalFields,
  };
  
  try {
    const created = await createRelatedRecord(workspaceId, pendingRelation.tableId, fullFields);
    return {
      success: true,
      record: created,
      tableName: pendingRelation.tableName,
      originalFields: pendingRelation.originalFields, // Devolver los campos originales
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Genera mensaje de respuesta cuando se crean registros relacionados
 */
export function formatRelationsMessage(createdRelations) {
  if (!createdRelations.length) return "";
  
  const messages = createdRelations.map(r => 
    `También registré a "${r.value}" en ${r.table}`
  );
  
  return messages.join("\n");
}

/**
 * Genera mensaje cuando hay opciones disponibles
 */
export function formatOptionsMessage(optionErrors) {
  if (!optionErrors?.length) return "";
  
  return optionErrors.map(e => {
    const options = e.availableOptions.slice(0, 5).join(", ");
    return `${e.message}. Opciones disponibles: ${options}`;
  }).join("\n");
}
