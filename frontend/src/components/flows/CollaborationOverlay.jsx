import { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon,
  CursorArrowRaysIcon,
  LockClosedIcon,
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

/**
 * CollaborationOverlay - Indicadores de colaboración en tiempo real
 * Para usar con el editor de flujos (React Flow)
 */
export default function CollaborationOverlay({ 
  socket, 
  sessionId, 
  workspaceId, 
  flowId, 
  currentUser 
}) {
  const [collaborators, setCollaborators] = useState([]);
  const [cursors, setCursors] = useState({});
  const [lockedNodes, setLockedNodes] = useState({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  // Colores para usuarios
  const userColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
  ];
  
  const getUserColor = (userId) => {
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return userColors[hash % userColors.length];
  };
  
  // Conectar al socket
  useEffect(() => {
    if (!socket || !sessionId) return;
    
    // Unirse a la sesión
    socket.emit('collab:join', { sessionId, workspaceId, flowId, user: currentUser });
    
    // Listeners
    socket.on('collab:session:state', (state) => {
      setCollaborators(state.collaborators || []);
      setLockedNodes(state.lockedNodes || {});
      setChatMessages(state.chatHistory || []);
    });
    
    socket.on('collab:user:joined', (data) => {
      setCollaborators(prev => {
        if (prev.find(c => c.id === data.user.id)) return prev;
        return [...prev, data.user];
      });
    });
    
    socket.on('collab:user:left', (data) => {
      setCollaborators(prev => prev.filter(c => c.id !== data.userId));
      setCursors(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });
    
    socket.on('collab:cursor:update', (data) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: { x: data.x, y: data.y, name: data.name }
      }));
    });
    
    socket.on('collab:node:locked', (data) => {
      setLockedNodes(prev => ({
        ...prev,
        [data.nodeId]: { userId: data.userId, userName: data.userName }
      }));
    });
    
    socket.on('collab:node:unlocked', (data) => {
      setLockedNodes(prev => {
        const next = { ...prev };
        delete next[data.nodeId];
        return next;
      });
    });
    
    socket.on('collab:chat:message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });
    
    return () => {
      socket.emit('collab:leave', { sessionId });
      socket.off('collab:session:state');
      socket.off('collab:user:joined');
      socket.off('collab:user:left');
      socket.off('collab:cursor:update');
      socket.off('collab:node:locked');
      socket.off('collab:node:unlocked');
      socket.off('collab:chat:message');
    };
  }, [socket, sessionId, workspaceId, flowId, currentUser]);
  
  // Enviar posición del cursor
  const handleMouseMove = useCallback((e) => {
    if (!socket || !sessionId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    socket.emit('collab:cursor:move', {
      sessionId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, [socket, sessionId]);
  
  // Bloquear nodo al seleccionar
  const lockNode = useCallback((nodeId) => {
    if (!socket || !sessionId) return;
    socket.emit('collab:node:lock', { sessionId, nodeId });
  }, [socket, sessionId]);
  
  // Desbloquear nodo
  const unlockNode = useCallback((nodeId) => {
    if (!socket || !sessionId) return;
    socket.emit('collab:node:unlock', { sessionId, nodeId });
  }, [socket, sessionId]);
  
  // Enviar mensaje de chat
  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket) return;
    
    socket.emit('collab:chat:send', {
      sessionId,
      message: chatInput.trim()
    });
    setChatInput('');
  };
  
  // Verificar si un nodo está bloqueado por otro usuario
  const isNodeLockedByOther = (nodeId) => {
    const lock = lockedNodes[nodeId];
    return lock && lock.userId !== currentUser.id;
  };
  
  return (
    <>
      {/* Collaborators avatars */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Chat button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="relative p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
        >
          <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-gray-600" />
          {chatMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {chatMessages.filter(m => !m.read).length || ''}
            </span>
          )}
        </button>
        
        {/* Collaborator count */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-full shadow-lg">
          <UserGroupIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{collaborators.length}</span>
        </div>
        
        {/* Avatars */}
        <div className="flex -space-x-2">
          {collaborators.slice(0, 5).map((collab) => (
            <div
              key={collab.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow"
              style={{ backgroundColor: getUserColor(collab.id) }}
              title={collab.name || collab.email}
            >
              {(collab.name || collab.email || '?')[0].toUpperCase()}
            </div>
          ))}
          {collaborators.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-bold shadow">
              +{collaborators.length - 5}
            </div>
          )}
        </div>
      </div>
      
      {/* Remote cursors */}
      {Object.entries(cursors).map(([userId, cursor]) => {
        if (userId === currentUser.id) return null;
        const color = getUserColor(userId);
        
        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-40 transition-all duration-75"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-2px, -2px)'
            }}
          >
            <CursorArrowRaysIcon
              className="w-6 h-6"
              style={{ color }}
            />
            <span
              className="absolute left-5 top-0 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
      
      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col max-h-96">
          <div className="flex items-center justify-between p-3 border-b">
            <h4 className="font-medium text-gray-900">Chat de equipo</h4>
            <button
              onClick={() => setChatOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-48">
            {chatMessages.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">
                No hay mensajes aún
              </p>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.userId === currentUser.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.userId !== currentUser.id && (
                      <p className="text-xs font-medium mb-0.5" style={{ color: getUserColor(msg.userId) }}>
                        {msg.userName}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-0.5 ${
                      msg.userId === currentUser.id ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Export utilities for parent component */}
      <CollaborationContext.Provider value={{
        collaborators,
        cursors,
        lockedNodes,
        lockNode,
        unlockNode,
        isNodeLockedByOther,
        handleMouseMove,
        getUserColor
      }}>
        {/* This context can be consumed by the flow editor */}
      </CollaborationContext.Provider>
    </>
  );
}

// Context para compartir funciones de colaboración
import { createContext, useContext } from 'react';

export const CollaborationContext = createContext({});

export const useCollaboration = () => useContext(CollaborationContext);

// Componente para indicador de bloqueo en nodos
export function NodeLockIndicator({ nodeId, lockedNodes, getUserColor }) {
  const lock = lockedNodes?.[nodeId];
  
  if (!lock) return null;
  
  return (
    <div 
      className="absolute -top-2 -right-2 p-1 rounded-full"
      style={{ backgroundColor: getUserColor(lock.userId) }}
      title={`Editando: ${lock.userName}`}
    >
      <LockClosedIcon className="w-3 h-3 text-white" />
    </div>
  );
}
