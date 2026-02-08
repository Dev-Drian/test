import { useContext, useEffect, useState } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listAgents, createAgent, listTables, deleteAgent } from "../api/client";
import styles from "./Agents.module.css";

export default function Agents() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [agents, setAgents] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      listAgents(workspaceId),
      listTables(workspaceId),
    ])
      .then(([aRes, tRes]) => {
        setAgents(aRes.data || []);
        setTables(tRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const toggleTable = (tableId) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim() || !workspaceId) return;
    setCreating(true);
    createAgent({
      workspaceId,
      agent: {
        name: name.trim(),
        description: description.trim(),
        tables: selectedTables,
        aiModel: [aiModel],
      },
    })
      .then((res) => {
        setAgents((prev) => [...prev, res.data]);
        setName("");
        setDescription("");
        setSelectedTables([]);
        setAiModel("gpt-4o-mini");
      })
      .finally(() => setCreating(false));
  };

  const handleDelete = async (agentId, agentName) => {
    if (!confirm(`Eliminar agente "${agentName}"?`)) return;
    try {
      await deleteAgent(workspaceId, agentId);
      setAgents((prev) => prev.filter((a) => a._id !== agentId));
    } catch (err) {
      console.error("Error deleting agent:", err);
      alert("Error al eliminar el agente");
    }
  };

  if (!workspaceId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Agentes</h1>
        <p className={styles.needWs}>Selecciona un workspace en Inicio o Workspaces.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Agentes</h1>
      <p className={styles.subtitle}>
        Crea agentes y vincúlales tablas para que el bot pueda consultar y actuar sobre los datos.
      </p>

      <form onSubmit={handleCreate} className={styles.form}>
        <input
          type="text"
          placeholder="Nombre del agente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          disabled={creating}
        />
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.input}
          disabled={creating}
        />
        <div className={styles.tablesSection}>
          <span className={styles.tablesLabel}>Modelo de IA:</span>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className={styles.select}
            disabled={creating}
          >
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>
        <div className={styles.tablesSection}>
          <span className={styles.tablesLabel}>Tablas vinculadas:</span>
          <div className={styles.tablesList}>
            {tables.map((t) => (
              <label key={t._id} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedTables.includes(t._id)}
                  onChange={() => toggleTable(t._id)}
                />
                {t.name}
              </label>
            ))}
            {tables.length === 0 && <span className={styles.noTables}>Crea tablas primero.</span>}
          </div>
        </div>
        <button type="submit" className={styles.btn} disabled={creating || !name.trim()}>
          {creating ? "Creando…" : "Crear agente"}
        </button>
      </form>

      {loading && <div className={styles.loading}>Cargando…</div>}
      {!loading && (
        <div className={styles.grid}>
          {agents.map((agent) => (
            <div key={agent._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{agent.name}</h3>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(agent._id, agent.name)}
                  title="Eliminar agente"
                >
                  X
                </button>
              </div>
              {agent.description && (
                <p className={styles.cardDesc}>{agent.description}</p>
              )}
              <p className={styles.cardMeta}>
                Modelo: {Array.isArray(agent.aiModel) && agent.aiModel[0] ? agent.aiModel[0] : "gpt-4o-mini"} · Tablas: {agent.tables?.length || 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
