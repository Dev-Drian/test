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
            parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>);
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
      <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 text-emerald-400">
            <ChatIcon size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Chat con IA</h1>
          <p className="text-zinc-500 mb-6 max-w-sm">
            Selecciona un workspace para comenzar a chatear
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 flex flex-col bg-[#0f0f0f] border-r border-white/5 transition-all duration-300 overflow-hidden`}>
        <div className="flex flex-col h-full min-w-64">
          {/* Header del sidebar */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              disabled={!selectedAgentId}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon size="sm" />
              <span>Nueva conversación</span>
            </button>
          </div>

          {/* Selector de agente */}
          <div className="px-3 pb-3 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2 px-1">Agente</p>
            {loading ? (
              <div className="px-3 py-2 text-zinc-600 text-sm">Cargando...</div>
            ) : agents.length === 0 ? (
              <Link to="/agents" className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/10">
                <PlusIcon size="sm" />
                Crear agente
              </Link>
            ) : (
              <div className="space-y-1">
                {agents.map(agent => (
                  <button
                    key={agent._id}
                    onClick={() => handleAgentChange(agent._id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedAgentId === agent._id
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      selectedAgentId === agent._id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-400'
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
              <div className="px-3 py-4 text-zinc-600 text-sm text-center">Cargando...</div>
            ) : !selectedAgentId ? (
              <div className="px-3 py-8 text-center">
                <p className="text-zinc-600 text-sm">Selecciona un agente</p>
              </div>
            ) : chatList.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-zinc-600 text-sm">Sin conversaciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatList.map((chat) => (
                  <div 
                    key={chat._id} 
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                      chatId === chat._id 
                        ? 'bg-white/10 text-white' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <ChatIcon size="sm" className="shrink-0 opacity-60" />
                    {editingChatId === chat._id ? (
                      <input 
                        type="text" 
                        value={editingTitle} 
                        onChange={(e) => setEditingTitle(e.target.value)} 
                        onBlur={handleSaveRename} 
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRename(e)} 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex-1 px-2 py-0.5 rounded bg-black/50 border border-white/20 text-sm text-white focus:outline-none focus:border-emerald-500"
                        autoFocus 
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">{chat.title || "Nueva conversación"}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button 
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/10" 
                            onClick={(e) => handleStartRename(e, chat)} 
                            title="Renombrar"
                          >
                            <EditIcon size="xs" />
                          </button>
                          <button 
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10" 
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
        className="absolute left-2 top-20 z-10 p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
        style={{ left: sidebarOpen ? '252px' : '8px' }}
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
        {!selectedAgentId ? (
          /* Sin agente seleccionado */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mx-auto mb-6 text-purple-400">
                <RobotIcon size="lg" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Selecciona un agente</h2>
              <p className="text-zinc-500 text-sm">
                Elige un agente de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        ) : !chatId && messages.length === 0 ? (
          /* Estado inicial - sin chat */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mx-auto mb-6 text-emerald-400">
                  <SparklesIcon size="lg" />
                </div>
                <h1 className="text-2xl font-medium text-white mb-2">¿En qué puedo ayudarte?</h1>
                <p className="text-zinc-500 mb-8">
                  Estoy listo para responder tus preguntas sobre {workspaceName}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-sm">
                  <RobotIcon size="sm" />
                  <span>{selectedAgentName}</span>
                </div>
              </div>
            </div>
            
            {/* Input centrado en estado inicial */}
            <div className="p-4 pb-8">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto">
                <div className="relative bg-[#1a1a1a] rounded-2xl border border-white/10 focus-within:border-white/20 transition-colors shadow-lg">
                  <textarea
                    ref={textareaRef}
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-4 py-4 pr-14 bg-transparent text-white text-sm placeholder-zinc-500 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <SendIcon size="sm" />
                  </button>
                </div>
                <p className="text-center text-xs text-zinc-600 mt-3">
                  Presiona Enter para enviar, Shift + Enter para nueva línea
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
                    className={`py-6 ${idx !== 0 ? 'border-t border-white/5' : ''}`}
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.role === "user" 
                          ? "bg-emerald-500 text-white" 
                          : "bg-purple-500/20 text-purple-400"
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
                          m.role === "user" ? "text-emerald-400" : "text-purple-400"
                        }`}>
                          {m.role === "user" ? "Tú" : selectedAgentName}
                        </p>
                        <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                          {m.role === "user" ? m.content : renderMarkdown(m.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Indicador de escritura */}
                {sending && (
                  <div className="py-6 border-t border-white/5">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <SparklesIcon size="sm" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium mb-2 text-purple-400">{selectedAgentName}</p>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
                          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input fijo en la parte inferior */}
            <div className="border-t border-white/5 bg-[#0a0a0a]">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto p-4">
                <div className="relative bg-[#1a1a1a] rounded-2xl border border-white/10 focus-within:border-white/20 transition-colors shadow-lg">
                  <textarea
                    ref={textareaRef}
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-4 py-4 pr-14 bg-transparent text-white text-sm placeholder-zinc-500 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="absolute right-2 bottom-2 p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
