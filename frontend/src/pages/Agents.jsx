import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useToast, useConfirm } from "../components/Toast";
import { listAgents, createAgent, listTables, deleteAgent, updateAgent } from "../api/client";

// ═══════════════════════════════════════════════════════════════════════════════
// ICONOS PROFESIONALES SVG
// ═══════════════════════════════════════════════════════════════════════════════

const SparklesIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const BotIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 8V5" strokeLinecap="round" />
    <circle cx="12" cy="3" r="2" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    <path d="M9 18h6" strokeLinecap="round" />
  </svg>
);

const CpuChipIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <path d="M6 9H3M6 12H3M6 15H3M21 9h-3M21 12h-3M21 15h-3M9 6V3M12 6V3M15 6V3M9 21v-3M12 21v-3M15 21v-3" strokeLinecap="round" />
  </svg>
);

const DatabaseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" />
    <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" />
  </svg>
);

const ChatBubbleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

const PencilIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const XMarkIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const LockOpenIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const LockClosedIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const BoltIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
  </svg>
);

const CogIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const InformationCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

const AI_MODELS = [
  { 
    value: "gpt-4o-mini", 
    label: "GPT-4o Mini", 
    desc: "Rápido y económico",
    icon: BoltIcon,
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    recommended: true
  },
  { 
    value: "gpt-4o", 
    label: "GPT-4o", 
    desc: "Balance ideal",
    icon: SparklesIcon,
    gradient: "from-blue-500 to-indigo-500",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400"
  },
  { 
    value: "gpt-4-turbo", 
    label: "GPT-4 Turbo", 
    desc: "Máximo rendimiento",
    icon: CpuChipIcon,
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-400"
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Agents() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [agents, setAgents] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    Promise.all([listAgents(workspaceId), listTables(workspaceId)])
      .then(([aRes, tRes]) => {
        setAgents(aRes.data || []);
        setTables(tRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const toggleTable = (tableId, tableName) => {
    setSelectedTables((prev) => {
      const exists = prev.find(t => t.tableId === tableId);
      if (exists) return prev.filter(t => t.tableId !== tableId);
      return [...prev, { tableId, tableName, fullAccess: false, permissions: { query: true, create: true, update: false, delete: false } }];
    });
  };

  const toggleFullAccess = (tableId) => {
    setSelectedTables((prev) => prev.map(t => t.tableId === tableId ? { ...t, fullAccess: !t.fullAccess } : t));
  };

  const isTableSelected = (tableId) => selectedTables.some(t => t.tableId === tableId);
  const hasFullAccess = (tableId) => selectedTables.find(t => t.tableId === tableId)?.fullAccess || false;

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTables([]);
    setAiModel("gpt-4o-mini");
    setShowModal(false);
    setEditingAgent(null);
  };

  const startEdit = (agent) => {
    setEditingAgent(agent);
    setName(agent.name || "");
    setDescription(agent.description || "");
    const tablesConfig = (agent.tables || []).map(t => {
      if (typeof t === 'object') {
        return { tableId: t.tableId, tableName: t.tableName || tables.find(tb => tb._id === t.tableId)?.name || '', fullAccess: t.fullAccess || false, permissions: t.permissions || { query: true, create: true, update: false, delete: false } };
      }
      return { tableId: t, tableName: tables.find(tb => tb._id === t)?.name || '', fullAccess: true, permissions: { query: true, create: true, update: true, delete: false } };
    });
    setSelectedTables(tablesConfig);
    setAiModel(agent.aiModel?.[0] || "gpt-4o-mini");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    try {
      const agentData = { name: name.trim(), description: description.trim(), tables: selectedTables, aiModel: [aiModel] };
      let res;
      if (editingAgent) {
        res = await updateAgent(workspaceId, editingAgent._id, agentData);
        setAgents(prev => prev.map(a => a._id === editingAgent._id ? res.data : a));
        toast.success(`Asistente actualizado`);
      } else {
        res = await createAgent({ workspaceId, agent: agentData });
        setAgents(prev => [...prev, res.data]);
        toast.success(`Asistente creado`);
      }
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agent) => {
    const confirmed = await confirm({
      title: 'Eliminar Asistente',
      message: `¿Eliminar "${agent.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;
    setDeleting(agent._id);
    try {
      await deleteAgent(workspaceId, agent._id);
      setAgents((prev) => prev.filter((a) => a._id !== agent._id));
      toast.success(`Asistente eliminado`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
        <div className="text-center animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
            <BotIcon className="w-10 h-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Asistentes IA</h1>
          <p className="text-slate-400 mb-6 max-w-sm">Selecciona un proyecto para configurar tus asistentes</p>
          <Link to="/workspaces" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-all">
            Ir a Proyectos <ArrowRightIcon />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f18 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
          <span className="text-sm text-slate-400">Cargando asistentes...</span>
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
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl">
                  <SparklesIcon className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Asistente IA</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Configura cómo tu asistente gestionará <span className="text-violet-400 font-medium">{workspaceName}</span>
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowModal(true)}
              className="group flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.35)' }}
            >
              <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">Nuevo asistente</span>
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

        {/* LISTA DE AGENTES */}
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl" />
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/20">
                <BotIcon className="w-12 h-12 text-violet-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Crea tu primer asistente</h3>
            <p className="text-slate-400 text-center max-w-md mb-8">
              Los asistentes de IA pueden gestionar tus datos, responder preguntas y automatizar tareas con solo chatear
            </p>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.35)' }}
            >
              <PlusIcon className="w-5 h-5" />
              Crear mi primer asistente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map((agent, index) => {
              const modelInfo = AI_MODELS.find(m => m.value === (agent.aiModel?.[0] || 'gpt-4o-mini')) || AI_MODELS[0];
              const ModelIcon = modelInfo.icon;
              
              return (
                <div
                  key={agent._id}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/20 group-hover:border-violet-500/40 transition-colors">
                          <SparklesIcon className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{agent.name}</h3>
                          {agent.description && <p className="text-sm text-slate-500 line-clamp-1">{agent.description}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Link to={`/chat?agentId=${agent._id}`} className="p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Chatear">
                          <ChatBubbleIcon className="w-4 h-4" />
                        </Link>
                        <button onClick={() => startEdit(agent)} className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Editar">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(agent)} disabled={deleting === agent._id} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="Eliminar">
                          {deleting === agent._id ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {agent.tables?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-600 mb-2 flex items-center gap-1"><DatabaseIcon className="w-3 h-3" /> Tablas vinculadas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.tables.slice(0, 4).map((tableConfig, idx) => {
                            const tableId = typeof tableConfig === 'object' ? tableConfig.tableId : tableConfig;
                            const fullAccess = typeof tableConfig === 'object' ? tableConfig.fullAccess : true;
                            const tableInfo = tables.find(t => t._id === tableId);
                            return (
                              <span key={tableId || idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${fullAccess ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                {fullAccess ? <LockOpenIcon className="w-3 h-3" /> : <LockClosedIcon className="w-3 h-3" />}
                                {tableInfo?.name || 'Tabla'}
                              </span>
                            );
                          })}
                          {agent.tables.length > 4 && <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400">+{agent.tables.length - 4} más</span>}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${modelInfo.borderColor} bg-gradient-to-r ${modelInfo.bgGradient}`}>
                        <ModelIcon className={`w-4 h-4 ${modelInfo.textColor}`} />
                        <span className={`text-xs font-medium ${modelInfo.textColor}`}>{modelInfo.label}</span>
                      </div>
                      
                      <Link to={`/chat?agentId=${agent._id}`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/20 transition-all">
                        <ChatBubbleIcon className="w-4 h-4" /> Chatear
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda */}
        {agents.length > 0 && (
          <div className="mt-6 p-4 rounded-xl flex flex-wrap items-center gap-4 text-xs" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-slate-500">Acceso a tablas:</span>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20"><LockOpenIcon className="w-3 h-3" /> Todo</span>
              <span className="text-slate-500">Ve todos los registros</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"><LockClosedIcon className="w-3 h-3" /> Filtrado</span>
              <span className="text-slate-500">Solo datos del usuario</span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-scale-up" style={{ background: 'linear-gradient(135deg, #13131a 0%, #0a0a0f 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/20">
                  {editingAgent ? <CogIcon className="w-5 h-5 text-violet-400" /> : <SparklesIcon className="w-5 h-5 text-violet-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{editingAgent ? 'Editar asistente' : 'Crear nuevo asistente'}</h2>
                  <p className="text-xs text-slate-500">{editingAgent ? `Modificando: ${editingAgent.name}` : 'Configura tu asistente de IA'}</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                
                {/* Nombre y descripción */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del asistente <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="Ej: Asistente de Ventas" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                    <input type="text" placeholder="¿Qué hace este asistente?" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>

                {/* Modelo de IA */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Modelo de IA</label>
                  <div className="grid grid-cols-3 gap-3">
                    {AI_MODELS.map((model) => {
                      const ModelIcon = model.icon;
                      const isSelected = aiModel === model.value;
                      return (
                        <button key={model.value} type="button" onClick={() => setAiModel(model.value)} className={`relative p-4 rounded-xl text-left transition-all ${isSelected ? `bg-gradient-to-br ${model.bgGradient} ring-2 ${model.borderColor.replace('border', 'ring')}` : 'hover:bg-white/5'}`} style={{ border: isSelected ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)' }}>
                          {model.recommended && <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">Recomendado</span>}
                          <div className="flex items-center gap-2 mb-2">
                            <ModelIcon className={`w-5 h-5 ${isSelected ? model.textColor : 'text-slate-500'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>{model.label}</span>
                          </div>
                          <p className="text-xs text-slate-500">{model.desc}</p>
                          {isSelected && <div className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br ${model.gradient} flex items-center justify-center`}><CheckIcon className="w-3 h-3 text-white" /></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tablas vinculadas */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Tablas vinculadas</label>
                  {tables.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                      <InformationCircleIcon className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-400">No hay tablas disponibles</p>
                        <p className="text-xs text-amber-400/60">Crea tablas primero</p>
                      </div>
                      <Link to="/tables" className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1">Ir a Tablas <ArrowRightIcon className="w-3 h-3" /></Link>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {tables.map((t) => (
                        <div key={t._id} className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${isTableSelected(t._id) ? 'bg-violet-500/10 ring-1 ring-violet-500/30' : 'hover:bg-white/5'}`} style={{ border: isTableSelected(t._id) ? 'none' : '1px solid rgba(255,255,255,0.05)' }} onClick={() => toggleTable(t._id, t.name)}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isTableSelected(t._id) ? 'bg-violet-500 border-violet-500' : 'border-slate-600'}`}>
                            {isTableSelected(t._id) && <CheckIcon className="w-3 h-3 text-white" />}
                          </div>
                          <DatabaseIcon className={`w-4 h-4 ${isTableSelected(t._id) ? 'text-violet-400' : 'text-slate-500'}`} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isTableSelected(t._id) ? 'text-violet-300' : 'text-slate-400'}`}>{t.name}</span>
                            <span className="text-xs text-slate-600 ml-2">{t.headers?.length || 0} campos</span>
                          </div>
                          {isTableSelected(t._id) && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleFullAccess(t._id); }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${hasFullAccess(t._id) ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                              {hasFullAccess(t._id) ? <><LockOpenIcon className="w-3 h-3" /> Todo</> : <><LockClosedIcon className="w-3 h-3" /> Filtrado</>}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><LockOpenIcon className="w-3 h-3" /> Todo = ve todos los registros</span>
                    <span className="flex items-center gap-1"><LockClosedIcon className="w-3 h-3" /> Filtrado = solo sus datos</span>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-slate-400 text-sm font-medium hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleSubmit} disabled={creating || !name.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ background: editingAgent ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', boxShadow: editingAgent ? '0 4px 20px rgba(59, 130, 246, 0.3)' : '0 4px 20px rgba(139, 92, 246, 0.3)' }}>
                {creating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{editingAgent ? 'Guardando...' : 'Creando...'}</> : <><CheckIcon className="w-4 h-4" />{editingAgent ? 'Guardar cambios' : 'Crear asistente'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmModal}
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-up { animation: scale-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
