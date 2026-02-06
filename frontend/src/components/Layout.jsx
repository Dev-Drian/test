import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { Link } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";
import styles from "./Layout.module.css";

export default function Layout() {
  const { workspaceId, workspaceName, setWorkspace } = useContext(WorkspaceContext);
  const location = useLocation();
  const navigate = useNavigate();
  const nav = [
    { to: "/", label: "🏠 Inicio" },
    { to: "/workspaces", label: "📦 Workspaces" },
    { to: "/agents", label: "🤖 Agentes" },
    { to: "/tables", label: "📋 Tablas" },
    { to: "/flows", label: "🔄 Flujos" },
    { to: "/chat", label: "💬 Chat" },
    { to: "/guia", label: "📖 Guía" },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Plataforma</div>
        {workspaceId && (
          <div className={styles.workspaceBadge}>
            <span className={styles.workspaceLabel}>Estás en:</span>
            <strong className={styles.workspaceName}>{workspaceName || "Workspace"}</strong>
            <button
              type="button"
              className={styles.clearWs}
              onClick={() => { setWorkspace(null, null); navigate("/"); }}
            >
              Cambiar workspace
            </button>
          </div>
        )}
        {!workspaceId && (
          <div className={styles.workspaceBadgeNone}>
            <Link to="/">Selecciona un workspace en Inicio</Link>
          </div>
        )}
        <nav className={styles.nav}>
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={location.pathname === to || (to !== "/" && location.pathname.startsWith(to)) ? styles.navActive : styles.navLink}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
