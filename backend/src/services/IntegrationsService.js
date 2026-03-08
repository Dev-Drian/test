/**
 * IntegrationsService - Integraciones One-Click
 * 
 * Conecta fácilmente con servicios externos como
 * Calendly, Google Sheets, Notion, Slack, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import fetch from 'node-fetch';

const log = logger.child('IntegrationsService');

/**
 * Catálogo de integraciones disponibles
 */
export const AVAILABLE_INTEGRATIONS = {
  // CRM & Ventas
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    icon: '🟠',
    description: 'Sincroniza contactos y leads con HubSpot CRM',
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubspot.com/oauth/v1/token',
      scopes: ['contacts', 'crm.objects.deals.read', 'crm.objects.deals.write']
    },
    actions: ['createContact', 'updateContact', 'createDeal', 'getDeal'],
    triggers: ['newContact', 'dealStageChanged']
  },
  
  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'CRM',
    icon: '🟢',
    description: 'Gestiona deals y contactos en Pipedrive',
    authType: 'api_key',
    actions: ['createPerson', 'createDeal', 'updateDealStage'],
    triggers: ['newDeal', 'wonDeal', 'lostDeal']
  },
  
  // Calendario & Citas
  calendly: {
    id: 'calendly',
    name: 'Calendly',
    category: 'Calendar',
    icon: '📅',
    description: 'Agenda citas automáticamente con Calendly',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'eventTypeUri', label: 'Event Type URI', type: 'text', required: true }
    ],
    actions: ['getEventTypes', 'getScheduledEvents', 'createInviteLink'],
    triggers: ['eventScheduled', 'eventCanceled']
  },
  
  googleCalendar: {
    id: 'googleCalendar',
    name: 'Google Calendar',
    category: 'Calendar',
    icon: '📆',
    description: 'Crea eventos y gestiona tu calendario',
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/calendar']
    },
    actions: ['createEvent', 'listEvents', 'updateEvent', 'deleteEvent'],
    triggers: ['eventCreated', 'eventUpdated']
  },
  
  // Productividad
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    icon: '📝',
    description: 'Crea páginas y bases de datos en Notion',
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token'
    },
    actions: ['createPage', 'queryDatabase', 'updatePage'],
    triggers: ['pageCreated', 'pageUpdated']
  },
  
  googleSheets: {
    id: 'googleSheets',
    name: 'Google Sheets',
    category: 'Productivity',
    icon: '📊',
    description: 'Lee y escribe datos en hojas de cálculo',
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    },
    actions: ['readRange', 'writeRange', 'appendRow', 'getSheet'],
    triggers: ['rowAdded']
  },
  
  airtable: {
    id: 'airtable',
    name: 'Airtable',
    category: 'Productivity',
    icon: '📋',
    description: 'Gestiona bases de datos en Airtable',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'baseId', label: 'Base ID', type: 'text', required: true }
    ],
    actions: ['listRecords', 'createRecord', 'updateRecord', 'deleteRecord'],
    triggers: ['recordCreated', 'recordUpdated']
  },
  
  // Comunicación
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    icon: '💬',
    description: 'Envía mensajes y notificaciones a Slack',
    authType: 'oauth2',
    oauthConfig: {
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read']
    },
    actions: ['sendMessage', 'sendDirectMessage', 'createChannel'],
    triggers: ['messageReceived', 'reactionAdded']
  },
  
  discord: {
    id: 'discord',
    name: 'Discord',
    category: 'Communication',
    icon: '🎮',
    description: 'Envía mensajes a canales de Discord',
    authType: 'webhook',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true }
    ],
    actions: ['sendMessage', 'sendEmbed']
  },
  
  telegram: {
    id: 'telegram',
    name: 'Telegram Bot',
    category: 'Communication',
    icon: '✈️',
    description: 'Integra un bot de Telegram',
    authType: 'api_key',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true }
    ],
    actions: ['sendMessage', 'sendPhoto', 'sendDocument'],
    triggers: ['messageReceived', 'callbackQuery']
  },
  
  // Pagos
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    icon: '💳',
    description: 'Procesa pagos con Stripe',
    authType: 'api_key',
    fields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text' }
    ],
    actions: ['createPaymentLink', 'createInvoice', 'getCustomer', 'listPayments'],
    triggers: ['paymentSucceeded', 'paymentFailed', 'subscriptionCreated']
  },
  
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    category: 'Payments',
    icon: '💰',
    description: 'Recibe pagos con PayPal',
    authType: 'oauth2',
    actions: ['createOrder', 'captureOrder', 'createInvoice'],
    triggers: ['paymentReceived', 'refundProcessed']
  },
  
  // Email Marketing
  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Marketing',
    icon: '🐵',
    description: 'Gestiona listas y campañas de email',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'serverPrefix', label: 'Server Prefix (e.g., us19)', type: 'text', required: true }
    ],
    actions: ['addSubscriber', 'updateSubscriber', 'removeSubscriber', 'createCampaign'],
    triggers: ['subscriberAdded', 'subscriberUnsubscribed']
  },
  
  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Marketing',
    icon: '📧',
    description: 'Envía emails transaccionales',
    authType: 'api_key',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true }
    ],
    actions: ['sendEmail', 'sendTemplate', 'addContact'],
    triggers: ['emailOpened', 'linkClicked', 'bounced']
  },
  
  // Social Media
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'Social',
    icon: '🐦',
    description: 'Publica tweets y monitorea menciones',
    authType: 'oauth2',
    actions: ['postTweet', 'searchTweets', 'getUser'],
    triggers: ['newMention', 'newFollower']
  },
  
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social',
    icon: '📸',
    description: 'Gestiona mensajes de Instagram',
    authType: 'oauth2',
    actions: ['sendDirectMessage', 'getProfile', 'getMedia'],
    triggers: ['newDirectMessage', 'newMention']
  },
  
  // Ecommerce
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    category: 'Ecommerce',
    icon: '🛒',
    description: 'Conecta tu tienda Shopify',
    authType: 'api_key',
    fields: [
      { key: 'shopDomain', label: 'Shop Domain', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
    ],
    actions: ['getOrder', 'createOrder', 'updateProduct', 'getCustomer'],
    triggers: ['orderCreated', 'orderPaid', 'orderFulfilled']
  },
  
  woocommerce: {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'Ecommerce',
    icon: '🛍️',
    description: 'Integra tu tienda WooCommerce',
    authType: 'api_key',
    fields: [
      { key: 'siteUrl', label: 'Site URL', type: 'text', required: true },
      { key: 'consumerKey', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true }
    ],
    actions: ['getOrders', 'createOrder', 'updateOrder', 'getProducts'],
    triggers: ['orderCreated', 'orderCompleted']
  },
  
  // Otros
  zapier: {
    id: 'zapier',
    name: 'Zapier',
    category: 'Automation',
    icon: '⚡',
    description: 'Conecta con miles de apps via Zapier',
    authType: 'webhook',
    fields: [
      { key: 'webhookUrl', label: 'Zapier Webhook URL', type: 'text', required: true }
    ],
    actions: ['triggerZap'],
    triggers: ['catchHook']
  },
  
  make: {
    id: 'make',
    name: 'Make (Integromat)',
    category: 'Automation',
    icon: '🔮',
    description: 'Conecta con Make scenarios',
    authType: 'webhook',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true }
    ],
    actions: ['triggerScenario'],
    triggers: ['catchHook']
  }
};

