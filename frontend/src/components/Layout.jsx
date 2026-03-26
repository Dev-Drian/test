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
  LayoutDashboard, FolderKanban, Bot, Database, Zap, MessageSquare, HelpCircle, Link2, Settings,
  ChevronRight, ChevronDown, Calendar, Columns3, LayoutGrid, TableIcon, Rocket,
  ShoppingCart, GanttChartSquare, Menu, LogOut, Check, Layers, Sparkles, Crown, Plug, Shield
} from "lucide-react";

// Logo profesional - cohete
const LogoIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
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

// Secciones de navegación con separadores
const navSections = [
  {
    title: "Principal",
    items: [
      { to: "/", label: "Inicio", icon: LayoutDashboard, tourId: "nav-home" },
      { to: "/workspaces", label: "Proyectos", icon: FolderKanban, tourId: "nav-workspaces" },
    ]
  },
  {
    title: "Gestión",
    items: [
      { to: "/agents", label: "Asistente IA", icon: Bot, tourId: "nav-agents" },
      { to: "/tables", label: "Mis datos", icon: Database, tourId: "nav-tables" },
      { to: "/views", label: "Vistas", icon: Layers, tourId: "nav-views" },
      { to: "/flows", label: "Automatizar", icon: Zap, tourId: "nav-flows" },
      { to: "/chat", label: "Chat", icon: MessageSquare, tourId: "nav-chat" },
    ]
  },
  {
    title: "Configuración",
    items: [
      { to: "/integrations", label: "Integraciones", icon: Plug, tourId: "nav-integrations" },
      { to: "/advanced", label: "Avanzado", icon: Shield, tourId: "nav-advanced" },
    ]
  },
  {
    title: "Cuenta",
    items: [
      { to: "/guia", label: "Ayuda", icon: HelpCircle, tourId: "nav-guide" },
      { to: "/upgrade", label: "Mi Plan", icon: Crown, tourId: "nav-plan" },
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
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }} data-tour="welcome">
      {/* Sidebar - Rediseñado con glassmorphism */}
      <aside 
        data-tour="sidebar"
        className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} flex flex-col transition-all duration-300 ease-out`}
        style={{ 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Logo Header */}
        <div className="h-16 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}>
              <LogoIcon />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white">FlowAI</span>
                <span className="text-[10px] font-medium text-slate-500">Automation Platform</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-slate-500 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workspace Selector */}
        {!collapsed && (
          <div className="px-3 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }} data-tour="workspace-selector">
            <WorkspaceSelector />
          </div>
        )}

        {/* Navigation - sin flex-1 para que el footer quede junto */}
        <nav className="py-3 px-3">
          {navSections.map((section, sectionIdx) => (
            <div key={section.title} className={sectionIdx > 0 ? 'mt-3' : ''}>
              {/* Section title */}
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && sectionIdx > 0 && (
                <div className="mx-2 mb-2 border-t border-white/5" />
              )}
              
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon, tourId, adminOnly }) => {
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
                            className={`group relative flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2' : ''} ${
                              isActive(to) 
                                ? 'text-white bg-gradient-to-r from-violet-500/20 to-indigo-500/10' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title={collapsed ? label : undefined}
                          >
                            <span className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-200 ${isActive(to) ? 'bg-violet-500/30 text-violet-300' : 'group-hover:bg-white/10'}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            {!collapsed && <span>{label}</span>}
                            {isActive(to) && !collapsed && (
                              <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400" />
                            )}
                          </Link>
                          {!collapsed && workspaceViews.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setViewsExpanded(!viewsExpanded);
                              }}
                              className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                            >
                              <span className={`transform transition-transform duration-200 block ${viewsExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          )}
                        </div>
                        
                        {!collapsed && viewsExpanded && workspaceViews.length > 0 && (
                          <div className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                            {workspaceViews.map((view) => (
                              <Link
                                key={view.id}
                                to={`/views?selected=${view.id}`}
                                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200 ${
                                  location.search.includes(`selected=${view.id}`)
                                    ? 'text-white bg-white/10'
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
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2' : ''} ${
                        isActive(to) 
                          ? 'text-white bg-gradient-to-r from-violet-500/20 to-indigo-500/10' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={collapsed ? label : undefined}
                    >
                      <span className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-200 ${isActive(to) ? 'bg-violet-500/30 text-violet-300' : 'group-hover:bg-white/10'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      {!collapsed && <span>{label}</span>}
                      {isActive(to) && !collapsed && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer con workspace activo y usuario */}
        <div className="p-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {collapsed ? (
            <button 
              onClick={() => setCollapsed(false)}
              className="w-full p-2 rounded-lg transition-all flex items-center justify-center hover:bg-white/10 text-slate-500 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-1.5">
              {workspaceId ? (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400">Activo</span>
                    <span className="block text-xs font-semibold text-white truncate">{workspaceName}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5">
                    <Layers className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] font-medium uppercase tracking-wider text-slate-500">Sin selección</span>
                    <span className="block text-[10px] text-slate-500">Selecciona un workspace</span>
                  </div>
                </div>
              )}
              
              {/* Notifications bell */}
              {workspaceId && <NotificationBell collapsed={collapsed} />}

              {/* Socket status — indicador sutil */}
              {workspaceId && (
                <div className="flex items-center gap-1 px-2">
                  <div className={`w-1 h-1 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={`text-[9px] ${connected ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {connected ? 'En vivo' : 'Sin conexión'}
                  </span>
                </div>
              )}

              {/* Usuario y cerrar sesión */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:bg-white/5"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-white truncate">{user?.name || 'Usuario'}</span>
                  <span className="text-[9px] text-slate-500 truncate flex items-center gap-0.5">
                    <Crown className="w-2 h-2 text-violet-400" />
                    {user?.plan === 'free' ? 'Gratuito' : 
                     user?.plan === 'starter' ? 'Inicial' :
                     user?.plan === 'premium' ? 'Premium' :
                     user?.plan === 'enterprise' ? 'Empresarial' : 'Plan'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1 rounded-md hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
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
