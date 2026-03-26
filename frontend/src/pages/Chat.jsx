/**
 * Chat - Centro de Conversaciones Omnicanal
 * Divide conversaciones por canales: Todos, Web/IA, Messenger, Instagram, WhatsApp
 */
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Calendar, Plus, Search, AlertTriangle, Check, Loader2, CheckCircle, XCircle, MessageSquare, Bot, MessageCircle, Instagram, Send, Globe, Hash, Paperclip } from "lucide-react";
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
import { RobotIcon, SendIcon, PlusIcon, TrashIcon, EditIcon, ChatIcon, SparklesIcon, SearchIcon } from "../components/Icons";
import { useSocketEvent } from "../hooks/useSocket";

// ── Channel definitions ─────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'all',       label: 'Todos',      Icon: Hash,          color: 'violet' },
  { id: 'web',       label: 'Web / IA',   Icon: Bot,           color: 'indigo' },
  { id: 'messenger', label: 'Messenger',  Icon: MessageCircle, color: 'blue'   },
  { id: 'instagram', label: 'Instagram',  Icon: Instagram,     color: 'pink'   },
  { id: 'whatsapp',  label: 'WhatsApp',   Icon: Send,          color: 'emerald'},
];

const CHANNEL_COLORS = {
  web:       { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  text: '#818cf8', dot: '#818cf8' },
  messenger: { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa', dot: '#60a5fa' },
  instagram: { bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.3)',  text: '#f472b6', dot: '#f472b6' },
  whatsapp:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399', dot: '#34d399' },
};

const CHANNEL_GRADIENTS = {
  all:       { from: '#8b5cf6', to: '#6366f1', shadow: 'rgba(139,92,246,0.3)'  },
  web:       { from: '#6366f1', to: '#3b82f6', shadow: 'rgba(99,102,241,0.3)'  },
  messenger: { from: '#3b82f6', to: '#06b6d4', shadow: 'rgba(59,130,246,0.3)'  },
  instagram: { from: '#ec4899', to: '#a855f7', shadow: 'rgba(236,72,153,0.3)'  },
  whatsapp:  { from: '#10b981', to: '#059669', shadow: 'rgba(16,185,129,0.3)'  },
};

const CHANNEL_ICONS = { 
  web: Bot, 
  messenger: MessageCircle, 
  instagram: Instagram, 
  whatsapp: Send 
};

// ── Markdown renderer ───────────────────────────────────────────────────────
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
          const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
          const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
          let firstMatch = null;
          let matchType = null;
          if (linkMatch && boldMatch) {
            firstMatch = linkMatch.index < boldMatch.index ? linkMatch : boldMatch;
            matchType = linkMatch.index < boldMatch.index ? 'link' : 'bold';
          } else if (linkMatch) { firstMatch = linkMatch; matchType = 'link'; }
          else if (boldMatch) { firstMatch = boldMatch; matchType = 'bold'; }
          if (firstMatch) {
            const before = remaining.slice(0, firstMatch.index);
            if (before) parts.push(<span key={key++}>{before}</span>);
            if (matchType === 'link') {
              const [, linkText, linkUrl] = firstMatch;
              parts.push(
                <a key={key++} href={linkUrl}
                  target={linkUrl.startsWith('/') ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                  {linkText}
                </a>
              );
            } else {
              parts.push(<strong key={key++} className="font-semibold text-slate-100">{firstMatch[1]}</strong>);
            }
            remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
          } else {
            parts.push(<span key={key++}>{remaining}</span>);
            break;
          }
        }
        return <span key={lineIdx}>{parts}{lineIdx < lines.length - 1 && <br />}</span>;
      })}
    </>
  );
}

