import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import WorkspaceSelector from "./WorkspaceSelector";
import HelpButton from "./HelpButton";
import SetupAssistantChat from "./SetupAssistantChat";
import api from "../api/client";
import { 
  Home, FolderKanban, Bot, Table2, Zap, MessageCircle, BookOpen, Link2, Settings,
  ChevronRight, ChevronDown, Calendar, Columns3, LayoutGrid, TableIcon, LayoutDashboard,
  ShoppingCart, GanttChartSquare, Menu, LogOut, Check, Layers, Sparkles, Crown
} from "lucide-react";

// Logo personalizado
const LogoIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
    <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

const navItems = [
  { to: "/", label: "Inicio", icon: Home, tourId: "nav-home" },
  { to: "/workspaces", label: "Proyectos", icon: FolderKanban, tourId: "nav-workspaces" },
  { to: "/agents", label: "Asistente IA", icon: Bot, tourId: "nav-agents" },
  { to: "/tables", label: "Mis datos", icon: Table2, tourId: "nav-tables" },
  { to: "/views", label: "Vistas", icon: Layers, tourId: "nav-views" },
  { to: "/flows", label: "Automatizar", icon: Zap, tourId: "nav-flows" },
  { to: "/chat", label: "Chat", icon: MessageCircle, tourId: "nav-chat" },
  { to: "/integrations", label: "Integraciones", icon: Link2, tourId: "nav-integrations" },
  { to: "/advanced", label: "Avanzado", icon: Sparkles, tourId: "nav-advanced" },
  { to: "/guia", label: "Ayuda", icon: BookOpen, tourId: "nav-guide" },
  { to: "/upgrade", label: "Mi Plan", icon: Crown, tourId: "nav-plan" },
  { to: "/admin", label: "Admin", icon: Settings, tourId: "nav-admin" },
];

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

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, tourId }) => {
              // Renderizado especial para Vistas con submenú
              if (to === '/views') {
                return (
                  <div key={to}>
                    {/* Item principal de Vistas */}
                    <div className="flex items-center">
                      <Link
                        to={to}
                        data-tour={tourId}
                        className={`group relative flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${collapsed ? 'justify-center px-2.5' : ''} ${
                          isActive(to) 
                            ? 'text-white' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={isActive(to) ? {
                          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
                          boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)'
                        } : {}}
                        title={collapsed ? label : undefined}
                      >
                        <span className={`transition-all duration-200 ${isActive(to) ? 'text-violet-400' : ''}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        {!collapsed && <span>{label}</span>}
                        {isActive(to) && (
                          <div 
                            className={`absolute ${collapsed ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full' : 'right-3 w-1.5 h-1.5 rounded-full'} bg-indigo-400`}
                          />
                        )}
                      </Link>
                      {/* Botón para expandir/colapsar submenú */}
                      {!collapsed && workspaceViews.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setViewsExpanded(!viewsExpanded);
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                        >
                          <span className={`transform transition-transform duration-200 block ${viewsExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronDown className="w-4 h-4" />
                          </span>
                        </button>
                      )}
                    </div>
                    
                    {/* Submenú de vistas individuales */}
                    {!collapsed && viewsExpanded && workspaceViews.length > 0 && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {workspaceViews.map((view) => (
                          <Link
                            key={view.id}
                            to={`/views?selected=${view.id}`}
                            className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 ${
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

              // Renderizado normal para otros items
              return (
                <Link
                  key={to}
                  to={to}
                  data-tour={tourId}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${collapsed ? 'justify-center px-2.5' : ''} ${
                    isActive(to) 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={isActive(to) ? {
                    background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)'
                  } : {}}
                  title={collapsed ? label : undefined}
                >
                  <span className={`transition-all duration-200 ${isActive(to) ? 'text-violet-400' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  {!collapsed && <span>{label}</span>}
                  {isActive(to) && (
                    <div 
                      className={`absolute ${collapsed ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full' : 'right-3 w-1.5 h-1.5 rounded-full'} bg-indigo-400`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer con workspace activo y usuario - Rediseñado */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {collapsed ? (
            <button 
              onClick={() => setCollapsed(false)}
              className="w-full p-2.5 rounded-xl transition-all flex items-center justify-center hover:bg-white/10 text-slate-500 hover:text-white"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="space-y-2">
              {workspaceId ? (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Activo
                    </span>
                    <span className="block text-sm font-semibold text-white truncate mt-0.5">
                      {workspaceName}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5">
                    <div className="w-2 h-2 rounded-full animate-pulse bg-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Sin selección
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Selecciona un workspace
                    </span>
                  </div>
                </div>
              )}
              
              {/* Socket status — indicador sutil de tiempo real */}
              {workspaceId && (
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={`text-[10px] ${connected ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {connected ? 'En vivo' : 'Sin conexión'}
                  </span>
                </div>
              )}

              {/* Botón de mejorar plan para usuarios free */}
              {user?.plan === 'free' && (
                <Link
                  to="/upgrade"
                  className="flex items-center gap-2 mx-3 px-3 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Mejorar plan</span>
                </Link>
              )}

              {/* User info & logout - Rediseñado */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-white truncate">
                    {user?.name || 'Usuario'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 text-violet-400" />
                    {user?.plan === 'free' ? 'Plan Gratuito' : 
                     user?.plan === 'starter' ? 'Plan Inicial' :
                     user?.plan === 'premium' ? 'Plan Premium' :
                     user?.plan === 'enterprise' ? 'Plan Empresarial' : 'Plan'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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
    </div>
  );
}
