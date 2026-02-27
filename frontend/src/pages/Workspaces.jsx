import { useContext, useEffect, useState } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces, createWorkspace, deleteWorkspace } from "../api/client";
import { useToast, useConfirm } from "../components/Toast";

// Iconos SVG
const Icons = {
  workspace: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  arrow: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  tables: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  ),
  agents: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
};

// Colores predefinidos para workspaces
const PRESET_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#84cc16", // lime
];

export default function Workspaces() {
  const { workspaceId, setWorkspace } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    listWorkspaces()
      .then((res) => setWorkspaces(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const resetForm = () => {
    setName("");
    setColor("#10b981");
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await createWorkspace({ name: name.trim(), color });
      setWorkspaces((prev) => [...prev, res.data]);
      setWorkspace(res.data._id, res.data.name);
      toast.success(`Proyecto "${name}" creado correctamente`);
      resetForm();
    } catch (err) {
      toast.error(`Error al crear: ${err.message}`);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (ws) => {
    const confirmed = await confirm({
      title: 'Eliminar Proyecto',
      message: `¿Estás seguro de que deseas eliminar "${ws.name}"? Se eliminarán todos los datos, asistentes y configuraciones.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeleting(ws._id);
    try {
      await deleteWorkspace(ws._id);
      setWorkspaces((prev) => prev.filter((w) => w._id !== ws._id));
      if (workspaceId === ws._id) {
        setWorkspace(null, null);
      }
      toast.success(`Proyecto "${ws.name}" eliminado correctamente`);
    } catch (err) {
      toast.error(`Error al eliminar: ${err.message}`)
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-slate-500">Cargando proyectos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {Icons.workspace}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Mis Proyectos</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Cada proyecto agrupa tus datos y tu asistente de IA
                </p>
              </div>
            </div>
            
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
              >
                {Icons.plus}
                <span>Nuevo proyecto</span>
              </button>
            )}
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              {Icons.close}
            </button>
          </div>
        )}

        {/* Formulario de creación */}
        {showForm && (
          <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Crear nuevo proyecto</h2>
              <button onClick={resetForm} className="text-slate-500 hover:text-white transition-colors">
                {Icons.close}
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Nombre del proyecto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mi Tienda, Restaurante, Clínica..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  disabled={creating}
                  autoFocus
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">
                  Color del proyecto
                </label>
                <div className="flex items-center gap-3">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-xl transition-all ${
                        color === c 
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f172a] scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <div className="h-10 w-px bg-white/10 mx-2" />
                  <div className="relative">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div 
                      className="w-10 h-10 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-slate-500 hover:border-white/40 transition-colors cursor-pointer"
                      style={{ background: color }}
                    >
                      <span className="text-xs font-medium text-white/80">+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <p className="text-xs text-slate-600 mb-3">Vista previa</p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                  >
                    {name?.charAt(0)?.toUpperCase() || "W"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      {name || "Nombre del proyecto"}
                    </h3>
                    <p className="text-sm text-slate-500">Tu nuevo proyecto</p>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={creating || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      <span>Crear proyecto</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workspace activo */}
        {workspaceId && (
          <div className="mb-10">
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Proyecto activo
            </h2>
            {workspaces.filter(ws => ws._id === workspaceId).map((ws) => (
              <div 
                key={ws._id}
                className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 shadow-2xl shadow-indigo-500/5"
              >
                {/* Glow effect */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl" />
                
                <div className="relative flex items-center gap-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-white/10"
                    style={{ background: `linear-gradient(135deg, ${ws.color || '#10b981'}, ${ws.color || '#059669'})` }}
                  >
                    {ws.name?.charAt(0)?.toUpperCase() || "W"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{ws.name}</h3>
                      <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30">
                        Activo
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono">ID: {ws._id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a href="/tables" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium transition-all hover:scale-105">
                      {Icons.tables}
                      <span>Mis datos</span>
                    </a>
                    <a href="/agents" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-medium transition-all hover:scale-105">
                      {Icons.agents}
                      <span>Asistente</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de proyectos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {workspaceId ? 'Otros proyectos' : 'Todos los proyectos'}
            </h2>
            <span className="text-xs text-slate-600">
              {workspaces.filter(ws => ws._id !== workspaceId).length} disponibles
            </span>
          </div>

          {workspaces.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-slate-600">
                {Icons.workspace}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No hay proyectos</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Crea tu primer proyecto para comenzar a organizar tus datos
              </p>
              <button 
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition-colors"
              >
                {Icons.plus}
                Crear proyecto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {workspaces.filter(ws => ws._id !== workspaceId).map((ws) => (
                <div
                  key={ws._id}
                  className="group relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] hover:border-white/[0.15] hover:shadow-xl hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center gap-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl shrink-0 ring-2 ring-white/10 group-hover:ring-white/20 transition-all group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${ws.color || '#10b981'}, ${ws.color || '#059669'})` }}
                    >
                      {ws.name?.charAt(0)?.toUpperCase() || "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-white group-hover:text-indigo-400 transition-colors truncate">
                        {ws.name}
                      </h3>
                      <p className="text-xs text-slate-600 truncate mt-1 font-mono">
                        ID: {ws._id?.slice(0, 20)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWorkspace(ws._id, ws.name)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105"
                      >
                        Activar
                        {Icons.arrow}
                      </button>
                      <button
                        onClick={() => handleDelete(ws)}
                        disabled={deleting === ws._id}
                        className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                        title="Eliminar proyecto"
                      >
                        {deleting === ws._id ? (
                          <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          Icons.trash
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        {workspaces.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-indigo-400 font-medium">Tip</p>
              <p className="text-xs text-indigo-400/60 mt-0.5">
                Cada proyecto tiene sus propios datos y asistente. Puedes cambiar entre proyectos desde el menú lateral.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de confirmación */}
      {ConfirmModal}
    </div>
  );
}
