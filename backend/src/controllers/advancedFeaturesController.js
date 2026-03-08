/**
 * AdvancedFeaturesController - Controlador para las 12 features avanzadas
 * 
 * Expone los endpoints para:
 * - AI Flow Builder
 * - Flow Execution
 * - Global Variables
 * - Conversation Analytics
 * - Flow Doctor
 * - Webhooks
 * - Conversation Replay
 * - Collaboration
 * - Integrations
 * - Templates
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
 * Genera un flujo desde descripción en lenguaje natural
 */
export async function generateFlowFromDescription(req, res) {
  try {
    const { workspaceId } = req.params;
    const { description, options } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Se requiere descripción' });
    }
    
    const flow = await AIFlowBuilder.generateFlowFromDescription(description, options);
    
    res.json({ success: true, flow });
  } catch (error) {
    log.error('Error generating flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Sugiere mejoras para un flujo existente
 */
export async function suggestFlowImprovements(req, res) {
  try {
    const { flow } = req.body;
    
    if (!flow) {
      return res.status(400).json({ error: 'Se requiere flujo' });
    }
    
    const suggestions = await AIFlowBuilder.suggestFlowImprovements(flow);
    
    res.json({ success: true, suggestions });
  } catch (error) {
    log.error('Error suggesting improvements', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Describe un flujo en lenguaje natural
 */
export async function describeFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const description = await AIFlowBuilder.describeFlow(flow);
    
    res.json({ success: true, description });
  } catch (error) {
    log.error('Error describing flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Autocompleta un flujo parcial
 */
export async function autocompleteFlow(req, res) {
  try {
    const { partialFlow, context } = req.body;
    
    const completion = await AIFlowBuilder.autocompleteFlow(partialFlow, context);
    
    res.json({ success: true, completion });
  } catch (error) {
    log.error('Error autocompleting flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== FLOW EXECUTION ====================

/**
 * Ejecuta un flujo
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
    log.error('Error executing flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene historial de ejecuciones
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
    log.error('Error getting execution history', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== GLOBAL VARIABLES ====================

/**
 * Lista variables globales
 */
export async function getGlobalVariables(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const variables = await GlobalVariablesService.getVariables(workspaceId);
    
    res.json({ success: true, variables });
  } catch (error) {
    log.error('Error getting variables', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea o actualiza una variable
 */
export async function upsertGlobalVariable(req, res) {
  try {
    const { workspaceId } = req.params;
    const variableData = req.body;
    
    const variable = await GlobalVariablesService.upsertVariable(workspaceId, variableData);
    
    res.json({ success: true, variable });
  } catch (error) {
    log.error('Error upserting variable', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina una variable
 */
export async function deleteGlobalVariable(req, res) {
  try {
    const { workspaceId, variableId } = req.params;
    
    await GlobalVariablesService.deleteVariable(workspaceId, variableId);
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error deleting variable', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== CONVERSATION ANALYTICS ====================

/**
 * Obtiene estadísticas de conversaciones
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
    log.error('Error getting conversation stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Análisis de conversaciones con IA
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
    log.error('Error analyzing conversations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Métricas en tiempo real
 */
export async function getRealTimeMetrics(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const metrics = await ConversationAnalyticsService.getRealTimeMetrics(workspaceId);
    
    res.json({ success: true, metrics });
  } catch (error) {
    log.error('Error getting realtime metrics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== FLOW DOCTOR ====================

/**
 * Analiza un flujo
 */
export async function analyzeFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const analysis = FlowDoctorService.analyzeFlow(flow);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error analyzing flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Análisis de flujo con IA
 */
export async function analyzeFlowWithAI(req, res) {
  try {
    const { flow, businessContext } = req.body;
    
    const analysis = await FlowDoctorService.analyzeFlowWithAI(flow, businessContext);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error analyzing flow with AI', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Auto-arregla un flujo
 */
export async function autoFixFlow(req, res) {
  try {
    const { flow } = req.body;
    
    const fixed = FlowDoctorService.autoFix(flow);
    
    res.json({ success: true, fixed });
  } catch (error) {
    log.error('Error auto-fixing flow', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== WEBHOOKS ====================

/**
 * Lista webhooks
 */
export async function listWebhooks(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const webhooks = await WebhookService.listWebhooks(workspaceId);
    
    res.json({ success: true, webhooks });
  } catch (error) {
    log.error('Error listing webhooks', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea un webhook
 */
export async function createWebhook(req, res) {
  try {
    const { workspaceId } = req.params;
    const { flowId, ...options } = req.body;
    
    const webhook = await WebhookService.createWebhook(workspaceId, flowId, options);
    
    res.json({ success: true, webhook });
  } catch (error) {
    log.error('Error creating webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Actualiza un webhook
 */
export async function updateWebhook(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    const updates = req.body;
    
    const webhook = await WebhookService.updateWebhook(workspaceId, webhookId, updates);
    
    res.json({ success: true, webhook });
  } catch (error) {
    log.error('Error updating webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina un webhook
 */
export async function deleteWebhook(req, res) {
  try {
    const { workspaceId, webhookId } = req.params;
    
    await WebhookService.deleteWebhook(workspaceId, webhookId);
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error deleting webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Procesa llamada a webhook (público)
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
    log.error('Error processing webhook', { error: error.message });
    res.status(500).json({ error: 'Error interno' });
  }
}

/**
 * Genera código de ejemplo para un webhook
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
    log.error('Error getting webhook code', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Prueba un webhook con datos de ejemplo
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
 * Obtiene timeline de una conversación
 */
export async function getConversationTimeline(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    const timeline = await ConversationReplayService.getConversationTimeline(workspaceId, chatId);
    
    res.json({ success: true, timeline });
  } catch (error) {
    log.error('Error getting conversation timeline', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Detalles de un mensaje
 */
export async function getMessageDetails(req, res) {
  try {
    const { workspaceId, messageId } = req.params;
    
    const details = await ConversationReplayService.getMessageDetails(workspaceId, messageId);
    
    res.json({ success: true, details });
  } catch (error) {
    log.error('Error getting message details', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Analiza conversación con IA
 */
export async function analyzeConversation(req, res) {
  try {
    const { workspaceId, chatId } = req.params;
    
    const analysis = await ConversationReplayService.analyzeConversationWithAI(workspaceId, chatId);
    
    res.json({ success: true, analysis });
  } catch (error) {
    log.error('Error analyzing conversation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Simula respuesta alternativa
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
 * Exporta conversación
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
 * Obtiene usuarios activos en una sesión de edición
 */
export async function getActiveCollaborators(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    
    const users = CollaborationService.getActiveUsers(workspaceId, flowId);
    
    res.json({ success: true, users });
  } catch (error) {
    log.error('Error getting collaborators', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene historial de cambios
 */
export async function getChangeHistory(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    
    const history = CollaborationService.getChangeHistory(workspaceId, flowId);
    
    res.json({ success: true, history });
  } catch (error) {
    log.error('Error getting change history', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Estadísticas de sesiones de colaboración
 */
export async function getCollaborationStats(req, res) {
  try {
    const stats = CollaborationService.getSessionStats();
    
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error getting collaboration stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== INTEGRATIONS ====================

/**
 * Lista integraciones disponibles
 */
export async function listAvailableIntegrations(req, res) {
  try {
    const { category } = req.query;
    
    const integrations = IntegrationsService.listAvailableIntegrations(category);
    
    res.json({ success: true, integrations });
  } catch (error) {
    log.error('Error listing integrations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Categorías de integraciones
 */
export async function getIntegrationCategories(req, res) {
  try {
    const categories = IntegrationsService.getCategories();
    
    res.json({ success: true, categories });
  } catch (error) {
    log.error('Error getting integration categories', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Conecta una integración
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
    log.error('Error connecting integration', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Lista integraciones conectadas
 */
export async function listConnectedIntegrations(req, res) {
  try {
    const { workspaceId } = req.params;
    
    const integrations = await IntegrationsService.listConnectedIntegrations(workspaceId);
    
    res.json({ success: true, integrations });
  } catch (error) {
    log.error('Error listing connected integrations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Desconecta una integración
 */
export async function disconnectIntegration(req, res) {
  try {
    const { workspaceId, connectionId } = req.params;
    
    await IntegrationsService.disconnectIntegration(workspaceId, connectionId);
    
    res.json({ success: true });
  } catch (error) {
    log.error('Error disconnecting integration', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Conecta un bot de Telegram
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
      return res.status(400).json({ error: 'Token inválido. Verifica que el token sea correcto.' });
    }
    
    // Guardar la conexión usando el servicio de integraciones
    const connection = await IntegrationsService.saveTelegramConnection(workspaceId, {
      token,
      botId: botInfo.result.id,
      botUsername: botInfo.result.username,
      botName: botInfo.result.first_name
    });
    
    log.info('Telegram bot connected', { 
      workspaceId, 
      botUsername: botInfo.result.username 
    });
    
    res.json({ 
      success: true, 
      connection,
      bot: {
        username: botInfo.result.username,
        name: botInfo.result.first_name
      }
    });
  } catch (error) {
    log.error('Error connecting Telegram', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Ejecuta acción de integración
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
    log.error('Error executing integration action', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== TEMPLATES ====================

/**
 * Lista templates disponibles
 */
export async function listTemplates(req, res) {
  try {
    const { category, industry, search } = req.query;
    
    const templates = TemplatesService.listTemplates({ category, industry, search });
    
    res.json({ success: true, templates });
  } catch (error) {
    log.error('Error listing templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene un template por ID
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
    log.error('Error getting template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Categorías de templates
 */
export async function getTemplateCategories(req, res) {
  try {
    const categories = TemplatesService.getCategories();
    
    res.json({ success: true, categories });
  } catch (error) {
    log.error('Error getting template categories', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Sugiere templates con IA
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
    log.error('Error suggesting templates', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Instala un template
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
    log.error('Error installing template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Genera template personalizado con IA
 */
export async function generateCustomTemplate(req, res) {
  try {
    const { businessInfo } = req.body;
    
    const template = await TemplatesService.generateCustomTemplate(businessInfo);
    
    res.json({ success: true, template });
  } catch (error) {
    log.error('Error generating custom template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Guarda flujo como template
 */
export async function saveFlowAsTemplate(req, res) {
  try {
    const { workspaceId, flowId } = req.params;
    const templateInfo = req.body;
    
    const template = await TemplatesService.saveAsTemplate(workspaceId, flowId, templateInfo);
    
    res.json({ success: true, template });
  } catch (error) {
    log.error('Error saving flow as template', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ==================== MOBILE API ====================

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';

/**
 * Obtiene o genera API key para mobile
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
    log.error('Error getting mobile API key', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Genera nueva API key para mobile
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
    log.error('Error generating mobile API key', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Revoca API key
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
    log.error('Error revoking mobile API key', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Middleware para validar API key de mobile
 */
async function validateMobileApiKey(apiKey, workspaceId) {
  if (!apiKey) return false;
  
  const db = await connectDB('chatbot_mobile_keys');
  const keyDoc = await db.get(`mobile_api_key_${workspaceId}`).catch(() => null);
  
  return keyDoc && keyDoc.apiKey === apiKey;
}

/**
 * Endpoint público para mobile: stats
 */
export async function mobileGetStats(req, res) {
  try {
    const { workspaceId } = req.params;
    const apiKey = req.headers['x-api-key'];
    
    const isValid = await validateMobileApiKey(apiKey, workspaceId);
    if (!isValid) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    
    const stats = await ConversationAnalyticsService.getRealtimeMetrics(workspaceId);
    
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error getting mobile stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: lista de chats
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
    log.error('Error getting mobile chats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: mensajes de un chat
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
    log.error('Error getting mobile chat messages', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: enviar respuesta
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
    log.error('Error sending mobile reply', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: notificaciones
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
    log.error('Error getting mobile notifications', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Endpoint público para mobile: estado de flujos
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
    log.error('Error getting mobile flows status', { error: error.message });
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
