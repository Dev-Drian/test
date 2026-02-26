/**
 * Chat - Interfaz de chat profesional estilo ChatGPT
 */
import { useContext, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useToast, useConfirm } from "../components/Toast";
import { 
  listAgents, 
  getOrCreateChat, 
  sendChatMessage, 
  listChats, 
  deleteChat,
  renameChat 
} from "../api/client";
import { RobotIcon, SendIcon, PlusIcon, TrashIcon, EditIcon, ChatIcon, SparklesIcon } from "../components/Icons";

/**
 * Renderiza Markdown básico en React
 */
function renderMarkdown(text) {
  if (!text) return null;
  
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        const parts = [];
        let remaining = line;
        let key = 0;
        
        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
          
          if (boldMatch) {
            const beforeBold = remaining.slice(0, boldMatch.index);
            if (beforeBold) {
              parts.push(<span key={key++}>{beforeBold}</span>);
            }
            parts.push(<strong key={key++} className="font-semibold text-content-primary">{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
          } else {
            parts.push(<span key={key++}>{remaining}</span>);
            break;
          }
        }
        
        return (
          <span key={lineIdx}>
            {parts}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

export default function Chat() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedAgentName, setSelectedAgentName] = useState("");
  const [chatId, setChatId] = useState("");
  const [chatList, setChatList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [newChatId, setNewChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Cargar agentes
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    listAgents(workspaceId)
      .then((res) => {
        const agentsList = res.data || [];
        setAgents(agentsList);
        if (agentsList.length === 1) {
          setSelectedAgentId(agentsList[0]._id);
          setSelectedAgentName(agentsList[0].name);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  // Cargar historial de chats
  useEffect(() => {
    if (!workspaceId || !selectedAgentId) {
      setChatList([]);
      return;
    }
    setLoadingChats(true);
    listChats(workspaceId, selectedAgentId)
      .then((res) => setChatList(res.data || []))
      .catch(() => setChatList([]))
      .finally(() => setLoadingChats(false));
  }, [workspaceId, selectedAgentId]);

  // Cargar chat seleccionado
  useEffect(() => {
    if (!workspaceId || !selectedAgentId || !chatId) {
      setMessages([]);
      return;
    }
    if (chatId === newChatId) {
      setNewChatId(null);
      return;
    }
    getOrCreateChat(workspaceId, selectedAgentId, chatId)
      .then((res) => {
        const msgs = res.data.chat?.messages || [];
        setMessages(msgs.map((m, idx) => ({ 
          ...m, 
          id: m._id || m.id || `msg-${idx}`, 
          ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now() 
        })));
      })
      .catch(() => setMessages([]));
  }, [workspaceId, selectedAgentId, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatId) textareaRef.current?.focus();
  }, [chatId]);

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleAgentChange = (agentId) => {
    setSelectedAgentId(agentId);
    const agent = agents.find(a => a._id === agentId);
    setSelectedAgentName(agent?.name || "");
    setChatId("");
    setMessages([]);
  };

  const handleNewChat = async () => {
    if (!workspaceId || !selectedAgentId) return;
    try {
      const res = await getOrCreateChat(workspaceId, selectedAgentId);
      const newChat = res.data.chat || res.data;
      setNewChatId(newChat._id);
      setChatId(newChat._id);
      setMessages([]);
      setChatList(prev => [{ _id: newChat._id, title: "Nueva conversación", messageCount: 0, createdAt: newChat.createdAt }, ...prev]);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleSelectChat = (chat) => setChatId(chat._id);

  const handleDeleteChat = async (e, chatIdToDelete) => {
    e.stopPropagation();
    
    const confirmed = await confirm({
      title: 'Eliminar conversación',
      message: '¿Estás seguro de eliminar esta conversación? Se perderán todos los mensajes y no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await deleteChat(workspaceId, chatIdToDelete);
      setChatList(prev => prev.filter(c => c._id !== chatIdToDelete));
      if (chatId === chatIdToDelete) { setChatId(""); setMessages([]); }
      toast.success('Conversación eliminada correctamente');
    } catch (err) {
      console.error("Error deleting chat:", err);
      toast.error('Error al eliminar la conversación');
    }
  };

  const handleStartRename = (e, chat) => {
    e.stopPropagation();
    setEditingChatId(chat._id);
    setEditingTitle(chat.title || "Nueva conversación");
  };

  const handleSaveRename = async (e) => {
    e.stopPropagation();
    if (!editingTitle.trim()) { setEditingChatId(null); return; }
    try {
      await renameChat(workspaceId, editingChatId, editingTitle.trim());
      setChatList(prev => prev.map(c => c._id === editingChatId ? { ...c, title: editingTitle.trim() } : c));
    } catch (err) {
      console.error("Error renaming chat:", err);
    }
    setEditingChatId(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !workspaceId || sending) return;

    let currentChatId = chatId;
    if (!currentChatId) {
      try {
        const res = await getOrCreateChat(workspaceId, selectedAgentId);
        const newChat = res.data.chat || res.data;
        currentChatId = newChat._id;
        setNewChatId(currentChatId);
        setChatId(currentChatId);
        setChatList(prev => [{ _id: currentChatId, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 0, createdAt: newChat.createdAt }, ...prev]);
      } catch (err) {
        console.error("Error creating chat:", err);
        return;
      }
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages((prev) => [...prev, { role: "user", content: text, id: Date.now(), ts: Date.now() }]);
    setSending(true);

    try {
      const res = await sendChatMessage({
        workspaceId,
        agentId: selectedAgentId || undefined,
        chatId: currentChatId,
        message: text,
        token: import.meta.env.VITE_OPENAI_KEY || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const reply = res.data?.response || res.data?.text || "Sin respuesta.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, id: Date.now() + 1, ts: Date.now() }]);
      setChatList(prev => prev.map(c => {
        if (c._id === currentChatId && c.messageCount === 0) {
          return { ...c, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 2, lastMessage: reply.slice(0, 50) };
        }
        return c;
      }));
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + (err.response?.data?.error || err.message), id: Date.now() + 1, ts: Date.now() }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-6 text-primary-400">
            <ChatIcon size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-content-primary mb-2">Chat con IA</h1>
          <p className="text-content-tertiary mb-6 max-w-sm">
            Selecciona un workspace para comenzar a chatear
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: '#0a0a12' }}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden`}
        style={{ background: '#0e0e1a', borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="flex flex-col h-full min-w-64">
          {/* Header del sidebar */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              disabled={!selectedAgentId}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5"
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <PlusIcon size="sm" />
              <span>Nueva conversación</span>
            </button>
          </div>

          {/* Selector de agente */}
          <div className="px-3 pb-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <p className="text-[10px] uppercase tracking-wider mb-2 px-1 text-white/40">Agente</p>
            {loading ? (
              <div className="px-3 py-2 text-white/40 text-sm">Cargando...</div>
            ) : agents.length === 0 ? (
              <Link to="/agents" className="flex items-center gap-2 px-3 py-2 rounded-lg text-violet-400 text-sm hover:bg-violet-500/10">
                <PlusIcon size="sm" />
                Crear agente
              </Link>
            ) : (
              <div className="space-y-1">
                {agents.map(agent => (
                  <button
                    key={agent._id}
                    onClick={() => handleAgentChange(agent._id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedAgentId === agent._id
                        ? 'text-white bg-white/8'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/4'
                    }`}
                    style={selectedAgentId === agent._id ? {
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    } : { border: '1px solid transparent' }}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      selectedAgentId === agent._id 
                        ? 'bg-violet-500 text-white' 
                        : 'bg-white/10 text-white/50'
                    }`}>
                      <RobotIcon size="xs" />
                    </div>
                    <span className="truncate">{agent.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingChats ? (
              <div className="px-3 py-4 text-white/40 text-sm text-center">Cargando...</div>
            ) : !selectedAgentId ? (
              <div className="px-3 py-8 text-center">
                <p className="text-white/30 text-sm">Selecciona un agente</p>
              </div>
            ) : chatList.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-white/30 text-sm">Sin conversaciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatList.map((chat) => (
                  <div 
                    key={chat._id} 
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      chatId === chat._id 
                        ? 'text-white bg-white/8' 
                        : 'text-white/50 hover:text-white/80 hover:bg-white/4'
                    }`}
                    style={chatId === chat._id ? { border: '1px solid rgba(255, 255, 255, 0.08)' } : { border: '1px solid transparent' }}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <ChatIcon size="sm" className={`shrink-0 ${chatId === chat._id ? 'text-violet-400' : 'opacity-50'}`} />
                    {editingChatId === chat._id ? (
                      <input 
                        type="text" 
                        value={editingTitle} 
                        onChange={(e) => setEditingTitle(e.target.value)} 
                        onBlur={handleSaveRename} 
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRename(e)} 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex-1 px-2 py-0.5 rounded-lg text-sm text-white focus:outline-none"
                        style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                        autoFocus 
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">{chat.title || "Nueva conversación"}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button 
                            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-violet-500/20 transition-all" 
                            onClick={(e) => handleStartRename(e, chat)} 
                            title="Renombrar"
                          >
                            <EditIcon size="xs" />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg text-white/50 hover:text-pink-400 hover:bg-pink-500/20 transition-all" 
                            onClick={(e) => handleDeleteChat(e, chat._id)} 
                            title="Eliminar"
                          >
                            <TrashIcon size="xs" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-2 top-20 z-10 p-2 rounded-xl transition-all hover:bg-white/10"
        style={{ 
          left: sidebarOpen ? '252px' : '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'rgba(255, 255, 255, 0.6)'
        }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          )}
        </svg>
      </button>

      {/* Área principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header con agente activo */}
        {selectedAgentId && (
          <div className="shrink-0 px-6 py-3" style={{ 
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-violet-500">
                <RobotIcon size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{selectedAgentName}</p>
                <p className="text-xs text-white/40">Asistente activo</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{ 
                    background: 'rgba(52, 211, 153, 0.1)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    color: '#34d399'
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En línea
                </span>
              </div>
            </div>
          </div>
        )}
        
        {!selectedAgentId ? (
          /* Sin agente seleccionado */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4 animate-fade-up">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-violet-400 bg-violet-500/10">
                <RobotIcon size="lg" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Selecciona un agente</h2>
              <p className="text-white/40 text-sm">
                Elige un agente de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        ) : !chatId && messages.length === 0 ? (
          /* Estado inicial - sin chat */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4 animate-fade-up">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-violet-500/10">
                  <SparklesIcon size="lg" className="text-violet-400" />
                </div>
                <h1 className="text-2xl font-medium text-white mb-2">¿En qué puedo ayudarte?</h1>
                <p className="text-white/40 mb-8">
                  Estoy listo para responder tus preguntas sobre <span className="text-violet-400">{workspaceName}</span>
                </p>
              </div>
            </div>
            
            {/* Input centrado en estado inicial */}
            <div className="p-4 pb-8">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto">
                <div className="relative rounded-2xl transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-5 py-4 pr-14 bg-transparent text-white text-sm placeholder-white/30 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:opacity-80 bg-violet-500"
                  >
                    <SendIcon size="sm" />
                  </button>
                </div>
                <p className="text-center text-xs text-white/30 mt-3">
                  Presiona <span className="text-white/50">Enter</span> para enviar, <span className="text-white/50">Shift + Enter</span> para nueva línea
                </p>
              </form>
            </div>
          </div>
        ) : (
          /* Chat activo con mensajes */
          <>
            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto py-6 px-4">
                {messages.map((m, idx) => (
                  <div 
                    key={m._id || m.id || `msg-${idx}`} 
                    className={`py-5 ${idx !== 0 ? '' : ''}`}
                    style={idx !== 0 ? { borderTop: '1px solid rgba(255, 255, 255, 0.05)' } : {}}
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.role === "user" 
                          ? "bg-violet-500 text-white" 
                          : "bg-emerald-500 text-white"
                      }`}>
                        {m.role === "user" ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        ) : (
                          <SparklesIcon size="sm" />
                        )}
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium mb-1.5 ${
                          m.role === "user" ? "text-violet-400" : "text-emerald-400"
                        }`}>
                          {m.role === "user" ? "Tú" : selectedAgentName}
                        </p>
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user" ? "text-white/70" : "text-white/90"
                        }`}>
                          {m.role === "user" ? m.content : renderMarkdown(m.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Indicador de escritura */}
                {sending && (
                  <div className="py-5 animate-fade-in" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500 text-white">
                        <SparklesIcon size="sm" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-2 text-emerald-400">{selectedAgentName}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot"></span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot"></span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 typing-dot"></span>
                          </div>
                          <span className="text-xs text-white/40">Escribiendo...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input fijo en la parte inferior */}
            <div style={{ 
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(10, 10, 18, 0.95)'
            }}>
              <form onSubmit={handleSend} className="max-w-3xl mx-auto p-4">
                <div className="relative rounded-2xl transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-5 py-4 pr-14 bg-transparent text-white text-sm placeholder-white/30 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:opacity-80 bg-violet-500"
                  >
                    <SendIcon size="sm" />
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
      
      {ConfirmModal}
    </div>
  );
}
