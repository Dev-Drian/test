import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DEFAULT_MODEL = "gpt-4o-mini";

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
  const timezone = options.timezone || 'UTC';
  
  // Calcular mañana, pasado mañana, etc.
  const todayDate = new Date(today);
  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const prompt = `Eres un analizador que extrae datos de mensajes de usuario para operaciones en tablas.

CONTEXTO TEMPORAL:
- Fecha de HOY: ${today}
- Fecha de MAÑANA: ${tomorrowStr}
- Timezone: ${timezone}

TABLAS DISPONIBLES:
${JSON.stringify(tablesInfo, null, 2)}

Cada tabla tiene:
- "_id": ID de la tabla
- "name": nombre de la tabla  
- "fields": campos OBLIGATORIOS que el usuario debe proporcionar

MENSAJE DEL USUARIO:
"${String(userMessage).slice(0, 500)}"

TIPO DE ACCIÓN: "${actionType}"

REGLAS IMPORTANTES:
1. Elige la tabla cuyo "name" encaje mejor con la intención del usuario.
2. EXTRAE todos los datos que el usuario haya mencionado y ponlos en "create.fields".
3. CONVIERTE fechas relativas a formato YYYY-MM-DD:
   - "hoy" → "${today}"
   - "mañana" → "${tomorrowStr}"
   - "pasado mañana" → calcula la fecha
4. CONVIERTE horas a formato HH:MM (24h):
   - "las 2" o "a las 2" → "14:00" (asume PM si es cita/reunión)
   - "las 9" o "9 de la mañana" → "09:00"
   - "las 8 de la noche" → "20:00"
   - "mediodía" → "12:00"
5. Si el usuario dice "una consulta general", "vacunación", etc. → eso es "motivo".
6. En "create.missingFields" pon SOLO los campos de "fields" que NO hayan sido proporcionados.
7. Si ya tienes TODOS los campos de "fields" con valores, marca "create.isComplete": true.

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
  const todayDate = new Date(today);
  const tomorrow = new Date(todayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

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
 * @param {string} userMessage - El mensaje del usuario
 * @param {object} pendingCreate - El estado actual del borrador (campos recolectados, campos faltantes)
 * @param {array} conversationHistory - Historial de la conversación para contexto
 * @param {object} agent - Configuración del agente
 * @param {string} token - Token de OpenAI
 * @returns {object} - { extractedFields: {}, isDataResponse: boolean, wantsToChangeFlow: boolean, newIntent: string|null }
 */
export async function extractPendingFields(userMessage, pendingCreate, conversationHistory, agent, token) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return { extractedFields: {}, isDataResponse: false };

  const model = resolveOpenAIModel(getModelForAgent(agent));
  
  // Campos ya recolectados
  const collectedFields = Object.entries(pendingCreate.fields || {})
    .filter(([k, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  
  // Campos que faltan
  const missingFields = (pendingCreate.requiredFields || []).filter(k => {
    const v = pendingCreate.fields?.[k];
    return v === undefined || v === null || v === "";
  });

  // Últimos mensajes de contexto
  const recentHistory = (conversationHistory || []).slice(-4)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = `Eres un asistente inteligente que está ayudando a recolectar datos para crear una cita.

CONTEXTO DE LA CONVERSACIÓN:
${recentHistory}

DATOS YA RECOLECTADOS:
${collectedFields || '(ninguno aún)'}

CAMPOS QUE FALTAN POR RECOLECTAR:
${missingFields.join(', ')}

EL USUARIO ACABA DE DECIR:
"${userMessage}"

ANALIZA el mensaje del usuario y responde SOLO con un JSON válido:

{
  "isDataResponse": true/false,  // ¿El mensaje contiene datos para los campos faltantes?
  "extractedFields": {           // Campos extraídos (solo los que encontraste)
    "campo1": "valor1",
    "campo2": "valor2"
  },
  "wantsToChangeFlow": true/false,  // ¿El usuario quiere hacer otra cosa? (cancelar, preguntar algo diferente)
  "newIntent": null o "query" o "availability" o "cancel",  // Si wantsToChangeFlow=true, qué quiere hacer
  "clarificationNeeded": null o "pregunta"  // Si necesitas aclarar algo
}

REGLAS DE EXTRACCIÓN:
1. "propietario" = nombre de la persona (si dice "mi nombre es X", "soy X", "a nombre de X" → propietario = X)
2. "telefono" = número de teléfono (cualquier secuencia de 6+ dígitos)
3. "mascota" = nombre del animal
4. "fecha" = convertir a formato YYYY-MM-DD (hoy=${new Date().toISOString().split('T')[0]})
5. "hora" = convertir a formato HH:MM (24h)
6. "servicio" = tipo de servicio (consulta, vacunación, etc.)

EJEMPLOS:
- "mi nombre es Juan Pérez" → { "isDataResponse": true, "extractedFields": { "propietario": "Juan Pérez" } }
- "3214567890" → { "isDataResponse": true, "extractedFields": { "telefono": "3214567890" } }
- "¿qué servicios tienen?" → { "isDataResponse": false, "wantsToChangeFlow": true, "newIntent": "query" }
- "para mañana a las 2" → { "isDataResponse": true, "extractedFields": { "fecha": "...", "hora": "14:00" } }
- "cancelar" → { "isDataResponse": false, "wantsToChangeFlow": true, "newIntent": "cancel" }`;

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