/**
 * Obtiene el nombre de la BD de integraciones
 */
function getDbName(workspaceId) {
  return `workspace_${workspaceId}_integrations`;
}

/**
 * Lista integraciones disponibles
 */
export function listAvailableIntegrations(category = null) {
  let integrations = Object.values(AVAILABLE_INTEGRATIONS);
  
  if (category) {
    integrations = integrations.filter(i => i.category === category);
  }
  
  return integrations.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    icon: i.icon,
    description: i.description,
    authType: i.authType,
    actions: i.actions?.length || 0,
    triggers: i.triggers?.length || 0
  }));
}

/**
 * Obtiene categorías disponibles
 */
export function getCategories() {
  const categories = new Set();
  Object.values(AVAILABLE_INTEGRATIONS).forEach(i => categories.add(i.category));
  
  return Array.from(categories).map(cat => ({
    id: cat,
    name: cat,
    count: Object.values(AVAILABLE_INTEGRATIONS).filter(i => i.category === cat).length
  }));
}

/**
 * Conecta una integración
 */
export async function connectIntegration(workspaceId, integrationId, credentials) {
  const integration = AVAILABLE_INTEGRATIONS[integrationId];
  
  if (!integration) {
    throw new Error('Integración no encontrada');
  }
  
  // Validar campos requeridos
  if (integration.fields) {
    for (const field of integration.fields) {
      if (field.required && !credentials[field.key]) {
        throw new Error(`Campo requerido: ${field.label}`);
      }
    }
  }
  
  // Validar credenciales probando conexión
  const isValid = await testIntegrationConnection(integrationId, credentials);
  if (!isValid) {
    throw new Error('No se pudo validar la conexión. Verifica las credenciales.');
  }
  
  const db = await connectDB(getDbName(workspaceId));
  
  const connectionId = `integration_${uuidv4().substring(0, 8)}`;
  
  const connection = {
    _id: connectionId,
    type: 'integration_connection',
    integrationId,
    integrationName: integration.name,
    category: integration.category,
    icon: integration.icon,
    credentials: encryptCredentials(credentials),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    usageCount: 0
  };
  
  await db.insert(connection);
  
  log.info('Integration connected', { workspaceId, integrationId });
  
  return {
    id: connectionId,
    integrationId,
    name: integration.name,
    isActive: true
  };
}

