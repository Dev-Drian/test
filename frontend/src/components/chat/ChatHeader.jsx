/**
 * ChatHeader - Barra superior del chat activo con avatar, canal y acciones.
 */
import { PanelLeftClose, PanelLeft, Phone, MoreHorizontal, Database } from "lucide-react";
import UserAvatar from './UserAvatar';
import ChannelBadge from './ChannelBadge';

export default function ChatHeader({
  headerMeta,
  sidebarOpen,
  selectedAgentName,
  isExternalThread,
  contextPanelOpen,
  onToggleSidebar,
  onToggleContextPanel,
}) {
  return (
    <div
      className="relative z-[1] shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 backdrop-blur-md"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(14,14,22,0.92) 0%, rgba(10,10,15,0.88) 100%)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/[0.06] transition-all shrink-0"
          title={sidebarOpen ? 'Ocultar lista' : 'Mostrar lista'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>

        <UserAvatar
          name={headerMeta?.senderName || headerMeta?.title || 'Conversación'}
          profilePic={headerMeta?.senderProfilePic}
          channel={headerMeta?.channel || headerMeta?.platform || 'web'}
          size="md"
          showOnline={!isExternalThread}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-white truncate">
              {headerMeta?.senderName || headerMeta?.title || 'Conversación'}
            </h3>
            <ChannelBadge channel={headerMeta.channel || headerMeta.platform || 'web'} />
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {isExternalThread ? (
              <>
                <span className="text-amber-400/90 font-medium">Operador</span>
                {' · '}
                {headerMeta?.externalRef || 'Cliente externo'}
              </>
            ) : selectedAgentName ? (
              <>Asistente: <span className="text-slate-400">{selectedAgentName}</span></>
            ) : (
              'Chat web con IA'
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggleContextPanel}
          className={`p-2 rounded-xl transition-all ${
            contextPanelOpen
              ? "text-violet-300 bg-violet-500/15 border border-violet-500/25"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
          }`}
          title={contextPanelOpen ? "Ocultar contexto y tablas" : "Mostrar contexto (tipo + contactos)"}
        >
          <Database className="w-5 h-5" />
        </button>
        <button type="button" className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all" title="Próximamente" disabled>
          <Phone className="w-5 h-5" />
        </button>
        <button type="button" className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all" title="Próximamente" disabled>
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
