import { useState } from 'react';
import { useWidgetIntegration } from '../../hooks/useWidgetIntegration';

export default function WidgetIntegrationCard() {
  const { status, enable, disable, error, clearError } = useWidgetIntegration();
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnable = async () => {
    setToggling(true);
    try {
      await enable();
    } catch {}
    setToggling(false);
  };

  const handleDisable = async () => {
    if (!window.confirm('¿Desactivar el widget? Los visitantes ya no podrán chatear.')) return;
    setToggling(true);
    try {
      await disable();
    } catch {}
    setToggling(false);
  };

  const embedSnippet = status.token
    ? `<script src="${window.location.origin}/widget.js" data-token="${status.token}"></script>`
    : '';

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status.loading) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-48 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Widget de Chat</h3>
            <p className="text-sm text-zinc-400">Agrega chat con IA a cualquier sitio web</p>
          </div>
        </div>

        {status.enabled ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Activo
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700">
            Inactivo
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        </div>
      )}

      {status.enabled ? (
        <div className="space-y-4">
          {/* Snippet de código */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Pega este código antes de &lt;/body&gt; en tu sitio:</p>
            <div className="relative">
              <pre className="p-3 rounded-xl bg-zinc-800/70 text-xs text-zinc-300 overflow-x-auto font-mono">
                {embedSnippet}
              </pre>
              <button
                onClick={copySnippet}
                className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Capacidades */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-indigo-400">💬</span>
                <span className="text-sm font-medium text-indigo-300">Chat en vivo</span>
              </div>
              <p className="text-xs text-zinc-400">Respuestas automáticas con IA</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400">🎨</span>
                <span className="text-sm font-medium text-amber-300">Personalizable</span>
              </div>
              <p className="text-xs text-zinc-400">Colores, posición y textos</p>
            </div>
          </div>

          {/* Botón desactivar */}
          <button
            onClick={handleDisable}
            disabled={toggling}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {toggling ? 'Desactivando...' : 'Desactivar widget'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-zinc-300 mb-3">Activa el widget para:</p>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-emerald-400">✓</span>
              <span>Atender visitantes 24/7 con IA</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-emerald-400">✓</span>
              <span>Instalar en cualquier sitio con 1 línea de código</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-emerald-400">✓</span>
              <span>Personalizar colores y mensajes</span>
            </div>
          </div>

          <button
            onClick={handleEnable}
            disabled={toggling}
            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {toggling ? 'Activando...' : 'Activar Widget de Chat'}
          </button>
        </div>
      )}
    </div>
  );
}
