/**
 * SetupAssistantChat - Chat flotante para configuración asistida
 * 
 * Botón flotante que abre un chat modal donde el usuario puede
 * pedir ayuda para configurar su workspace (tablas, vistas, etc.)
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { sendChatMessage, listAgents, getOrCreateChat } from '../api/client';

// Iconos
const Icons = {
  sparkles: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L13.4 8.6L19 10L13.4 11.4L12 17L10.6 11.4L5 10L10.6 8.6L12 3Z" fill="currentColor" />
      <path d="M19 15L19.7 17.3L22 18L19.7 18.7L19 21L18.3 18.7L16 18L18.3 17.3L19 15Z" fill="currentColor" opacity="0.7" />
      <path d="M5 1L5.5 2.5L7 3L5.5 3.5L5 5L4.5 3.5L3 3L4.5 2.5L5 1Z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  minimize: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

// Ejemplos de preguntas
const EXAMPLE_QUESTIONS = [
  { text: "Quiero un sistema para mi restaurante", icon: "🍽️" },
  { text: "Necesito gestionar citas para mi clínica", icon: "🏥" },
  { text: "Cuando se cree un usuario, enviar email", icon: "⚡" },
  { text: "Notificar por correo al crear pedido", icon: "📧" },
  { text: "Crear un CRM de ventas", icon: "💼" },
];

/**
 * Renderiza texto con formato básico markdown
 */
function renderMarkdown(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Headers
        if (line.startsWith('###')) {
          return <h3 key={lineIdx} className="font-bold text-sm mt-2 mb-1 text-white">{line.replace(/^###\s*/, '')}</h3>;
        }
        if (line.startsWith('##')) {
          return <h2 key={lineIdx} className="font-bold text-base mt-2 mb-1 text-white">{line.replace(/^##\s*/, '')}</h2>;
        }
        
        // Lists
        if (line.match(/^[-•]\s/)) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
              <span className="text-violet-400 mt-0.5">•</span>
              <span>{renderInlineMarkdown(line.replace(/^[-•]\s*/, ''))}</span>
            </div>
          );
        }
        
        // Horizontal rule
        if (line.match(/^---+$/)) {
          return <hr key={lineIdx} className="border-white/10 my-2" />;
        }
        
        // Regular text
        return (
          <span key={lineIdx}>
            {renderInlineMarkdown(line)}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

function renderInlineMarkdown(text) {
  const parts = [];
  let remaining = text;
  let key = 0;
  
  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/_(.+?)_/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);
    
    const matches = [
      boldMatch && { match: boldMatch, type: 'bold', index: boldMatch.index },
      italicMatch && { match: italicMatch, type: 'italic', index: italicMatch.index },
      codeMatch && { match: codeMatch, type: 'code', index: codeMatch.index },
    ].filter(Boolean).sort((a, b) => a.index - b.index);
    
    if (matches.length > 0) {
      const first = matches[0];
      const beforeText = remaining.slice(0, first.index);
      if (beforeText) {
        parts.push(<span key={key++}>{beforeText}</span>);
      }
      
      if (first.type === 'bold') {
        parts.push(<strong key={key++} className="font-semibold text-white">{first.match[1]}</strong>);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++} className="text-slate-300">{first.match[1]}</em>);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className="px-1 py-0.5 bg-white/10 rounded text-violet-300 text-xs">{first.match[1]}</code>);
      }
      
      remaining = remaining.slice(first.index + first.match[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  
  return parts;
}

export default function SetupAssistantChat() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cargar agente al abrir
  useEffect(() => {
    if (isOpen && workspaceId && !agentId) {
      listAgents(workspaceId).then(res => {
        const agents = res.data || [];
        if (agents.length > 0) {
          setAgentId(agents[0]._id);
        }
      }).catch(console.error);
    }
  }, [isOpen, workspaceId, agentId]);

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    
    // Mensaje de bienvenida si es la primera vez
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! 👋 Soy tu asistente de configuración.

Puedo ayudarte con:

**📋 Configurar tu sistema:**
• Restaurante, Clínica, CRM, Reservas, Tareas

**⚡ Crear automatizaciones:**
• "Cuando se cree un usuario, enviar email de bienvenida"
• "Notificar por correo cada nuevo pedido"

¿Qué necesitas?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleSend = async (text = input) => {
    if (!text.trim() || sending || !workspaceId || !agentId) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await sendChatMessage({
        workspaceId,
        agentId,
        chatId,
        message: text.trim(),
      });

      const data = response.data;
      
      // Actualizar chatId si es nuevo
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No pude procesar tu mensaje.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (text) => {
    handleSend(text);
  };

  // No mostrar si no hay workspace
  if (!workspaceId) return null;

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 left-6 z-50 group"
          title="Asistente de configuración"
        >
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-110"
            style={{ 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
            }}
          >
            <span className="text-white">{Icons.sparkles}</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div 
              className="px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium"
              style={{ 
                background: 'rgba(30, 30, 40, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span className="text-white">Asistente de configuración</span>
            </div>
          </div>
          
          {/* Pulse animation */}
          <div 
            className="absolute inset-0 rounded-2xl animate-ping opacity-30"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          />
        </button>
      )}

      {/* Chat modal */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized 
              ? 'bottom-6 left-6 w-72' 
              : 'bottom-6 left-6 w-96 h-[600px] max-h-[80vh]'
          }`}
        >
          <div 
            className={`rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
              isMinimized ? 'h-14' : 'h-full'
            }`}
            style={{ 
              background: 'linear-gradient(180deg, rgba(25, 25, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => isMinimized && setIsMinimized(false)}
              style={{ 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1))',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  <span className="text-white scale-75">{Icons.sparkles}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Asistente de Configuración</h3>
                  {!isMinimized && (
                    <p className="text-xs text-slate-400">Te ayudo a configurar tu sistema</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {!isMinimized && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Minimizar"
                  >
                    {Icons.minimize}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Cerrar"
                >
                  {Icons.close}
                </button>
              </div>
            </div>

            {/* Contenido (solo si no está minimizado) */}
            {!isMinimized && (
              <>
                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                            : 'bg-white/5 text-slate-300'
                        }`}
                        style={msg.role === 'assistant' ? {
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        } : {}}
                      >
                        <div className="text-sm leading-relaxed">
                          {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicador de escribiendo */}
                  {sending && (
                    <div className="flex justify-start">
                      <div 
                        className="rounded-2xl px-4 py-3 bg-white/5"
                        style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-slate-400">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Ejemplos rápidos (solo si hay pocos mensajes) */}
                {messages.length <= 1 && !sending && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Ejemplos:</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_QUESTIONS.slice(0, 3).map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExampleClick(example.text)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5 hover:border-white/10"
                        >
                          <span>{example.icon}</span>
                          <span className="truncate max-w-[120px]">{example.text.split(' ').slice(0, 3).join(' ')}...</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div 
                  className="p-3"
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div 
                    className="flex items-end gap-2 rounded-xl p-2"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe tu mensaje..."
                      rows={1}
                      className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none outline-none max-h-24"
                      style={{ scrollbarWidth: 'thin' }}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || sending}
                      className={`p-2 rounded-lg transition-all ${
                        input.trim() && !sending
                          ? 'bg-violet-600 hover:bg-violet-500 text-white'
                          : 'bg-white/5 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {Icons.send}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
