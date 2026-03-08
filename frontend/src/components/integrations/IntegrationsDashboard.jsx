import { useState, useEffect, useCallback } from 'react';
import { 
  PuzzlePieceIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CogIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

// Componente de logo de integración (iniciales con color de marca)
function IntegrationLogo({ name, icon, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  // Si icon viene del backend, puede ser un emoji o un color hex
  const isHexColor = icon?.startsWith('#');
  const bgColor = isHexColor ? icon : '#6366F1'; // violet por defecto
  
  const initials = (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold text-white shadow-lg`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}

// Componente Toast interno
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
              Desconectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * IntegrationsDashboard - Dashboard de integraciones one-click (Dark Theme)
 */
export default function IntegrationsDashboard({ workspaceId }) {
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [connectingModal, setConnectingModal] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);
  
  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const [availableRes, categoriesRes, connectedRes] = await Promise.all([
          api.get('/integrations/available'),
          api.get('/integrations/categories'),
          api.get(`/integrations/${workspaceId}/connected`)
        ]);
        
        if (availableRes.data.success) {
          setAvailableIntegrations(availableRes.data.integrations);
        }
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.categories);
        }
        if (connectedRes.data.success) {
          setConnectedIntegrations(connectedRes.data.integrations);
        }
      } catch (err) {
        console.error('Error loading integrations:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [workspaceId]);
  
  // Filtrar integraciones disponibles
  const filteredIntegrations = availableIntegrations.filter(i => {
    const matchesSearch = !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
    
    // No mostrar las ya conectadas
    const notConnected = !connectedIntegrations.some(c => c.integrationId === i.id);
    
    return matchesSearch && matchesCategory && notConnected;
  });
  
  // Conectar integración
  const connectIntegration = async () => {
    if (!connectingModal) return;
    
    setConnecting(true);
    try {
      const response = await api.post(`/integrations/${workspaceId}/connect`, {
        integrationId: connectingModal.id,
        credentials
      });
      
      if (response.data.success) {
        setConnectedIntegrations([...connectedIntegrations, response.data.connection]);
        setConnectingModal(null);
        setCredentials({});
        setToast({ type: 'success', message: `${connectingModal.name} conectado exitosamente` });
      }
    } catch (err) {
      console.error('Error connecting:', err);
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al conectar' });
    } finally {
      setConnecting(false);
    }
  };
  
  // Desconectar integración
  const disconnectIntegration = async (connectionId) => {
    try {
      await api.delete(`/integrations/${workspaceId}/${connectionId}`);
      setConnectedIntegrations(connectedIntegrations.filter(c => c.id !== connectionId));
      setToast({ type: 'success', message: 'Integración desconectada' });
    } catch (err) {
      console.error('Error disconnecting:', err);
      setToast({ type: 'error', message: 'Error al desconectar' });
    }
    setConfirmDisconnect(null);
  };
  
  // Obtener detalles de integración disponible
  const getIntegrationDetails = (id) => {
    return availableIntegrations.find(i => i.id === id) || 
           connectedIntegrations.find(c => c.integrationId === id);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
            <PuzzlePieceIcon className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Integraciones</h2>
            <p className="text-sm text-zinc-400">
              Conecta con tus herramientas favoritas en un clic
            </p>
          </div>
        </div>
        
        <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-sm text-green-400 font-medium">
            {connectedIntegrations.length} conectadas
          </span>
        </div>
      </div>
      
      {/* Connected Integrations */}
      {connectedIntegrations.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Conectadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedIntegrations.map((conn) => (
              <div
                key={conn.id}
                className="bg-green-500/5 border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <IntegrationLogo name={conn.name} icon={conn.icon} size="md" />
                    <div>
                      <h4 className="font-medium text-green-400">{conn.name}</h4>
                      <span className="text-xs text-green-400/70 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Conectada
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setConfirmDisconnect(conn)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Desconectar"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{conn.category}</span>
                  <span>Usada {conn.usageCount || 0} veces</span>
                </div>
                
                {conn.lastUsedAt && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Último uso: {new Date(conn.lastUsedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Available Integrations */}
      <div>
        <h3 className="font-medium text-white mb-3">Disponibles</h3>
        
        {/* Filters */}
        <div className="flex gap-4 items-center mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar integraciones..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>
        
        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all cursor-pointer group"
                onClick={() => {
                  setConnectingModal(integration);
                  setCredentials({});
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <IntegrationLogo name={integration.name} icon={integration.icon} size="md" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white group-hover:text-violet-400 transition-colors">
                      {integration.name}
                    </h4>
                    <span className="text-xs text-zinc-500">{integration.category}</span>
                  </div>
                </div>
                
                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                  {integration.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{integration.actions} acciones</span>
                  {integration.triggers > 0 && (
                    <span>{integration.triggers} triggers</span>
                  )}
                </div>
                
                <button className="mt-3 w-full py-2 px-3 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <PlusIcon className="w-4 h-4" />
                  Conectar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Connect Modal */}
      {connectingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IntegrationLogo name={connectingModal.name} icon={connectingModal.icon} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Conectar {connectingModal.name}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {connectingModal.authType === 'api_key' ? 'Ingresa tu API Key' : 
                       connectingModal.authType === 'oauth2' ? 'Autoriza con tu cuenta' :
                       connectingModal.authType === 'webhook' ? 'Configura el webhook' :
                       'Configura la conexión'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setConnectingModal(null); setCredentials({}); }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-zinc-300 mb-4">
                {connectingModal.description}
              </p>
              
              {/* Auth Fields (basados en authType) */}
              {connectingModal.authType === 'api_key' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={credentials.apiKey || ''}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      placeholder="sk-xxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                  </div>
                  {/* Campos adicionales específicos de cada integración */}
                  {connectingModal.id === 'airtable' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Base ID
                      </label>
                      <input
                        type="text"
                        value={credentials.baseId || ''}
                        onChange={(e) => setCredentials({ ...credentials, baseId: e.target.value })}
                        placeholder="appXXXXXXXXXX"
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {connectingModal.authType === 'webhook' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={credentials.webhookUrl || ''}
                    onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                </div>
              )}
              
              {connectingModal.authType === 'oauth2' && (
                <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20 text-center">
                  <p className="text-sm text-violet-300 mb-3">
                    Serás redirigido a {connectingModal.name} para autorizar
                  </p>
                  <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors">
                    Autorizar con {connectingModal.name}
                  </button>
                </div>
              )}
              
              {/* Campos dinámicos del backend */}
              {connectingModal.fields && connectingModal.fields.map(field => (
                <div key={field.key} className="mt-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={credentials[field.key] || ''}
                    onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                    placeholder={field.placeholder || ''}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                  {field.help && <p className="text-xs text-zinc-500 mt-1">{field.help}</p>}
                </div>
              ))}
              
              {/* Acciones disponibles */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Acciones disponibles:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['createContact', 'sendMessage', 'getData', 'createRecord'].slice(0, 4).map((action, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConnectingModal(null);
                  setCredentials({});
                }}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={connectIntegration}
                disabled={connecting}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Conectar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Disconnect Modal */}
      {confirmDisconnect && (
        <ConfirmModal
          title="Desconectar integración"
          message={`¿Estás seguro de desconectar ${confirmDisconnect.name}? Las automatizaciones que usen esta integración dejarán de funcionar.`}
          onConfirm={() => disconnectIntegration(confirmDisconnect.id)}
          onCancel={() => setConfirmDisconnect(null)}
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
