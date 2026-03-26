import { useState, lazy, Suspense } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  SparklesIcon,
  LinkIcon,
  Cog6ToothIcon,
  DevicePhoneMobileIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

// Lazy load de componentes
const WebhooksManager = lazy(() => import('../components/webhooks/WebhooksManager'));
const GlobalVariables = lazy(() => import('../components/settings/GlobalVariables'));
const MobileMonitorSetup = lazy(() => import('../components/mobile/MobileMonitorSetup'));
const FlowDoctor = lazy(() => import('../components/flows/FlowDoctor'));

/**
 * AdvancedFeatures - Página con todas las funcionalidades avanzadas
 */
export default function AdvancedFeatures() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [activeTab, setActiveTab] = useState('webhooks');
  
  const tabs = [
    { 
      id: 'webhooks', 
      name: 'Conexiones', 
      icon: LinkIcon,
      description: 'Conecta otras apps',
      hint: 'Crea URLs para que otras aplicaciones (formularios, tiendas, CRMs) activen tus flujos automáticamente.'
    },
    { 
      id: 'variables', 
      name: 'Configuración', 
      icon: Cog6ToothIcon,
      description: 'Datos del negocio',
      hint: 'Configura información global: horarios, precios, contacto, etc. Tu bot puede usar estos datos en sus respuestas.'
    },
    { 
      id: 'mobile', 
      name: 'App Móvil', 
      icon: DevicePhoneMobileIcon,
      description: 'Monitoreo celular',
      hint: 'Escanea un QR para conectar la app móvil y recibir notificaciones de conversaciones importantes en tiempo real.'
    },
    { 
      id: 'doctor', 
      name: 'Revisar Flujos', 
      icon: WrenchScrewdriverIcon,
      description: 'Diagnóstico de bots',
      hint: 'Analiza tus flujos buscando errores, caminos sin salida o configuraciones faltantes. Incluye sugerencias de mejora.'
    }
  ];
  
  if (!workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
            <SparklesIcon className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Selecciona un workspace
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed">
            Para acceder a las funcionalidades avanzadas, primero selecciona un workspace desde el menú lateral.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-sm text-zinc-500">
              Las funcionalidades avanzadas incluyen Analytics, AI Builder, Templates, y más.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const renderContent = () => {
    switch (activeTab) {
      case 'webhooks':
        return <WebhooksManager workspaceId={workspaceId} />;
      case 'variables':
        return <GlobalVariables workspaceId={workspaceId} />;
      case 'mobile':
        return <MobileMonitorSetup workspaceId={workspaceId} />;
      case 'doctor':
        return <FlowDoctor workspaceId={workspaceId} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex h-full">
      {/* Sidebar de tabs mejorado */}
      <div className="w-72 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto">
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-5 h-5 text-violet-400" />
            <h1 className="font-bold text-white">Avanzado</h1>
          </div>
          <p className="text-xs text-zinc-500">{workspaceName}</p>
        </div>
        
        <nav className="p-3 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all group ${
                  isActive 
                    ? 'bg-violet-500/20 border border-violet-500/30' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-violet-500/20' : 'bg-zinc-800/50 group-hover:bg-zinc-700/50'}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${isActive ? 'text-violet-400' : 'text-zinc-300'}`}>
                    {tab.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {tab.description}
                  </div>
                  {isActive && (
                    <div className="text-[11px] text-zinc-400 mt-2 leading-relaxed bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/30">
                      {tab.hint}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
        
        {/* Footer con ayuda */}
        <div className="p-4 border-t border-zinc-800/50 mt-auto">
          <div className="text-[10px] text-zinc-600 text-center">
            Haz clic en cada sección para ver qué hace
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        }>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
}
