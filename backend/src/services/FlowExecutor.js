/**
 * FlowExecutor - Ejecuta flujos automáticamente cuando se disparan triggers
 * 
 * Este servicio escucha eventos como RECORD_CREATED y ejecuta los flujos
 * configurados que tienen ese trigger.
 */

import { connectDB, getFlowsDbName, getTableDataDbName, getWorkspaceDbName, getChatDbName } from '../config/db.js';
import { processTemplate } from './flowEngine.js';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessageProvider } from '../integrations/notifications/ChatMessageProvider.js';
import { getNotificationService } from '../integrations/notifications/NotificationService.js';

/**
 * Obtiene el ID de la tabla de Log de Flujos
 */
async function getFlowLogsTableId(workspaceId) {
  try {
    const workspaceDb = await connectDB(getWorkspaceDbName(workspaceId));
    const result = await workspaceDb.find({
      selector: { name: 'Log de Flujos' },
      limit: 1,
    });
    return result.docs?.[0]?._id || null;
  } catch (error) {
    console.warn('[FlowExecutor] Log de Flujos table not found');
    return null;
  }
}

/**
 * Guarda un log de ejecución de flujo
 */
async function saveFlowLog(workspaceId, logData) {
  try {
    const tableId = await getFlowLogsTableId(workspaceId);
    if (!tableId) {
      console.warn('[FlowExecutor] No Log de Flujos table found, skipping log');
      return null;
    }
    
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    
    const doc = {
      _id: uuidv4(),
      tableId: tableId,
      ...logData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await dataDb.insert(doc);
    console.log(`[FlowExecutor] Flow log saved: ${doc._id}`);
    return doc._id;
  } catch (error) {
    console.error('[FlowExecutor] Error saving flow log:', error);
    return null;
  }
}

/**
 * Actualiza un log de ejecución de flujo
 */
async function updateFlowLog(workspaceId, logId, updates) {
  try {
    const tableId = await getFlowLogsTableId(workspaceId);
    if (!tableId || !logId) return;
    
    const dataDb = await connectDB(getTableDataDbName(workspaceId, tableId));
    
    const doc = await dataDb.get(logId);
    const updated = {
      ...doc,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await dataDb.insert(updated);
    console.log(`[FlowExecutor] Flow log updated: ${logId}`);
  } catch (error) {
    console.error('[FlowExecutor] Error updating flow log:', error);
  }
}

/**
 * Obtiene todos los flujos activos que tienen un trigger específico para una tabla
 */
async function getFlowsForTrigger(workspaceId, triggerType, tableId) {
  try {
    const flowsDb = await connectDB(getFlowsDbName(workspaceId));
    const result = await flowsDb.find({
      selector: {},
      limit: 100,
    });
    
    const flows = result.docs || [];
    
    // Filtrar flujos que coinciden con el trigger y tabla
    return flows.filter(flow => {
      // Verificar que esté activo
      if (flow.active === false || flow.isActive === false) return false;
      
      // Verificar trigger type (puede estar en diferentes formatos)
      const flowTrigger = flow.triggerType || flow.trigger;
      if (flowTrigger !== triggerType) return false;
      
      // Verificar tabla (puede estar en diferentes formatos)
      const flowTable = flow.triggerTable || flow.mainTable;
      if (flowTable !== tableId) return false;
      
      return true;
    });
  } catch (error) {
    console.error('[FlowExecutor] Error getting flows:', error);
    return [];
  }
}

/**
 * Ejecuta una acción de un nodo de flujo
 */
async function executeAction(action, context, workspaceId) {
  const { actionType, targetTable, fields, filter, createIfNotFound, filterField, filterValueType, filterValueField, filterValueFixed } = action;
  
  console.log(`[FlowExecutor] Executing action: ${actionType}`, { 
    targetTable, 
    fields, 
    createIfNotFound,
    filterField,
    filterValueType,
    filterValueField,
    filterValueFixed,
    contextTableId: context._tableId,
    contextId: context._id
  });
  
  switch (actionType) {
    case 'create':
      return await executeCreateAction(workspaceId, targetTable, fields, context);
    
    case 'update':
      return await executeUpdateAction(workspaceId, targetTable, filter, fields, context, { 
        createIfNotFound, 
        filterField, 
        filterValueType, 
        filterValueField, 
        filterValueFixed 
      });
    
    case 'upsert': // update or create
      return await executeUpdateAction(workspaceId, targetTable, filter, fields, context, { 
        createIfNotFound: true, 
        filterField, 
        filterValueType, 
        filterValueField, 
        filterValueFixed 
      });
    
    case 'notification':
      console.log(`[FlowExecutor] Notification: ${action.message || action.template}`);
      return { success: true, type: 'notification' };
    
    case 'send_message':
      return await executeSendMessage(workspaceId, action, context);
    
    case 'error':
      return { success: false, error: action.message };
    
    case 'allow':
      return { success: true, type: 'allow' };
    
    default:
      console.warn(`[FlowExecutor] Unknown action type: ${actionType}`);
      return { success: false, error: `Unknown action type: ${actionType}` };
  }
}

/**
 * Ejecuta acción send_message - envía mensajes a diferentes destinos
 * 
 * Tipos de destino (targetType):
 * - origin_chat: Responde al chat que disparó el flujo
 * - fixed: Número de WhatsApp fijo
 * - record_field: Campo del registro con el teléfono/chatId
 * - table_query: Busca destinatarios en otra tabla
 * 
 * Canales:
 * - chat: Inyecta en chat del bot
 * - in_app: Notificación en campanita
 * - whatsapp: WhatsApp (futuro)
 */
async function executeSendMessage(workspaceId, action, context) {
  const { 
    targetType,      // 'origin_chat' | 'fixed' | 'record_field' | 'table_query'
    targetValue,     // para 'fixed': el número de WhatsApp
    targetField,     // para 'record_field' / 'table_query': campo con teléfono
    queryTable,      // para 'table_query': tabla donde buscar
    queryFilter,     // para 'table_query': filtro opcional
    channel,         // 'chat' | 'in_app' | 'whatsapp'
    message,         // mensaje con {{variables}}
  } = action;
  
  console.log(`[FlowExecutor] send_message:`, { targetType, channel, message: message?.slice(0, 50) });
  
  try {
    // Procesar el mensaje con variables del contexto
    const processedMessage = processTemplate(message || '', context);
    
    // Resolver destinatarios según targetType
    const recipients = await resolveMessageRecipients(workspaceId, targetType, {
      targetValue,
      targetField,
      queryTable,
      queryFilter,
      context,
    });
    
    if (!recipients || recipients.length === 0) {
      console.warn('[FlowExecutor] send_message: No recipients found');
      return { success: false, error: 'No se encontraron destinatarios' };
    }
    
    console.log(`[FlowExecutor] send_message: ${recipients.length} recipient(s) found`);
    
    // Enviar según canal
    const results = [];
    
    for (const recipient of recipients) {
      let result;
      
      switch (channel) {
        case 'chat':
          result = await sendChatMessage(workspaceId, recipient, processedMessage, context);
          break;
        
        case 'in_app':
          result = await sendInAppNotification(workspaceId, recipient, processedMessage, context);
          break;
        
        case 'whatsapp':
          // TODO: Integrar con WhatsApp Business API
          console.log(`[FlowExecutor] WhatsApp message to ${recipient.phone}: ${processedMessage}`);
          result = { success: true, type: 'whatsapp_pending', phone: recipient.phone };
          break;
        
        default:
          result = { success: false, error: `Canal no soportado: ${channel}` };
      }
      
      results.push(result);
    }
    
    const allSuccess = results.every(r => r.success);
    return { 
      success: allSuccess, 
      type: 'send_message',
      channel,
      recipientCount: recipients.length,
      results 
    };
    
  } catch (error) {
    console.error('[FlowExecutor] send_message error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resuelve los destinatarios según el tipo de destino
 */
async function resolveMessageRecipients(workspaceId, targetType, options) {
  const { targetValue, targetField, queryTable, queryFilter, context } = options;
  
  switch (targetType) {
    case 'origin_chat':
      // El chat que disparó el flujo (si existe)
      if (context._chatId) {
        return [{ chatId: context._chatId, agentId: context._agentId }];
      }
      // Si no hay chat, intentar usar agentId del contexto
      if (context._agentId) {
        return [{ agentId: context._agentId, createNew: true }];
      }
      return [];
    
    case 'fixed':
      // Número fijo de WhatsApp
      if (targetValue) {
        return [{ phone: targetValue.replace(/\s+/g, '') }];
      }
      return [];
    
    case 'record_field':
      // Obtener valor del campo del registro
      if (targetField && context[targetField]) {
        const value = context[targetField];
        // Detectar si es chatId, teléfono o userId
        if (value.startsWith?.('chat_') || value.includes?.('-')) {
          return [{ chatId: value }];
        } else if (/^\+?\d{10,}$/.test(value.replace(/\s+/g, ''))) {
          return [{ phone: value.replace(/\s+/g, '') }];
        } else {
          return [{ userId: value }];
        }
      }
      return [];
    
    case 'table_query':
      // Buscar en otra tabla
      if (!queryTable) return [];
      
      try {
        const dataDb = await connectDB(getTableDataDbName(workspaceId, queryTable));
        
        // Construir selector
        let selector = { tableId: queryTable };
        
        if (queryFilter) {
          // Parsear filtro simple: "campo = valor"
          const filterMatch = queryFilter.match(/(\w+)\s*=\s*["']?([^"']+)["']?/);
          if (filterMatch) {
            const [, field, value] = filterMatch;
            selector[field] = value.toLowerCase() === 'true' ? true :
                              value.toLowerCase() === 'false' ? false : value;
          }
        }
        
        const result = await dataDb.find({ selector, limit: 50 });
        
        return result.docs
          .filter(doc => doc[targetField])
          .map(doc => {
            const value = doc[targetField];
            if (/^\+?\d{10,}$/.test(value.replace(/\s+/g, ''))) {
              return { phone: value.replace(/\s+/g, ''), record: doc };
            }
            return { userId: value, record: doc };
          });
          
      } catch (error) {
        console.error('[FlowExecutor] table_query error:', error);
        return [];
      }
    
    default:
      return [];
  }
}

/**
 * Envía mensaje a un chat usando ChatMessageProvider
 */
async function sendChatMessage(workspaceId, recipient, message, context) {
  const chatProvider = new ChatMessageProvider({ enabled: true });
  
  // Si tenemos chatId, inyectar en ese chat
  if (recipient.chatId) {
    return chatProvider.send({
      workspaceId,
      chatId: recipient.chatId,
      message,
      title: 'Mensaje automático',
      metadata: {
        source: 'flow',
        triggeredBy: context._id,
        tableName: context._tableName,
      },
    });
  }
  
  // Si tenemos agentId, crear nuevo chat
  if (recipient.agentId) {
    return chatProvider.send({
      workspaceId,
      agentId: recipient.agentId,
      message,
      title: `Mensaje de ${context._tableName || 'Flujo'}`,
      metadata: {
        source: 'flow',
        triggeredBy: context._id,
      },
    });
  }
  
  return { success: false, error: 'No chatId or agentId provided' };
}

/**
 * Envía notificación in_app
 */
async function sendInAppNotification(workspaceId, recipient, message, context) {
  const notificationService = getNotificationService();
  const inAppProvider = notificationService.getProvider('in_app');
  
  if (!inAppProvider) {
    console.warn('[FlowExecutor] in_app provider not available');
    return { success: false, error: 'in_app provider not configured' };
  }
  
  return inAppProvider.send({
    workspaceId,
    type: 'flow_message',
    title: '📨 Mensaje de flujo',
    message,
    data: {
      source: 'flow',
      triggeredBy: context._id,
      tableName: context._tableName,
      recipient,
    },
    recipient,
  });
}

/**
 * Ejecuta una acción de creación
 */
async function executeCreateAction(workspaceId, targetTableId, fields, context) {
  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, targetTableId));
    
    // Procesar templates en los campos
    const processedFields = {};
    for (const [key, value] of Object.entries(fields || {})) {
      processedFields[key] = processTemplate(String(value), context);
    }
    
    // Procesar valores especiales
    if (processedFields.fechaVencimiento) {
      processedFields.fechaVencimiento = processDateTemplate(processedFields.fechaVencimiento, context);
    }
    if (processedFields.fecha) {
      processedFields.fecha = processDateTemplate(processedFields.fecha, context);
    }
    
    const doc = {
      _id: uuidv4(),
      tableId: targetTableId,
      ...processedFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByFlow: true,
    };
    
    await dataDb.insert(doc);
    console.log(`[FlowExecutor] Created record in ${targetTableId}:`, doc._id);
    
    return { success: true, record: doc };
  } catch (error) {
    console.error('[FlowExecutor] Error creating record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta una acción de actualización
 * Soporta filtros viejos y nuevos, y auto-detecta el registro actual si targetTable = triggerTable
 */
async function executeUpdateAction(workspaceId, targetTableId, filter, fields, context, options = {}) {
  const { createIfNotFound = false, filterField, filterValueType, filterValueField, filterValueFixed } = options;
  
  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, targetTableId));
    
    // Construir el filtro
    let processedFilter = {};
    
    // Si es la misma tabla que disparó el trigger y no hay filtro, usar _id del registro actual
    if (targetTableId === context._tableId && !filter && !filterField) {
      processedFilter._id = context._id;
      console.log(`[FlowExecutor] Auto-filter: updating current record ${context._id}`);
    }
    // Nuevo formato simplificado
    else if (filterField) {
      let filterValue;
      if (filterValueType === 'trigger' && filterValueField) {
        filterValue = context[filterValueField];
      } else if (filterValueType === 'fixed') {
        filterValue = filterValueFixed;
      }
      
      if (filterValue !== undefined) {
        processedFilter[filterField] = filterValue;
      }
    }
    // Formato viejo con objeto filter
    else if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        processedFilter[key] = processTemplate(String(value), context);
      }
    }
    
    // Buscar el registro
    const result = await dataDb.find({
      selector: {
        tableId: targetTableId,
        ...processedFilter,
      },
      limit: 1,
    });
    
    if (!result.docs || result.docs.length === 0) {
      // Si createIfNotFound está activo, crear el registro
      if (createIfNotFound) {
        console.log('[FlowExecutor] Record not found, creating new one with createIfNotFound');
        return await executeCreateAction(workspaceId, targetTableId, { ...processedFilter, ...fields }, context);
      }
      
      console.warn('[FlowExecutor] No record found to update with filter:', processedFilter);
      return { success: false, error: 'Record not found' };
    }
    
    const doc = result.docs[0];
    
    // Procesar templates en los campos
    const processedFields = {};
    const mergedContext = { ...context, ...doc };
    
    for (const [key, value] of Object.entries(fields || {})) {
      let processedValue = String(value);
      
      // Detectar si es una expresión matemática con variables {{a * b}}
      const mathMatch = processedValue.match(/\{\{([^}]+\s*[\+\-\*\/]\s*[^}]+)\}\}/);
      if (mathMatch) {
        processedValue = evaluateExpressionWithContext(mathMatch[1], mergedContext);
        console.log(`[FlowExecutor] Evaluated expression: ${mathMatch[1]} = ${processedValue}`);
      } else {
        // Procesar template normal
        processedValue = processTemplate(processedValue, mergedContext);
        
        // Si después de procesar sigue siendo una expresión matemática
        if (processedValue.includes(' - ') || processedValue.includes(' + ') || processedValue.includes(' * ')) {
          try {
            processedValue = evaluateSimpleExpression(processedValue);
          } catch (e) {
            console.warn('[FlowExecutor] Could not evaluate expression:', processedValue);
          }
        }
      }
      
      processedFields[key] = processedValue;
    }
    
    // Actualizar
    const updated = {
      ...doc,
      ...processedFields,
      updatedAt: new Date().toISOString(),
      updatedByFlow: true,
    };
    
    await dataDb.insert(updated);
    console.log(`[FlowExecutor] Updated record ${doc._id} in ${targetTableId}`);
    
    return { success: true, record: updated };
  } catch (error) {
    console.error('[FlowExecutor] Error updating record:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta una consulta de un nodo query
 * Soporta formato viejo (filter: {}) y nuevo (filterField, filterValueType, filterValueField)
 * IMPORTANTE: La búsqueda es case-insensitive para mejor UX
 * Si encuentra el registro, normaliza el campo original con el nombre correcto
 */
async function executeQuery(query, context, workspaceId) {
  const { targetTable, filter, outputVar, filterField, filterValueType, filterValueField, filterValueFixed } = query;
  
  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, targetTable));
    
    // Obtener el valor de filtro
    let filterValue;
    let filterFieldName = filterField;
    let originalFieldKey = null; // El campo que se usó como fuente del valor (para normalizar)
    
    // Nuevo formato simplificado
    if (filterField) {
      if (filterValueType === 'trigger' && filterValueField) {
        // Valor del registro que disparó el flujo
        filterValue = context[filterValueField];
        originalFieldKey = filterValueField; // Guardar para normalización
      } else if (filterValueType === 'fixed') {
        filterValue = filterValueFixed;
      }
      console.log(`[FlowExecutor] Query filter: ${filterField} = ${filterValue}`);
    }
    // Formato viejo con objeto filter
    else if (filter) {
      const entries = Object.entries(filter);
      if (entries.length > 0) {
        filterFieldName = entries[0][0];
        filterValue = processTemplate(String(entries[0][1]), context);
      }
    }
    
    // Búsqueda case-insensitive: traer todos y filtrar manualmente
    const result = await dataDb.find({
      selector: {
        tableId: targetTable,
        $or: [
          { main: { $exists: false } },
          { main: { $ne: true } },
        ],
      },
      limit: 100,
    });
    
    const docs = result.docs || [];
    let doc = null;
    
    if (filterValue !== undefined && filterFieldName) {
      // Búsqueda case-insensitive
      const searchLower = String(filterValue).toLowerCase().trim();
      doc = docs.find(d => {
        const fieldVal = d[filterFieldName];
        return fieldVal && String(fieldVal).toLowerCase().trim() === searchLower;
      });
      
      // Fallback: búsqueda parcial si no hay match exacto
      if (!doc) {
        // Normalizar: quitar plurales simples en español
        const searchNorm = searchLower.replace(/e?s$/, '');
        doc = docs.find(d => {
          const fieldVal = d[filterFieldName];
          if (!fieldVal) return false;
          const valLower = String(fieldVal).toLowerCase().trim();
          const valNorm = valLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const sNorm = searchNorm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          // Check if the field value contains the search term or vice versa
          return valLower.includes(searchLower) || valNorm.includes(sNorm)
            || searchLower.includes(valLower);
        });
        if (doc) {
          console.log(`[FlowExecutor] Partial match: "${filterValue}" -> "${doc[filterFieldName]}"`);
        }
      }
      
      console.log(`[FlowExecutor] Case-insensitive search: "${filterValue}" -> ${doc ? 'FOUND' : 'NOT FOUND'} (checked ${docs.length} docs)`);
      
      // Si encontramos el registro Y el nombre es diferente (case), normalizar
      if (doc && originalFieldKey && filterFieldName) {
        const normalizedValue = doc[filterFieldName];
        if (normalizedValue && normalizedValue !== filterValue) {
          console.log(`[FlowExecutor] Normalizing ${originalFieldKey}: "${filterValue}" -> "${normalizedValue}"`);
          context[originalFieldKey] = normalizedValue;
        }
      }
    } else {
      // Sin filtro, tomar el primero
      doc = docs[0] || null;
    }
    
    if (outputVar && doc) {
      context[outputVar] = doc;
    }
    
    console.log(`[FlowExecutor] Query result for ${outputVar}:`, doc ? 'found' : 'not found');
    
    return { success: true, found: !!doc, data: doc };
  } catch (error) {
    console.error('[FlowExecutor] Error executing query:', error);
    return { success: false, found: false, error: error.message };
  }
}

