import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import WorkspaceSelector from "./WorkspaceSelector";
import HelpButton from "./HelpButton";
import SetupAssistantChat from "./SetupAssistantChat";
import api from "../api/client";

// Iconos SVG minimalistas
const Icons = {
  logo: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  workspaces: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  agents: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  tables: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16M9 4v16" />
    </svg>
  ),
  flows: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  guide: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  views: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  viewCalendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  viewKanban: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  viewCards: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  viewTable: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125M10.875 18.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m0 3.75h7.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-7.5" />
    </svg>
  ),
  viewFloorplan: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
    </svg>
  ),
  viewPos: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  viewTimeline: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const navItems = [
  { to: "/", label: "Inicio", icon: Icons.home, tourId: "nav-home" },
  { to: "/workspaces", label: "Proyectos", icon: Icons.workspaces, tourId: "nav-workspaces" },
  { to: "/agents", label: "Asistente IA", icon: Icons.agents, tourId: "nav-agents" },
  { to: "/tables", label: "Mis datos", icon: Icons.tables, tourId: "nav-tables" },
  { to: "/views", label: "Vistas", icon: Icons.views, tourId: "nav-views" },
  { to: "/flows", label: "Automatizar", icon: Icons.flows, tourId: "nav-flows" },
  { to: "/chat", label: "Chat", icon: Icons.chat, tourId: "nav-chat" },
  { to: "/guia", label: "Ayuda", icon: Icons.guide, tourId: "nav-guide" },
];

export default function Layout() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { user, logout } = useAuth();
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
        const response = await api.get(`/workspaces/${workspaceId}/views`);
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
    const viewIcons = {
      calendar: Icons.viewCalendar,
      kanban: Icons.viewKanban,
      cards: Icons.viewCards,
      table: Icons.viewTable,
      floorplan: Icons.viewFloorplan,
      pos: Icons.viewPos,
      timeline: Icons.viewTimeline,
    };
    return viewIcons[type] || Icons.views;
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
              {Icons.logo}
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
              {Icons.chevronRight}
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
            {navItems.map(({ to, label, icon, tourId }) => {
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
                          {icon}
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
                            {Icons.chevronDown}
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
                    {icon}
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
                  <span className="block text-[10px] text-slate-500 truncate">
                    {user?.email}
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
