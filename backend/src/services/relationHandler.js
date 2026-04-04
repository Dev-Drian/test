import { v4 as uuidv4 } from "uuid";
import { connectDB, getWorkspaceDbName, getTableDataDbName } from "../config/db.js";

/**
 * Normaliza texto para comparación fuzzy
 * - Convierte a minúsculas
 * - Elimina acentos/tildes
 * - Elimina espacios extra
 */
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos
    .replace(/[^a-z0-9\s]/g, '') // Solo letras, números y espacios
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similitud entre dos strings (0 a 1)
 * Basado en coeficiente de Dice (bigrams)
 */
function stringSimilarity(str1, str2) {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  // Si uno contiene al otro, alta similitud
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    return shorter.length / longer.length * 0.9 + 0.1; // Entre 0.1 y 1
  }
  
  // Comparar palabras en común
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    // Usar Levenshtein simplificado para strings cortos
    return levenshteinSimilarity(s1, s2);
  }
  
  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

/**
 * Similitud basada en distancia Levenshtein
 */
function levenshteinSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  
  return (longer.length - costs[s2.length]) / longer.length;
}

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
 * @export
 */
export async function findTableByName(workspaceId, tableName) {
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
 * Busca un registro en una tabla con fuzzy matching inteligente
 * Prioridad: 1) Exacta, 2) Contiene/contenido, 3) Similitud alta
 */
async function findRecordInTable(workspaceId, tableId, searchField, searchValue) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await dataDb.find({
    selector: {
      tableId: tableId,
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 100,
  });
  
  const docs = result.docs || [];
  const searchNormalized = normalizeText(searchValue);
  const searchLower = String(searchValue).toLowerCase().trim();
  
  console.log(`[relationHandler] findRecordInTable: tableId=${tableId}, searchField=${searchField}, value=${searchValue}, docsFound=${docs.length}`);
  
  // 1. Coincidencia exacta (case-insensitive)
  const exactMatch = docs.find(doc => {
    const fieldValue = doc[searchField];
    return fieldValue && String(fieldValue).toLowerCase().trim() === searchLower;
  });
  
  if (exactMatch) {
    console.log(`[relationHandler] Exact match found: ${exactMatch[searchField]}`);
    return exactMatch;
  }
  
  // 2. El valor buscado está contenido en algún registro o viceversa
  const containsMatches = docs.filter(doc => {
    const fieldValue = doc[searchField];
    if (!fieldValue) return false;
    const fieldNormalized = normalizeText(fieldValue);
    return fieldNormalized.includes(searchNormalized) || searchNormalized.includes(fieldNormalized);
  });
  
  if (containsMatches.length === 1) {
    console.log(`[relationHandler] Contains match found: "${searchValue}" → "${containsMatches[0][searchField]}"`);
    return containsMatches[0];
  }
  
  // Si hay múltiples coincidencias parciales, buscar la más específica
  if (containsMatches.length > 1) {
    // Ordenar por similitud y tomar el mejor
    const ranked = containsMatches.map(doc => ({
      doc,
      similarity: stringSimilarity(doc[searchField], searchValue)
    })).sort((a, b) => b.similarity - a.similarity);
    
    // Si el mejor tiene buena similitud, usarlo
    if (ranked[0].similarity >= 0.6) {
      console.log(`[relationHandler] Best partial match: "${searchValue}" → "${ranked[0].doc[searchField]}" (${(ranked[0].similarity * 100).toFixed(0)}%)`);
      return ranked[0].doc;
    }
  }
  
  // 3. Búsqueda por similitud de string (para errores tipográficos)
  const SIMILARITY_THRESHOLD = 0.65; // 65% de similitud mínima
  
  const similarities = docs
    .map(doc => {
      const fieldValue = doc[searchField];
      if (!fieldValue) return null;
      return {
        doc,
        similarity: stringSimilarity(fieldValue, searchValue)
      };
    })
    .filter(item => item && item.similarity >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);
  
  if (similarities.length > 0) {
    const best = similarities[0];
    console.log(`[relationHandler] Fuzzy match found: "${searchValue}" → "${best.doc[searchField]}" (${(best.similarity * 100).toFixed(0)}% similar)`);
    return best.doc;
  }
  
  console.log(`[relationHandler] No match found for: ${searchValue}`);
  return undefined;
}

/**
 * Busca coincidencias parciales en una tabla (para confirmOnMatch)
 * Devuelve registros donde el campo contiene el valor buscado
 */
