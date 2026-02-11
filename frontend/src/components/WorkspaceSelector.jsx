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
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 border ${
          isOpen 
            ? 'bg-white/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
        }`}
      >
        {selectedWorkspace ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg"
            style={{ background: `linear-gradient(135deg, ${selectedWorkspace.color || '#22c55e'}, ${selectedWorkspace.color || '#22c55e'}99)` }}
          >
            {selectedWorkspace.name?.charAt(0)?.toUpperCase() || "W"}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
            <span className="text-zinc-500">🏢</span>
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Workspace</span>
          <span className="block text-white font-medium truncate">
            {loading ? "Cargando..." : selectedWorkspace?.name || "Seleccionar..."}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden transition-all duration-300 z-50 ${
        isOpen 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        <div className="backdrop-blur-xl bg-[#1a1a24]/95 border border-white/10 rounded-xl shadow-2xl shadow-black/50">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Workspaces disponibles</span>
          </div>
          {!loading && workspaces.length === 0 ? (
            <div className="p-6 text-center">
              <span className="text-3xl mb-2 block">📭</span>
              <span className="text-sm text-zinc-500">No hay workspaces</span>
            </div>
          ) : (
            <ul className="py-2 max-h-64 overflow-y-auto">
              {workspaces.map((ws, index) => (
                <li key={ws._id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(ws)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${
                      ws._id === workspaceId
                        ? "bg-emerald-500/10"
                        : "hover:bg-white/5"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform duration-200 hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${ws.color || '#22c55e'}, ${ws.color || '#22c55e'}99)` }}
                    >
                      {ws.name?.charAt(0)?.toUpperCase() || "W"}
                    </div>
                    <span className={`flex-1 truncate text-sm font-medium ${
                      ws._id === workspaceId ? 'text-emerald-400' : 'text-zinc-300'
                    }`}>
                      {ws.name}
                    </span>
                    {ws._id === workspaceId && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
    </div>
  );
}