/**
 * Prueba conexión con una integración
 */
async function testIntegrationConnection(integrationId, credentials) {
  try {
    switch (integrationId) {
      case 'calendly':
        const response = await fetch('https://api.calendly.com/users/me', {
          headers: { 'Authorization': `Bearer ${credentials.apiKey}` }
        });
        return response.ok;
        
      case 'airtable':
        const atResponse = await fetch(`https://api.airtable.com/v0/${credentials.baseId}`, {
          headers: { 'Authorization': `Bearer ${credentials.apiKey}` }
        });
        return atResponse.ok;
        
      case 'slack':
        // Si tiene webhook URL, verificar formato
        return true;
        
      case 'stripe':
        const stripeResponse = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${credentials.secretKey}` }
        });
        return stripeResponse.ok;
        
      case 'discord':
      case 'zapier':
      case 'make':
        // Webhooks solo necesitan URL válida
        return credentials.webhookUrl?.startsWith('http');
        
      default:
        // Por defecto, asumir válido
        return true;
    }
  } catch (error) {
    log.warn('Integration test failed', { integrationId, error: error.message });
    return false;
  }
}

/**
 * Encripta credenciales (simplificado - en producción usar crypto real)
 */
function encryptCredentials(credentials) {
  // En producción, usar AES-256 o similar
  return Buffer.from(JSON.stringify(credentials)).toString('base64');
}

/**
 * Desencripta credenciales
 */
function decryptCredentials(encrypted) {
  return JSON.parse(Buffer.from(encrypted, 'base64').toString('utf8'));
}

/**
 * Lista integraciones conectadas
 */
export async function listConnectedIntegrations(workspaceId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    const result = await db.find({
      selector: { type: 'integration_connection' }
    });
    
    return (result.docs || []).map(conn => ({
      id: conn._id,
      integrationId: conn.integrationId,
      name: conn.integrationName,
      category: conn.category,
      icon: conn.icon,
      isActive: conn.isActive,
      createdAt: conn.createdAt,
      lastUsedAt: conn.lastUsedAt,
      usageCount: conn.usageCount
    }));
  } catch (error) {
    log.error('Error listing connected integrations', { error: error.message });
    return [];
  }
}

/**
 * Guarda conexión de Telegram
 */
export async function saveTelegramConnection(workspaceId, botInfo) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    
    const connectionId = `integration_telegram_${botInfo.botId}`;
    
    // Verificar si ya existe
    try {
      const existing = await db.get(connectionId);
      // Actualizar existente
      existing.credentials = {
        token: botInfo.token,
        botId: botInfo.botId,
        botUsername: botInfo.botUsername,
        botName: botInfo.botName
      };
      existing.updatedAt = new Date().toISOString();
      await db.insert(existing);
      
      return {
        id: connectionId,
        integrationId: 'telegram',
        name: `Telegram Bot (@${botInfo.botUsername})`,
        isActive: true,
        updated: true
      };
    } catch (e) {
      // No existe, crear nuevo
    }
    
    const connection = {
      _id: connectionId,
      type: 'integration_connection',
      integrationId: 'telegram',
      integrationName: `Telegram Bot (@${botInfo.botUsername})`,
      category: 'Comunicación',
      icon: '🤖',
      credentials: {
        token: botInfo.token,
        botId: botInfo.botId,
        botUsername: botInfo.botUsername,
        botName: botInfo.botName
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0
    };
    
    await db.insert(connection);
    
    log.info('Telegram connection saved', { workspaceId, botUsername: botInfo.botUsername });
    
    return {
      id: connectionId,
      integrationId: 'telegram',
      name: `Telegram Bot (@${botInfo.botUsername})`,
      isActive: true
    };
  } catch (error) {
    log.error('Error saving Telegram connection', { error: error.message });
    throw error;
  }
}

/**
 * Desconecta una integración
 */
export async function disconnectIntegration(workspaceId, connectionId) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const connection = await db.get(connectionId);
    
    await db.destroy(connection._id, connection._rev);
    
    log.info('Integration disconnected', { workspaceId, connectionId });
    return { success: true };
  } catch (error) {
    log.error('Error disconnecting integration', { error: error.message });
    throw error;
  }
}

/**
 * Ejecuta una acción de integración
 */
export async function executeIntegrationAction(workspaceId, connectionId, action, params) {
  try {
    const db = await connectDB(getDbName(workspaceId));
    const connection = await db.get(connectionId);
    
    if (!connection.isActive) {
      throw new Error('Integración desactivada');
    }
    
    const credentials = decryptCredentials(connection.credentials);
    const integrationId = connection.integrationId;
    
    // Ejecutar acción específica
    let result;
    
    switch (integrationId) {
      case 'calendly':
        result = await executeCalendlyAction(action, params, credentials);
        break;
        
      case 'slack':
        result = await executeSlackAction(action, params, credentials);
        break;
        
      case 'discord':
        result = await executeDiscordAction(action, params, credentials);
        break;
        
      case 'airtable':
        result = await executeAirtableAction(action, params, credentials);
        break;
        
      case 'stripe':
        result = await executeStripeAction(action, params, credentials);
        break;
        
      case 'zapier':
      case 'make':
        result = await executeWebhookAction(action, params, credentials);
        break;
        
      default:
        throw new Error('Integración no implementada');
    }
    
    // Actualizar uso
    connection.lastUsedAt = new Date().toISOString();
    connection.usageCount = (connection.usageCount || 0) + 1;
    await db.insert(connection);
    
    return result;
    
  } catch (error) {
    log.error('Error executing integration action', { error: error.message });
    throw error;
  }
}

// Implementaciones específicas de integraciones

async function executeCalendlyAction(action, params, credentials) {
  const baseUrl = 'https://api.calendly.com';
  const headers = {
    'Authorization': `Bearer ${credentials.apiKey}`,
    'Content-Type': 'application/json'
  };
  
  switch (action) {
    case 'getEventTypes':
      const userResponse = await fetch(`${baseUrl}/users/me`, { headers });
      const userData = await userResponse.json();
      const eventsResponse = await fetch(
        `${baseUrl}/event_types?user=${userData.resource.uri}`, 
        { headers }
      );
      return eventsResponse.json();
      
    case 'getScheduledEvents':
      const response = await fetch(
        `${baseUrl}/scheduled_events?user=${params.userUri || credentials.eventTypeUri}`,
        { headers }
      );
      return response.json();
      
    case 'createInviteLink':
      return { 
        link: `https://calendly.com/${credentials.eventTypeUri}`,
        message: 'Agenda tu cita aquí'
      };
      
    default:
      throw new Error('Acción no soportada');
  }
}

