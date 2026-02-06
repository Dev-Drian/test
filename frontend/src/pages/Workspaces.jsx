import { useContext, useEffect, useState } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces, createWorkspace } from "../api/client";
import styles from "./Workspaces.module.css";

export default function Workspaces() {
  const { workspaceId, setWorkspace } = useContext(WorkspaceContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");

  const load = () => {
    setLoading(true);
    listWorkspaces()
      .then((res) => setWorkspaces(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    createWorkspace({ name: name.trim(), color })
      .then((res) => {
        setWorkspaces((prev) => [...prev, res.data]);
        setWorkspace(res.data._id, res.data.name);
        setName("");
      })
      .finally(() => setCreating(false));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Workspaces</h1>
      <p className={styles.subtitle}>
        Crea y gestiona tus entornos de trabajo. Cada workspace tiene sus propias tablas, agentes y chat.
      </p>

      <form onSubmit={handleCreate} className={styles.form}>
        <input
          type="text"
          placeholder="Nombre del workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          disabled={creating}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={styles.colorInput}
          title="Color"
        />
        <button type="submit" className={styles.btn} disabled={creating || !name.trim()}>
          {creating ? "Creando…" : "Crear workspace"}
        </button>
      </form>

      {loading && <div className={styles.loading}>Cargando…</div>}
      {!loading && (
        <div className={styles.grid}>
          {workspaces.map((ws) => (
            <div
              key={ws._id}
              className={`${styles.card} ${workspaceId === ws._id ? styles.selected : ""}`}
              onClick={() => setWorkspace(ws._id, ws.name)}
              onKeyDown={(e) => e.key === "Enter" && setWorkspace(ws._id, ws.name)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.cardColor} style={{ background: ws.color || "#22c55e" }} />
              <h3 className={styles.cardTitle}>{ws.name}</h3>
              <span className={styles.cardId}>{ws._id.slice(0, 8)}…</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
