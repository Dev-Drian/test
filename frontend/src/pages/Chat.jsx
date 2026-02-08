import { useContext, useEffect, useState, useRef } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { 
  listAgents, 
  getOrCreateChat, 
  sendChatMessage, 
  listChats, 
  deleteChat,
  renameChat 
} from "../api/client";
import styles from "./Chat.module.css";

/**
 * Renderiza Markdown básico (negrita, cursiva, emojis) en React
 */
function renderMarkdown(text) {
  if (!text) return null;
  
  // Dividir por líneas para manejar saltos de línea
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIdx) => {
        // Procesar **negrita**
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
            parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
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
  const { workspaceId } = useContext(WorkspaceContext);
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

  // Cargar historial de chats cuando cambia el agente
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

  // Cargar chat seleccionado (solo cuando el usuario selecciona un chat existente)
  const [newChatId, setNewChatId] = useState(null);
  
  useEffect(() => {
    if (!workspaceId || !selectedAgentId || !chatId) {
      setMessages([]);
      return;
    }
    // No recargar si acabamos de crear este chat específico
    if (chatId === newChatId) {
      setNewChatId(null);
      return;
    }
    getOrCreateChat(workspaceId, selectedAgentId, chatId)
      .then((res) => {
        const msgs = res.data.chat?.messages || [];
        // Map timestamp to ts for frontend compatibility and ensure unique id
        setMessages(msgs.map((m, idx) => ({ ...m, id: m._id || m.id || `msg-${idx}`, ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now() })));
      })
      .catch(() => setMessages([]));
  }, [workspaceId, selectedAgentId, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatId) inputRef.current?.focus();
  }, [chatId]);

  const handleAgentChange = (e) => {
    const agentId = e.target.value;
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
      const newChat = res.data.chat || res.data; // Backend returns {chat, agent}
      setNewChatId(newChat._id); // Marcar este chat específico como nuevo
      setChatId(newChat._id);
      setMessages([]);
      setChatList(prev => [{ _id: newChat._id, title: "Nueva conversacion", messageCount: 0, createdAt: newChat.createdAt }, ...prev]);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const handleSelectChat = (chat) => setChatId(chat._id);

  const handleDeleteChat = async (e, chatIdToDelete) => {
    e.stopPropagation();
    if (!confirm("Eliminar esta conversacion?")) return;
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
    setEditingTitle(chat.title || "Nueva conversacion");
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
        const newChat = res.data.chat || res.data; // Backend returns {chat, agent}
        currentChatId = newChat._id;
        setNewChatId(currentChatId); // Marcar este chat específico como nuevo
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
        // No enviar today - dejar que el backend calcule con timezone de Colombia
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

  if (!workspaceId) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>Chat con IA</h2>
          <p>Selecciona un workspace en Inicio o Workspaces para comenzar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Conversaciones</h2>
          <button className={styles.newChatBtn} onClick={handleNewChat} disabled={!selectedAgentId} title="Nueva conversacion">+</button>
        </div>
        <div className={styles.agentSelector}>
          <select value={selectedAgentId} onChange={handleAgentChange} className={styles.agentSelect}>
            <option value="">Seleccionar agente</option>
            {agents.map((a) => (<option key={a._id} value={a._id}>{a.name}</option>))}
          </select>
        </div>
        <div className={styles.chatListContainer}>
          {loadingChats ? (
            <div className={styles.loadingChats}>Cargando...</div>
          ) : chatList.length === 0 ? (
            <div className={styles.noChats}>{selectedAgentId ? "Sin conversaciones. Inicia una nueva." : "Selecciona un agente"}</div>
          ) : (
            <div className={styles.chatList}>
              {chatList.map((chat) => (
                <div key={chat._id} className={`${styles.chatItem} ${chatId === chat._id ? styles.chatItemActive : ""}`} onClick={() => handleSelectChat(chat)}>
                  {editingChatId === chat._id ? (
                    <input type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={handleSaveRename} onKeyDown={(e) => e.key === "Enter" && handleSaveRename(e)} onClick={(e) => e.stopPropagation()} className={styles.renameInput} autoFocus />
                  ) : (
                    <>
                      <div className={styles.chatItemContent}>
                        <span className={styles.chatTitle}>{chat.title || "Nueva conversacion"}</span>
                        <span className={styles.chatMeta}>{formatDate(chat.updatedAt || chat.createdAt)}{chat.messageCount > 0 && ` - ${chat.messageCount} msgs`}</span>
                      </div>
                      <div className={styles.chatActions}>
                        <button className={styles.chatActionBtn} onClick={(e) => handleStartRename(e, chat)} title="Renombrar">E</button>
                        <button className={styles.chatActionBtn} onClick={(e) => handleDeleteChat(e, chat._id)} title="Eliminar">X</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className={styles.chatArea}>
        {!selectedAgentId ? (
          <div className={styles.emptyChat}>
            <h3>Selecciona un agente</h3>
            <p>Elige un agente de la lista para comenzar a chatear</p>
          </div>
        ) : !chatId ? (
          <div className={styles.emptyChat}>
            <h3>Inicia una conversacion</h3>
            <p>Selecciona una conversacion existente o escribe un mensaje para comenzar</p>
            {selectedAgentName && <span className={styles.agentBadge}>Agente: {selectedAgentName}</span>}
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <span className={styles.chatHeaderTitle}>{chatList.find(c => c._id === chatId)?.title || "Conversacion"}</span>
                <span className={styles.chatHeaderAgent}>{selectedAgentName}</span>
              </div>
            </div>
            <div className={styles.messagesContainer}>
              <div className={styles.messages}>
                {messages.length === 0 && <div className={styles.welcomeMessage}><p>Escribe un mensaje para comenzar.</p></div>}
                {messages.map((m, idx) => (
                  <div key={m._id || m.id || `msg-${idx}`} className={`${styles.messageRow} ${m.role === "user" ? styles.messageRowUser : styles.messageRowBot}`}>
                    <div className={styles.messageWrapper}>
                      <div className={m.role === "user" ? styles.avatarUser : styles.avatar}>
                        {m.role === "user" ? "Tu" : "AI"}
                      </div>
                      <div className={`${styles.messageBubble} ${m.role === "user" ? styles.userBubble : styles.botBubble}`}>
                        <div className={styles.messageContent}>{m.role === "user" ? m.content : renderMarkdown(m.content)}</div>
                        <span className={styles.messageTime}>{formatTime(m.ts)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                    <div className={styles.messageWrapper}>
                      <div className={styles.avatar}>AI</div>
                      <div className={`${styles.messageBubble} ${styles.botBubble} ${styles.typing}`}>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}

        {selectedAgentId && (
          <form onSubmit={handleSend} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <input ref={inputRef} type="text" placeholder={chatId ? "Escribe un mensaje..." : "Escribe para iniciar..."} value={input} onChange={(e) => setInput(e.target.value)} className={styles.messageInput} disabled={sending} />
              <button type="submit" className={styles.sendButton} disabled={sending || !input.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
