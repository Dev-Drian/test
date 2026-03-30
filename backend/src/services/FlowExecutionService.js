/**
 * FlowExecutionService - Motor de ejecución de flujos con tracking en tiempo real
 * 
 * Características:
 * - Ejecuta flujos paso a paso
 * - Emite eventos en tiempo real via Socket.io
 * - Guarda historial de ejecuciones
 * - Soporta retry y manejo de errores
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import { getSocketService } from '../realtime/SocketService.js';
import { processTemplate } from './flowEngine.js';

const log = logger.child('FlowExecution');

// Estados de ejecución
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  WAITING: 'waiting',
  CANCELLED: 'cancelled'
};

// Estados de nodo
export const NODE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * Clase principal del ejecutor de flujos
 */
class FlowExecutionService {
  constructor() {
    this.activeExecutions = new Map();
  }
  
  /**
   * Ejecuta un flujo completo
   * @param {object} flow - Flujo a ejecutar
   * @param {object} triggerData - Datos del trigger
   * @param {object} options - Opciones de ejecución
   */
  async executeFlow(flow, triggerData = {}, options = {}) {
    const executionId = uuidv4();
    const workspaceId = options.workspaceId || flow.workspaceId;
    
    // Crear registro de ejecución
    const execution = {
      _id: executionId,
      flowId: flow._id,
      flowName: flow.name,
      workspaceId,
      status: EXECUTION_STATUS.RUNNING,
      triggerData,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      duration: null,
      nodeExecutions: [],
      variables: { ...triggerData },
      error: null,
      retryCount: options.retryCount || 0,
      parentExecutionId: options.parentExecutionId || null
    };
    
    this.activeExecutions.set(executionId, execution);
    
    // Emitir inicio
    this._emit(workspaceId, 'flow:execution:started', {
      executionId,
      flowId: flow._id,
      flowName: flow.name
    });
    
    log.info('Flow execution started', { executionId, flowId: flow._id });
    
    try {
      // Encontrar nodo trigger
      const triggerNode = flow.nodes.find(n => n.type === 'trigger' || n.type === 'start');
      if (!triggerNode) {
        throw new Error('No se encontró nodo trigger');
      }
      
      // Ejecutar desde el trigger
      await this._executeFromNode(triggerNode.id, flow, execution);
      
      // Marcar como completado
      execution.status = EXECUTION_STATUS.COMPLETED;
      execution.finishedAt = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startedAt).getTime();
      
      this._emit(workspaceId, 'flow:execution:completed', {
        executionId,
        flowId: flow._id,
        duration: execution.duration,
        result: execution.variables
      });
      
      log.info('Flow execution completed', { executionId, duration: execution.duration });
      
    } catch (error) {
      execution.status = EXECUTION_STATUS.FAILED;
      execution.error = error.message;
      execution.finishedAt = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startedAt).getTime();
      
      this._emit(workspaceId, 'flow:execution:failed', {
        executionId,
        flowId: flow._id,
        error: error.message
      });
      
