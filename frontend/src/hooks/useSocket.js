/**
 * useSocket — Hook para usar Socket.io en componentes React
 *
 * Retorna:
 *   socket    — instancia de socket.io-client (o null si no hay conexión)
 *   connected — booleano de estado de conexión
 *   on(event, cb) — alias de socket.on con auto-cleanup al desmontar
 *
 * Uso básico (solo escuchar eventos del workspace):
 *   const { connected } = useSocket()
 *
 * Escuchar un evento específico:
 *   useSocketEvent('record:created', (data) => {
 *     if (data.tableId === myTableId) setRecords(r => [...r, data.record])
 *   })
 *
 * El socket se conecta automáticamente cuando hay workspaceId disponible
 * y se desconecta cuando el componente se desmonta o se cierra sesión.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSocketContext } from '../context/SocketContext';

// ── Hook principal ────────────────────────────────────────────────────────────
export function useSocket() {
  return useSocketContext();
}

// ── Hook para escuchar un evento específico con auto-cleanup ──────────────────
export function useSocketEvent(event, callback) {
  const { socket } = useSocketContext();
  const callbackRef = useRef(callback);

  // Mantener la referencia actualizada sin re-registrar el listener
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data) => callbackRef.current(data);
    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event]);
}
