/**
 * FlowExecutor - Ejecuta flujos automáticamente cuando se disparan triggers
 * 
 * Este servicio escucha eventos como RECORD_CREATED y ejecuta los flujos
 * configurados que tienen ese trigger.
 */

import { connectDB, getFlowsDbName, getTableDataDbName, getWorkspaceDbName } from '../config/db.js';
import { processTemplate } from './flowEngine.js';
import { v4 as uuidv4 } from 'uuid';

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
 */
async function executeQuery(query, context, workspaceId) {
  const { targetTable, filter, outputVar, filterField, filterValueType, filterValueField, filterValueFixed } = query;
  
  try {
    const dataDb = await connectDB(getTableDataDbName(workspaceId, targetTable));
    
    // Construir el filtro
    const processedFilter = { tableId: targetTable };
    
    // Nuevo formato simplificado
    if (filterField) {
      let filterValue;
      if (filterValueType === 'trigger' && filterValueField) {
        // Valor del registro que disparó el flujo
        filterValue = context[filterValueField];
      } else if (filterValueType === 'fixed') {
        filterValue = filterValueFixed;
      }
      
      if (filterValue !== undefined) {
        processedFilter[filterField] = filterValue;
      }
      console.log(`[FlowExecutor] Query filter: ${filterField} = ${filterValue}`);
    }
    // Formato viejo con objeto filter
    else if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        processedFilter[key] = processTemplate(String(value), context);
      }
    }
    
    const result = await dataDb.find({
      selector: processedFilter,
      limit: 1,
    });
    
    const doc = result.docs?.[0] || null;
    
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

export default {
  executeFlowsForTrigger,
};
