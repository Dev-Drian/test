/**
 * CollaborationService - Edición colaborativa en tiempo real
 * 
 * Permite a múltiples usuarios editar el mismo flujo simultáneamente
 * con sincronización en tiempo real via Socket.io
 */

import { connectDB } from '../config/db.js';
import cache from '../config/cache.js';
import logger from '../config/logger.js';
import { getSocketService } from '../realtime/SocketService.js';

const log = logger.child('CollaborationService');

// Almacén de sesiones activas de edición
const activeSessions = new Map();

// Almacén de cursores de usuarios
const userCursors = new Map();

// Lock timeouts (para evitar conflictos)
const locks = new Map();

/**
 * Une a un usuario a una sesión de edición
 */
export function joinEditSession(workspaceId, flowId, userId, userName, socketId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  
  if (!activeSessions.has(sessionKey)) {
    activeSessions.set(sessionKey, {
      workspaceId,
      flowId,
      users: new Map(),
      history: [],
      version: 0,
      createdAt: new Date().toISOString()
    });
  }
  
  const session = activeSessions.get(sessionKey);
  
  // Asignar color al usuario
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const colorIndex = session.users.size % colors.length;
  
  const userInfo = {
    id: userId,
    name: userName,
    socketId,
    color: colors[colorIndex],
    joinedAt: new Date().toISOString(),
    cursor: null,
    selectedNode: null
  };
  
  session.users.set(userId, userInfo);
  
  // Notificar a otros usuarios
  broadcastToSession(sessionKey, 'collab:user:joined', {
    user: userInfo,
    totalUsers: session.users.size
  }, socketId);
  
  log.info('User joined edit session', { userId, flowId, totalUsers: session.users.size });
  
  return {
    sessionKey,
    users: Array.from(session.users.values()),
    version: session.version,
    userColor: userInfo.color
  };
}

/**
 * Remueve a un usuario de la sesión
 */
export function leaveEditSession(workspaceId, flowId, userId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return;
  
  const user = session.users.get(userId);
  session.users.delete(userId);
  
  // Liberar cualquier lock del usuario
  releaseLock(sessionKey, userId);
  
  // Notificar a otros
  broadcastToSession(sessionKey, 'collab:user:left', {
    userId,
    userName: user?.name,
    totalUsers: session.users.size
  });
  
  // Si no quedan usuarios, cerrar sesión después de un tiempo
  if (session.users.size === 0) {
    setTimeout(() => {
      if (activeSessions.get(sessionKey)?.users.size === 0) {
        activeSessions.delete(sessionKey);
        log.info('Edit session closed', { sessionKey });
      }
    }, 60000); // 1 minuto
  }
  
  return { success: true };
}

/**
 * Actualiza la posición del cursor de un usuario
 */
export function updateCursor(workspaceId, flowId, userId, position) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return;
  
  const user = session.users.get(userId);
  if (user) {
    user.cursor = position;
    
    broadcastToSession(sessionKey, 'collab:cursor:move', {
      userId,
      userName: user.name,
      color: user.color,
      position
    }, user.socketId);
  }
}

/**
 * Selecciona un nodo (para evitar edición simultánea del mismo nodo)
 */
export function selectNode(workspaceId, flowId, userId, nodeId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return { success: false, error: 'Sesión no encontrada' };
  
  const user = session.users.get(userId);
  if (!user) return { success: false, error: 'Usuario no encontrado' };
  
  // Verificar si otro usuario tiene el nodo seleccionado
  for (const [otherUserId, otherUser] of session.users.entries()) {
    if (otherUserId !== userId && otherUser.selectedNode === nodeId) {
      return {
        success: false,
        error: `${otherUser.name} está editando este nodo`,
        lockedBy: otherUser.name,
        lockedByColor: otherUser.color
      };
    }
  }
  
  // Deseleccionar nodo anterior si había
  if (user.selectedNode) {
    broadcastToSession(sessionKey, 'collab:node:deselected', {
      userId,
      nodeId: user.selectedNode
    });
  }
  
  user.selectedNode = nodeId;
  
  broadcastToSession(sessionKey, 'collab:node:selected', {
    userId,
    userName: user.name,
    color: user.color,
    nodeId
  }, user.socketId);
  
  return { success: true };
}

/**
 * Aplica un cambio al flujo (con sincronización)
 */
