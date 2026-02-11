import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listAgents, createAgent, listTables, deleteAgent } from "../api/client";

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
};

// Modelos de IA disponibles
const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rápido y económico", color: "emerald" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Más potente", color: "blue" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Máximo rendimiento", color: "purple" },
];

export default function Agents() {
  const { workspaceId, workspaceName } = useContext(WorkspaceContext);
  const [agents, setAgents] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
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
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTables([]);
    setAiModel("gpt-4o-mini");
    setShowForm(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    try {
      const res = await createAgent({
        workspaceId,
        agent: {
          name: name.trim(),
          description: description.trim(),
          tables: selectedTables,
          aiModel: [aiModel],
        },
      });
      setAgents((prev) => [...prev, res.data]);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agent) => {
    if (!confirm(`¿Eliminar agente "${agent.name}"?`)) return;
    setDeleting(agent._id);
    try {
      await deleteAgent(workspaceId, agent._id);
      setAgents((prev) => prev.filter((a) => a._id !== agent._id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Sin workspace
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-6 text-purple-400">
            {Icons.agent}
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Agentes IA</h1>
          <p className="text-zinc-500 mb-6 max-w-sm">
            Selecciona un workspace para gestionar sus agentes
          </p>
          <Link 
            to="/workspaces"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Ir a Workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="text-sm text-zinc-500">Cargando agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
                {Icons.agent}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Agentes IA</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Configura agentes inteligentes para {workspaceName}
                </p>
              </div>
            </div>
            
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 transition-colors shadow-lg shadow-purple-500/20"
              >
                {Icons.plus}
                <span>Nuevo agente</span>
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
              <h2 className="text-lg font-semibold text-white">Crear nuevo agente</h2>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white transition-colors">
                {Icons.close}
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Nombre y descripción */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Nombre del agente *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Asistente de Ventas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    disabled={creating}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    placeholder="¿Qué hace este agente?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* Modelo de IA */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">
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
                          ? model.color === 'emerald' 
                            ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20'
                            : model.color === 'blue'
                            ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20'
                            : 'bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/20'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          aiModel === model.value ? 'text-white' : 'text-zinc-300'
                        }`}>
                          {model.label}
                        </span>
                        {aiModel === model.value && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            model.color === 'emerald' ? 'bg-emerald-500' :
                            model.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}>
                            {Icons.check}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{model.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tablas vinculadas */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">
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
                  <div className="flex flex-wrap gap-2">
                    {tables.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => toggleTable(t._id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                          selectedTables.includes(t._id)
                            ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                            : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                        }`}
                      >
                        {selectedTables.includes(t._id) && (
                          <span className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center">
                            {Icons.check}
                          </span>
                        )}
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-xs text-zinc-600">{t.headers?.length || 0} campos</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={creating || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      <span>Crear agente</span>
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de agentes */}
        {agents.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 text-purple-400">
              {Icons.agent}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No hay agentes</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
              Crea tu primer agente IA para interactuar con tus datos
            </p>
            <button 
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-400 transition-colors"
            >
              {Icons.plus}
              Crear agente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const modelInfo = AI_MODELS.find(m => m.value === (agent.aiModel?.[0] || 'gpt-4o-mini')) || AI_MODELS[0];
              
              return (
                <div
                  key={agent._id}
                  className="group p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      {Icons.agent}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/chat?agentId=${agent._id}`}
                        className="p-2 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Chatear con agente"
                      >
                        {Icons.chat}
                      </Link>
                      <button
                        onClick={() => handleDelete(agent)}
                        disabled={deleting === agent._id}
                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Eliminar agente"
                      >
                        {deleting === agent._id ? (
                          <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          Icons.trash
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{agent.description}</p>
                  )}
                  
                  {/* Tablas vinculadas */}
                  {agent.tables?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-zinc-600 mb-2">Tablas vinculadas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tables.map((tableId) => {
                          const tableInfo = tables.find(t => t._id === tableId);
                          return (
                            <span 
                              key={tableId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20"
                            >
                              {Icons.table}
                              {tableInfo?.name || 'Tabla'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.04]">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      modelInfo.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      modelInfo.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}>
                      {Icons.brain}
                      {modelInfo.label}
                    </span>
                    <Link
                      to={`/chat?agentId=${agent._id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors ml-auto"
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

        {/* Tip */}
        {agents.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-purple-400 font-medium">Tip</p>
              <p className="text-xs text-purple-400/60 mt-0.5">
                Los agentes pueden acceder a las tablas que vincules para consultar y modificar datos mediante conversación natural.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