async function executeSlackAction(action, params, credentials) {
  switch (action) {
    case 'sendMessage':
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: params.channel,
          text: params.text,
          blocks: params.blocks
        })
      });
      return response.json();
      
    default:
      throw new Error('Acción no soportada');
  }
}

async function executeDiscordAction(action, params, credentials) {
  switch (action) {
    case 'sendMessage':
      const response = await fetch(credentials.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: params.content,
          embeds: params.embeds
        })
      });
      return { success: response.ok };
      
    case 'sendEmbed':
      const embedResponse = await fetch(credentials.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: params.title,
            description: params.description,
            color: params.color || 0x5865F2,
            fields: params.fields
          }]
        })
      });
      return { success: embedResponse.ok };
      
    default:
      throw new Error('Acción no soportada');
  }
}

async function executeAirtableAction(action, params, credentials) {
  const baseUrl = `https://api.airtable.com/v0/${credentials.baseId}`;
  const headers = {
    'Authorization': `Bearer ${credentials.apiKey}`,
    'Content-Type': 'application/json'
  };
  
  switch (action) {
    case 'listRecords':
      const listResponse = await fetch(`${baseUrl}/${params.tableName}`, { headers });
      return listResponse.json();
      
    case 'createRecord':
      const createResponse = await fetch(`${baseUrl}/${params.tableName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields: params.fields })
      });
      return createResponse.json();
      
    case 'updateRecord':
      const updateResponse = await fetch(`${baseUrl}/${params.tableName}/${params.recordId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: params.fields })
      });
      return updateResponse.json();
      
    default:
      throw new Error('Acción no soportada');
  }
}

