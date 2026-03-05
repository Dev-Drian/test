/**
 * useGoogleIntegration - Hook para manejar integración con Google
 * 
 * Permite conectar/desconectar cuenta de Google y usar sus servicios
 * (Calendar, Sheets) desde el frontend.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export function useGoogleIntegration() {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    email: null,
    name: null,
    picture: null,
  });
  const [calendars, setCalendars] = useState([]);
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [error, setError] = useState(null);

  /**
   * Verifica el estado de conexión de Google
   */
  const checkStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      const response = await api.get('/integrations/google/status');
      setStatus({
        loading: false,
        connected: response.data.connected,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
      });
      setError(null);
    } catch (err) {
      setStatus({ loading: false, connected: false, email: null, name: null, picture: null });
      // No mostrar error si simplemente no está conectado
      if (err.response?.status !== 503) {
        setError(err.response?.data?.error || err.message);
      }
    }
  }, []);

  /**
   * Inicia el flujo de autorización OAuth
   */
  const connect = useCallback(async (returnUrl = window.location.pathname) => {
    try {
      const response = await api.get('/integrations/google/auth-url', {
        params: { returnUrl }
      });
      // Redirigir a Google para autorización
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar conexión con Google');
      throw err;
    }
  }, []);

  /**
   * Desconecta la cuenta de Google
   */
  const disconnect = useCallback(async () => {
    try {
      await api.post('/integrations/google/disconnect');
      setStatus({
        loading: false,
        connected: false,
        email: null,
        name: null,
        picture: null,
      });
      setCalendars([]);
      setSpreadsheets([]);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desconectar Google');
      throw err;
    }
  }, []);

  // ============ CALENDAR ============

  /**
   * Lista los calendarios del usuario
   */
  const loadCalendars = useCallback(async () => {
    try {
      const response = await api.get('/integrations/google/calendars');
      setCalendars(response.data.calendars || []);
      return response.data.calendars;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar calendarios');
      throw err;
    }
  }, []);

  /**
   * Crea un evento en el calendario
   */
  const createCalendarEvent = useCallback(async (eventData, calendarId = 'primary') => {
    try {
      const response = await api.post('/integrations/google/calendar/event', {
        ...eventData,
        calendarId,
      });
      return response.data.event;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear evento');
      throw err;
    }
  }, []);

  /**
   * Lista eventos del calendario
   */
  const listCalendarEvents = useCallback(async (options = {}, calendarId = 'primary') => {
    try {
      const response = await api.get('/integrations/google/calendar/events', {
        params: { calendarId, ...options }
      });
      return response.data.events;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar eventos');
      throw err;
    }
  }, []);

  // ============ SHEETS ============

  /**
   * Lista las hojas de cálculo del usuario
   */
  const loadSpreadsheets = useCallback(async () => {
    try {
      const response = await api.get('/integrations/google/spreadsheets');
      setSpreadsheets(response.data.spreadsheets || []);
      return response.data.spreadsheets;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar hojas de cálculo');
      throw err;
    }
  }, []);

  /**
   * Obtiene detalles de una hoja específica
   */
  const getSpreadsheet = useCallback(async (spreadsheetId) => {
    try {
      const response = await api.get(`/integrations/google/spreadsheets/${spreadsheetId}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al obtener hoja de cálculo');
      throw err;
    }
  }, []);

  /**
   * Obtiene los headers de una hoja
   */
  const getSpreadsheetHeaders = useCallback(async (spreadsheetId, sheetName = 'Sheet1') => {
    try {
      const response = await api.get(`/integrations/google/spreadsheets/${spreadsheetId}/headers`, {
        params: { sheetName }
      });
      return response.data.headers;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al obtener encabezados');
      throw err;
    }
  }, []);

  /**
   * Añade una fila a la hoja
   */
  const addSpreadsheetRow = useCallback(async (spreadsheetId, data, sheetName = 'Sheet1', asObject = true) => {
    try {
      const response = await api.post(`/integrations/google/spreadsheets/${spreadsheetId}/row`, {
        sheetName,
        data,
        asObject,
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al añadir fila');
      throw err;
    }
  }, []);

  // Verificar estado al montar
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    // Estado
    status,
    calendars,
    spreadsheets,
    error,
    clearError: () => setError(null),
    
    // Auth
    checkStatus,
    connect,
    disconnect,
    
    // Calendar
    loadCalendars,
    createCalendarEvent,
    listCalendarEvents,
    
    // Sheets
    loadSpreadsheets,
    getSpreadsheet,
    getSpreadsheetHeaders,
    addSpreadsheetRow,
  };
}

export default useGoogleIntegration;