// ── Import Preview Card ─────────────────────────────────────────────────────
function ImportPreviewCard({ message, onConfirm, onCancel, confirming, agentName }) {
  const { preview } = message;
  if (!preview) return null;
  const { mapping = {}, csvColumns = [], tableHeaders = [], tableName, totalRows, preview: sampleRows = [] } = preview;
  const mappedCount = Object.keys(mapping).length;
  const unmappedCols = csvColumns.filter(c => !mapping[c]);

  return (
    <div className="py-5" style={{ borderTop: '1px solid rgba(100,116,139,0.15)' }}>
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide text-emerald-400">{agentName}</p>
          <div className="p-4 rounded-xl mb-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-sm text-slate-200 font-medium mb-1">
              <BarChart3 className="w-4 h-4 inline mr-1 text-emerald-400" /> Analicé <strong>{message.file?.name}</strong> — {totalRows} filas detectadas
            </p>
            <p className="text-xs text-slate-400">
              Tabla destino: <span className="text-emerald-400 font-semibold">{tableName}</span>
              {' · '}{mappedCount}/{csvColumns.length} columnas mapeadas correctamente
            </p>
          </div>
          <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
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
          {sampleRows.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1.5">Vista previa ({sampleRows.length} filas):</p>
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid rgba(100,116,139,0.2)' }}>
                <table className="text-xs whitespace-nowrap">
                  <thead><tr style={{ background: 'rgba(51,65,85,0.5)' }}>{Object.keys(sampleRows[0]).map(k => <th key={k} className="px-3 py-1.5 text-left text-slate-400 font-medium">{k}</th>)}</tr></thead>
                  <tbody>{sampleRows.map((row, i) => <tr key={i} style={{ borderTop: '1px solid rgba(100,116,139,0.1)' }}>{Object.values(row).map((v, j) => <td key={j} className="px-3 py-1.5 text-slate-300 max-w-32 truncate">{String(v ?? '')}</td>)}</tr>)}</tbody>
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
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
          ) : (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={onConfirm} disabled={confirming}
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

// ── Channel Badge ───────────────────────────────────────────────────────────
function ChannelBadge({ channel }) {
  const c = CHANNEL_COLORS[channel] || CHANNEL_COLORS.web;
  const labels = { web: 'Web', messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {labels[channel] || channel}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Chat() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  // Core state
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
  const [activeChannel, setActiveChannel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // File import state
  const [attachedFile, setAttachedFile] = useState(null);
  const [importTables, setImportTables] = useState([]);
  const [importTableId, setImportTableId] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [pendingImport, setPendingImport] = useState(null);

  // Active chat metadata
  const activeChatMeta = useMemo(() => {
    return chatList.find(c => c._id === chatId) || null;
  }, [chatList, chatId]);

  // WebSocket
  useSocketEvent('chat:message', ({ chatId: incomingChatId, message }) => {
    if (incomingChatId === chatId && message?.content) {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, { role: 'assistant', content: message.content, id: message.id || `ws_${Date.now()}`, ts: Date.now() }];
      });
    }
  });

  // Filter chats by channel + search
  const filteredChats = useMemo(() => {
    let list = chatList;
    if (activeChannel !== 'all') {
      list = list.filter(c => (c.channel || c.platform || 'web') === activeChannel);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.externalRef || '').toLowerCase().includes(q) ||
        (c.senderName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [chatList, activeChannel, searchQuery]);

  // Channel counts
  const channelCounts = useMemo(() => {
    const counts = { all: chatList.length, web: 0, messenger: 0, instagram: 0, whatsapp: 0 };
    chatList.forEach(c => {
      const ch = c.channel || c.platform || 'web';
      if (counts[ch] !== undefined) counts[ch]++;
      else counts.web++;
    });
    return counts;
  }, [chatList]);

  // ── File handling ───────────────────────────────────────────────────────
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
      setAttachedFile({ name: file.name, content, encoding: isExcel ? 'base64' : 'utf8', size: file.size });
      loadImportTables();
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }, [loadImportTables]);

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
        setChatList(prev => [{ _id: currentChatId, title: `Importar ${attachedFile.name}`, messageCount: 0, channel: 'web' }, ...prev]);
      } catch { return; }
    }
    const fileToImport = attachedFile;
    setAttachedFile(null);
    setMessages(prev => [...prev, { role: 'user', content: `📎 Importar: **${fileToImport.name}**`, id: `user_import_${Date.now()}`, ts: Date.now() }]);
    setSending(true);
    try {
      const res = await previewImportViaChat({ workspaceId, tableId: importTableId, file: fileToImport });
      setMessages(prev => [...prev, { role: 'assistant', type: 'import_preview', id: `import_preview_${Date.now()}`, ts: Date.now(), preview: res.data, tableId: importTableId, file: fileToImport }]);
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

  const handleConfirmImport = async (msg) => {
    if (pendingImport || sending) return;
    setPendingImport({ msgId: msg.id });
    setSending(true);
    try {
      const res = await importFileViaChat({ workspaceId, agentId: selectedAgentId, chatId, tableId: msg.tableId, file: msg.file });
      const reply = res.data?.response || 'Importación completada.';
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, type: 'import_done', content: reply } : m));
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

  const handleCancelImport = (msgId) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, type: undefined, content: 'Importación cancelada.' } : m
    ));
  };

  // ── Load agents ─────────────────────────────────────────────────────────
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

  // ── Load chat list ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId || !selectedAgentId) { setChatList([]); return; }
    setLoadingChats(true);
    listChats(workspaceId, selectedAgentId)
      .then((res) => setChatList(res.data || []))
      .catch(() => setChatList([]))
      .finally(() => setLoadingChats(false));
  }, [workspaceId, selectedAgentId]);

  // ── Load selected chat ──────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId || !selectedAgentId || !chatId) { setMessages([]); return; }
    if (chatId === newChatId) { setNewChatId(null); return; }
    getOrCreateChat(workspaceId, selectedAgentId, chatId)
      .then((res) => {
        const msgs = res.data.chat?.messages || [];
        setMessages(msgs.map((m, idx) => ({ ...m, id: m._id || m.id || `msg-${idx}`, ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now() })));
      })
      .catch(() => setMessages([]));
  }, [workspaceId, selectedAgentId, chatId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (chatId) textareaRef.current?.focus(); }, [chatId]);

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
      setChatList(prev => [{ _id: newChat._id, title: "Nueva conversación", messageCount: 0, createdAt: newChat.createdAt, channel: 'web' }, ...prev]);
      setActiveChannel('all');
    } catch (err) {
      console.error("Error creating chat:", err);
      toast.error('Error al crear conversación');
    }
  };

  const handleSelectChat = (chat) => setChatId(chat._id);

  const handleDeleteChat = async (e, chatIdToDelete) => {
    e.stopPropagation();
    const confirmed = await confirm({ title: 'Eliminar conversación', message: '¿Eliminar esta conversación? No se puede deshacer.', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;
    try {
      await deleteChat(workspaceId, chatIdToDelete);
      setChatList(prev => prev.filter(c => c._id !== chatIdToDelete));
      if (chatId === chatIdToDelete) { setChatId(""); setMessages([]); }
      toast.success('Conversación eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleStartRename = (e, chat) => { e.stopPropagation(); setEditingChatId(chat._id); setEditingTitle(chat.title || "Nueva conversación"); };
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
    if (attachedFile) { await handleImportPreview(); return; }
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
        setChatList(prev => [{ _id: currentChatId, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 0, createdAt: newChat.createdAt, channel: 'web' }, ...prev]);
      } catch (err) {
        console.error("Error creating chat:", err);
        toast.error('Error al iniciar conversación');
        return;
      }
    }
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { role: "user", content: text, id: Date.now(), ts: Date.now() }]);
    setSending(true);
    try {
      const res = await sendChatMessage({ workspaceId, agentId: selectedAgentId || undefined, chatId: currentChatId, message: text, token: import.meta.env.VITE_OPENAI_KEY || undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      const reply = res.data?.response || res.data?.text || "Sin respuesta.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, id: Date.now() + 1, ts: Date.now() }]);
      setChatList(prev => prev.map(c => c._id === currentChatId && c.messageCount === 0 ? { ...c, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 2 } : c));
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + (err.response?.data?.error || err.message), id: Date.now() + 1, ts: Date.now() }]);
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } };

  // ── No workspace ────────────────────────────────────────────────────────
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#0a0a0f' }}>
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-400"><ChatIcon size="lg" /></div>
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Centro de Conversaciones</h1>
          <p className="text-slate-400 mb-6 max-w-sm">Selecciona un workspace para comenzar</p>
          <Link to="/workspaces" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors">Ir a Workspaces</Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const currentChannelGrad = CHANNEL_GRADIENTS[activeChannel] || CHANNEL_GRADIENTS.all;

  return (
    <div className="h-full flex" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`${sidebarOpen ? 'w-96' : 'w-0'} shrink-0 flex flex-col transition-all duration-300 overflow-hidden`}
        style={{ background: 'linear-gradient(180deg, #12121a 0%, #0d0d14 100%)', borderRight: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex flex-col h-full min-w-96">

          {/* Sidebar header */}
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Conversaciones</h2>
              <button onClick={handleNewChat} disabled={!selectedAgentId}
                className="p-2.5 rounded-xl text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95 shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                <PlusIcon size="sm" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <SearchIcon size="sm" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Buscar conversación..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all focus:ring-2 focus:ring-violet-500/30"
                style={{ background: 'rgba(30,30,45,0.8)', border: '1px solid rgba(139,92,246,0.2)' }} />
            </div>

            {/* Channel tabs - Lista vertical */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-1 mb-2">Canales</p>
              <div className="flex flex-col gap-1">
                {CHANNELS.map(ch => {
                  const grad = CHANNEL_GRADIENTS[ch.id];
                  const isActive = activeChannel === ch.id;
                  const IconComp = ch.Icon;
                  const count = channelCounts[ch.id] || 0;
                  const channelNames = { all: 'Todos los canales', web: 'Web / IA', messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp' };
                  return (
                    <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                      style={isActive ? { 
                        backgroundImage: `linear-gradient(135deg, ${grad.from}, ${grad.to})`, 
                        boxShadow: `0 4px 16px ${grad.shadow}`
                      } : {}}>
                      <IconComp className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium flex-1 text-left">{channelNames[ch.id]}</span>
                      {count > 0 && (
                        <span className={`min-w-6 h-6 flex items-center justify-center px-1.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agent selector - Solo visible para canales web/all */}
          {(activeChannel === 'all' || activeChannel === 'web') && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(139,92,246,0.1)', background: 'rgba(139,92,246,0.03)' }}>
              <p className="text-[10px] uppercase tracking-widest mb-3 text-violet-400/70 font-semibold">Agente IA</p>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <Link to="/agents" className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-violet-400 text-sm font-medium hover:bg-violet-500/15 transition-all border border-dashed border-violet-500/30">
                  <PlusIcon size="sm" /> Crear tu primer agente
                </Link>
              ) : (
                <div className="space-y-2">
                  {agents.map(agent => (
                    <button key={agent._id} onClick={() => handleAgentChange(agent._id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-200 ${selectedAgentId === agent._id ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                      style={selectedAgentId === agent._id ? { 
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.2))', 
                        border: '1px solid rgba(139,92,246,0.4)', 
                        boxShadow: '0 4px 20px rgba(139,92,246,0.2)' 
                      } : { 
                        background: 'rgba(30,30,45,0.5)',
                        border: '1px solid rgba(100,116,139,0.15)' 
                      }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${selectedAgentId === agent._id ? 'scale-110' : ''}`}
                        style={selectedAgentId === agent._id ? { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 15px rgba(139,92,246,0.4)' } : { background: 'rgba(100,116,139,0.1)' }}>
                        <RobotIcon size="sm" className={selectedAgentId === agent._id ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <span className="truncate font-semibold">{agent.name}</span>
                      {selectedAgentId === agent._id && <span className="ml-auto flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-emerald-400">Activo</span></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto p-3">
            {loadingChats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : !selectedAgentId ? (
              <div className="px-4 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <RobotIcon size="md" className="text-violet-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Selecciona un agente</p>
                <p className="text-slate-500 text-xs mt-1">para ver las conversaciones</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.1)' }}>
                  <MessageSquare className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  {searchQuery ? 'Sin resultados' : activeChannel !== 'all' ? `Sin chats de ${CHANNELS.find(c => c.id === activeChannel)?.label || ''}` : 'Sin conversaciones'}
                </p>
                <p className="text-slate-500 text-xs mt-1">Inicia una nueva conversación</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChats.map((chat) => {
                  const ch = chat.channel || chat.platform || 'web';
                  const channelColor = CHANNEL_COLORS[ch] || CHANNEL_COLORS.web;
                  const isActive = chatId === chat._id;
                  return (
                    <div key={chat._id}
                      className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? 'text-slate-100 scale-[1.02]' : 'text-slate-400 hover:text-slate-200'}`}
                      style={isActive ? { 
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))', 
                        border: '1px solid rgba(139,92,246,0.3)',
                        boxShadow: '0 4px 20px rgba(139,92,246,0.15)'
                      } : { 
                        background: 'rgba(30,30,45,0.4)',
                        border: '1px solid rgba(100,116,139,0.1)'
                      }}
                      onClick={() => handleSelectChat(chat)}>

                      {/* Channel icon */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${channelColor.text}20, ${channelColor.text}35)`, border: `1px solid ${channelColor.text}30` }}>
                        {(() => {
                          const ChannelIcon = CHANNEL_ICONS[ch] || Bot;
                          return <ChannelIcon className="w-4 h-4" style={{ color: channelColor.text }} />;
                        })()}
                      </div>

                      {editingChatId === chat._id ? (
                        <input type="text" value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                          onBlur={handleSaveRename} onKeyDown={e => e.key === 'Enter' && handleSaveRename(e)}
                          onClick={e => e.stopPropagation()} autoFocus
                          className="flex-1 px-2 py-0.5 rounded-lg text-sm text-slate-100 focus:outline-none"
                          style={{ background: 'rgba(71,85,105,0.5)', border: '1px solid rgba(100,116,139,0.4)' }} />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-semibold text-slate-200">{chat.title || chat.senderName || 'Nueva conversación'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ChannelBadge channel={ch} />
                            {chat.lastMessage && <span className="text-[11px] text-slate-500 truncate max-w-32">{chat.lastMessage?.slice(0, 30)}...</span>}
                          </div>
                        </div>
                      )}

                      {editingChatId !== chat._id && (
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button className="p-1.5 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-violet-500/20 transition-all"
                            onClick={e => handleStartRename(e, chat)} title="Renombrar"><EditIcon size="xs" /></button>
                          <button className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all"
                            onClick={e => handleDeleteChat(e, chat._id)} title="Eliminar"><TrashIcon size="xs" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN AREA ═══════════ */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d14 50%, #0f0f18 100%)' }}>

        {/* Top bar */}
        {selectedAgentId && chatId && (
          <div className="shrink-0 px-8 py-4" style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, transparent 100%)', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundImage: `linear-gradient(135deg, ${currentChannelGrad.from}, ${currentChannelGrad.to})`, boxShadow: `0 8px 32px ${currentChannelGrad.shadow}` }}>
                <RobotIcon size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-white">{activeChatMeta?.senderName || selectedAgentName}</p>
                  {activeChatMeta && <ChannelBadge channel={activeChatMeta.channel || activeChatMeta.platform || 'web'} />}
                </div>
                <p className="text-sm text-slate-400 truncate mt-0.5">
                  {activeChatMeta?.externalRef ? `ID: ${activeChatMeta.externalRef}` : 'Conversación con IA'}
                </p>
              </div>
              <span className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                En línea
              </span>
            </div>
          </div>
        )}

        {!selectedAgentId ? (
          /* No agent */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg px-6 animate-fade-up">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-3xl bg-violet-500/20 blur-2xl animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 40px rgba(139,92,246,0.4)' }}>
                  <RobotIcon size="xl" className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Selecciona un agente</h2>
              <p className="text-slate-400 text-base">Elige un agente de la lista izquierda para comenzar a chatear</p>
            </div>
          </div>
        ) : !chatId && messages.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-violet-500/30 to-indigo-600/30 blur-xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center bg-linear-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
                    <SparklesIcon size="xl" className="text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Centro de Conversaciones</h1>
                <p className="text-slate-400 mb-4 text-lg">
                  Todas tus conversaciones de{' '}
                  <span className="text-blue-400 font-semibold">Messenger</span>,{' '}
                  <span className="text-pink-400 font-semibold">Instagram</span>,{' '}
                  <span className="text-emerald-400 font-semibold">WhatsApp</span> y{' '}
                  <span className="text-indigo-400 font-semibold">Web</span> en un solo lugar
                </p>
                <p className="text-slate-500 mb-10 text-sm">Selecciona una conversación o inicia una nueva</p>

                {/* Channel overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto mb-12">
                  {CHANNELS.filter(c => c.id !== 'all').map(ch => {
                    const color = CHANNEL_COLORS[ch.id] || CHANNEL_COLORS.web;
                    const grad = CHANNEL_GRADIENTS[ch.id];
                    const IconComp = ch.Icon;
                    const count = channelCounts[ch.id] || 0;
                    return (
                      <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
                        className="group p-6 rounded-3xl text-center transition-all duration-300 hover:scale-[1.08] hover:-translate-y-2"
                        style={{ 
                          background: `linear-gradient(180deg, ${color.bg} 0%, rgba(10,10,15,0.8) 100%)`, 
                          border: `1px solid ${color.border}`,
                          boxShadow: `0 8px 32px ${grad.shadow}`
                        }}>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`, boxShadow: `0 8px 24px ${grad.shadow}` }}>
                          <IconComp className="w-7 h-7 text-white" />
                        </div>
                        <p className="text-base font-bold text-white mb-1">{ch.label}</p>
                        <p className="text-4xl font-black mt-3" style={{ color: color.text, textShadow: `0 4px 20px ${grad.shadow}` }}>{count}</p>
                        <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-2">conversaciones</p>
                      </button>
                    );
                  })}
                </div>

                {/* Quick suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                  {[
                    { icon: BarChart3, text: "¿Cuántos registros tengo?", desc: "Ver resumen de datos", color: '#3b82f6', gradient: 'from-blue-500/20 to-cyan-500/20' },
                    { icon: Calendar, text: "¿Qué citas hay para hoy?", desc: "Consultar agenda", color: '#10b981', gradient: 'from-emerald-500/20 to-teal-500/20' },
                    { icon: Plus, text: "Quiero agregar un cliente", desc: "Crear nuevo registro", color: '#8b5cf6', gradient: 'from-violet-500/20 to-purple-500/20' },
                    { icon: Search, text: "Buscar información", desc: "Filtrar datos", color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-500/20' },
                  ].map((suggestion, idx) => {
                    const IconComp = suggestion.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(suggestion.text);
                          textareaRef.current?.focus();
                        }}
                        className="group flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1"
                        style={{
                          background: `linear-gradient(135deg, ${suggestion.color}15, ${suggestion.color}08)`,
                          border: `1px solid ${suggestion.color}30`,
                          boxShadow: `0 4px 20px ${suggestion.color}10`,
                          animation: 'fade-up 0.5s ease-out forwards',
                          animationDelay: `${200 + idx * 100}ms`,
                          opacity: 0
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                          style={{ background: `linear-gradient(135deg, ${suggestion.color}30, ${suggestion.color}15)` }}>
                          <IconComp className="w-6 h-6" style={{ color: suggestion.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base text-white font-semibold">{suggestion.text}</p>
                          <p className="text-sm text-slate-400 mt-0.5">{suggestion.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Input in empty state */}
            <div className="p-6 pb-8">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto">
                <div className="relative rounded-3xl transition-all duration-300 focus-within:shadow-2xl focus-within:shadow-violet-500/20"
                  style={{ background: 'linear-gradient(180deg, rgba(30,30,45,0.9) 0%, rgba(20,20,30,0.95) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <textarea ref={textareaRef} placeholder="¿En qué te puedo ayudar hoy?" value={input}
                    onChange={handleTextareaChange} onKeyDown={handleKeyDown} rows={1} disabled={sending}
                    className="w-full px-6 py-5 pr-20 bg-transparent text-white text-base placeholder-slate-500 resize-none focus:outline-none max-h-48" />
                  <button type="submit" disabled={sending || !input.trim()}
                    className="absolute right-4 bottom-4 p-3 rounded-2xl text-white disabled:opacity-30 transition-all duration-300 hover:scale-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
                    <SendIcon size="sm" />
                  </button>
                </div>
                <p className="text-center text-sm text-slate-500 mt-4">
                  <kbd className="px-2 py-1 rounded-lg bg-slate-800/60 text-slate-400 text-xs font-mono border border-slate-700/50">Enter</kbd>
                  <span className="mx-2">enviar</span>
                  <kbd className="px-2 py-1 rounded-lg bg-slate-800/60 text-slate-400 text-xs font-mono border border-slate-700/50">Shift+Enter</kbd>
                  <span className="ml-2">nueva línea</span>
                </p>
              </form>
            </div>
          </div>
        ) : (
          /* Active chat */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto py-8 px-6">
                {messages.map((m, idx) => {
                  if (m.type === 'import_preview' || m.type === 'import_done') {
                    return <ImportPreviewCard key={m.id || idx} message={m} onConfirm={() => handleConfirmImport(m)} onCancel={() => handleCancelImport(m.id)} confirming={!!(pendingImport?.msgId === m.id)} agentName={selectedAgentName} />;
                  }
                  const isUser = m.role === 'user';
                  return (
                    <div key={m.id || idx} className="py-6 animate-slide-in-message"
                      style={{ ...(idx !== 0 ? { borderTop: '1px solid rgba(139,92,246,0.08)' } : {}), animationDelay: `${idx * 20}ms` }}>
                      <div className="flex gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:scale-110`}
                          style={{ 
                            background: isUser ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: isUser ? '0 4px 20px rgba(99,102,241,0.3)' : '0 4px 20px rgba(16,185,129,0.3)'
                          }}>
                          {isUser ? (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                          ) : <SparklesIcon size="sm" className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold mb-2 ${isUser ? 'text-indigo-400' : 'text-emerald-400'}`}>
                            {isUser ? 'Tú' : selectedAgentName}
                          </p>
                          <div className={`text-base leading-relaxed whitespace-pre-wrap ${isUser ? 'text-slate-200' : 'text-white'}`}>
                            {isUser ? m.content : renderMarkdown(m.content)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {sending && (
                  <div className="py-6 animate-fade-in" style={{ borderTop: '1px solid rgba(139,92,246,0.08)' }}>
                    <div className="flex gap-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
                        <SparklesIcon size="sm" className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold mb-2 text-emerald-400">{selectedAgentName}</p>
                        <div className="inline-flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                          <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 typing-dot" />
                          </div>
                          <span className="text-sm text-emerald-400 font-medium">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div style={{ borderTop: '1px solid rgba(100,116,139,0.15)', background: 'linear-gradient(to top, rgba(10,10,15,0.98), rgba(10,10,15,0.95))', backdropFilter: 'blur(12px)' }}>
              {attachedFile && (
                <div className="max-w-3xl mx-auto px-4 pt-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl flex-wrap" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(56,189,248,0.06))', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 4px 16px rgba(139,92,246,0.05)' }}>
                    <Paperclip className="w-4 h-4 text-violet-400" />
                    <span className="text-sky-300 text-sm font-medium truncate max-w-40">{attachedFile.name}</span>
                    <span className="text-slate-500 text-xs">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                    <span className="text-slate-400 text-xs mx-1">→</span>
                    <div className="relative flex-1 min-w-32 max-w-xs">
                      <input type="text" placeholder="Buscar tabla..."
                        value={tableSearch || (importTables.find(t => t._id === importTableId)?.name || '')}
                        onChange={e => { setTableSearch(e.target.value); const match = importTables.find(t => t.name.toLowerCase().includes(e.target.value.toLowerCase())); if (match) setImportTableId(match._id); }}
                        onFocus={() => setTableSearch('')} onBlur={() => setTableSearch('')}
                        className="w-full text-xs bg-slate-700/70 text-slate-200 rounded-lg px-2.5 py-1.5 border border-slate-600 focus:border-sky-500 outline-none"
                        list="import-tables-list" />
                      <datalist id="import-tables-list">{importTables.map(t => <option key={t._id} value={t.name} />)}</datalist>
                    </div>
                    <button onClick={() => { setAttachedFile(null); setTableSearch(''); }}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSend} className="max-w-3xl mx-auto p-4">
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                <div className="relative rounded-3xl transition-all duration-300 focus-within:shadow-xl focus-within:shadow-violet-500/15"
                  style={{ background: 'linear-gradient(135deg, rgba(51,65,85,0.4), rgba(30,41,59,0.5))', border: '1px solid rgba(100,116,139,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                  <textarea ref={textareaRef}
                    placeholder={attachedFile ? `Enviar para analizar ${attachedFile.name}...` : "Escribe un mensaje..."}
                    value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown} rows={1} disabled={sending}
                    className="w-full px-6 py-4 pr-28 bg-transparent text-slate-100 text-base placeholder-slate-400 resize-none focus:outline-none max-h-48" style={{ fontWeight: 450 }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}
                    className="absolute right-16 bottom-3 p-2.5 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-30 transition-all duration-200" title="Adjuntar CSV/Excel">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button type="submit" disabled={sending || (!input.trim() && !attachedFile)}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl text-white disabled:opacity-30 transition-all duration-200 hover:scale-110 active:scale-95" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 16px rgba(139,92,246,0.4)' }}>
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
