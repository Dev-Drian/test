/**
 * GoogleCalendarService - Gestiona eventos en Google Calendar
 * 
 * Permite crear, actualizar y listar eventos en el calendario
 * del usuario conectado.
 */

import { google } from 'googleapis';
import { getGoogleOAuthService } from './GoogleOAuthService.js';
import logger from '../../config/logger.js';

const log = logger.child('GoogleCalendar');

class GoogleCalendarService {
  constructor() {
    this.oauthService = getGoogleOAuthService();
  }

  /**
   * Obtiene el cliente de Calendar autenticado
   * @param {object} tokens - {access_token, refresh_token}
   * @returns {google.calendar_v3.Calendar}
   */
  _getCalendarClient(tokens) {
    const auth = this.oauthService.getAuthenticatedClient(tokens);
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Lista los calendarios del usuario
   * @param {object} tokens - Tokens de autenticación
   * @returns {Promise<Array<{id, summary, primary}>>}
   */
  async listCalendars(tokens) {
    try {
      const calendar = this._getCalendarClient(tokens);
      const response = await calendar.calendarList.list();
      
      return response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false,
        backgroundColor: cal.backgroundColor,
      }));
    } catch (error) {
      log.error('Error al listar calendarios', { error: error.message });
      throw new Error(`Error al obtener calendarios: ${error.message}`);
    }
  }

  /**
   * Crea un evento en el calendario
   * @param {object} tokens - Tokens de autenticación
   * @param {object} eventData - Datos del evento
   * @param {string} calendarId - ID del calendario (default: 'primary')
   * @returns {Promise<object>} Evento creado
   */
  async createEvent(tokens, eventData, calendarId = 'primary') {
    try {
      const calendar = this._getCalendarClient(tokens);
      
      // Construir evento según formato de Google Calendar API
      const event = this._buildEventObject(eventData);
      
      log.info('Creando evento en calendario', { calendarId, summary: event.summary });
      
      const response = await calendar.events.insert({
        calendarId,
        resource: event,
        sendUpdates: eventData.sendNotifications ? 'all' : 'none',
      });

      log.info('Evento creado exitosamente', { eventId: response.data.id });
      
      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        summary: response.data.summary,
        start: response.data.start,
        end: response.data.end,
      };
    } catch (error) {
      log.error('Error al crear evento', { error: error.message });
      throw new Error(`Error al crear evento: ${error.message}`);
    }
  }

  /**
   * Actualiza un evento existente
   * @param {object} tokens - Tokens de autenticación
   * @param {string} eventId - ID del evento
   * @param {object} eventData - Datos a actualizar
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<object>} Evento actualizado
   */
  async updateEvent(tokens, eventId, eventData, calendarId = 'primary') {
    try {
      const calendar = this._getCalendarClient(tokens);
      const event = this._buildEventObject(eventData);
      
      const response = await calendar.events.update({
        calendarId,
        eventId,
        resource: event,
      });

      log.info('Evento actualizado', { eventId });
      
      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        summary: response.data.summary,
      };
    } catch (error) {
      log.error('Error al actualizar evento', { error: error.message, eventId });
      throw new Error(`Error al actualizar evento: ${error.message}`);
    }
  }

  /**
   * Elimina un evento
   * @param {object} tokens - Tokens de autenticación
   * @param {string} eventId - ID del evento
   * @param {string} calendarId - ID del calendario
   */
  async deleteEvent(tokens, eventId, calendarId = 'primary') {
    try {
      const calendar = this._getCalendarClient(tokens);
      
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      log.info('Evento eliminado', { eventId });
    } catch (error) {
      log.error('Error al eliminar evento', { error: error.message, eventId });
      throw new Error(`Error al eliminar evento: ${error.message}`);
    }
  }

  /**
   * Lista eventos de un calendario
   * @param {object} tokens - Tokens de autenticación
   * @param {object} options - Opciones de filtrado
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Array>} Lista de eventos
   */
  async listEvents(tokens, options = {}, calendarId = 'primary') {
    try {
      const calendar = this._getCalendarClient(tokens);
      
      const params = {
        calendarId,
        maxResults: options.maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime',
      };

      // Filtrar por fecha
      if (options.timeMin) {
        params.timeMin = new Date(options.timeMin).toISOString();
      } else {
        params.timeMin = new Date().toISOString(); // Por defecto desde ahora
      }

      if (options.timeMax) {
        params.timeMax = new Date(options.timeMax).toISOString();
      }

      if (options.q) {
        params.q = options.q; // Búsqueda por texto
      }

      const response = await calendar.events.list(params);
      
      return response.data.items.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        htmlLink: event.htmlLink,
        attendees: event.attendees?.map(a => ({ email: a.email, responseStatus: a.responseStatus })),
      }));
    } catch (error) {
      log.error('Error al listar eventos', { error: error.message });
      throw new Error(`Error al obtener eventos: ${error.message}`);
    }
  }

  /**
   * Busca disponibilidad en el calendario
   * @param {object} tokens - Tokens de autenticación
   * @param {string} startDate - Fecha de inicio
   * @param {string} endDate - Fecha de fin
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Array>} Slots de tiempo ocupados
   */
  async getBusyTimes(tokens, startDate, endDate, calendarId = 'primary') {
    try {
      const calendar = this._getCalendarClient(tokens);
      
      const response = await calendar.freebusy.query({
        resource: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          items: [{ id: calendarId }],
        },
      });

      return response.data.calendars[calendarId].busy || [];
    } catch (error) {
      log.error('Error al obtener disponibilidad', { error: error.message });
      throw new Error(`Error al consultar disponibilidad: ${error.message}`);
    }
  }

  /**
   * Construye el objeto de evento para la API de Google
   * @private
   */
  _buildEventObject(eventData) {
    const event = {
      summary: eventData.title || eventData.summary,
      description: eventData.description || '',
    };

    // Fechas
    if (eventData.allDay) {
      // Evento de día completo
      event.start = { date: this._formatDate(eventData.startDate || eventData.start) };
      event.end = { date: this._formatDate(eventData.endDate || eventData.end || eventData.startDate || eventData.start) };
    } else {
      // Evento con hora específica
      const startDateTime = eventData.startDate || eventData.start;
      const endDateTime = eventData.endDate || eventData.end || this._addHours(startDateTime, eventData.duration || 1);
      
      event.start = { 
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: eventData.timeZone || 'America/Mexico_City',
      };
      event.end = { 
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: eventData.timeZone || 'America/Mexico_City',
      };
    }

    // Ubicación
    if (eventData.location) {
      event.location = eventData.location;
    }

    // Asistentes
    if (eventData.attendees && eventData.attendees.length > 0) {
      event.attendees = eventData.attendees.map(email => ({ email }));
    }

    // Recordatorios
    if (eventData.reminders) {
      event.reminders = {
        useDefault: false,
        overrides: eventData.reminders.map(r => ({
          method: r.method || 'popup',
          minutes: r.minutes || 30,
        })),
      };
    }

    // Color del evento
    if (eventData.colorId) {
      event.colorId = eventData.colorId;
    }

    return event;
  }

  /**
   * Formatea fecha para eventos de día completo (YYYY-MM-DD)
   * @private
   */
  _formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Añade horas a una fecha
   * @private
   */
  _addHours(date, hours) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
  }
}

// Singleton
let instance = null;

export function getGoogleCalendarService() {
  if (!instance) {
    instance = new GoogleCalendarService();
  }
  return instance;
}

export default GoogleCalendarService;
