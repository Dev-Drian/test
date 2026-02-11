/**
 * Chat - Interfaz de chat premium con agentes IA
 */
import { useContext, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { 
  listAgents, 
  getOrCreateChat, 
  sendChatMessage, 
  listChats, 
  deleteChat,
  renameChat 
} from "../api/client";

// Iconos SVG
const Icons = {
  chat: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  robot: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-1.397.233a3.61 3.61 0 01-1.785-.163L15 19.5M5 14.5l-1.402 1.402c-1.232 1.232-.65 3.318 1.067 3.611l1.397.233a3.61 3.61 0 001.785-.163L9 19.5" />
    </svg>
  ),
};

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
    if (chatId) inputRef.current?.focus();
  }, [chatId]);

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
    if (!confirm("¿Eliminar esta conversación?")) return;
    try {
      await deleteChat(workspaceId, chatIdToDelete);
      setChatList(prev => prev.filter(c => c._id !== chatIdToDelete));
      if (chatId === chatIdToDelete) { setChatId(""); setMessages([]); }
    } catch (err) {
      console.error("Error deleting chat:", err);
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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#09090b' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            {Icons.chat}
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
    <div className="h-[calc(100vh-60px)] flex" style={{ background: '#09090b' }}>
      {/* Sidebar - Conversaciones */}
      <aside className="w-72 flex flex-col" style={{ background: '#0c0c0f', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {Icons.chat}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Chat</h2>
              <p className="text-xs text-zinc-600 truncate max-w-[140px]">{workspaceName}</p>
            </div>
          </div>

          {/* Selector de agente */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-600">Agente</label>
            <div className="grid grid-cols-1 gap-1.5">
              {loading ? (
                <div className="p-3 text-center text-zinc-600 text-xs">Cargando...</div>
              ) : agents.length === 0 ? (
                <Link to="/agents" className="p-3 rounded-lg text-center text-xs text-emerald-400 hover:bg-emerald-500/10 transition-all" style={{ border: '1px dashed rgba(16, 185, 129, 0.3)' }}>
                  + Crear agente
                </Link>
              ) : (
                agents.map(agent => (
                  <button
                    key={agent._id}
                    onClick={() => handleAgentChange(agent._id)}
                    className={`p-2.5 rounded-lg text-left transition-all flex items-center gap-2 ${
                      selectedAgentId === agent._id
                        ? 'text-purple-400'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    style={{
                      background: selectedAgentId === agent._id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      border: selectedAgentId === agent._id ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent'
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: selectedAgentId === agent._id ? '#8b5cf6' : 'rgba(255,255,255,0.05)' }}>
                      🤖
                    </div>
                    <span className="text-sm font-medium truncate">{agent.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Botón nueva conversación */}
        {selectedAgentId && (
          <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
            >
              {Icons.plus}
              Nueva conversación
            </button>
          </div>
        )}

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingChats ? (
            <div className="text-center py-8 text-zinc-600 text-sm">Cargando...</div>
          ) : !selectedAgentId ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-600" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {Icons.robot}
              </div>
              <p className="text-sm text-zinc-500">Selecciona un agente</p>
            </div>
          ) : chatList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500 mb-1">Sin conversaciones</p>
              <p className="text-xs text-zinc-600">Inicia una nueva</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chatList.map((chat) => (
                <div 
                  key={chat._id} 
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                    chatId === chat._id ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
                  }`}
                  style={{
                    background: chatId === chat._id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    border: chatId === chat._id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                  }}
                  onClick={() => handleSelectChat(chat)}
                >
                  {editingChatId === chat._id ? (
                    <input 
                      type="text" 
                      value={editingTitle} 
                      onChange={(e) => setEditingTitle(e.target.value)} 
                      onBlur={handleSaveRename} 
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename(e)} 
                      onClick={(e) => e.stopPropagation()} 
                      className="w-full px-2 py-1 rounded text-sm focus:outline-none"
                      style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      autoFocus 
                    />
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate pr-14">{chat.title || "Nueva conversación"}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {formatDate(chat.updatedAt || chat.createdAt)}
                        {chat.messageCount > 0 && ` • ${chat.messageCount} msgs`}
                      </p>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 rounded text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10" 
                          onClick={(e) => handleStartRename(e, chat)} 
                          title="Renombrar"
                        >
                          {Icons.edit}
                        </button>
                        <button 
                          className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10" 
                          onClick={(e) => handleDeleteChat(e, chat._id)} 
                          title="Eliminar"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Área principal del chat */}
      <main className="flex-1 flex flex-col">
        {!selectedAgentId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-400" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                {Icons.robot}
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Selecciona un agente</h2>
              <p className="text-zinc-500">
                Elige un agente de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        ) : !chatId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                {Icons.chat}
              </div>
              <h2 className="text-2xl font-semibold text-white mb-3">Inicia una conversación</h2>
              <p className="text-zinc-500 mb-6">
                Escribe un mensaje o selecciona una conversación existente
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>
                🤖 {selectedAgentName}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#0c0c0f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {chatList.find(c => c._id === chatId)?.title || "Conversación"}
                </p>
                <p className="text-xs text-zinc-600">{selectedAgentName}</p>
              </div>
            </div>
            
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-zinc-600">Escribe un mensaje para comenzar</p>
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div 
                    key={m._id || m.id || `msg-${idx}`} 
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold ${
                        m.role === "user" 
                          ? "bg-emerald-500 text-white" 
                          : "text-purple-300"
                      }`} style={m.role === "assistant" ? { background: 'rgba(139, 92, 246, 0.2)' } : {}}>
                        {m.role === "user" ? "Tú" : "AI"}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl ${
                        m.role === "user" 
                          ? "bg-emerald-500 text-white rounded-br-md" 
                          : "text-zinc-300 rounded-bl-md"
                      }`} style={m.role === "assistant" ? { background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' } : {}}>
                        <div className="text-sm leading-relaxed">
                          {m.role === "user" ? m.content : renderMarkdown(m.content)}
                        </div>
                        <span className={`text-[10px] mt-2 block ${
                          m.role === "user" ? "text-white/60" : "text-zinc-600"
                        }`}>
                          {formatTime(m.ts)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold text-purple-300" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                        AI
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md" style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0ms]"></span>
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:150ms]"></span>
                          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:300ms]"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}

        {/* Input de mensaje */}
        {selectedAgentId && (
          <form onSubmit={handleSend} className="p-4" style={{ background: '#0c0c0f', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="max-w-3xl mx-auto flex gap-3">
              <input 
                ref={inputRef} 
                type="text" 
                placeholder={chatId ? "Escribe un mensaje..." : "Escribe para iniciar una conversación..."} 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-zinc-600"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
                disabled={sending} 
              />
              <button 
                type="submit" 
                className="px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={sending || !input.trim()}
              >
                {Icons.send}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
