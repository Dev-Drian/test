import { useState, useEffect } from 'react';
import {
  DevicePhoneMobileIcon,
  BellIcon,
  KeyIcon,
  ClipboardIcon,
  CheckIcon,
  QrCodeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import api from '../../api/client';

/**
 * MobileMonitorSetup - Configuración de API para monitor móvil
 */
export default function MobileMonitorSetup({ workspaceId }) {
  const [apiKey, setApiKey] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Cargar API key existente
  useEffect(() => {
    loadApiKey();
    loadStats();
  }, [workspaceId]);
  
  const loadApiKey = async () => {
    try {
      const response = await api.get(`/mobile/${workspaceId}/api-key`);
      if (response.data.success && response.data.apiKey) {
        setApiKey(response.data.apiKey);
        generateEndpoints(response.data.apiKey);
      }
    } catch (err) {
      // No key exists
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    try {
      const response = await api.get(`/analytics/${workspaceId}/realtime`);
      if (response.data.success) {
        setStats(response.data.metrics);
      }
    } catch {}
  };
  
  // Generar API key
  const generateApiKey = async () => {
    try {
      const response = await api.post(`/mobile/${workspaceId}/api-key`);
      if (response.data.success) {
        setApiKey(response.data.apiKey);
        generateEndpoints(response.data.apiKey);
      }
    } catch (err) {
      console.error('Error generating API key:', err);
    }
  };
  
  // Revocar API key
  const revokeApiKey = async () => {
    if (!confirm('¿Revocar la API key actual? Esto desconectará todos los dispositivos móviles.')) return;
    
    try {
      await api.delete(`/mobile/${workspaceId}/api-key`);
      setApiKey(null);
      setEndpoints([]);
    } catch (err) {
      console.error('Error revoking API key:', err);
    }
  };
  
  // Generar lista de endpoints
  const generateEndpoints = (key) => {
    const baseUrl = `${window.location.origin}/api/mobile`;
    
    setEndpoints([
      {
        name: 'Dashboard Stats',
        method: 'GET',
        url: `${baseUrl}/${workspaceId}/stats`,
        description: 'Estadísticas en tiempo real del workspace'
      },
      {
        name: 'Lista de Chats',
        method: 'GET',
        url: `${baseUrl}/${workspaceId}/chats`,
        description: 'Conversaciones activas y recientes'
      },
      {
        name: 'Mensajes de Chat',
        method: 'GET',
        url: `${baseUrl}/${workspaceId}/chats/:chatId/messages`,
        description: 'Historial de mensajes de un chat'
      },
      {
        name: 'Enviar Respuesta',
        method: 'POST',
        url: `${baseUrl}/${workspaceId}/chats/:chatId/reply`,
        description: 'Enviar mensaje como operador'
      },
      {
        name: 'Notificaciones',
        method: 'GET',
        url: `${baseUrl}/${workspaceId}/notifications`,
        description: 'Alertas y notificaciones pendientes'
      },
      {
        name: 'Marcar como leído',
        method: 'POST',
        url: `${baseUrl}/${workspaceId}/notifications/:id/read`,
        description: 'Marcar notificación como leída'
      },
      {
        name: 'Estado de Flujos',
        method: 'GET',
        url: `${baseUrl}/${workspaceId}/flows/status`,
        description: 'Estado de todos los flujos'
      }
    ]);
  };
  
  // Copiar al portapapeles
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  
  // Generar código QR
  const qrData = apiKey ? JSON.stringify({
    workspace: workspaceId,
    apiKey: apiKey,
    endpoint: `${window.location.origin}/api/mobile`
  }) : '';
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
            <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Monitor Móvil</h2>
            <p className="text-sm text-zinc-400">
              API REST para aplicaciones móviles
            </p>
          </div>
        </div>
        
        {apiKey && (
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
          >
            <QrCodeIcon className="w-5 h-5" />
            Mostrar QR
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : (
        <>
          {/* Stats Preview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={ChatBubbleLeftRightIcon}
                label="Chats activos"
                value={stats.activeChats || 0}
              />
              <StatCard
                icon={BellIcon}
                label="Pendientes"
                value={stats.pendingChats || 0}
              />
              <StatCard
                icon={ChartBarIcon}
                label="Mensajes hoy"
                value={stats.messagesToday || 0}
              />
              <StatCard
                icon={ArrowPathIcon}
                label="Resueltos"
                value={stats.resolvedToday || 0}
              />
            </div>
          )}
          
          {/* API Key Section */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyIcon className="w-5 h-5 text-zinc-500" />
              <h3 className="font-semibold text-white">API Key</h3>
            </div>
            
            {apiKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-300 truncate">
                    {apiKey}
                  </div>
                  <button
                    onClick={() => copyToClipboard(apiKey, 'api-key')}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {copied === 'api-key' ? (
                      <CheckIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <ClipboardIcon className="w-5 h-5 text-zinc-400" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">
                    Usa esta key en el header: <code className="bg-zinc-800 px-1 rounded">X-API-Key</code>
                  </span>
                  <button
                    onClick={revokeApiKey}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Revocar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <KeyIcon className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-400 mb-4">
                  Genera una API key para conectar aplicaciones móviles
                </p>
                <button
                  onClick={generateApiKey}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
                >
                  Generar API Key
                </button>
              </div>
            )}
          </div>
          
          {/* Endpoints Documentation */}
          {apiKey && endpoints.length > 0 && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 overflow-hidden">
              <div className="p-4 border-b border-zinc-700">
                <h3 className="font-semibold text-white">Endpoints Disponibles</h3>
              </div>
              
              <div className="divide-y divide-zinc-700">
                {endpoints.map((endpoint, idx) => (
                  <div key={idx} className="p-4 hover:bg-zinc-800/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            endpoint.method === 'GET' 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-blue-900/50 text-blue-400'
                          }`}>
                            {endpoint.method}
                          </span>
                          <span className="font-medium text-white">
                            {endpoint.name}
                          </span>
                        </div>
                        <code className="text-sm text-zinc-400 break-all">
                          {endpoint.url}
                        </code>
                        <p className="text-sm text-zinc-500 mt-1">
                          {endpoint.description}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => copyToClipboard(endpoint.url, `endpoint-${idx}`)}
                        className="p-2 text-zinc-500 hover:text-zinc-300"
                      >
                        {copied === `endpoint-${idx}` ? (
                          <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ClipboardIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Sample Code */}
          {apiKey && (
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-4">Ejemplo de uso</h3>
              <pre className="text-gray-100 text-sm overflow-auto">
{`// React Native / JavaScript
const response = await fetch(
  '${window.location.origin}/api/mobile/${workspaceId}/stats',
  {
    headers: {
      'X-API-Key': '${apiKey?.slice(0, 20)}...',
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data.stats);`}
              </pre>
            </div>
          )}
        </>
      )}
      
      {/* QR Modal */}
      {showQR && apiKey && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 max-w-sm w-full text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Escanear con App</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* QR Code Placeholder - You'd use a QR library in production */}
            <div className="bg-zinc-800 rounded-xl p-4 mb-4">
              <div className="w-48 h-48 mx-auto bg-zinc-900 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-600">
                <QrCodeIcon className="w-24 h-24 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Usa una librería QR como qrcode.react
              </p>
            </div>
            
            <p className="text-sm text-zinc-400">
              Escanea este código QR con la aplicación móvil para configurar automáticamente la conexión.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de stat card
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-zinc-500" />
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  );
}
