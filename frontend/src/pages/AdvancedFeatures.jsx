import { useState, lazy, Suspense } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

// ═══════════════════════════════════════════════════════════════════════════════
// ICONOS PROFESIONALES SVG
// ═══════════════════════════════════════════════════════════════════════════════

const SparklesIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const LinkIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const CogIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BellIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const PhoneIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const WrenchIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const BoltIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
  </svg>
);

const ServerIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ChartBarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const FolderIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

// Lazy load de componentes
const WebhooksManager = lazy(() => import('../components/webhooks/WebhooksManager'));
const GlobalVariables = lazy(() => import('../components/settings/GlobalVariables'));
const MobileMonitorSetup = lazy(() => import('../components/mobile/MobileMonitorSetup'));
const FlowDoctor = lazy(() => import('../components/flows/FlowDoctor'));
const NotificationPreferences = lazy(() => import('../components/settings/NotificationPreferences'));

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE SECCIONES
// ═══════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { 
    id: 'webhooks', 
    name: 'Webhooks', 
    subtitle: 'Endpoints y conexiones',
    icon: LinkIcon,
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/10 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    features: ['URLs personalizadas', 'Autenticación segura', 'Logs en tiempo real'],
    description: 'Crea endpoints para recibir datos de otras aplicaciones y activar flujos automáticamente.'
  },
  { 
    id: 'variables', 
    name: 'Variables Globales', 
    subtitle: 'Datos del negocio',
    icon: CogIcon,
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-500/10 to-indigo-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    features: ['Horarios', 'Precios', 'Contacto'],
    description: 'Configura información que tu asistente puede usar en sus respuestas.'
  },
  { 
    id: 'notifications', 
    name: 'Notificaciones', 
    subtitle: 'Alertas y avisos',
    icon: BellIcon,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    features: ['Email', 'Push', 'Webhook'],
    description: 'Configura qué notificaciones quieres recibir y cómo.'
  },
  { 
    id: 'mobile', 
    name: 'App Móvil', 
    subtitle: 'Monitoreo en tiempo real',
    icon: PhoneIcon,
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-500/10 to-purple-500/10',
    borderColor: 'border-violet-500/30',
    textColor: 'text-violet-400',
    features: ['QR Code', 'Push notifications', 'Chat en vivo'],
    description: 'Conecta tu celular para recibir alertas y responder desde cualquier lugar.'
  },
  { 
    id: 'doctor', 
    name: 'Flow Doctor', 
    subtitle: 'Diagnóstico y optimización',
    icon: WrenchIcon,
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-500/10 to-pink-500/10',
    borderColor: 'border-rose-500/30',
    textColor: 'text-rose-400',
    features: ['Errores', 'Warnings', 'Sugerencias'],
    description: 'Analiza tus flujos buscando problemas y oportunidades de mejora.'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdvancedFeatures() {
  const { workspaceId, workspaceName } = useWorkspace();
  const [activeSection, setActiveSection] = useState('webhooks');
  
  const currentSection = SECTIONS.find(s => s.id === activeSection);
  
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
        <div className="text-center max-w-md animate-fade-up">
          <div className="relative mb-6 mx-auto w-fit">
            <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/30">
              <SparklesIcon className="w-10 h-10 text-violet-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Configuración Avanzada</h2>
          <p className="text-slate-400 mb-6">Selecciona un proyecto para acceder a las configuraciones avanzadas</p>
          <a href="/workspaces" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-all">
            Ir a Proyectos <ArrowRightIcon />
          </a>
        </div>
      </div>
    );
  }
  
  const renderContent = () => {
    switch (activeSection) {
      case 'webhooks':
        return <WebhooksManager workspaceId={workspaceId} />;
      case 'variables':
        return <GlobalVariables workspaceId={workspaceId} />;
      case 'notifications':
        return <NotificationPreferences />;
      case 'mobile':
        return <MobileMonitorSetup workspaceId={workspaceId} />;
      case 'doctor':
        return <FlowDoctor workspaceId={workspaceId} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex h-full" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
      
      {/* SIDEBAR PROFESIONAL */}
      <div className="w-80 flex flex-col border-r border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        
        {/* Header del sidebar */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 blur-lg opacity-40" />
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Avanzado</h1>
              <p className="text-xs text-slate-500 truncate max-w-[180px]">{workspaceName}</p>
            </div>
          </div>
        </div>
        
        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full group relative rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-white/5' : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Indicator activo */}
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b ${section.gradient}`} />
                )}
                
                <div className="flex items-center gap-3 p-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive 
                      ? `bg-gradient-to-br ${section.bgGradient} border ${section.borderColor}` 
                      : 'bg-white/5 border border-white/5 group-hover:border-white/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? section.textColor : 'text-slate-500 group-hover:text-slate-400'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium text-sm ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {section.name}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{section.subtitle}</div>
                  </div>
                  <ChevronRightIcon className={`w-4 h-4 transition-all ${isActive ? section.textColor : 'text-slate-700 group-hover:text-slate-600'}`} />
                </div>
                
                {/* Features preview cuando está activo */}
                {isActive && (
                  <div className="px-3 pb-3 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {section.features.map((feature, idx) => (
                        <span 
                          key={idx} 
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${section.borderColor} ${section.textColor} bg-gradient-to-r ${section.bgGradient}`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Footer del sidebar */}
        <div className="p-4 border-t border-white/5">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <span>Sistema protegido</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Todas las conexiones están encriptadas y los datos se procesan de forma segura.
            </p>
          </div>
        </div>
      </div>
      
      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header del contenido */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentSection && (
                <>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentSection.bgGradient} border ${currentSection.borderColor} flex items-center justify-center`}>
                    <currentSection.icon className={`w-6 h-6 ${currentSection.textColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{currentSection.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{currentSection.description}</p>
                  </div>
                </>
              )}
            </div>
            
            {/* Stats rápidos */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                <ServerIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400">Activo</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                </div>
                <span className="text-sm text-slate-400">Cargando...</span>
              </div>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fade-up 0.4s ease-out; }
      `}</style>
    </div>
  );
}