/**
 * Evalúa una condición simple
 */
function evaluateCondition(condition, context) {
  const { field, operator, value } = condition;
  
  // Obtener el valor del campo desde el contexto
  let fieldValue = context[field];
  
  // Soportar acceso anidado como "productoData.stock"
  if (field.includes('.')) {
    const parts = field.split('.');
    fieldValue = parts.reduce((obj, key) => obj?.[key], context);
  }
  
  // Procesar el valor de comparación (puede ser template)
  let compareValue = value;
  if (typeof value === 'string' && value.includes('{{')) {
    compareValue = processTemplate(value, context);
  }
  
  // Convertir a número si es necesario
  const numFieldValue = Number(fieldValue);
  const numCompareValue = Number(compareValue);
  
  console.log(`[FlowExecutor] Evaluating condition: ${field} (${fieldValue}) ${operator} ${compareValue}`);
  
  switch (operator) {
    case '==':
    case '===':
      return fieldValue == compareValue;
    case '!=':
    case '!==':
      return fieldValue != compareValue;
    case '>':
      return numFieldValue > numCompareValue;
    case '>=':
      return numFieldValue >= numCompareValue;
    case '<':
      return numFieldValue < numCompareValue;
    case '<=':
      return numFieldValue <= numCompareValue;
    default:
      console.warn(`[FlowExecutor] Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Procesa templates de fecha como {{tomorrow}}, {{nextWeek}}, {{in3Days}}
 */
function processDateTemplate(value, context) {
  const today = new Date();
  
  if (value === '{{tomorrow}}' || value === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  if (value === '{{nextWeek}}' || value === 'nextWeek') {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
  
  if (value === '{{in3Days}}' || value === 'in3Days') {
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    return in3Days.toISOString().split('T')[0];
  }
  
  if (value === '{{today}}' || value === 'today') {
    return today.toISOString().split('T')[0];
  }
  
  // Si tiene formato {{today + X}}
  const match = value.match(/\{\{today\s*\+\s*(\d+)\}\}/);
  if (match) {
    const days = parseInt(match[1], 10);
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    return future.toISOString().split('T')[0];
  }
  
  return value;
}

/**
 * Evalúa expresiones matemáticas simples
 */
function evaluateSimpleExpression(expr) {
  // Solo permitir números, espacios y operadores básicos
  const cleaned = expr.replace(/[^0-9+\-*/.\s]/g, '');
  if (!cleaned.trim()) return expr;
  
  try {
    // Usar Function para evaluar de forma segura
    const result = new Function(`return ${cleaned}`)();
    return isNaN(result) ? expr : result;
  } catch (e) {
    return expr;
  }
}
/**
 * Evalúa una expresión matemática con variables del contexto
 * Ejemplo: "productoData.precio * cantidad" con contexto { productoData: { precio: 100 }, cantidad: 2 }
 * => 200
 */
function evaluateExpressionWithContext(expression, context) {
  try {
    // Reemplazar variables con sus valores
    let evalExpr = expression.trim();
    
    // Buscar todas las variables (palabras o con puntos como productoData.precio)
    const varPattern = /([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
    const matches = evalExpr.match(varPattern) || [];
    
    for (const varName of matches) {
      // Obtener valor del contexto (soporta acceso anidado)
      let value = context;
      const keys = varName.split('.');
      for (const k of keys) {
        if (value === null || value === undefined) break;
        value = value[k];
      }
      
      // Reemplazar la variable con su valor
      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        evalExpr = evalExpr.replace(new RegExp(varName.replace('.', '\\.'), 'g'), Number(value));
      }
    }
    
    console.log(`[FlowExecutor] Expression after substitution: ${evalExpr}`);
    
    // Evaluar la expresión resultante
    const result = evaluateSimpleExpression(evalExpr);
    return result;
  } catch (error) {
    console.error('[FlowExecutor] Error evaluating expression:', error);
    return 0;
  }
}
/**
 * Ejecuta un flujo completo
 */
async function runFlow(flow, context, workspaceId) {
  console.log(`\n[FlowExecutor] ========== Running flow: ${flow.name} ==========`);
  
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  
  // Encontrar el nodo trigger (inicio)
  const triggerNode = nodes.find(n => n.type === 'trigger');
  if (!triggerNode) {
    console.warn('[FlowExecutor] No trigger node found');
    return { success: false, error: 'No trigger node' };
  }
  
  let currentNodeId = triggerNode.id;
  let iterations = 0;
  const maxIterations = 20;
  const results = [];
  
  while (currentNodeId && iterations < maxIterations) {
    iterations++;
    
    const node = nodes.find(n => n.id === currentNodeId);
    if (!node) break;
    
    console.log(`[FlowExecutor] Processing node: ${node.type} - ${node.data?.label || node.id}`);
    
    let nextNodeId = null;
    let conditionResult = null;
    let queryFound = null;
    
    switch (node.type) {
      case 'trigger':
        // Simplemente pasar al siguiente
        break;
        
      case 'query':
        const queryResult = await executeQuery(node.data, context, workspaceId);
        queryFound = queryResult.found;
        results.push({ node: node.id, type: 'query', result: queryResult });
        break;
        
      case 'condition':
        conditionResult = evaluateCondition(node.data, context);
        console.log(`[FlowExecutor] Condition result: ${conditionResult ? 'YES' : 'NO'}`);
        results.push({ node: node.id, type: 'condition', result: conditionResult });
        break;
        
      case 'action':
        const actionResult = await executeAction(node.data, context, workspaceId);
        results.push({ node: node.id, type: 'action', result: actionResult });
        
        // Si la acción es de error, detener
        if (node.data.actionType === 'error') {
          console.log(`[FlowExecutor] Flow stopped by error action`);
          return { success: false, error: node.data.message, results };
        }
        break;
        
      case 'notification':
        const message = processTemplate(node.data.message || '', context);
        console.log(`[FlowExecutor] Notification: ${message}`);
        results.push({ node: node.id, type: 'notification', message });
        break;
    }
    
    // Encontrar el siguiente nodo
    const outgoingEdges = edges.filter(e => e.source === currentNodeId);
    
    if (outgoingEdges.length === 0) {
      // No hay más nodos
      break;
    } else if (outgoingEdges.length === 1) {
      // Solo un camino
      nextNodeId = outgoingEdges[0].target;
    } else {
      // Múltiples caminos - puede ser condición o query con yes/no
      if (conditionResult !== null) {
        // Es una condición
        const yesEdge = outgoingEdges.find(e => e.label === 'Sí' || e.label === 'Yes' || e.label === 'true');
        const noEdge = outgoingEdges.find(e => e.label === 'No' || e.label === 'false');
        
        nextNodeId = conditionResult 
          ? (yesEdge?.target || outgoingEdges[0].target)
          : (noEdge?.target || null);
      } else if (queryFound !== null) {
        // Es un query con salidas yes/no
        const yesEdge = outgoingEdges.find(e => e.sourceHandle === 'yes' || e.label === 'Sí');
        const noEdge = outgoingEdges.find(e => e.sourceHandle === 'no' || e.label === 'No');
        
        nextNodeId = queryFound 
          ? (yesEdge?.target || outgoingEdges[0].target)
          : (noEdge?.target || null);
          
        console.log(`[FlowExecutor] Query route: ${queryFound ? 'YES' : 'NO'} -> ${nextNodeId || 'END'}`);
      } else {
        nextNodeId = outgoingEdges[0].target;
      }
    }
    
    currentNodeId = nextNodeId;
  }
  
  console.log(`[FlowExecutor] ========== Flow completed: ${flow.name} ==========\n`);
  
  return { success: true, results };
}

/**
 * Ejecuta todos los flujos que coinciden con un trigger
 * @param {string} workspaceId - ID del workspace
 * @param {string} triggerType - Tipo de trigger: 'create', 'update', 'delete'
 * @param {string} tableId - ID de la tabla donde ocurrió el evento
 * @param {object} record - El registro que disparó el evento
 */
export async function executeFlowsForTrigger(workspaceId, triggerType, tableId, record) {
  console.log(`\n[FlowExecutor] ==========================================`);
  console.log(`[FlowExecutor] Trigger: ${triggerType} on table ${tableId}`);
  console.log(`[FlowExecutor] Record:`, JSON.stringify(record).substring(0, 200));
  
  // Obtener flujos que coinciden
  const flows = await getFlowsForTrigger(workspaceId, triggerType, tableId);
  
  if (flows.length === 0) {
    console.log(`[FlowExecutor] No flows found for this trigger`);
    return { executed: 0, results: [] };
  }
  
  console.log(`[FlowExecutor] Found ${flows.length} flow(s) to execute`);
  
  // Preparar contexto con los datos del registro
  const context = {
    ...record,
    _workspaceId: workspaceId,
    _tableId: tableId,
    _triggerType: triggerType,
  };
  
  // Ejecutar cada flujo y guardar logs
  const results = [];
  for (const flow of flows) {
    const startTime = Date.now();
    
    // Crear log inicial en estado "running"
    const logId = await saveFlowLog(workspaceId, {
      flowId: flow._id,
      flowName: flow.name,
      triggerType: triggerType,
      triggerTable: tableId,
      triggerRecordId: record._id || null,
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    
    try {
      const result = await runFlow(flow, context, workspaceId);
      const endTime = Date.now();
      
      // Actualizar log con resultado
      await updateFlowLog(workspaceId, logId, {
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
        duration: endTime - startTime,
        nodesExecuted: result.results?.length || 0,
        errorMessage: result.error || null,
        resultSummary: result.success 
          ? `Ejecutado correctamente (${result.results?.length || 0} nodos)` 
          : `Error: ${result.error}`,
        executionDetails: JSON.stringify(result.results || []).substring(0, 1000),
      });
      
      results.push({ flowId: flow._id, flowName: flow.name, logId, ...result });
    } catch (error) {
      const endTime = Date.now();
      
      // Actualizar log con error
      await updateFlowLog(workspaceId, logId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        duration: endTime - startTime,
        errorMessage: error.message,
        resultSummary: `Error fatal: ${error.message}`,
      });
      
      console.error(`[FlowExecutor] Error running flow ${flow.name}:`, error);
      results.push({ flowId: flow._id, flowName: flow.name, logId, success: false, error: error.message });
    }
  }
  
  console.log(`[FlowExecutor] ==========================================\n`);
  
  return { executed: flows.length, results };
}

/**
 * Ejecuta flujos beforeCreate y retorna campos calculados/derivados
 * Esta función ejecuta las queries necesarias y evalúa expresiones para calcular campos
 * como total = precio × cantidad ANTES de crear el registro
 * 
 * @param {string} workspaceId - ID del workspace
 * @param {string} tableId - ID de la tabla donde se va a crear
 * @param {object} fields - Campos del registro a crear
 * @returns {object} - { fields: camposModificados, context: contextoCompleto, flowExecuted: boolean }
 */
export async function executeBeforeCreateFlows(workspaceId, tableId, fields) {
  console.log(`\n[FlowExecutor] ========== BeforeCreate for table ${tableId} ==========`);
  
  // Obtener flujos beforeCreate para esta tabla
  const flows = await getFlowsForTrigger(workspaceId, 'beforeCreate', tableId);
  
  if (flows.length === 0) {
    console.log(`[FlowExecutor] No beforeCreate flows found`);
    return { fields, context: fields, flowExecuted: false };
  }
  
  console.log(`[FlowExecutor] Found ${flows.length} beforeCreate flow(s)`);
  
  // Preparar contexto con los campos del registro a crear
  const context = { ...fields, _workspaceId: workspaceId, _tableId: tableId };
  const modifiedFields = { ...fields };
  
  for (const flow of flows) {
    console.log(`[FlowExecutor] Processing beforeCreate flow: ${flow.name}`);
    
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    
    // Encontrar el nodo trigger
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) continue;
    
    let currentNodeId = triggerNode.id;
    let iterations = 0;
    const maxIterations = 20;
    
    while (currentNodeId && iterations < maxIterations) {
      iterations++;
      
      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) break;
      
      console.log(`[FlowExecutor][BeforeCreate] Processing: ${node.type} - ${node.data?.label || node.id}`);
      
      let nextNodeId = null;
      let conditionResult = null;
      let queryFound = null;
      
      switch (node.type) {
        case 'trigger':
          break;
          
        case 'query':
          // Ejecutar query para llenar contexto (ej: buscar productoData)
          const queryResult = await executeQuery(node.data, context, workspaceId);
          queryFound = queryResult.found;
          break;
          
        case 'condition':
          conditionResult = evaluateCondition(node.data, context);
          // Guardar info de la condición para mejor feedback de errores
          context._lastCondition = {
            field: node.data.field,
            operator: node.data.operator,
            expectedValue: node.data.value,
            actualValue: node.data.field.includes('.') 
              ? node.data.field.split('.').reduce((obj, k) => obj?.[k], context)
              : context[node.data.field],
            passed: conditionResult
          };
          console.log(`[FlowExecutor][BeforeCreate] Condition: ${conditionResult ? 'YES' : 'NO'}`);
          break;
          
        case 'action':
          const actionData = node.data;
          
          // Para beforeCreate, los actions de tipo 'update' en la misma tabla
          // modifican los campos del registro que se va a crear
          if (actionData.actionType === 'update' && actionData.targetTable === tableId) {
            console.log(`[FlowExecutor][BeforeCreate] Calculating derived fields`);
            
            if (actionData.fields) {
              for (const [key, valueTemplate] of Object.entries(actionData.fields)) {
                let processedValue = processTemplate(String(valueTemplate), context);
                
                // Evaluar expresiones matemáticas
                const mathMatch = processedValue.match(/^{{(.+)}}$/);
                if (mathMatch) {
                  processedValue = evaluateExpressionWithContext(mathMatch[1], context);
                } else if (/^[\d+\-*/.\s]+$/.test(processedValue)) {
                  processedValue = evaluateSimpleExpression(processedValue);
                }
                
                modifiedFields[key] = processedValue;
                context[key] = processedValue;
                console.log(`[FlowExecutor][BeforeCreate] Set ${key} = ${processedValue}`);
              }
            }
          }
          // Update a OTRA tabla (como descontar stock de Productos) - guardar para ejecutar después
          else if (actionData.actionType === 'update' && actionData.targetTable !== tableId) {
            console.log(`[FlowExecutor][BeforeCreate] Pending action to ${actionData.targetTableName || actionData.targetTable}`);
            context._pendingActions = context._pendingActions || [];
            context._pendingActions.push({
              type: 'update',
              targetTable: actionData.targetTable,
              targetTableName: actionData.targetTableName,
              filterField: actionData.filterField,
              filterValueType: actionData.filterValueType,
              filterValueField: actionData.filterValueField,
              fields: actionData.fields,
              context: { ...context }, // Snapshot del contexto actual
            });
          }
          // Create action a otra tabla (como crear seguimiento)
          else if (actionData.actionType === 'create' && actionData.targetTable !== tableId) {
            console.log(`[FlowExecutor][BeforeCreate] Pending create in ${actionData.targetTableName || actionData.targetTable}`);
            context._pendingActions = context._pendingActions || [];
            context._pendingActions.push({
              type: 'create',
              targetTable: actionData.targetTable,
              targetTableName: actionData.targetTableName,
              fields: actionData.fields,
              context: { ...context },
            });
          }
          // Error action - cancelar la creación
          else if (actionData.actionType === 'error') {
            const errorMsg = processTemplate(actionData.message || 'Error en beforeCreate', context);
            console.log(`[FlowExecutor][BeforeCreate] Error: ${errorMsg}`);
            
            // Extraer información útil para el usuario
            const validationInfo = {
              error: errorMsg,
              lastCondition: context._lastCondition || null,
              suggestedFix: null,
              fieldToFix: null,
            };
            
            // Si el error es de stock, sugerir el máximo disponible
            if (context._lastCondition && errorMsg.toLowerCase().includes('stock')) {
              const stockField = context._lastCondition.field;
              if (stockField.includes('stock')) {
                validationInfo.fieldToFix = 'cantidad';
                validationInfo.suggestedFix = context._lastCondition.actualValue;
                validationInfo.maxAvailable = context._lastCondition.actualValue;
              }
            }
            
            return { 
              fields: modifiedFields, 
              context, 
              flowExecuted: true, 
              error: errorMsg,
              blocked: true,
              validationInfo,
            };
          }
          // Allow action - continuar
          else if (actionData.actionType === 'allow') {
            console.log(`[FlowExecutor][BeforeCreate] Allow: creation permitted`);
          }
          break;
      }
      
      // Encontrar siguiente nodo
      const outgoingEdges = edges.filter(e => e.source === currentNodeId);
      
      if (outgoingEdges.length === 0) {
        break;
      } else if (outgoingEdges.length === 1) {
        nextNodeId = outgoingEdges[0].target;
      } else {
        if (conditionResult !== null) {
          const yesEdge = outgoingEdges.find(e => e.label === 'Sí' || e.label === 'Yes' || e.label === 'true');
          const noEdge = outgoingEdges.find(e => e.label === 'No' || e.label === 'false');
          nextNodeId = conditionResult ? (yesEdge?.target || outgoingEdges[0].target) : (noEdge?.target || null);
        } else if (queryFound !== null) {
          const yesEdge = outgoingEdges.find(e => e.sourceHandle === 'yes' || e.label === 'Sí');
          const noEdge = outgoingEdges.find(e => e.sourceHandle === 'no' || e.label === 'No');
          nextNodeId = queryFound ? (yesEdge?.target || outgoingEdges[0].target) : (noEdge?.target || null);
        } else {
          nextNodeId = outgoingEdges[0].target;
        }
      }
      
      currentNodeId = nextNodeId;
    }
  }
  
  // Detectar campos que fueron normalizados por las queries
  // (por ejemplo, producto: "servidor cloud" → "Servidor Cloud")
  for (const key of Object.keys(fields)) {
    if (context[key] !== undefined && context[key] !== fields[key]) {
      console.log(`[FlowExecutor][BeforeCreate] Field normalized: ${key} = "${fields[key]}" -> "${context[key]}"`);
      modifiedFields[key] = context[key];
    }
  }
  
  // Recolectar acciones pendientes (updates/creates a otras tablas)
  const pendingActions = context._pendingActions || [];
  
  console.log(`[FlowExecutor] ========== BeforeCreate completed ==========\n`);
  console.log(`[FlowExecutor] Modified fields:`, modifiedFields);
  console.log(`[FlowExecutor] Pending actions:`, pendingActions.length);
  
  return { fields: modifiedFields, context, flowExecuted: true, pendingActions };
}

/**
 * Ejecuta las acciones pendientes del beforeCreate (updates/creates a otras tablas)
 * Se ejecuta DESPUÉS de crear el registro principal
 * 
 * @param {string} workspaceId - ID del workspace
 * @param {array} pendingActions - Acciones pendientes del beforeCreate
 * @param {object} createdRecord - Registro recién creado (para contexto adicional)
 */
async function executePendingActions(workspaceId, pendingActions, createdRecord = {}) {
  if (!pendingActions || pendingActions.length === 0) {
    return { executed: 0, results: [] };
  }
  
  console.log(`[FlowExecutor] Executing ${pendingActions.length} pending actions...`);
  const results = [];
  
  for (const action of pendingActions) {
    try {
      const actionContext = { ...action.context, _createdRecord: createdRecord };
      
      if (action.type === 'update') {
        // Ejecutar update a otra tabla
        const dataDb = await connectDB(getTableDataDbName(workspaceId, action.targetTable));
        
        // Buscar el registro a actualizar
        let filterValue;
        if (action.filterValueType === 'trigger' && action.filterValueField) {
          filterValue = actionContext[action.filterValueField];
        }
        
        if (!filterValue || !action.filterField) {
          console.warn(`[FlowExecutor] Cannot execute pending update: missing filter`);
          continue;
        }
        
        // Búsqueda case-insensitive
        const allDocs = await dataDb.find({
          selector: {
            tableId: action.targetTable,
            $or: [
              { main: { $exists: false } },
              { main: { $ne: true } },
            ],
          },
          limit: 100,
        });
        
        const searchLower = String(filterValue).toLowerCase().trim();
        const docToUpdate = (allDocs.docs || []).find(d => {
          const fieldVal = d[action.filterField];
          return fieldVal && String(fieldVal).toLowerCase().trim() === searchLower;
        });
        
        if (!docToUpdate) {
          console.warn(`[FlowExecutor] No document found to update for ${action.filterField}=${filterValue}`);
          continue;
        }
        
        // Procesar los campos a actualizar
        const updates = {};
        for (const [key, valueTemplate] of Object.entries(action.fields || {})) {
          let processedValue = processTemplate(String(valueTemplate), actionContext);
          
          // Evaluar expresiones matemáticas
          if (/[\+\-\*\/]/.test(processedValue)) {
            try {
              // Limpiar para evaluación segura
              if (/^[\d\s\+\-\*\/\.]+$/.test(processedValue)) {
                processedValue = String(new Function(`return (${processedValue})`)());
              }
            } catch (e) {
              console.warn(`[FlowExecutor] Could not evaluate expression: ${processedValue}`);
            }
          }
          
          updates[key] = isNaN(Number(processedValue)) ? processedValue : Number(processedValue);
        }
        
        // Aplicar updates
        const updatedDoc = { ...docToUpdate, ...updates };
        await dataDb.insert(updatedDoc);
        
        console.log(`[FlowExecutor] Updated ${action.targetTableName}: ${JSON.stringify(updates)}`);
        results.push({ type: 'update', table: action.targetTableName, success: true, updates });
        
      } else if (action.type === 'create') {
        // Ejecutar create en otra tabla
        const dataDb = await connectDB(getTableDataDbName(workspaceId, action.targetTable));
        
        const newRecord = { tableId: action.targetTable };
        for (const [key, valueTemplate] of Object.entries(action.fields || {})) {
          newRecord[key] = processTemplate(String(valueTemplate), actionContext);
        }
        
        await dataDb.insert(newRecord);
        
        console.log(`[FlowExecutor] Created in ${action.targetTableName}: ${JSON.stringify(newRecord)}`);
        results.push({ type: 'create', table: action.targetTableName, success: true });
      }
      
    } catch (error) {
      console.error(`[FlowExecutor] Error executing pending action:`, error.message);
      results.push({ type: action.type, table: action.targetTableName, success: false, error: error.message });
    }
  }
  
  return { executed: results.length, results };
}

export default {
  executeFlowsForTrigger,
  executeBeforeCreateFlows,
};

export { executePendingActions };
