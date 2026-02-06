import { v4 as uuidv4 } from "uuid";
import {
  connectDB,
  getChatDbName,
  getAgentsDbName,
  getWorkspaceDbName,
  getTableDataDbName,
} from "../config/db.js";
import { detectTableAction, analyzeTableAction, analyzeAvailabilityQuery, extractPendingFields } from "../services/intentDetector.js";
import * as tableActions from "../services/tableActions.js";
import { processRelations, formatRelationsMessage, completePendingRelation } from "../services/relationHandler.js";
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
  
  let response = `📅 **Disponibilidad para el ${fechaLegible}**\n\n`;
  
  // Mostrar horario de atención general
  if (horarioAtencion) {
    response += `🏥 Horario de atención: ${horarioAtencion}\n\n`;
  }
  
  // Verificar si es fin de semana (sábado/domingo pueden tener horario especial)
  const esFinDeSemana = fechaObj.getDay() === 0 || fechaObj.getDay() === 6;
  
  if (Object.keys(disponibilidad).length === 0) {
    if (esFinDeSemana) {
      response += `⚠️ ${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} puede tener horario reducido o estar cerrado.\n`;
    }
    response += "No hay disponibilidad para esa fecha.";
    if (params.servicio) {
      response += ` Ningún profesional ofrece \"${params.servicio}\" o todos están ocupados.`;
    }
    response += "\n\n💡 ¿Quieres que busque disponibilidad para otro día?";
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
      response += `👨‍⚕️ **${vetNombre}**`;
      if (info.especialidad) response += ` - ${info.especialidad}`;
      response += `\n`;
      
      if (libresCount > 0) {
        const horariosStr = info.libres.slice(0, 5).join(', ');
        response += `   ✅ ${horariosStr}`;
        if (libresCount > 5) response += ` (+${libresCount - 5} más)`;
      } else {
        response += `   ❌ Sin disponibilidad`;
      }
      response += `\n`;
    }
  } else {
    // Sin veterinarios específicos, mostrar horarios generales
    const sortedSlots = [...allSlots].sort();
    if (sortedSlots.length > 0) {
      response += `✅ **Horarios disponibles:** ${sortedSlots.slice(0, 8).join(', ')}`;
      if (sortedSlots.length > 8) response += ` (+${sortedSlots.length - 8} más)`;
      response += `\n`;
    }
  }
  
  if (totalCitas > 0) {
    response += `\n📊 Citas agendadas ese día: ${totalCitas}`;
  }
  
  response += `\n\n💬 Para agendar, dime la hora y el servicio que necesitas.`;
  
  return response;
}

/**
 * Genera una pregunta natural para el siguiente campo requerido
 * Flujo conversacional: pregunta de a uno, no todos juntos
 */
function generateNaturalQuestion(missingFields, collectedFields, tableName) {
  // Prioridad de campos y sus preguntas naturales
  const fieldQuestions = {
    mascota: "¿Cómo se llama tu mascota? 🐾",
    propietario: "¿A nombre de quién será la cita?",
    telefono: "¿Me das un número de teléfono para contactarte?",
    fecha: "¿Para qué fecha te gustaría la cita?",
    hora: "¿A qué hora te conviene?",
    servicio: "¿Qué servicio necesitas? (consulta general, vacunación, etc.)",
    motivo: "¿Cuál es el motivo de la consulta?",
    especie: "¿Qué tipo de mascota es? (perro, gato, otro)",
    nombre: "¿Cuál es el nombre?",
    email: "¿Me compartes tu correo electrónico?",
  };
  
  // Orden de prioridad para citas
  const citasPriority = ['mascota', 'servicio', 'fecha', 'hora', 'propietario', 'telefono'];
  // Orden genérico
  const genericPriority = ['nombre', 'mascota', 'propietario', 'telefono', 'fecha', 'hora', 'servicio', 'email'];
  
  const priority = (tableName || '').toLowerCase().includes('cita') ? citasPriority : genericPriority;
  
  // Encontrar el siguiente campo prioritario que falte
  for (const field of priority) {
    if (missingFields.includes(field)) {
      return {
        nextField: field,
        question: fieldQuestions[field] || `¿Cuál es ${field}?`,
      };
    }
  }
  
  // Si no está en la lista de prioridad, tomar el primero que falte
  const firstMissing = missingFields[0];
  return {
    nextField: firstMissing,
    question: fieldQuestions[firstMissing] || `¿Cuál es ${firstMissing}?`,
  };
}

