/**
 * Chat - Centro de Atención Omnicanal
 * Orquestador principal: state, effects y composición de sub-componentes.
 */
import { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { useSocketEvent } from "../hooks/useSocket";
import { NewConversationModal, ChatContextPanel } from "../components/chat/ChatSidePanels.jsx";
import { EXTERNAL_CHANNEL_LABELS } from "../components/chat/ChatConstants";
import ChannelBadge from "../components/chat/ChannelBadge";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatHeader from "../components/chat/ChatHeader";
import { NoWorkspaceState, NoChatSelectedState } from "../components/chat/ChatEmptyState";
import ChatMessageList from "../components/chat/ChatMessageList";
import ChatInputBar from "../components/chat/ChatInputBar";

export default function Chat() {
  const { workspaceId } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();

  // ── Core state ────────────────────────────────────────────────────────
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
  const [filterTab, setFilterTab] = useState('all');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [creatingWebChat, setCreatingWebChat] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);

  // ── File import state ─────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState(null);
  const [importTables, setImportTables] = useState([]);
  const [importTableId, setImportTableId] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [pendingImport, setPendingImport] = useState(null);

  // ── Derived / memoized ────────────────────────────────────────────────
  const activeChatMeta = useMemo(() => chatList.find(c => c._id === chatId) || null, [chatList, chatId]);

  const headerMeta = useMemo(() => {
    if (!chatId) return null;
    return activeChatMeta || { _id: chatId, title: "Conversación", channel: "web", platform: "web", senderName: null };
  }, [chatId, activeChatMeta]);

  const isExternalThread = headerMeta?.channel && headerMeta.channel !== "web";

  const filteredChats = useMemo(() => {
    let list = chatList;
    if (activeChannel !== 'all') list = list.filter(c => (c.channel || c.platform || 'web') === activeChannel);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.title || '').toLowerCase().includes(q) || (c.externalRef || '').toLowerCase().includes(q) || (c.senderName || '').toLowerCase().includes(q));
    }
    return list;
  }, [chatList, activeChannel, searchQuery]);

  const tabFilteredChats = useMemo(() => {
    if (filterTab === 'inbox') return filteredChats.filter(c => c.unreadCount > 0);
    if (filterTab === 'active') { const dayAgo = Date.now() - 86400000; return filteredChats.filter(c => c.lastActivityAt && new Date(c.lastActivityAt).getTime() > dayAgo); }
    return filteredChats;
  }, [filteredChats, filterTab]);

  const channelCounts = useMemo(() => {
    const counts = { all: chatList.length, web: 0, telegram: 0, messenger: 0, instagram: 0, whatsapp: 0 };
    chatList.forEach(c => { const ch = c.channel || c.platform || 'web'; if (counts[ch] !== undefined) counts[ch]++; else counts.web++; });
    return counts;
  }, [chatList]);

  // ── WebSocket ─────────────────────────────────────────────────────────
  useSocketEvent('chat:message', ({ chatId: incomingChatId, message }) => {
    if (incomingChatId === chatId && message?.content) {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, { role: 'assistant', content: message.content, id: message.id || `ws_${Date.now()}`, ts: Date.now() }];
      });
    }
  });

  useSocketEvent('meta:chat-ready', (data) => {
    if (!workspaceId) return;
    const incomingAgentId = data?.agentId;
    if (!incomingAgentId) return;
    if (incomingAgentId !== selectedAgentId) setSelectedAgentId(incomingAgentId);
    listChats(workspaceId, incomingAgentId).then(res => { setChatList(res.data || []); if (data?.chatId) setChatId(data.chatId); }).catch(() => {});
    toast.success(`Chat listo: ${data?.senderName || 'Contacto'} via ${data?.platform || 'meta'}`);
  });

  // ── File handling ─────────────────────────────────────────────────────
  const loadImportTables = useCallback(async () => {
    if (importTables.length > 0 || !workspaceId) return;
    try { const res = await listTables(workspaceId); const t = res.data || []; setImportTables(t); if (t.length > 0) setImportTableId(t[0]._id); }
    catch (e) { console.error(e); toast.error('Error al cargar tablas'); }
  }, [workspaceId, importTables.length, toast]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const reader = new FileReader();
    reader.onload = (ev) => {
      let content;
      if (isExcel) { const bytes = new Uint8Array(ev.target.result); let binary = ''; for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); content = btoa(binary); }
      else { content = ev.target.result; }
      setAttachedFile({ name: file.name, content, encoding: isExcel ? 'base64' : 'utf8', size: file.size });
      loadImportTables();
    };
    if (isExcel) reader.readAsArrayBuffer(file); else reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }, [loadImportTables]);

  const handleImportPreview = async () => {
    if (!attachedFile || !importTableId || sending) return;
    let currentChatId = chatId;
    if (!currentChatId) {
      try { const res = await getOrCreateChat(workspaceId, selectedAgentId); const newChat = res.data.chat || res.data; currentChatId = newChat._id; setChatId(currentChatId); setNewChatId(currentChatId); setChatList(prev => [{ _id: currentChatId, title: `Importar ${attachedFile.name}`, messageCount: 0, channel: 'web' }, ...prev]); }
      catch { return; }
    }
    const fileToImport = attachedFile;
    setAttachedFile(null);
    setMessages(prev => [...prev, { role: 'user', content: `Importar: **${fileToImport.name}**`, id: `user_import_${Date.now()}`, ts: Date.now() }]);
    setSending(true);
    try { const res = await previewImportViaChat({ workspaceId, tableId: importTableId, file: fileToImport }); setMessages(prev => [...prev, { role: 'assistant', type: 'import_preview', id: `import_preview_${Date.now()}`, ts: Date.now(), preview: res.data, tableId: importTableId, file: fileToImport }]); }
    catch (err) { setMessages(prev => [...prev, { role: 'assistant', content: 'No pude analizar el archivo: ' + (err.response?.data?.error || err.message), id: `err_${Date.now()}`, ts: Date.now() }]); }
    finally { setSending(false); }
  };

  const handleConfirmImport = async (msg) => {
    if (pendingImport || sending) return;
    setPendingImport({ msgId: msg.id }); setSending(true);
    try { const res = await importFileViaChat({ workspaceId, agentId: selectedAgentId, chatId, tableId: msg.tableId, file: msg.file }); const reply = res.data?.response || 'Importación completada.'; setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, type: 'import_done', content: reply } : m)); }
    catch (err) { const errMsg = 'Error al importar: ' + (err.response?.data?.error || err.message); setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, type: undefined, content: errMsg } : m)); }
    finally { setSending(false); setPendingImport(null); }
  };

  const handleCancelImport = (msgId) => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, type: undefined, content: 'Importación cancelada.' } : m)); };

  // ── Load agents ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    listAgents(workspaceId).then(res => { const list = res.data || []; setAgents(list); if (list.length === 1) { setSelectedAgentId(list[0]._id); setSelectedAgentName(list[0].name); } }).finally(() => setLoading(false));
  }, [workspaceId]);

  // ── Load chat list ────────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) { setChatList([]); return; }
    setLoadingChats(true);
    listChats(workspaceId).then(res => setChatList(res.data || [])).catch(() => setChatList([])).finally(() => setLoadingChats(false));
  }, [workspaceId]);

  // ── Load selected chat ────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId || !selectedAgentId || !chatId) { setMessages([]); return; }
    if (chatId === newChatId) { setNewChatId(null); return; }
    getOrCreateChat(workspaceId, selectedAgentId, chatId)
      .then(res => { const msgs = res.data.chat?.messages || []; setMessages(msgs.map((m, idx) => ({ ...m, id: m._id || m.id || `msg-${idx}`, ts: m.timestamp ? new Date(m.timestamp).getTime() : Date.now() }))); })
      .catch(() => setMessages([]));
  }, [workspaceId, selectedAgentId, chatId]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleAgentChange = (agentId) => {
    setSelectedAgentId(agentId);
    setSelectedAgentName(agents.find(a => a._id === agentId)?.name || "");
    setChatId(""); setMessages([]);
  };

  const handleNewChat = async () => {
    if (!workspaceId || !selectedAgentId) return;
    setCreatingWebChat(true);
    try {
      const res = await getOrCreateChat(workspaceId, selectedAgentId);
      const newChat = res.data.chat || res.data;
      setNewChatId(newChat._id); setChatId(newChat._id); setMessages([]);
      setChatList(prev => [{ _id: newChat._id, title: "Nueva conversación", messageCount: 0, createdAt: newChat.createdAt, channel: 'web' }, ...prev]);
      setActiveChannel('all'); setNewConvOpen(false); setContextPanelOpen(true);
    } catch (err) { console.error("Error creating chat:", err); toast.error('Error al crear conversación'); }
    finally { setCreatingWebChat(false); }
  };

  const handleSelectChat = async (chat) => {
    setChatId(chat._id);
    if (chat.agentId) { const agent = agents.find(a => a._id === chat.agentId); if (agent) { setSelectedAgentId(agent._id); setSelectedAgentName(agent.name); } }
    if (chat.unreadCount > 0 && workspaceId) {
      try { await markChatRead(workspaceId, chat._id); setChatList(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c)); }
      catch (err) { console.error('Error marking chat as read:', err); }
    }
  };

  const handleDeleteChat = async (e, chatIdToDelete) => {
    e.stopPropagation();
    const confirmed = await confirm({ title: 'Eliminar conversación', message: '¿Eliminar esta conversación? No se puede deshacer.', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!confirmed) return;
    try { await deleteChat(workspaceId, chatIdToDelete); setChatList(prev => prev.filter(c => c._id !== chatIdToDelete)); if (chatId === chatIdToDelete) { setChatId(""); setMessages([]); } toast.success('Conversación eliminada'); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleStartRename = (e, chat) => { e.stopPropagation(); setEditingChatId(chat._id); setEditingTitle(chat.title || "Nueva conversación"); };

  const handleSend = async (e) => {
    e.preventDefault();
    if (attachedFile) { await handleImportPreview(); return; }
    const text = input.trim();
    if (!text || !workspaceId || sending) return;
    let currentChatId = chatId;
    if (!currentChatId) {
      try { const res = await getOrCreateChat(workspaceId, selectedAgentId); const newChat = res.data.chat || res.data; currentChatId = newChat._id; setNewChatId(currentChatId); setChatId(currentChatId); setChatList(prev => [{ _id: currentChatId, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 0, createdAt: newChat.createdAt, channel: 'web' }, ...prev]); }
      catch (err) { console.error("Error creating chat:", err); toast.error('Error al iniciar conversación'); return; }
    }
    setInput("");
    const isExternal = activeChatMeta?.channel && activeChatMeta.channel !== 'web';
    const msgRole = isExternal ? 'assistant' : 'user';
    setMessages(prev => [...prev, { role: msgRole, content: text, id: Date.now(), ts: Date.now(), ...(isExternal && { isHuman: true }) }]);
    setSending(true);
    try {
      if (isExternal) { await replyExternalChat({ workspaceId, chatId: currentChatId, message: text }); }
      else { const res = await sendChatMessage({ workspaceId, agentId: selectedAgentId || undefined, chatId: currentChatId, message: text, token: import.meta.env.VITE_OPENAI_KEY || undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); const reply = res.data?.response || res.data?.text || "Sin respuesta."; setMessages(prev => [...prev, { role: "assistant", content: reply, id: Date.now() + 1, ts: Date.now() }]); }
      setChatList(prev => prev.map(c => c._id === currentChatId && c.messageCount === 0 ? { ...c, title: text.slice(0, 40) + (text.length > 40 ? "..." : ""), messageCount: 2 } : c));
    } catch (err) { setMessages(prev => [...prev, { role: "assistant", content: "Error: " + (err.response?.data?.error || err.message), id: Date.now() + 1, ts: Date.now() }]); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } };

  const handleTableSearchChange = (val) => {
    setTableSearch(val);
    const match = importTables.find(t => t.name.toLowerCase().includes(val.toLowerCase()));
    if (match) setImportTableId(match._id);
  };

  // ── No workspace ──────────────────────────────────────────────────────
  if (!workspaceId) return <NoWorkspaceState />;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex min-h-0" style={{ background: '#0a0a0f' }}>
      {/* Sidebar */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        agents={agents}
        selectedAgentId={selectedAgentId}
        chatId={chatId}
        activeChannel={activeChannel}
        searchQuery={searchQuery}
        filterTab={filterTab}
        channelCounts={channelCounts}
        tabFilteredChats={tabFilteredChats}
        loadingChats={loadingChats}
        editingChatId={editingChatId}
        editingTitle={editingTitle}
        onNewConversation={() => {
          if (!selectedAgentId && agents.length > 0) { toast.error("Selecciona un agente primero"); return; }
          setNewConvOpen(true);
        }}
        onFilterTabChange={setFilterTab}
        onSearchChange={setSearchQuery}
        onChannelChange={setActiveChannel}
        onAgentChange={handleAgentChange}
        onSelectChat={handleSelectChat}
        onStartRename={handleStartRename}
        onSaveRename={(e) => {
          e.stopPropagation();
          if (!editingTitle.trim()) { setEditingChatId(null); return; }
          renameChat(workspaceId, editingChatId, editingTitle.trim()).then(() => { setChatList(prev => prev.map(c => c._id === editingChatId ? { ...c, title: editingTitle.trim() } : c)); }).catch(err => { console.error("Error renaming chat:", err); toast.error('Error al renombrar conversación'); });
          setEditingChatId(null);
        }}
        onEditingTitleChange={setEditingTitle}
        onDeleteChat={handleDeleteChat}
        onResetFilters={() => { setFilterTab("all"); setSearchQuery(""); setActiveChannel("all"); }}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative" style={{ background: '#0a0a0f' }}>
        {/* Ambient gradient */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-90" style={{ background: 'radial-gradient(ellipse 85% 55% at 50% -15%, rgba(139,92,246,0.11), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(99,102,241,0.07), transparent 50%)' }} />

        {/* Header */}
        {chatId && headerMeta && (
          <ChatHeader
            headerMeta={headerMeta}
            sidebarOpen={sidebarOpen}
            selectedAgentName={selectedAgentName}
            isExternalThread={isExternalThread}
            contextPanelOpen={contextPanelOpen}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            onToggleContextPanel={() => setContextPanelOpen(o => !o)}
          />
        )}

        {!chatId ? (
          <NoChatSelectedState chatList={chatList} channelCounts={channelCounts} onChannelChange={setActiveChannel} />
        ) : (
          <div className="relative z-[1] flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 flex min-h-0 min-w-0">
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                {/* Mobile context bar */}
                {contextPanelOpen && (
                  <div className="lg:hidden shrink-0 px-4 py-2.5 border-b border-white/[0.06] bg-black/20 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Canal</span>
                    <ChannelBadge channel={headerMeta?.channel || headerMeta?.platform || "web"} />
                    {isExternalThread && headerMeta?.externalRef && (
                      <span className="text-slate-600 font-mono truncate max-w-[200px]">{headerMeta.externalRef}</span>
                    )}
                    <Link to="/tables" className="ml-auto text-violet-400 font-medium hover:underline">Ver tablas / contactos</Link>
                  </div>
                )}

                {/* Messages */}
                <ChatMessageList
                  messages={messages}
                  sending={sending}
                  selectedAgentName={selectedAgentName}
                  headerMeta={headerMeta}
                  isExternalThread={isExternalThread}
                  pendingImport={pendingImport}
                  onConfirmImport={handleConfirmImport}
                  onCancelImport={handleCancelImport}
                />
              </div>

              {/* Context panel (desktop) */}
              {contextPanelOpen && (
                <aside className="hidden lg:flex w-[min(100%,300px)] xl:w-[320px] shrink-0 min-h-0">
                  <ChatContextPanel
                    workspaceId={workspaceId}
                    channel={headerMeta?.channel || headerMeta?.platform || "web"}
                    externalRef={headerMeta?.externalRef}
                    senderName={headerMeta?.senderName}
                    isExternal={isExternalThread}
                  />
                </aside>
              )}
            </div>

            {/* Operator mode banner */}
            {isExternalThread && (
              <div className="shrink-0 px-4 lg:px-8 xl:px-12 pt-3">
                <div className="max-w-4xl mx-auto flex items-start gap-3 rounded-xl px-4 py-2.5 bg-amber-500/[0.07] border border-amber-500/25 text-xs text-amber-100/90 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <p>
                    <span className="font-semibold text-amber-200">Modo operador</span>{' — '}Tu mensaje se envía al cliente por{' '}
                    <span className="font-medium text-amber-100">{EXTERNAL_CHANNEL_LABELS[headerMeta?.channel] || 'canal externo'}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Input */}
            <ChatInputBar
              input={input}
              sending={sending}
              attachedFile={attachedFile}
              importTables={importTables}
              importTableId={importTableId}
              tableSearch={tableSearch}
              isExternalThread={isExternalThread}
              headerMeta={headerMeta}
              onInputChange={setInput}
              onKeyDown={handleKeyDown}
              onSubmit={handleSend}
              onFileSelect={handleFileSelect}
              onRemoveFile={() => { setAttachedFile(null); setTableSearch(''); }}
              onTableSearchChange={handleTableSearchChange}
              onTableSearchFocus={() => setTableSearch('')}
              onTableSearchBlur={() => setTableSearch('')}
            />
          </div>
        )}
      </main>

      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentChange={(id) => { setSelectedAgentId(id); setSelectedAgentName(agents.find(a => a._id === id)?.name || ""); }}
        onCreateWeb={handleNewChat}
        creating={creatingWebChat}
      />
      {ConfirmModal}
    </div>
  );
}
