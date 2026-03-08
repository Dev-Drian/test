/**
 * Chat - Interfaz de chat profesional estilo ChatGPT
 */
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Calendar, Plus, Search, AlertTriangle, Check, Loader2, CheckCircle, XCircle } from "lucide-react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useToast, useConfirm } from "../components/Toast";
import { 
  listAgents,
  listTables,
  getOrCreateChat, 
  sendChatMessage, 
  listChats, 
  deleteChat,
  renameChat,
  importFileViaChat,
  previewImportViaChat,
} from "../api/client";
import { RobotIcon, SendIcon, PlusIcon, TrashIcon, EditIcon, ChatIcon, SparklesIcon } from "../components/Icons";
import { useSocketEvent } from "../hooks/useSocket";

/**
 * Renderiza Markdown básico en React (soporta bold, enlaces internos)
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
          // Buscar enlaces markdown [texto](url) o **bold**
          const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
          const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
          
          // Determinar cuál viene primero
          let firstMatch = null;
          let matchType = null;
          
          if (linkMatch && boldMatch) {
            if (linkMatch.index < boldMatch.index) {
              firstMatch = linkMatch;
              matchType = 'link';
            } else {
              firstMatch = boldMatch;
              matchType = 'bold';
            }
          } else if (linkMatch) {
            firstMatch = linkMatch;
            matchType = 'link';
          } else if (boldMatch) {
            firstMatch = boldMatch;
            matchType = 'bold';
          }
          
          if (firstMatch) {
            const beforeMatch = remaining.slice(0, firstMatch.index);
            if (beforeMatch) {
              parts.push(<span key={key++}>{beforeMatch}</span>);
            }
            
            if (matchType === 'link') {
              const linkText = firstMatch[1];
              const linkUrl = firstMatch[2];
              // Si es un enlace interno (empieza con /), usar Link de react-router
              if (linkUrl.startsWith('/')) {
                parts.push(
                  <a 
                    key={key++} 
                    href={linkUrl}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = linkUrl;
                    }}
                  >
                    {linkText}
                  </a>
                );
              } else {
                parts.push(
                  <a 
                    key={key++} 
                    href={linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                  >
                    {linkText}
                  </a>
                );
              }
            } else {
              parts.push(<strong key={key++} className="font-semibold text-slate-100">{firstMatch[1]}</strong>);
            }
            
            remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
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

/**
 * ImportPreviewCard - Tarjeta de bot mostrando mapeo propuesto + confirm/cancel
 */