async function findPartialMatchInTable(workspaceId, tableId, searchField, searchValue) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await dataDb.find({
    selector: {
      tableId: tableId,
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 100,
  });
  
  const docs = result.docs || [];
  const searchLower = String(searchValue).toLowerCase().trim();
  
  console.log(`[relationHandler] findPartialMatchInTable: searching "${searchValue}" in ${searchField}, docs=${docs.length}`);
  
  // Buscar coincidencia exacta primero
  const exactMatch = docs.find(doc => {
    const fieldValue = doc[searchField];
    return fieldValue && String(fieldValue).toLowerCase().trim() === searchLower;
  });
  
  if (exactMatch) {
    console.log(`[relationHandler] Found exact match:`, exactMatch[searchField]);
    return { type: 'exact', record: exactMatch };
  }
  
  // Buscar coincidencias parciales (el campo contiene el valor buscado)
  const partialMatches = docs.filter(doc => {
    const fieldValue = doc[searchField];
    if (!fieldValue) return false;
    const fieldLower = String(fieldValue).toLowerCase().trim();
    // El campo contiene el valor buscado O el valor buscado contiene el campo
    return fieldLower.includes(searchLower) || searchLower.includes(fieldLower);
  });
  
  if (partialMatches.length === 1) {
    console.log(`[relationHandler] Found single partial match:`, partialMatches[0][searchField]);
    return { type: 'partial', record: partialMatches[0] };
  }
  
  if (partialMatches.length > 1) {
    console.log(`[relationHandler] Found ${partialMatches.length} partial matches`);
    return { type: 'multiple', records: partialMatches };
  }
  
  console.log(`[relationHandler] No matches found for "${searchValue}"`);
  return { type: 'none', records: [] };
}

/**
 * Obtiene todos los valores únicos de un campo en una tabla (para mostrar opciones)
 */
async function getFieldOptions(workspaceId, tableId, fieldName) {
  const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
  const result = await dataDb.find({
    selector: {
      tableId: tableId, // <- IMPORTANTE: filtrar por tableId
      $or: [
        { main: { $exists: false } },
        { main: { $ne: true } },
      ],
    },
    limit: 100,
  });
  
  const docs = result.docs || [];
  const options = [...new Set(docs.map(d => d[fieldName]).filter(Boolean))];
  
  console.log(`[relationHandler] getFieldOptions: tableId=${tableId}, field=${fieldName}, options=${options.length}`);
  
  return options;
}

/**
 * Crea un registro en una tabla relacionada con defaults aplicados
 */
