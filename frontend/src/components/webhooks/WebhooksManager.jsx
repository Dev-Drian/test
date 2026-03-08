import { useState, useEffect, useCallback } from 'react';
import {
  LinkIcon,
  PlusIcon,
  TrashIcon,
  ClipboardIcon,
  CheckIcon,
  CodeBracketIcon,
  PlayIcon,
  ShieldCheckIcon,
  XMarkIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

// Tooltip de ayuda
function HelpTip({ text, children }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-flex items-center">
      {children}
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl text-xs text-zinc-300 leading-relaxed">
          {text}
          <div className="absolute top-full left-4 w-2 h-2 bg-zinc-800 border-r border-b border-zinc-600 transform rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}

// Toast interno
function Toast({ type, message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
  };

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl border ${styles[type]} flex items-center gap-3 shadow-lg z-50`}>
      {type === 'success' && <CheckCircleIcon className="w-5 h-5" />}
      {type === 'error' && <XCircleIcon className="w-5 h-5" />}
      {type === 'info' && <ExclamationTriangleIcon className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// Modal de confirmación
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/20">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-zinc-400 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WebhooksManager - Gestión visual de webhooks personalizados (Dark Theme)
 */
export default function WebhooksManager({ workspaceId }) {
  const [webhooks, setWebhooks] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [showCode, setShowCode] = useState(null);
  const [codeType, setCodeType] = useState('curl');
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    flowId: '',
    name: '',
    description: '',
    auth: { type: 'none' },
    ipWhitelist: ''
  });
  
  // Cargar webhooks y flows
  const loadData = useCallback(async () => {
    try {
      const [webhooksRes, flowsRes] = await Promise.all([
        api.get(`/webhooks/${workspaceId}/list`),
        api.get(`/flow/list?workspaceId=${workspaceId}`)
      ]);
      
      if (webhooksRes.data.success) {
        setWebhooks(webhooksRes.data.webhooks || []);
      }
      // flows endpoint returns array directly
      if (Array.isArray(flowsRes.data)) {
        setFlows(flowsRes.data);
      }
    } catch (err) {
      console.error('Error loading webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Crear webhook
  const createWebhook = async () => {
    if (!form.flowId || !form.name) return;
    
    try {
      const payload = {
        ...form,
        ipWhitelist: form.ipWhitelist 
          ? form.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean)
          : []
      };
      
      const response = await api.post(`/webhooks/${workspaceId}/create`, payload);
      
      if (response.data.success) {
        setWebhooks(prev => [...prev, response.data.webhook]);
        setShowCreate(false);
        setForm({ flowId: '', name: '', description: '', auth: { type: 'none' }, ipWhitelist: '' });
      }
    } catch (err) {
      console.error('Error creating webhook:', err);
    }
  };
  
  // Eliminar webhook
  const deleteWebhook = async (webhookId) => {
    try {
      await api.delete(`/webhooks/${workspaceId}/${webhookId}`);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      setSelectedWebhook(null);
      setToast({ type: 'success', message: 'Webhook eliminado' });
    } catch (err) {
      console.error('Error deleting webhook:', err);
      setToast({ type: 'error', message: 'Error al eliminar webhook' });
    }
    setConfirmDelete(null);
  };
  
  // Probar webhook
  const testWebhook = async (webhook) => {
    try {
      const response = await api.post(`/webhooks/${workspaceId}/${webhook._id}/test`);
      
      if (response.data.success) {
        setToast({ type: 'success', message: `Webhook ejecutado - Estado: ${response.data.result?.status || 'OK'}` });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Error al probar webhook: ' + (err.response?.data?.error || err.message) });
    }
  };
  
  // Obtener código de integración
  const getIntegrationCode = async (webhook, language) => {
    try {
      const response = await api.get(`/webhooks/${workspaceId}/${webhook._id}/code?language=${language}`);
      
      if (response.data.success) {
        return response.data.code;
      }
    } catch (err) {
      console.error('Error getting code:', err);
    }
    return null;
  };
  
  // Copiar URL
  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };
  
  return (
    <div className="space-y-5">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <LinkIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Webhooks</h2>
            <p className="text-sm text-zinc-400">
              URLs para activar flujos desde otras apps
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/25"
        >
          <PlusIcon className="w-5 h-5" />
          Crear Webhook
        </button>
      </div>

      {/* Tip colapsable - más compacto */}
      <details className="group bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <summary className="flex items-center gap-3 p-4 cursor-pointer text-sm">
          <LightBulbIcon className="w-5 h-5 text-blue-400" />
          <span className="text-zinc-300 font-medium">¿Qué es un Webhook? (clic para ver)</span>
          <span className="ml-auto text-zinc-500 text-xs group-open:hidden">Mostrar</span>
          <span className="ml-auto text-zinc-500 text-xs hidden group-open:inline">Ocultar</span>
        </summary>
        <div className="px-4 pb-4 pt-0 border-t border-zinc-700/50">
          <p className="text-sm text-zinc-400 mb-3 mt-3">
            Un webhook es una URL especial que otras apps pueden llamar para activar tus flujos automáticamente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
              <span className="text-amber-400 font-medium">Formulario web →</span>
              <span className="text-zinc-400 ml-1">Activa bot de bienvenida</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
              <span className="text-green-400 font-medium">Tienda online →</span>
              <span className="text-zinc-400 ml-1">Notifica pedido por WhatsApp</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 border border-zinc-700/30">
              <span className="text-violet-400 font-medium">Sistema citas →</span>
              <span className="text-zinc-400 ml-1">Envía recordatorios</span>
            </div>
          </div>
        </div>
      </details>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-10 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
          <GlobeAltIcon className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-medium text-white mb-1">Aún no tienes webhooks</h3>
          <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
            Crea uno para conectar otras apps con tus flujos.
          </p>
          
          {/* Pasos mini */}
          <div className="inline-flex items-center gap-4 text-xs text-zinc-500 mb-5">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
              Crear webhook
            </span>
            <span className="text-zinc-700">→</span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
              Copiar URL
            </span>
            <span className="text-zinc-700">→</span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
              Usar en tu app
            </span>
          </div>
          
          <div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              Crear mi primer webhook
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {webhooks.map(webhook => (
            <div
              key={webhook._id}
              className="bg-zinc-900/50 rounded-xl border border-zinc-700/50 p-4 hover:border-emerald-500/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${webhook.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                  <h3 className="font-semibold text-white">{webhook.name}</h3>
                </div>
                
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowCode(webhook)}
                    className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Ver código de integración - Copia este código en tu otra aplicación"
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => testWebhook(webhook)}
                    className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Probar webhook - Simula una llamada para verificar que funciona"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(webhook)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar webhook"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {webhook.description && (
                <p className="text-sm text-zinc-400 mb-3">{webhook.description}</p>
              )}
              
              {/* URL con mejor presentación */}
              <div className="bg-zinc-800/50 rounded-lg p-2.5 mb-3 border border-zinc-700/30">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">URL del Webhook</span>
                  <button
                    onClick={() => copyUrl(webhook.url, webhook._id)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    {copiedUrl === webhook._id ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <ClipboardIcon className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs text-zinc-300 block truncate font-mono">
                  {webhook.url}
                </code>
              </div>
              
              {/* Stats & Info mejorado */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  Ejecuta: <span className="text-zinc-300">{flows.find(f => f._id === webhook.flowId)?.name || 'N/A'}</span>
                </span>
                <div className="flex items-center gap-3">
                  {webhook.secretKey && (
                    <span className="flex items-center gap-1 text-amber-400" title="Webhook protegido con clave secreta">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="text-zinc-500">{webhook.stats?.totalCalls || 0} llamadas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create Modal mejorado */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-white">Crear nuevo Webhook</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Genera una URL única para activar un flujo</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-zinc-200 transition-colors p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  <HelpTip text="Un nombre descriptivo para identificar este webhook. Ej: 'Notificación de pedidos', 'Formulario contacto'">
                    <span>Nombre del webhook</span>
                  </HelpTip>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Formulario de contacto"
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              
              {/* Flujo */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  <HelpTip text="Este es el flujo que se ejecutará cada vez que alguien llame a la URL del webhook. Asegúrate de tener flujos creados primero.">
                    <span>¿Qué flujo quieres activar?</span>
                  </HelpTip>
                </label>
                <select
                  value={form.flowId}
                  onChange={(e) => setForm(prev => ({ ...prev, flowId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="" className="bg-zinc-800">Seleccionar flujo...</option>
                  {flows.map(flow => (
                    <option key={flow._id} value={flow._id} className="bg-zinc-800">{flow.name}</option>
                  ))}
                </select>
                {flows.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1.5">
                    No tienes flujos creados. Primero crea un flujo en la sección de Flujos.
                  </p>
                )}
              </div>
              
              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Descripción <span className="text-zinc-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Webhook para recibir datos del formulario de la web"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none resize-none"
                />
              </div>
              
              {/* Seguridad - colapsable */}
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors">
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Opciones de seguridad</span>
                  <span className="text-xs text-zinc-600 ml-auto">Opcional</span>
                </summary>
                
                <div className="mt-4 space-y-4 pl-6 border-l-2 border-zinc-800">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      <HelpTip text="Si activas autenticación, solo podrán llamar al webhook quienes tengan la clave secreta. Útil para mayor seguridad.">
                        <span>Autenticación</span>
                      </HelpTip>
                    </label>
                    <select
                      value={form.auth.type}
                      onChange={(e) => setForm(prev => ({ ...prev, auth: { type: e.target.value } }))}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none"
                    >
                      <option value="none" className="bg-zinc-800">Sin autenticación (cualquiera puede llamar)</option>
                      <option value="secret" className="bg-zinc-800">Secret key (se genera una clave)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      <HelpTip text="Lista de IPs que pueden llamar al webhook. Si lo dejas vacío, cualquier IP puede llamarlo.">
                        <span>Restringir por IPs</span>
                      </HelpTip>
                    </label>
                    <input
                      type="text"
                      value={form.ipWhitelist}
                      onChange={(e) => setForm(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                      placeholder="192.168.1.1, 10.0.0.1"
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Deja vacío para permitir cualquier IP</p>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createWebhook}
                disabled={!form.flowId || !form.name}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Crear webhook
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Code Modal */}
      {showCode && (
        <CodeModal
          webhook={showCode}
          onClose={() => setShowCode(null)}
          getCode={getIntegrationCode}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Eliminar webhook"
          message={`¿Estás seguro de eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteWebhook(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// Modal de código mejorado (Dark Theme)
function CodeModal({ webhook, onClose, getCode }) {
  const [language, setLanguage] = useState('curl');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    loadCode();
  }, [language]);
  
  const loadCode = async () => {
    setLoading(true);
    const result = await getCode(webhook, language);
    setCode(result || '// Error al obtener código');
    setLoading(false);
  };
  
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const languages = [
    { id: 'curl', name: 'cURL', desc: 'Para terminal/línea de comandos' },
    { id: 'javascript', name: 'JavaScript', desc: 'Para webs o Node.js' },
    { id: 'python', name: 'Python', desc: 'Para scripts o backends' },
    { id: 'php', name: 'PHP', desc: 'Para WordPress o sitios PHP' }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Código para integrar</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Copia este código en tu otra aplicación</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors p-1">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-auto">
          {/* Explicación */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-300">
              <strong>¿Cómo uso esto?</strong> Copia el código en el lenguaje que use tu aplicación. 
              Cuando tu app ejecute este código, automáticamente se activará el flujo <span className="text-white">"{webhook.name}"</span>.
            </p>
          </div>
          
          {/* Language tabs mejorados */}
          <div className="flex flex-wrap gap-2 mb-4">
            {languages.map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  language === lang.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent'
                }`}
                title={lang.desc}
              >
                {lang.name}
              </button>
            ))}
          </div>
          
          {/* Code block */}
          <div className="relative">
            <button
              onClick={copyCode}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors z-10"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  <span>Copiar código</span>
                </>
              )}
            </button>
            
            {loading ? (
              <div className="bg-zinc-950 rounded-lg p-4 h-64 flex items-center justify-center border border-zinc-800">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
              </div>
            ) : (
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 pt-12 overflow-auto text-sm border border-zinc-800 max-h-64">
                <code className="font-mono">{code}</code>
              </pre>
            )}
          </div>
          
          {/* Webhook info mejorada */}
          <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <h4 className="font-medium text-white mb-3 text-sm">Datos del Webhook</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-20 flex-shrink-0">URL:</span>
                <code className="text-emerald-400 text-xs break-all font-mono">{webhook.url}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 w-20">Método:</span>
                <span className="text-zinc-300 font-mono text-xs bg-zinc-700 px-2 py-0.5 rounded">{webhook.method || 'POST'}</span>
              </div>
              {webhook.secretKey && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 w-20">Auth:</span>
                  <span className="text-amber-400 text-xs">Requiere header X-Webhook-Secret</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
