import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { useToast, useConfirm } from "../components/Toast";
import { listAgents, createAgent, listTables, deleteAgent, updateAgent } from "../api/client";
import { LockOpenIcon, LockClosedIcon } from "../components/Icons";

// Iconos SVG
const Icons = {
  agent: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  brain: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
    </svg>
  ),
  table: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
};

// Modelos de IA disponibles
const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido y económico", color: "accent" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Más potente", color: "primary" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Máximo rendimiento", color: "violet" },
];

export default function Agents() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const { toast } = useToast();
  const { confirm, ConfirmModal } = useConfirm();
  const [agents, setAgents] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null); // Agente en edición
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState([]); // [{tableId, fullAccess}]
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      listAgents(workspaceId),
      listTables(workspaceId),
    ])
      .then(([aRes, tRes]) => {
        setAgents(aRes.data || []);
        setTables(tRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const toggleTable = (tableId) => {
    setSelectedTables((prev) => {
      const exists = prev.find(t => t.tableId === tableId);
      if (exists) {
        return prev.filter(t => t.tableId !== tableId);
      }
      return [...prev, { tableId, fullAccess: false }];
    });
  };

  const toggleFullAccess = (tableId) => {
    setSelectedTables((prev) =>
      prev.map(t => t.tableId === tableId ? { ...t, fullAccess: !t.fullAccess } : t)
    );
  };

  const isTableSelected = (tableId) => selectedTables.some(t => t.tableId === tableId);
  const hasFullAccess = (tableId) => selectedTables.find(t => t.tableId === tableId)?.fullAccess || false;

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTables([]);
    setAiModel("gpt-4o-mini");
    setShowForm(false);
    setEditingAgent(null);
  };

  const startEdit = (agent) => {
    setEditingAgent(agent);
    setName(agent.name || "");
    setDescription(agent.description || "");
    // Convertir formato de tablas
    const tablesConfig = (agent.tables || []).map(t => 
      typeof t === 'object' ? t : { tableId: t, fullAccess: true }
    );
    setSelectedTables(tablesConfig);
    setAiModel(agent.aiModel?.[0] || "gpt-4o-mini");
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    try {
      const agentData = {
        name: name.trim(),
        description: description.trim(),
        tables: selectedTables,
        aiModel: [aiModel],
      };

      let res;
      if (editingAgent) {
        // Actualizar agente existente
        res = await updateAgent(workspaceId, editingAgent._id, agentData);
        setAgents(prev => prev.map(a => a._id === editingAgent._id ? res.data : a));
        toast.success(`Asistente "${name}" actualizado correctamente`);
      } else {
        // Crear nuevo agente
        res = await createAgent({ workspaceId, agent: agentData });
        setAgents(prev => [...prev, res.data]);
        toast.success(`Asistente "${name}" creado correctamente`);
      }
      resetForm();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agent) => {
    const confirmed = await confirm({
      title: 'Eliminar Asistente',
      message: `¿Estás seguro de que deseas eliminar "${agent.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeleting(agent._id);
    try {
      await deleteAgent(workspaceId, agent._id);
      setAgents((prev) => prev.filter((a) => a._id !== agent._id));
      toast.success(`Asistente "${agent.name}" eliminado correctamente`);
    } catch (err) {
      toast.error(`Error al eliminar: ${err.message}`);
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0">
        <div className="text-center animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-6 text-violet-400">
            {Icons.agent}
          </div>
          <h1 className="text-2xl font-semibold text-content-primary mb-2">Tu Asistente IA</h1>
          <p className="text-content-tertiary mb-6 max-w-sm">
            Selecciona un proyecto para configurar tu asistente
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-400 transition-colors"
          >
            Ir a Proyectos
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-violet-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-content-tertiary">Cargando asistente...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white">
                {Icons.agent}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-content-primary tracking-tight">Asistente IA</h1>
                <p className="text-sm text-content-tertiary mt-0.5">
                  Configura cómo tu asistente gestionará {workspaceName}
                </p>
              </div>
            </div>
            
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20"
              >
                {Icons.plus}
                <span>Nuevo asistente</span>
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

        {/* Formulario de creación/edición */}
        {showForm && (
          <div className="mb-8 p-6 rounded-2xl bg-surface-100 border border-surface-300/50 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-content-primary">
                {editingAgent ? `Editar: ${editingAgent.name}` : "Crear nuevo asistente"}
              </h2>
              <button onClick={resetForm} className="text-content-tertiary hover:text-content-primary transition-colors">
                {Icons.close}
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Nombre y descripción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-2">
                    Nombre del asistente *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Asistente de Ventas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-50 border border-surface-300/50 text-content-primary placeholder-content-muted focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={creating}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-secondary mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    placeholder="¿Qué hace este asistente?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-50 border border-surface-300/50 text-content-primary placeholder-content-muted focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* Modelo de IA */}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-3">
                  Modelo de IA
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {AI_MODELS.map((model) => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => setAiModel(model.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        aiModel === model.value
                          ? model.color === 'accent' 
                            ? 'bg-accent-500/10 border-accent-500/50 ring-2 ring-accent-500/20'
                            : model.color === 'primary'
                            ? 'bg-primary-500/10 border-primary-500/50 ring-2 ring-primary-500/20'
                            : 'bg-violet-500/10 border-violet-500/50 ring-2 ring-violet-500/20'
                          : 'bg-surface-100 border-surface-300/50 hover:border-surface-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          aiModel === model.value ? 'text-content-primary' : 'text-content-secondary'
                        }`}>
                          {model.label}
                        </span>
                        {aiModel === model.value && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            model.color === 'accent' ? 'bg-accent-500' :
                            model.color === 'primary' ? 'bg-primary-500' : 'bg-violet-500'
                          }`}>
                            {Icons.check}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-content-tertiary">{model.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tablas vinculadas */}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-3">
                  Tablas vinculadas
                </label>
                {tables.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      {Icons.table}
                    </div>
                    <div>
                      <p className="text-sm text-amber-400">No hay tablas disponibles</p>
                      <p className="text-xs text-amber-400/60">Crea tablas primero para vincularlas</p>
                    </div>
                    <Link 
                      to="/tables" 
                      className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Ir a Tablas →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tables.map((t) => (
                      <div
                        key={t._id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isTableSelected(t._id)
                            ? "bg-violet-500/10 border-violet-500/50"
                            : "bg-surface-100 border-surface-300/50"
                        }`}
                      >
                        {/* Checkbox para seleccionar tabla */}
                        <button
                          type="button"
                          onClick={() => toggleTable(t._id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isTableSelected(t._id) ? "bg-violet-500 border-violet-500" : "border-surface-300"
                          }`}
                        >
                          {isTableSelected(t._id) && Icons.check}
                        </button>
                        
                        {/* Nombre de la tabla */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${isTableSelected(t._id) ? "text-violet-400" : "text-content-secondary"}`}>
                            {t.name}
                          </span>
                          <span className="text-xs text-content-muted ml-2">{t.headers?.length || 0} campos</span>
                        </div>
                        
                        {/* Toggle de acceso completo (solo si está seleccionada) */}
                        {isTableSelected(t._id) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleFullAccess(t._id); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              hasFullAccess(t._id)
                                ? "bg-accent-500/20 text-accent-400 border border-accent-500/40"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {hasFullAccess(t._id) ? <><LockOpenIcon size="xs" /> Todo</> : <><LockClosedIcon size="xs" /> Filtrado</>}
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {/* Leyenda */}
                    <div className="flex gap-4 pt-2 text-xs text-content-tertiary">
                      <span className="flex items-center gap-1"><LockOpenIcon size="xs" /> Todo = ve todos los registros</span>
                      <span className="flex items-center gap-1"><LockClosedIcon size="xs" /> Filtrado = solo sus datos</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={creating || !name.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    editingAgent ? "bg-primary-500 hover:bg-primary-400" : "bg-violet-500 hover:bg-violet-400"
                  }`}
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{editingAgent ? "Guardando..." : "Creando..."}</span>
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      <span>{editingAgent ? "Guardar cambios" : "Crear asistente"}</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-lg bg-surface-100 border border-surface-300/50 text-content-secondary text-sm font-medium hover:bg-surface-200 hover:text-content-primary transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de asistentes */}
        {agents.length === 0 ? (
          <div className="text-center py-16 bg-surface-100 border border-surface-300/50 rounded-2xl animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4 text-violet-400">
              {Icons.agent}
            </div>
            <h3 className="text-lg font-medium text-content-primary mb-2">Aún no tienes asistente</h3>
            <p className="text-sm text-content-tertiary mb-6 max-w-sm mx-auto">
              Tu asistente de IA te ayudará a gestionar tus datos con solo chatear
            </p>
            <button 
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-400 transition-colors"
            >
              {Icons.plus}
              Crear mi asistente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const modelInfo = AI_MODELS.find(m => m.value === (agent.aiModel?.[0] || 'gpt-4o-mini')) || AI_MODELS[0];
              
              return (
                <div
                  key={agent._id}
                  className="group p-5 rounded-xl bg-surface-100 border border-surface-300/50 hover:bg-surface-200/50 hover:border-surface-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                      {Icons.agent}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/chat?agentId=${agent._id}`}
                        className="p-2 rounded-lg text-content-muted hover:text-accent-400 hover:bg-accent-500/10 transition-all"
                        title="Chatear con asistente"
                      >
                        {Icons.chat}
                      </Link>
                      <button
                        onClick={() => startEdit(agent)}
                        className="p-2 rounded-lg text-content-muted hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                        title="Editar asistente"
                      >
                        {Icons.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        disabled={deleting === agent._id}
                        className="p-2 rounded-lg text-content-muted hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Eliminar asistente"
                      >
                        {deleting === agent._id ? (
                          <div className="w-4 h-4 border-2 border-surface-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          Icons.trash
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-content-primary mb-1 group-hover:text-violet-400 transition-colors">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="text-sm text-content-tertiary mb-3 line-clamp-2">{agent.description}</p>
                  )}
                  
                  {/* Tablas vinculadas */}
                  {agent.tables?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-content-muted mb-2">Tablas vinculadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tables.map((tableConfig, idx) => {
                          // Soportar formato viejo (string) y nuevo ({tableId, fullAccess})
                          const tableId = typeof tableConfig === 'object' ? tableConfig.tableId : tableConfig;
                          const fullAccess = typeof tableConfig === 'object' ? tableConfig.fullAccess : true;
                          const tableInfo = tables.find(t => t._id === tableId);
                          
                          return (
                            <span 
                              key={tableId || idx}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                                fullAccess 
                                  ? "bg-accent-500/10 text-accent-400 border-accent-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                              title={fullAccess ? "Acceso completo" : "Filtrado por usuario"}
                            >
                              {fullAccess ? <LockOpenIcon size="xs" /> : <LockClosedIcon size="xs" />}
                              {tableInfo?.name || 'Tabla'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-surface-200">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      modelInfo.color === 'accent' ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20' :
                      modelInfo.color === 'primary' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' :
                      'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    }`}>
                      {Icons.brain}
                      {modelInfo.label}
                    </span>
                    <Link
                      to={`/chat?agentId=${agent._id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-medium border border-accent-500/20 hover:bg-accent-500/20 transition-colors ml-auto"
                    >
                      {Icons.chat}
                      Chatear
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leyenda */}
        {agents.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-surface-100 border border-surface-300/50 flex items-center gap-6">
            <p className="text-xs text-content-tertiary">Acceso a tablas:</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent-500/10 text-accent-400 text-xs border border-accent-500/20">
                <LockOpenIcon size="xs" /> Todo
              </span>
              <span className="text-xs text-content-muted">Ve todos los registros</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                <LockClosedIcon size="xs" /> Filtrado
              </span>
              <span className="text-xs text-content-muted">Solo datos del usuario</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de confirmación */}
      {ConfirmModal}
    </div>
  );
}
