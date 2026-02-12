import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * Calcula la fecha de mañana basándose en una fecha string YYYY-MM-DD
 * Sin depender de toISOString() que convierte a UTC
 */
function calculateTomorrow(todayStr) {
  // Separar año, mes, día
  const [year, month, day] = todayStr.split('-').map(Number);
  // Crear fecha a mediodía para evitar problemas de timezone
  const date = new Date(year, month - 1, day, 12, 0, 0);
  date.setDate(date.getDate() + 1);
  // Formatear sin usar toISOString
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getModelForAgent(agent) {
  const aiModel = agent?.aiModel;
  if (Array.isArray(aiModel) && aiModel.length > 0) {
    const first = aiModel[0];
    if (typeof first === "string") return first;
    if (first?.id) return first.id;
  }
  if (typeof aiModel === "string") return aiModel;
  return DEFAULT_MODEL;
}

const MODEL_TO_OPENAI = {
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o": "gpt-4o",
  "gpt-4": "gpt-4",
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "GPT4O-Mini": "gpt-4o-mini",
  "GPT-4": "gpt-4",
  "GPT-3.5": "gpt-3.5-turbo",
};

function resolveOpenAIModel(userModel) {
  if (!userModel) return DEFAULT_MODEL;
  const key = String(userModel).trim();
  return MODEL_TO_OPENAI[key] || DEFAULT_MODEL;
}

/**
 * Paso 1: Clasificación rápida - ¿es acción sobre tablas?
 */
export async function detectTableAction(userMessage, agent, token) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return { hasTableAction: false, actionType: null, confidence: 0 };

  const model = resolveOpenAIModel(getModelForAgent(agent));

  const prompt = `Eres un clasificador de intenciones sobre datos en tablas. Analiza el mensaje del usuario y devuelve SOLO un JSON válido, sin markdown ni texto extra:

{
  "hasTableAction": true o false,
  "actionType": "query" | "create" | "update" | "delete" | "search" | "analyze" | "availability" | null,
  "confidence": 0-100
}

Reglas:
- query: consultar datos, ver citas, listar registros
- create: crear registro, agregar, nuevo, añadir, registrar, dar de alta, AGENDAR CITA
- update: actualizar, cambiar, modificar
- delete: eliminar, borrar
- search: buscar algo específico
- analyze: análisis, total, promedio, estadísticas, cuántos hay
- availability: PREGUNTAR POR DISPONIBILIDAD, horarios libres, si hay espacio

REGLAS ESPECIALES:
1. DISPONIBILIDAD: Si el usuario pregunta "¿hay disponibilidad?", "¿hay citas disponibles?", "¿está libre?", "¿qué horarios hay?", "¿pueden atenderme?":
   → actionType = "availability" (consulta especial de disponibilidad)
   
2. AGENDAR CITA: Si el usuario dice "quiero agendar", "reservar cita", "hacer una cita", "agendar para mañana":
   → actionType = "create"
   
3. CANCELAR: Si dice "cancelar mi cita", "anular reserva":
   → actionType = "update" (cambiar estado a Cancelada)

4. VER CITAS: "¿qué citas hay mañana?", "mostrar citas del día", "mis citas":
   → actionType = "query"

5. PRECIOS/SERVICIOS: "¿cuánto cuesta?", "¿qué servicios tienen?":
   → actionType = "query"

Si NO es acción sobre tablas (saludo, pregunta general, emergencia), hasTableAction = false.

Mensaje del usuario (máx. 500 chars): "${String(userMessage).slice(0, 500)}"`;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const content = res.data.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("intentDetector.detectTableAction:", err.message);
    return { hasTableAction: false, actionType: null, confidence: 0 };
  }
}

/**
 * Paso 2: Análisis detallado con contexto de tablas
 * @param {object} options - Opciones adicionales como { today, timezone }
 */
