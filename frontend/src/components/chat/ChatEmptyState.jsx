/**
 * ChatEmptyState - Estados vacíos: sin workspace, sin chat seleccionado.
 */
import { Link } from "react-router-dom";
import { MessageSquare, Sparkles } from "lucide-react";
import { CHANNELS, CHANNEL_COLORS, CHANNEL_GRADIENTS } from './ChatConstants';
import { ChatIcon } from "../Icons";

export function NoWorkspaceState() {
  return (
    <div className="flex items-center justify-center h-full" style={{ background: '#0a0a0f' }}>
      <div className="text-center animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-400">
          <ChatIcon size="lg" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Centro de Conversaciones</h1>
        <p className="text-slate-400 mb-6 max-w-sm">Selecciona un workspace para comenzar</p>
        <Link to="/workspaces" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors">
          Ir a Workspaces
        </Link>
      </div>
    </div>
  );
}

export function NoChatSelectedState({ chatList, channelCounts, onChannelChange }) {
  return (
    <div className="relative z-[1] flex-1 flex flex-col min-h-0">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg px-4">
          <div className="relative w-[4.5rem] h-[4.5rem] mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/25 to-indigo-600/20 blur-2xl" />
            <div
              className="relative w-[4.5rem] h-[4.5rem] rounded-2xl flex items-center justify-center ring-1 ring-white/10"
              style={{
                background: 'linear-gradient(145deg, rgba(139,92,246,0.9), rgba(79,70,229,0.95))',
                boxShadow: '0 12px 40px rgba(99,102,241,0.35)',
              }}
            >
              <MessageSquare className="w-8 h-8 text-white" strokeWidth={1.75} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Elige una conversación</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            WhatsApp, Instagram, Messenger, Telegram y web en un solo inbox. Selecciona un chat a la izquierda o crea uno nuevo con tu agente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {CHANNELS.filter(c => c.id !== 'all').map(ch => {
              const count = channelCounts[ch.id] || 0;
              const IconComp = ch.Icon;
              const color = CHANNEL_COLORS[ch.id];
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onChannelChange(ch.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: color?.bg || 'rgba(255,255,255,0.05)',
                    border: `1px solid ${color?.border || 'rgba(255,255,255,0.1)'}`,
                    color: color?.text || '#e2e8f0',
                  }}
                >
                  <IconComp className="w-4 h-4 opacity-90" />
                  <span className="tabular-nums font-bold">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="text-slate-600 text-xs">
            {chatList.length > 0
              ? `${chatList.length} conversación${chatList.length !== 1 ? 'es' : ''} en este proyecto`
              : 'Aún no hay conversaciones en este proyecto'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyMessagesState({ isExternalThread, channelLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-violet-400" />
      </div>
      <p className="text-slate-200 font-semibold">Aún no hay mensajes</p>
      <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
        {isExternalThread
          ? `Escribe abajo para responder al cliente por ${channelLabel}.`
          : 'Escribe para chatear con tu asistente. Puedes adjuntar CSV o Excel para importar datos.'}
      </p>
    </div>
  );
}