async function executeStripeAction(action, params, credentials) {
  const headers = {
    'Authorization': `Bearer ${credentials.secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  
  switch (action) {
    case 'createPaymentLink':
      const linkResponse = await fetch('https://api.stripe.com/v1/payment_links', {
        method: 'POST',
        headers,
        body: new URLSearchParams({
          'line_items[0][price]': params.priceId,
          'line_items[0][quantity]': params.quantity || 1
        })
      });
      return linkResponse.json();
      
    case 'listPayments':
      const response = await fetch('https://api.stripe.com/v1/payment_intents?limit=10', {
        headers
      });
      return response.json();
      
    default:
      throw new Error('Acción no soportada');
  }
}

async function executeWebhookAction(action, params, credentials) {
  const response = await fetch(credentials.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.data || params)
  });
  
  return {
    success: response.ok,
    status: response.status
  };
}

/**
 * Genera URL de OAuth para una integración
 */
export function getOAuthUrl(integrationId, redirectUri, state) {
  const integration = AVAILABLE_INTEGRATIONS[integrationId];
  
  if (!integration || integration.authType !== 'oauth2') {
    throw new Error('Integración no soporta OAuth');
  }
  
  const oauth = integration.oauthConfig;
  const params = new URLSearchParams({
    client_id: process.env[`${integrationId.toUpperCase()}_CLIENT_ID`] || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: oauth.scopes?.join(' ') || '',
    state
  });
  
  return `${oauth.authUrl}?${params}`;
}

export default {
  AVAILABLE_INTEGRATIONS,
  listAvailableIntegrations,
  getCategories,
  connectIntegration,
  listConnectedIntegrations,
  saveTelegramConnection,
  disconnectIntegration,
  executeIntegrationAction,
  getOAuthUrl
};
