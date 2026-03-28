/**
 * AdvancedFeaturesController - Controlador para las funcionalidades avanzadas del sistema
 * 
 * Este controlador expone los endpoints necesarios para gestionar las siguientes características avanzadas:
 * - Generación y gestión de flujos mediante IA (AI Flow Builder).
 * - Ejecución y monitoreo de flujos.
 * - Gestión de variables globales.
 * - Análisis de conversaciones.
 * - Diagnóstico y optimización de flujos (Flow Doctor).
 * - Configuración y manejo de webhooks.
 * - Reproducción de conversaciones.
 * - Colaboración en tiempo real.
 * - Integraciones con servicios externos.
 * - Gestión de plantillas de flujos.
 */

import * as AIFlowBuilder from '../services/AIFlowBuilder.js';
import * as FlowExecutionService from '../services/FlowExecutionService.js';
import * as GlobalVariablesService from '../services/GlobalVariablesService.js';
import * as ConversationAnalyticsService from '../services/ConversationAnalyticsService.js';
import * as FlowDoctorService from '../services/FlowDoctorService.js';
import * as WebhookService from '../services/WebhookService.js';
import * as ConversationReplayService from '../services/ConversationReplayService.js';
import * as CollaborationService from '../services/CollaborationService.js';
import * as IntegrationsService from '../services/IntegrationsService.js';
import * as TemplatesService from '../services/TemplatesService.js';
import logger from '../config/logger.js';
import fetch from 'node-fetch';

const log = logger.child('AdvancedFeaturesController');

// ==================== AI FLOW BUILDER ====================

/**
 * Genera un flujo a partir de una descripción en lenguaje natural proporcionada por el usuario.
 * Utiliza un modelo de IA para interpretar la descripción y crear un flujo automatizado.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function generateFlowFromDescription(req, res) {
  try {
    const { workspaceId } = req.params;
    const { description, options } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Se requiere una descripción en lenguaje natural para generar el flujo.' });
    }
    
    const flow = await AIFlowBuilder.generateFlowFromDescription(description, options);
    
    res.json({ success: true, flow });
  } catch (error) {
    log.error('Error al generar el flujo a partir de la descripción.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Proporciona sugerencias para mejorar un flujo existente.
 * Analiza el flujo actual y sugiere optimizaciones o ajustes para mejorar su desempeño.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function suggestFlowImprovements(req, res) {
  try {
    const { flow } = req.body;
    
    if (!flow) {
      return res.status(400).json({ error: 'Se requiere un flujo para sugerir mejoras.' });
    }
    
    const suggestions = await AIFlowBuilder.suggestFlowImprovements(flow);
    
    res.json({ success: true, suggestions });
  } catch (error) {
    log.error('Error al sugerir mejoras para el flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Genera una descripción en lenguaje natural para un flujo existente.
 * Permite entender de manera clara y sencilla el propósito y funcionamiento del flujo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function describeFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const description = await AIFlowBuilder.describeFlow(flow);
    
    res.json({ success: true, description });
  } catch (error) {
    log.error('Error al generar la descripción del flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Completa automáticamente un flujo parcial utilizando IA.
 * Basado en el contexto y el flujo parcial proporcionado, genera las partes faltantes del flujo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function autocompleteFlow(req, res) {
  try {
    const { partialFlow, context } = req.body;
    
    const completion = await AIFlowBuilder.autocompleteFlow(partialFlow, context);
    
    res.json({ success: true, completion });
  } catch (error) {
    log.error('Error al autocompletar el flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== FLOW EXECUTION ====================

/**
 * Ejecuta un flujo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function executeFlow(req, res) {
  try {
    const { workspaceId } = req.params;
    const { flowId, context, initialData } = req.body;
    
    const result = await FlowExecutionService.executeFlowById(
      workspaceId,
      flowId,
      initialData || {},
      context || {}
    );
    
    res.json({ success: true, execution: result });
  } catch (error) {
    log.error('Error ejecutando el flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene historial de ejecuciones.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getExecutionHistory(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    const { limit } = req.query;
    
    const service = FlowExecutionService.getFlowExecutionService();
    const history = await service.getExecutionHistory(
      workspaceId,
      flowId,
      parseInt(limit) || 20
    );
    
    res.json({ success: true, history });
  } catch (error) {
    log.error('Error obteniendo el historial de ejecuciones.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== GLOBAL VARIABLES ====================

/**
 * Lista variables globales.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getGlobalVariables(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const variables = await GlobalVariablesService.getVariables(workspaceId);
    
    res.json({ success: true, variables });
  } catch (error) {
    log.error('Error obteniendo variables globales.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea o actualiza una variable.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function upsertGlobalVariable(req, res) {
  try {
    const { workspaceId } = req.params;
    const variableData = req.body;
    
    const variable = await GlobalVariablesService.upsertVariable(workspaceId, variableData);
    
    res.json({ success: true, variable });
  } catch (error) {
    log.error('Error al crear o actualizar la variable.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina una variable.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function deleteGlobalVariable(req, res) {
  try {
    const { workspaceId, variableId } = req.params;
    
    await GlobalVariablesService.deleteVariable(workspaceId, variableId);
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error al eliminar la variable.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== CONVERSATION ANALYTICS ====================

/**
 * Obtiene estadísticas de conversaciones.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getConversationStats(req, res) {
  try {
    const { workspaceId } = req.params;
    const { from, to } = req.query;
    
    const stats = await ConversationAnalyticsService.getConversationStats(
      workspaceId,
      { from, to }
    );
    
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error obteniendo estadísticas de conversaciones.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Análisis de conversaciones con IA.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function analyzeConversationsWithAI(req, res) {
  try {
    const { workspaceId } = req.params;
    const { limit } = req.query;
    
    const analysis = await ConversationAnalyticsService.analyzeConversationsWithAI(
      workspaceId,
      parseInt(limit) || 50
    );
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error al analizar las conversaciones.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Último análisis de conversaciones con IA (persistido)
 */
