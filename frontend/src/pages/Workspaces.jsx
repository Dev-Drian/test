import { useContext, useEffect, useState, useCallback } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces, createWorkspace, deleteWorkspace, listTables, listAgents } from "../api/client";
import { useToast, useConfirm } from "../components/Toast";
import { Link } from "react-router-dom";

// ═══════════════════════════════════════════════════════════════════════════════
// ICONOS PROFESIONALES SVG
// ═══════════════════════════════════════════════════════════════════════════════

const GridIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const XMarkIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TableCellsIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
  </svg>
);

const SparklesIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const ChatBubbleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const CogIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const FolderIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const BoltIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
  </svg>
);

const ChartBarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const LightBulbIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Workspaces() {
  const { workspaceId, setWorkspace } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceStats, setWorkspaceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [error, setError] = useState(null);

  // Cargar estadísticas de un workspace
  const loadWorkspaceStats = useCallback(async (wsId) => {
    try {
      const [tablesRes, agentsRes] = await Promise.all([
        listTables(wsId),
        listAgents(wsId)
      ]);
      setWorkspaceStats(prev => ({
        ...prev,
        [wsId]: {
          tables: tablesRes.data?.length || 0,
          agents: agentsRes.data?.length || 0,
          lastUpdated: new Date()
        }
      }));
    } catch {
      // Silently fail
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkspaces();
      const wsList = res.data || [];
      setWorkspaces(wsList);
      // Cargar estadísticas de cada workspace
      wsList.forEach(ws => loadWorkspaceStats(ws._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadWorkspaceStats]);

  useEffect(() => { load(); }, [load]);

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
      loadWorkspaceStats(res.data._id);
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
      if (workspaceId === ws._id) setWorkspace(null, null);
      toast.success(`Proyecto "${ws.name}" eliminado correctamente`);
    } catch (err) {
      toast.error(`Error al eliminar: ${err.message}`);
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeWorkspace = workspaces.find(ws => ws._id === workspaceId);
  const otherWorkspaces = workspaces.filter(ws => ws._id !== workspaceId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <span className="text-sm text-slate-400">Cargando proyectos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-2xl">
                  <GridIcon className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Mis Proyectos</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {workspaces.length} proyecto{workspaces.length !== 1 ? 's' : ''} • Gestiona tus datos y asistentes IA
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowForm(true)}
              className="group flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)' }}
            >
              <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">Nuevo proyecto</span>
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <XMarkIcon className="w-5 h-5 text-red-400" />
            </div>
            <p className="flex-1 text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-1">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FORMULARIO DE CREACIÓN */}
        {showForm && (
          <div className="mb-8 p-6 rounded-2xl animate-scale-up" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <FolderIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Crear nuevo proyecto</h2>
                  <p className="text-xs text-slate-500">Define el nombre y color de tu proyecto</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del proyecto <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Ej: Mi Tienda, Restaurante, Clínica..." value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} disabled={creating} autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Color del proyecto</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setColor(c)} className={`w-9 h-9 rounded-lg transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-105'}`} style={{ background: c }} />
                    ))}
                    <div className="relative ml-2">
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors" style={{ background: color }}>
                        <PlusIcon className="w-4 h-4 text-white/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-xl" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                  {name?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{name || "Nombre del proyecto"}</h3>
                  <p className="text-sm text-slate-500">Vista previa</p>
                </div>
                <div className="flex items-center gap-3 text-slate-600 text-xs">
                  <span className="flex items-center gap-1"><TableCellsIcon className="w-4 h-4" /> 0 tablas</span>
                  <span className="flex items-center gap-1"><SparklesIcon className="w-4 h-4" /> 0 asistentes</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={creating || !name.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)' }}>
                  {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</> : <><CheckIcon className="w-4 h-4" /> Crear proyecto</>}
                </button>
                <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-slate-400 text-sm font-medium hover:bg-white/5 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* PROYECTO ACTIVO */}
        {activeWorkspace && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Proyecto activo
            </h2>
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
              
              <div className="relative p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Avatar y nombre */}
                  <div className="flex items-center gap-5 flex-1">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-2xl blur-lg opacity-60" style={{ background: activeWorkspace.color || '#10b981' }} />
                      <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-white/10" style={{ background: `linear-gradient(135deg, ${activeWorkspace.color || '#10b981'}, ${activeWorkspace.color || '#059669'})` }}>
                        {activeWorkspace.name?.charAt(0)?.toUpperCase() || "P"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-2xl font-bold text-white truncate">{activeWorkspace.name}</h3>
                        <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/30">Activo</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Creado: {formatDate(activeWorkspace.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-6 px-5 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-white">
                          <TableCellsIcon className="w-5 h-5 text-blue-400" />
                          {workspaceStats[activeWorkspace._id]?.tables ?? '-'}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Tablas</p>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-white">
                          <SparklesIcon className="w-5 h-5 text-violet-400" />
                          {workspaceStats[activeWorkspace._id]?.agents ?? '-'}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Asistentes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-white/5">
                  <Link to="/tables" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-all hover:scale-105" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <TableCellsIcon className="w-4 h-4 text-blue-400" /> Mis datos
                  </Link>
                  <Link to="/agents" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-all hover:scale-105" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <SparklesIcon className="w-4 h-4 text-violet-400" /> Asistentes
                  </Link>
                  <Link to="/chat" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-all hover:scale-105" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <ChatBubbleIcon className="w-4 h-4 text-emerald-400" /> Chat
                  </Link>
                  <Link to="/integrations" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-all hover:scale-105" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <BoltIcon className="w-4 h-4 text-amber-400" /> Integraciones
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 text-sm font-medium transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CogIcon className="w-4 h-4 text-slate-400" /> Configuración
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OTROS PROYECTOS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {activeWorkspace ? 'Otros proyectos' : 'Todos los proyectos'}
            </h2>
            <span className="text-xs text-slate-600">{otherWorkspaces.length} disponible{otherWorkspaces.length !== 1 ? 's' : ''}</span>
          </div>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" />
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/20">
                  <FolderIcon className="w-12 h-12 text-indigo-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Crea tu primer proyecto</h3>
              <p className="text-slate-400 text-center max-w-md mb-8">
                Los proyectos te permiten organizar tus datos, tablas y asistentes de IA en un solo lugar
              </p>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)' }}>
                <PlusIcon className="w-5 h-5" /> Crear mi primer proyecto
              </button>
            </div>
          ) : otherWorkspaces.length === 0 && activeWorkspace ? (
            <div className="p-8 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <FolderIcon className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-4">No tienes otros proyectos</p>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-indigo-400 text-sm font-medium mx-auto transition-all hover:bg-indigo-500/10" style={{ border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <PlusIcon className="w-4 h-4" /> Crear otro proyecto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {otherWorkspaces.map((ws, index) => {
                const stats = workspaceStats[ws._id];
                return (
                  <div key={ws._id} className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: `${index * 50}ms` }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-xl ring-2 ring-white/10 group-hover:ring-white/20 transition-all group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${ws.color || '#10b981'}, ${ws.color || '#059669'})` }}>
                            {ws.name?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-white group-hover:text-indigo-400 transition-colors truncate">{ws.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {formatDate(ws.createdAt)}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(ws)} disabled={deleting === ws._id} className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" title="Eliminar">
                          {deleting === ws._id ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-4 flex-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <TableCellsIcon className="w-3.5 h-3.5" /> {stats?.tables ?? '-'} tablas
                          </span>
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <SparklesIcon className="w-3.5 h-3.5" /> {stats?.agents ?? '-'} asistentes
                          </span>
                        </div>
                        <button onClick={() => setWorkspace(ws._id, ws.name)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105">
                          Activar <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tip */}
        {workspaces.length > 0 && (
          <div className="mt-8 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
              <LightBulbIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-indigo-400 font-medium">Consejo</p>
              <p className="text-xs text-indigo-400/60 mt-0.5">
                Cada proyecto tiene sus propios datos, tablas y asistente de IA. Puedes cambiar de proyecto desde el menú lateral o desde esta página.
              </p>
            </div>
          </div>
        )}

        {/* Stats resumen */}
        {workspaces.length > 1 && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl font-bold text-white">{workspaces.length}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><FolderIcon className="w-3 h-3" /> Proyectos</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl font-bold text-blue-400">{Object.values(workspaceStats).reduce((acc, s) => acc + (s?.tables || 0), 0)}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><TableCellsIcon className="w-3 h-3" /> Tablas totales</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl font-bold text-violet-400">{Object.values(workspaceStats).reduce((acc, s) => acc + (s?.agents || 0), 0)}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><SparklesIcon className="w-3 h-3" /> Asistentes totales</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-2xl font-bold text-emerald-400">{activeWorkspace ? 1 : 0}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><ChartBarIcon className="w-3 h-3" /> Activo ahora</p>
            </div>
          </div>
        )}
      </div>

      {ConfirmModal}

      <style>{`
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