export async function analyzeTableAction(userMessage, tablesInfo, actionType, agent, token, options = {}) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = resolveOpenAIModel(getModelForAgent(agent));
  
  // Contexto de fecha/hora actual
  const today = options.today || new Date().toISOString().split('T')[0];
  const timezone = options.timezone || 'America/Bogota';
  
  // Calcular mañana usando función que no depende de UTC
  const tomorrowStr = calculateTomorrow(today);

  const prompt = `Eres un analizador que extrae datos de mensajes de usuario para operaciones en tablas.

CONTEXTO TEMPORAL:
- Fecha de HOY: ${today}
- Fecha de MAÑANA: ${tomorrowStr}
- Timezone: ${timezone}

TABLAS DISPONIBLES:
${JSON.stringify(tablesInfo, null, 2)}

Cada tabla tiene:
- "id": ID de la tabla
- "name": nombre de la tabla  
- "fields": campos que puede tener
- "permissions": qué acciones están permitidas (canQuery, canCreate, canUpdate, canDelete)

IMPORTANTE SOBRE PERMISOS:
- Si "canCreate: false" → NO se pueden crear registros en esa tabla
- Si "canQuery: false" → NO se pueden consultar datos de esa tabla
- Si una tabla tiene relaciones a otra tabla con canQuery: false, NO se puede crear porque no se pueden resolver las relaciones

MENSAJE DEL USUARIO:
"${String(userMessage).slice(0, 500)}"

TIPO DE ACCIÓN: "${actionType}"

REGLAS IMPORTANTES:
1. Elige la tabla cuyo "name" encaje mejor con la intención del usuario.
2. EXTRAE SOLO los datos que el usuario haya mencionado EXPLÍCITAMENTE y ponlos en "create.fields".
3. CONVIERTE fechas relativas a formato YYYY-MM-DD SOLO si el usuario las menciona:
   - "hoy" → "${today}"
   - "mañana" → "${tomorrowStr}"
   - "pasado mañana" → calcula la fecha
   - Si el usuario NO menciona fecha, NO pongas ninguna fecha en fields.
4. CONVIERTE horas a formato HH:MM (24h) SOLO si el usuario las menciona:
   - "las 2" o "a las 2" → "14:00" (asume PM si es cita/reunión)
   - "las 9" o "9 de la mañana" → "09:00"
   - "las 8 de la noche" → "20:00"
   - "mediodía" → "12:00"
   - Si el usuario NO menciona hora, NO pongas ninguna hora en fields.
5. Si el usuario dice "una consulta general", "vacunación", etc. → eso es "motivo".
6. En "create.missingFields" pon SOLO los campos de "fields" que NO hayan sido proporcionados.
7. Si ya tienes TODOS los campos de "fields" con valores, marca "create.isComplete": true.
8. NUNCA inventes datos que el usuario NO dijo. Si dice "quiero agendar" sin más detalles, fields debe estar vacío o solo con lo explícito.
9. Si la acción no está permitida por permisos, incluye "permissionDenied: true" en la respuesta.

EJEMPLOS de extracción:
- "una consulta general" → motivo: "Consulta general"
- "mañana a las 4" → fecha: "${tomorrowStr}", hora: "16:00"
- "hoy a las 10" → fecha: "${today}", hora: "10:00"
- "para mi perro Max" → mascota: "Max"
- "soy Juan" → propietario: "Juan"

Formato de salida (SOLO JSON válido, sin markdown ni explicaciones):
{
  "actionType": "${actionType}",
  "tableId": "id de la tabla",
  "tableName": "nombre de la tabla",
  "permissionDenied": false,
  "permissionReason": null,
  "query": { "filters": {}, "limit": 10 },
  "create": { "isComplete": false, "missingFields": [], "fields": {} },
  "update": { "searchCriteria": {}, "fieldsToUpdate": {} }
}`;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const content = res.data.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("intentDetector.analyzeTableAction:", err.message);
    return null;
  }
}

/**
 * Paso 2b: Análisis específico para consultas de disponibilidad
 */
export async function analyzeAvailabilityQuery(userMessage, tablesInfo, agent, token, options = {}) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = resolveOpenAIModel(getModelForAgent(agent));
  
  const today = options.today || new Date().toISOString().split('T')[0];
  const tomorrowStr = calculateTomorrow(today);

  // Encontrar tabla de citas y veterinarios
  const citasTable = tablesInfo.find(t => 
    t.name.toLowerCase().includes('cita') || t.type === 'appointments'
  );
  const vetsTable = tablesInfo.find(t => 
    t.name.toLowerCase().includes('veterinario') || t.type === 'staff'
  );
  const serviciosTable = tablesInfo.find(t => 
    t.name.toLowerCase().includes('servicio') || t.type === 'services'
  );

  const prompt = `Eres un analizador que extrae parámetros de búsqueda de disponibilidad.

CONTEXTO TEMPORAL:
- Fecha de HOY: ${today}
- Fecha de MAÑANA: ${tomorrowStr}

MENSAJE DEL USUARIO:
"${String(userMessage).slice(0, 400)}"

Extrae qué está buscando el usuario. CONVIERTE fechas relativas:
- "hoy" → "${today}"
- "mañana" → "${tomorrowStr}"
- "pasado mañana" → calcula la fecha
- Si no dice fecha específica, usa "mañana" por defecto

Devuelve SOLO JSON válido:
{
  "fecha": "YYYY-MM-DD",
  "servicio": "nombre del servicio o null",
  "veterinario": "nombre del vet o null",
  "horaPreferida": "HH:MM o null"
}

Ejemplos:
- "¿hay disponibilidad mañana?" → { "fecha": "${tomorrowStr}", "servicio": null, "veterinario": null, "horaPreferida": null }
- "quiero saber si hay espacio para una consulta general" → { "fecha": "${tomorrowStr}", "servicio": "Consulta general", "veterinario": null, "horaPreferida": null }
- "¿el Dr. Rodríguez tiene espacio el viernes a las 3?" → { "fecha": "calcular viernes", "servicio": null, "veterinario": "Dr. Rodríguez", "horaPreferida": "15:00" }`;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const content = res.data.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const params = JSON.parse(cleaned);
    
    return {
      ...params,
      citasTableId: citasTable?._id,
      veterinariosTableId: vetsTable?._id,
      serviciosTableId: serviciosTable?._id,
    };
  } catch (err) {
    console.error("intentDetector.analyzeAvailabilityQuery:", err.message);
    return null;
  }
}

