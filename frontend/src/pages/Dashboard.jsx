import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listWorkspaces } from "../api/client";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { workspaceId, workspaceName, setWorkspace } = useContext(WorkspaceContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listWorkspaces()
      .then((res) => setWorkspaces(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inicio</h1>
      <p className={styles.subtitle}>
        Selecciona un workspace para trabajar con agentes, tablas y chat.
      </p>

      {loading && <div className={styles.loading}>Cargando workspaces…</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Workspaces</h2>
          <div className={styles.cardGrid}>
            {workspaces.length === 0 ? (
              <div className={styles.empty}>
                <p>No hay workspaces.</p>
                <Link to="/workspaces" className={styles.cta}>
                  Crear workspace
                </Link>
              </div>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws._id}
                  className={`${styles.card} ${workspaceId === ws._id ? styles.cardSelected : ""}`}
                  onClick={() => setWorkspace(ws._id, ws.name)}
                  onKeyDown={(e) => e.key === "Enter" && setWorkspace(ws._id, ws.name)}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className={styles.cardColor}
                    style={{ background: ws.color || "var(--accent)" }}
                  />
                  <h3 className={styles.cardTitle}>{ws.name}</h3>
                  <p className={styles.cardMeta}>
                    {workspaceId === ws._id ? "Seleccionado" : "Clic para seleccionar"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {workspaceId && (
        <section className={styles.quickLinks}>
          <h2 className={styles.sectionTitle}>Acceso rápido</h2>
          <div className={styles.links}>
            <Link to="/agents" className={styles.linkCard}>
              Agentes
            </Link>
            <Link to="/tables" className={styles.linkCard}>
              Tablas
            </Link>
            <Link to="/chat" className={styles.linkCard}>
              Chat
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
