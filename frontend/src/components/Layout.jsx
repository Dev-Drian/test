import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import WorkspaceSelector from "./WorkspaceSelector";
import HelpButton from "./HelpButton";
import SetupAssistantChat from "./SetupAssistantChat";
import MetaNotificationBanner, { NotificationBell } from "./MetaNotificationBanner";
import api from "../api/client";
import { 
  LayoutDashboard, FolderKanban, Bot, Database, Zap, MessageSquare, Settings,
  ChevronRight, ChevronDown, Calendar, Columns3, LayoutGrid, TableIcon,
  ShoppingCart, GanttChartSquare, LogOut, Check, Layers, Crown, Plug, 
  Sparkles, Workflow, PanelLeftClose, PanelLeft
} from "lucide-react";

// Logo premium con gradiente
const LogoIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path d="M16 4L6 9v14l10 5 10-5V9L16 4z" stroke="url(#logoGrad)" strokeWidth="2" fill="none"/>
    <path d="M16 12l-4 2v4l4 2 4-2v-4l-4-2z" fill="url(#logoGrad)" opacity="0.3"/>
    <circle cx="16" cy="16" r="3" fill="url(#logoGrad)"/>
  </svg>
);

// Mapeo de iconos para vistas
const viewIcons = {
  calendar: Calendar,
  kanban: Columns3,
  cards: LayoutGrid,
  table: TableIcon,
  floorplan: LayoutDashboard,
  pos: ShoppingCart,
  timeline: GanttChartSquare,
};

// Navegación simplificada - menos secciones, más intuitivo
const navSections = [
  {
    title: null, // Sin título para la sección principal
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, tourId: "nav-home" },
      { to: "/workspaces", label: "Proyectos", icon: FolderKanban, tourId: "nav-workspaces" },
    ]
  },
  {
    title: "Herramientas",
    items: [
      { to: "/agents", label: "Asistente IA", icon: Sparkles, tourId: "nav-agents" },
      { to: "/tables", label: "Datos", icon: Database, tourId: "nav-tables" },
      { to: "/views", label: "Vistas", icon: Layers, tourId: "nav-views" },
      { to: "/chat", label: "Conversaciones", icon: MessageSquare, tourId: "nav-chat" },
    ]
  },
  {
    title: "Automatización",
    items: [
      { to: "/flows", label: "Flujos", icon: Workflow, tourId: "nav-flows" },
      { to: "/integrations", label: "Integraciones", icon: Plug, tourId: "nav-integrations" },
    ]
  },
  {
    title: null,
    items: [
      { to: "/upgrade", label: "Mi Plan", icon: Crown, tourId: "nav-plan", highlight: true },
      { to: "/advanced", label: "Configuración", icon: Settings, tourId: "nav-advanced" },
      { to: "/admin", label: "Admin", icon: Settings, tourId: "nav-admin", adminOnly: true },
    ]
  }
];

// Flat list para compatibilidad
const navItems = navSections.flatMap(s => s.items);

