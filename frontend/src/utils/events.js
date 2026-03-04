/**
 * Sistema de eventos para comunicación entre componentes
 * Usa Custom Events del navegador para simplicidad
 */

import { useEffect } from 'react';

// Nombres de eventos disponibles
export const EVENTS = {
  FLOW_CREATED: 'app:flow:created',
  TABLE_CREATED: 'app:table:created',
  WORKSPACE_UPDATED: 'app:workspace:updated',
};

/**
 * Emite un evento personalizado
 * @param {string} eventName - Nombre del evento
 * @param {object} detail - Datos del evento
 */
export function emitEvent(eventName, detail = {}) {
  console.log(`[Events] Emitting ${eventName}`, detail);
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Hook para escuchar eventos
 * @param {string} eventName - Nombre del evento
 * @param {function} callback - Función a ejecutar
 */
export function useAppEvent(eventName, callback) {
  useEffect(() => {
    const handler = (event) => {
      console.log(`[Events] Received ${eventName}`, event.detail);
      callback(event.detail);
    };
    
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, callback]);
}
