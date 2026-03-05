/**
 * SocketService — Singleton de Socket.io para el backend
 *
 * Permite emitir eventos en tiempo real a workspaces específicos
 * desde cualquier parte del código (FlowExecutor, chatController, etc.)
 *
 * Uso:
 *   import { getSocketService } from '../realtime/SocketService.js'
 *   getSocketService().toWorkspace(workspaceId, 'chat:message', { ... })
 *
 * Eventos emitidos (cliente escucha estos):
 *   chat:message          → nuevo mensaje del bot o del usuario
 *   chat:typing           → el bot está pensando
 *   record:created        → registro nuevo en una tabla
 *   record:updated        → registro actualizado
 *   flow:executed         → flujo terminó de ejecutarse
 *   payment:confirmed     → pago aprobado en Wompi
 *   notification:new      → nueva notificación interna
 *   agent:updated         → configuración del agente cambió
 */

import { Server as SocketIOServer } from 'socket.io';
import logger from '../config/logger.js';

const log = logger.child('SocketService');

let _instance = null;

export class SocketService {
  constructor() {
    this.io = null;
    // workspaceId → Set de socket ids (para saber qué clientes hay conectados)
    this._rooms = new Map();
  }

  /**
   * Inicializa Socket.io sobre un http.Server.
   * Debe llamarse UNA SOLA VEZ desde index.js.
   */
  init(httpServer, corsOrigins) {
    if (this.io) return this.io;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigins || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Preferir websocket, hacer polling sólo como fallback
      transports: ['websocket', 'polling'],
      // Compression para payloads grandes (múltiples registros)
      perMessageDeflate: true,
      pingTimeout: 20000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket) => {
      log.info('Cliente conectado', { socketId: socket.id });

      // El cliente se une a la sala de su workspace
      // Frontend emite:  socket.emit('join', { workspaceId, token })
      socket.on('join', ({ workspaceId, token } = {}) => {
        if (!workspaceId) return;
        socket.join(`ws:${workspaceId}`);
        log.info('Socket unido a workspace', { socketId: socket.id, workspaceId });
      });

      // El cliente se une a una sala de chat específica (para typing indicators)
      socket.on('join:chat', ({ chatId } = {}) => {
        if (!chatId) return;
        socket.join(`chat:${chatId}`);
      });

      socket.on('leave:chat', ({ chatId } = {}) => {
        if (chatId) socket.leave(`chat:${chatId}`);
      });

      socket.on('disconnect', (reason) => {
        log.info('Cliente desconectado', { socketId: socket.id, reason });
      });

      socket.on('error', (err) => {
        log.warn('Socket error', { socketId: socket.id, error: err.message });
      });
    });

    log.info('SocketService inicializado ✅');
    return this.io;
  }

  // ── Métodos de emisión ────────────────────────────────────────────────────

  /**
   * Emite un evento a TODOS los clientes de un workspace
   */
  toWorkspace(workspaceId, event, data = {}) {
    if (!this.io) {
      log.warn('SocketService no inicializado — no se puede emitir', { event, workspaceId });
      return;
    }
    this.io.to(`ws:${workspaceId}`).emit(event, { ...data, workspaceId, ts: Date.now() });
  }

  /**
   * Emite un evento a los clientes que están viendo un chat específico
   */
  toChat(chatId, event, data = {}) {
    if (!this.io) return;
    this.io.to(`chat:${chatId}`).emit(event, { ...data, chatId, ts: Date.now() });
  }

  /**
   * Emite a TODOS los workspaces (broadcast global — usar con cuidado)
   */
  broadcast(event, data = {}) {
    if (!this.io) return;
    this.io.emit(event, { ...data, ts: Date.now() });
  }

  // ── Helpers semánticos ────────────────────────────────────────────────────

  emitNewMessage(workspaceId, chatId, message) {
    this.toWorkspace(workspaceId, 'chat:message', { chatId, message });
    this.toChat(chatId, 'chat:message', { message });
  }

  emitTyping(workspaceId, chatId, isTyping) {
    this.toChat(chatId, 'chat:typing', { isTyping });
    this.toWorkspace(workspaceId, 'chat:typing', { chatId, isTyping });
  }

  emitRecordCreated(workspaceId, tableId, record) {
    this.toWorkspace(workspaceId, 'record:created', { tableId, record });
  }

  emitRecordUpdated(workspaceId, tableId, record) {
    this.toWorkspace(workspaceId, 'record:updated', { tableId, record });
  }

  emitFlowExecuted(workspaceId, flowId, status, log_) {
    this.toWorkspace(workspaceId, 'flow:executed', { flowId, status, log: log_ });
  }

  emitPaymentConfirmed(workspaceId, data) {
    this.toWorkspace(workspaceId, 'payment:confirmed', data);
  }

  emitNotification(workspaceId, notification) {
    this.toWorkspace(workspaceId, 'notification:new', { notification });
  }

  emitAgentUpdated(workspaceId, agentId) {
    this.toWorkspace(workspaceId, 'agent:updated', { agentId });
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
export function getSocketService() {
  if (!_instance) _instance = new SocketService();
  return _instance;
}