function ImportPreviewCard({ message, onConfirm, onCancel, confirming, agentName }) {
  const { preview } = message;
  if (!preview) return null;

  const { mapping = {}, csvColumns = [], tableHeaders = [], tableName, totalRows, preview: sampleRows = [] } = preview;
  const mappedCount = Object.keys(mapping).length;
  const unmappedCols = csvColumns.filter(c => !mapping[c]);

  return (
    <div className="py-5" style={{ borderTop: '1px solid rgba(100, 116, 139, 0.15)' }}>
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide text-emerald-400">{agentName}</p>
          
          {/* Header */}
          <div className="p-4 rounded-xl mb-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm text-slate-200 font-medium mb-1">
              <BarChart3 className="w-4 h-4 inline mr-1 text-emerald-400" /> Analicé <strong>{message.file?.name}</strong> — {totalRows} filas detectadas
            </p>
            <p className="text-xs text-slate-400">
              Tabla destino: <span className="text-emerald-400 font-semibold">{tableName}</span>
              {' · '}{mappedCount}/{csvColumns.length} columnas mapeadas correctamente
            </p>
          </div>

          {/* Mapping table */}
          <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(51,65,85,0.5)' }}>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Columna archivo</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">→ Campo en sistema</th>
                  <th className="px-3 py-2 text-left text-slate-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {csvColumns.map(col => {
                  const mapped = mapping[col];
                  const header = tableHeaders.find(h => h.key === mapped);
                  return (
                    <tr key={col} style={{ borderTop: '1px solid rgba(100,116,139,0.1)' }}>
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{col}</td>
                      <td className="px-3 py-1.5 text-slate-300">{header?.label || mapped || '—'}</td>
                      <td className="px-3 py-1.5">
                        {mapped
                          ? <span className="text-emerald-400 text-[10px]"><Check className="w-3 h-3 inline" /> mapeado</span>
                          : <span className="text-amber-400 text-[10px]"><AlertTriangle className="w-3 h-3 inline" /> ignorado</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Preview rows */}
          {sampleRows.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Vista previa de las primeras {sampleRows.length} filas:</p>
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                <table className="text-xs whitespace-nowrap">
                  <thead>
                    <tr style={{ background: 'rgba(51,65,85,0.5)' }}>
                      {Object.keys(sampleRows[0]).map(k => (
                        <th key={k} className="px-3 py-1.5 text-left text-slate-400 font-medium">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(100,116,139,0.1)' }}>
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-slate-300 max-w-32 truncate">{String(v ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {unmappedCols.length > 0 && (
            <p className="text-xs text-amber-400 mb-3">
              <AlertTriangle className="w-3 h-3 inline mr-1" /> {unmappedCols.length} columna(s) sin mapear serán ignoradas: {unmappedCols.join(', ')}
            </p>
          )}

          {message.type === 'import_done' ? (
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderMarkdown(message.content)}
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={onConfirm}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.03] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
              >
                {confirming ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> Importando...</> : <><CheckCircle className="w-4 h-4 inline mr-1" /> Confirmar ({totalRows} registros)</>}
              </button>
              <button
                onClick={onCancel}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-slate-400 text-sm font-medium hover:text-slate-200 hover:bg-slate-700/50 transition-all disabled:opacity-50"
                style={{ border: '1px solid rgba(100, 116, 139, 0.3)' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const fileInputRef = useRef(null);

  // WebSocket: recibir mensajes del agente en tiempo real
  useSocketEvent('chat:message', ({ chatId: incomingChatId, message }) => {
    if (incomingChatId === chatId && message?.content) {
      setMessages(prev => {
        // Evitar duplicados si el mensaje ya llegó por HTTP
        const alreadyExists = prev.some(m => m.id === message.id);
        if (alreadyExists) return prev;
        return [...prev, { role: 'assistant', content: message.content, id: message.id || `ws_${Date.now()}`, ts: Date.now() }];
      });
    }
  });

  // File import state
  const [attachedFile, setAttachedFile] = useState(null); // { name, content, encoding, size }
  const [importTables, setImportTables] = useState([]);
  const [importTableId, setImportTableId] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [pendingImport, setPendingImport] = useState(null); // { msgId } when confirming

  // Load tables for import selector
  const loadImportTables = useCallback(async () => {
    if (importTables.length > 0 || !workspaceId) return;
    try {
      const res = await listTables(workspaceId);
      const t = res.data || [];
      setImportTables(t);
      if (t.length > 0) setImportTableId(t[0]._id);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar tablas');
    }
  }, [workspaceId, importTables.length, toast]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const encoding = isExcel ? 'base64' : 'utf8';
    const reader = new FileReader();
    reader.onload = (ev) => {
      let content;
      if (isExcel) {
        const bytes = new Uint8Array(ev.target.result);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        content = btoa(binary);
      } else {
        content = ev.target.result;
      }
      setAttachedFile({ name: file.name, content, encoding, size: file.size });
      loadImportTables();
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }, [loadImportTables]);

  // Triggered when user sends a message with a file attached → runs preview
  const handleImportPreview = async () => {
    if (!attachedFile || !importTableId || sending) return;

    let currentChatId = chatId;
    if (!currentChatId) {
      try {
        const res = await getOrCreateChat(workspaceId, selectedAgentId);
        const newChat = res.data.chat || res.data;
        currentChatId = newChat._id;
        setChatId(currentChatId);
        setNewChatId(currentChatId);
        setChatList(prev => [{ _id: currentChatId, title: `Importar ${attachedFile.name}`, messageCount: 0 }, ...prev]);
      } catch (e) { return; }
    }

    const fileToImport = attachedFile;
    setAttachedFile(null);

    setMessages(prev => [...prev, {
      role: 'user',
      content: `📎 Importar archivo: **${fileToImport.name}**`,
      id: `user_import_${Date.now()}`,
      ts: Date.now(),
    }]);
    setSending(true);

    try {
      const res = await previewImportViaChat({
        workspaceId,
        tableId: importTableId,
        file: fileToImport,
      });
      const botMsgId = `import_preview_${Date.now()}`;
      setMessages(prev => [...prev, {
        role: 'assistant',
        type: 'import_preview',
        id: botMsgId,
        ts: Date.now(),
        preview: res.data,
        tableId: importTableId,
        file: fileToImport,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'No pude analizar el archivo: ' + (err.response?.data?.error || err.message),
        id: `err_${Date.now()}`,
        ts: Date.now(),
      }]);
    } finally {
      setSending(false);
    }
  };

  // Confirm import after preview card
  const handleConfirmImport = async (msg) => {
    if (pendingImport || sending) return;
    setPendingImport({ msgId: msg.id });
    setSending(true);

    try {
      const res = await importFileViaChat({
        workspaceId,
        agentId: selectedAgentId,
        chatId,
        tableId: msg.tableId,
        file: msg.file,
      });
      const reply = res.data?.response || 'Importación completada.';
      setMessages(prev => prev.map(m =>
        m.id === msg.id
          ? { ...m, type: 'import_done', content: reply }
          : m
      ));
    } catch (err) {
      const errMsg = 'Error al importar: ' + (err.response?.data?.error || err.message);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, type: undefined, content: errMsg } : m
      ));
    } finally {
      setSending(false);
      setPendingImport(null);
    }
  };

  // Cancel preview — remove the preview card
  const handleCancelImport = (msgId) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, type: undefined, content: 'Importación cancelada.' } : m
    ));
  };

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
      toast.error('Error al crear conversación');
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
      toast.error('Error al renombrar conversación');
    }
    setEditingChatId(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    // If file attached → run preview flow instead of normal send
    if (attachedFile) {
      await handleImportPreview();
      return;
    }
    
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
        toast.error('Error al iniciar conversación');
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
      <div className="flex items-center justify-center h-full" style={{ background: '#0f172a' }}>
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <ChatIcon size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Chat con IA</h1>
          <p className="text-slate-400 mb-6 max-w-sm">
            Selecciona un workspace para comenzar a chatear
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }} data-tour="chat-welcome">
      {/* Sidebar - Rediseñado con glassmorphism */}
      <aside data-tour="chat-sidebar" className={`${sidebarOpen ? 'w-72' : 'w-0'} shrink-0 flex flex-col transition-all duration-300 overflow-hidden`}
        style={{ 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
        <div className="flex flex-col h-full min-w-72">
          {/* Header del sidebar */}
          <div className="p-4">
            <button
              onClick={handleNewChat}
              disabled={!selectedAgentId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
              }}
            >
              <PlusIcon size="sm" />
              <span>Nueva conversación</span>
            </button>
          </div>

          {/* Selector de agente */}
          <div className="px-4 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }} data-tour="chat-agent-selector">
            <p className="text-[10px] uppercase tracking-wider mb-3 px-1 text-slate-500 font-semibold">Agente activo</p>
            {loading ? (
              <div className="px-3 py-2 text-slate-500 text-sm">Cargando...</div>
            ) : agents.length === 0 ? (
              <Link to="/agents" className="flex items-center gap-2 px-4 py-3 rounded-xl text-violet-400 text-sm font-medium hover:bg-violet-500/15 transition-all border border-violet-500/30">
                <PlusIcon size="sm" />
                Crear primer agente
              </Link>
            ) : (
              <div className="space-y-2">
                {agents.map(agent => (
                  <button
                    key={agent._id}
                    onClick={() => handleAgentChange(agent._id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-300 ${
                      selectedAgentId === agent._id
                        ? 'text-white bg-gradient-to-r from-violet-500/20 to-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    style={selectedAgentId === agent._id ? {
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)'
                    } : { border: '1px solid transparent' }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      selectedAgentId === agent._id 
                        ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30' 
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      <RobotIcon size="sm" />
                    </div>
                    <span className="truncate font-medium">{agent.name}</span>
                    {selectedAgentId === agent._id && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingChats ? (
              <div className="px-3 py-4 text-slate-500 text-sm text-center">Cargando...</div>
            ) : !selectedAgentId ? (
              <div className="px-3 py-8 text-center">
                <p className="text-slate-500 text-sm">Selecciona un agente</p>
              </div>
            ) : chatList.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-slate-500 text-sm">Sin conversaciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatList.map((chat) => (
                  <div 
                    key={chat._id} 
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      chatId === chat._id 
                        ? 'text-slate-100 bg-slate-600/50' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/30'
                    }`}
                    style={chatId === chat._id ? { border: '1px solid rgba(100, 116, 139, 0.4)' } : { border: '1px solid transparent' }}
                    onClick={() => handleSelectChat(chat)}
                  >
                    <ChatIcon size="sm" className={`shrink-0 ${chatId === chat._id ? 'text-indigo-400' : 'opacity-50'}`} />
                    {editingChatId === chat._id ? (
                      <input 
                        type="text" 
                        value={editingTitle} 
                        onChange={(e) => setEditingTitle(e.target.value)} 
                        onBlur={handleSaveRename} 
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRename(e)} 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex-1 px-2 py-0.5 rounded-lg text-sm text-slate-100 focus:outline-none"
                        style={{ background: 'rgba(71, 85, 105, 0.5)', border: '1px solid rgba(100, 116, 139, 0.4)' }}
                        autoFocus 
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">{chat.title || "Nueva conversación"}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-indigo-500/20 transition-all" 
                            onClick={(e) => handleStartRename(e, chat)} 
                            title="Renombrar"
                          >
                            <EditIcon size="xs" />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all" 
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
        className="absolute left-2 top-20 z-10 p-2 rounded-xl transition-all hover:bg-slate-600/40"
        style={{ 
          left: sidebarOpen ? '252px' : '8px',
          background: 'rgba(51, 65, 85, 0.4)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          color: 'rgba(148, 163, 184, 0.8)'
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
            background: 'rgba(51, 65, 85, 0.3)',
            borderBottom: '1px solid rgba(100, 116, 139, 0.3)'
          }}>
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-indigo-500">
                <RobotIcon size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">{selectedAgentName}</p>
                <p className="text-xs text-slate-500">Asistente activo</p>
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-400 bg-indigo-500/15">
                <RobotIcon size="lg" />
              </div>
              <h2 className="text-xl font-medium text-slate-100 mb-2">Selecciona un agente</h2>
              <p className="text-slate-500 text-sm">
                Elige un agente de la lista para comenzar a chatear
              </p>
            </div>
          </div>
        ) : !chatId && messages.length === 0 ? (
          /* Estado inicial - sin chat - Rediseñado */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4">
                {/* Icono animado */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 blur-xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
                    <SparklesIcon size="xl" className="text-white" />
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-3">¿En qué puedo ayudarte?</h1>
                <p className="text-slate-400 mb-10 text-lg">
                  Estoy listo para gestionar tus datos en <span className="text-violet-400 font-semibold">{workspaceName}</span>
                </p>
                
                {/* Sugerencias de preguntas - Rediseñadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
                  {[
                    { icon: BarChart3, text: "¿Cuántos registros tengo?", desc: "Ver resumen de datos", gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30" },
                    { icon: Calendar, text: "¿Qué citas hay para hoy?", desc: "Consultar agenda", gradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30" },
                    { icon: Plus, text: "Quiero agregar un cliente", desc: "Crear nuevo registro", gradient: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30" },
                    { icon: Search, text: "Buscar información", desc: "Filtrar datos", gradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30" },
                  ].map((suggestion, idx) => {
                    const IconComp = suggestion.icon;
                    return (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion.text);
                        textareaRef.current?.focus();
                      }}
                      className={`group flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 bg-gradient-to-br ${suggestion.gradient} border ${suggestion.border} hover:shadow-xl`}
                      style={{
                        animation: 'fade-up 0.5s ease-out forwards',
                        animationDelay: `${200 + idx * 100}ms`,
                        opacity: 0
                      }}
                    >
                      <IconComp className="w-7 h-7 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold group-hover:text-white transition-colors">{suggestion.text}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{suggestion.desc}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Input centrado en estado inicial */}
            <div className="p-4 pb-8">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto">
                <div className="relative rounded-2xl transition-all duration-300 focus-within:shadow-lg focus-within:shadow-indigo-500/10"
                  style={{ 
                    background: 'rgba(51, 65, 85, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.3)'
                  }}>
                  <textarea
                    ref={textareaRef}
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-5 py-4 pr-16 bg-transparent text-slate-100 text-sm placeholder-slate-500 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    <SendIcon size="sm" />
                  </button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-3">
                  Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-mono">Enter</kbd> para enviar, <kbd className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-mono">Shift + Enter</kbd> para nueva línea
                </p>
              </form>
            </div>
          </div>
        ) : (
          /* Chat activo con mensajes */
          <>
            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto" data-tour="chat-messages">
              <div className="max-w-3xl mx-auto py-6 px-4">
                {messages.map((m, idx) => {
                  // Import preview / done card
                  if (m.type === 'import_preview' || m.type === 'import_done') {
                    return (
                      <ImportPreviewCard
                        key={m._id || m.id || `msg-${idx}`}
                        message={m}
                        onConfirm={() => handleConfirmImport(m)}
                        onCancel={() => handleCancelImport(m.id)}
                        confirming={!!(pendingImport?.msgId === m.id)}
                        agentName={selectedAgentName}
                      />
                    );
                  }
                  // Normal message
                  return (
                  <div 
                    key={m._id || m.id || `msg-${idx}`} 
                    className={`py-5 animate-slide-in-message ${m.role === "user" ? "message-user" : "message-assistant"}`}
                    style={{
                      ...(idx !== 0 ? { borderTop: '1px solid rgba(100, 116, 139, 0.15)' } : {}),
                      animationDelay: `${idx * 30}ms`
                    }}
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 hover:scale-110 ${
                        m.role === "user" 
                          ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
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
                        <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
                          m.role === "user" ? "text-indigo-400" : "text-emerald-400"
                        }`}>
                          {m.role === "user" ? "Tú" : selectedAgentName}
                        </p>
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user" ? "text-slate-300" : "text-slate-200"
                        }`}>
                          {m.role === "user" ? m.content : renderMarkdown(m.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
                
                {/* Indicador de escritura */}
                {sending && (
                  <div className="py-5 animate-fade-in" style={{ borderTop: '1px solid rgba(100, 116, 139, 0.15)' }}>
                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                        <SparklesIcon size="sm" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-emerald-400">{selectedAgentName}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot"></span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot"></span>
                          </div>
                          <span className="text-xs text-slate-500">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input fijo en la parte inferior */}
            <div data-tour="chat-input" style={{ 
              borderTop: '1px solid rgba(100, 116, 139, 0.2)',
              background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
              backdropFilter: 'blur(12px)'
            }}>
              {/* File attachment strip — minimal, sends on ↵ */}
              {attachedFile && (
                <div className="max-w-3xl mx-auto px-4 pt-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl flex-wrap" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <span className="text-sky-400 text-sm">📎</span>
                    <span className="text-sky-300 text-sm font-medium truncate max-w-40">{attachedFile.name}</span>
                    <span className="text-slate-500 text-xs">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                    <span className="text-slate-400 text-xs mx-1">→</span>

                    {/* Searchable table select */}
                    <div className="relative flex-1 min-w-32 max-w-xs">
                      <input
                        type="text"
                        placeholder="Buscar tabla..."
                        value={tableSearch || (importTables.find(t => t._id === importTableId)?.name || '')}
                        onChange={e => {
                          setTableSearch(e.target.value);
                          const match = importTables.find(t => t.name.toLowerCase().includes(e.target.value.toLowerCase()));
                          if (match) setImportTableId(match._id);
                        }}
                        onFocus={() => setTableSearch('')}
                        onBlur={() => setTableSearch('')}
                        className="w-full text-xs bg-slate-700/70 text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-600 focus:border-sky-500 outline-none"
                        list="import-tables-list"
                      />
                      <datalist id="import-tables-list">
                        {importTables.map(t => <option key={t._id} value={t.name} />)}
                      </datalist>
                    </div>

                    <span className="text-slate-500 text-xs hidden sm:inline">↵ Enviar para analizar</span>
                    <button
                      onClick={() => { setAttachedFile(null); setTableSearch(''); }}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSend} className="max-w-3xl mx-auto p-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="relative rounded-2xl transition-all duration-300 focus-within:shadow-lg focus-within:shadow-indigo-500/10 focus-within:border-indigo-500/30"
                  style={{ 
                    background: 'rgba(51, 65, 85, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.3)'
                  }}>
                  <textarea
                    ref={textareaRef}
                    placeholder={attachedFile ? `Presiona enviar para analizar ${attachedFile.name}...` : "Escribe un mensaje... (o 📎 para adjuntar CSV/Excel)"}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full px-5 py-4 pr-24 bg-transparent text-slate-100 text-sm placeholder-slate-500 resize-none focus:outline-none max-h-48"
                    disabled={sending}
                  />
                  {/* Paperclip button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="absolute right-14 bottom-3 p-2.5 rounded-xl text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 disabled:opacity-30 transition-all duration-200"
                    title="Adjuntar CSV o Excel para importar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                  </button>
                  <button
                    type="submit"
                    disabled={sending || (!input.trim() && !attachedFile)}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
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
