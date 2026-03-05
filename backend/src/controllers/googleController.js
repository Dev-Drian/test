/**
 * googleController - Maneja endpoints de integración con Google
 * 
 * Incluye:
 * - OAuth2 (conectar/desconectar cuenta)
 * - Google Calendar (listar calendarios, crear eventos)
 * - Google Sheets (listar hojas, añadir filas)
 */

import { getGoogleOAuthService, getGoogleCalendarService, getGoogleSheetsService } from '../integrations/google/index.js';
import logger from '../config/logger.js';
import { connectDB, getIntegrationsDbName } from '../config/db.js';

const log = logger.child('GoogleController');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3020';

/**
 * Obtiene o crea el documento de integraciones del usuario
 */
async function getOrCreateUserIntegrations(userId) {
  const db = await connectDB(getIntegrationsDbName());
  const docId = `integrations_${userId}`;
  
  try {
    return await db.get(docId);
  } catch (error) {
    if (error.statusCode === 404) {
      // Crear nuevo documento
      const newDoc = {
        _id: docId,
        userId,
        google: null,
        createdAt: new Date().toISOString(),
      };
      await db.insert(newDoc);
      return newDoc;
    }
    throw error;
  }
}

/**
 * Guarda tokens de Google para el usuario
 */
async function saveGoogleTokens(userId, tokens, userInfo) {
  const db = await connectDB(getIntegrationsDbName());
  const integrations = await getOrCreateUserIntegrations(userId);
  
  integrations.google = {
    connected: true,
    connectedAt: new Date().toISOString(),
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    tokens: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    },
  };
  integrations.updatedAt = new Date().toISOString();
  
  await db.insert(integrations);
  return integrations;
}

// ============ OAUTH ============

/**
 * GET /api/integrations/google/auth-url
 * Genera URL de autorización para conectar Google
 */