export async function applyChange(workspaceId, flowId, userId, change) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return { success: false, error: 'Sesión no encontrada' };
  
  const user = session.users.get(userId);
  if (!user) return { success: false, error: 'Usuario no encontrado' };
  
  // Validar que el usuario puede hacer este cambio
  if (change.nodeId && user.selectedNode !== change.nodeId) {
    // Permitir si nadie más lo tiene seleccionado
    const isLocked = Array.from(session.users.values()).some(
      u => u.id !== userId && u.selectedNode === change.nodeId
    );
    
    if (isLocked) {
      return { success: false, error: 'Nodo bloqueado por otro usuario' };
    }
  }
  
  // Incrementar versión
  session.version++;
  
  // Registrar en historial
  const historyEntry = {
    id: `change_${Date.now()}`,
    userId,
    userName: user.name,
    type: change.type, // add_node, update_node, delete_node, add_edge, delete_edge, move_node
    data: change,
    version: session.version,
    timestamp: new Date().toISOString()
  };
  
  session.history.push(historyEntry);
  
  // Mantener solo últimos 100 cambios en memoria
  if (session.history.length > 100) {
    session.history = session.history.slice(-100);
  }
  
  // Aplicar el cambio a la BD
  try {
    await persistChange(workspaceId, flowId, change);
  } catch (error) {
    log.error('Error persisting change', { error: error.message });
  }
  
  // Notificar a otros usuarios
  broadcastToSession(sessionKey, 'collab:change', {
    change: historyEntry,
    version: session.version
  }, user.socketId);
  
  return {
    success: true,
    version: session.version,
    changeId: historyEntry.id
  };
}

/**
 * Persiste un cambio en la BD
 */
async function persistChange(workspaceId, flowId, change) {
  const db = await connectDB(`workspace_${workspaceId}_flows`);
  const flow = await db.get(flowId);
  
  let nodes = flow.definition?.nodes || [];
  let edges = flow.definition?.edges || [];
  
  switch (change.type) {
    case 'add_node':
      nodes.push(change.node);
      break;
      
    case 'update_node':
      nodes = nodes.map(n => n.id === change.nodeId ? { ...n, ...change.updates } : n);
      break;
      
    case 'delete_node':
      nodes = nodes.filter(n => n.id !== change.nodeId);
      edges = edges.filter(e => e.source !== change.nodeId && e.target !== change.nodeId);
      break;
      
    case 'move_node':
      nodes = nodes.map(n => 
        n.id === change.nodeId 
          ? { ...n, position: change.position }
          : n
      );
      break;
      
    case 'add_edge':
      edges.push(change.edge);
      break;
      
    case 'delete_edge':
      edges = edges.filter(e => e.id !== change.edgeId);
      break;
      
    case 'bulk_update':
      if (change.nodes) nodes = change.nodes;
      if (change.edges) edges = change.edges;
      break;
  }
  
  flow.definition = { nodes, edges };
  flow.updatedAt = new Date().toISOString();
  
  await db.insert(flow);
  
  // Invalidar cache
  cache.del(cache.key('flow', workspaceId, flowId));
}

/**
 * Obtiene historial de cambios
 */
export function getChangeHistory(workspaceId, flowId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return [];
  
  return session.history.slice(-50); // Últimos 50 cambios
}

/**
 * Deshace el último cambio de un usuario
 */
export async function undoChange(workspaceId, flowId, userId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return { success: false };
  
  // Buscar último cambio del usuario
  const lastChange = [...session.history]
    .reverse()
    .find(h => h.userId === userId && !h.undone);
  
  if (!lastChange) return { success: false, error: 'No hay cambios para deshacer' };
  
  // Generar cambio inverso
  const inverseChange = generateInverseChange(lastChange);
  
  if (inverseChange) {
    lastChange.undone = true;
    await applyChange(workspaceId, flowId, userId, inverseChange);
    return { success: true };
  }
  
  return { success: false, error: 'No se puede deshacer este tipo de cambio' };
}

/**
 * Genera un cambio inverso
 */
function generateInverseChange(change) {
  switch (change.type) {
    case 'add_node':
      return { type: 'delete_node', nodeId: change.data.node.id };
      
    case 'delete_node':
      return { type: 'add_node', node: change.data.originalNode };
      
    case 'update_node':
      return { type: 'update_node', nodeId: change.data.nodeId, updates: change.data.previousValues };
      
    case 'move_node':
      return { type: 'move_node', nodeId: change.data.nodeId, position: change.data.previousPosition };
      
    case 'add_edge':
      return { type: 'delete_edge', edgeId: change.data.edge.id };
      
    case 'delete_edge':
      return { type: 'add_edge', edge: change.data.originalEdge };
      
    default:
      return null;
  }
}

/**
 * Adquiere un lock exclusivo
 */
