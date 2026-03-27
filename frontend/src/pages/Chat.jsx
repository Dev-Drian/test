/**
 * Chat - Centro de Atención Omnicanal
 * Divide conversaciones por canales: Todos, Web/IA, Messenger, Instagram, WhatsApp
 */
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Calendar, Plus, Search, AlertTriangle, Check, Loader2, CheckCircle, XCircle, MessageSquare, Bot, Globe, Hash, Paperclip, Filter, Phone, Mail, StickyNote, User, MoreHorizontal, ChevronDown, Menu, Layers } from "lucide-react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useToast, useConfirm } from "../components/Toast";
import { 
  listAgents,
  listTables,
  getOrCreateChat, 
  sendChatMessage,
  replyExternalChat, 
  listChats, 
  deleteChat,
  renameChat,
  markChatRead,
  importFileViaChat,
  previewImportViaChat,
} from "../api/client";
import { RobotIcon, SendIcon, PlusIcon, TrashIcon, EditIcon, ChatIcon, SparklesIcon, SearchIcon } from "../components/Icons";
import { useSocketEvent } from "../hooks/useSocket";

// ── Custom Platform Icons (SVG) ─────────────────────────────────────────────
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MessengerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const AllChannelsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

// ── Channel definitions ─────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'all',       label: 'Todos',      Icon: AllChannelsIcon, color: 'slate',   gradient: 'from-slate-500 to-slate-600'   },
  { id: 'web',       label: 'Web',        Icon: Bot,             color: 'indigo',  gradient: 'from-indigo-500 to-indigo-600' },
  { id: 'messenger', label: 'Messenger',  Icon: MessengerIcon,   color: 'blue',    gradient: 'from-blue-500 to-blue-600'     },
  { id: 'instagram', label: 'Instagram',  Icon: InstagramIcon,   color: 'pink',    gradient: 'from-pink-500 to-purple-600'   },
  { id: 'whatsapp',  label: 'WhatsApp',   Icon: WhatsAppIcon,    color: 'green',   gradient: 'from-green-500 to-green-600'   },
];

const CHANNEL_COLORS = {
  web:       { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  text: '#818cf8', dot: '#818cf8' },
  messenger: { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa', dot: '#60a5fa' },
  instagram: { bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.3)',  text: '#f472b6', dot: '#f472b6' },
  whatsapp:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399', dot: '#34d399' },
};

const CHANNEL_GRADIENTS = {
  all:       { from: '#64748b', to: '#475569', shadow: 'rgba(100,116,139,0.3)' },
  web:       { from: '#6366f1', to: '#4f46e5', shadow: 'rgba(99,102,241,0.3)'  },
  messenger: { from: '#0084ff', to: '#006acd', shadow: 'rgba(0,132,255,0.3)'  },
  instagram: { from: '#E1306C', to: '#833AB4', shadow: 'rgba(225,48,108,0.3)' },
  whatsapp:  { from: '#25D366', to: '#128C7E', shadow: 'rgba(37,211,102,0.3)' },
};

const CHANNEL_ICONS = { 
  all:       AllChannelsIcon,
  web:       Bot, 
  messenger: MessengerIcon, 
  instagram: InstagramIcon, 
  whatsapp:  WhatsAppIcon 
};

// ── Filter tabs definitions ─────────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'inbox', label: 'Entrada' },
  { id: 'active', label: 'Activos' },
  { id: 'all', label: 'Todos' },
];