export async function getAuthUrl(req, res) {
  try {
    const oauthService = getGoogleOAuthService();
    
    if (!oauthService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Google OAuth no está configurado en el servidor',
        code: 'GOOGLE_NOT_CONFIGURED',
      });
    }

    // Estado para identificar al usuario después del redirect
    const state = JSON.stringify({
      userId: req.user.id,
      workspaceId: req.query.workspaceId,
      returnUrl: req.query.returnUrl || '/settings/integrations',
    });
    
    const authUrl = oauthService.getAuthUrl(Buffer.from(state).toString('base64'));
    
    res.json({ authUrl });
  } catch (error) {
    log.error('Error al generar auth URL', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/integrations/google/callback
 * Callback de OAuth después de autorización
 */
export async function handleCallback(req, res) {
  try {
    const { code, state, error: authError } = req.query;
    
    if (authError) {
      log.error('Error en OAuth callback', { authError });
      return res.redirect(`${FRONTEND_URL}/integrations?error=${authError}`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/integrations?error=missing_params`);
    }

    // Decodificar estado
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.redirect(`${FRONTEND_URL}/integrations?error=invalid_state`);
    }

    const oauthService = getGoogleOAuthService();
    
    // Intercambiar código por tokens
    const tokens = await oauthService.getTokensFromCode(code);
    
    // Obtener información del usuario
    const userInfo = await oauthService.getUserInfo(tokens.access_token);
    
    // Guardar tokens
    await saveGoogleTokens(stateData.userId, tokens, userInfo);
    
    log.info('Google conectado exitosamente', { 
      userId: stateData.userId, 
      email: userInfo.email 
    });

    // Redirigir de vuelta al frontend
    const returnUrl = stateData.returnUrl || '/integrations';
    res.redirect(`${FRONTEND_URL}${returnUrl}?google=connected`);
    
  } catch (error) {
    log.error('Error en callback de Google', { error: error.message });
    res.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * GET /api/integrations/google/status
 * Verifica si el usuario tiene Google conectado
 */
export async function getStatus(req, res) {
  try {
    const integrations = await getOrCreateUserIntegrations(req.user.id);
    
    if (integrations.google?.connected) {
      res.json({
        connected: true,
        email: integrations.google.email,
        name: integrations.google.name,
        picture: integrations.google.picture,
        connectedAt: integrations.google.connectedAt,
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    log.error('Error al obtener estado de Google', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/integrations/google/disconnect
 * Desconecta la cuenta de Google
 */
export async function disconnect(req, res) {
  try {
    const db = await connectDB(getIntegrationsDbName());
    const integrations = await getOrCreateUserIntegrations(req.user.id);
    
    if (integrations.google?.tokens?.access_token) {
      // Revocar token
      const oauthService = getGoogleOAuthService();
      await oauthService.revokeToken(integrations.google.tokens.access_token);
    }
    
    // Eliminar datos de Google
    integrations.google = null;
    integrations.updatedAt = new Date().toISOString();
    await db.insert(integrations);
    
    log.info('Google desconectado', { userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    log.error('Error al desconectar Google', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ============ GOOGLE CALENDAR ============

/**
 * Helper: Obtiene tokens del usuario
 */
async function getUserTokens(userId) {
  const integrations = await getOrCreateUserIntegrations(userId);
  
  if (!integrations.google?.connected || !integrations.google?.tokens) {
    throw new Error('Google no está conectado. Ve a Configuración > Integraciones para conectar tu cuenta.');
  }
  
  return integrations.google.tokens;
}

/**
 * GET /api/integrations/google/calendars
 * Lista calendarios del usuario
 */
export async function listCalendars(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const calendarService = getGoogleCalendarService();
    
    const calendars = await calendarService.listCalendars(tokens);
    res.json({ calendars });
  } catch (error) {
    log.error('Error al listar calendarios', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/integrations/google/calendar/event
 * Crea un evento en el calendario
 */
export async function createCalendarEvent(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const calendarService = getGoogleCalendarService();
    
    const { calendarId, ...eventData } = req.body;
    
    const event = await calendarService.createEvent(
      tokens, 
      eventData, 
      calendarId || 'primary'
    );
    
    res.json({ 
      success: true, 
      event 
    });
  } catch (error) {
    log.error('Error al crear evento', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/integrations/google/calendar/events
 * Lista eventos del calendario
 */
export async function listCalendarEvents(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const calendarService = getGoogleCalendarService();
    
    const { calendarId, timeMin, timeMax, maxResults, q } = req.query;
    
    const events = await calendarService.listEvents(
      tokens,
      { timeMin, timeMax, maxResults: parseInt(maxResults) || 10, q },
      calendarId || 'primary'
    );
    
    res.json({ events });
  } catch (error) {
    log.error('Error al listar eventos', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ============ GOOGLE SHEETS ============

/**
 * GET /api/integrations/google/spreadsheets
 * Lista hojas de cálculo del usuario
 */
export async function listSpreadsheets(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const sheetsService = getGoogleSheetsService();
    
    const spreadsheets = await sheetsService.listSpreadsheets(tokens);
    res.json({ spreadsheets });
  } catch (error) {
    log.error('Error al listar hojas de cálculo', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/integrations/google/spreadsheets/:spreadsheetId
 * Obtiene detalles de una hoja de cálculo
 */
export async function getSpreadsheet(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const sheetsService = getGoogleSheetsService();
    
    const spreadsheet = await sheetsService.getSpreadsheet(tokens, req.params.spreadsheetId);
    res.json(spreadsheet);
  } catch (error) {
    log.error('Error al obtener hoja de cálculo', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/integrations/google/spreadsheets/:spreadsheetId/headers
 * Obtiene headers de una hoja
 */
export async function getSpreadsheetHeaders(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const sheetsService = getGoogleSheetsService();
    
    const { spreadsheetId } = req.params;
    const { sheetName } = req.query;
    
    const headers = await sheetsService.getHeaders(tokens, spreadsheetId, sheetName || 'Sheet1');
    res.json({ headers });
  } catch (error) {
    log.error('Error al obtener headers', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/integrations/google/spreadsheets/:spreadsheetId/row
 * Añade una fila a la hoja
 */
export async function addSpreadsheetRow(req, res) {
  try {
    const tokens = await getUserTokens(req.user.id);
    const sheetsService = getGoogleSheetsService();
    
    const { spreadsheetId } = req.params;
    const { sheetName, data, asObject } = req.body;
    
    let result;
    if (asObject) {
      result = await sheetsService.appendRowAsObject(tokens, spreadsheetId, sheetName || 'Sheet1', data);
    } else {
      result = await sheetsService.appendRow(tokens, spreadsheetId, sheetName || 'Sheet1', data);
    }
    
    res.json(result);
  } catch (error) {
    log.error('Error al añadir fila', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

// ============ EJECUCIÓN DESDE FLUJOS ============

/**
 * POST /api/integrations/google/execute
 * Ejecuta una acción de Google desde un flujo
 * Body: { actionType, config, recordData }
 */
export async function executeFlowAction(req, res) {
  try {
    const { actionType, config, recordData } = req.body;
    const tokens = await getUserTokens(req.user.id);
    
    log.info('Ejecutando acción de Google desde flujo', { actionType });
    
    let result;
    
    switch (actionType) {
      case 'google_calendar_event': {
        const calendarService = getGoogleCalendarService();
        
        // Interpolar variables del registro en los datos del evento
        const eventData = interpolateVariables(config.eventData, recordData);
        
        result = await calendarService.createEvent(
          tokens,
          eventData,
          config.calendarId || 'primary'
        );
        break;
      }
      
      case 'google_sheets_row': {
        const sheetsService = getGoogleSheetsService();
        
        // Interpolar variables
        const rowData = {};
        for (const [key, value] of Object.entries(config.fieldMapping || {})) {
          rowData[key] = interpolateValue(value, recordData);
        }
        
        result = await sheetsService.appendRowAsObject(
          tokens,
          config.spreadsheetId,
          config.sheetName || 'Sheet1',
          rowData
        );
        break;
      }
      
      default:
        throw new Error(`Tipo de acción desconocido: ${actionType}`);
    }
    
    res.json({ success: true, result });
  } catch (error) {
    log.error('Error al ejecutar acción de Google', { error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Interpola variables {{campo}} en un valor
 */
function interpolateValue(value, recordData) {
  if (typeof value !== 'string') return value;
  
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let result = recordData;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return match; // Mantener original si no se encuentra
      }
    }
    
    return result !== undefined ? String(result) : match;
  });
}

/**
 * Interpola variables en un objeto completo
 */
function interpolateVariables(obj, recordData) {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return interpolateValue(obj, recordData);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateVariables(item, recordData));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateVariables(value, recordData);
    }
    return result;
  }
  
  return obj;
}