      log.error('Flow execution failed', { executionId, error: error.message });
    }
    
    // Guardar ejecución en BD
    await this._saveExecution(execution);
    this.activeExecutions.delete(executionId);
    
    return execution;
  }
  
  /**
   * Ejecuta nodos secuencialmente desde un nodo inicial
   */
  async _executeFromNode(nodeId, flow, execution, visited = new Set()) {
    // Prevenir loops infinitos
    if (visited.has(nodeId)) {
      log.warn('Loop detected, skipping node', { nodeId });
      return;
    }
    visited.add(nodeId);
    
    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Crear registro de ejecución del nodo
    const nodeExecution = {
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.data?.label || node.type,
      status: NODE_STATUS.RUNNING,
      startedAt: new Date().toISOString(),
      input: { ...execution.variables },
      output: null,
      error: null
    };
    
    execution.nodeExecutions.push(nodeExecution);
    
    // Emitir que el nodo está ejecutándose
    this._emit(execution.workspaceId, 'flow:node:running', {
      executionId: execution._id,
      nodeId: node.id,
      nodeName: nodeExecution.nodeName
    });
    
    // Delay para visualización
    await this._delay(300);
    
    try {
      // Ejecutar el nodo
      const result = await this._executeNode(node, execution);
      
      nodeExecution.status = NODE_STATUS.SUCCESS;
      nodeExecution.output = result.output;
      nodeExecution.finishedAt = new Date().toISOString();
      
      // Actualizar variables con output
      if (result.output) {
        Object.assign(execution.variables, result.output);
      }
      
      // Emitir éxito
      this._emit(execution.workspaceId, 'flow:node:completed', {
        executionId: execution._id,
        nodeId: node.id,
        output: result.output
      });
      
      // Encontrar siguiente(s) nodo(s)
      const nextNodes = this._findNextNodes(node.id, flow.edges, result.condition);
      
      for (const nextNodeId of nextNodes) {
        await this._executeFromNode(nextNodeId, flow, execution, visited);
      }
      
    } catch (error) {
      nodeExecution.status = NODE_STATUS.FAILED;
      nodeExecution.error = error.message;
      nodeExecution.finishedAt = new Date().toISOString();
      
      this._emit(execution.workspaceId, 'flow:node:failed', {
        executionId: execution._id,
        nodeId: node.id,
        error: error.message
      });
      
      // Propagar error si no hay manejo
      if (!node.data?.continueOnError) {
        throw error;
      }
    }
  }
  
  /**
   * Ejecuta un nodo individual según su tipo
   */
  async _executeNode(node, execution) {
    const data = node.data || {};
    const vars = execution.variables;
    
    switch (node.type) {
      case 'trigger':
      case 'start':
        return { output: vars };
        
      case 'condition':
        const conditionResult = this._evaluateCondition(data.condition, vars);
        return { output: { conditionResult }, condition: conditionResult ? 'true' : 'false' };
        
      case 'action':
        return await this._executeAction(data, vars, execution);
        
      case 'query':
        return await this._executeQuery(data, vars, execution);
        
      case 'response':
        const responseText = processTemplate(data.responseTemplate || data.label, vars);
        return { output: { response: responseText } };
        
      case 'set_variable':
        const varName = data.variableName;
        const varValue = processTemplate(data.value, vars);
        return { output: { [varName]: varValue } };
        
      case 'wait':
        const delayMs = (data.delay || 1) * 1000;
        await this._delay(delayMs);
        return { output: { waited: delayMs } };
        
      case 'http':
      case 'webhook':
        return await this._executeHttp(data, vars);
        
      case 'loop':
        // Simplificado - en producción sería más complejo
        return { output: { loopCompleted: true } };
        
      default:
        return { output: {} };
    }
  }
  
  /**
   * Ejecuta una acción (CRUD, notificaciones, etc.)
   */
  async _executeAction(data, vars, execution) {
    const actionType = data.actionType || data.type;
    
    switch (actionType) {
      case 'create_record':
      case 'insert':
        // Aquí iría la lógica real de crear registro
        return { output: { created: true, recordId: uuidv4() } };
        
      case 'update_record':
      case 'update':
        return { output: { updated: true } };
        
      case 'delete_record':
      case 'delete':
        return { output: { deleted: true } };
        
      case 'send_whatsapp':
        const message = processTemplate(data.message, vars);
        log.info('Would send WhatsApp', { to: data.to, message });
        return { output: { sent: true, channel: 'whatsapp', message } };
        
      case 'send_email':
      case 'sendEmail': {
        const emailTo      = processTemplate(data.to || data.email || '', vars);
        const emailSubject = processTemplate(data.subject || 'Notificación', vars);
        const emailBody    = processTemplate(data.body || data.message || data.html || '', vars);

        if (!emailTo) {
          log.warn('[FlowExec] send_email: destinatario vacío, se omite');
          return { output: { sent: false, channel: 'email', reason: 'no_recipient' } };
        }

        try {
          const { getEmailService } = await import('./EmailService.js');
          const result = await getEmailService().send({
            to: emailTo,
            subject: emailSubject,
            html: emailBody.includes('<') ? emailBody : `<p style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#334155;">${emailBody.replace(/\n/g, '<br>')}</p>`,
            text: emailBody,
          });
          log.info('[FlowExec] Email enviado', { to: emailTo, subject: emailSubject, id: result.id });
          return { output: { sent: true, channel: 'email', id: result.id } };
        } catch (emailErr) {
          log.error('[FlowExec] Error enviando email', { error: emailErr.message });
          return { output: { sent: false, channel: 'email', error: emailErr.message } };
        }
      }
        
      case 'send_sms':
        log.info('Would send SMS', { to: data.to });
        return { output: { sent: true, channel: 'sms' } };

      case 'http_request':
      case 'webhook': {
        const method  = (data.method || 'POST').toUpperCase();
        const rawUrl  = processTemplate(data.url || '', vars);

        if (!rawUrl) {
          log.warn('[FlowExec] http_request: URL vacía, se omite');
          return { output: { success: false, reason: 'no_url' } };
        }

        // ── SSRF: bloquear rangos privados y loopback ──────────────────────
        let parsedUrl;
        try { parsedUrl = new URL(rawUrl); } catch {
          return { output: { success: false, reason: 'invalid_url' } };
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        const BLOCKED = /^(localhost|127\.|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc00:|fe80:)/;
        if (BLOCKED.test(hostname)) {
          log.warn('[FlowExec] http_request: URL interna bloqueada por seguridad', { hostname });
          return { output: { success: false, reason: 'blocked_url' } };
        }
        // ──────────────────────────────────────────────────────────────────

        // Resolver headers (puede contener variables)
        const rawHeaders = data.headers || {};
        const resolvedHeaders = {};
        for (const [k, v] of Object.entries(rawHeaders)) {
          resolvedHeaders[k] = processTemplate(String(v), vars);
        }
        if (!resolvedHeaders['Content-Type'] && method !== 'GET') {
          resolvedHeaders['Content-Type'] = 'application/json';
        }

        // Resolver body
        let body = undefined;
        if (method !== 'GET' && data.body) {
          const rawBody = typeof data.body === 'string'
            ? processTemplate(data.body, vars)
            : processTemplate(JSON.stringify(data.body), vars);
          try { body = JSON.parse(rawBody); } catch { body = rawBody; }
        }

        // Query params para GET
        let finalUrl = rawUrl;
        if (method === 'GET' && data.params) {
          const qs = new URLSearchParams(
            Object.fromEntries(
              Object.entries(data.params).map(([k, v]) => [k, processTemplate(String(v), vars)])
            )
          ).toString();
          if (qs) finalUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${qs}`;
        }

        try {
          const { default: axios } = await import('axios');
          const response = await axios({
            method,
            url: finalUrl,
            headers: resolvedHeaders,
            data: body,
            timeout: data.timeout || 15000,
            maxContentLength: 1 * 1024 * 1024, // 1 MB de respuesta máx
            validateStatus: () => true, // no lanzar por 4xx/5xx
          });

          const responseData = response.data;
          const outputVar = data.outputVar || 'httpResponse';

          log.info('[FlowExec] http_request completado', {
            url: finalUrl, method, status: response.status, outputVar
          });

          if (response.status >= 400) {
            const errorMsg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
            if (data.onError === 'stop') {
              throw new Error(`http_request falló: ${errorMsg}`);
            }
            return { output: { success: false, status: response.status, error: errorMsg, [outputVar]: responseData } };
          }

          return { output: { success: true, status: response.status, [outputVar]: responseData } };

        } catch (httpErr) {
          log.error('[FlowExec] http_request error', { url: finalUrl, error: httpErr.message });
          if (data.onError === 'stop') throw httpErr;
          return { output: { success: false, error: httpErr.message } };
        }
      }

      case 'apply_mapping': {
        // Aplica un fieldMapping guardado en workspace a los vars actuales
        // data.mapping = { 'campo_destino': 'campo_origen' } o viene de vars.__mapping
        const mapping = data.mapping || vars.__integrationMapping || {};
        const mapped = {};
        for (const [destKey, srcKey] of Object.entries(mapping)) {
          const val = processTemplate(`{{${srcKey}}}`, vars);
          // Soportar rutas de objeto anidadas como 'client.name'
          const parts = destKey.split('.');
          let cursor = mapped;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!cursor[parts[i]]) cursor[parts[i]] = {};
            cursor = cursor[parts[i]];
          }
          cursor[parts[parts.length - 1]] = val;
        }
        const outputVar = data.outputVar || 'mappedPayload';
        return { output: { [outputVar]: mapped } };
      }
        
      default:
        return { output: { actionExecuted: actionType } };
    }
  }
  
  /**
   * Ejecuta una consulta a base de datos
   */
  async _executeQuery(data, vars, execution) {
    // Simplificado - en producción conectaría con las tablas reales
    const tableId = data.tableId;
    const filter = data.filter;
    
    log.info('Executing query', { tableId, filter });
    
    // Placeholder - simular resultado
    return {
      output: {
        queryResult: [],
        count: 0,
        tableId
      }
    };
  }
  
  /**
   * Ejecuta una petición HTTP
   */
  async _executeHttp(data, vars) {
    const url = processTemplate(data.url, vars);
    const method = data.method || 'GET';
    
    try {
      const response = await fetch(url, {
        method,
        headers: data.headers || {},
        body: method !== 'GET' ? JSON.stringify(data.body) : undefined
      });
      
      const responseData = await response.json().catch(() => response.text());
      
      return {
        output: {
          statusCode: response.status,
          data: responseData,
          success: response.ok
        }
      };
    } catch (error) {
      return {
        output: {
          error: error.message,
          success: false
        }
      };
    }
  }
  
  /**
   * Evalúa una condición
   */
  _evaluateCondition(condition, vars) {
    if (!condition) return true;
    
    try {
      // Reemplazar variables en la condición
      let evalCondition = condition;
      for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evalCondition = evalCondition.replace(regex, JSON.stringify(value));
      }
      
      // Evaluar de forma segura
      return new Function(`return ${evalCondition}`)();
    } catch {
      return true;
    }
  }
  
  /**
   * Encuentra los siguientes nodos a ejecutar
   */
  _findNextNodes(currentId, edges, condition) {
    const outgoing = edges.filter(e => e.source === currentId);
    
    if (condition) {
      // Buscar edge que coincida con la condición
      const matching = outgoing.find(e => 
        e.sourceHandle === condition ||
        e.label?.toLowerCase() === condition.toLowerCase()
      );
      if (matching) return [matching.target];
    }
    
    // Todos los edges salientes
    return outgoing.map(e => e.target);
  }
  
  /**
   * Emite evento via Socket.io
   */
  _emit(workspaceId, event, data) {
    try {
      const socketService = getSocketService();
      socketService.emitToWorkspace(workspaceId, event, data);
    } catch (error) {
      log.debug('Socket emit failed', { event, error: error.message });
    }
  }
  
  /**
   * Guarda la ejecución en base de datos
   */
  async _saveExecution(execution) {
    try {
      const dbName = `workspace_${execution.workspaceId}_flow_executions`;
      const db = await connectDB(dbName);
      await db.insert(execution);
    } catch (error) {
      log.error('Failed to save execution', { error: error.message });
    }
  }
  
  /**
   * Obtiene historial de ejecuciones
   */
  async getExecutionHistory(workspaceId, flowId, options = {}) {
    try {
      const dbName = `workspace_${workspaceId}_flow_executions`;
      const db = await connectDB(dbName);
      
      const selector = flowId ? { flowId } : {};
      const result = await db.find({
        selector,
        sort: [{ startedAt: 'desc' }],
        limit: options.limit || 50,
        skip: options.skip || 0
      });
      
      return result.docs || [];
    } catch (error) {
      log.error('Failed to get execution history', { error: error.message });
      return [];
    }
  }
  
  /**
   * Obtiene una ejecución específica
   */
  async getExecution(workspaceId, executionId) {
    // Primero verificar si está activa
    if (this.activeExecutions.has(executionId)) {
      return this.activeExecutions.get(executionId);
    }
    
    // Buscar en BD
    try {
      const dbName = `workspace_${workspaceId}_flow_executions`;
      const db = await connectDB(dbName);
      return await db.get(executionId);
    } catch {
      return null;
    }
  }
  
  /**
   * Cancela una ejecución activa
   */
  cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = EXECUTION_STATUS.CANCELLED;
      execution.finishedAt = new Date().toISOString();
      this._emit(execution.workspaceId, 'flow:execution:cancelled', { executionId });
      return true;
    }
    return false;
  }
  
  /**
   * Reintenta una ejecución fallida
   */
  async retryExecution(workspaceId, executionId, flow) {
    const oldExecution = await this.getExecution(workspaceId, executionId);
    if (!oldExecution) {
      throw new Error('Ejecución no encontrada');
    }
    
    return this.executeFlow(flow, oldExecution.triggerData, {
      workspaceId,
      retryCount: (oldExecution.retryCount || 0) + 1,
      parentExecutionId: executionId
    });
  }
  
  /**
   * Helper para delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let instance = null;

export function getFlowExecutionService() {
  if (!instance) {
    instance = new FlowExecutionService();
  }
  return instance;
}

export default FlowExecutionService;
