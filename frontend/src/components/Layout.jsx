import { Outlet, useLocation, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import WorkspaceSelector from "./WorkspaceSelector";

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
  chevronRight: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const navItems = [
  { to: "/", label: "Inicio", icon: Icons.home },
  { to: "/workspaces", label: "Workspaces", icon: Icons.workspaces },
  { to: "/agents", label: "Agentes", icon: Icons.agents },
  { to: "/tables", label: "Tablas", icon: Icons.tables },
  { to: "/flows", label: "Flujos", icon: Icons.flows },
  { to: "/chat", label: "Chat", icon: Icons.chat },
  { to: "/guia", label: "Documentación", icon: Icons.guide },
];

export default function Layout() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a12' }}>
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} flex flex-col transition-all duration-300 ease-out`}
        style={{ 
          background: '#0e0e1a',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {/* Logo Header */}
        <div className="h-16 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-violet-500">
              {Icons.logo}
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-white">FlowAI</span>
                <span className="text-[10px] font-medium text-white/40">Automation Platform</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg transition-all hover:bg-white/10 text-white/40"
            >
              {Icons.chevronRight}
            </button>
          )}
        </div>

        {/* Workspace Selector */}
        {!collapsed && (
          <div className="px-3 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <WorkspaceSelector />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2.5' : ''} ${
                  isActive(to) 
                    ? 'bg-white/8 text-white' 
                    : 'text-white/50 hover:text-white/80 hover:bg-white/4'
                }`}
                title={collapsed ? label : undefined}
              >
                <span className={`transition-all duration-200 ${isActive(to) ? 'text-violet-400' : ''}`}>
                  {icon}
                </span>
                {!collapsed && <span>{label}</span>}
                {isActive(to) && (
                  <div 
                    className={`absolute ${collapsed ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full' : 'right-3 w-1.5 h-1.5 rounded-full'} bg-violet-400`}
                  />
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer con workspace activo */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {collapsed ? (
            <button 
              onClick={() => setCollapsed(false)}
              className="w-full p-2.5 rounded-xl transition-all flex items-center justify-center hover:bg-white/10 text-white/40"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : workspaceId ? (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/20">
                <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Workspace activo
                </span>
                <span className="block text-sm font-medium text-white truncate mt-0.5">
                  {workspaceName}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ 
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5">
                <div className="w-2 h-2 rounded-full animate-pulse bg-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Sin selección
                </span>
                <span className="block text-xs text-white/40 mt-0.5">
                  Selecciona un workspace
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
