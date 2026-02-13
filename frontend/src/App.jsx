import React, { useState, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { WorkspaceContext } from "./context/WorkspaceContext";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Agents from "./pages/Agents";
import Tables from "./pages/Tables";
import Chat from "./pages/Chat";
import Guia from "./pages/Guia";
import FlowEditor from "./pages/FlowEditor";

export { WorkspaceContext };

function App() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() =>
    localStorage.getItem("migracion_workspace_id") || ""
  );
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState(() =>
    localStorage.getItem("migracion_workspace_name") || ""
  );

  const workspaceContext = useMemo(
    () => ({
      workspaceId: selectedWorkspaceId || null,
      workspaceName: selectedWorkspaceName || null,
      setWorkspace: (id, name = "") => {
        setSelectedWorkspaceId(id || "");
        setSelectedWorkspaceName(name || "");
        if (id) {
          localStorage.setItem("migracion_workspace_id", id);
          localStorage.setItem("migracion_workspace_name", name || "");
        } else {
          localStorage.removeItem("migracion_workspace_id");
          localStorage.removeItem("migracion_workspace_name");
        }
      },
    }),
    [selectedWorkspaceId, selectedWorkspaceName]
  );

  return (
    <ToastProvider>
      <WorkspaceContext.Provider value={workspaceContext}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="agents" element={<Agents />} />
            <Route path="tables" element={<Tables />} />
            <Route path="flows" element={<FlowEditor />} />
            <Route path="chat" element={<Chat />} />
            <Route path="guia" element={<Guia />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </WorkspaceContext.Provider>
    </ToastProvider>
  );
}

export default App;