export async function createRelatedRecord(workspaceId, tableId, fields) {
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

/**
 * Valida un campo de tipo relation contra la tabla relacionada
 * Se usa durante la recolección de campos para validar en tiempo real
 * 
 * Configuración de relación soportada:
 * - tableName: Nombre de la tabla relacionada
 * - searchField: Campo para buscar en la tabla relacionada  
 * - displayField: Campo a mostrar en opciones
 * - autoCreate: Si es true, permite crear el registro automáticamente (no valida)
 * - validateOnInput: Si es false, no valida durante la recolección (default: true)
 * - showOptionsOnNotFound: Si es true, muestra opciones cuando no encuentra
 * - confirmOnMatch: Si es true, pregunta al usuario si es la coincidencia encontrada
 * 
 * @param {string} workspaceId - ID del workspace
 * @param {*} value - Valor a validar
 * @param {object} fieldConfig - Configuración del campo (debe incluir relation)
 * @returns {Promise<{valid: boolean, error?: string, availableOptions?: array, matchFound?: object}>}
 */
export async function validateRelationField(workspaceId, value, fieldConfig) {
  if (!fieldConfig.relation) {
    return { valid: true }; // No tiene configuración de relación
  }
  
  const { tableName, searchField, displayField, showOptionsOnNotFound, autoCreate, validateOnInput, confirmOnMatch } = fieldConfig.relation;
  
  // Si confirmOnMatch está activo, buscar coincidencias (exactas Y parciales)
  if (confirmOnMatch) {
    console.log(`[relationHandler] confirmOnMatch mode: searching for "${value}" in ${tableName}`);
    
    // Buscar la tabla relacionada
    const relatedTable = await findTableByName(workspaceId, tableName);
    if (!relatedTable) {
      console.warn(`[relationHandler] Table not found: ${tableName}`);
      return { valid: true, noTableFound: true };
    }
    
    // Buscar coincidencias (exactas y parciales)
    const mainSearchField = searchField || displayField || 'nombre';
    const matchResult = await findPartialMatchInTable(workspaceId, relatedTable._id, mainSearchField, value);
    
    if (matchResult.type === 'exact') {
      // Coincidencia exacta - preguntar al usuario si es él
      console.log(`[relationHandler] confirmOnMatch: exact match found`, matchResult.record);
      return {
        valid: false,
        needsConfirmation: true,
        matchFound: matchResult.record,
        matchField: mainSearchField,
        tableName: tableName,
        tableId: relatedTable._id,
        message: `Encontré a "${matchResult.record.nombre || matchResult.record[mainSearchField]}" registrado. ¿Eres tú?`,
      };
    }
    
    if (matchResult.type === 'partial') {
      // Coincidencia parcial única - preguntar al usuario si es él
      console.log(`[relationHandler] confirmOnMatch: partial match found`, matchResult.record);
      return {
        valid: false,
        needsConfirmation: true,
        matchFound: matchResult.record,
        matchField: mainSearchField,
        tableName: tableName,
        tableId: relatedTable._id,
        inputValue: value, // Guardar lo que el usuario escribió
        message: `Encontré a "${matchResult.record.nombre || matchResult.record[mainSearchField]}" registrado. ¿Eres tú?`,
      };
    }
    
    if (matchResult.type === 'multiple') {
      // Múltiples coincidencias - mostrar opciones para que elija
      const options = matchResult.records.map(r => r.nombre || r[mainSearchField]);
      console.log(`[relationHandler] confirmOnMatch: multiple matches found`, options);
      return {
        valid: false,
        needsSelection: true,
        matches: matchResult.records,
        matchField: mainSearchField,
        tableName: tableName,
        tableId: relatedTable._id,
        message: `Encontré varios registros similares: ${options.join(', ')}. ¿A cuál te refieres?`,
        availableOptions: options,
      };
    }
    
    // No encontró coincidencia, pero autoCreate permite crear nuevo
    if (autoCreate) {
      console.log(`[relationHandler] confirmOnMatch: no match found, autoCreate enabled`);
      return { 
        valid: true,
        noMatchFound: true,
        needsNewRecord: true,
        tableName: tableName,
        tableId: relatedTable._id,
      };
    }
    
    // Sin autoCreate, mostrar opciones disponibles
    const availableOptions = await getFieldOptions(workspaceId, relatedTable._id, displayField || mainSearchField);
    return {
      valid: false,
      error: `No encontré "${value}" registrado.`,
      availableOptions: availableOptions,
    };
  }
  
  // Si autoCreate es true o validateOnInput es false, no validar
  if (autoCreate === true || validateOnInput === false) {
    console.log(`[relationHandler] Skipping validation: autoCreate=${autoCreate}, validateOnInput=${validateOnInput}`);
    return { valid: true };
  }
  
  // Si no hay workspaceId, no podemos validar
  if (!workspaceId) {
    console.warn(`[relationHandler] No workspaceId provided for relation validation`);
    return { valid: true }; // Permitir si no hay workspaceId
  }
  
  console.log(`[relationHandler] Validating relation: workspace=${workspaceId}, table=${tableName}, value=${value}`);
  
  // Buscar la tabla relacionada
  const relatedTable = await findTableByName(workspaceId, tableName);
  if (!relatedTable) {
    console.warn(`[relationHandler] Table not found: ${tableName} in workspace ${workspaceId}`);
    return { valid: true }; // Si no encuentra la tabla, permitir (puede ser config incompleta)
  }
  
  console.log(`[relationHandler] Found table: ${relatedTable._id} (${relatedTable.name})`);
  
  // Buscar si existe el registro (ahora con fuzzy matching)
  const mainSearchField = searchField || displayField || "nombre";
  const existingRecord = await findRecordInTable(workspaceId, relatedTable._id, mainSearchField, value);
  
  if (existingRecord) {
    const matchedValue = existingRecord[mainSearchField];
    const isExactMatch = String(matchedValue).toLowerCase().trim() === String(value).toLowerCase().trim();
    
    console.log(`[relationHandler] Record found: "${value}" → "${matchedValue}" (exact: ${isExactMatch})`);
    
    // Devolver el valor correcto encontrado para usarlo en lugar del input del usuario
    return { 
      valid: true,
      matchedValue: matchedValue,
      wasAutoMatched: !isExactMatch
    };
  }
  
  console.log(`[relationHandler] Record NOT found: ${value}`);
  
  // El registro NO existe
  // Obtener opciones disponibles para mostrar al usuario
  const availableOptions = await getFieldOptions(workspaceId, relatedTable._id, displayField || mainSearchField);
  
  console.log(`[relationHandler] Available options: ${availableOptions.length} found`);
  
  // Si no hay opciones disponibles, mensaje amigable
  if (availableOptions.length === 0) {
    return {
      valid: false,
      error: `"${value}" no está registrado. Actualmente no hay ${tableName.toLowerCase()} disponibles. Primero debes registrar ${tableName.toLowerCase()} antes de continuar.`,
      availableOptions: [],
      noDataAvailable: true,
    };
  }
  
  const optionsStr = availableOptions.slice(0, 6).join(', ');
  const moreStr = availableOptions.length > 6 ? ` (+${availableOptions.length - 6} más)` : '';
  
  return {
    valid: false,
    error: `"${value}" no está registrado como ${tableName.slice(0, -1)}. Opciones disponibles: ${optionsStr}${moreStr}`,
    availableOptions: availableOptions,
  };
}
