/**
 * Integrations - Página unificada de todas las integraciones
 * 
 * Incluye Google, WhatsApp, Slack y 20+ servicios más
 */

import { useEffect, useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WorkspaceContext } from '../context/WorkspaceContext';
import GoogleIntegrationCard from '../components/integrations/GoogleIntegrationCard';
import TelegramBotManager from '../components/integrations/TelegramBotManager';
import { useGoogleIntegration } from '../hooks/useGoogleIntegration';
import { Toast } from '../components/Toast';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import api from '../api/client';

// Catálogo completo de integraciones disponibles
// brandColor: color de fondo para el logo
const ALL_INTEGRATIONS = [
  // CRM & Ventas
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', brandColor: '#FF7A59', description: 'Sincroniza contactos y leads con HubSpot CRM', actions: 4, triggers: 2 },
  { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', brandColor: '#25D366', description: 'Gestiona deals y contactos en Pipedrive', actions: 3, triggers: 3 },
  
  // Calendario & Citas
  { id: 'calendly', name: 'Calendly', category: 'Calendario', brandColor: '#006BFF', description: 'Agenda citas automáticamente con Calendly', actions: 3, triggers: 2 },
  { id: 'googleCalendar', name: 'Google Calendar', category: 'Calendario', brandColor: '#4285F4', description: 'Crea eventos y gestiona tu calendario', actions: 4, triggers: 2, native: true },
  
  // Productividad
  { id: 'notion', name: 'Notion', category: 'Productividad', brandColor: '#000000', description: 'Crea páginas y bases de datos en Notion', actions: 3, triggers: 2 },
  { id: 'googleSheets', name: 'Google Sheets', category: 'Productividad', brandColor: '#34A853', description: 'Lee y escribe datos en hojas de cálculo', actions: 4, triggers: 1, native: true },
  { id: 'airtable', name: 'Airtable', category: 'Productividad', brandColor: '#18BFFF', description: 'Gestiona bases de datos en Airtable', actions: 4, triggers: 2 },
  
  // Comunicación
  { id: 'slack', name: 'Slack', category: 'Comunicación', brandColor: '#4A154B', description: 'Envía mensajes y notificaciones a Slack', actions: 3, triggers: 2 },
  { id: 'discord', name: 'Discord', category: 'Comunicación', brandColor: '#5865F2', description: 'Envía mensajes a canales de Discord', actions: 2, triggers: 0 },
  { id: 'telegram', name: 'Telegram Bot', category: 'Comunicación', brandColor: '#0088CC', description: 'Integra un bot de Telegram', actions: 3, triggers: 2 },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Comunicación', brandColor: '#25D366', description: 'Envía y recibe mensajes por WhatsApp', actions: 3, triggers: 2, comingSoon: true },
  
  // Pagos
  { id: 'stripe', name: 'Stripe', category: 'Pagos', brandColor: '#635BFF', description: 'Procesa pagos con Stripe', actions: 4, triggers: 3 },
  { id: 'paypal', name: 'PayPal', category: 'Pagos', brandColor: '#003087', description: 'Recibe pagos con PayPal', actions: 3, triggers: 2 },
  
  // Email Marketing
  { id: 'mailchimp', name: 'Mailchimp', category: 'Marketing', brandColor: '#FFE01B', description: 'Gestiona listas y campañas de email', actions: 4, triggers: 2 },
  { id: 'sendgrid', name: 'SendGrid', category: 'Marketing', brandColor: '#1A82E2', description: 'Envía emails transaccionales', actions: 3, triggers: 3 },
  
  // Social Media
  { id: 'twitter', name: 'Twitter/X', category: 'Social', brandColor: '#000000', description: 'Publica tweets y monitorea menciones', actions: 3, triggers: 2 },
  { id: 'instagram', name: 'Instagram', category: 'Social', brandColor: '#E4405F', description: 'Gestiona mensajes de Instagram', actions: 3, triggers: 2 },
  
  // Ecommerce
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', brandColor: '#96BF48', description: 'Conecta tu tienda Shopify', actions: 4, triggers: 3 },
  { id: 'woocommerce', name: 'WooCommerce', category: 'E-commerce', brandColor: '#96588A', description: 'Integra tu tienda WooCommerce', actions: 4, triggers: 2 },
  
  // Automatización
  { id: 'zapier', name: 'Zapier', category: 'Automatización', brandColor: '#FF4A00', description: 'Conecta con miles de apps via Zapier', actions: 1, triggers: 1 },
  { id: 'make', name: 'Make (Integromat)', category: 'Automatización', brandColor: '#6D00CC', description: 'Conecta con Make scenarios', actions: 1, triggers: 1 },
];

// Mapeo de IDs a nombres de iconos en Simple Icons
const ICON_SLUGS = {
  hubspot: 'hubspot',
  pipedrive: 'pipedrive',
  calendly: 'calendly',
  googleCalendar: 'googlecalendar',
  notion: 'notion',
  googleSheets: 'googlesheets',
  airtable: 'airtable',
  slack: 'slack',
  discord: 'discord',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
  stripe: 'stripe',
  paypal: 'paypal',
  mailchimp: 'mailchimp',
  sendgrid: 'sendgrid',
  twitter: 'x',
  instagram: 'instagram',
  shopify: 'shopify',
  woocommerce: 'woocommerce',
  zapier: 'zapier',
  make: 'integromat',
};

// Componente de logo de integración (con logos reales)
function IntegrationLogo({ integration, size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  const imgSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const initials = integration.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const iconSlug = ICON_SLUGS[integration.id];
  
  // Determinar color del icono (blanco para fondos oscuros, negro para fondos claros como amarillo)
  const lightBgColors = ['#FFE01B', '#96BF48']; // Amarillo de Mailchimp, verde lima de Shopify
  const iconColor = lightBgColors.includes(integration.brandColor) ? 'black' : 'white';
  
  const logoUrl = iconSlug ? `https://cdn.simpleicons.org/${iconSlug}/${iconColor}` : null;
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold text-white shadow-lg`}
      style={{ backgroundColor: integration.brandColor }}
    >
      {logoUrl && !imgError ? (
        <img 
          src={logoUrl}
          alt={integration.name}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

const CATEGORIES = ['Todos', 'CRM', 'Calendario', 'Productividad', 'Comunicación', 'Pagos', 'Marketing', 'Social', 'E-commerce', 'Automatización'];

export default function Integrations() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [connectModal, setConnectModal] = useState(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [managingIntegration, setManagingIntegration] = useState(null); // 'telegram', etc.
  
  // Hook de Google
  const { status: googleStatus } = useGoogleIntegration();

  // Detectar parámetros de callback de OAuth
  useEffect(() => {
    const googleStatus = searchParams.get('google');
    const error = searchParams.get('error');

    if (googleStatus === 'connected') {
      setToast({ type: 'success', message: '¡Google conectado exitosamente!' });
      searchParams.delete('google');
      setSearchParams(searchParams);
    } else if (error) {
      setToast({ type: 'error', message: `Error: ${decodeURIComponent(error)}` });
      searchParams.delete('error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Cargar integraciones conectadas
  useEffect(() => {
    if (workspaceId) {
      loadConnectedIntegrations();
    }
  }, [workspaceId]);

  const loadConnectedIntegrations = async () => {
    try {
      const response = await api.get(`/integrations/${workspaceId}/connected`);
      if (response.data.success) {
        setConnectedIntegrations(response.data.integrations || []);
      }
    } catch (err) {
      console.error('Error loading connected integrations:', err);
    }
  };

  // Filtrar integraciones (excluir las nativas de Google, ya se muestran arriba)
  const filteredIntegrations = ALL_INTEGRATIONS.filter(i => {
    // Excluir Google Calendar y Sheets ya que se gestionan desde la tarjeta principal
    if (i.native) return false;
    
    const matchesSearch = !search || 
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Verificar si está conectada (incluye Google)
  const isConnected = (id) => {
    // Las integraciones de Google se verifican via el hook
    if (id === 'googleCalendar' || id === 'googleSheets') {
      return googleStatus.connected;
    }
    return connectedIntegrations.some(c => c.integrationId === id);
  };
  
  // Contar integraciones conectadas (backend + Google si está conectada)
  const totalConnected = connectedIntegrations.length + (googleStatus.connected ? 1 : 0);

  // Conectar integración
  const handleConnect = async (integration) => {
    if (integration.comingSoon) {
      setToast({ type: 'info', message: `${integration.name} estará disponible próximamente` });
      return;
    }
    
    if (integration.native) {
      // Las integraciones nativas (Google) se manejan con OAuth
      setToast({ type: 'info', message: 'Usa la tarjeta de Google arriba para conectar' });
      return;
    }
    
    // Abrir modal de conexión específico según la integración
    setConnectModal(integration);
  };
  
  // Conectar bot de Telegram
  const handleConnectTelegram = async () => {
    if (!telegramToken.trim()) {
      setToast({ type: 'error', message: 'Ingresa el token del bot' });
      return;
    }
    
    setConnectingTelegram(true);
    try {
      const res = await api.post(`/integrations/${workspaceId}/telegram/connect`, {
        token: telegramToken.trim()
      });
      
      if (res.data.success) {
        setToast({ type: 'success', message: '¡Bot de Telegram conectado!' });
        setConnectModal(null);
        setTelegramToken('');
        loadConnectedIntegrations();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Error al conectar Telegram' });
    } finally {
      setConnectingTelegram(false);
    }
  };

  // Si está gestionando una integración específica, mostrar esa vista
  if (managingIntegration === 'telegram') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setManagingIntegration(null)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver a Integraciones
        </button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Configurar Telegram Bot</h1>
          <p className="text-zinc-400">
            Configura tu bot de Telegram para recibir y enviar mensajes
          </p>
        </div>
        
        <TelegramBotManager workspaceId={workspaceId} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
            <LinkIcon className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Integraciones</h1>
            <p className="text-zinc-400">
              Conecta con 20+ servicios para potenciar tus automatizaciones
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-green-400 font-semibold">{totalConnected}</span>
            <span className="text-zinc-400 ml-2 text-sm">Conectadas</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <span className="text-zinc-300 font-semibold">{ALL_INTEGRATIONS.filter(i => !i.native).length}</span>
            <span className="text-zinc-400 ml-2 text-sm">Disponibles</span>
          </div>
        </div>
      </div>

      {/* Google Integration Card (Destacada) */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Integración Principal
        </h2>
        <GoogleIntegrationCard />
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar integraciones..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/50 border border-zinc-700/50 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>
          
          {/* Categories */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* All Integrations Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          {selectedCategory === 'Todos' ? 'Todas las Integraciones' : selectedCategory}
          <span className="text-zinc-500 font-normal ml-2">({filteredIntegrations.length})</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIntegrations.map((integration) => {
            const connected = isConnected(integration.id);
            const comingSoon = integration.comingSoon;
            const canManage = connected && integration.id === 'telegram';
            
            return (
              <div
                key={integration.id}
                className={`p-4 rounded-xl border transition-all group cursor-pointer ${
                  connected 
                    ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50' 
                    : comingSoon
                      ? 'bg-zinc-900/30 border-zinc-800/50 opacity-60'
                      : 'bg-zinc-900/50 border-zinc-700/50 hover:border-violet-500/50 hover:bg-zinc-800/50'
                }`}
                onClick={() => {
                  if (canManage) {
                    setManagingIntegration('telegram');
                  } else if (!connected) {
                    handleConnect(integration);
                  }
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <IntegrationLogo integration={integration} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold truncate ${connected ? 'text-green-400' : 'text-white'}`}>
                        {integration.name}
                      </h3>
                      {connected && <CheckCircleIcon className="w-4 h-4 text-green-400 shrink-0" />}
                    </div>
                    <span className="text-xs text-zinc-500">{integration.category}</span>
                  </div>
                </div>
                
                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                  {integration.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-zinc-500">
                    <span>{integration.actions} acciones</span>
                    {integration.triggers > 0 && <span>{integration.triggers} triggers</span>}
                  </div>
                  
                  {comingSoon ? (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-500">
                      Próximamente
                    </span>
                  ) : connected ? (
                    canManage ? (
                      <button className="px-2 py-1 rounded-md text-xs font-medium bg-violet-500/20 text-violet-400 flex items-center gap-1">
                        <Cog6ToothIcon className="w-3 h-3" />
                        Gestionar
                      </button>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400">
                        Conectada
                      </span>
                    )
                  ) : (
                    <button className="px-2 py-1 rounded-md text-xs font-medium bg-violet-500/20 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <PlusIcon className="w-3 h-3" />
                      Conectar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info adicional */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20">
        <h4 className="text-sm font-semibold text-violet-400 mb-2 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          ¿Cómo usar las integraciones?
        </h4>
        <p className="text-sm text-zinc-300">
          Una vez conectado un servicio, podrás usarlo en tus flujos de automatización. 
          Por ejemplo, crear un evento en Google Calendar cuando se registre una nueva reserva, 
          enviar notificaciones a Slack, o exportar datos a Google Sheets automáticamente.
        </p>
      </div>

      {/* Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IntegrationLogo integration={connectModal} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Conectar {connectModal.name}
                    </h3>
                    <p className="text-sm text-zinc-400">{connectModal.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setConnectModal(null); setTelegramToken(''); }}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-zinc-300 mb-4">{connectModal.description}</p>
              
              {/* Formulario específico para Telegram */}
              {connectModal.id === 'telegram' ? (
                <>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                    <p className="text-sm text-blue-200/90 mb-2">
                      <strong>¿Cómo obtener el token?</strong>
                    </p>
                    <ol className="text-sm text-blue-200/80 list-decimal list-inside space-y-1">
                      <li>Abre Telegram y busca @BotFather</li>
                      <li>Envía el comando /newbot</li>
                      <li>Sigue las instrucciones para crear tu bot</li>
                      <li>Copia el token que te proporciona</li>
                    </ol>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Token del Bot
                    </label>
                    <input
                      type="text"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setConnectModal(null); setTelegramToken(''); }}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConnectTelegram}
                      disabled={connectingTelegram || !telegramToken.trim()}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium disabled:opacity-50"
                    >
                      {connectingTelegram ? 'Conectando...' : 'Conectar Bot'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200/90">
                      Esta integración requiere configuración adicional. 
                      Necesitarás proporcionar las credenciales de API.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConnectModal(null)}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setToast({ type: 'info', message: 'Configuración de API próximamente disponible' });
                        setConnectModal(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium"
                    >
                      Próximamente
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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
