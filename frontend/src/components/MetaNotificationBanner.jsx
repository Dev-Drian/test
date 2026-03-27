/**
 * NotificationBanner — Sistema de notificaciones completo
 *
 * 1) Banner flotante tipo "toast" que aparece arriba-derecha al recibir notificaciones.
 *    Con sonido, animación y clic para navegar.
 *
 * 2) Exporta un hook useNotificationStore() que Layout usa para:
 *    - badge counter en la campana del sidebar
 *    - panel desplegable con historial de notificaciones
 *
 * Soporta tipos: meta:message, flow:completed, flow:failed, payment:confirmed, agent:error, system:info
 */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocketEvent } from '../hooks/useSocket';
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  MessageCircle, X, Send, Instagram, Bell, ExternalLink, Trash2, CheckCheck,
  Zap, CreditCard, AlertTriangle, Info, CheckCircle, XCircle
} from 'lucide-react';
import { api } from '../api/client';

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_TYPES = {
  // Meta platforms
  'meta:message': { label: 'Mensaje', Icon: MessageCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', route: '/chat' },
  
  // Flows
  'flow:completed': { label: 'Flujo completado', Icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', route: '/flows' },
  'flow:failed': { label: 'Flujo falló', Icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', route: '/flows' },
  
  // Payments
  'payment:confirmed': { label: 'Pago confirmado', Icon: CreditCard, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)', route: '/tables' },
  
  // Errors
  'agent:error': { label: 'Error de agente', Icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', route: '/chat' },
  
  // System
  'system:info': { label: 'Sistema', Icon: Info, color: '#64748b', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', route: null },
};

// Legacy platform mapping for meta:message
const PLATFORM = {
  messenger: { label: 'Messenger', Icon: MessageCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  whatsapp:  { label: 'WhatsApp',  Icon: Send,          color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  instagram: { label: 'Instagram', Icon: Instagram,     color: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)' },
};

// Helper to get display config for a notification
function getNotifConfig(notif) {
  // For meta messages, use platform-specific styling
  if (notif.type === 'meta:message' && notif.platform && PLATFORM[notif.platform]) {
    return { ...PLATFORM[notif.platform], route: '/chat' };
  }
  // Otherwise use the type config
  return NOTIF_TYPES[notif.type] || NOTIF_TYPES['system:info'];
}

// ─── Notification Store Context ───────────────────────────────────────────────
const NotifCtx = createContext(null);
export function useNotificationStore() { return useContext(NotifCtx); }

export function NotificationProvider({ children }) {
  const { selectedWorkspace } = useWorkspace();
  const [history, setHistory] = useState([]);   // persistent history
  const [toasts, setToasts]   = useState([]);   // ephemeral banners
  const [loading, setLoading] = useState(false);
  const unreadCount = history.filter(n => !n.read).length;

  // Load notifications from API on mount/workspace change
  useEffect(() => {
    if (!selectedWorkspace?.id) return;
    
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/workspaces/${selectedWorkspace.id}/notifications?limit=50`);
        if (res.data?.notifications) {
          setHistory(res.data.notifications.map(n => ({
            id: n._id,
            type: n.type,
            title: n.title,
            message: n.message,
            data: n.data,
            platform: n.data?.platform,
            senderName: n.data?.senderName,
            text: n.data?.text || n.message,
            ts: new Date(n.createdAt).getTime(),
            read: n.read,
          })));
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadNotifications();
  }, [selectedWorkspace?.id]);

  const push = useCallback((data) => {
    const id = data.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notif = {
      id,
      type: data.type || 'meta:message',
      title: data.title,
      message: data.message,
      text: data.text || data.message,
      senderName: data.senderName || data.data?.senderName,
      platform: data.platform || data.data?.platform,
      data: data.data || data,
      ts: Date.now(),
      read: false,
    };
    setHistory(prev => [notif, ...prev].slice(0, 50));
    setToasts(prev  => [notif, ...prev].slice(0, 3));
  }, []);

  const markAllRead = useCallback(async () => {
    setHistory(prev => prev.map(n => ({ ...n, read: true })));
    if (selectedWorkspace?.id) {
      try {
        await api.post(`/workspaces/${selectedWorkspace.id}/notifications/read-all`);
      } catch (err) {
        console.error('Failed to mark all read:', err);
      }
    }
  }, [selectedWorkspace?.id]);

  const clearAll = useCallback(async () => {
    setHistory([]);
    setToasts([]);
    if (selectedWorkspace?.id) {
      try {
        await api.post(`/workspaces/${selectedWorkspace.id}/notifications/dismiss-all`);
      } catch (err) {
        console.error('Failed to dismiss all:', err);
      }
    }
  }, [selectedWorkspace?.id]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markRead = useCallback(async (id) => {
    setHistory(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (selectedWorkspace?.id) {
      try {
        await api.post(`/workspaces/${selectedWorkspace.id}/notifications/${id}/read`);
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  }, [selectedWorkspace?.id]);

  return (
    <NotifCtx.Provider value={{ history, toasts, unreadCount, loading, push, markAllRead, clearAll, dismissToast, markRead }}>
      {children}
    </NotifCtx.Provider>
  );
}

// ─── Floating Toast Banner (top-right) ────────────────────────────────────────
export default function MetaNotificationBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useNotificationStore();

  // Subscribe to notification:new socket events
  useSocketEvent('notification:new', useCallback((data) => {
    if (!data?.notification) return;
    const notif = data.notification;
    store?.push(notif);
    // Try playing notification sound
    try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
  }, [store]));

  // Also listen for legacy meta:message events
  useSocketEvent('meta:message', useCallback((data) => {
    if (!data) return;
    store?.push({ ...data, type: 'meta:message' });
    try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
  }, [store]));

  // Auto-dismiss toasts after 6s
  useEffect(() => {
    if (!store?.toasts?.length) return;
    const timer = setTimeout(() => {
      const oldest = store.toasts[store.toasts.length - 1];
      if (oldest) store.dismissToast(oldest.id);
    }, 6000);
    return () => clearTimeout(timer);
  }, [store?.toasts]);

  const handleClick = (notif) => {
    store.dismissToast(notif.id);
    store.markRead(notif.id);
    const cfg = getNotifConfig(notif);
    if (cfg.route && location.pathname !== cfg.route) {
      navigate(cfg.route);
    }
  };

  if (!store?.toasts?.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[380px] notification-stack">
      {store.toasts.map((notif, i) => {
        const cfg = getNotifConfig(notif);
        const Icon = cfg.Icon;
        return (
          <div
            key={notif.id}
            onClick={() => handleClick(notif)}
            className="notification-toast cursor-pointer"
            style={{
              animation: `notif-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              animationDelay: `${i * 60}ms`,
              opacity: 0,
            }}
          >
            <div className="relative flex items-start gap-3 p-4 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(12,12,20,0.97), rgba(18,18,30,0.97))',
                border: `1px solid ${cfg.border}`,
                backdropFilter: 'blur(24px)',
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${cfg.bg}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {/* Accent line top */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

              {/* Pulsing ring + icon */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: cfg.color }} />
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white truncate max-w-[160px]">
                      {notif.title || notif.senderName || cfg.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums shrink-0">ahora</span>
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-2">
                  {notif.text || notif.message || 'Nueva notificación'}
                </p>
                {cfg.route && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-medium" style={{ color: cfg.color }}>
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver detalles</span>
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); store.dismissToast(notif.id); }}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-white/10 text-slate-600 hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Notifications Panel (sidebar dropdown) ──────────────────────────────────
export function NotificationsPanel({ isOpen, onClose, position = 'sidebar' }) {
  const store = useNotificationStore();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoTo = (notif) => {
    store.markRead(notif.id);
    const cfg = getNotifConfig(notif);
    if (cfg.route) {
      navigate(cfg.route);
    }
    onClose();
  };

  const formatTime = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // Posicionamiento según variante - fixed para header, absolute para sidebar
  const isHeader = position === 'header';

  return (
    <div
      ref={panelRef}
      className={`${isHeader ? 'fixed' : 'absolute bottom-full left-0 mb-2'} w-[360px] max-h-[520px] rounded-2xl overflow-hidden`}
      style={{
        ...(isHeader && { top: '60px', right: '16px' }),
        zIndex: 9999,
        background: 'linear-gradient(180deg, rgba(18,18,28,0.98), rgba(12,12,20,0.99))',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'notif-panel-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Header con degradado */}
      <div className="relative px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-indigo-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20">
              <Bell className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-white">Notificaciones</span>
              {store.unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/25">
                  {store.unreadCount} nueva{store.unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {store.history.length > 0 && (
              <>
                <button onClick={store.markAllRead} className="p-2 rounded-xl hover:bg-white/8 text-slate-500 hover:text-violet-400 transition-all" title="Marcar todo leído">
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button onClick={store.clearAll} className="p-2 rounded-xl hover:bg-white/8 text-slate-500 hover:text-red-400 transition-all" title="Limpiar todo">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body con scroll suave */}
      <div className="overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {store.loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
            <span className="text-sm text-slate-500">Cargando notificaciones...</span>
          </div>
        ) : store.history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 mb-4">
              <Bell className="w-7 h-7 text-slate-600" />
            </div>
            <span className="text-[13px] text-slate-400 font-medium">Sin notificaciones</span>
            <span className="text-[11px] text-slate-600 mt-1">Las notificaciones aparecerán aquí</span>
          </div>
        ) : (
          <div className="py-1.5">
            {store.history.map((notif, idx) => {
              const cfg = getNotifConfig(notif);
              const Icon = cfg.Icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleGoTo(notif)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-white/[0.04] group"
                  style={{
                    background: notif.read ? 'transparent' : 'rgba(139, 92, 246, 0.03)',
                    borderLeft: notif.read ? '3px solid transparent' : `3px solid ${cfg.color}`,
                    animation: `notif-item-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${idx * 40}ms`,
                    opacity: 0,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" 
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Icon className="w-[18px] h-[18px]" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[12px] font-semibold truncate ${notif.read ? 'text-slate-400' : 'text-white'}`}>
                        {notif.title || notif.senderName || cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-600 shrink-0 ml-2 tabular-nums">{formatTime(notif.ts)}</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${notif.read ? 'text-slate-600' : 'text-slate-400'}`}>
                      {notif.text || notif.message || 'Notificación recibida'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" 
                        style={{ 
                          background: notif.read ? 'rgba(255,255,255,0.03)' : cfg.bg, 
                          color: notif.read ? 'rgba(148,163,184,0.5)' : cfg.color,
                          border: `1px solid ${notif.read ? 'rgba(255,255,255,0.05)' : cfg.border}`
                        }}>
                        {cfg.label}
                      </span>
                      {cfg.route && !notif.read && (
                        <span className="text-[10px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Ver
                        </span>
                      )}
                    </div>
                  </div>
                  {!notif.read && (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" 
                      style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}dd)`, boxShadow: `0 0 12px ${cfg.color}80` }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes notif-panel-in {
          from { opacity: 0; transform: translateY(${position === 'header' ? '-8px' : '8px'}) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notif-item-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Bell Button for Sidebar ──────────────────────────────────────────────────
export function NotificationBell({ collapsed, variant = 'sidebar' }) {
  const store = useNotificationStore();
  const [panelOpen, setPanelOpen] = useState(false);

  // Variante header - más compacta y visible
  if (variant === 'header') {
    return (
      <div className="relative">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="relative p-2 rounded-xl transition-all hover:bg-white/10"
          style={{
            background: store.unreadCount > 0 ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
          }}
        >
          <Bell className={`w-[18px] h-[18px] ${store.unreadCount > 0 ? 'text-violet-400' : 'text-slate-500'}`} strokeWidth={1.75} />
          {store.unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center text-[9px] font-bold text-white"
                style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                {store.unreadCount > 9 ? '9+' : store.unreadCount}
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-40" />
            </>
          )}
        </button>
        <NotificationsPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} position="header" />
      </div>
    );
  }

  // Variante sidebar original
  return (
    <div className="relative">
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className={`relative flex items-center gap-2.5 ${collapsed ? 'p-2 justify-center' : 'w-full px-2 py-1.5'} rounded-xl transition-all hover:bg-white/8`}
        style={{
          background: store.unreadCount > 0 ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
          border: `1px solid ${store.unreadCount > 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)'}`,
        }}
      >
        <div className="relative">
          <Bell className={`w-4 h-4 ${store.unreadCount > 0 ? 'text-violet-400' : 'text-slate-500'}`} />
          {store.unreadCount > 0 && (
            <>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center text-[8px] font-bold text-white"
                style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
                {store.unreadCount > 9 ? '9+' : store.unreadCount}
              </span>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-30" />
            </>
          )}
        </div>
        {!collapsed && (
          <span className={`text-[11px] font-medium ${store.unreadCount > 0 ? 'text-white' : 'text-slate-500'}`}>
            Notificaciones
          </span>
        )}
      </button>
      <NotificationsPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} position="sidebar" />
    </div>
  );
}
