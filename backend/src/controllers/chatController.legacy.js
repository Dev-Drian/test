import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  getChatDbName,
  getAgentsDbName,
  getWorkspaceDbName,
  getTableDataDbName,
  getFlowsDbName,
} from "../config/db.js";
import { detectTableAction, analyzeTableAction, analyzeAvailabilityQuery, extractPendingFields } from "../services/intentDetector.js";
import * as tableActions from "../services/tableActions.js";
import { processRelations, formatRelationsMessage, completePendingRelation } from "../services/relationHandler.js";
import { 
  processTemplate, 
  processTemplateWithFormat, 
  findMatchingTrigger,
  buildDynamicSystemPrompt,
  generateFieldPrompt
} from "../services/flowEngine.js";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

function getAgentModel(agent) {
  const aiModel = agent?.aiModel;
  if (Array.isArray(aiModel) && aiModel.length > 0) {
    const first = aiModel[0];
    return typeof first === "string" ? first : first?.id;
  }
  return typeof aiModel === "string" ? aiModel : "gpt-4o-mini";
}

const MODEL_MAP = {
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o": "gpt-4o",
  "GPT4O-Mini": "gpt-4o-mini",
};

function resolveModel(userModel) {
  return MODEL_MAP[String(userModel)] || "gpt-4o-mini";
}

/**
 * Convierte hora de formato 24h a 12h con AM/PM
 * Ej: "19:00" -> "7:00 PM", "09:30" -> "9:30 AM"
 */
