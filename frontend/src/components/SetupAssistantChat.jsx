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
  robot: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  minimize: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  expand: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
};

// Ejemplos de preguntas - Organizados por capacidad
const EXAMPLE_QUESTIONS = [
  // Crear tablas
  { text: "Crear tabla de clientes", icon: "📊", color: "from-blue-500/20 to-cyan-500/20", category: "table" },
  { text: "Necesito una tabla de productos", icon: "📦", color: "from-purple-500/20 to-indigo-500/20", category: "table" },
  // Automatizaciones
  { text: "Cuando se cree un cliente, enviar email", icon: "⚡", color: "from-amber-500/20 to-yellow-500/20", category: "flow" },
  { text: "Notificar al crear un pedido nuevo", icon: "🔔", color: "from-rose-500/20 to-pink-500/20", category: "flow" },
  // Sistemas completos
  { text: "Sistema para mi restaurante", icon: "🍽️", color: "from-orange-500/20 to-red-500/20", category: "setup" },
  { text: "CRM para gestionar ventas", icon: "💼", color: "from-emerald-500/20 to-teal-500/20", category: "setup" },
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
        content: `¡Hola! 👋 Soy tu **Asistente IA con GPT-4o**.

Puedo hacer muchas cosas por ti:

**📊 Crear Tablas:**
• "Crear tabla de clientes"
• "Necesito una tabla de productos"

**⚡ Crear Automatizaciones:**
• "Cuando se cree un cliente, enviar email"
• "Notificar al crear pedido nuevo"

**🏢 Configurar Sistemas Completos:**
• "Sistema para mi restaurante"
• "CRM para gestionar ventas"

_Te mostraré un resumen antes de crear cualquier cosa._

¿Por dónde empezamos?`,
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
      {/* Botón flotante - Arriba del botón de ayuda */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 right-6 z-50 group"
          title="Asistente IA"
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
            }}
          >
            <span className="text-white">{Icons.robot}</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium bg-slate-900 border border-slate-700 shadow-xl">
              <span className="text-white">Asistente IA</span>
            </div>
          </div>
        </button>
      )}

      {/* Chat modal */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 ease-out ${
            isMinimized 
              ? 'bottom-24 right-6 w-80' 
              : 'bottom-6 right-6 w-[420px] h-[600px] max-h-[85vh]'
          }`}
        >
          <div 
            className={`rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
              isMinimized ? 'h-14' : 'h-full'
            }`}
            style={{ 
              background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => isMinimized && setIsMinimized(false)}
              style={{ 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <span className="text-white scale-90">{Icons.robot}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    Asistente IA
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gradient-to-r from-violet-500/30 to-purple-500/30 text-violet-300 border border-violet-500/30">GPT-4o</span>
                  </h3>
                  {!isMinimized && (
                    <p className="text-xs text-slate-400">Tablas • Automatizaciones • Sistemas</p>
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
                  className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
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
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-2 shrink-0 mt-1">
                          <span className="text-emerald-400 scale-75">{Icons.robot}</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-md'
                            : 'bg-slate-800/80 text-slate-200 rounded-bl-md border border-slate-700/50'
                        }`}
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
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-2 shrink-0">
                        <span className="text-emerald-400 scale-75">{Icons.robot}</span>
                      </div>
                      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-slate-800/80 border border-slate-700/50">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-slate-400">Procesando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Ejemplos rápidos (solo si hay pocos mensajes) */}
                {messages.length <= 1 && !sending && (
                  <div className="px-4 pb-3 border-t border-slate-700/50 pt-3">
                    <p className="text-xs text-slate-500 mb-2 font-medium">¿Qué puedo hacer?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {EXAMPLE_QUESTIONS.map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExampleClick(example.text)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs bg-gradient-to-r ${example.color} hover:opacity-80 text-slate-200 transition-all border border-slate-700/30 hover:border-slate-600/50`}
                        >
                          <span className="text-base shrink-0">{example.icon}</span>
                          <span className="truncate leading-tight">{example.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-3 bg-slate-900/80 border-t border-slate-700/50">
                  <div className="flex items-end gap-2 rounded-xl p-2 bg-slate-800/50 border border-slate-700/50 focus-within:border-emerald-500/50 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Crear tabla, automatización, o sistema..."
                      rows={1}
                      className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none outline-none max-h-24 min-h-[36px] py-2 px-2"
                      style={{ scrollbarWidth: 'thin' }}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || sending}
                      className={`p-2.5 rounded-lg transition-all shrink-0 ${
                        input.trim() && !sending
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-700/50 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {Icons.send}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 text-center mt-2">
                    Presiona Enter para enviar
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
