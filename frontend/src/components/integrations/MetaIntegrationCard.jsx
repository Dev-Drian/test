import { useState, useEffect } from 'react';
import { useMetaIntegration } from '../../hooks/useMetaIntegration';
import { useSearchParams } from 'react-router-dom';

// ── Iconos SVG ────────────────────────────────────────────────────────────────
function WhatsAppIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MessengerIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.26 5.886-3.26-6.558 6.763z" />
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

// ── Canal item ────────────────────────────────────────────────────────────────
function ChannelRow({ icon, name, color, connected, detail, onConnect, onDisconnect, connecting }) {
  return (
    <div className={`p-4 rounded-xl border ${connected ? `bg-${color}-500/5 border-${color}-500/20` : 'bg-zinc-800/40 border-zinc-700/50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? `bg-${color}-500/20` : 'bg-zinc-700/50'}`}>
            {icon}
          </div>
          <div>
            <p className={`text-sm font-medium ${connected ? 'text-white' : 'text-zinc-300'}`}>{name}</p>
            {connected && detail ? (
              <p className="text-xs text-zinc-400">{detail}</p>
            ) : !connected ? (
              <p className="text-xs text-zinc-500">No conectado</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Activo
              </span>
              <button
                onClick={onDisconnect}
                className="px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={connecting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 ${
                name === 'WhatsApp'
                  ? 'bg-green-600 hover:bg-green-700'
                  : name === 'Messenger'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              {connecting ? 'Conectando...' : 'Conectar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card principal ────────────────────────────────────────────────────────────
export default function MetaIntegrationCard() {
  const {
    config,
    saveConfig,
    testConnection,
    disconnect,
    error,
    clearError,
    connectChannel,
    fetchPages,
    choosePage,
    refresh,
  } = useMetaIntegration();

  const [searchParams] = useSearchParams();
  const [notification, setNotification] = useState(null);
  const [connectingChannel, setConnectingChannel] = useState(null);
  const [disconnectingChannel, setDisconnectingChannel] = useState(null);

  // Page selection (multi-page OAuth flow)
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [pageSelectChannel, setPageSelectChannel] = useState(null);
  const [availablePages, setAvailablePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectingPage, setSelectingPage] = useState(null);

  // WhatsApp manual setup
  const [showWhatsAppSetup, setShowWhatsAppSetup] = useState(false);
  const [waForm, setWaForm] = useState({ token: '', phoneNumberId: '', appSecret: '' });
  const [waTesting, setWaTesting] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null);

  // Leer resultado OAuth del query string
  useEffect(() => {
    const metaParam = searchParams.get('meta');
    const metaError = searchParams.get('meta_error');

    if (metaParam === 'select_page') {
      const ch = searchParams.get('channel');
      setPageSelectChannel(ch);
      setShowPageSelector(true);
      setLoadingPages(true);
      fetchPages().then(pages => {
        setAvailablePages(pages);
        setLoadingPages(false);
      });
      // Limpiar URL
      const url = new URL(window.location);
      url.searchParams.delete('meta');
      url.searchParams.delete('channel');
      window.history.replaceState({}, '', url);
    } else if (metaParam?.includes('connected')) {
      const ch = metaParam.replace('_connected', '');
      setNotification({ type: 'success', message: `${ch.charAt(0).toUpperCase() + ch.slice(1)} conectado exitosamente` });
      refresh();
      // Limpiar URL
      const url = new URL(window.location);
      url.searchParams.delete('meta');
      window.history.replaceState({}, '', url);
    }
    if (metaError) {
      const friendlyErrors = {
        no_pages: 'No se encontraron páginas de Facebook. Asegúrate de tener al menos una Página.',
        no_instagram_account: 'Ninguna de tus páginas tiene una cuenta de Instagram Business vinculada.',
        missing_params: 'Parámetros faltantes en la respuesta de Facebook.',
        invalid_state: 'Estado de sesión inválido. Intenta de nuevo.',
      };
      setNotification({ type: 'error', message: friendlyErrors[metaError] || `Error: ${metaError}` });
      const url = new URL(window.location);
      url.searchParams.delete('meta_error');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams, refresh]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleConnectOAuth = async (channel) => {
    setConnectingChannel(channel);
    await connectChannel(channel);
    // Si llega aquí sin redirigir, algo falló
    setConnectingChannel(null);
  };

  const handleDisconnect = async (channel) => {
    const labels = { whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram' };
    if (!window.confirm(`¿Desconectar ${labels[channel]}? Los mensajes dejarán de llegar.`)) return;
    setDisconnectingChannel(channel);
    try {
      await disconnect(channel);
      setNotification({ type: 'success', message: `${labels[channel]} desconectado` });
    } catch {}
    setDisconnectingChannel(null);
  };

  // WhatsApp manual
  const handleWaTest = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      await saveConfig({
        whatsapp: { token: waForm.token, phoneNumberId: waForm.phoneNumberId },
        appSecret: waForm.appSecret || undefined,
      });
      const result = await testConnection('whatsapp');
      setWaTestResult(result);
    } catch {
      setWaTestResult({ connected: false, error: 'Error al probar conexión' });
    }
    setWaTesting(false);
  };

  const handleWaSave = async () => {
    setWaSaving(true);
    try {
      await saveConfig({
        whatsapp: { token: waForm.token, phoneNumberId: waForm.phoneNumberId },
        appSecret: waForm.appSecret || undefined,
      });
      setShowWhatsAppSetup(false);
      setNotification({ type: 'success', message: 'WhatsApp configurado correctamente' });
    } catch {}
    setWaSaving(false);
  };

  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    if (config.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (config.loading) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800" />
          <div className="flex-1">
            <div className="h-5 w-40 bg-zinc-800 rounded mb-2" />
            <div className="h-4 w-56 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isAnyConnected = config.whatsapp?.enabled || config.whatsapp?.hasToken || config.messenger?.enabled || config.instagram?.enabled;

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Meta Business</h3>
            <p className="text-sm text-zinc-400">WhatsApp, Messenger e Instagram</p>
          </div>
        </div>

        {isAnyConnected ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Activo
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700">
            No conectado
          </span>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg flex items-start justify-between gap-2 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <p className={`text-sm ${notification.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {notification.type === 'success' ? '✓ ' : '✗ '}{notification.message}
          </p>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-zinc-300 text-sm">✕</button>
        </div>
      )}

      {/* Error del hook */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 mb-4">
        Conecta tus canales de Meta para responder mensajes automáticamente con IA.
      </p>

      {/* ── Canales ── */}
      <div className="space-y-3 mb-5">
        {/* Messenger — OAuth */}
        <ChannelRow
          icon={<MessengerIcon className="w-5 h-5 text-blue-400" />}
          name="Messenger"
          color="blue"
          connected={config.messenger?.enabled || config.messenger?.hasToken}
          detail={config.messenger?.pageName || config.messenger?.pageId || null}
          onConnect={() => handleConnectOAuth('messenger')}
          onDisconnect={() => handleDisconnect('messenger')}
          connecting={connectingChannel === 'messenger'}
        />

        {/* Instagram — OAuth */}
        <ChannelRow
          icon={<InstagramIcon className="w-5 h-5 text-pink-400" />}
          name="Instagram"
          color="pink"
          connected={config.instagram?.enabled || config.instagram?.hasToken}
          detail={config.instagram?.username || null}
          onConnect={() => handleConnectOAuth('instagram')}
          onDisconnect={() => handleDisconnect('instagram')}
          connecting={connectingChannel === 'instagram'}
        />

        {/* WhatsApp — Manual setup */}
        <ChannelRow
          icon={<WhatsAppIcon className="w-5 h-5 text-green-400" />}
          name="WhatsApp"
          color="green"
          connected={config.whatsapp?.enabled || config.whatsapp?.hasToken}
          detail={config.whatsapp?.phoneNumberId ? `ID: ${config.whatsapp.phoneNumberId}` : null}
          onConnect={() => setShowWhatsAppSetup(true)}
          onDisconnect={() => handleDisconnect('whatsapp')}
          connecting={false}
        />
      </div>

      {/* ── WhatsApp manual setup (expandible) ── */}
      {showWhatsAppSetup && (
        <div className="mb-5 p-4 rounded-xl border border-green-500/20 bg-green-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-300">Configurar WhatsApp Cloud API</p>
            <button onClick={() => setShowWhatsAppSetup(false)} className="text-xs text-zinc-500 hover:text-zinc-400">
              Cerrar
            </button>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">WhatsApp Token (Cloud API)</label>
            <input
              type="password"
              value={waForm.token}
              onChange={(e) => setWaForm({ ...waForm, token: e.target.value })}
              placeholder="EAAxxxxxxx..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Phone Number ID</label>
            <input
              type="text"
              value={waForm.phoneNumberId}
              onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
              placeholder="123456789012345"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">App Secret (opcional)</label>
            <input
              type="password"
              value={waForm.appSecret}
              onChange={(e) => setWaForm({ ...waForm, appSecret: e.target.value })}
              placeholder="abc123..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500"
            />
          </div>

          {waTestResult && (
            <div className={`p-3 rounded-lg text-sm ${waTestResult.connected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {waTestResult.connected
                ? `✓ Conexión exitosa — ${waTestResult.displayName || waTestResult.phoneNumber}`
                : `✗ ${waTestResult.error || 'No se pudo conectar'}`}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleWaTest}
              disabled={waTesting || !waForm.token || !waForm.phoneNumberId}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {waTesting ? 'Probando...' : 'Probar conexión'}
            </button>
            <button
              onClick={handleWaSave}
              disabled={waSaving || !waForm.token || !waForm.phoneNumberId}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
            >
              {waSaving ? 'Guardando...' : 'Guardar y activar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Webhook URL (visible si hay algo conectado) ── */}
      {isAnyConnected && config.webhookUrl && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">URL del Webhook (configura en Meta Dashboard):</p>
          <div className="relative">
            <pre className="p-3 rounded-xl bg-zinc-800/70 text-xs text-zinc-300 overflow-x-auto font-mono pr-20">
              {config.webhookUrl}
            </pre>
            <button
              onClick={copyUrl}
              className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Instrucciones ── */}
      {!isAnyConnected && (
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
          <p className="text-xs text-blue-400 font-medium mb-2">¿Cómo funciona?</p>
          <ul className="text-xs text-zinc-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">1.</span>
              <span><strong className="text-zinc-300">Messenger / Instagram:</strong> Haz clic en "Conectar" e inicia sesión con Facebook. Se conectará con tu Página automáticamente.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">2.</span>
              <span><strong className="text-zinc-300">WhatsApp:</strong> Requiere configuración manual con los tokens de la API Cloud de WhatsApp.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">3.</span>
              <span>Los mensajes entrantes se procesan con IA y flujos automáticos.</span>
            </li>
          </ul>
        </div>
      )}

      {/* ── Page Selector Modal ── */}
      {showPageSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0c0c0f', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-blue-500/10">
                {pageSelectChannel === 'instagram'
                  ? <InstagramIcon className="w-6 h-6 text-pink-400" />
                  : <MessengerIcon className="w-6 h-6 text-blue-400" />}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Selecciona una página
              </h3>
              <p className="text-sm text-zinc-400 mb-5">
                Tienes varias páginas de Facebook. Elige cuál conectar para {pageSelectChannel === 'instagram' ? 'Instagram' : 'Messenger'}.
              </p>

              {loadingPages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availablePages.map((page) => (
                    <button
                      key={page.id}
                      disabled={selectingPage === page.id}
                      onClick={async () => {
                        setSelectingPage(page.id);
                        try {
                          await choosePage(pageSelectChannel, page.id);
                          setShowPageSelector(false);
                          setNotification({ type: 'success', message: `${page.name} conectada exitosamente` });
                        } catch {
                          setNotification({ type: 'error', message: 'Error al seleccionar página' });
                        }
                        setSelectingPage(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-700/50 bg-zinc-800/40 hover:bg-zinc-700/50 hover:border-blue-500/30 transition-all text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">{'\uD83D\uDCC4'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{page.name}</p>
                        {page.igUsername && (
                          <p className="text-xs text-zinc-500">@{page.igUsername}</p>
                        )}
                      </div>
                      {selectingPage === page.id ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowPageSelector(false)}
                className="mt-4 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 transition-all hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