export default function Layout() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [viewsExpanded, setViewsExpanded] = useState(false);
  const [workspaceViews, setWorkspaceViews] = useState([]);

  // Cargar vistas del workspace
  useEffect(() => {
    const loadViews = async () => {
      if (!workspaceId) {
        setWorkspaceViews([]);
        return;
      }
      try {
        const response = await api.get('/views', { params: { workspaceId } });
        setWorkspaceViews(response.data || []);
      } catch (error) {
        console.error('Error loading views:', error);
        setWorkspaceViews([]);
      }
    };
    loadViews();
  }, [workspaceId]);

  // Obtener ícono según tipo de vista
  const getViewIcon = (type) => {
    const IconComponent = viewIcons[type] || Layers;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  // Expandir automáticamente si estamos en la sección de vistas
  useEffect(() => {
    if (location.pathname.startsWith('/views')) {
      setViewsExpanded(true);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }} data-tour="welcome">
      {/* Sidebar - Diseño limpio y moderno */}
      <aside 
        data-tour="sidebar"
        className={`${collapsed ? 'w-[72px]' : 'w-[250px]'} flex flex-col h-full shrink-0 transition-all duration-300 ease-out`}
        style={{ 
          background: 'linear-gradient(180deg, rgba(15,15,25,0.95) 0%, rgba(10,10,18,0.98) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {/* Logo Header + Notificaciones */}
        <div className="h-14 px-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', overflow: 'visible' }}>
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.1) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <LogoIcon />
            </div>
            {!collapsed && (
              <span className="text-[15px] font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">FlowAI</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1" style={{ position: 'relative', overflow: 'visible' }}>
              {/* Notificaciones - Ahora visible en el header */}
              {workspaceId && <NotificationBell collapsed={false} variant="header" />}
              <button 
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg transition-all hover:bg-white/8 text-slate-500 hover:text-white"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          )}
          {collapsed && (
            <button 
              onClick={() => setCollapsed(false)}
              className="absolute right-0 translate-x-1/2 p-1 rounded-full bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-400 hover:text-white transition-all shadow-lg"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Workspace Selector */}
        {!collapsed && (
          <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }} data-tour="workspace-selector">
            <WorkspaceSelector />
          </div>
        )}

        {/* Navigation - diseño más limpio */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin">
          {navSections.map((section, sectionIdx) => (
            <div key={section.title || sectionIdx} className={sectionIdx > 0 ? 'mt-4' : ''}>
              {/* Section title */}
              {!collapsed && section.title && (
                <div className="px-3 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && sectionIdx > 0 && (
                <div className="mx-3 mb-2 border-t border-white/5" />
              )}
              
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, tourId, adminOnly, highlight }) => {
                  // Ocultar items de admin si no es admin
                  if (adminOnly && user?.role !== 'admin' && user?.role !== 'superadmin') {
                    return null;
                  }
                  
                  // Renderizado especial para Vistas con submenú
                  if (to === '/views') {
                    return (
                      <div key={to}>
                        <div className="flex items-center">
                          <Link
                            to={to}
                            data-tour={tourId}
                            className={`group relative flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2' : ''} ${
                              isActive(to) 
                                ? 'text-white bg-gradient-to-r from-violet-500/15 to-indigo-500/10 shadow-lg shadow-violet-500/5' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title={collapsed ? label : undefined}
                          >
                            <span className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 ${isActive(to) ? 'bg-violet-500/25 text-violet-300' : 'group-hover:bg-white/8'}`}>
                              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                            </span>
                            {!collapsed && <span>{label}</span>}
                            {isActive(to) && !collapsed && (
                              <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                            )}
                          </Link>
                          {!collapsed && workspaceViews.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setViewsExpanded(!viewsExpanded);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"
                            >
                              <span className={`transform transition-transform duration-200 block ${viewsExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          )}
                        </div>
                        
                        {!collapsed && viewsExpanded && workspaceViews.length > 0 && (
                          <div className="ml-5 mt-1 space-y-0.5 border-l border-white/8 pl-3">
                            {workspaceViews.map((view) => (
                              <Link
                                key={view.id}
                                to={`/views?selected=${view.id}`}
                                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 ${
                                  location.search.includes(`selected=${view.id}`)
                                    ? 'text-white bg-white/8'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className={`transition-colors ${location.search.includes(`selected=${view.id}`) ? 'text-violet-400' : ''}`}>
                                  {getViewIcon(view.type)}
                                </span>
                                <span className="truncate">{view.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={to}
                      to={to}
                      data-tour={tourId}
                      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2' : ''} ${
                        isActive(to) 
                          ? 'text-white bg-gradient-to-r from-violet-500/15 to-indigo-500/10 shadow-lg shadow-violet-500/5' 
                          : highlight 
                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={collapsed ? label : undefined}
                    >
                      <span className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 ${
                        isActive(to) ? 'bg-violet-500/25 text-violet-300' : 
                        highlight ? 'bg-amber-500/15 text-amber-400' : 'group-hover:bg-white/8'
                      }`}>
                        <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      </span>
                      {!collapsed && <span>{label}</span>}
                      {isActive(to) && !collapsed && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-lg shadow-violet-400/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - usuario y estado */}
        <div className="p-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              {/* Notificaciones en modo colapsado */}
              {workspaceId && <NotificationBell collapsed={true} variant="sidebar" />}
              {/* Avatar del usuario */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {/* Estado de conexión */}
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Workspace activo */}
              {workspaceId && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.15)'
                  }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500/80 to-teal-500/80">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">Proyecto activo</span>
                    <span className="block text-[11px] font-semibold text-white truncate">{workspaceName}</span>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                </div>
              )}

              {/* Usuario */}
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-white truncate">{user?.name || 'Usuario'}</span>
                  <span className="text-[9px] text-slate-500 truncate flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    {user?.plan === 'free' ? 'Gratuito' : 
                     user?.plan === 'starter' ? 'Inicial' :
                     user?.plan === 'premium' ? 'Premium' :
                     user?.plan === 'enterprise' ? 'Empresarial' : 'Plan'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area — min-h-0 para que páginas con h-full (Chat, tablas) calculen bien la altura */}
      <main className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Botón de ayuda flotante */}
      <HelpButton />
      
      {/* Chat de configuración asistida */}
      <SetupAssistantChat />

      {/* Notificaciones globales de mensajes Meta */}
      <MetaNotificationBanner />
    </div>
  );
}