export async function getLatestAIAnalysis(req, res) {
  try {
    const { workspaceId } = req.params;
    const result = await ConversationAnalyticsService.getLatestAIAnalysis(workspaceId);
    res.json({ success: result.success, analysis: result.analysis, error: result.error });
  } catch (error) {
    log.error('Error obteniendo el último análisis IA.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Métricas en tiempo real.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getRealTimeMetrics(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const metrics = await ConversationAnalyticsService.getRealTimeMetrics(workspaceId);
    
    res.json({ success: true, metrics });
  } catch (error) {
    log.error('Error obteniendo métricas en tiempo real.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== FLOW DOCTOR ====================

/**
 * Analiza un flujo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function analyzeFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const analysis = FlowDoctorService.analyzeFlow(flow);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error al analizar el flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Análisis de flujo con IA.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function analyzeFlowWithAI(req, res) {
  try {
    const { flow, businessContext } = req.body;
    
    const analysis = await FlowDoctorService.analyzeFlowWithAI(flow, businessContext);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error al analizar el flujo con IA.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Auto-arregla un flujo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function autoFixFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const fixed = FlowDoctorService.autoFix(flow);
    
    res.json({ success: true, fixed });
  } catch (error) {
    log.error('Error al auto-fixar el flujo.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== WEBHOOKS ====================

/**
 * Lista webhooks.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function listWebhooks(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const webhooks = await WebhookService.listWebhooks(workspaceId);
    
    res.json({ success: true, webhooks });
  } catch (error) {
    log.error('Error obteniendo webhooks.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea un webhook.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function createWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    const { flowId, ...options } = req.body;
    
    const webhook = await WebhookService.createWebhook(workspaceId, flowId, options);
    
    res.json({ success: true, webhook });
  } catch (error) {
    log.error('Error al crear el webhook.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Actualiza un webhook.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function updateWebhook(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    const updates = req.body;
    
    const webhook = await WebhookService.updateWebhook(workspaceId, webhookId, updates);
    
    res.json({ success: true, webhook });
  } catch (error) {
    log.error('Error al actualizar el webhook.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina un webhook.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function deleteWebhook(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    
    const ok = await WebhookService.deleteWebhook(workspaceId, webhookId);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Webhook no encontrado' });
    }
  } catch (error) {
    log.error('Error al eliminar el webhook.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Procesa llamada a webhook (público).
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function processWebhookCall(req, res) {
  try {
    const { path } = req.params;
    const ip = req.ip || req.connection?.remoteAddress;
    
    const result = await WebhookService.processWebhookCall(
      path,
      req.method,
      req.headers,
      req.body,
      req.query,
      ip
    );
    
    res.status(result.status).json(result.success ? result.data : { error: result.error });
  } catch (error) {
    log.error('Error procesando webhook', { error: error.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Genera código de ejemplo para un webhook.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getWebhookCode(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    const { language } = req.query;
    
    const webhooks = await WebhookService.listWebhooks(workspaceId);
    const webhook = webhooks.find(w => w._id === webhookId);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook no encontrado' });
    }
    
    const code = WebhookService.generateIntegrationCode(webhook, language || 'javascript');
    
    res.json({ success: true, code });
  } catch (error) {
    log.error('Error obteniendo el código del webhook.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Prueba un webhook con datos de ejemplo.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function testWebhook(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    
    log.info('Testing webhook', { workspaceId, webhookId });
    
    const result = await WebhookService.testWebhook(workspaceId, webhookId);
    
    if (result.success) {
      res.json({ success: true, result: result.data, status: result.status });
    } else {
      const statusCode = result.status || 400;
      res.status(statusCode).json({ success: false, error: result.error });
    }
  } catch (error) {
    log.error('Error testing webhook', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: error.message });
  }
}

// ==================== CONVERSATION REPLAY ====================

/**
 * Obtiene timeline de una conversación.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getConversationTimeline(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    const timeline = await ConversationReplayService.getConversationTimeline(workspaceId, chatId);
    
    res.json({ success: true, timeline });
  } catch (error) {
    log.error('Error obteniendo la timeline de la conversación.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Detalles de un mensaje.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getMessageDetails(req, res) {
  try {
    const { workspaceId, messageId } = req.params;
    
    const details = await ConversationReplayService.getMessageDetails(workspaceId, messageId);
    
    res.json({ success: true, details });
  } catch (error) {
    log.error('Error obteniendo los detalles del mensaje.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Analiza conversación con IA.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function analyzeConversation(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    const analysis = await ConversationReplayService.analyzeConversationWithAI(workspaceId, chatId);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error al analizar la conversación.', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Simula respuesta alternativa.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function simulateAlternativeResponse(req, res) {
  try {
    const { workspaceId, messageId } = req.params;
    const { alternativePrompt } = req.body;
    
    const simulation = await ConversationReplayService.simulateAlternativeResponse(
      workspaceId,
      messageId,
      alternativePrompt
    );
    
    res.json({ success: true, simulation });
  } catch (error) {
    log.error('Error simulating response', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Exporta conversación.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function exportConversation(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    const { format } = req.query;
    
    const exported = await ConversationReplayService.exportConversation(
      workspaceId,
      chatId,
      format || 'json'
    );
    
    const mimeTypes = {
      json: 'application/json',
      markdown: 'text/markdown',
      html: 'text/html',
      csv: 'text/csv'
    };
    
    res.setHeader('Content-Type', mimeTypes[format] || 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=conversation_${chatId}.${format || 'json'}`);
    res.send(exported);
  } catch (error) {
    log.error('Error exporting conversation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== COLLABORATION ====================

/**
 * Obtiene usuarios activos en una sesión de edición.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getActiveCollaborators(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    
    const users = CollaborationService.getActiveUsers(workspaceId, flowId);
    
    res.json({ success: true, users });
  } catch (error) {
    log.error('Error obteniendo colaboradores', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene historial de cambios.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getChangeHistory(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    
    const history = CollaborationService.getChangeHistory(workspaceId, flowId);
    
    res.json({ success: true, history });
  } catch (error) {
    log.error('Error obteniendo el historial de cambios', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Estadísticas de sesiones de colaboración.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getCollaborationStats(req, res) {
  try {
    const stats = CollaborationService.getSessionStats();
    
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error obteniendo estadísticas de colaboración', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== INTEGRATIONS ====================

/**
 * Lista integraciones disponibles.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function listAvailableIntegrations(req, res) {
  try {
    const { category } = req.query;
    
    const integrations = IntegrationsService.listAvailableIntegrations(category);
    
    res.json({ success: true, integrations });
  } catch (error) {
    log.error('Error obteniendo integraciones', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Categorías de integraciones.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getIntegrationCategories(req, res) {
  try {
    const categories = IntegrationsService.getCategories();
    
    res.json({ success: true, categories });
  } catch (error) {
    log.error('Error obteniendo categorías de integraciones', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Conecta una integración.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function connectIntegration(req, res) {
  try {
    const { workspaceId } = req.params;
    const { integrationId, credentials } = req.body;
    
    const connection = await IntegrationsService.connectIntegration(
      workspaceId,
      integrationId,
      credentials
    );
    
    res.json({ success: true, connection });
  } catch (error) {
    log.error('Error conectando la integración', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Lista integraciones conectadas.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function listConnectedIntegrations(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const integrations = await IntegrationsService.listConnectedIntegrations(workspaceId);
    
    res.json({ success: true, integrations });
  } catch (error) {
    log.error('Error obteniendo las integraciones conectadas', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Desconecta una integración.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function disconnectIntegration(req, res) {
  try {
    const { workspaceId, connectionId } = req.params;
    
    await IntegrationsService.disconnectIntegration(workspaceId, connectionId);
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error desconectando la integración', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Conecta un bot de Telegram.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function connectTelegram(req, res) {
  try {
    const { workspaceId } = req.params;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Se requiere el token del bot' });
    }
    
    // Validar el token con la API de Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const botInfo = await telegramResponse.json();
    
    if (!botInfo.ok) {
      return res.status(400).json({ error: 'Token invalido. Verifica que el token sea correcto.' });
    }
    
    // Guardar la conexión usando el servicio de integraciones
    const connection = await IntegrationsService.saveTelegramConnection(workspaceId, {
      token,
      botId: botInfo.result.id,
      botUsername: botInfo.result.username,
      botName: botInfo.result.first_name
    });
    
    // Configurar webhook automáticamente
    let webhookConfigured = false;
    // URL de ngrok para desarrollo (cambiar en producción)
    const backendUrl = process.env.BACKEND_URL || process.env.WEBHOOKS_URL || 'https://haplologic-misael-archaeologically.ngrok-free.dev';
    if (backendUrl) {
      try {
        const webhookUrl = `${backendUrl}/api/telegram/webhook/${workspaceId}`;
        const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: webhookUrl,
            allowed_updates: ['message', 'callback_query', 'edited_message']
          })
        });
        const webhookResult = await webhookResponse.json();
        webhookConfigured = webhookResult.ok;
        
        if (webhookConfigured) {
          log.info('Telegram webhook configurado automaticamente', { workspaceId, webhookUrl });
        }
      } catch (webhookErr) {
        log.warn('No se pudo configurar webhook automaticamente', { error: webhookErr.message });
      }
    }
    
    log.info('Telegram bot connected', { 
      workspaceId, 
      botUsername: botInfo.result.username,
      webhookConfigured
    });
    
    res.json({ 
      success: true, 
      connection,
      bot: {
        username: botInfo.result.username,
        name: botInfo.result.first_name
      },
      webhookConfigured,
      webhookNote: webhookConfigured 
        ? 'Webhook configurado automaticamente. El bot esta listo para recibir mensajes.'
        : 'Configura el webhook manualmente con tu URL publica (ngrok en desarrollo).'
    });
  } catch (error) {
    log.error('Error conectando Telegram', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Ejecuta acción de integración.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function executeIntegrationAction(req, res) {
  try {
    const { workspaceId, connectionId } = req.params;
    const { action, params } = req.body;
    
    const result = await IntegrationsService.executeIntegrationAction(
      workspaceId,
      connectionId,
      action,
      params
    );
    
    res.json({ success: true, result });
  } catch (error) {
    log.error('Error ejecutando la acción de integración', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== TEMPLATES ====================

/**
 * Lista templates disponibles.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function listTemplates(req, res) {
  try {
    const { category, industry, search } = req.query;
    
    const templates = TemplatesService.listTemplates({ category, industry, search });
    
    res.json({ success: true, templates });
  } catch (error) {
    log.error('Error obteniendo templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene un template por ID.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getTemplate(req, res) {
  try {
    const { templateId } = req.params;
    
    const template = TemplatesService.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }
    
    res.json({ success: true, template });
  } catch (error) {
    log.error('Error obteniendo el template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Categorías de templates.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getTemplateCategories(req, res) {
  try {
    const categories = TemplatesService.getCategories();
    
    res.json({ success: true, categories });
  } catch (error) {
    log.error('Error obteniendo categorías de templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Sugiere templates con IA.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function suggestTemplates(req, res) {
  try {
    const { businessDescription } = req.body;
    
    if (!businessDescription) {
      return res.status(400).json({ error: 'Se requiere descripción del negocio' });
    }
    
    const suggestions = await TemplatesService.suggestTemplates(businessDescription);
    
    res.json({ success: true, suggestions });
  } catch (error) {
    log.error('Error sugeriendo templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Instala un template.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function installTemplate(req, res) {
  try {
    const { workspaceId, templateId } = req.params;
    const { customVariables } = req.body;
    
    const result = await TemplatesService.installTemplate(
      workspaceId,
      templateId,
      customVariables || {}
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    log.error('Error instalando el template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Genera template personalizado con IA.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function generateCustomTemplate(req, res) {
  try {
    const { businessInfo } = req.body;
    
    const template = await TemplatesService.generateCustomTemplate(businessInfo);
    
    res.json({ success: true, template });
  } catch (error) {
    log.error('Error generando el template personalizado', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Guarda flujo como template.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function saveFlowAsTemplate(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    const templateInfo = req.body;
    
    const template = await TemplatesService.saveAsTemplate(workspaceId, flowId, templateInfo);
    
    res.json({ success: true, template });
  } catch (error) {
    log.error('Error guardando el flujo como template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== MOBILE API ====================

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';

/**
 * Obtiene o genera API key para mobile.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function getMobileApiKey(req, res) {
  try {
    const { workspaceId } = req.params;
    const db = await connectDB('chatbot_mobile_keys');
    
    // Buscar API key existente
    const keyDoc = await db.get(`mobile_api_key_${workspaceId}`).catch(() => null);
    
    if (keyDoc) {
      res.json({ success: true, apiKey: keyDoc.apiKey });
    } else {
      res.json({ success: true, apiKey: null });
    }
  } catch (error) {
    log.error('Error obteniendo la API key para mobile', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Genera nueva API key para mobile.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function generateMobileApiKey(req, res) {
  try {
    const { workspaceId } = req.params;
    const db = await connectDB('chatbot_mobile_keys');
    
    const apiKey = `mob_${uuidv4().replace(/-/g, '')}`;
    
    // Guardar o actualizar
    const existingDoc = await db.get(`mobile_api_key_${workspaceId}`).catch(() => null);
    
    if (existingDoc) {
      await db.insert({
        ...existingDoc,
        apiKey,
        updatedAt: new Date().toISOString()
      });
    } else {
      await db.insert({
        _id: `mobile_api_key_${workspaceId}`,
        type: 'mobile_api_key',
        workspaceId,
        apiKey,
        createdAt: new Date().toISOString()
      });
    }
    
    res.json({ success: true, apiKey });
  } catch (error) {
    log.error('Error generando la API key para mobile', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Revoca API key.
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function revokeMobileApiKey(req, res) {
  try {
    const { workspaceId } = req.params;
    const db = await connectDB('chatbot_mobile_keys');
    
    const keyDoc = await db.get(`mobile_api_key_${workspaceId}`).catch(() => null);
    
    if (keyDoc) {
      await db.destroy(keyDoc._id, keyDoc._rev);
    }
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error revocando la API key', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Middleware para validar API key de mobile.
 * 
 * @param {String} apiKey - La API key.
 * @param {String} workspaceId - El ID del workspace.
 */
async function validateMobileApiKey(apiKey, workspaceId) {
  if (!apiKey) return false;
  
  const db = await connectDB('chatbot_mobile_keys');
  const keyDoc = await db.get(`mobile_api_key_${workspaceId}`).catch(() => null);
  
  return keyDoc && keyDoc.apiKey === apiKey;
}

/**
 * Endpoint público para mobile: stats
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileGetStats(req, res) {
  try {
    const { workspaceId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const stats = await ConversationAnalyticsService.getRealTimeMetrics(workspaceId);
    
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error obteniendo los stats del mobile', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: lista de chats
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileGetChats(req, res) {
  try {
    const { workspaceId } = req.params;
    const apiKey = req.headers['x-api-key'];
    const { status, limit } = req.query;
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const db = await connectDB();
    const result = await db.find({
      selector: {
        type: 'chat',
        workspaceId,
        ...(status && { status })
      },
      limit: parseInt(limit) || 50,
      sort: [{ createdAt: 'desc' }]
    });
    
    res.json({ success: true, chats: result.docs });
  } catch (error) {
    log.error('Error obteniendo los chats del mobile', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: mensajes de un chat
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileGetChatMessages(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const db = await connectDB();
    const chat = await db.get(chatId).catch(() => null);
    
    if (!chat || chat.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }
    
    res.json({ success: true, messages: chat.messages || [] });
  } catch (error) {
    log.error('Error obteniendo los mensajes del chat', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: enviar respuesta
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileSendReply(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    const apiKey = req.headers['x-api-key'];
    const { message } = req.body;
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Se requiere mensaje' });
    }
    
    const db = await connectDB();
    const chat = await db.get(chatId).catch(() => null);
    
    if (!chat || chat.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }
    
    // Agregar mensaje
    const newMessage = {
      role: 'operator',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    chat.messages = chat.messages || [];
    chat.messages.push(newMessage);
    
    await db.insert(chat);
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    log.error('Error enviando la respuesta', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: notificaciones
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileGetNotifications(req, res) {
  try {
    const { workspaceId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const db = await connectDB();
    const result = await db.find({
      selector: {
        type: 'notification',
        workspaceId,
        read: { $ne: true }
      },
      limit: 100,
      sort: [{ createdAt: 'desc' }]
    });
    
    res.json({ success: true, notifications: result.docs });
  } catch (error) {
    log.error('Error obteniendo las notificaciones', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: estado de flujos
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 */
export async function mobileGetFlowsStatus(req, res) {
  try {
    const { workspaceId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const db = await connectDB();
    const result = await db.find({
      selector: {
        type: 'flow',
        workspaceId
      }
    });
    
    const flows = result.docs.map(f => ({
      id: f._id,
      name: f.name,
      active: f.active,
      lastRun: f.lastRunAt,
      runCount: f.runCount || 0
    }));
    
    res.json({ success: true, flows });
  } catch (error) {
    log.error('Error obteniendo el estado de los flujos', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

export default {
  // AI Flow Builder
  generateFlowFromDescription,
  suggestFlowImprovements,
  describeFlow,
  autocompleteFlow,
  
  // Flow Execution
  executeFlow,
  getExecutionHistory,
  
  // Global Variables
  getGlobalVariables,
  upsertGlobalVariable,
  deleteGlobalVariable,
  
  // Conversation Analytics
  getConversationStats,
  analyzeConversationsWithAI,
  getLatestAIAnalysis,
  getRealTimeMetrics,
  
  // Flow Doctor
  analyzeFlow,
  analyzeFlowWithAI,
  autoFixFlow,
  
  // Webhooks
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  processWebhookCall,
  getWebhookCode,
  testWebhook,
  
  // Conversation Replay
  getConversationTimeline,
  getMessageDetails,
  analyzeConversation,
  simulateAlternativeResponse,
  exportConversation,
  
  // Collaboration
  getActiveCollaborators,
  getChangeHistory,
  getCollaborationStats,
  
  // Integrations
  listAvailableIntegrations,
  getIntegrationCategories,
  connectIntegration,
  listConnectedIntegrations,
  disconnectIntegration,
  executeIntegrationAction,
  
  // Templates
  listTemplates,
  getTemplate,
  getTemplateCategories,
  suggestTemplates,
  installTemplate,
  generateCustomTemplate,
  saveFlowAsTemplate,
  
  // Mobile API
  getMobileApiKey,
  generateMobileApiKey,
  revokeMobileApiKey,
  mobileGetStats,
  mobileGetChats,
  mobileGetChatMessages,
  mobileSendReply,
  mobileGetNotifications,
  mobileGetFlowsStatus
};
