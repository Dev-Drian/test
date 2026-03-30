/**
 * ChatSidebar - Sidebar con filtros, canales, buscador y lista de chats.
 */
import { Plus, Search, Filter, MessageSquare } from "lucide-react";
import { CHANNELS, CHANNEL_GRADIENTS, FILTER_TABS } from './ChatConstants';
import UserAvatar from './UserAvatar';
import { formatTimeAgo } from './ChannelBadge';
import { EditIcon, TrashIcon } from "../Icons";

export default function ChatSidebar({
  sidebarOpen,
  agents,
  selectedAgentId,
  chatId,
  activeChannel,
  searchQuery,
  filterTab,
  channelCounts,
  tabFilteredChats,
  loadingChats,
  editingChatId,
  editingTitle,
  onNewConversation,
  onFilterTabChange,
  onSearchChange,
  onChannelChange,
  onAgentChange,
  onSelectChat,
  onStartRename,
  onSaveRename,
  onEditingTitleChange,
  onDeleteChat,
  onResetFilters,
}) {
  return (
    <aside
      className={`${sidebarOpen ? 'w-[340px]' : 'w-0'} shrink-0 flex flex-col transition-all duration-300 overflow-hidden bg-[#0d0d12]`}
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex flex-col h-full min-w-[340px]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Conversaciones</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Inbox omnicanal · un solo lugar</p>
            </div>
            <button
              type="button"
              onClick={onNewConversation}
              disabled={agents.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 border border-transparent hover:border-white/10"
              title="Nueva conversación (tipo y agente)"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-4 p-0.5 rounded-xl bg-black/20 border border-white/[0.06]">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onFilterTabChange(tab.id)}
                className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === tab.id
                    ? 'text-white bg-white/10 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o referencia..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 bg-white/[0.04] border border-white/[0.08] focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            </div>
            <button
              type="button"
              className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/[0.08] transition-all min-w-[3.25rem]"
              title="Restablecer filtros y canal"
              onClick={onResetFilters}
            >
              <Filter className="w-4 h-4 mb-0.5 opacity-80" />
              <span className="text-[10px] font-bold text-violet-400 tabular-nums">{channelCounts[activeChannel] ?? 0}</span>
            </button>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-5 gap-2">
            {CHANNELS.map(ch => {
              const isActive = activeChannel === ch.id;
              const count = channelCounts[ch.id] || 0;
              const gradient = CHANNEL_GRADIENTS[ch.id];
              return (
                <button
                  key={ch.id}
                  onClick={() => onChannelChange(ch.id)}
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
                  <ch.Icon className={`w-5 h-5 mb-1.5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                  <span className="text-[10px] font-semibold tracking-wide truncate max-w-full">{ch.label}</span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[9px] font-bold ${
                      isActive ? 'bg-white text-slate-800' : 'bg-blue-500 text-white'
                    }`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent selector */}
        {(activeChannel === 'all' || activeChannel === 'web') && agents.length > 0 && (
          <div className="px-5 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <select
              value={selectedAgentId}
              onChange={e => onAgentChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">Seleccionar agente...</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id} className="bg-slate-900">{agent.name}</option>
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
              {tabFilteredChats.map(chat => {
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
                    onClick={() => onSelectChat(chat)}
                  >
                    <UserAvatar
                      name={displayName}
                      profilePic={chat.senderProfilePic}
                      channel={ch}
                      size="md"
                      unreadCount={chat.unreadCount || 0}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>{displayName}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{chat.lastActivityAt ? formatTimeAgo(chat.lastActivityAt) : ''}</span>
                      </div>
                      <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>
                        {lastMsg.slice(0, 50)}{lastMsg.length > 50 ? '...' : ''}
                      </p>
                    </div>
                    {editingChatId !== chat._id && (
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                          onClick={e => onStartRename(e, chat)}
                        >
                          <EditIcon size="xs" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          onClick={e => onDeleteChat(e, chat._id)}
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
  );
}
