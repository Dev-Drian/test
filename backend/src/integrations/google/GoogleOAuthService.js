/**
 * GoogleOAuthService - Maneja autenticación OAuth2 con Google
 * 
 * Permite a los usuarios conectar sus cuentas de Google para usar
 * Calendar y Sheets en los flujos de automatización.
 */

import { google } from 'googleapis';
import logger from '../../config/logger.js';

const log = logger.child('GoogleOAuth');

// Configuración desde variables de entorno
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

// Scopes necesarios para Calendar y Sheets
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly', // Para listar hojas
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

class GoogleOAuthService {
  constructor() {
    this.oauth2Client = null;
    this._initialize();
  }

  /**
   * Inicializa el cliente OAuth2
   */
  _initialize() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      log.warn('Google OAuth no configurado - falta GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    log.info('Google OAuth inicializado correctamente');
  }

  /**
   * Verifica si Google OAuth está configurado
   */
  isConfigured() {
    return !!this.oauth2Client;
  }

  /**
   * Genera URL de autorización para que el usuario conecte su cuenta
   * @param {string} state - Estado para mantener contexto (workspaceId, userId)
   * @returns {string} URL de autorización
   */
  getAuthUrl(state = '') {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Para obtener refresh_token
      prompt: 'consent', // Siempre pedir consentimiento para obtener refresh_token
      scope: SCOPES,
      state: state,
    });
  }

  /**
   * Intercambia código de autorización por tokens
   * @param {string} code - Código de autorización de Google
   * @returns {Promise<{access_token, refresh_token, expiry_date, scope, token_type}>}
   */
  async getTokensFromCode(code) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      log.info('Tokens obtenidos correctamente');
      return tokens;
    } catch (error) {
      log.error('Error al obtener tokens', { error: error.message });
      throw new Error(`Error al conectar con Google: ${error.message}`);
    }
  }

  /**
   * Refresca el access token usando el refresh token
   * @param {string} refreshToken - Refresh token almacenado
   * @returns {Promise<{access_token, expiry_date}>}
   */
  async refreshAccessToken(refreshToken) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      log.info('Token refrescado correctamente');
      return {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      };
    } catch (error) {
      log.error('Error al refrescar token', { error: error.message });
      throw new Error(`Error al refrescar token de Google: ${error.message}`);
    }
  }

  /**
   * Obtiene información del usuario autenticado
   * @param {string} accessToken - Token de acceso
   * @returns {Promise<{email, name, picture}>}
   */
  async getUserInfo(accessToken) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    } catch (error) {
      log.error('Error al obtener info de usuario', { error: error.message });
      throw new Error(`Error al obtener información del usuario: ${error.message}`);
    }
  }

  /**
   * Crea un cliente OAuth2 autenticado con tokens específicos
   * @param {object} tokens - {access_token, refresh_token}
   * @returns {google.auth.OAuth2}
   */
  getAuthenticatedClient(tokens) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    const client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    
    client.setCredentials(tokens);
    
    // Auto-refresh cuando expire
    client.on('tokens', (newTokens) => {
      log.info('Tokens auto-refrescados');
      // Aquí podrías emitir un evento para guardar los nuevos tokens
    });

    return client;
  }

  /**
   * Revoca los tokens (desconecta la cuenta)
   * @param {string} token - Access token o refresh token
   */
  async revokeToken(token) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth no está configurado');
    }

    try {
      await this.oauth2Client.revokeToken(token);
      log.info('Token revocado correctamente');
    } catch (error) {
      log.error('Error al revocar token', { error: error.message });
      // No lanzar error, puede que el token ya esté revocado
    }
  }
}

// Singleton
let instance = null;

export function getGoogleOAuthService() {
  if (!instance) {
    instance = new GoogleOAuthService();
  }
  return instance;
}

export default GoogleOAuthService;