/**
 * Construir resumen de lo que ya tenemos antes de preguntar lo siguiente
 */
function buildProgressSummary(fields, tableName) {
  const entries = Object.entries(fields).filter(([k, v]) => 
    v !== undefined && v !== null && v !== '' && k !== 'estado'
  );
  
  if (entries.length === 0) return "";
  
  const summary = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
  return `✨ Entendido! Tengo: ${summary}\n\n`;
}

/**
 * Construir system prompt con instrucciones del agente y datos de tablas
 */
function buildSystemPrompt(agent, tablesData) {
  const agentName = agent?.name || "Asistente";
  const agentDesc = agent?.description || "";
  const instructions = agent?.instructions || [];
  
  let prompt = `Eres "${agentName}". ${agentDesc}\n\n`;
  
  // Instrucciones del agente
  if (Array.isArray(instructions) && instructions.length > 0) {
    prompt += "TUS INSTRUCCIONES ESPECÍFICAS:\n";
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
    prompt += `TABLAS DISPONIBLES: ${tableNames}\n\n`;
    prompt += "DATOS (usa SOLO esta información para responder consultas sobre datos):\n\n";
    tablesData.forEach(table => {
      prompt += `📋 ${table.tableName} (campos: ${table.headers.join(", ")}):\n`;
      if (table.data.length === 0) {
        prompt += "   (sin registros)\n";
      } else {
        table.data.slice(0, 15).forEach((row, i) => {
          const rowStr = Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          prompt += `   ${i + 1}. ${rowStr}\n`;
        });
        if (table.data.length > 15) {
          prompt += `   ... y ${table.data.length - 15} registros más\n`;
        }
      }
      prompt += "\n";
    });
  }
  
  prompt += `
REGLAS IMPORTANTES:
- NUNCA digas que eres ChatGPT, OpenAI, un modelo de IA o similar.
- Siempre responde como "${agentName}".
- Si preguntan qué ofreces/vendes/servicios, responde basándote en los datos de tus tablas.
- Si no tienes la información en los datos, di amablemente que no tienes esa información.
- Responde en el mismo idioma del usuario.
- Sé conciso y útil.
- Sé conciso y útil.`;
  
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
    
    // Opciones de contexto temporal (del frontend o calculado)
    const dateOptions = {
      today: today || new Date().toISOString().split('T')[0],
      timezone: timezone || 'UTC',
    };

    const token = tokenGPT || req.headers.authorization?.replace("Bearer ", "") || OPENAI_API_KEY;
    const agentsDb = await connectDB(getAgentsDbName(workspaceId));
    const agent = agentId ? await agentsDb.get(agentId).catch(() => null) : null;

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
        const responseText = `❌ Error al crear ${pendingRelation.tableName}: ${relResult.error}`;
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
      const fieldsStr = Object.entries(pendingCreate.fields)
        .filter(([k]) => !["estado"].includes(k))
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      
      let responseText = `✅ ${tableName} creada correctamente!\n\nDetalles: ${fieldsStr}`;
      responseText += `\n\n📝 También registré a "${pendingRelation.fieldValue}" en ${pendingRelation.tableName}`;
      
      // Limpiar estados pendientes
      delete chatDoc.data.pendingRelation;
      delete chatDoc.data.pendingCreate;
      
      // Guardar en historial
      chatDoc.messages = chatDoc.messages || [];
      chatDoc.messages.push({ role: "user", content: text, ts: Date.now() });
      chatDoc.messages.push({ role: "assistant", content: responseText, ts: Date.now() });
      await chatDb.insert(chatDoc);
      
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
        token
      );
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[chat.sendMessage] extractPendingFields result:", extractedFromPending);
      }
      
      // Si el LLM extrajo datos, fusionarlos con el pendingCreate
      if (extractedFromPending.isDataResponse && extractedFromPending.extractedFields) {
        forceCreateFlow = true;
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
                const { question } = generateNaturalQuestion(missingFields, existingPendingCreate.fields, existingPendingCreate.tableName);
                responseText += `\n\n---\n📝 **Continuando con tu cita...**\n${question}`;
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
      // Para create, usar el pendingCreate si existe
      let effectiveTableId;
      if (effectiveActionType === "query" || effectiveActionType === "search") {
        effectiveTableId = analysis?.tableId; // Usar la tabla que corresponde a la consulta
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
                : `Encontré ${rows.length} resultado(s):\n\n` +
                  rows
                    .slice(0, 15)
                    .map((r, i) => {
                      const { _id, _rev, main, createdAt, updatedAt, ...rest } = r;
                      return `${i + 1}. ${Object.entries(rest).map(([k, v]) => `${k}: ${v}`).join(", ")}`;
                    })
                    .join("\n");
            
            // Si hay un pendingCreate activo, recordar al usuario que puede continuar
            if (existingPendingCreate && existingPendingCreate.requiredFields) {
              const missingFields = existingPendingCreate.requiredFields.filter(k => {
                const v = existingPendingCreate.fields?.[k];
                return v === undefined || v === null || v === "";
              });
              if (missingFields.length > 0) {
                const { question } = generateNaturalQuestion(missingFields, existingPendingCreate.fields, existingPendingCreate.tableName);
                responseText += `\n\n---\n📝 Continuando con tu cita...\n${question}`;
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
            // PRIORIDAD: 1. Campos extraídos por extractPendingFields (más precisos)
            //            2. Campos del análisis normal
            const fieldsFromLLM = extractedFromPending?.extractedFields || {};
            const newFields = {
              ...(effectiveAnalysis.create.fields || {}),
              ...fieldsFromLLM,  // Los del LLM inteligente tienen prioridad
            };
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
                const { question } = generateNaturalQuestion(remainingMissing, pendingCreate.fields, pendingCreate.tableName);
                responseText = question;
              } else {
                chatDoc.data = chatDoc.data || {};
                chatDoc.data.pendingCreate = pendingCreate;
                
                // Generar pregunta natural para el siguiente campo
                const { question } = generateNaturalQuestion(remainingMissing, pendingCreate.fields, pendingCreate.tableName);
                const summary = buildProgressSummary(pendingCreate.fields, pendingCreate.tableName);
                
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
                // No crear, el usuario debe elegir otro valor
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
              }
              // Si hay errores
              else if (!relationsResult.success) {
                responseText = `❌ Error: ${relationsResult.errors.join(", ")}`;
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
                
                // Construir mensaje de confirmación bonito
                const isCita = tableName.toLowerCase().includes('cita');
                if (isCita) {
                  responseText = `✅ **¡Cita agendada!**\n\n`;
                  responseText += `🐾 Mascota: ${finalFields.mascota || 'N/A'}\n`;
                  responseText += `📅 Fecha: ${finalFields.fecha || 'N/A'}\n`;
                  responseText += `🕐 Hora: ${finalFields.hora || 'N/A'}\n`;
                  responseText += `💉 Servicio: ${finalFields.servicio || 'N/A'}\n`;
                  if (finalFields.veterinario && finalFields.veterinario !== 'Por asignar') {
                    responseText += `👨‍⚕️ Veterinario: ${finalFields.veterinario}\n`;
                  }
                  responseText += `📞 Teléfono: ${finalFields.telefono || 'N/A'}\n`;
                  responseText += `\n¡Te esperamos!`;
                } else {
                  const fieldsStr = Object.entries(finalFields)
                    .filter(([k]) => !["estado", "_id", "createdAt", "updatedAt"].includes(k))
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ");
                  responseText = `✅ ${tableName} creada correctamente!\n\nDetalles: ${fieldsStr}`;
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
            const updated = await tableActions.runUpdate(
              workspaceId,
              effectiveTableId,
              effectiveAnalysis.update.searchCriteria || {},
              effectiveAnalysis.update.fieldsToUpdate || {}
            );
            responseText = updated ? "✅ Registro actualizado correctamente." : "No se encontró el registro para actualizar.";
          } else if (effectiveActionType === "analyze") {
            const op = effectiveAnalysis.analyze?.operation || "count";
            const field = effectiveAnalysis.analyze?.field;
            const value = await tableActions.runAnalyze(workspaceId, effectiveTableId, op, field);
            responseText = `📊 Resultado: ${value}`;
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
        chat.updatedAt = new Date().toISOString();
        await chatDb.insert(chat);
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
