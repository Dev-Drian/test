import { useContext, useEffect, useState, useRef } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces } from "../api/client";

export default function WorkspaceSelector() {
  const { workspaceId, workspaceName, setWorkspace } = useContext(WorkspaceContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    listWorkspaces()
      .then((res) => setWorkspaces(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (ws) => {
    setWorkspace(ws._id, ws.name);
    setIsOpen(false);
  };

  const selectedWorkspace = workspaces.find((ws) => ws._id === workspaceId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-300 ${
          isOpen 
            ? 'ring-2 ring-violet-500/40' 
            : 'hover:bg-white/5'
        }`}
        style={{ 
          background: isOpen ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' : 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)' 
        }}
      >
        {selectedWorkspace ? (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${selectedWorkspace.color || '#8b5cf6'}, ${selectedWorkspace.color || '#6366f1'}dd)`,
              boxShadow: `0 4px 15px ${selectedWorkspace.color || '#8b5cf6'}40`
            }}
          >
            {selectedWorkspace.name?.charAt(0)?.toUpperCase() || "W"}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <span className="block text-white font-semibold truncate text-[13px]">
            {loading ? "Cargando..." : selectedWorkspace?.name || "Seleccionar workspace"}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown - Rediseñado */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 animate-fade-up">
          <div className="rounded-2xl shadow-2xl" 
            style={{ 
              background: 'linear-gradient(180deg, rgba(20, 20, 30, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Workspaces</span>
            </div>
            {!loading && workspaces.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <span className="text-sm text-slate-400">No hay workspaces</span>
              </div>
            ) : (
              <ul className="py-2 max-h-64 overflow-y-auto">
                {workspaces.map((ws) => (
                  <li key={ws._id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(ws)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 ${
                        ws._id === workspaceId
                          ? ""
                          : "hover:bg-white/5"
                      }`}
                      style={ws._id === workspaceId ? {
                        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)'
                      } : {}}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${ws.color || '#8b5cf6'}, ${ws.color || '#6366f1'}dd)`,
                          boxShadow: `0 4px 15px ${ws.color || '#8b5cf6'}30`
                        }}
                      >
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <span className={`flex-1 truncate text-[13px] font-semibold ${
                        ws._id === workspaceId ? 'text-violet-400' : 'text-white'
                      }`}>
                        {ws.name}
                      </span>
                      {ws._id === workspaceId && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