// ── User Avatar Component ───────────────────────────────────────────────────
function UserAvatar({ name, profilePic, size = 'md', channel, showOnline = false, unreadCount = 0, showChannelBadge = true }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-lg'
  };
  
  const initials = name 
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U';
  
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-violet-500 to-purple-500', 
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-indigo-500 to-blue-500',
  ];
  
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  const ChannelIcon = channel && CHANNEL_ICONS[channel];
  const channelGradient = channel && CHANNEL_GRADIENTS[channel];

  return (
    <div className="relative">
      {profilePic ? (
        <img 
          src={profilePic} 
          alt={name} 
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-white/10`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-semibold text-white shadow-lg`}>
          {initials}
        </div>
      )}
      {/* Channel indicator - solo si showChannelBadge es true */}
      {showChannelBadge && ChannelIcon && (
        <div 
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md"
          style={{ background: `linear-gradient(135deg, ${channelGradient?.from || '#6366f1'}, ${channelGradient?.to || '#4f46e5'})` }}
        >
          <ChannelIcon className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
      {/* Online indicator */}
      {showOnline && !ChannelIcon && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
      )}
    </div>
  );
}

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
  const Icon = CHANNEL_ICONS[channel] || CHANNEL_ICONS.web;
  const gradient = CHANNEL_GRADIENTS[channel] || CHANNEL_GRADIENTS.web;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
      style={{ 
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        boxShadow: `0 2px 8px -2px ${gradient.shadow}`
      }}
    >
      <Icon className="w-3 h-3" />
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

  // External channel: refresh chat list when a chat is created/updated via Meta
  useSocketEvent('meta:chat-ready', (data) => {
    if (!workspaceId) return;
    const incomingAgentId = data?.agentId;
    if (!incomingAgentId) return;

    // Switch to the correct agent if different
    if (incomingAgentId !== selectedAgentId) {
      setSelectedAgentId(incomingAgentId);
    }

    // Fetch chat list for the incoming agent (not the currently selected one)
    listChats(workspaceId, incomingAgentId)
      .then(res => {
        setChatList(res.data || []);
        if (data?.chatId) setChatId(data.chatId);
      })
      .catch(() => {});

    toast.success(`📩 Chat listo: ${data?.senderName || 'Contacto'} vía ${data?.platform || 'meta'}`);
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

  // ── Load chat list (todos los chats del workspace) ──────────────────────
  useEffect(() => {
    if (!workspaceId) { setChatList([]); return; }
    setLoadingChats(true);
    // Cargar todos los chats - el agentId es opcional
    listChats(workspaceId)
      .then((res) => setChatList(res.data || []))
      .catch(() => setChatList([]))
      .finally(() => setLoadingChats(false));
  }, [workspaceId]);

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

  const handleSelectChat = async (chat) => {
    setChatId(chat._id);
    
    // Si el chat tiene un agente asociado, seleccionarlo
    if (chat.agentId) {
      const agent = agents.find(a => a._id === chat.agentId);
      if (agent) {
        setSelectedAgentId(agent._id);
        setSelectedAgentName(agent.name);
      }
    }
    
    // Mark as read if has unread messages
    if (chat.unreadCount > 0 && workspaceId) {
      try {
        await markChatRead(workspaceId, chat._id);
        setChatList(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
      } catch (err) {
        console.error('Error marking chat as read:', err);
      }
    }
  };

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
    // Si es un chat externo, el operador es "assistant" (responde al cliente)
    const isExternal = activeChatMeta?.channel && activeChatMeta.channel !== 'web';
    const msgRole = isExternal ? 'assistant' : 'user';
    setMessages(prev => [...prev, { role: msgRole, content: text, id: Date.now(), ts: Date.now(), ...(isExternal && { isHuman: true }) }]);
    setSending(true);
    try {
      if (isExternal) {
        await replyExternalChat({ workspaceId, chatId: currentChatId, message: text });
        // No hay respuesta de bot — el mensaje ya se envió al usuario externo
      } else {
        const res = await sendChatMessage({ workspaceId, agentId: selectedAgentId || undefined, chatId: currentChatId, message: text, token: import.meta.env.VITE_OPENAI_KEY || undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        const reply = res.data?.response || res.data?.text || "Sin respuesta.";
        setMessages(prev => [...prev, { role: "assistant", content: reply, id: Date.now() + 1, ts: Date.now() }]);
      }
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
  const [filterTab, setFilterTab] = useState('all');

  // Filter chats by filter tab
  const tabFilteredChats = useMemo(() => {
    let list = filteredChats;
    if (filterTab === 'inbox') {
      // Mostrar solo los que tienen mensajes sin leer
      list = list.filter(c => c.unreadCount > 0);
    } else if (filterTab === 'active') {
      // Mostrar los que el usuario está activamente respondiendo (últimas 24h)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      list = list.filter(c => c.lastActivityAt && new Date(c.lastActivityAt).getTime() > dayAgo);
    }
    // filterTab === 'all' muestra todos sin filtrar adicional
    return list;
  }, [filteredChats, filterTab]);

  return (
    <div className="h-full flex" style={{ background: '#0a0a0f' }}>

      {/* ═══════════ SIDEBAR - Centro de Atención ═══════════ */}
      <aside className={`${sidebarOpen ? 'w-[340px]' : 'w-0'} shrink-0 flex flex-col transition-all duration-300 overflow-hidden bg-[#0d0d12]`}
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col h-full min-w-[340px]">

          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Centro de Atención</h2>
              <button onClick={handleNewChat} disabled={!selectedAgentId}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-4">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    filterTab === tab.id
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search with Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-slate-200 placeholder-slate-500 bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all"
                />
              </div>
              <button 
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
                onClick={() => {
                  // Mostrar dropdown de filtros (canales)
                }}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                <span className="text-xs text-blue-400 bg-blue-500/20 px-1 rounded">
                  {channelCounts[activeChannel] || 0}
                </span>
              </button>
            </div>
          </div>

          {/* Channel Selector - Diseño profesional con iconos oficiales */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-5 gap-2">
              {CHANNELS.map(ch => {
                const isActive = activeChannel === ch.id;
                const count = channelCounts[ch.id] || 0;
                const gradient = CHANNEL_GRADIENTS[ch.id];
                
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'text-white shadow-lg scale-[1.02]'
                        : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-white/[0.04]'
                    }`}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      boxShadow: `0 8px 24px -4px ${gradient.shadow}`
                    } : {}}
                  >
                    {/* Icon */}
                    <ch.Icon className={`w-5 h-5 mb-1.5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                    
                    {/* Label */}
                    <span className="text-[10px] font-semibold tracking-wide truncate max-w-full">
                      {ch.label}
                    </span>
                    
                    {/* Count Badge */}
                    {count > 0 && (
                      <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[9px] font-bold ${
                        isActive 
                          ? 'bg-white text-slate-800' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agent selector (collapsed) */}
          {(activeChannel === 'all' || activeChannel === 'web') && agents.length > 0 && (
            <div className="px-5 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <select
                value={selectedAgentId}
                onChange={e => handleAgentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900">Seleccionar agente...</option>
                {agents.map(agent => (
                  <option key={agent._id} value={agent._id} className="bg-slate-900">
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : tabFilteredChats.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">
                  {filterTab === 'inbox' ? 'Sin mensajes nuevos' : 
                   filterTab === 'active' ? 'Sin chats activos' : 'Sin conversaciones'}
                </p>
                {activeChannel === 'web' && !selectedAgentId && agents.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">Selecciona un agente para crear chats</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tabFilteredChats.map((chat) => {
                  const ch = chat.channel || chat.platform || 'web';
                  const isActive = chatId === chat._id;
                  const displayName = chat.senderName || chat.title || 'Usuario';
                  const lastMsg = chat.lastMessage || chat.title || 'Nueva conversación';
                  
                  return (
                    <div
                      key={chat._id}
                      className={`group flex items-center gap-3 px-5 py-3 cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                          : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                      }`}
                      onClick={() => handleSelectChat(chat)}
                    >
                      {/* Avatar */}
                      <UserAvatar 
                        name={displayName}
                        profilePic={chat.senderProfilePic}
                        channel={ch}
                        size="md"
                        unreadCount={chat.unreadCount || 0}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                            {displayName}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {chat.lastActivityAt ? formatTimeAgo(chat.lastActivityAt) : ''}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                          {lastMsg.slice(0, 50)}{lastMsg.length > 50 ? '...' : ''}
                        </p>
                      </div>

                      {/* Actions on hover */}
                      {editingChatId !== chat._id && (
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                            onClick={e => handleStartRename(e, chat)}
                          >
                            <EditIcon size="xs" />
                          </button>
                          <button 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={e => handleDeleteChat(e, chat._id)}
                          >
                            <TrashIcon size="xs" />
                          </button>
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
      <main className="flex-1 flex flex-col min-w-0" style={{ background: '#0a0a0f' }}>

        {/* Top bar with user info */}
        {chatId && activeChatMeta && (
          <div className="shrink-0 px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,13,18,0.95)' }}>
            <div className="flex items-center gap-4">
              {/* Toggle sidebar on mobile */}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* User Avatar */}
              <UserAvatar
                name={activeChatMeta?.senderName || activeChatMeta?.title || 'Conversación'}
                profilePic={activeChatMeta?.senderProfilePic}
                channel={activeChatMeta?.channel || activeChatMeta?.platform || 'web'}
                size="md"
                showOnline
              />
              
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white truncate">
                    {activeChatMeta?.senderName || activeChatMeta?.title || 'Conversación'}
                  </h3>
                  <ChannelBadge channel={activeChatMeta.channel || activeChatMeta.platform || 'web'} />
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {activeChatMeta?.externalRef 
                    ? `ID: ${activeChatMeta.externalRef}` 
                    : selectedAgentName 
                      ? `Asistente: ${selectedAgentName}`
                      : 'Conversación activa'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Llamar">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all" title="Más opciones">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {!chatId || messages.length === 0 ? (
          /* Empty state - Sin chat seleccionado */
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-2xl px-4">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-600/30 blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 40px rgba(139,92,246,0.4)' }}>
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Centro de Conversaciones</h1>
                <p className="text-slate-400 mb-6 text-sm">
                  Gestiona todas tus conversaciones de{' '}
                  <span className="text-blue-400">Messenger</span>,{' '}
                  <span className="text-pink-400">Instagram</span>,{' '}
                  <span className="text-emerald-400">WhatsApp</span> y{' '}
                  <span className="text-indigo-400">Web</span>
                </p>

                {/* Stats cards compactos */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  {CHANNELS.filter(c => c.id !== 'all').map(ch => {
                    const count = channelCounts[ch.id] || 0;
                    const IconComp = ch.Icon;
                    const color = CHANNEL_COLORS[ch.id];
                    return (
                      <button 
                        key={ch.id} 
                        onClick={() => setActiveChannel(ch.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
                        style={{ background: color?.bg || 'rgba(255,255,255,0.05)', border: `1px solid ${color?.border || 'rgba(255,255,255,0.1)'}` }}
                      >
                        <IconComp className="w-4 h-4" style={{ color: color?.text || '#fff' }} />
                        <span className="text-lg font-bold" style={{ color: color?.text || '#fff' }}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-slate-500 text-xs">
                  {chatList.length > 0 
                    ? `${chatList.length} conversaciones disponibles • Selecciona una del panel izquierdo`
                    : 'No hay conversaciones aún'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active chat */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-12">
              <div className="py-6 space-y-1">
                {messages.map((m, idx) => {
                  if (m.type === 'import_preview' || m.type === 'import_done') {
                    return <ImportPreviewCard key={m.id || idx} message={m} onConfirm={() => handleConfirmImport(m)} onCancel={() => handleCancelImport(m.id)} confirming={!!(pendingImport?.msgId === m.id)} agentName={selectedAgentName} />;
                  }
                  
                  const isUser = m.role === 'user';
                  const isExternalChat = activeChatMeta?.channel && activeChatMeta.channel !== 'web';
                  const prevMsg = messages[idx - 1];
                  const nextMsg = messages[idx + 1];
                  
                  // Determinar si es el primer mensaje de una secuencia del mismo remitente
                  const isFirstInGroup = !prevMsg || prevMsg.role !== m.role || prevMsg.type === 'import_preview' || prevMsg.type === 'import_done';
                  const isLastInGroup = !nextMsg || nextMsg.role !== m.role || nextMsg.type === 'import_preview' || nextMsg.type === 'import_done';
                  
                  // Nombres y avatares
                  const senderName = isUser 
                    ? (isExternalChat ? (activeChatMeta?.senderName || 'Cliente') : 'Tú')
                    : selectedAgentName;
                  const senderProfilePic = isUser && isExternalChat ? activeChatMeta?.senderProfilePic : null;
                  
                  // El usuario local se alinea a la derecha, los demás a la izquierda
                  const alignRight = isUser && !isExternalChat;
                  
                  return (
                    <div 
                      key={m.id || idx} 
                      className={`flex gap-4 ${isFirstInGroup ? 'pt-5' : 'pt-1'} ${alignRight ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar - solo mostrar en el primer mensaje del grupo */}
                      <div className={`w-10 shrink-0 ${isFirstInGroup ? '' : 'invisible'}`}>
                        {isFirstInGroup && (
                          isUser ? (
                            isExternalChat ? (
                              <UserAvatar
                                name={activeChatMeta?.senderName || 'Cliente'}
                                profilePic={senderProfilePic}
                                size="md"
                                showChannelBadge={false}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <SparklesIcon size="sm" className="text-white" />
                            </div>
                          )
                        )}
                      </div>
                      
                      {/* Message content */}
                      <div className={`flex-1 min-w-0 ${alignRight ? 'flex flex-col items-end' : ''}`}>
                        {/* Nombre y tiempo - solo en primer mensaje del grupo */}
                        {isFirstInGroup && (
                          <div className={`flex items-center gap-3 mb-1.5 ${alignRight ? 'flex-row-reverse' : ''}`}>
                            <span className={`text-sm font-semibold ${isUser ? 'text-blue-400' : 'text-emerald-400'}`}>
                              {senderName}
                            </span>
                            {m.ts && (
                              <span className="text-xs text-slate-500">
                                {new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Burbuja del mensaje */}
                        <div 
                          className={`inline-block max-w-[85%] lg:max-w-[70%] xl:max-w-[60%] px-4 py-2.5 text-[15px] leading-relaxed ${
                            alignRight 
                              ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 ${isFirstInGroup ? 'rounded-2xl rounded-tr-md' : isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-r-md'}`
                              : isUser
                                ? `bg-slate-800/80 text-slate-100 backdrop-blur-sm border border-slate-700/50 ${isFirstInGroup ? 'rounded-2xl rounded-tl-md' : isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-l-md'}`
                                : `bg-slate-800/60 text-slate-100 backdrop-blur-sm border border-slate-700/30 ${isFirstInGroup ? 'rounded-2xl rounded-tl-md' : isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-l-md'}`
                          }`}
                        >
                          {isUser ? (
                            <span className="whitespace-pre-wrap">{m.content}</span>
                          ) : (
                            <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2">
                              {renderMarkdown(m.content)}
                            </div>
                          )}
                        </div>
                        
                        {/* Timestamp inline para mensajes no agrupados */}
                        {!isFirstInGroup && isLastInGroup && m.ts && (
                          <span className={`text-xs text-slate-500 mt-1.5 ${alignRight ? 'text-right' : ''}`}>
                            {new Date(m.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {sending && (
                  <div className="flex gap-4 pt-5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                      <SparklesIcon size="sm" className="text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-emerald-400 mb-1.5 block">{selectedAgentName}</span>
                      <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl rounded-tl-md bg-slate-800/60 backdrop-blur-sm border border-slate-700/30">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 typing-dot" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-4 lg:px-8 xl:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(to top, #0d0d12, #0a0a0f)' }}>
              {attachedFile && (
                <div className="pt-4">
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
              <form onSubmit={handleSend} className="py-4">
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                <div className="relative rounded-2xl transition-all duration-300 focus-within:shadow-2xl focus-within:shadow-violet-500/10"
                  style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(100,116,139,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  <textarea ref={textareaRef}
                    placeholder={attachedFile ? `Enviar para analizar ${attachedFile.name}...` : "Escribe un mensaje..."}
                    value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown} rows={1} disabled={sending}
                    className="w-full px-6 py-4 pr-32 bg-transparent text-slate-100 text-base placeholder-slate-400 resize-none focus:outline-none max-h-48" style={{ fontWeight: 450 }} />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-30 transition-all duration-200" title="Adjuntar CSV/Excel">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button type="submit" disabled={sending || (!input.trim() && !attachedFile)}
                      className="p-3 rounded-xl text-white disabled:opacity-30 transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.5)' }}>
                      <SendIcon size="sm" />
                    </button>
                  </div>
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