/**
 * Extrae dinámicamente campos pendientes del mensaje del usuario
 * Usa el LLM para entender contexto y extraer valores de forma inteligente
 * 
 * DINÁMICO: Genera el prompt basándose en fieldsConfig real de la BD,
 * sin campos hardcodeados. Funciona con cualquier tabla/workspace.
 * 
 * @param {string} userMessage - El mensaje del usuario
 * @param {object} pendingCreate - El estado actual del borrador (incluye fieldsConfig, requiredFields, fields)
 * @param {array} conversationHistory - Historial de la conversación para contexto
 * @param {object} agent - Configuración del agente
 * @param {string} token - Token de OpenAI
 * @param {object} dateOptions - { today, timezone }
 * @returns {object} - { extractedFields: {}, isDataResponse: boolean, wantsToChangeFlow: boolean, newIntent: string|null }
 */
export async function extractPendingFields(userMessage, pendingCreate, conversationHistory, agent, token, dateOptions = {}) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return { extractedFields: {}, isDataResponse: false };

  const model = resolveOpenAIModel(getModelForAgent(agent));
  
  const today = dateOptions.today || new Date().toISOString().split('T')[0];
  const tomorrowStr = calculateTomorrow(today);
  
  // fieldsConfig viene del pendingCreate (almacenado desde la BD)
  const fieldsConfig = pendingCreate.fieldsConfig || [];
  
  // Campos ya recolectados (con labels para contexto)
  const collectedFields = Object.entries(pendingCreate.fields || {})
    .filter(([k, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const cfg = fieldsConfig.find(f => f.key === k);
      const label = cfg?.label || k;
      return `${k} (${label}): ${v}`;
    })
    .join('\n');
  
  // Campos que faltan
  const missingFields = (pendingCreate.requiredFields || []).filter(k => {
    const v = pendingCreate.fields?.[k];
    return v === undefined || v === null || v === "";
  });

  const recentHistory = (conversationHistory || []).slice(-8)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');
    
  // ─── Detectar campo que se pregunta — DINÁMICO ───
  const lastAssistantMessage = (conversationHistory || []).filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
  const currentlyAskingField = _detectFieldFromMessage(lastAssistantMessage, fieldsConfig, missingFields);
  
  // Construir contexto de campo
  let fieldContext = '';
  if (currentlyAskingField) {
    const cfg = fieldsConfig.find(f => f.key === currentlyAskingField);
    const label = cfg?.label || currentlyAskingField;
    fieldContext = `CAMPO QUE SE ESTÁ PREGUNTANDO ACTUALMENTE: "${currentlyAskingField}" (${label})
IMPORTANTE: Si el usuario responde con un valor simple, asígnalo al campo "${currentlyAskingField}".`;
  }
  
  // ─── Generar descripción dinámica de campos ───
  const fieldDescriptions = missingFields.map(key => {
    const cfg = fieldsConfig.find(f => f.key === key);
    if (!cfg) return `- "${key}": campo de texto`;
    
    const type = cfg.type || 'text';
    const label = cfg.label || key;
    let desc = `- "${key}" (${label}): tipo ${type}`;
    
    if (type === 'date') desc += `. Convertir a YYYY-MM-DD. "hoy"="${today}", "mañana"="${tomorrowStr}"`;
    if (type === 'time') desc += `. Convertir a HH:MM 24h. "7 PM"="19:00", "9 AM"="09:00"`;
    if (type === 'phone' || type === 'telefono') desc += `. DEBE tener 10 dígitos exactos`;
    if (type === 'email') desc += `. Debe ser email válido`;
    if (type === 'select' && cfg.options?.length > 0) desc += `. Opciones: ${cfg.options.join(', ')}`;
    if (type === 'relation') desc += `. Es una referencia (acepta nombre o texto libre)`;
    
    return desc;
  }).join('\n');

  const prompt = `Eres un asistente inteligente que está ayudando a recolectar datos para crear un registro.

FECHA ACTUAL: ${today}
FECHA MAÑANA: ${tomorrowStr}

CONTEXTO DE LA CONVERSACIÓN:
${recentHistory}

DATOS YA RECOLECTADOS (NO VOLVER A PEDIR):
${collectedFields || '(ninguno aún)'}

CAMPOS QUE FALTAN POR RECOLECTAR (usa EXACTAMENTE estas keys en extractedFields):
${fieldDescriptions}

${fieldContext}

EL USUARIO ACABA DE DECIR:
"${userMessage}"

Responde SOLO con un JSON válido:
{
  "isDataResponse": true/false,
  "extractedFields": { "campo_key": "valor" },
  "wantsToChangeFlow": true/false,
  "newIntent": null o "query" o "availability" o "cancel" o "thanks",
  "clarificationNeeded": null o "mensaje"
}

REGLAS CRÍTICAS:
1. Las keys en "extractedFields" DEBEN ser EXACTAMENTE las keys listadas arriba (${missingFields.join(', ')}). NO uses otras keys.
2. Si el campo que se pregunta es "${currentlyAskingField || '(ninguno)'}" y el usuario da un valor simple, asígnalo a ESE campo.
3. NO inventes datos. Solo extrae lo que el usuario dice explícitamente.
4. Si un nombre tiene varias palabras (ej: "Adrian Castro"), es UN solo valor para UN solo campo.
5. "gracias", "ok", "perfecto" → isDataResponse: false, newIntent: "thanks"
6. Si el usuario dice "el que te pasé antes", "el mismo", revisa el CONTEXTO.
7. "cancelar" → isDataResponse: false, wantsToChangeFlow: true, newIntent: "cancel"
8. Fechas relativas: "hoy"="${today}", "mañana"="${tomorrowStr}".
9. Horas: convertir a HH:MM 24h.
10. Teléfonos: validar 10 dígitos, si no → clarificationNeeded.`;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const content = res.data.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("intentDetector.extractPendingFields:", err.message);
    return { extractedFields: {}, isDataResponse: false };
  }
}

