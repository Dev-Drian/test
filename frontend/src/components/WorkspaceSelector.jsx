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
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border ${
          isOpen 
            ? 'bg-surface-200 border-primary-500/40 ring-2 ring-primary-500/20' 
            : 'bg-surface-100 border-surface-300 hover:bg-surface-200 hover:border-surface-400'
        }`}
      >
        {selectedWorkspace ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${selectedWorkspace.color || '#3b82f6'}, ${selectedWorkspace.color || '#3b82f6'}dd)` }}
          >
            {selectedWorkspace.name?.charAt(0)?.toUpperCase() || "W"}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center">
            <svg className="w-4 h-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
        )}
        <div className="flex-1 text-left min-w-0">
          <span className="block text-content-primary font-medium truncate text-[13px]">
            {loading ? "Cargando..." : selectedWorkspace?.name || "Seleccionar workspace"}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-content-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 animate-fade-up">
          <div className="bg-surface-100 border border-surface-300 rounded-xl shadow-lg">
            <div className="px-3 py-2.5 border-b border-surface-300">
              <span className="text-[11px] uppercase tracking-wider text-content-tertiary font-medium">Workspaces</span>
            </div>
            {!loading && workspaces.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-200 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <span className="text-sm text-content-tertiary">No hay workspaces</span>
              </div>
            ) : (
              <ul className="py-1.5 max-h-64 overflow-y-auto">
                {workspaces.map((ws) => (
                  <li key={ws._id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(ws)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 ${
                        ws._id === workspaceId
                          ? "bg-primary-500/10"
                          : "hover:bg-surface-200"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${ws.color || '#3b82f6'}, ${ws.color || '#3b82f6'}dd)` }}
                      >
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <span className={`flex-1 truncate text-[13px] font-medium ${
                        ws._id === workspaceId ? 'text-primary-400' : 'text-content-primary'
                      }`}>
                        {ws.name}
                      </span>
                      {ws._id === workspaceId && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
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
