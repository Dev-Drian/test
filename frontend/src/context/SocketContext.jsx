/**
 * SocketContext — Proveedor global de Socket.io
 *
 * - Se conecta automáticamente cuando hay workspaceId disponible
 * - Emite 'join' para unirse a la sala del workspace
 * - Desconecta al cambiar de workspace o al cerrar sesión
 * - Expone: socket, connected, lastEvent
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3010';

const SocketContext = createContext({
  socket: null,
  connected: false,
  lastEvent: null,
});

export function useSocketContext() {
  return useContext(SocketContext);
}

export function SocketProvider({ workspaceId, children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!workspaceId) {
      // Sin workspace: desconectar si había conexión
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Crear conexión con backoff exponencial
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,        // Más intentos
      reconnectionDelay: 1000,         // Empezar con 1s
      reconnectionDelayMax: 30000,     // Máximo 30s (backoff exponencial automático)
      randomizationFactor: 0.5,        // Jitter para evitar thundering herd
      timeout: 15000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] ✅ Conectado, socketId:', socket.id, '| joining ws:', workspaceId);
      setConnected(true);
      // Unirse a la sala del workspace
      socket.emit('join', { workspaceId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Desconectado:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // El servidor cortó la conexión — reconectar manualmente
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Error de conexión:', err.message);
      setConnected(false);
    });

    // Escucha genérica para debug (solo en desarrollo)
    if (import.meta.env.DEV) {
      socket.onAny((event, data) => {
        console.log('[Socket] 📨 Event:', event, data);
        setLastEvent({ event, data, ts: Date.now() });
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [workspaceId]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
}