/**
 * Detecta qué campo se está preguntando basándose en el mensaje del asistente
 * DINÁMICO: usa fieldsConfig de la BD en vez de keywords hardcodeados
 * @private
 */
function _detectFieldFromMessage(assistantMessage, fieldsConfig, missingFields) {
  if (!assistantMessage) return null;
  const lower = assistantMessage.toLowerCase();
  
  // Solo buscar entre campos que faltan
  const missingConfigs = fieldsConfig.filter(fc => missingFields.includes(fc.key));
  
  // 1. Match por askMessage
  for (const fc of missingConfigs) {
    if (fc.askMessage) {
      const askLower = fc.askMessage.toLowerCase().replace(/[¿?¡!]/g, '').trim();
      if (lower.includes(askLower)) {
        return fc.key;
      }
    }
  }
  
  // 2. Match por label
  for (const fc of missingConfigs) {
    const label = (fc.label || fc.key).toLowerCase();
    if (lower.includes(label)) {
      return fc.key;
    }
  }
  
  // 3. Match por tipo/key (patrones genéricos)
  for (const fc of missingConfigs) {
    const key = fc.key.toLowerCase();
    const type = (fc.type || '').toLowerCase();
    
    if ((type === 'phone' || key.includes('telefono') || key.includes('phone')) &&
        (lower.includes('teléfono') || lower.includes('telefono') || lower.includes('número') || lower.includes('contacto'))) {
      return fc.key;
    }
    if ((type === 'date' || key.includes('fecha')) &&
        (lower.includes('fecha') || lower.includes('día') || lower.includes('cuándo'))) {
      return fc.key;
    }
    if ((type === 'time' || key.includes('hora')) &&
        (lower.includes('hora') || lower.includes('horario'))) {
      return fc.key;
    }
    if (lower.includes('nombre') && (key.includes('cliente') || key.includes('nombre') || key.includes('propietario'))) {
      return fc.key;
    }
    if (lower.includes('servicio') && (key.includes('servicio') || key.includes('service'))) {
      return fc.key;
    }
  }
  
  // 4. Un solo campo faltante → asumir ese
  if (missingConfigs.length === 1) {
    return missingConfigs[0].key;
  }
  
  return null;
}