function formatTo12Hour(time24) {
  if (!time24 || typeof time24 !== 'string') return time24;
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Genera un título inteligente para el chat basado en el primer intercambio
 */
async function generateChatTitle(userMessage, assistantResponse, token) {
  const apiKey = token || OPENAI_API_KEY;
  if (!apiKey) return null;
  
  try {
    const prompt = `Genera un título CORTO (máximo 5 palabras) para esta conversación.
El título debe describir el tema principal de lo que el usuario quiere.

Usuario: "${userMessage}"
Asistente: "${assistantResponse.substring(0, 200)}"

REGLAS:
- Máximo 5 palabras
- Sin comillas ni puntuación final
- Conciso y descriptivo
- En español
- NO uses "Usuario pregunta..." ni "Consulta sobre..."

EJEMPLOS:
- "quiero agendar una cita" → "Agendar cita veterinaria"
- "qué servicios tienen" → "Consulta de servicios"
- "cuánto cuesta la vacunación" → "Precio de vacunación"
- "necesito una ecografía para mi perro" → "Ecografía para mascota"

Responde SOLO con el título, nada más.`;

    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20,
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    
    let title = res.data.choices?.[0]?.message?.content?.trim() || null;
    // Limpiar comillas si las tiene
    if (title) {
      title = title.replace(/^["']|["']$/g, '').trim();
    }
    return title;
  } catch (err) {
    console.error("Error generando título del chat:", err.message);
    return null;
  }
}

/**
 * Guarda el chat y genera título automático si es el primer intercambio
 */
async function saveChatWithAutoTitle(chatDb, chatDoc, userMessage, assistantResponse, token) {
  // Si el chat tiene título por defecto y es el primer mensaje real, generar título
  const isFirstExchange = !chatDoc.messages || chatDoc.messages.length <= 2; // user + assistant
  const hasDefaultTitle = !chatDoc.title || chatDoc.title === "Nueva conversación";
  
  if (isFirstExchange && hasDefaultTitle && userMessage && assistantResponse) {
    const generatedTitle = await generateChatTitle(userMessage, assistantResponse, token);
    if (generatedTitle) {
      chatDoc.title = generatedTitle;
    }
  }
  
  chatDoc.updatedAt = new Date().toISOString();
  await chatDb.insert(chatDoc);
}

/**
 * Obtener lista de campos obligatorios para un CREATE en una tabla concreta.
 * Permite configurarlo de forma dinámica por agente (por ejemplo, para reservas/citas),
 * y si no hay configuración se usa lo que devuelva el análisis del modelo.
 */
async function getRequiredFieldsForCreate(workspaceId, tableId, fallbackMissing) {
  try {
    const tablesDb = await connectDB(getWorkspaceDbName(workspaceId));
    const tableMeta = await tablesDb.get(tableId).catch(() => null);
    if (tableMeta && Array.isArray(tableMeta.headers)) {
      const requiredKeys = tableMeta.headers
        .filter((h) => h && h.required === true && typeof h.key === "string")
        .map((h) => h.key);
      
      // Para relaciones con autoCreate, incluir campos requeridos de la tabla relacionada
      for (const header of tableMeta.headers) {
        if (header.type === 'relation' && header.relation?.autoCreate && header.relation.tableName) {
          // Buscar la tabla relacionada para obtener sus campos requeridos
          const allTables = await tablesDb.find({
            selector: { name: header.relation.tableName },
            limit: 1
          });
          if (allTables.docs && allTables.docs.length > 0) {
            const relatedTable = allTables.docs[0];
            if (relatedTable.headers) {
              // Incluir campos que están en autoCreateFields Y son requeridos en la tabla relacionada
              const autoCreateFields = header.relation.autoCreateFields || [];
              for (const field of autoCreateFields) {
                const relatedHeader = relatedTable.headers.find(h => h.key === field);
                // Si el campo es requerido en la tabla relacionada y no está ya en los requiredKeys
                if (relatedHeader && relatedHeader.required && !requiredKeys.includes(field)) {
                  // No duplicar si ya está el campo principal (ej: no agregar 'nombre' si ya está 'mascota')
                  if (field !== 'nombre' || !requiredKeys.includes(header.key)) {
                    requiredKeys.push(field);
                  }
                }
              }
            }
          }
        }
      }
      
      if (requiredKeys.length > 0) return requiredKeys;
    }
  } catch (_err) {
    // Si falla algo, usamos el fallback
  }
  return Array.isArray(fallbackMissing) ? fallbackMissing : [];
}

/**
 * Obtener valores por defecto para campos de una tabla
 */
async function getDefaultValuesForTable(workspaceId, tableId) {
  try {
    const tablesDb = await connectDB(getWorkspaceDbName(workspaceId));
    const tableMeta = await tablesDb.get(tableId).catch(() => null);
    if (tableMeta && Array.isArray(tableMeta.headers)) {
      const defaults = {};
      tableMeta.headers.forEach((h) => {
        if (h && h.defaultValue !== undefined && typeof h.key === "string") {
          defaults[h.key] = h.defaultValue;
        }
      });
      return defaults;
    }
  } catch (_err) {}
  return {};
}

/**
 * Obtener contexto de tablas del agente para el prompt
 * SOLO pasa los campos obligatorios (required) - la IA solo debe pedir esos
 */
async function getAgentTablesContext(workspaceId, agent) {
  const tableIds = agent?.tables;
  if (!tableIds?.length) return [];
  const tableDb = await connectDB(getWorkspaceDbName(workspaceId));
  const tablesInfo = [];
  for (const tRef of tableIds) {
    const tableId = typeof tRef === "string" ? tRef : tRef?.id || tRef?.tableId;
    if (!tableId) continue;
    try {
      const t = await tableDb.get(tableId).catch(() => null);
      if (t) {
        // Solo pasar los campos obligatorios - la IA solo debe pedir estos
        const requiredFields = (t.headers || [])
          .filter((h) => h.required === true)
          .map((h) => h.key || h.label);
        
        tablesInfo.push({ 
          _id: t._id, 
          name: t.name, 
          type: t.type, // Incluir tipo para identificar tablas (citas, veterinarios, etc.)
          // Solo los campos que el usuario DEBE proporcionar
          fields: requiredFields,
        });
      }
    } catch (_) {}
  }
  return tablesInfo;
}

/**
 * Obtener datos reales de las tablas del agente (limitados para contexto)
 */
async function getAgentTablesData(workspaceId, agent) {
  const tableIds = agent?.tables;
  if (!tableIds?.length) return [];
  
  const tableDb = await connectDB(getWorkspaceDbName(workspaceId));
  const tablesData = [];
  
  for (const tRef of tableIds) {
    const tableId = typeof tRef === "string" ? tRef : tRef?.id || tRef?.tableId;
    if (!tableId) continue;
    try {
      const tableMeta = await tableDb.get(tableId).catch(() => null);
      if (!tableMeta) continue;
      
      const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
      // Importante: en CouchDB los campos que no existen no se incluyen en { main: { $ne: true } }
      // así que las filas reales (que no tienen "main") no estaban siendo devueltas.
      // Usamos un OR: docs sin main o con main != true.
      const result = await dataDb.find({
        selector: {
          $or: [
            { main: { $exists: false } },
            { main: { $ne: true } },
          ],
        },
        limit: 20,
      });
      
      const rows = (result.docs || []).map(doc => {
        const { _id, _rev, main, createdAt, updatedAt, ...rest } = doc;
        return rest;
      });
      
      tablesData.push({
        tableName: tableMeta.name,
        tableId: tableId,
        headers: (tableMeta.headers || []).map(h => h.key || h.label),
        data: rows,
      });
    } catch (_) {}
  }
  return tablesData;
}

/**
 * Formatear respuesta de disponibilidad de manera amigable
 */
function formatAvailabilityResponse(availability, params) {
  const { fecha, totalCitas, veterinariosDisponibles, disponibilidad, horarioAtencion } = availability;
  
  // Formatear fecha legible
  const fechaObj = new Date(fecha + 'T12:00:00');
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const diaSemana = diasSemana[fechaObj.getDay()];
  const fechaLegible = `${diaSemana} ${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]}`;
  
  let response = `**Disponibilidad para el ${fechaLegible}**\n\n`;
  
  // Mostrar horario de atención general
  if (horarioAtencion) {
    response += `Horario de atención: ${horarioAtencion}\n\n`;
  }
  
  // Verificar si es fin de semana (sábado/domingo pueden tener horario especial)
  const esFinDeSemana = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;
  
  if (Object.keys(disponibilidad).length === 0) {
    if (esFinDeSemana) {
      response += `Nota: ${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} puede tener horario reducido o estar cerrado.\n`;
    }
    response += "No hay disponibilidad para esa fecha.";
    if (params.servicio) {
      response += ` Ningún profesional ofrece \"${params.servicio}\" o todos están ocupados.`;
    }
    response += "\n\n¿Quieres que busque disponibilidad para otro día?";
    return response;
  }
  
  // Recopilar todos los horarios únicos
  const allSlots = new Set();
  let hasVeterinarios = false;
  
  for (const [vetNombre, info] of Object.entries(disponibilidad)) {
    if (vetNombre !== "General") hasVeterinarios = true;
    (info.libres || []).forEach(h => allSlots.add(h));
  }
  
  // Si hay veterinarios específicos, mostrar por veterinario
  if (hasVeterinarios) {
    for (const [vetNombre, info] of Object.entries(disponibilidad)) {
      if (vetNombre === "General") continue;
      
      const libresCount = info.libres?.length || 0;
      response += `**${vetNombre}**`;
      if (info.especialidad) response += ` - ${info.especialidad}`;
      response += `\n`;
      
      if (libresCount > 0) {
        // Formatear horarios a 12h
        const horariosStr = info.libres.slice(0, 5).map(h => formatTo12Hour(h)).join(', ');
        response += `   Disponible: ${horariosStr}`;
        if (libresCount > 5) response += ` (+${libresCount - 5} más)`;
      } else {
        response += `   Sin disponibilidad`;
      }
      response += `\n`;
    }
  } else {
    // Sin veterinarios específicos, mostrar horarios generales
    const sortedSlots = [...allSlots].sort();
    if (sortedSlots.length > 0) {
      // Formatear horarios a 12h
      const horariosFormatted = sortedSlots.slice(0, 8).map(h => formatTo12Hour(h)).join(', ');
      response += `**Horarios disponibles:** ${horariosFormatted}`;
      if (sortedSlots.length > 8) response += ` (+${sortedSlots.length - 8} más)`;
      response += `\n`;
    }
  }
  
  if (totalCitas > 0) {
    response += `\nCitas agendadas ese día: ${totalCitas}`;
  }
  
  response += `\n\nPara agendar, dime la hora y el servicio que necesitas.`;
  
  return response;
}

/**
 * Genera una pregunta natural para el siguiente campo requerido
 * DINÁMICO: Usa configuración del flujo/agente si está disponible
 */
function generateNaturalQuestion(missingFields, collectedFields, tableName, flowConfig = null, agentConfig = null) {
  if (!missingFields || missingFields.length === 0) {
    return { nextField: null, question: null };
  }
  
  // Obtener configuración de campos desde el flujo
  const fieldsConfig = flowConfig?.fieldsConfig || agentConfig?.fieldsConfig || [];
  
  // Crear mapa de configuración por campo
  const fieldConfigMap = {};
  fieldsConfig.forEach(fc => {
    if (fc.fieldKey) fieldConfigMap[fc.fieldKey] = fc;
  });
  
  // Determinar orden de prioridad desde configuración o usar orden de missingFields
  let priority = missingFields;
  if (flowConfig?.fieldOrder && Array.isArray(flowConfig.fieldOrder)) {
    priority = flowConfig.fieldOrder.filter(f => missingFields.includes(f));
    // Agregar campos que faltan y no están en el orden
    missingFields.forEach(f => {
      if (!priority.includes(f)) priority.push(f);
    });
  }
  
  // Encontrar el siguiente campo
  const nextField = priority[0];
  if (!nextField) return { nextField: null, question: null };
  
  // Obtener la pregunta desde la configuración o generar una genérica
  const config = fieldConfigMap[nextField];
  let question = config?.askMessage || `¿Cuál es ${nextField}?`;
  
  // Si el campo tiene opciones (tipo select), mostrarlas
  if (config?.options && Array.isArray(config.options) && config.options.length > 0) {
    question += `\nOpciones: ${config.options.join(', ')}`;
  }
  
  return {
    nextField,
    question,
    fieldConfig: config || null,
  };
}

/**
 * Construir resumen de lo que ya tenemos antes de preguntar lo siguiente
 * DINÁMICO: usa displayLabel y fieldOrder desde la configuración del flujo
 */
function buildProgressSummary(fields, tableName, flowConfig = null) {
  const entries = Object.entries(fields).filter(([k, v]) => 
    v !== undefined && v !== null && v !== '' && k !== 'estado'
  );
  
  if (entries.length === 0) return "";
  
  // Obtener configuración de campos del flujo
  const fieldsConfig = flowConfig?.fieldsConfig || [];
  const fieldConfigMap = {};
  fieldsConfig.forEach(fc => {
    if (fc.fieldKey) fieldConfigMap[fc.fieldKey] = fc;
  });
  
  // Obtener orden de prioridad desde el flujo, o usar orden por defecto
  const priority = flowConfig?.fieldOrder || Object.keys(fieldConfigMap);
  
  // Ordenar según prioridad
  const sortedEntries = entries.sort((a, b) => {
    const aIdx = priority.indexOf(a[0]);
    const bIdx = priority.indexOf(b[0]);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
  
  // Eliminar duplicados: si dos campos tienen el mismo valor, solo mostrar uno
  const uniqueEntries = [];
  const seenValues = new Set();
  
  for (const [k, v] of sortedEntries) {
    const normalizedValue = String(v).toLowerCase().trim();
    // Evitar mostrar el mismo valor dos veces
    if (seenValues.has(normalizedValue)) {
      continue;
    }
    seenValues.add(normalizedValue);
    
    let displayValue = v;
    if (k === 'hora') {
      displayValue = formatTo12Hour(v);
    }
    
    // Obtener label desde config o usar nombre del campo capitalizado
    const config = fieldConfigMap[k];
    const label = config?.displayLabel || k.charAt(0).toUpperCase() + k.slice(1);
    uniqueEntries.push(`${label}: ${displayValue}`);
  }
  
  if (uniqueEntries.length === 0) return "";
  
  return `✅ Tengo registrado:\n${uniqueEntries.join('\n')}\n\n`;
}

/**
 * Construir system prompt con instrucciones del agente y datos de tablas
 * AHORA ES DINÁMICO: primero busca el systemPrompt personalizado del agente
 */
function buildSystemPrompt(agent, tablesData) {
  // Si el agente tiene systemPrompt personalizado, usar el motor dinámico
  if (agent?.systemPrompt) {
    return buildDynamicSystemPrompt(agent, tablesData);
  }
  
  // Fallback al prompt por defecto si no hay personalizado
  const agentName = agent?.name || "Asistente";
  const agentDesc = agent?.description || "";
  const instructions = agent?.instructions || [];
  const style = agent?.communicationStyle || {};
  
  let prompt = `Eres "${agentName}", un asistente profesional. ${agentDesc}

ESTILO DE COMUNICACIÓN:
- Respuestas BREVES y directas (máximo ${style.maxSentences || 3} oraciones por idea)
- Usa lenguaje claro y profesional
- ${style.useEmojis !== false ? 'Usa emojis apropiados' : 'No uses emojis'}
- Ve al grano, sin rodeos

`;
  
  // Instrucciones del agente
  if (Array.isArray(instructions) && instructions.length > 0) {
    prompt += "TUS INSTRUCCIONES:\n";
    instructions.forEach((inst, i) => {
      if (typeof inst === "string") {
        prompt += `${i + 1}. ${inst}\n`;
      } else if (inst && typeof inst === "object") {
        const title = inst.title || `Instrucción ${i + 1}`;
        prompt += `${i + 1}. ${title}\n`;
        if (Array.isArray(inst.actions) && inst.actions.length > 0) {
          inst.actions.forEach((act) => {
            prompt += `   - ${act}\n`;
          });
        }
      }
    });
    prompt += "\n";
  }
  
  // Datos de las tablas
  if (tablesData.length > 0) {
    const tableNames = tablesData.map(t => t.tableName).join(", ");
    prompt += `DATOS DISPONIBLES: ${tableNames}\n\n`;
    tablesData.forEach(table => {
      prompt += `${table.tableName} (${table.headers.join(", ")}):\n`;
      if (table.data.length === 0) {
        prompt += "   (sin registros)\n";
      } else {
        table.data.slice(0, 15).forEach((row, i) => {
          const rowStr = Object.entries(row)
            .filter(([k]) => !k.startsWith('_'))
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          prompt += `   ${i + 1}. ${rowStr}\n`;
        });
        if (table.data.length > 15) {
          prompt += `   ... y ${table.data.length - 15} más\n`;
        }
      }
      prompt += "\n";
    });
  }
  
  // Templates de respuesta si existen
  const templates = agent?.responseTemplates;
  if (templates) {
    prompt += "PLANTILLAS DE RESPUESTA (cuando aplique, usa estos formatos):\n";
    if (templates.createSuccess) prompt += `- Éxito al crear: ${templates.createSuccess.substring(0, 100)}...\n`;
    if (templates.cancelConfirm) prompt += `- Confirmar cancelación: ${templates.cancelConfirm.substring(0, 100)}...\n`;
    prompt += "\n";
  }
  
  prompt += `REGLAS:
- NUNCA menciones que eres IA, ChatGPT u OpenAI
- Actúa siempre como "${agentName}"
- Responde en el idioma del usuario
- Si no tienes información, dilo brevemente`;
  
  return prompt;
}

/**
 * Enviar mensaje al chat: detectar intención, ejecutar acción si aplica, o responder con LLM
 */
export async function sendMessage(req, res) {
  try {
    const { workspaceId, agentId, chatId, text, tokenGPT, conversationHistory, today, timezone } = req.body;
    if (!workspaceId || !text) {
      return res.status(400).json({ error: "workspaceId and text are required" });
    }
    
    // Opciones de contexto temporal - usar zona horaria de Colombia por defecto
    const colombiaTimezone = 'America/Bogota';
    const nowInColombia = new Date().toLocaleString('en-CA', { timeZone: colombiaTimezone });
    const todayInColombia = nowInColombia.split(',')[0]; // Formato YYYY-MM-DD
    
    const dateOptions = {
      today: today || todayInColombia,
      timezone: timezone || colombiaTimezone,
    };

    const token = tokenGPT || req.headers.authorization?.replace("Bearer ", "") || OPENAI_API_KEY;
    const agentsDb = await connectDB(getAgentsDbName(workspaceId));
    const agent = agentId ? await agentsDb.get(agentId).catch(() => null) : null;

    // Cargar flujos del agente para obtener configuración dinámica
    let activeFlow = null;
    if (agent?.hasFlows) {
      try {
        const flowsDb = await connectDB(getFlowsDbName(workspaceId));
        const flowsResult = await flowsDb.find({
          selector: { 
            agentId: agentId,
            $or: [{ isActive: true }, { enabled: true }]
          },
          limit: 10
        });
        // El flujo activo será el de "create" por defecto o el primero disponible
        activeFlow = flowsResult.docs?.find(f => f.trigger === 'create') || flowsResult.docs?.[0] || null;
      } catch (e) {
        // Si no hay flujos, continuar sin ellos
      }
    }
    
    // Obtener configuración de campos desde el flujo activo (para preguntas dinámicas)
    const flowConfig = activeFlow?.nodes?.find(n => n.type === 'table' && n.data?.fieldsConfig)?.data || null;

    // Cargar historial de conversación y estado de chat (borradores, etc.) si existe chatId
    let history = conversationHistory || [];
    let chatDb = null;
    let chatDoc = null;
    if (chatId) {
      chatDb = await connectDB(getChatDbName(workspaceId));
      chatDoc = await chatDb.get(chatId).catch(() => null);
      if (history.length === 0 && chatDoc?.messages) {
        history = chatDoc.messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        }));
      }
    }

    // FLUJO ESPECIAL: Si hay una relación pendiente (ej: faltaban datos de mascota)
    // El usuario está respondiendo con los datos para crear el registro relacionado
    if (chatDoc?.data?.pendingRelation && chatDoc?.data?.pendingCreate) {
      const pendingRelation = chatDoc.data.pendingRelation;
      const pendingCreate = chatDoc.data.pendingCreate;
      
      // Extraer los campos del mensaje del usuario para la tabla relacionada
      const tablesInfo = [{ 
        _id: pendingRelation.tableId, 
        name: pendingRelation.tableName, 
        fields: pendingRelation.missingFields.map(f => f.key),
      }];
      
      // Usar el LLM para extraer los campos del mensaje
      const analysis = await analyzeTableAction(
        text, 
        tablesInfo, 
        "create", 
        agent, 
        token || OPENAI_API_KEY,
        dateOptions
      );
      
      const additionalFields = analysis?.create?.fields || {};
      
      // Verificar que tenemos todos los campos requeridos
      const stillMissing = pendingRelation.missingFields.filter(f => {
        const val = additionalFields[f.key];
        return val === undefined || val === null || val === '';
      });
      
      if (stillMissing.length > 0) {
        // Aún faltan campos
        const missingLabels = stillMissing.map(f => f.label).join(', ');
        const responseText = `Aún me falta: ${missingLabels}. ¿Puedes proporcionarlos?`;
        
        // Guardar mensaje en historial
        if (chatDb && chatDoc) {
          chatDoc.messages = chatDoc.messages || [];
          chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
          chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
          await chatDb.insert(chatDoc);
        }
        
        return res.json({ success: true, text: responseText });
      }
      
      // Tenemos todos los datos - crear el registro relacionado
      const relResult = await completePendingRelation(workspaceId, pendingRelation, additionalFields);
      
      if (!relResult.success) {
        const responseText = `Error al crear ${pendingRelation.tableName}: ${relResult.error}`;
        return res.json({ success: false, text: responseText });
      }
      
      // Registro relacionado creado - ahora crear el registro original (la cita)
      const defaultValues = await getDefaultValuesForTable(workspaceId, pendingCreate.tableId);
      const finalFields = { ...defaultValues, ...pendingCreate.fields };
      
      const created = await tableActions.runCreate(
        workspaceId,
        pendingCreate.tableId,
        finalFields
      );
      
      const tableName = pendingCreate.tableName || "registro";
      const fields = pendingCreate.fields;
      
      let responseText = `✅ **¡${tableName} agendada con éxito!**\n\n`;
      if (fields.mascota) responseText += `🐾 **${fields.mascota}**\n`;
      if (fields.fecha) responseText += `📅 ${fields.fecha}${fields.hora ? ` a las ${formatTo12Hour(fields.hora)}` : ''}\n`;
      if (fields.servicio) responseText += `📋 ${fields.servicio}\n`;
      if (fields.propietario) responseText += `👤 A nombre de: ${fields.propietario}\n`;
      if (fields.telefono) responseText += `📱 Contacto: ${fields.telefono}\n`;
      
      responseText += `\n✨ También registré a "${pendingRelation.fieldValue}" en ${pendingRelation.tableName}`;
      
      // Limpiar estados pendientes
      delete chatDoc.data.pendingRelation;
      delete chatDoc.data.pendingCreate;
      
      // Guardar en historial con título automático
      chatDoc.messages = chatDoc.messages || [];
      chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
      chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
      await saveChatWithAutoTitle(chatDb, chatDoc, text, responseText, token);
      
      return res.json({ success: true, text: responseText });
    }

    // Crear resumen de contexto de la conversación para el análisis
    let conversationContext = history.length > 0
      ? "\n\nCONTEXTO DE LA CONVERSACIÓN ANTERIOR:\n" + history.map(m => `${m.role}: ${m.content}`).join("\n")
      : "";
    
    // Si hay un borrador pendiente (pendingCreate), agregar esos datos al contexto
    // para que el LLM NO vuelva a pedir los campos que ya tenemos
    const existingPendingCreate = chatDoc?.data?.pendingCreate;
    if (existingPendingCreate && existingPendingCreate.fields && Object.keys(existingPendingCreate.fields).length > 0) {
      const collectedFields = Object.entries(existingPendingCreate.fields)
        .filter(([k, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      conversationContext += `\n\nDATOS YA RECOLECTADOS PARA ${existingPendingCreate.tableName || 'la operación'}:\n${collectedFields}`;
      conversationContext += `\n(No pedir estos datos nuevamente, ya los tenemos)`;
      
      // Indicar qué campo específico estamos esperando
      if (existingPendingCreate.requiredFields) {
        const missingFields = existingPendingCreate.requiredFields.filter(k => {
          const v = existingPendingCreate.fields?.[k];
          return v === undefined || v === null || v === "";
        });
        if (missingFields.length > 0) {
          conversationContext += `\n\nCAMPO QUE SE ESTÁ PIDIENDO: ${missingFields[0]}`;
          conversationContext += `\nEl usuario probablemente está respondiendo con el valor de este campo.`;
          
          // Dar pistas específicas según el campo
          if (missingFields[0] === 'propietario') {
            conversationContext += `\nSi el usuario dice "mi nombre es X" o "soy X", el propietario es X.`;
          } else if (missingFields[0] === 'telefono') {
            conversationContext += `\nSi el usuario envía un número, es el teléfono.`;
          }
        }
      }
    }

    // ============ FLUJO INTELIGENTE CON PENDINGCREATE ============
    // Si hay un borrador activo, usar el LLM para extraer campos dinámicamente
    let responseText = "";
    let forceCreateFlow = false;
    let extractedFromPending = null;
    
    if (existingPendingCreate && existingPendingCreate.requiredFields) {
      // Usar LLM para analizar si el mensaje contiene datos para los campos pendientes
      extractedFromPending = await extractPendingFields(
        text,
        existingPendingCreate,
        history,
        agent,
        token,
        dateOptions
      );
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[chat.sendMessage] extractPendingFields result:", extractedFromPending);
      }
      
      // Si el LLM extrajo datos, fusionarlos con el pendingCreate
      if (extractedFromPending.isDataResponse && extractedFromPending.extractedFields) {
        // Validar teléfono antes de aceptarlo
        if (extractedFromPending.extractedFields.telefono) {
          const phoneDigits = extractedFromPending.extractedFields.telefono.replace(/\D/g, '');
          if (phoneDigits.length !== 10) {
            // Teléfono inválido, pedir de nuevo
            responseText = `⚠️ El número "${extractedFromPending.extractedFields.telefono}" no es válido. Debe tener exactamente 10 dígitos.\n\n¿Me puedes dar un número de teléfono válido?`;
            
            // Guardar en historial
            chatDoc.messages = chatDoc.messages || [];
            chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
            chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
            await chatDb.insert(chatDoc);
            
            return res.json({ success: true, text: responseText });
          }
          // Normalizar el teléfono a solo dígitos
          extractedFromPending.extractedFields.telefono = phoneDigits;
        }
        forceCreateFlow = true;
      }
      
      // Si hay un mensaje de aclaración del LLM (ej: validación fallida)
      if (extractedFromPending.clarificationNeeded) {
        responseText = `⚠️ ${extractedFromPending.clarificationNeeded}`;
        
        chatDoc.messages = chatDoc.messages || [];
        chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
        chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
        await chatDb.insert(chatDoc);
        
        return res.json({ success: true, text: responseText });
      }
      
      // Si el usuario quiere cambiar de flujo (preguntar algo, cancelar, etc.)
      if (extractedFromPending.wantsToChangeFlow) {
        forceCreateFlow = false;
        // Si quiere cancelar, limpiar el pendingCreate
        if (extractedFromPending.newIntent === 'cancel') {
          if (chatDoc?.data?.pendingCreate) {
            delete chatDoc.data.pendingCreate;
            await chatDb.insert(chatDoc);
          }
          responseText = "Entendido, he cancelado el proceso de agendar cita. ¿En qué más puedo ayudarte?";
          return res.json({ success: true, text: responseText });
        }
        
        // Si es un agradecimiento, responder amablemente
        if (extractedFromPending.newIntent === 'thanks') {
          // Limpiar pendingCreate si existe
          if (chatDoc?.data?.pendingCreate) {
            delete chatDoc.data.pendingCreate;
          }
          
          responseText = "¡De nada! 😊 Fue un placer ayudarte. ¿Hay algo más en lo que pueda asistirte?";
          
          chatDoc.messages = chatDoc.messages || [];
          chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
          chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
          await chatDb.insert(chatDoc);
          
          return res.json({ success: true, text: responseText });
        }
      }
    }
    
    // Paso 1: Detección de intención (solo si no estamos forzando create)
    const detection = !forceCreateFlow 
      ? await detectTableAction(text + conversationContext, agent, token)
      : { hasTableAction: true, actionType: "create", confidence: 100 };
      
    if (process.env.NODE_ENV !== "production") {
      console.log("[chat.sendMessage] detection", {
        workspaceId,
        agentId,
        hasTableAction: detection?.hasTableAction,
        actionType: detection?.actionType,
        confidence: detection?.confidence,
        hasPendingCreate: !!existingPendingCreate,
        forceCreateFlow,
      });
    }

    if ((detection.hasTableAction && detection.actionType && detection.confidence >= 50) || forceCreateFlow) {
      const effectiveActionType = forceCreateFlow ? "create" : detection.actionType;
      
      // Si el usuario está iniciando una NUEVA creación (no continuando), limpiar datos anteriores
      // Detectar frases que indican "nueva" cita
      const isNewCreateIntent = !forceCreateFlow && effectiveActionType === "create" && 
        /\b(nueva|otra|quiero|agendar|reservar|crear)\b/i.test(text);
      
      if (isNewCreateIntent && existingPendingCreate) {
        // Limpiar el pendingCreate anterior para empezar de cero
        if (chatDoc?.data?.pendingCreate) {
          delete chatDoc.data.pendingCreate;
          await chatDb.insert(chatDoc);
          // Recargar chatDoc
          const updatedChat = await chatDb.get(chatId);
          Object.assign(chatDoc, updatedChat);
        }
      }
      const tablesInfo = await getAgentTablesContext(workspaceId, agent);
      // Pasar el contexto de conversación al análisis
      const fullMessage = text + conversationContext;
      
      // ============ MANEJO DE DISPONIBILIDAD ============
      if (detection.actionType === "availability" && !forceCreateFlow) {
        try {
          const availParams = await analyzeAvailabilityQuery(fullMessage, tablesInfo, agent, token, dateOptions);
          
          if (availParams?.citasTableId && availParams?.fecha) {
            const availability = await tableActions.checkAvailability(
              workspaceId,
              availParams.citasTableId,
              availParams.veterinariosTableId,
              {
                fecha: availParams.fecha,
                servicio: availParams.servicio,
                veterinario: availParams.veterinario,
              }
            );
            
            // Formatear respuesta bonita
            responseText = formatAvailabilityResponse(availability, availParams);
            
            // Si hay un pendingCreate activo, recordar al usuario que puede continuar
            if (existingPendingCreate && existingPendingCreate.requiredFields) {
              const missingFields = existingPendingCreate.requiredFields.filter(k => {
                const v = existingPendingCreate.fields?.[k];
                return v === undefined || v === null || v === "";
              });
              if (missingFields.length > 0) {
                const { question } = generateNaturalQuestion(missingFields, existingPendingCreate.fields, existingPendingCreate.tableName, flowConfig, agent);
                responseText += `\n\n---\n📅 **Continuando con tu cita...**\n${question}`;
              }
            }
            
            // Guardar el mensaje Y mantener el pendingCreate
            if (chatDb && chatDoc) {
              chatDoc.messages = chatDoc.messages || [];
              chatDoc.messages.push(
                { role: "user", content: text, id: uuidv4(), timestamp: new Date().toISOString() },
                { role: "assistant", content: responseText, id: uuidv4(), timestamp: new Date().toISOString() }
              );
              chatDoc.updatedAt = new Date().toISOString();
              // IMPORTANTE: No borrar pendingCreate para que continúe el flujo
              await chatDb.insert(chatDoc);
            }
            
            return res.json({ success: true, text: responseText });
          } else {
            responseText = "No pude determinar qué disponibilidad buscas. ¿Para qué fecha?";
          }
        } catch (err) {
          console.error("availability check error:", err);
          responseText = "Error al consultar disponibilidad. Intenta de nuevo.";
        }
      }
      // ============ FIN MANEJO DE DISPONIBILIDAD ============
      
      // Usar effectiveActionType para el análisis (considera flujo forzado de create)
      const analysis = await analyzeTableAction(fullMessage, tablesInfo, effectiveActionType, agent, token, dateOptions);

      // Para query/search, siempre usar el tableId del análisis (la tabla que el usuario pregunta)
      // Para create con flujo forzado (pendingCreate activo), SIEMPRE usar el tableId del pendingCreate
      let effectiveTableId;
      if (effectiveActionType === "query" || effectiveActionType === "search") {
        effectiveTableId = analysis?.tableId; // Usar la tabla que corresponde a la consulta
      } else if (forceCreateFlow && existingPendingCreate?.tableId) {
        // IMPORTANTE: Si hay un pendingCreate activo y estamos en flujo forzado,
        // siempre usar la tabla del pendingCreate, no la que devuelve el análisis
        effectiveTableId = existingPendingCreate.tableId;
      } else {
        effectiveTableId = analysis?.tableId || existingPendingCreate?.tableId;
      }
      const effectiveAnalysis = analysis || {};
      
      if (effectiveTableId) {
        // Asegurar que analysis.create existe para flujo de create
        if (effectiveActionType === "create" && !effectiveAnalysis.create) {
          effectiveAnalysis.create = { fields: {}, missingFields: [] };
        }
        effectiveAnalysis.tableId = effectiveTableId;
        
        try {
          if (effectiveActionType === "query" || effectiveActionType === "search") {
            const rows = await tableActions.runQuery(workspaceId, effectiveTableId, effectiveAnalysis.query || {});
            responseText =
              rows.length === 0
                ? "No se encontraron resultados."
                : `📋 Encontré ${rows.length} opción(es):\n\n` +
                  rows
                    .slice(0, 10)
                    .map((r, i) => {
                      const { _id, _rev, main, createdAt, updatedAt, nombre, ...rest } = r;
                      // Formato profesional: nombre destacado, detalles debajo
                      let itemText = `${i + 1}. **${nombre || 'Sin nombre'}**`;
                      const details = Object.entries(rest)
                        .filter(([k, v]) => v !== undefined && v !== null && v !== '')
                        .map(([k, v]) => {
                          const labels = { categoria: 'Categoría', precio: 'Precio', duracion: 'Duración', descripcion: 'Descripción' };
                          const label = labels[k] || k.charAt(0).toUpperCase() + k.slice(1);
                          if (k === 'precio') return `   💰 ${label}: $${v}`;
                          if (k === 'duracion') return `   ⏱️ ${label}: ${v} min`;
                          return `   • ${label}: ${v}`;
                        });
                      if (details.length > 0) {
                        itemText += '\n' + details.join('\n');
                      }
                      return itemText;
                    })
                    .join("\n\n");
            
            // Si hay un pendingCreate activo, recordar al usuario que puede continuar
            if (existingPendingCreate && existingPendingCreate.requiredFields) {
              const missingFields = existingPendingCreate.requiredFields.filter(k => {
                const v = existingPendingCreate.fields?.[k];
                return v === undefined || v === null || v === "";
              });
              if (missingFields.length > 0) {
                const { question } = generateNaturalQuestion(missingFields, existingPendingCreate.fields, existingPendingCreate.tableName, flowConfig, agent);
                responseText += `\n\n---\n📅 **Continuando con tu cita...**\n${question}`;
              }
            }
          } else if (effectiveActionType === "create" && effectiveAnalysis.create) {
            // Soporte de "borrador" de creación por chat: fusionar campos a través de varios mensajes
            let pendingCreate =
              (chatDoc?.data && chatDoc.data.pendingCreate) || null;

            // Si no hay borrador previo o es de otra tabla, inicializar uno nuevo
            if (!pendingCreate || pendingCreate.tableId !== effectiveTableId) {
              const requiredFields = await getRequiredFieldsForCreate(
                workspaceId,
                effectiveTableId,
                effectiveAnalysis.create.missingFields
              );
              pendingCreate = {
                tableId: effectiveTableId,
                tableName: effectiveAnalysis.tableName || existingPendingCreate?.tableName || null,
                actionType: effectiveActionType,
                fields: {},
                requiredFields,
              };
            }

            // Fusionar campos nuevos con los ya recogidos en el borrador
            // PRIORIDAD: Solo aceptar valores para campos que REALMENTE FALTAN
            // IMPORTANTE: NUNCA sobrescribir campos que ya tienen valor válido
            const fieldsFromLLM = extractedFromPending?.extractedFields || {};
            const analysisFields = effectiveAnalysis.create.fields || {};
            
            // Filtrar campos vacíos
            const filterEmpty = (obj) => {
              const result = {};
              for (const [k, v] of Object.entries(obj)) {
                if (v !== undefined && v !== null && v !== '') {
                  result[k] = v;
                }
              }
              return result;
            };
            
            // Determinar qué campos realmente faltan ANTES de fusionar
            const currentMissing = (pendingCreate.requiredFields || []).filter(k => {
              const v = pendingCreate.fields?.[k];
              return v === undefined || v === null || v === '';
            });
            
            // Solo aceptar valores para campos que realmente faltan
            const filterOnlyMissing = (obj) => {
              const result = {};
              for (const [k, v] of Object.entries(obj)) {
                // Solo incluir si el campo está en los faltantes
                if (currentMissing.includes(k)) {
                  result[k] = v;
                }
              }
              return result;
            };
            
            const newFieldsRaw = {
              ...filterEmpty(analysisFields),
              ...filterEmpty(fieldsFromLLM),  // Los del LLM inteligente tienen prioridad
            };
            
            // PROTEGER campos existentes: solo agregar campos faltantes
            const newFields = filterOnlyMissing(newFieldsRaw);
            
            pendingCreate.fields = {
              ...(pendingCreate.fields || {}),
              ...newFields,
            };

            // Calcular qué campos siguen faltando en base al borrador:
            // usamos primero los "requiredFields" definidos en la tabla; si no hay,
            // caemos a lo que el modelo marcó como missing.
            const baseMissing =
              Array.isArray(pendingCreate.requiredFields) &&
              pendingCreate.requiredFields.length > 0
                ? pendingCreate.requiredFields
                : Array.isArray(effectiveAnalysis.create.missingFields)
                  ? effectiveAnalysis.create.missingFields
                  : [];
            const remainingMissing = (baseMissing || []).filter((k) => {
              const v = pendingCreate.fields?.[k];
              return v === undefined || v === null || v === "";
            });

            // Si aún faltan campos, guardar borrador en el chat y pedir de forma conversacional
            if (remainingMissing.length > 0) {
              if (!chatDoc) {
                // Si no hay chat cargado (caso raro sin chatId), nos limitamos a responder
                const { question } = generateNaturalQuestion(remainingMissing, pendingCreate.fields, pendingCreate.tableName, flowConfig, agent);
                responseText = question;
              } else {
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingCreate = pendingCreate;
                
                // Generar pregunta natural para el siguiente campo
                const { question } = generateNaturalQuestion(remainingMissing, pendingCreate.fields, pendingCreate.tableName, flowConfig, agent);
                const summary = buildProgressSummary(pendingCreate.fields, pendingCreate.tableName, flowConfig);
                
                responseText = summary + question;
                
                // GUARDAR INMEDIATAMENTE el borrador para que no se pierda
                chatDoc.messages = chatDoc.messages || [];
                chatDoc.messages.push(
                  { role: "user", content: text, id: uuidv4(), timestamp: new Date().toISOString() },
                  { role: "assistant", content: responseText, id: uuidv4(), timestamp: new Date().toISOString() }
                );
                chatDoc.updatedAt = new Date().toISOString();
                await chatDb.insert(chatDoc);
                
                // Retornar aquí para evitar que se guarde dos veces al final
                return res.json({ success: true, text: responseText });
              }
            } else if (
              pendingCreate.fields &&
              Object.keys(pendingCreate.fields).length > 0
            ) {
              // Tenemos todos los campos requeridos: crear el registro usando el borrador completo
              // Aplicar valores por defecto para campos no proporcionados
              const defaultValues = await getDefaultValuesForTable(workspaceId, pendingCreate.tableId);
              const finalFields = { ...defaultValues, ...pendingCreate.fields };
              
              // Procesar relaciones: verificar unicidad, crear registros relacionados
              const relationsResult = await processRelations(workspaceId, pendingCreate.tableId, finalFields);
              
              // Si hay conflicto de unicidad (ej: ya hay cita en ese horario)
              if (relationsResult.uniqueConflict) {
                responseText = relationsResult.message;
                // IMPORTANTE: Guardar el pendingCreate actualizado para no perder los datos
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingCreate = pendingCreate;
              } 
              // Si necesita más datos para crear un registro relacionado (flujo recursivo)
              else if (relationsResult.needsMoreData && relationsResult.pendingRelation) {
                // Guardar el estado de la relación pendiente para el siguiente mensaje
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingRelation = relationsResult.pendingRelation;
                chatDoc.data.pendingCreate = pendingCreate; // Mantener el borrador original
                responseText = relationsResult.message;
              }
              // Si debe elegir de opciones disponibles
              else if (relationsResult.optionRequired) {
                responseText = relationsResult.message;
                // IMPORTANTE: Guardar el pendingCreate actualizado
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingCreate = pendingCreate;
              }
              // Si hay errores
              else if (!relationsResult.success) {
                responseText = `Error: ${relationsResult.errors.join(", ")}`;
                // IMPORTANTE: Guardar el pendingCreate para que el usuario pueda corregir
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingCreate = pendingCreate;
              } 
              // Todo bien, crear el registro
              else {
                // ============ ASIGNACIÓN AUTOMÁTICA DE VETERINARIO ============
                // Si es una cita y no tiene veterinario asignado, buscar el mejor disponible
                const isCitaTable = (pendingCreate.tableName || '').toLowerCase().includes('cita');
                if (isCitaTable && (!finalFields.veterinario || finalFields.veterinario === 'Por asignar')) {
                  // Buscar tabla de veterinarios
                  const vetsTable = tablesInfo.find(t => 
                    t.name.toLowerCase().includes('veterinario') || t.type === 'staff'
                  );
                  if (vetsTable) {
                    const bestVet = await tableActions.findBestVeterinarian(
                      workspaceId,
                      vetsTable._id,
                      pendingCreate.tableId,
                      {
                        fecha: finalFields.fecha,
                        hora: finalFields.hora,
                        servicio: finalFields.servicio,
                      }
                    );
                    if (bestVet) {
                      finalFields.veterinario = bestVet;
                    }
                  }
                }
                // ============ FIN ASIGNACIÓN AUTOMÁTICA ============
                
                const created = await tableActions.runCreate(
                  workspaceId,
                  pendingCreate.tableId,
                  finalFields
                );
                const tableName = pendingCreate.tableName || effectiveAnalysis.tableName || "registro";
                
                // Construir mensaje de confirmación - USAR TEMPLATES DINÁMICOS
                const isCita = tableName.toLowerCase().includes('cita');
                const agentTemplates = agent?.responseTemplates || {};
                
                // Preparar contexto para templates
                let fechaLegible = finalFields.fecha || 'N/A';
                if (finalFields.fecha) {
                  try {
                    const fechaObj = new Date(finalFields.fecha + 'T12:00:00');
                    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    fechaLegible = `${diasSemana[fechaObj.getDay()]} ${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]}`;
                  } catch (_) {}
                }

                const templateContext = {
                  ...finalFields,
                  tableName,
                  fechaLegible,
                  hora: formatTo12Hour(finalFields.hora),
                };
                
                // Si hay template personalizado del agente, usarlo
                if (isCita && agentTemplates.createSuccess) {
                  responseText = processTemplateWithFormat(agentTemplates.createSuccess, templateContext);
                } else if (isCita) {
                  // Fallback al formato por defecto
                  responseText = `✅ **¡Cita agendada con éxito!**\n\n`;
                  responseText += `🐾 **${finalFields.mascota || 'Mascota'}**\n`;
                  responseText += `📅 ${fechaLegible} a las ${formatTo12Hour(finalFields.hora) || 'N/A'}\n`;
                  responseText += `📋 ${finalFields.servicio || 'N/A'}`;
                  if (finalFields.veterinario && finalFields.veterinario !== 'Por asignar') {
                    responseText += `\n👨‍⚕️ **Atendido por: Dr(a). ${finalFields.veterinario}**`;
                  } else {
                    responseText += `\n👨‍⚕️ Veterinario: Se asignará al momento de tu cita`;
                  }
                  if (finalFields.propietario) {
                    responseText += `\n👤 A nombre de: ${finalFields.propietario}`;
                  }
                  if (finalFields.telefono) {
                    responseText += `\n📱 Contacto: ${finalFields.telefono}`;
                  }
                  responseText += `\n\n¡Te esperamos! 🏥`;
                } else {
                  responseText = `✅ **¡${tableName} creado correctamente!**\n\n`;
                  const fieldLabels = {
                    mascota: '🐾 Mascota',
                    propietario: '👤 Propietario',
                    servicio: '📋 Servicio',
                    fecha: '📅 Fecha',
                    hora: '🕐 Hora',
                    telefono: '📱 Teléfono',
                    nombre: '📝 Nombre',
                  };
                  Object.entries(finalFields)
                    .filter(([k]) => !["estado", "_id", "createdAt", "updatedAt", "main"].includes(k))
                    .forEach(([k, v]) => {
                      const label = fieldLabels[k] || k.charAt(0).toUpperCase() + k.slice(1);
                      const value = k === 'hora' ? formatTo12Hour(v) : v;
                      responseText += `${label}: ${value}\n`;
                    });
                }
                
                // Si se crearon registros relacionados, informar
                const relationsMsg = formatRelationsMessage(relationsResult.createdRelations);
                if (relationsMsg) {
                  responseText += `\n\n${relationsMsg}`;
                }

                // Limpiar borrador tras crear
                if (chatDoc?.data?.pendingCreate) {
                  delete chatDoc.data.pendingCreate;
                }
                if (chatDoc?.data?.pendingRelation) {
                  delete chatDoc.data.pendingRelation;
                }
              }
            }
          } else if (effectiveActionType === "update" && effectiveAnalysis.update) {
            let searchCriteria = effectiveAnalysis.update.searchCriteria || {};
            const fieldsToUpdate = effectiveAnalysis.update.fieldsToUpdate || {};
            const isCancelacion = (fieldsToUpdate.estado || '').toLowerCase().includes('cancel');
            
            // ============ CONFIRMACIÓN ANTES DE CANCELAR ============
            // Verificar si ya hay confirmación pendiente
            const pendingConfirmation = chatDoc?.data?.pendingConfirmation;
            
            if (isCancelacion && !pendingConfirmation) {
              // Buscar la cita más reciente en el historial
              const recentMessages = (chatDoc?.messages || []).slice(-10);
              let citaInfo = null;
              for (const msg of recentMessages.reverse()) {
                if (msg.role === 'assistant' && msg.content?.includes('Cita agendada')) {
                  const mascotaMatch = msg.content.match(/🐾\s*\*?\*?([^*\n]+)/);
                  const fechaMatch = msg.content.match(/📅\s*([^\n]+)/);
                  if (mascotaMatch) {
                    citaInfo = {
                      mascota: mascotaMatch[1].trim().replace(/\*+/g, ''),
                      fecha: fechaMatch ? fechaMatch[1].trim() : 'N/A',
                    };
                    searchCriteria.mascota = citaInfo.mascota;
                  }
                  break;
                }
              }
              
              // Guardar confirmación pendiente
              chatDoc.data = chatDoc.data || {};
              chatDoc.data.pendingConfirmation = {
                action: 'cancel',
                tableId: effectiveTableId,
                searchCriteria,
                fieldsToUpdate,
                citaInfo,
              };
              
              // Usar template del agente o default
              const cancelConfirmTemplate = agent?.responseTemplates?.cancelConfirm;
              if (cancelConfirmTemplate && citaInfo) {
                responseText = processTemplateWithFormat(cancelConfirmTemplate, citaInfo);
              } else {
                responseText = `⚠️ **¿Estás seguro de cancelar esta cita?**\n\n`;
                if (citaInfo) {
                  responseText += `🐾 ${citaInfo.mascota}\n`;
                  responseText += `📅 ${citaInfo.fecha}\n\n`;
                }
                responseText += `Responde **Sí** para confirmar o **No** para mantenerla.`;
              }
              
              chatDoc.messages = chatDoc.messages || [];
              chatDoc.messages.push(
                { role: "user", content: text, ts: Date.now() },
                { role: "assistant", content: responseText, ts: Date.now() }
              );
              await chatDb.insert(chatDoc);
              
              return res.json({ success: true, text: responseText });
            }
            
            // Si hay confirmación pendiente, verificar respuesta
            if (pendingConfirmation && pendingConfirmation.action === 'cancel') {
              const userConfirms = /^(s[ií]|yes|confirmar|ok|dale)$/i.test(text.trim());
              const userDenies = /^(no|cancelar|mantener|dejala)$/i.test(text.trim());
              
              if (userDenies) {
                delete chatDoc.data.pendingConfirmation;
                responseText = "✅ Entendido, la cita se mantiene como estaba. ¿En qué más puedo ayudarte?";
                chatDoc.messages = chatDoc.messages || [];
                chatDoc.messages.push(
                  { role: "user", content: text, ts: Date.now() },
                  { role: "assistant", content: responseText, ts: Date.now() }
                );
                await chatDb.insert(chatDoc);
                return res.json({ success: true, text: responseText });
              }
              
              if (userConfirms) {
                // Usar los datos guardados de la confirmación
                searchCriteria = pendingConfirmation.searchCriteria;
                Object.assign(fieldsToUpdate, pendingConfirmation.fieldsToUpdate);
                delete chatDoc.data.pendingConfirmation;
              }
            }
            // ============ FIN CONFIRMACIÓN ============
            
            // Si no hay suficientes criterios de búsqueda, intentar usar contexto de la conversación
            if (Object.keys(searchCriteria).length === 0) {
              // Buscar en el historial reciente si hay info de una cita creada
              const recentMessages = (chatDoc?.messages || []).slice(-10);
              for (const msg of recentMessages.reverse()) {
                if (msg.role === 'assistant' && msg.content?.includes('Cita agendada')) {
                  // Extraer datos de la cita del mensaje de confirmación
                  const mascotaMatch = msg.content.match(/🐾\s*\*?\*?([^*\n]+)/);
                  const fechaMatch = msg.content.match(/📅\s*[^\d]*(\d{4}-\d{2}-\d{2}|\d+ de \w+)/);
                  const propMatch = msg.content.match(/👤\s*[^:]+:\s*([^\n]+)/);
                  
                  if (mascotaMatch) searchCriteria.mascota = mascotaMatch[1].trim();
                  if (propMatch) searchCriteria.propietario = propMatch[1].trim();
                  break;
                }
              }
            }
            
            // Si aún no hay criterios, pedir al usuario
            if (Object.keys(searchCriteria).length === 0) {
              if (isCancelacion) {
                responseText = "🔍 Para cancelar una cita, necesito saber cuál. ¿Me puedes dar el nombre del propietario o la mascota y la fecha de la cita?";
              } else {
                responseText = "🔍 Para actualizar el registro, necesito saber cuál. ¿Me puedes dar más detalles?";
              }
            } else {
              const updated = await tableActions.runUpdate(
                workspaceId,
                effectiveTableId,
                searchCriteria,
                fieldsToUpdate
              );
              
              if (updated) {
                const isCancelacion = (fieldsToUpdate.estado || '').toLowerCase().includes('cancel');
                if (isCancelacion) {
                  // Usar template del agente o default
                  const cancelSuccessTemplate = agent?.responseTemplates?.cancelSuccess;
                  const cancelContext = {
                    ...updated,
                    hora: formatTo12Hour(updated.hora),
                  };
                  if (cancelSuccessTemplate) {
                    responseText = processTemplateWithFormat(cancelSuccessTemplate, cancelContext);
                  } else {
                    responseText = `✅ **Cita cancelada**\n\n`;
                    if (updated.mascota) responseText += `🐾 ${updated.mascota}\n`;
                    if (updated.fecha) {
                      responseText += `📅 ${updated.fecha}`;
                      if (updated.hora) responseText += ` a las ${formatTo12Hour(updated.hora)}`;
                      responseText += `\n`;
                    }
                    if (updated.propietario) responseText += `👤 ${updated.propietario}\n`;
                    responseText += `\nSi necesitas reagendar, avísame.`;
                  }
                } else {
                  responseText = "✅ Registro actualizado correctamente.";
                }
              } else {
                responseText = "No encontré una cita con esos datos. ¿Puedes verificar el nombre o la fecha?";
              }
            }
          } else if (effectiveActionType === "analyze") {
            const op = effectiveAnalysis.analyze?.operation || "count";
            const field = effectiveAnalysis.analyze?.field;
            const value = await tableActions.runAnalyze(workspaceId, effectiveTableId, op, field);
            responseText = `Resultado: ${value}`;
          }
        } catch (err) {
          console.error("tableActions error:", err);
          responseText = "Error al ejecutar la acción. Intenta de nuevo.";
        }
      }
    }

    // Si no hubo acción sobre tablas o no se pudo ejecutar, respuesta con LLM
    if (!responseText) {
      const tablesData = await getAgentTablesData(workspaceId, agent);
      if (process.env.NODE_ENV !== "production") {
        console.log("[chat.sendMessage] tablesData summary", {
          workspaceId,
          agentId,
          tables: tablesData.map(t => ({
            tableName: t.tableName,
            tableId: t.tableId,
            headers: t.headers,
            rowsCount: Array.isArray(t.data) ? t.data.length : 0,
          })),
        });
      }
      const systemContent = buildSystemPrompt(agent, tablesData);

      // Construir mensajes con historial de conversación
      const messages = [{ role: "system", content: systemContent }];
      
      // Agregar historial de conversación (últimos 10 mensajes)
      if (history.length > 0) {
        history.forEach(m => {
          messages.push({ role: m.role, content: m.content });
        });
      }
      
      // Agregar mensaje actual del usuario
      messages.push({ role: "user", content: text });

      const model = resolveModel(getAgentModel(agent));
      const completion = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      responseText = completion.data.choices?.[0]?.message?.content || "No pude generar una respuesta.";
    }

    // Guardar mensaje en chat si hay chatId (y aplicar posibles cambios de estado como pendingCreate)
    if (chatId && chatDb) {
      const chat = chatDoc || (await chatDb.get(chatId).catch(() => null));
      if (chat) {
        chat.messages = chat.messages || [];
        chat.messages.push(
          { role: "user", content: text, id: uuidv4(), timestamp: new Date().toISOString() },
          { role: "assistant", content: responseText, id: uuidv4(), timestamp: new Date().toISOString() }
        );
        // Usar la función que genera título automático en el primer intercambio
        await saveChatWithAutoTitle(chatDb, chat, text, responseText, token);
      }
    }

    res.json({ success: true, text: responseText });
  } catch (err) {
    console.error("chat.sendMessage:", err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener o crear chat
 */
export async function getOrCreateChat(req, res) {
  try {
    const { workspaceId, agentId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const chatId = req.query.chatId || uuidv4();
    let chat = await chatDb.get(chatId).catch(() => null);
    if (!chat) {
      chat = {
        _id: chatId,
        typeChat: "chat",
        agent: agentId || null,
        title: "Nueva conversación",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await chatDb.insert(chat);
    }
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Listar todos los chats de un workspace
 */
export async function listChats(req, res) {
  try {
    const { workspaceId, agentId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const result = await chatDb.list({ include_docs: true });
    
    let chats = result.rows
      .map(r => r.doc)
      .filter(doc => doc && doc.typeChat === "chat");
    
    // Filtrar por agente si se especifica
    if (agentId) {
      chats = chats.filter(c => c.agent === agentId);
    }
    
    // Ordenar por fecha de actualización (más recientes primero)
    chats.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    // Devolver solo datos necesarios para el listado
    const chatList = chats.map(c => ({
      _id: c._id,
      title: c.title || getFirstMessagePreview(c.messages) || "Nueva conversación",
      agent: c.agent,
      messageCount: c.messages?.length || 0,
      lastMessage: c.messages?.length > 0 ? c.messages[c.messages.length - 1]?.content?.slice(0, 50) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    
    res.json(chatList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener preview del primer mensaje del usuario
 */
function getFirstMessagePreview(messages) {
  if (!messages || messages.length === 0) return null;
  const firstUserMsg = messages.find(m => m.role === "user");
  if (!firstUserMsg) return null;
  const content = firstUserMsg.content || "";
  return content.length > 40 ? content.slice(0, 40) + "..." : content;
}

/**
 * Eliminar un chat
 */
export async function deleteChat(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    if (!workspaceId || !chatId) {
      return res.status(400).json({ error: "workspaceId and chatId required" });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const chat = await chatDb.get(chatId).catch(() => null);
    
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    
    await chatDb.destroy(chat._id, chat._rev);
    res.json({ success: true, message: "Chat deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Renombrar un chat
 */
export async function renameChat(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    const { title } = req.body;
    
    if (!workspaceId || !chatId) {
      return res.status(400).json({ error: "workspaceId and chatId required" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "title required" });
    }
    
    const chatDb = await connectDB(getChatDbName(workspaceId));
    const chat = await chatDb.get(chatId).catch(() => null);
    
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    
    chat.title = title.trim();
    chat.updatedAt = new Date().toISOString();
    await chatDb.insert(chat);
    
    res.json({ success: true, chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