export function acquireLock(workspaceId, flowId, userId, resourceId, timeout = 30000) {
  const lockKey = `${workspaceId}:${flowId}:${resourceId}`;
  
  const existingLock = locks.get(lockKey);
  if (existingLock && existingLock.userId !== userId) {
    const lockAge = Date.now() - existingLock.acquiredAt;
    if (lockAge < existingLock.timeout) {
      return { success: false, lockedBy: existingLock.userName };
    }
  }
  
  const session = activeSessions.get(`${workspaceId}:${flowId}`);
  const user = session?.users.get(userId);
  
  locks.set(lockKey, {
    userId,
    userName: user?.name || 'Unknown',
    resourceId,
    acquiredAt: Date.now(),
    timeout
  });
  
  return { success: true };
}

/**
 * Libera un lock
 */
export function releaseLock(sessionKey, userId) {
  for (const [lockKey, lock] of locks.entries()) {
    if (lock.userId === userId && lockKey.startsWith(sessionKey)) {
      locks.delete(lockKey);
    }
  }
}

/**
 * Envía un mensaje de chat en la sesión de edición
 */
export function sendSessionMessage(workspaceId, flowId, userId, message) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return;
  
  const user = session.users.get(userId);
  if (!user) return;
  
  const chatMessage = {
    id: `msg_${Date.now()}`,
    userId,
    userName: user.name,
    color: user.color,
    message,
    timestamp: new Date().toISOString()
  };
  
  broadcastToSession(sessionKey, 'collab:chat:message', chatMessage);
  
  return chatMessage;
}

/**
 * Obtiene usuarios activos en una sesión
 */
export function getActiveUsers(workspaceId, flowId) {
  const sessionKey = `${workspaceId}:${flowId}`;
  const session = activeSessions.get(sessionKey);
  
  if (!session) return [];
  
  return Array.from(session.users.values()).map(u => ({
    id: u.id,
    name: u.name,
    color: u.color,
    cursor: u.cursor,
    selectedNode: u.selectedNode,
    joinedAt: u.joinedAt
  }));
}

/**
 * Obtiene estadísticas de todas las sesiones
 */
export function getSessionStats() {
  return {
    activeSessions: activeSessions.size,
    totalUsers: Array.from(activeSessions.values())
      .reduce((sum, s) => sum + s.users.size, 0),
    sessions: Array.from(activeSessions.entries()).map(([key, session]) => ({
      key,
      flowId: session.flowId,
      users: session.users.size,
      version: session.version,
      createdAt: session.createdAt
    }))
  };
}

/**
 * Broadcast a una sesión (excepto al remitente)
 */
function broadcastToSession(sessionKey, event, data, excludeSocketId = null) {
  const session = activeSessions.get(sessionKey);
  const io = getSocketService().io;
  if (!session || !io) return;
  
  for (const user of session.users.values()) {
    if (user.socketId !== excludeSocketId) {
      io.to(user.socketId).emit(event, {
        ...data,
        sessionKey
      });
    }
  }
}

/**
 * Configura los handlers de Socket.io para colaboración
 */
export function setupCollaborationHandlers(socket, userId, userName) {
  socket.on('collab:join', ({ workspaceId, flowId }) => {
    const result = joinEditSession(workspaceId, flowId, userId, userName, socket.id);
    socket.emit('collab:joined', result);
  });
  
  socket.on('collab:leave', ({ workspaceId, flowId }) => {
    leaveEditSession(workspaceId, flowId, userId);
  });
  
  socket.on('collab:cursor', ({ workspaceId, flowId, position }) => {
    updateCursor(workspaceId, flowId, userId, position);
  });
  
  socket.on('collab:select', ({ workspaceId, flowId, nodeId }) => {
    const result = selectNode(workspaceId, flowId, userId, nodeId);
    socket.emit('collab:select:result', result);
  });
  
  socket.on('collab:change', async ({ workspaceId, flowId, change }) => {
    const result = await applyChange(workspaceId, flowId, userId, change);
    socket.emit('collab:change:result', result);
  });
  
  socket.on('collab:chat', ({ workspaceId, flowId, message }) => {
    sendSessionMessage(workspaceId, flowId, userId, message);
  });
  
  socket.on('collab:undo', async ({ workspaceId, flowId }) => {
    const result = await undoChange(workspaceId, flowId, userId);
    socket.emit('collab:undo:result', result);
  });
  
  // Limpiar al desconectar
  socket.on('disconnect', () => {
    for (const [key, session] of activeSessions.entries()) {
      if (session.users.has(userId)) {
        const [workspaceId, flowId] = key.split(':');
        leaveEditSession(workspaceId, flowId, userId);
      }
    }
  });
}

export default {
  joinEditSession,
  leaveEditSession,
  updateCursor,
  selectNode,
  applyChange,
  getChangeHistory,
  undoChange,
  acquireLock,
  releaseLock,
  sendSessionMessage,
  getActiveUsers,
  getSessionStats,
  setupCollaborationHandlers
};
