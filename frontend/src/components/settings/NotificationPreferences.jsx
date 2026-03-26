/**
 * NotificationPreferences — Configuración de preferencias de notificaciones
 */
import { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../api/client';
import { useToast } from '../Toast';
import { 
  Bell, MessageCircle, CheckCircle, XCircle, CreditCard, AlertTriangle, Info,
  Volume2, VolumeX, Mail, Smartphone, Loader2, Save
} from 'lucide-react';

const NOTIFICATION_TYPES = [
  { 
    id: 'meta:message', 
    label: 'Mensajes entrantes', 
    description: 'Cuando recibes un mensaje de WhatsApp, Messenger o Instagram',
    Icon: MessageCircle,
    color: '#3b82f6'
  },
  { 
    id: 'flow:completed', 
    label: 'Flujos completados', 
    description: 'Cuando un flujo automatizado se ejecuta correctamente',
    Icon: CheckCircle,
    color: '#10b981'
  },
  { 
    id: 'flow:failed', 
    label: 'Flujos fallidos', 
    description: 'Cuando un flujo automatizado falla o tiene errores',
    Icon: XCircle,
    color: '#ef4444'
  },
  { 
    id: 'payment:confirmed', 
    label: 'Pagos confirmados', 
    description: 'Cuando se confirma un pago de un cliente',
    Icon: CreditCard,
    color: '#8b5cf6'
  },
  { 
    id: 'agent:error', 
    label: 'Errores de agente', 
    description: 'Cuando el asistente IA encuentra un error',
    Icon: AlertTriangle,
    color: '#f59e0b'
  },
  { 
    id: 'system:info', 
    label: 'Información del sistema', 
    description: 'Actualizaciones y avisos del sistema',
    Icon: Info,
    color: '#64748b'
  },
];

const CHANNELS = [
  { id: 'inApp', label: 'En la app', description: 'Notificaciones dentro de la aplicación', Icon: Bell },
  { id: 'sound', label: 'Sonido', description: 'Reproducir sonido al recibir notificaciones', Icon: Volume2 },
  { id: 'email', label: 'Email', description: 'Recibir resumen por correo (próximamente)', Icon: Mail, disabled: true },
];

export default function NotificationPreferences() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    // Types
    'meta:message': true,
    'flow:completed': true,
    'flow:failed': true,
    'payment:confirmed': true,
    'agent:error': true,
    'system:info': true,
    // Channels
    inApp: true,
    sound: true,
    email: false,
  });

  useEffect(() => {
    if (!workspaceId) return;
    loadPreferences();
  }, [workspaceId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/preferences', { params: { workspaceId } });
      if (res.data) {
        setPreferences(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', { workspaceId, preferences });
      toast.success('Preferencias guardadas');
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (enabled) => {
    const newPrefs = { ...preferences };
    NOTIFICATION_TYPES.forEach(t => { newPrefs[t.id] = enabled; });
    setPreferences(newPrefs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  const allTypesEnabled = NOTIFICATION_TYPES.every(t => preferences[t.id]);
  const someTypesEnabled = NOTIFICATION_TYPES.some(t => preferences[t.id]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-400" />
            Preferencias de Notificaciones
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configura qué notificaciones quieres recibir y cómo
          </p>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{ 
            background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))',
            boxShadow: '0 4px 15px rgba(139,92,246,0.3)'
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </button>
      </div>

      {/* Channels Section */}
      <div className="p-6 rounded-2xl" style={{ background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-lg font-semibold text-white mb-4">Canales de notificación</h3>
        <div className="grid gap-3">
          {CHANNELS.map(channel => (
            <div
              key={channel.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${channel.disabled ? 'opacity-50' : 'cursor-pointer hover:bg-white/5'}`}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => !channel.disabled && togglePreference(channel.id)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: preferences[channel.id] ? 'rgba(139,92,246,0.2)' : 'rgba(100,116,139,0.2)' }}>
                <channel.Icon className="w-5 h-5" style={{ color: preferences[channel.id] ? '#a78bfa' : '#64748b' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{channel.label}</p>
                <p className="text-xs text-slate-500">{channel.description}</p>
              </div>
              {channel.disabled ? (
                <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-700 text-slate-400">
                  Próximamente
                </span>
              ) : (
                <div className={`relative w-11 h-6 rounded-full transition-colors ${preferences[channel.id] ? 'bg-violet-500' : 'bg-slate-600'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${preferences[channel.id] ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Types Section */}
      <div className="p-6 rounded-2xl" style={{ background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Tipos de notificación</h3>
          <button
            onClick={() => toggleAll(!allTypesEnabled)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: allTypesEnabled ? '#f87171' : '#34d399' }}
          >
            {allTypesEnabled ? 'Desactivar todas' : 'Activar todas'}
          </button>
        </div>
        
        <div className="grid gap-3">
          {NOTIFICATION_TYPES.map(notif => (
            <div
              key={notif.id}
              className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => togglePreference(notif.id)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: preferences[notif.id] ? `${notif.color}20` : 'rgba(100,116,139,0.2)',
                  border: `1px solid ${preferences[notif.id] ? `${notif.color}40` : 'rgba(100,116,139,0.3)'}`
                }}>
                <notif.Icon className="w-5 h-5" style={{ color: preferences[notif.id] ? notif.color : '#64748b' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{notif.label}</p>
                <p className="text-xs text-slate-500">{notif.description}</p>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${preferences[notif.id] ? 'bg-violet-500' : 'bg-slate-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${preferences[notif.id] ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-indigo-200">
            Las notificaciones aparecen en la campana del menú lateral y como banners flotantes cuando estás en otra sección.
          </p>
        </div>
      </div>
    </div>
  );
}
